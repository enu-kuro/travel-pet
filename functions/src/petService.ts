import { db } from "./firebase";
import { PET_LIFESPAN_DAYS } from "./config";
import { PetProfile } from "./types";
import { sendEmail } from "./email";

export async function sendFarewellEmail(email: string): Promise<void> {
  const subject = "[旅ペットとのお別れ]";
  const body = `
こんにちは、たびぺっち運営チームです。

長い間ご一緒いただいた旅ペットとの冒険は終了しました。
これまで一緒に旅をしていただき、心より感謝申し上げます。

またお会いできる日を楽しみにしております。

旅するデジタルペット『たびぺっち』チーム
`;

  // eslint-disable-next-line quotes
  const htmlBody = `<p>こんにちは、たびぺっち運営チームです。</p><p>長い間ご一緒いただいた旅ペットとの冒険は終了しました。<br>これまで一緒に旅をしていただき、心より感謝申し上げます。</p><p>またお会いできる日を楽しみにしております。</p><p>旅するデジタルペット『たびぺっち』チーム</p>`;

  await sendEmail(email, subject, body, undefined, undefined, { html: htmlBody });
  console.log(`Farewell email sent to: ${email}`);
}

export async function sendUnsubscribeEmail(email: string): Promise<void> {
  const subject = "[旅ペット配信停止完了]";
  const body = `
こんにちは、たびぺっち運営チームです。

旅ペットの配信停止を承りました。
これまでサービスをご利用いただき、誠にありがとうございました。

旅するデジタルペット『たびぺっち』チーム
`;

  // eslint-disable-next-line quotes
  const htmlBody = `<p>こんにちは、たびぺっち運営チームです。</p><p>旅ペットの配信停止を承りました。<br>これまでサービスをご利用いただき、誠にありがとうございました。</p><p>旅するデジタルペット『たびぺっち』チーム</p>`;

  await sendEmail(email, subject, body, undefined, undefined, { html: htmlBody });
  console.log(`Unsubscribe confirmation sent to: ${email}`);
}

export async function sendExistingPetEmail(email: string): Promise<void> {
  const subject = "[旅ペット登録済み]";
  const body = `
こんにちは、たびぺっち運営チームです。

既に旅ペットを登録されています。
引き続き、旅先からの便りをお楽しみください。

旅するデジタルペット『たびぺっち』チーム
`;

  // eslint-disable-next-line quotes
  const htmlBody = `<p>こんにちは、たびぺっち運営チームです。</p><p>既に旅ペットを登録されています。<br>引き続き、旅先からの便りをお楽しみください。</p><p>旅するデジタルペット『たびぺっち』チーム</p>`;

  await sendEmail(email, subject, body, undefined, undefined, { html: htmlBody });
  console.log(`Existing pet notice sent to: ${email}`);
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

export async function deletePetByEmail(email: string): Promise<boolean> {
  const snapshot = await db
    .collection("pets")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (snapshot.empty) {
    console.log(`No pet found for ${email}`);
    return false;
  }

  const petDoc = snapshot.docs[0];
  const diaries = await petDoc.ref.collection("diaries").listDocuments();
  await Promise.all(diaries.map((d) => d.delete()));
  await petDoc.ref.delete();

  console.log(`Deleted pet for ${email}`);
  return true;
}
