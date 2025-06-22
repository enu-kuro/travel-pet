import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCallGenkit } from "firebase-functions/https";
import { defineSecret } from "firebase-functions/params";
import { runFlow } from "@genkit-ai/core"; // Try importing runFlow from @genkit-ai/core

import { createPetFlow } from "./createPetFlow";
import { dailyDiaryFlow } from "./dailyDiaryFlow";

initializeApp();
export const db = getFirestore();

// Define secrets for email authentication
export const EMAIL_ADDRESS = defineSecret("EMAIL_ADDRESS");
export const EMAIL_APP_PASSWORD = defineSecret("EMAIL_APP_PASSWORD");
export const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY"); // Define GEMINI_API_KEY

export const createPet = onCallGenkit(createPetFlow);

export const generateDiary = onCallGenkit(dailyDiaryFlow);

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getImapClient } from "./utils";
import { simpleParser } from "mailparser";
import { Readable } from 'stream'; // Import Readable from stream
// db is already defined in this file, no need to import it again.

// Function to check for new emails and create pets
async function checkNewEmailsAndCreatePet(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    const imap = await getImapClient();

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          console.error('Error opening INBOX:', err);
          reject(err);
          return;
        }
        // Search for unseen emails
        imap.search(['UNSEEN'], async (searchErr, results) => {
          if (searchErr) {
            console.error('Error searching for unseen emails:', searchErr);
            reject(searchErr);
            return;
          }

          if (results.length === 0) {
            console.log('No new emails found.');
            imap.end();
            resolve();
            return;
          }

          console.log(`Found ${results.length} new emails.`);
          const fetch = imap.fetch(results, { bodies: '' });

          fetch.on('message', (msg, seqno) => {
            msg.on('body', async (stream: Readable, info) => { // Use Readable type
              try {
                const parsed = await simpleParser(stream);
                const senderEmail = parsed.from?.value[0]?.address;

                if (!senderEmail) {
                  console.log(`No sender found in message ${seqno}.`);
                  return;
                }
                console.log(`Processing email from: ${senderEmail}`);

                // Check if pet already exists for this email
                const existingPet = await db
                  .collection("pets")
                  .where("email", "==", senderEmail)
                  .limit(1)
                  .get();

                if (!existingPet.empty) {
                  console.log(`Pet already exists for email: ${senderEmail}. Skipping creation.`);
                  // Mark as read even if pet exists to avoid reprocessing
                  imap.addFlags(results.filter(r => r === seqno), ['\\Seen'], (flagErr) => { // results might contain multiple seqno, filter for current
                    if (flagErr) console.error('Error marking email as read:', flagErr);
                  });
                  return;
                }

                // Call the Genkit flow to create a pet
                console.log(`Attempting to create pet for: ${senderEmail}`);
                await runFlow(createPetFlow, { email: senderEmail });
                console.log(`Pet creation flow initiated for: ${senderEmail}`);

                // Mark email as read after processing
                // Note: This might mark as read even if runFlow fails internally,
                // depending on desired retry behavior, this might need adjustment.
                imap.addFlags(results.filter(r => r === seqno), ['\\Seen'], (flagErr) => {
                   if (flagErr) console.error('Error marking email as read after processing:', flagErr);
                });

              } catch (procErr) {
                console.error(`Error processing message ${seqno}:`, procErr);
                // Decide if to mark as read on error or leave for retry
              }
            });
            msg.once('end', () => {
              console.log(`Finished processing message ${seqno}`);
            });
          });

          fetch.once('error', (fetchErr) => {
            console.error('Fetch error:', fetchErr);
            // We might not want to reject the whole promise here,
            // as some messages might have been processed.
            // imap.end(); // Close connection on fetch error
            // reject(fetchErr);
          });

          fetch.once('end', () => {
            console.log('Done fetching all messages.');
            // All messages have been processed (or attempted)
            // Now mark all *successfully fetched* messages as read if not done individually
            // However, individual marking is preferred for robustness.
            // If not marking individually, can do:
            // imap.addFlags(results, ['\\Seen'], (flagErr) => {
            //   if (flagErr) console.error('Error marking batch as read:', flagErr);
            // });
            imap.end();
            resolve();
          });
        });
      });
    });

    imap.once('error', (err: Error) => { // Added type for err
      console.error('IMAP connection error:', err);
      reject(err);
    });

    imap.connect();
  });
}

// Firebase Function: Check for new emails periodically
export const emailCheckTrigger = onSchedule(
  {
    schedule: "*/10 * * * *", // Every 10 minutes
    timeZone: "Asia/Tokyo",
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD], // Add secrets
  },
  async () => {
    try {
      console.log("Scheduled email check triggered.");
      await checkNewEmailsAndCreatePet();
      console.log("Email check completed.");
    } catch (error) {
      console.error("Error in emailCheckTrigger:", error);
      // Depending on the error, you might want to throw it to signal failure
      // or handle it gracefully. For scheduled functions, unhandled errors
      // can lead to retries or logging as failed executions.
    }
  }
);

// Firebase Function: Pet Creation Trigger (Gmail Push) - This is now handled by emailCheckTrigger
/*
export const createPetFlowTrigger = onMessagePublished(
  {
    topic: "gmail-push",
    secrets: [
      GMAIL_CLIENT_ID, // These would need to be defined if this trigger was used
      GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN,
      GEMINI_API_KEY,
    ],
  },
  async (event) => {
    // ... (original commented out code for processing Pub/Sub message)
  }
);
*/

// GEMINI_API_KEY is now defined in this file. No need to import from genkit.config.

// Firebase Function: Daily Diary Generation Trigger
export const dailyDiaryTrigger = onSchedule(
  {
    schedule: "0 9 * * *", // Daily at 09:00 JST (adjust as needed, UTC is 0 0 * * *)
    timeZone: "Asia/Tokyo",
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD, GEMINI_API_KEY],
  },
  async () => {
    try {
      console.log("Starting daily diary generation for all pets.");
      const petsSnapshot = await db.collection("pets").get();
      if (petsSnapshot.empty) {
        console.log("No pets found to generate diaries for.");
        return;
      }

      console.log(`Found ${petsSnapshot.size} pets to process.`);
      const promises = petsSnapshot.docs.map(async (petDoc) => {
        const petId = petDoc.id;
        try {
          console.log(`Processing diary for pet: ${petId}`);
          await runFlow(dailyDiaryFlow, { petId });
          console.log(`Diary generated successfully for pet: ${petId}`);
        } catch (flowError) {
          console.error(`Error generating diary for pet ${petId}:`, flowError);
        }
      });

      await Promise.allSettled(promises);
      console.log("Daily diary generation process completed.");
    } catch (error) {
      console.error("Error in dailyDiaryTrigger:", error);
    }
  }
);
