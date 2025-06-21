import { initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
// import { onMessagePublished } from "firebase-functions/v2/pubsub";
// import { onSchedule } from "firebase-functions/v2/scheduler";
// import { defineSecret } from "firebase-functions/params";
// import { google } from "googleapis";
import { genkit } from "genkit";
import { vertexAI, gemini20FlashLite } from "@genkit-ai/vertexai";
import { onCallGenkit } from "firebase-functions/https";
import { z } from "zod";

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Define secrets for Gmail API and Gemini
// const GMAIL_CLIENT_ID = defineSecret("GMAIL_CLIENT_ID");
// const GMAIL_CLIENT_SECRET = defineSecret("GMAIL_CLIENT_SECRET");
// const GMAIL_REFRESH_TOKEN = defineSecret("GMAIL_REFRESH_TOKEN");
// const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Initialize Genkit with Vertex AI
const ai = genkit({
  plugins: [
    vertexAI({ location: "us-central1", projectId: "travel-pet-b6edb" }),
  ],
});

// Gmail API client setup (temporarily disabled)
/*
function getGmailClient() {
  const oauth2Client = new google.auth.OAuth2(
    GMAIL_CLIENT_ID.value(),
    GMAIL_CLIENT_SECRET.value()
  );

  oauth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN.value(),
  });

  return google.gmail({ version: "v1", auth: oauth2Client });
  return null; // Mock for now
}
*/

// Mock email function
async function sendEmail(to: string, subject: string, body: string) {
  console.log("=== MOCK EMAIL ===");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log("=== END MOCK EMAIL ===");

  // TODO: Replace with actual Gmail API implementation
  /*
  const gmail = getGmailClient();
  const emailMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  const encodedMessage = Buffer.from(emailMessage).toString("base64");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });
  */
}

// Interface definitions
interface PetProfile {
  email: string;
  profile: string;
  createdAt: FirebaseFirestore.Timestamp;
}

interface DiaryEntry {
  itinerary: string;
  diary: string;
  date: string;
}

// Zod schemas for input/output validation
const CreatePetInputSchema = z.object({
  email: z.string(),
});

const CreatePetOutputSchema = z.object({
  petId: z.string(),
  profile: z.string(),
});

const DailyDiaryInputSchema = z.object({
  petId: z.string(),
});

const DailyDiaryOutputSchema = z.object({
  success: z.boolean(),
  itinerary: z.string().optional(),
  diary: z.string().optional(),
});

// Flow #1: Pet Creation Flow
const createPetFlow = ai.defineFlow(
  {
    name: "createPetFlow",
    inputSchema: CreatePetInputSchema,
    outputSchema: CreatePetOutputSchema,
  },
  async (input) => {
    // TODO: Validate email format
    console.log(`Creating pet for email: ${input.email}`);

    // Step A: Generate random pet profile using Gemini
    //     const profilePrompt = `
    // あなたは旅行好きのデジタルペットのプロフィールを作成するアシスタントです。
    // 以下の条件でペットのプロフィールを日本語で生成してください：
    // - 名前（可愛らしい動物の名前）
    // - 性格（明るい、好奇心旺盛など）
    // - 旅行の好み（海、山、都市部など）
    // - 100文字以内で簡潔に

    // 返信にはプロフィールの内容のみを含めてください。
    // 例：「私はちび太郎です！好奇心旺盛で冒険好きな子猫です。海辺の町や温泉地が大好きで、美味しい食べ物を探すのが趣味です。毎日新しい発見をするのがワクワクします！」
    // `;

    // const profileResponse = await ai.generate({
    //   model: gemini20FlashLite,
    //   prompt: profilePrompt,
    //   config: {
    //     temperature: 2.0,
    //   },
    // });

    const inputSchema = z.object({}); // input.schema: {}
    const outputSchema = z.object({ profile: z.string() }); // output.schema: { profile: string }

    const petProfilePrompt = ai.prompt<typeof inputSchema, typeof outputSchema>(
      "create-pet-profile"
    );
    const { output } = await petProfilePrompt({});
    if (!output || !output.profile) {
      throw new Error("Failed to generate pet profile");
    }
    const profile = output?.profile;

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

// Flow #2: Daily Diary Generation Flow
const dailyDiaryFlow = ai.defineFlow(
  {
    name: "dailyDiaryFlow",
    inputSchema: DailyDiaryInputSchema,
    outputSchema: DailyDiaryOutputSchema,
  },
  async (input) => {
    console.log(`Generating diary for pet: ${input.petId}`);

    // Step A: Read profile from Firestore
    const petDoc = await db.collection("pets").doc(input.petId).get();

    if (!petDoc.exists) {
      console.error(`Pet not found: ${input.petId}`);
      return { success: false };
    }

    const petData = petDoc.data() as PetProfile;

    // Step B: Generate next travel destination
    const destinationPrompt = `
以下のペットプロフィールに基づいて、次の旅行先を1文で提案してください：

ペットプロフィール: ${petData.profile}

条件：
- 日本国内の具体的な場所
- ペットの性格や好みに合った場所
- 1文で簡潔に（例：「北海道の美瑛町」「沖縄の石垣島」「京都の嵐山」）
`;

    const destinationResponse = await ai.generate({
      model: "gemini-1.5-flash",
      prompt: destinationPrompt,
    });

    const itinerary = destinationResponse.text;

    // Step C: Generate diary text
    const diaryPrompt = `
あなたは旅行中のデジタルペットです。以下の設定で今日の旅日記を書いてください：

ペットプロフィール: ${petData.profile}
今日の旅行先: ${itinerary}

条件：
- 100-150文字の日本語
- ペットの視点から書く
- 今日体験したことや感じたこと
- 明るく楽しい内容
- 次の場所への期待も含める

例：「今日は${itinerary}に来ました！美しい景色に感動して、地元の美味しい料理も堪能しました。現地の人たちもとても親切で、心が温まりました。明日はどんな冒険が待っているのかな？」
`;

    const diaryResponse = await ai.generate({
      model: "gemini-1.5-flash",
      prompt: diaryPrompt,
    });

    const diary = diaryResponse.text;

    // Step D: Save diary to Firestore
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

// Export Genkit Flows as Firebase Functions using onCallGenkit
export const createPet = onCallGenkit(createPetFlow);

export const generateDiary = onCallGenkit(dailyDiaryFlow);

/*
// Firebase Function: Pet Creation Trigger (Gmail Push) - DISABLED for now
export const createPetFlowTrigger = onMessagePublished(
  {
    topic: "gmail-push",
    secrets: [
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN,
      GEMINI_API_KEY,
    ],
  },
  async (event) => {
    console.log("Gmail push notification received - DISABLED for testing");
    // TODO: Re-enable when email functionality is ready
    try {
      console.log("Gmail push notification received");

      const gmail = getGmailClient();

      // Get unread messages
      const messagesResponse = await gmail.users.messages.list({
        userId: "me",
        q: "is:unread",
      });

      const messages = messagesResponse.data.messages || [];

      for (const message of messages) {
        if (!message.id) continue;

        // Get message details
        const messageDetail = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
        });

        // Extract sender email
        const headers = messageDetail.data.payload?.headers || [];
        const fromHeader = headers.find(
          (h) => h.name?.toLowerCase() === "from"
        );

        if (!fromHeader?.value) {
          console.log("No sender found in message");
          continue;
        }

        // Parse email address from "Name <email@domain.com>" format
        const emailMatch = fromHeader.value.match(/<(.+)>/) || [
          null,
          fromHeader.value,
        ];
        const senderEmail = emailMatch[1];

        if (!senderEmail || !senderEmail.includes("@")) {
          console.log("Invalid sender email format");
          continue;
        }

        console.log(`Processing pet creation request from: ${senderEmail}`);

        // Check if pet already exists for this email
        const existingPet = await db
          .collection("pets")
          .where("email", "==", senderEmail)
          .limit(1)
          .get();

        if (!existingPet.empty) {
          console.log(`Pet already exists for email: ${senderEmail}`);
          // Mark as read and continue
          await gmail.users.messages.modify({
            userId: "me",
            id: message.id,
            requestBody: {
              removeLabelIds: ["UNREAD"],
            },
          });
          continue;
        }

        // Run pet creation flow
        await createPetFlow({ email: senderEmail });

        // Mark the original email as read
        await gmail.users.messages.modify({
          userId: "me",
          id: message.id,
          requestBody: {
            removeLabelIds: ["UNREAD"],
          },
        });

        console.log(`Pet creation completed for: ${senderEmail}`);
      }
    } catch (error) {
      console.error("Error in createPetFlowTrigger:", error);
      throw error;
    }
  }
);

// Firebase Function: Daily Diary Generation Trigger
export const dailyDiaryTrigger = onSchedule(
  {
    schedule: "0 9 * * *", // Daily at 09:00 UTC (18:00 JST)
    timeZone: "Asia/Tokyo",
    secrets: [
      GMAIL_CLIENT_ID,
      GMAIL_CLIENT_SECRET,
      GMAIL_REFRESH_TOKEN,
      GEMINI_API_KEY,
    ],
  },
  async () => {
    try {
      console.log("Starting daily diary generation");

      // Query all pets from Firestore
      const petsSnapshot = await db.collection("pets").get();

      console.log(`Found ${petsSnapshot.size} pets to process`);

      // Process each pet
      const promises = petsSnapshot.docs.map(async (petDoc) => {
        try {
          const petId = petDoc.id;
          console.log(`Processing diary for pet: ${petId}`);

          // Run daily diary flow for this pet
          const result = await dailyDiaryFlow({ petId });

          if (result.success) {
            console.log(`Diary generated successfully for pet: ${petId}`);
          } else {
            console.error(`Failed to generate diary for pet: ${petId}`);
          }
        } catch (error) {
          console.error(`Error processing pet ${petDoc.id}:`, error);
          // Continue processing other pets even if one fails
        }
      });

      // Wait for all pets to be processed
      await Promise.allSettled(promises);

      console.log("Daily diary generation completed");
    } catch (error) {
      console.error("Error in dailyDiaryTrigger:", error);
      throw error;
    }
  }
);
*/
