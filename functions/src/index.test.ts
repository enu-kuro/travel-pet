import { describe, expect, it, vi, beforeEach } from "vitest";
import { Request, Response } from "firebase-functions/v2/https";

// Mock firebase-admin services
vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn() }));
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

// Mock config
vi.mock("./config", () => ({
  FirebaseSecretProvider: vi.fn(() => ({
    getEmailAddress: vi.fn().mockResolvedValue("test@example.com"),
    getEmailAppPassword: vi.fn().mockResolvedValue("password"),
    getOpenAIApiKey: vi.fn().mockResolvedValue("openai-key"),
    getGoogleApiKey: vi.fn().mockResolvedValue("google-api-key"),
    getAliasEmailAddress: vi.fn().mockResolvedValue("alias@example.com"),
  })),
  EMAIL_ADDRESS: "EMAIL_ADDRESS",
  EMAIL_APP_PASSWORD: "EMAIL_APP_PASSWORD",
}));

// Import the actual onRequest functions
import { generateDiariesForAllPetsHttp, checkNewEmailsAndCreatePetHttp } from "./index";

// Mock firebase-admin services
vi.mock("firebase-admin/app", () => ({ initializeApp: vi.fn() }));
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

// Mock config
vi.mock("./config", () => ({
  FirebaseSecretProvider: vi.fn(() => ({
    getEmailAddress: vi.fn().mockResolvedValue("test@example.com"),
    getEmailAppPassword: vi.fn().mockResolvedValue("password"),
    getOpenAIApiKey: vi.fn().mockResolvedValue("openai-key"),
    getGoogleApiKey: vi.fn().mockResolvedValue("google-api-key"),
    getAliasEmailAddress: vi.fn().mockResolvedValue("alias@example.com"),
  })),
  EMAIL_ADDRESS: "EMAIL_ADDRESS",
  EMAIL_APP_PASSWORD: "EMAIL_APP_PASSWORD",
}));

// Spies for the handlerToExecuteParam and coreLogicParam
const spyHttpGenerateDiariesHandler = vi.fn();
const spyCoreGenerateDiaries = vi.fn();
const spyHttpCheckEmailsHandler = vi.fn();
const spyCoreCheckEmails = vi.fn();


describe("onRequest HTTP Triggers (Dependency Injection)", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let statusSendSpy: { status: vi.Mock; send: vi.Mock };

  beforeEach(() => {
    spyHttpGenerateDiariesHandler.mockReset();
    spyCoreGenerateDiaries.mockReset();
    spyHttpCheckEmailsHandler.mockReset();
    spyCoreCheckEmails.mockReset();

    statusSendSpy = { status: vi.fn().mockReturnThis(), send: vi.fn().mockReturnThis() };
    mockReq = {}; // Basic mock
    mockRes = {
      status: statusSendSpy.status,
      send: statusSendSpy.send,
    } as Partial<Response>;
  });

  describe("generateDiariesForAllPetsHttp", () => {
    it("should call injected handler with injected core logic and return 200 on success", async () => {
      spyHttpGenerateDiariesHandler.mockResolvedValue({ success: true, message: "Diary generation started." });

      await generateDiariesForAllPetsHttp(
        mockReq as Request,
        mockRes as Response,
        spyHttpGenerateDiariesHandler, // Injected spy handler
        spyCoreGenerateDiaries         // Injected spy core logic
      );

      expect(spyHttpGenerateDiariesHandler).toHaveBeenCalledWith(spyCoreGenerateDiaries);
      expect(statusSendSpy.status).toHaveBeenCalledWith(200);
      expect(statusSendSpy.send).toHaveBeenCalledWith({ message: "Diary generation started." });
    });

    it("should return 500 if injected handler indicates failure", async () => {
      const errorMessage = "Handler error";
      spyHttpGenerateDiariesHandler.mockResolvedValue({ success: false, message: "Diary generation failed.", error: errorMessage });

      await generateDiariesForAllPetsHttp(
        mockReq as Request,
        mockRes as Response,
        spyHttpGenerateDiariesHandler,
        spyCoreGenerateDiaries
      );

      expect(spyHttpGenerateDiariesHandler).toHaveBeenCalledWith(spyCoreGenerateDiaries);
      expect(statusSendSpy.status).toHaveBeenCalledWith(500);
      expect(statusSendSpy.send).toHaveBeenCalledWith({ message: "Diary generation failed.", error: errorMessage });
    });
  });

  describe("checkNewEmailsAndCreatePetHttp", () => {
    it("should call injected handler with injected core logic and return 200 on success", async () => {
      spyHttpCheckEmailsHandler.mockResolvedValue({ success: true, message: "Email check and pet creation started." });

      await checkNewEmailsAndCreatePetHttp(
        mockReq as Request,
        mockRes as Response,
        spyHttpCheckEmailsHandler, // Injected spy handler
        spyCoreCheckEmails         // Injected spy core logic
      );

      expect(spyHttpCheckEmailsHandler).toHaveBeenCalledWith(spyCoreCheckEmails);
      expect(statusSendSpy.status).toHaveBeenCalledWith(200);
      expect(statusSendSpy.send).toHaveBeenCalledWith({ message: "Email check and pet creation started." });
    });

    it("should return 500 if injected handler indicates failure", async () => {
      const errorMessage = "Handler error";
      spyHttpCheckEmailsHandler.mockResolvedValue({ success: false, message: "Email check failed.", error: errorMessage });

      await checkNewEmailsAndCreatePetHttp(
        mockReq as Request,
        mockRes as Response,
        spyHttpCheckEmailsHandler,
        spyCoreCheckEmails
      );

      expect(spyHttpCheckEmailsHandler).toHaveBeenCalledWith(spyCoreCheckEmails);
      expect(statusSendSpy.status).toHaveBeenCalledWith(500);
      expect(statusSendSpy.send).toHaveBeenCalledWith({ message: "Email check failed.", error: errorMessage });
    });
  });
});
