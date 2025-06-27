import { sendEmail } from "./email";
import { PetProfile, DiaryEntry } from "./types";
import { db } from "./firebase";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
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

  // 元画像を保存
  const base64 = dataUrl.split(",", 2)[1];
  const buffer = Buffer.from(base64, "base64");
  const originalPath = `diaryImages/${petId}/${date}.png`;
  const originalFile = bucket.file(originalPath);
  await originalFile.save(buffer, { contentType: "image/png" });

  // リサイズ後のファイル名を組み立て
  const resizedPath = `diaryImages/${petId}/${date}${IMAGE_RESIZE_SUFFIX}.png`;
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
こんにちは！

今日の旅日記をお届けします📖

${diary}

それでは、また明日の冒険をお楽しみに！

あなたの旅ペットより
`;

  let htmlBody: string | undefined;
  if (imageUrl) {
    htmlBody = `<p>こんにちは！</p><p>今日の旅日記をお届けします📖</p><p>${diary.replace(
      /\n/g,
      "<br>"
    )}</p><img src="${imageUrl}" alt="diary image"/><p>それでは、また明日の冒険をお楽しみに！</p><p>あなたの旅ペットより</p>`;
  }

  await sendEmail(email, subject, body, undefined, undefined, {
    html: htmlBody,
  });
  console.log(`Diary email sent to: ${email} for ${location}`);
}
