import { sendEmail } from "./email";
import { PetProfile, DiaryEntry } from "./types";
import { db } from "./firebase";
import { FieldValue } from "firebase-admin/firestore";
import { Destination, PetProfileData } from "./genkit.config";


// 分離されたFirestore読み取り関数
export async function getPetFromFirestore(
  petId: string
): Promise<{ email: string; profile: PetProfileData } | null> {
  const petDoc = await db.collection("pets").doc(petId).get();

  if (!petDoc.exists) {
    console.error(`Pet not found: ${petId}`);
    return null;
  }

  const petData = petDoc.data() as PetProfile;
  return {
    email: petData.email,
    profile: petData.profile,
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
      destinations: FieldValue.arrayUnion(itinerary),
    });

  console.log(`Destination saved to Firestore for pet: ${petId}`);
}

export async function getDestinationFromFirestore(
  petId: string
): Promise<Destination | null> {
  const petDoc = await db.collection("pets").doc(petId).get();

  if (!petDoc.exists) {
    return null;
  }

  const data = petDoc.data() as Partial<PetProfile>;
  return data.nextDestination ?? null;
}

// 分離されたFirestore保存関数
export async function saveDiaryToFirestore(
  petId: string,
  itinerary: Destination,
  diary: string
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const diaryEntry: DiaryEntry = {
    itinerary: itinerary,
    diary: diary,
    date: today,
  };

  await db
    .collection("pets")
    .doc(petId)
    .collection("diaries")
    .doc(today)
    .set(diaryEntry);

  console.log(`Diary saved to Firestore for pet: ${petId}`);
}

// 分離されたメール送信関数
export async function sendDiaryEmail(
  email: string,
  itinerary: Destination,
  diary: string
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

  await sendEmail(email, subject, body);
  console.log(`Diary email sent to: ${email} for ${location}`);
}
