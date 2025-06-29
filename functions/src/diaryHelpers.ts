import { sendEmail } from "./email";
import { PetProfile, DiaryEntry } from "./types";
import { db } from "./firebase";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { randomUUID } from "node:crypto";
import { Destination, PetProfileData } from "./genkit.config";

// Retrieve basic pet data from Firestore
export async function getPetFromFirestore(petId: string): Promise<{
  email: string;
  profile: PetProfileData;
  destinations?: string[];
} | null> {
  const petDoc = await db.collection("pets").doc(petId).get();

  if (!petDoc.exists) {
    console.error(`Pet not found: ${petId}`);
    return null;
  }

  const petData = petDoc.data() as PetProfile;
  return {
    email: petData.email,
    profile: petData.profile,
    destinations: petData.destinations,
  };
}

export async function saveDestinationToFirestore(
  petId: string,
  itinerary: Destination
): Promise<void> {
  await db
    .collection("pets")
    .doc(petId)
    .update({
      nextDestination: itinerary,
      destinations: FieldValue.arrayUnion(itinerary.selected_location),
    });

  console.log(`Destination saved to Firestore for pet: ${petId}`);
}

export const IMAGE_RESIZE_SUFFIX = "_512x512";

export async function saveImageToStorage(
  dataUrl: string,
  petId: string,
  date: string
): Promise<string> {
  const bucket = getStorage().bucket();

  const id = randomUUID();

  // 元画像を保存
  const base64 = dataUrl.split(",", 2)[1];
  const buffer = Buffer.from(base64, "base64");
  const basePath = `diaryImages/${petId}/${date}_${id}`;
  const originalPath = `${basePath}.png`;
  const originalFile = bucket.file(originalPath);
  await originalFile.save(buffer, { contentType: "image/png" });

  // リサイズ後のファイル名を組み立て
  const resizedPath = `${basePath}${IMAGE_RESIZE_SUFFIX}.png`;
  const encodedResizedPath = encodeURIComponent(resizedPath);

  // リサイズ後画像のダウンロード URL を返す
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedResizedPath}?alt=media`;
}

// Store the generated diary entry in Firestore
export async function saveDiaryToFirestore(
  petId: string,
  itinerary: Destination,
  diary: string,
  imageUrl?: string
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const diaryEntry: DiaryEntry = {
    itinerary: itinerary,
    diary: diary,
    date: today,
    imageUrl,
  };

  await db
    .collection("pets")
    .doc(petId)
    .collection("diaries")
    .doc(today)
    .set(diaryEntry);

  console.log(`Diary saved to Firestore for pet: ${petId}`);
}

export async function getDiaryFromFirestore(
  petId: string,
  date: string
): Promise<DiaryEntry | null> {
  const doc = await db
    .collection("pets")
    .doc(petId)
    .collection("diaries")
    .doc(date)
    .get();

  if (!doc.exists) {
    return null;
  }

  return doc.data() as DiaryEntry;
}

// Send the daily diary email to the pet owner
export async function sendDiaryEmail(
  email: string,
  itinerary: Destination,
  diary: string,
  imageUrl?: string
): Promise<void> {
  const location = itinerary.selected_location ?? "";
  const subject = `[旅日記] ${location}`;
  const body = `
こんにちは、たびぺっち運営チームです。

あなたの旅ペットから本日の旅の便りが届きました。
${location ? `今回は「${location}」を訪れています。` : ""}

———本日の旅日記———
${diary}
———

明日はどんな景色を見せてくれるのでしょうか。
楽しみにお待ちください。

旅するデジタルペット『たびぺっち』チーム
`;

  const locationLine = location
    ? `<p>今回は「${location}」を訪れています。</p>`
    : "";
  const imageTag = imageUrl
    ? `<img src="${imageUrl}" alt="diary image" style="display:block;margin-top:0.5em;"/>`
    : "";
  const diaryHtml = diary.replace(/\n/g, "<br>");
  const diarySection = `<div style="border:1px solid #eee;padding:1em;margin:1em 0;background:#fafafa;font-family:serif;line-height:1.6;">${diaryHtml}${imageTag}</div>`;
  // eslint-disable-next-line quotes
  const htmlBody = `<p>こんにちは、たびぺっち運営チームです。</p><p>あなたの旅ペットから本日の旅便りが届きました。</p>${locationLine}${diarySection}<p>明日はどんな景色を見せてくれるのでしょうか。<br>楽しみにお待ちください。</p><p>旅するデジタルペット『たびぺっち』チーム</p>`;

  await sendEmail(email, subject, body, undefined, undefined, {
    html: htmlBody,
  });
  console.log(`Diary email sent to: ${email} for ${location}`);
}
