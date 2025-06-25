import { db } from "./firebase";
import { PET_LIFESPAN_DAYS } from "./config";
import { PetProfile } from "./types";
import { sendEmail } from "./email";

export async function sendFarewellEmail(email: string): Promise<void> {
  const subject = "[旅ペットとのお別れ]";
  const body = `
こんにちは！

あなたの旅ペットとの冒険は終了しました。
今まで一緒に旅をしていただき、ありがとうございました。

旅ペットチーム
`;

  await sendEmail(email, subject, body);
  console.log(`Farewell email sent to: ${email}`);
}

// Delete pets whose lifetime exceeds PET_LIFESPAN_DAYS
export async function deleteExpiredPets(): Promise<void> {
  const petsSnapshot = await db.collection("pets").get();

  if (petsSnapshot.empty) {
    console.log("No pets found");
    return;
  }

  const now = Date.now();

  const promises = petsSnapshot.docs.map(async (petDoc) => {
    const petData = petDoc.data() as PetProfile;
    const createdAt = petData.createdAt.toDate();
    const ageInDays =
      (now - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays >= PET_LIFESPAN_DAYS) {
      // delete diaries subcollection
      const diaries = await petDoc.ref.collection("diaries").listDocuments();
      await Promise.all(diaries.map((d) => d.delete()));
      await petDoc.ref.delete();
      await sendFarewellEmail(petData.email);
      console.log(`Deleted expired pet: ${petDoc.id}`);
    }
  });

  await Promise.all(promises);
}
