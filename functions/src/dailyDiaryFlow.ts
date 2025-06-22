import { z } from "zod";
import { PetProfile, DiaryEntry, sendEmail } from "./utils.js";
import { db } from "./index.js";
import { ai } from "./genkit.config.js";

// Zod schemas for input/output validation
const DailyDiaryInputSchema = z.object({
  profile: z.string(), // Firestoreから読み取った profile を直接受け取る
});

const DailyDiaryOutputSchema = z.object({
  success: z.boolean(),
  itinerary: z.string().optional(),
  diary: z.string().optional(),
});

const generateDestinationPrompt = ai.prompt<
  z.ZodObject<{ profile: z.ZodString }>,
  z.ZodObject<{ destination: z.ZodString }>
>("generate-destination");

const generateDiaryPrompt = ai.prompt<
  z.ZodObject<{ profile: z.ZodString; destination: z.ZodString }>,
  z.ZodObject<{ diary: z.ZodString }>
>("generate-diary");

// Flow #2: Daily Diary Generation Flow (AI処理のみ)
export const dailyDiaryFlow = ai.defineFlow(
  {
    name: "dailyDiaryFlow",
    inputSchema: DailyDiaryInputSchema,
    outputSchema: DailyDiaryOutputSchema,
  },
  async (input) => {
    console.log(
      `Generating diary for profile: ${input.profile.substring(0, 50)}...`
    );

    // AI処理のみ: 旅行先生成
    const { output: destOutput } = await generateDestinationPrompt({
      profile: input.profile,
    });
    if (!destOutput || !destOutput.destination) {
      console.error("Failed to generate destination");
      return { success: false };
    }
    const itinerary = destOutput.destination;

    // AI処理のみ: 日記生成
    const { output: diaryOutput } = await generateDiaryPrompt({
      profile: input.profile,
      destination: itinerary,
    });
    if (!diaryOutput || !diaryOutput.diary) {
      console.error("Failed to generate diary");
      return { success: false };
    }
    const diary = diaryOutput.diary;

    console.log(`Diary generated: ${itinerary}`);

    return {
      success: true,
      itinerary: itinerary,
      diary: diary,
    };
  }
);

// 分離されたFirestore読み取り関数
export async function getPetFromFirestore(
  petId: string
): Promise<{ email: string; profile: string } | null> {
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

// 分離されたFirestore保存関数
export async function saveDiaryToFirestore(
  petId: string,
  itinerary: string,
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
  itinerary: string,
  diary: string
): Promise<void> {
  const subject = `[旅日記] ${itinerary}`;
  const body = `
こんにちは！

今日の旅日記をお届けします📖

${diary}

それでは、また明日の冒険をお楽しみに！

あなたの旅ペットより
`;

  await sendEmail(email, subject, body);
  console.log(`Diary email sent to: ${email} for ${itinerary}`);
}
