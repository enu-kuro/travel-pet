import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCallGenkit } from "firebase-functions/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { simpleParser } from "mailparser";
import { Readable } from "stream";

import { createPetFlow } from "./createPetFlow";
import { dailyDiaryFlow } from "./dailyDiaryFlow";
import { getImapClient } from "./utils";

initializeApp();
export const db = getFirestore();

// Define secrets for email authentication
export const EMAIL_ADDRESS = defineSecret("EMAIL_ADDRESS");
export const EMAIL_APP_PASSWORD = defineSecret("EMAIL_APP_PASSWORD");
export const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

export const createPet = onCallGenkit(createPetFlow);
export const generateDiary = onCallGenkit(dailyDiaryFlow);

async function checkNewEmailsAndCreatePet(): Promise<void> {
  const imap = await getImapClient();

  return new Promise((resolve, reject) => {
    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err, box) => {
        if (err) {
          console.error("Error opening INBOX:", err);
          reject(err);
          return;
        }

        // Search for unseen emails
        imap.search(["UNSEEN"], (searchErr, results) => {
          if (searchErr) {
            console.error("Error searching for unseen emails:", searchErr);
            reject(searchErr);
            return;
          }

          if (results.length === 0) {
            console.log("No new emails found.");
            imap.end();
            resolve();
            return;
          }

          console.log(`Found ${results.length} new emails.`);
          const fetch = imap.fetch(results, { bodies: "" });

          let processedCount = 0;
          let hasError = false;

          const checkCompletion = () => {
            processedCount++;
            if (processedCount === results.length) {
              imap.end();
              if (hasError) {
                reject(new Error("Some emails failed to process"));
              } else {
                resolve();
              }
            }
          };

          fetch.on("message", (msg, seqno) => {
            msg.on("body", async (stream: Readable, info) => {
              try {
                const parsed = await simpleParser(stream);
                const senderEmail = parsed.from?.value[0]?.address;

                if (!senderEmail) {
                  console.log(`No sender found in message ${seqno}.`);
                  checkCompletion();
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
                  console.log(
                    `Pet already exists for email: ${senderEmail}. Skipping creation.`
                  );

                  // Mark as read
                  imap.addFlags([seqno], ["\\Seen"], (flagErr) => {
                    if (flagErr) {
                      console.error("Error marking email as read:", flagErr);
                    }
                    checkCompletion();
                  });
                  return;
                }

                // FIXED: Call the Genkit flow directly without runFlow
                console.log(`Attempting to create pet for: ${senderEmail}`);
                await createPetFlow({ email: senderEmail });
                console.log(`Pet creation completed for: ${senderEmail}`);

                // Mark email as read after successful processing
                imap.addFlags([seqno], ["\\Seen"], (flagErr) => {
                  if (flagErr) {
                    console.error(
                      "Error marking email as read after processing:",
                      flagErr
                    );
                  }
                  checkCompletion();
                });
              } catch (procErr) {
                console.error(`Error processing message ${seqno}:`, procErr);
                hasError = true;
                checkCompletion();
              }
            });

            msg.once("end", () => {
              console.log(`Finished processing message ${seqno}`);
            });
          });

          fetch.once("error", (fetchErr) => {
            console.error("Fetch error:", fetchErr);
            hasError = true;
            imap.end();
            reject(fetchErr);
          });

          fetch.once("end", () => {
            console.log("Done fetching all messages.");
            // Individual message completion is handled in checkCompletion()
          });
        });
      });
    });

    imap.once("error", (err: Error) => {
      console.error("IMAP connection error:", err);
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
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD, GEMINI_API_KEY],
  },
  async () => {
    try {
      console.log("Scheduled email check triggered.");
      await checkNewEmailsAndCreatePet();
      console.log("Email check completed.");
    } catch (error) {
      console.error("Error in emailCheckTrigger:", error);
      // Let the function fail so Cloud Functions can retry if needed
      throw error;
    }
  }
);

// Firebase Function: Daily Diary Generation Trigger
export const dailyDiaryTrigger = onSchedule(
  {
    schedule: "0 9 * * *", // Daily at 09:00 JST
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
          // FIXED: Call the Genkit flow directly without runFlow
          await dailyDiaryFlow({ petId });
          console.log(`Diary generated successfully for pet: ${petId}`);
        } catch (flowError) {
          console.error(`Error generating diary for pet ${petId}:`, flowError);
          // Don't throw here - let other pets continue processing
        }
      });

      const results = await Promise.allSettled(promises);

      // Log summary of results
      const fulfilled = results.filter((r) => r.status === "fulfilled").length;
      const rejected = results.filter((r) => r.status === "rejected").length;

      console.log(
        `Daily diary generation completed. Success: ${fulfilled}, Failed: ${rejected}`
      );
    } catch (error) {
      console.error("Error in dailyDiaryTrigger:", error);
      throw error;
    }
  }
);
