import { describe, expect, it, vi , beforeEach } from "vitest";
import * as index from "./index"; // Import all exports from index.ts
import { FirebaseSecretProvider } from "./config";

import { testing } from "./index"; // Import the testing handlers

// --- Mocks ----

// 0. Mock firebase-admin services
vi.mock("firebase-admin/app", () => ({
  initializeApp: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(() => ({
    collection: vi.fn().mockReturnThis(),
    doc: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ empty: true, docs: [], size: 0, exists: false, data: () => undefined }),
    set: vi.fn().mockResolvedValue(undefined),
  })),
}));


// 1. Mock the core logic functions that will be PASSED to the handlers.
const mockGenerateDiariesForAllPets = vi.fn();
const mockCheckNewEmailsAndCreatePet = vi.fn();

// 2. No longer need vi.mock('./index', ...)

// 3. Mock config
vi.mock("./config", () => ({
  FirebaseSecretProvider: vi.fn(() => ({ // This is the constructor mock for FirebaseSecretProvider
    getEmailAddress: vi.fn().mockResolvedValue("test@example.com"),
    getEmailAppPassword: vi.fn().mockResolvedValue("password"),
    getOpenAIApiKey: vi.fn().mockResolvedValue("openai-key"),
    getGoogleApiKey: vi.fn().mockResolvedValue("google-api-key"),
    getAliasEmailAddress: vi.fn().mockResolvedValue("alias@example.com"),
  })),
  EMAIL_ADDRESS: "EMAIL_ADDRESS",
  EMAIL_APP_PASSWORD: "EMAIL_APP_PASSWORD",
}));

// 4. Mock 'firebase-functions/v2/https' is not needed here as we test handlers directly.


// --- Test Suite ---
describe("HTTP Handler Logic", () => {
  const { generateDiariesForAllPetsHandler, checkNewEmailsAndCreatePetHandler } = testing;

  beforeEach(() => {
    mockGenerateDiariesForAllPets.mockReset();
    mockCheckNewEmailsAndCreatePet.mockReset();
  });

  describe("generateDiariesForAllPetsHandler", () => {
    it("should call the provided generateDiariesFn and return success", async () => {
      mockGenerateDiariesForAllPets.mockResolvedValue(undefined);

      const result = await generateDiariesForAllPetsHandler(mockGenerateDiariesForAllPets);

      expect(mockGenerateDiariesForAllPets).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: "Diary generation started." });
    });

    it("should return error if the provided generateDiariesFn throws", async () => {
      const errorMessage = "Test error from generateDiariesFn";
      mockGenerateDiariesForAllPets.mockRejectedValue(new Error(errorMessage));

      const result = await generateDiariesForAllPetsHandler(mockGenerateDiariesForAllPets);

      expect(mockGenerateDiariesForAllPets).toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: "Diary generation failed.", error: errorMessage });
    });
  });

  describe("checkNewEmailsAndCreatePetHandler", () => {
    it("should call the provided checkEmailsFn and return success", async () => {
      mockCheckNewEmailsAndCreatePet.mockResolvedValue(undefined);

      const result = await checkNewEmailsAndCreatePetHandler(mockCheckNewEmailsAndCreatePet);

      expect(mockCheckNewEmailsAndCreatePet).toHaveBeenCalled();
      expect(result).toEqual({ success: true, message: "Email check and pet creation started." });
    });

    it("should return error if the provided checkEmailsFn throws", async () => {
      const errorMessage = "Test error from checkEmailsFn";
      mockCheckNewEmailsAndCreatePet.mockRejectedValue(new Error(errorMessage));

      const result = await checkNewEmailsAndCreatePetHandler(mockCheckNewEmailsAndCreatePet);

      expect(mockCheckNewEmailsAndCreatePet).toHaveBeenCalled();
      expect(result).toEqual({ success: false, message: "Email check failed.", error: errorMessage });
    });
  });
});
