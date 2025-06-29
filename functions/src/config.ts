import { defineSecret } from "firebase-functions/params";

export const EMAIL_ADDRESS = defineSecret("EMAIL_ADDRESS");
export const EMAIL_APP_PASSWORD = defineSecret("EMAIL_APP_PASSWORD");

// ペットの寿命（日数）
export const PET_LIFESPAN_DAYS = 4;

// Gmail label used for alias emails
export const TRAVEL_PET_LABEL = "Travel-Pet";

export const IMAGE_RESIZE_SUFFIX = "_512x512";

export interface SecretProvider {
  getEmailAddress(): Promise<string>;
  getEmailAppPassword(): Promise<string>;
}

export class FirebaseSecretProvider implements SecretProvider {
  async getEmailAddress(): Promise<string> {
    return EMAIL_ADDRESS.value();
  }

  async getEmailAppPassword(): Promise<string> {
    return EMAIL_APP_PASSWORD.value();
  }
}
