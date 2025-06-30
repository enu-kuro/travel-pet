import { onCallGenkit, onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { checkNewEmailsAndCreatePet } from "./emailService";
import {
  generateDiariesForAllPets,
  sendDiaryEmailsForAllPets,
} from "./diaryService";
import { deleteExpiredPets } from "./petService";
import { EMAIL_ADDRESS, EMAIL_APP_PASSWORD } from "./config";
import { createPetFlow } from "./flows/createPetFlow";
import { generateDestinationFlow } from "./flows/generateDestinationFlow";
import { generateDiaryFlow } from "./flows/generateDiaryFlow";
import { generateDiaryImageFlow } from "./flows/generateDiaryImageFlow";
import { saveImageToStorage } from "./diaryHelpers";

export { db } from "./firebase";

export const emailCheckTrigger = onSchedule(
  {
    schedule: "*/10 * * * *", // every 10 minutes
    timeZone: "Asia/Tokyo",
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD],
  },
  async () => {
    try {
      await checkNewEmailsAndCreatePet();
    } catch (error) {
      console.error("Email check failed:", error);
      throw error;
    }
  }
);

export const dailyDiaryTrigger = onSchedule(
  {
    schedule: "30 5 * * *", // every day at 05:30 JST
    timeZone: "Asia/Tokyo",
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD],
  },
  async () => {
    try {
      await generateDiariesForAllPets();
    } catch (error) {
      console.error("Diary generation failed:", error);
      throw error;
    }
  }
);

export const dailyDiaryEmailTrigger = onSchedule(
  {
    schedule: "0 6 * * *", // every day at 06:00 JST
    timeZone: "Asia/Tokyo",
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD],
  },
  async () => {
    try {
      await sendDiaryEmailsForAllPets();
    } catch (error) {
      console.error("Diary email sending failed:", error);
      throw error;
    }
  }
);

export const dailyPetCleanup = onSchedule(
  {
    schedule: "30 3 * * *", // every day at 03:30 JST
    timeZone: "Asia/Tokyo",
  },
  async () => {
    try {
      await deleteExpiredPets();
    } catch (error) {
      console.error("Pet cleanup failed:", error);
      throw error;
    }
  }
);

export const manualPetCleanup = onRequest(async (_req, res) => {
  try {
    await deleteExpiredPets();
    res.status(200).send("Pet cleanup completed");
  } catch (error) {
    console.error("Pet cleanup failed:", error);
    res.status(500).send("Pet cleanup failed");
  }
});

export const manualEmailCheck = onRequest(
  { secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD] },
  async (_req, res) => {
    try {
      await checkNewEmailsAndCreatePet();
      res.status(200).send("Email check completed");
    } catch (error) {
      console.error("Email check failed:", error);
      res.status(500).send("Email check failed");
    }
  }
);

export const manualDiaryGeneration = onRequest(
  { secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD] },
  async (_req, res) => {
    try {
      await generateDiariesForAllPets();
      res.status(200).send("Diary generation completed");
    } catch (error) {
      console.error("Diary generation failed:", error);
      res.status(500).send("Diary generation failed");
    }
  }
);

export const manualDiaryEmailSend = onRequest(
  { secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD] },
  async (_req, res) => {
    try {
      await sendDiaryEmailsForAllPets();
      res.status(200).send("Diary email sending completed");
    } catch (error) {
      console.error("Diary email sending failed:", error);
      res.status(500).send("Diary email sending failed");
    }
  }
);

// Example HTTP trigger for manual testing
export const helloWorld = onRequest(async (_req, res) => {
  res.status(200).send("✅ Hello from Gen 2 Cloud Functions!");
});

export const createPet = onCallGenkit(createPetFlow);
export const generateDestination = onCallGenkit(generateDestinationFlow);
export const generateDiary = onCallGenkit(generateDiaryFlow);
export const generateDiaryImage = onCallGenkit(generateDiaryImageFlow);

export const saveDemoImage = onCall({ region: "us-central1" }, async (request) => {
  const dataUrl = request.data?.dataUrl as string | undefined;
  if (!dataUrl) {
    throw new HttpsError("invalid-argument", "dataUrl is required");
  }
  const date = new Date().toISOString().split("T")[0];
  const storedUrl = await saveImageToStorage(dataUrl, "demo", date);
  return { url: storedUrl };
});
