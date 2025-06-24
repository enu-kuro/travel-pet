import { z } from "zod";
import { sendEmail } from "./email";
import { PetProfile, DiaryEntry } from "./types";
import { db } from "./firebase";
import { ai } from "./genkit.config";

// Zod schemas for input/output validation
const DestinationInputSchema = z.object({
  profile: z.string(),
});

const DestinationOutputSchema = z.object({
  success: z.boolean(),
  itinerary: z.string().optional(),
});

const DiaryInputSchema = z.object({
  profile: z.string(),
  destination: z.string(),
});

const DiaryOutputSchema = z.object({
  success: z.boolean(),
  diary: z.string().optional(),
});

const DailyDiaryInputSchema = z.object({
  profile: z.string(),
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

export const generateDestinationFlow = ai.defineFlow(
  {
    name: "generateDestinationFlow",
    inputSchema: DestinationInputSchema,
    outputSchema: DestinationOutputSchema,
  },
  async (input) => {
    const { output } = await generateDestinationPrompt({ profile: input.profile });
    if (!output || !output.destination) {
      console.error("Failed to generate destination");
      return { success: false };
    }
    return { success: true, itinerary: output.destination };
  }
);

export const generateDiaryFlow = ai.defineFlow(
  {
    name: "generateDiaryFlow",
    inputSchema: DiaryInputSchema,
    outputSchema: DiaryOutputSchema,
  },
  async (input) => {
    const { output } = await generateDiaryPrompt({
      profile: input.profile,
      destination: input.destination,
    });
    if (!output || !output.diary) {
      console.error("Failed to generate diary");
      return { success: false };
    }
    return { success: true, diary: output.diary };
  }
);

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

    const dest = await generateDestinationFlow({ profile: input.profile });
    if (!dest.success || !dest.itinerary) {
      return { success: false };
    }

    const diaryRes = await generateDiaryFlow({
      profile: input.profile,
      destination: dest.itinerary,
    });
    if (!diaryRes.success || !diaryRes.diary) {
      return { success: false };
    }

    const itinerary = dest.itinerary;
    const diary = diaryRes.diary;

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

export async function saveDestinationToFirestore(
  petId: string,
  itinerary: string
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];

  await db
    .collection("pets")
    .doc(petId)
    .collection("diaries")
    .doc(today)
    .set({ itinerary, date: today });

  console.log(`Destination saved to Firestore for pet: ${petId}`);
}

export async function getDestinationFromFirestore(
  petId: string
): Promise<string | null> {
  const today = new Date().toISOString().split("T")[0];
  const diaryDoc = await db
    .collection("pets")
    .doc(petId)
    .collection("diaries")
    .doc(today)
    .get();

  if (!diaryDoc.exists) {
    return null;
  }

  const data = diaryDoc.data() as Partial<DiaryEntry>;
  return data.itinerary ?? null;
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
