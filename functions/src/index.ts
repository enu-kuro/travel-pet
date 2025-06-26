import { onRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

import { checkNewEmailsAndCreatePet } from "./emailService";
import {
  generateDiariesForAllPets,
  sendDiaryEmailsForAllPets,
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

export const dailyDiaryTrigger = onSchedule(
  {
    schedule: "5 9 * * *",
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
    schedule: "10 9 * * *",
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

// onRequest動作確認用
export const helloWorld = onRequest(async (_req, res) => {
  res.status(200).send("✅ Hello from Gen 2 Cloud Functions!");
});
