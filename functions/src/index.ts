import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCallGenkit } from "firebase-functions/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineSecret } from "firebase-functions/params";
import { simpleParser } from "mailparser";
import { Readable } from "stream";

import { createPetFlow } from "./createPetFlow";
import { dailyDiaryFlow } from "./dailyDiaryFlow";
import { getImapClient, getAliasEmailAddress } from "./utils";

initializeApp();
export const db = getFirestore();

export const EMAIL_ADDRESS = defineSecret("EMAIL_ADDRESS");
export const EMAIL_APP_PASSWORD = defineSecret("EMAIL_APP_PASSWORD");
export const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

export const createPet = onCallGenkit(createPetFlow);
export const generateDiary = onCallGenkit(dailyDiaryFlow);

// 修正版: エイリアス宛メールのみを対象とし、他のメールには一切触らない
async function checkNewEmailsAndCreatePet(): Promise<void> {
  const imap = await getImapClient();
  const aliasEmail = await getAliasEmailAddress();

  console.log(`Checking for emails sent to: ${aliasEmail}`);

  return new Promise((resolve, reject) => {
    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // 重要: エイリアス宛の未読メールのみを検索
        // 他のメールは検索結果に含まれないため、一切触られない
        imap.search(["UNSEEN", ["TO", aliasEmail]], (searchErr, results) => {
          if (searchErr) {
            reject(searchErr);
            return;
          }

          if (results.length === 0) {
            console.log(`No new emails found for ${aliasEmail}`);
            imap.end();
            resolve();
            return;
          }

          console.log(`Found ${results.length} emails for ${aliasEmail}`);

          const fetch = imap.fetch(results, { bodies: "" });
          let processedCount = 0;
          let hasError = false;

          const checkCompletion = () => {
            processedCount++;
            if (processedCount === results.length) {
              // エイリアス宛メールのみを既読にマーク
              imap.addFlags(results, ["\\Seen"], (flagErr) => {
                if (flagErr) {
                  console.error("Error marking alias emails as read:", flagErr);
                }
                imap.end();
                if (hasError) {
                  reject(new Error("Some emails failed to process"));
                } else {
                  resolve();
                }
              });
            }
          };

          fetch.on("message", (msg, seqno) => {
            msg.on("body", async (stream: Readable) => {
              try {
                const parsed = await simpleParser(stream);
                const senderEmail = parsed.from?.value[0]?.address;

                if (!senderEmail) {
                  console.log(
                    `No sender found in message ${seqno} (alias email)`
                  );
                  checkCompletion();
                  return;
                }

                console.log(`Processing alias email from: ${senderEmail}`);

                // ペット存在チェック
                const existingPet = await db
                  .collection("pets")
                  .where("email", "==", senderEmail)
                  .limit(1)
                  .get();

                if (!existingPet.empty) {
                  console.log(`Pet already exists for ${senderEmail}`);
                  checkCompletion();
                  return;
                }

                // ペット作成
                console.log(`Creating pet for: ${senderEmail}`);
                await createPetFlow({ email: senderEmail });
                console.log(`Pet creation completed for: ${senderEmail}`);

                checkCompletion();
              } catch (error) {
                console.error(`Error processing alias email ${seqno}:`, error);
                hasError = true;
                checkCompletion();
              }
            });
          });

          fetch.once("error", (fetchErr) => {
            console.error("Fetch error:", fetchErr);
            hasError = true;
            imap.end();
            reject(fetchErr);
          });

          fetch.once("end", () => {
            console.log("Done fetching all alias emails");
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

export const emailCheckTrigger = onSchedule(
  {
    schedule: "*/10 * * * *",
    timeZone: "Asia/Tokyo",
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD, GEMINI_API_KEY],
  },
  async () => {
    try {
      console.log("Scheduled email check triggered for alias emails only");
      await checkNewEmailsAndCreatePet();
      console.log("Alias email check completed");
    } catch (error) {
      console.error("Error in emailCheckTrigger:", error);
      throw error;
    }
  }
);

export const dailyDiaryTrigger = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Asia/Tokyo",
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD, GEMINI_API_KEY],
  },
  async () => {
    try {
      console.log("Starting daily diary generation for all pets");
      const petsSnapshot = await db.collection("pets").get();

      if (petsSnapshot.empty) {
        console.log("No pets found to generate diaries for");
        return;
      }

      console.log(`Found ${petsSnapshot.size} pets to process`);

      const promises = petsSnapshot.docs.map(async (petDoc) => {
        const petId = petDoc.id;
        try {
          console.log(`Processing diary for pet: ${petId}`);
          await dailyDiaryFlow({ petId });
          console.log(`Diary generated successfully for pet: ${petId}`);
        } catch (flowError) {
          console.error(`Error generating diary for pet ${petId}:`, flowError);
        }
      });

      const results = await Promise.allSettled(promises);

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
