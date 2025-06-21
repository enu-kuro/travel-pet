import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCallGenkit } from "firebase-functions/https";

import { createPetFlow } from "./createPetFlow";
import { dailyDiaryFlow } from "./dailyDiaryFlow";

initializeApp();
export const db = getFirestore();

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
