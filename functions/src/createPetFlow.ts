import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { sendEmail } from "./email";
import { PetProfile } from "./types";
import { db } from "./firebase";
import { ai, EmptySchema, PetProfileSchema, PetProfileData } from "./genkit.config";

// Zod schemas for input/output validation
const CreatePetInputSchema = z.object({
  email: z.string(),
});

const CreatePetOutputSchema = z.object({
  profile: PetProfileSchema,
});

// Flow #1: Pet Creation Flow (AI処理のみ)
export const createPetFlow = ai.defineFlow(
  {
    name: "createPetFlow",
    inputSchema: CreatePetInputSchema,
    outputSchema: CreatePetOutputSchema,
  },
  async (input) => {
    console.log(`Generating pet profile for email: ${input.email}`);

    // AI処理のみ: Generate pet profile
    const petProfilePrompt = ai.prompt<
      typeof EmptySchema,
      typeof PetProfileSchema
    >("create-pet-profile");
    const { output } = await petProfilePrompt({});
    if (!output) {
      throw new Error("Failed to generate pet profile");
    }

    console.log(`Pet profile generated for: ${input.email}`);

    return {
      profile: output,
    };
  }
);

// 分離されたFirestore保存関数
export async function savePetToFirestore(
  email: string,
  profile: PetProfileData
): Promise<string> {
  const petRef = db.collection("pets").doc();
  const petId = petRef.id;

  const petData: PetProfile = {
    email: email,
    profile: profile,
    createdAt: Timestamp.fromDate(new Date()),
    destinations: [],
  };

  await petRef.set(petData);
  console.log(`Pet saved to Firestore with ID: ${petId}`);

  return petId;
}

// 分離されたメール送信関数
export async function sendPetCreationEmail(
  email: string,
  profile: PetProfileData
): Promise<void> {
  const subject = "[旅ペット作成完了]";
  const body = `
こんにちは！

あなたの旅ペットが誕生しました🎉

${JSON.stringify(profile)}

これからこのペットが毎日旅日記をお届けします。
どんな冒険が待っているか、お楽しみに！

旅ペットチーム
`;

  await sendEmail(email, subject, body);
  console.log(`Creation email sent to: ${email}`);
}
