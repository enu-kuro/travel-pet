import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { checkNewEmailsAndCreatePet } from "./emailService";
import {
  generateDestinationsForAllPets,
  generateDiaryEntriesForAllPets,
  generateDiariesForAllPets,
} from "./diaryService";
import { deleteExpiredPets } from "./petService";
import { EMAIL_ADDRESS, EMAIL_APP_PASSWORD } from "./config";

export { db } from "./firebase";

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

export const dailyDestinationTrigger = onSchedule(
  {
    schedule: "0 9 * * *",
    timeZone: "Asia/Tokyo",
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD],
  },
  async () => {
    try {
      await generateDestinationsForAllPets();
    } catch (error) {
      console.error("Destination generation failed:", error);
      throw error;
    }
  }
);

export const dailyDiaryTrigger = onSchedule(
  {
    schedule: "5 9 * * *",
    timeZone: "Asia/Tokyo",
    secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD],
  },
  async () => {
    try {
      await generateDiaryEntriesForAllPets();
    } catch (error) {
      console.error("Diary generation failed:", error);
      throw error;
    }
  }
);

export const dailyPetCleanup = onSchedule(
  {
    schedule: "30 3 * * *",
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

export const manualDestinationGeneration = onRequest(
  { secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD] },
  async (_req, res) => {
    try {
      await generateDestinationsForAllPets();
      res.status(200).send("Destination generation completed");
    } catch (error) {
      console.error("Destination generation failed:", error);
      res.status(500).send("Destination generation failed");
    }
  }
);

export const manualDiaryEntryGeneration = onRequest(
  { secrets: [EMAIL_ADDRESS, EMAIL_APP_PASSWORD] },
  async (_req, res) => {
    try {
      await generateDiaryEntriesForAllPets();
      res.status(200).send("Diary entry generation completed");
    } catch (error) {
      console.error("Diary entry generation failed:", error);
      res.status(500).send("Diary entry generation failed");
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
