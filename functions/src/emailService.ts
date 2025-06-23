import { Readable } from "stream";
import { simpleParser } from "mailparser";
import { db } from "./firebase";
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
import {
  getImapClient,
  getAliasEmailAddress,
} from "./email";
import {
  SecretProvider,
  FirebaseSecretProvider,
} from "./config";
import { EmailProcessor } from "./types";

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
    const result = await createPetFlow({ email });
    const petId = await savePetToFirestore(email, result.profile);
    console.log(`Pet created with ID: ${petId}`);
    await sendPetCreationEmail(email, result.profile);
  }
}

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
      const petData = await getPetFromFirestore(petId);
      if (!petData) {
        console.error(`Failed to get pet data for: ${petId}`);
        return;
      }

      const result = await dailyDiaryFlow({ profile: petData.profile });

      if (result.success && result.itinerary && result.diary) {
        await saveDiaryToFirestore(petId, result.itinerary, result.diary);
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
