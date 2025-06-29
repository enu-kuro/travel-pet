import { Timestamp } from "firebase-admin/firestore";
import { onCallGenkit } from "firebase-functions/v2/https";
import { sendEmail } from "../email";
import { PetProfile } from "../types";
import { db } from "../firebase";
import { ai, EmptySchema, PetProfileSchema, PetProfileData } from "../genkit.config";
import { z } from "zod";

// Zod schemas for input/output validation
const CreatePetInputSchema = EmptySchema;

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
  async () => {
    console.log("Generating pet profile");

    // AI処理のみ: Generate pet profile
    const petProfilePrompt = ai.prompt<
      typeof EmptySchema,
      typeof PetProfileSchema
    >("create-pet-profile");
    const { output } = await petProfilePrompt({});
    if (!output) {
      throw new Error("Failed to generate pet profile");
    }

    console.log("Pet profile generated");

    return {
      profile: output,
    };
  }
);

// Save the new pet profile in Firestore
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

// Send the welcome email after pet creation
export async function sendPetCreationEmail(
  email: string,
  profile: PetProfileData
): Promise<void> {
  const subject = "[旅ペット作成完了]";
  const body = `
こんにちは、たびぺっち運営チームです。

あなたの旅ペット「${profile.name}」が誕生しました！

${profile.introduction}

これからこのペットが毎日旅日記をお届けします。
どんな冒険が待っているか、お楽しみに。

※ペットの旅は数日で終了します。
※配信停止は件名に「配信停止」と書いたメールを送るだけで可能です。旅を終えると以降のメールは届きません。
※終了時には登録情報を削除し、メールアドレスを他に利用することはありません。

旅するデジタルペット『たびぺっち』チーム
`;

  // eslint-disable-next-line quotes
  const htmlBody = `<p>こんにちは、たびぺっち運営チームです。</p><p>あなたの旅ペット「${profile.name}」が誕生しました！</p><p>${profile.introduction.replace(
    /\n/g,
    "<br>"
  )}</p><p>これからこのペットが毎日旅日記をお届けします。<br>どんな冒険が待っているか、お楽しみに。</p><p style="font-size:smaller;">ペットの旅は数日で終了します。</p><p style="font-size:smaller;">配信停止は件名に「配信停止」と書いたメールを送るだけで可能です。旅を終えると以降のメールは届きません。</p><p style="font-size:smaller;">終了時には登録情報を削除し、メールアドレスを他に利用することはありません。</p><p>旅するデジタルペット『たびぺっち』チーム</p>`;

  await sendEmail(email, subject, body, undefined, undefined, { html: htmlBody });
  console.log(`Creation email sent to: ${email}`);
}

// Export callable Cloud Function for client access
export const createPet = onCallGenkit(createPetFlow);

