import { onCallGenkit, onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";


import { createPetFlow } from "./createPetFlow";
import {
  generateDestinationFlow,
  generateDiaryFromDestinationFlow,
} from "./dailyDiaryFlow";
import {
  checkNewEmailsAndCreatePet,
  generateDiariesForAllPets,
} from "./emailService";
import { EMAIL_ADDRESS, EMAIL_APP_PASSWORD } from "./config";

export { db } from "./firebase";

export const createPet = onCallGenkit(createPetFlow);
export const generateDestination = onCallGenkit(generateDestinationFlow);
export const generateDiary = onCallGenkit(generateDiaryFromDestinationFlow);

export const emailCheckTrigger = onSchedule(
  {
    schedule: "*/10 * * * *",
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
    schedule: "0 9 * * *",
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

// onRequest動作確認用
export const helloWorld = onRequest(async (_req, res) => {
  res.status(200).send("✅ Hello from Gen 2 Cloud Functions!");
});
