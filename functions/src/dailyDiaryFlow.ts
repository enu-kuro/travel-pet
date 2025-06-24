import { z } from "zod";
import { sendEmail } from "./email";
import { PetProfile, DiaryEntry } from "./types";
import { db } from "./firebase";
import { ai } from "./genkit.config";

// Schemas for the new destination generation flow
const GenerateDestinationInputSchema = z.object({
  profile: z.string(),
});

const GenerateDestinationOutputSchema = z.object({
  success: z.boolean(),
  itinerary: z.string().optional(),
});

const generateDestinationPrompt = ai.prompt<
  z.ZodObject<{ profile: z.ZodString }>,
  z.ZodObject<{ destination: z.ZodString }>
>("generate-destination");

const generateDiaryPrompt = ai.prompt<
  z.ZodObject<{ profile: z.ZodString; destination: z.ZodString }>,
  z.ZodObject<{ diary: z.ZodString }>
>("generate-diary");

// New Flow: Destination Generation
export const generateDestinationFlow = ai.defineFlow(
  {
    name: "generateDestinationFlow",
    inputSchema: GenerateDestinationInputSchema,
    outputSchema: GenerateDestinationOutputSchema,
  },
  async (input) => {
    console.log(
      `Generating destination for profile: ${input.profile.substring(0, 50)}...`
    );

    const { output: destOutput } = await generateDestinationPrompt({
      profile: input.profile,
    });

    if (!destOutput || !destOutput.destination) {
      console.error("Failed to generate destination");
      return { success: false };
    }
    const itinerary = destOutput.destination;
    console.log(`Destination generated: ${itinerary}`);

    return {
      success: true,
      itinerary: itinerary,
    };
  }
);

// Renamed Zod schemas for input/output validation for the diary generation flow
const GenerateDiaryInputSchema = z.object({
  profile: z.string(),
  itinerary: z.string(), // Itinerary is now an input
});

const GenerateDiaryOutputSchema = z.object({
  success: z.boolean(),
  diary: z.string().optional(), // Itinerary is no longer output here
});

// Modified Flow: Diary Generation (receives destination as input)
export const generateDiaryFromDestinationFlow = ai.defineFlow(
  {
    name: "generateDiaryFromDestinationFlow",
    inputSchema: GenerateDiaryInputSchema,
    outputSchema: GenerateDiaryOutputSchema,
  },
  async (input) => {
    console.log(
      `Generating diary for profile: ${input.profile.substring(
        0,
        50
      )}... with itinerary: ${input.itinerary}`
    );

    // AI処理のみ: 日記生成
    const { output: diaryOutput } = await generateDiaryPrompt({
      profile: input.profile,
      destination: input.itinerary, // Use input.itinerary
    });
    if (!diaryOutput || !diaryOutput.diary) {
      console.error("Failed to generate diary");
      return { success: false };
    }
    const diary = diaryOutput.diary;

    console.log(`Diary generated for itinerary: ${input.itinerary}`);

    return {
      success: true,
      diary: diary, // Only diary is returned
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
