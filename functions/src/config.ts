import { defineSecret } from "firebase-functions/params";

export const EMAIL_ADDRESS = defineSecret("EMAIL_ADDRESS");
export const EMAIL_APP_PASSWORD = defineSecret("EMAIL_APP_PASSWORD");

// ペットの寿命（日数）
export const PET_LIFESPAN_DAYS = 10;

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
