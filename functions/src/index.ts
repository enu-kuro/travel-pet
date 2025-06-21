import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
// import { onMessagePublished } from "firebase-functions/v2/pubsub";
// import { onSchedule } from "firebase-functions/v2/scheduler";
// import { defineSecret } from "firebase-functions/params";
// import { google } from "googleapis";
import { genkit } from "genkit";
import { vertexAI } from "@genkit-ai/vertexai";
import { onCallGenkit } from "firebase-functions/https";

import { createPetFlow } from "./createPetFlow";
import { dailyDiaryFlow } from "./dailyDiaryFlow";
// import { PetProfile, DiaryEntry, sendEmail } from "./utils"; // Common utilities - Not directly used in index.ts anymore

// Initialize Firebase Admin
initializeApp();
export const db = getFirestore(); // db can be exported from utils if needed by flows directly

// Initialize Genkit with Vertex AI
// This AI instance should be configured and potentially exported from a central config file (e.g., utils.ts or a dedicated ai.ts)
// For now, we assume flows will use a locally initialized or imported 'ai' instance.
// If 'ai' instance is needed by flows, it should be initialized in utils.ts or passed to flows.
export const ai = genkit({
  plugins: [
    vertexAI({ location: "us-central1", projectId: "travel-pet-b6edb" }),
  ],
});

// Export Genkit Flows as Firebase Functions using onCallGenkit
export const createPet = onCallGenkit(createPetFlow);

export const generateDiary = onCallGenkit(dailyDiaryFlow);

// Commented out sections remain for future reference or re-integration
/*
// Define secrets for Gmail API and Gemini
// const GMAIL_CLIENT_ID = defineSecret("GMAIL_CLIENT_ID");
// const GMAIL_CLIENT_SECRET = defineSecret("GMAIL_CLIENT_SECRET");
// const GMAIL_REFRESH_TOKEN = defineSecret("GMAIL_REFRESH_TOKEN");
// const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

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

// Firebase Function: Pet Creation Trigger (Gmail Push) - DISABLED for now
/*
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
    // ... (original commented out code)
  }
);
*/

// Firebase Function: Daily Diary Generation Trigger
/*
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
    // ... (original commented out code)
  }
);
*/
