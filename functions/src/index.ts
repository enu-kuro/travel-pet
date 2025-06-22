import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, onCallGenkit } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { simpleParser } from "mailparser";
import { Readable } from "stream";

import {
  createPetFlow,
  savePetToFirestore,
  sendPetCreationEmail,
} from "./createPetFlow";
import {
  dailyDiaryFlow,
  getPetFromFirestore,
  saveDiaryToFirestore,
  sendDiaryEmail,
} from "./dailyDiaryFlow";
import { getImapClient, getAliasEmailAddress } from "./utils";
import {
  EMAIL_ADDRESS,
  EMAIL_APP_PASSWORD,
  SecretProvider,
  FirebaseSecretProvider,
} from "./config";

initializeApp();
export const db = getFirestore();

export const createPet = onCallGenkit(createPetFlow);
export const generateDiary = onCallGenkit(dailyDiaryFlow);

// テスト用のインターフェース
export interface EmailProcessor {
  checkExistingPet(email: string): Promise<boolean>;
  createPet(email: string): Promise<void>;
}

export class FirestoreEmailProcessor implements EmailProcessor {
  constructor(private firestore: FirebaseFirestore.Firestore) {}

  async checkExistingPet(email: string): Promise<boolean> {
    const existingPet = await this.firestore
      .collection("pets")
      .where("email", "==", email)
      .limit(1)
      .get();

    return !existingPet.empty;
  }

  async createPet(email: string): Promise<void> {
    // AI処理のみ実行
    const result = await createPetFlow({ email });

    // Firestore保存
    const petId = await savePetToFirestore(email, result.profile);
    console.log(`Pet created with ID: ${petId}`);
    // メール送信
    await sendPetCreationEmail(email, result.profile);
  }
}

// メール処理（シンプル版）
export async function processEmailMessage(
  stream: Readable,
  seqno: number,
  processor: EmailProcessor
): Promise<void> {
  const parsed = await simpleParser(stream);
  const senderEmail = parsed.from?.value[0]?.address;

  if (!senderEmail) {
    console.log(`No sender found in message ${seqno}`);
    return;
  }

  console.log(`Processing email from: ${senderEmail}`);

  const petExists = await processor.checkExistingPet(senderEmail);
  if (petExists) {
    console.log(`Pet already exists for ${senderEmail}`);
    return;
  }

  console.log(`Creating pet for: ${senderEmail}`);
  await processor.createPet(senderEmail);
  console.log(`Pet created for: ${senderEmail}`);
}

export async function checkNewEmailsAndCreatePet(
  secretProvider: SecretProvider = new FirebaseSecretProvider(),
  processor: EmailProcessor = new FirestoreEmailProcessor(db)
): Promise<void> {
  const imap = await getImapClient(secretProvider);
  const aliasEmail = await getAliasEmailAddress(secretProvider);

  console.log(`Checking emails for: ${aliasEmail}`);

  return new Promise((resolve, reject) => {
    imap.once("ready", () => {
      imap.openBox("INBOX", false, (err: Error) => {
        if (err) return reject(err);

        imap.search(
          ["UNSEEN", ["TO", aliasEmail]],
          async (searchErr: Error, results: number[]) => {
            if (searchErr) return reject(searchErr);

            if (results.length === 0) {
              console.log("No new emails found");
              imap.end();
              return resolve();
            }

            console.log(`Found ${results.length} emails`);
            const fetch = imap.fetch(results, { bodies: "" });
            let processed = 0;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            fetch.on("message", (msg: any, seqno: number) => {
              msg.on("body", async (stream: Readable) => {
                try {
                  await processEmailMessage(stream, seqno, processor);
                } catch (error) {
                  console.error(`Error processing email ${seqno}:`, error);
                }

                processed++;
                if (processed === results.length) {
                  imap.addFlags(results, ["\\Seen"], () => {
                    imap.end();
                    resolve();
                  });
                }
              });
            });

            fetch.once("error", reject);
          }
        );
      });
    });

    imap.once("error", reject);
    imap.connect();
  });
}

// 日記生成（シンプル版）
export async function generateDiariesForAllPets(): Promise<void> {
  const petsSnapshot = await db.collection("pets").get();

  if (petsSnapshot.empty) {
    console.log("No pets found");
    return;
  }

  console.log(`Processing ${petsSnapshot.size} pets`);

  const promises = petsSnapshot.docs.map(async (petDoc) => {
    const petId = petDoc.id;
    try {
      // Firestoreからペット情報を取得
      const petData = await getPetFromFirestore(petId);
      if (!petData) {
        console.error(`Failed to get pet data for: ${petId}`);
        return;
      }

      // AI処理のみ実行
      const result = await dailyDiaryFlow({ profile: petData.profile });

      if (result.success && result.itinerary && result.diary) {
        // Firestoreに日記を保存
        await saveDiaryToFirestore(petId, result.itinerary, result.diary);

        // メール送信
        await sendDiaryEmail(petData.email, result.itinerary, result.diary);
      }

      console.log(`Diary generated for pet: ${petId}`);
    } catch (error) {
      console.error(`Failed to generate diary for pet ${petId}:`, error);
    }
  });

  await Promise.allSettled(promises);
  console.log("Diary generation completed");
}

export const emailCheckTrigger = onSchedule(
  {
    schedule: "*/10 * * * *",
    timeZone: "Asia/Tokyo",
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD],
  },
  async () => {
    try {
      await checkNewEmailsAndCreatePet();
    } catch (error) {
      console.error("Email check failed:", error);
      throw error;
    }
  }
);

// Helper function for generateDiariesForAllPets HTTP logic
async function generateDiariesForAllPetsHandler(
  generateDiariesFn: () => Promise<void>
) {
  try {
    await generateDiariesFn();
    return { success: true, message: "Diary generation started." };
  } catch (error) {
    console.error("HTTP trigger for diary generation failed:", error);
    return { success: false, message: "Diary generation failed.", error: (error as Error).message } as { success: boolean; message: string; error?: string };
  }
}

// Helper function for checkNewEmailsAndCreatePet HTTP logic
async function checkNewEmailsAndCreatePetHandler(
  checkEmailsFn: () => Promise<void>
) {
  try {
    await checkEmailsFn();
    return { success: true, message: "Email check and pet creation started." };
  } catch (error) {
    console.error("HTTP trigger for email check failed:", error);
    return { success: false, message: "Email check failed.", error: (error as Error).message } as { success: boolean; message: string; error?: string };
  }
}

// HTTP-callableラッパー関数
export const generateDiariesForAllPetsHttp = onCall(
  { secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD] },
  // In production, pass the actual functions
  async (_request) => generateDiariesForAllPetsHandler(generateDiariesForAllPets)
);

export const checkNewEmailsAndCreatePetHttp = onCall(
  { secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD] },
  // In production, pass the actual functions
  async (_request) => checkNewEmailsAndCreatePetHandler(checkNewEmailsAndCreatePet)
);

// Export handlers for testing purposes
export const testing = {
  generateDiariesForAllPetsHandler,
  checkNewEmailsAndCreatePetHandler,
};

export const dailyDiaryTrigger = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Asia/Tokyo",
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD],
  },
  async () => {
    try {
      await generateDiariesForAllPets();
    } catch (error) {
      console.error("Diary generation failed:", error);
      throw error;
    }
  }
);
