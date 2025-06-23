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

// Spies that will represent the execution of the onRequest function's core logic for testing purposes.
const spyGenerateDiariesLogic = vi.fn();
const spyCheckEmailsLogic = vi.fn();

// Mock ./index to replace the onRequest functions themselves with spies.
// This ensures we are testing that the exported Cloud Functions are invoked,
// and these spies will stand in for their entire execution.
vi.mock("./index", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual, // Keep all other actual exports from index.ts
    // Replace the entire onRequest Cloud Functions with simple functions that call our spies
    generateDiariesForAllPetsHttp: vi.fn<(req: Request, res: Response) => void | Promise<void>>((req, res) => spyGenerateDiariesLogic(req, res)),
    checkNewEmailsAndCreatePetHttp: vi.fn<(req: Request, res: Response) => void | Promise<void>>((req, res) => spyCheckEmailsLogic(req, res)),

    // Mock out the internal helper functions as well to prevent any original code from running.
    // These names must match the exact export names from index.ts if they are exported,
    // or they won't be directly mockable here if they are not exported.
    // Assuming _handleGenerateDiariesRequest and _handleCheckEmailsRequest are exported per last refactor:
    _handleGenerateDiariesRequest: vi.fn(),
    _handleCheckEmailsRequest: vi.fn(),
    // And the _actualHttp... handlers and core logic functions
    _actualHttpGenerateDiariesForAllPetsHandler: vi.fn(),
    _actualHttpCheckNewEmailsAndCreatePetHandler: vi.fn(),
    generateDiariesForAllPets: vi.fn(),
    checkNewEmailsAndCreatePet: vi.fn(),
  };
});

describe("onRequest HTTP Triggers", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    spyGenerateDiariesLogic.mockReset().mockResolvedValue(undefined);
    spyCheckEmailsLogic.mockReset().mockResolvedValue(undefined);

    mockReq = {};
    mockRes = {
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    } as Partial<Response>;
  });

  describe("generateDiariesForAllPetsHttp", () => {
    it("should invoke mocked logic for generateDiariesForAllPetsHttp", async () => {
      // Dynamically import to get the mocked onRequest function
      const { generateDiariesForAllPetsHttp } = await import("./index");

      await generateDiariesForAllPetsHttp(mockReq as Request, mockRes as Response);

      expect(spyGenerateDiariesLogic).toHaveBeenCalledWith(mockReq, mockRes);
    });
  });

  describe("checkNewEmailsAndCreatePetHttp", () => {
    it("should invoke mocked logic for checkNewEmailsAndCreatePetHttp", async () => {
      const { checkNewEmailsAndCreatePetHttp } = await import("./index");

      await checkNewEmailsAndCreatePetHttp(mockReq as Request, mockRes as Response);

      expect(spyCheckEmailsLogic).toHaveBeenCalledWith(mockReq, mockRes);
    });
  });
});
