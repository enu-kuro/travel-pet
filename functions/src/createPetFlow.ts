import { Timestamp } from "firebase-admin/firestore";
import { z } from "zod";
import { PetProfile, sendEmail } from "./utils";
import { db } from "./index"; // Import the ai instance
import { ai } from "./genkit.config";

// Zod schemas for input/output validation
const CreatePetInputSchema = z.object({
  email: z.string(),
});

const CreatePetOutputSchema = z.object({
  petId: z.string(),
  profile: z.string(),
});

// Flow #1: Pet Creation Flow
export const createPetFlow = ai.defineFlow(
  {
    name: "createPetFlow",
    inputSchema: CreatePetInputSchema,
    outputSchema: CreatePetOutputSchema,
  },
  async (input) => {
    // TODO: Validate email format
    console.log(`Creating pet for email: ${input.email}`);

    const inputSchema = z.object({});
    const outputSchema = z.object({ profile: z.string() });

    const petProfilePrompt = ai.prompt<typeof inputSchema, typeof outputSchema>(
      "create-pet-profile"
    );
    const { output } = await petProfilePrompt({});
    if (!output || !output.profile) {
      throw new Error("Failed to generate pet profile");
    }
    const profile = output.profile;

    // Step B: Persist to Firestore
    const petRef = db.collection("pets").doc();
    const petId = petRef.id;

    const petData: PetProfile = {
      email: input.email,
      profile: profile,
      createdAt: Timestamp.fromDate(new Date()),
    };

    await petRef.set(petData);
    console.log(`Pet created with ID: ${petId}`);

    // Step C: Send creation complete email (mocked)
    const subject = "[旅ペット作成完了]";
    const body = `
こんにちは！

あなたの旅ペットが誕生しました🎉

${profile}

これからこのペットが毎日旅日記をお届けします。
どんな冒険が待っているか、お楽しみに！

旅ペットチーム
`;

    await sendEmail(input.email, subject, body);
    console.log(`Creation email sent to: ${input.email}`);

    return {
      petId: petId,
      profile: profile,
    };
  }
);
