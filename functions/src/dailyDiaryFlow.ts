import { z } from "zod";
import { sendEmail } from "./email";
import { PetProfile, DiaryEntry } from "./types";
import { db } from "./firebase";
import { FieldValue } from "firebase-admin/firestore";
import {
  ai,
  DestinationSchema,
  GenerateDestinationInputSchema,
  GenerateDiaryInputSchema,
  DiarySchema,
  PersonaSchema,
} from "./genkit.config";

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


const generateDestinationPrompt = ai.prompt<
  typeof GenerateDestinationInputSchema,
  typeof DestinationSchema
>("generate-destination");

const generateDiaryPrompt = ai.prompt<
  typeof GenerateDiaryInputSchema,
  typeof DiarySchema
>("generate-diary");

export const generateDestinationFlow = ai.defineFlow(
  {
    name: "generateDestinationFlow",
    inputSchema: DestinationInputSchema,
    outputSchema: DestinationOutputSchema,
  },
  async (input) => {
    let personaDna: unknown;
    try {
      personaDna = JSON.parse(input.profile).persona_dna;
    } catch (e) {
      console.error("Invalid profile JSON", e);
      return { success: false };
    }

    const { output } = await generateDestinationPrompt({
      persona_dna: personaDna as z.infer<typeof PersonaSchema>,
      date: new Date().toISOString().split("T")[0],
    });
    if (!output) {
      console.error("Failed to generate destination");
      return { success: false };
    }
    return { success: true, itinerary: JSON.stringify(output) };
  }
);

export const generateDiaryFlow = ai.defineFlow(
  {
    name: "generateDiaryFlow",
    inputSchema: DiaryInputSchema,
    outputSchema: DiaryOutputSchema,
  },
  async (input) => {
    let personaDna: unknown;
    try {
      personaDna = JSON.parse(input.profile).persona_dna;
    } catch (e) {
      console.error("Invalid profile JSON", e);
      return { success: false };
    }

    let travelMaterial: unknown;
    try {
      travelMaterial = JSON.parse(input.destination);
    } catch (e) {
      console.error("Invalid destination JSON", e);
      return { success: false };
    }

    const { output } = await generateDiaryPrompt({
      persona_dna: personaDna as z.infer<typeof PersonaSchema>,
      travel_material: travelMaterial as z.infer<typeof DestinationSchema>,
    });
    if (!output || !output.diary) {
      console.error("Failed to generate diary");
      return { success: false };
    }
    return { success: true, diary: output.diary };
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
): Promise<string | null> {
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
  let location = itinerary;
  try {
    const parsed = JSON.parse(itinerary);
    if (parsed.selected_location) {
      location = parsed.selected_location;
    }
  } catch {
    // ignore parsing errors and use raw itinerary
  }
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
