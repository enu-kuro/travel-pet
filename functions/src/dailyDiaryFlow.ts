import { z } from "zod";
import { PetProfile, DiaryEntry, sendEmail } from "./utils";
import { ai, db } from "./index"; // Import the ai instance

// Zod schemas for input/output validation
const DailyDiaryInputSchema = z.object({
  petId: z.string(),
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

// Flow #2: Daily Diary Generation Flow
export const dailyDiaryFlow = ai.defineFlow(
  {
    name: "dailyDiaryFlow",
    inputSchema: DailyDiaryInputSchema,
    outputSchema: DailyDiaryOutputSchema,
  },
  async (input) => {
    console.log(`Generating diary for pet: ${input.petId}`);

    // Read profile from Firestore
    const petDoc = await db.collection("pets").doc(input.petId).get();

    if (!petDoc.exists) {
      console.error(`Pet not found: ${input.petId}`);
      return { success: false };
    }

    const petData = petDoc.data() as PetProfile;

    // 旅行先生成
    const { output: destOutput } = await generateDestinationPrompt({
      profile: petData.profile,
    });
    if (!destOutput || !destOutput.destination) {
      console.error("Failed to generate destination");
      return { success: false };
    }
    const itinerary = destOutput.destination;

    // 日記生成
    const { output: diaryOutput } = await generateDiaryPrompt({
      profile: petData.profile,
      destination: itinerary,
    });
    if (!diaryOutput || !diaryOutput.diary) {
      console.error("Failed to generate diary");
      return { success: false };
    }
    const diary = diaryOutput.diary;

    // Persist diary entry to Firestore
    const today = new Date().toISOString().split("T")[0];
    const diaryEntry: DiaryEntry = {
      itinerary: itinerary,
      diary: diary,
      date: today,
    };

    await db
      .collection("pets")
      .doc(input.petId)
      .collection("diaries")
      .doc(today)
      .set(diaryEntry);

    // Step E: Send diary email (mocked)
    const subject = `[旅日記] ${itinerary}`;
    const body = `
こんにちは！

今日の旅日記をお届けします📖

${diary}

それでは、また明日の冒険をお楽しみに！

あなたの旅ペットより
`;

    await sendEmail(petData.email, subject, body);
    console.log(`Diary email sent to: ${petData.email} for ${itinerary}`);

    return {
      success: true,
      itinerary: itinerary,
      diary: diary,
    };
  }
);
