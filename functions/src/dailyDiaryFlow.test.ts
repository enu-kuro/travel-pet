import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from "vitest";

// Hoisted Mocks for external libraries
vi.mock("genkit", () => ({
  genkit: vi.fn(() => ({
    prompt: vi.fn(), // Basic mock, specific behavior comes from ./genkit.config mock
    defineFlow: vi.fn((_flowDef: unknown, impl) => impl),
  })),
}));

vi.mock("@genkit-ai/core", () => {
  const mockConfigureGenkit = vi.fn();
  return {
    configureGenkit: mockConfigureGenkit, getPlugin: vi.fn(), defineAction: vi.fn((_actionDef: unknown, impl) => impl),
    action: vi.fn(() => vi.fn(async (input) => input)), lookupAction: vi.fn(), // Removed unused parameter
    instrumentation: { isInstrumented: vi.fn(() => false), isTraced: vi.fn(() => false), metadata: {},
      runInNewSpan: vi.fn(async (_spanName: string, fn: () => Promise<unknown>) => fn()),
      runInNewTrace: vi.fn(async (_traceName: string, _parentTraceContext: unknown, fn: () => Promise<unknown>) => fn()),
    },
    getFlowStateStore: vi.fn(), getRegistry: vi.fn(), getTracerProvider: vi.fn(), default: mockConfigureGenkit,
  };
});

vi.mock("@genkit-ai/vertexai", () => {
  const mockGeminiPro = { name: "mockGeminiPro", modelFamily: "gemini", supportsSystemPrompt: false, info: { label: "Mock Gemini Pro", supports: {} }, generate: vi.fn(async () => ({ candidates: [{ index: 0, finishReason: "STOP", message: { role: "model", content: [{ text: "mocked response" }] } }], usage: {} })) };
  const mockVertexAIPluginFn = vi.fn(() => ({ name: "mockVertexPlugin", onInit: vi.fn() }));
  return { vertexAI: mockVertexAIPluginFn, geminiPro: mockGeminiPro, default: mockVertexAIPluginFn };
});

vi.mock("@genkit-ai/firebase", () => {
  const mockFirebasePluginFn = vi.fn(() => ({ name: "mockFirebasePlugin", onInit: vi.fn() }));
  return { firebase: mockFirebasePluginFn, default: mockFirebasePluginFn };
});

vi.mock("firebase-functions/v2/https", () => ({
  onCallGenkit: vi.fn(() => ({})), onRequest: vi.fn(() => ({})),
}));

// Variables to hold mock functions for prompts
let assignedMockDestinationPromptFn: ReturnType<typeof vi.fn>;
let assignedMockDiaryPromptFn: ReturnType<typeof vi.fn>;

// Variables to hold dynamically imported modules
let importedDailyDiaryFlow: typeof import("./dailyDiaryFlow");
let indexOriginal: typeof import("./index");
let emailUtilsOriginal: typeof import("./email");
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let aiFromGenkitConfig: any; // To inspect the mocked genkit.config"s ai export

beforeAll(async () => {
  // Initialize here, before vi.doMock factory uses them
  assignedMockDestinationPromptFn = vi.fn();
  assignedMockDiaryPromptFn = vi.fn();

  vi.doMock("./genkit.config", () => {
    return {
      ai: { // This is the "ai" object that dailyDiaryFlow.ts will import
        prompt: vi.fn((name: string) => {
          if (name === "generate-destination") return assignedMockDestinationPromptFn;
          if (name === "generate-diary") return assignedMockDiaryPromptFn;
          return vi.fn(()=>Promise.resolve({output: null}));
        }),
        defineFlow: vi.fn((_flowDef: unknown, impl) => impl),
      },
    };
  });

  // Dynamically import ALL modules that might be affected or cause premature loads
  indexOriginal = await import("./index");
  emailUtilsOriginal = await import("./email");
  importedDailyDiaryFlow = await import("./dailyDiaryFlow"); // SUT

  const genkitConfigModule = await import("./genkit.config"); // Get the mocked version
  aiFromGenkitConfig = genkitConfigModule.ai;
});

describe("dailyDiaryFlow Flows", () => {
  beforeEach(() => {
    assignedMockDestinationPromptFn.mockReset();
    assignedMockDiaryPromptFn.mockReset();
    if (aiFromGenkitConfig && aiFromGenkitConfig.prompt) {
      vi.mocked(aiFromGenkitConfig.prompt).mockClear();
    }
  });

  describe("generateDestinationFlow", () => {
    it("should generate a destination successfully", async () => {
      const mockProfile = "Pet\"s profile";
      const mockItinerary = "Paris";
      assignedMockDestinationPromptFn.mockResolvedValue({ output: { destination: mockItinerary } });
      const result = await importedDailyDiaryFlow.generateDestinationFlow({ profile: mockProfile });
      expect(assignedMockDestinationPromptFn).toHaveBeenCalledWith({ profile: mockProfile });
      expect(result).toEqual({ success: true, itinerary: mockItinerary });
    });
    it("should return success false if destination generation fails", async () => {
      const mockProfile = "Pet\"s profile";
      assignedMockDestinationPromptFn.mockResolvedValue({ output: null });
      const result = await importedDailyDiaryFlow.generateDestinationFlow({ profile: mockProfile });
      expect(assignedMockDestinationPromptFn).toHaveBeenCalledWith({ profile: mockProfile });
      expect(result).toEqual({ success: false });
    });
  });

  describe("generateDiaryFromDestinationFlow", () => {
    it("should generate a diary successfully", async () => {
      const mockProfile = "Pet\"s profile"; const mockItinerary = "Paris"; const mockDiary = "Today was fun in Paris!";
      assignedMockDiaryPromptFn.mockResolvedValue({ output: { diary: mockDiary } });
      const result = await importedDailyDiaryFlow.generateDiaryFromDestinationFlow({ profile: mockProfile, itinerary: mockItinerary });
      expect(assignedMockDiaryPromptFn).toHaveBeenCalledWith({ profile: mockProfile, destination: mockItinerary });
      expect(result).toEqual({ success: true, diary: mockDiary });
    });
    it("should return success false if diary generation fails", async () => {
      const mockProfile = "Pet\"s profile"; const mockItinerary = "Paris";
      assignedMockDiaryPromptFn.mockResolvedValue({ output: null });
      const result = await importedDailyDiaryFlow.generateDiaryFromDestinationFlow({ profile: mockProfile, itinerary: mockItinerary });
      expect(assignedMockDiaryPromptFn).toHaveBeenCalledWith({ profile: mockProfile, destination: mockItinerary });
      expect(result).toEqual({ success: false });
    });
  });
});

describe("dailyDiaryFlow helpers", () => {
  describe("getPetFromFirestore", () => {
    beforeEach(() => { if(indexOriginal && indexOriginal.db) vi.spyOn(indexOriginal.db, "collection").mockClear(); });
    afterEach(()=> { vi.restoreAllMocks(); });
    it("returns null when pet does not exist", async () => {
      const getMock = vi.fn().mockResolvedValue({ exists: false });
      const docMock = vi.fn().mockReturnValue({ get: getMock });
      const collectionMock = vi.fn().mockReturnValue({ doc: docMock });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if(indexOriginal && indexOriginal.db) vi.spyOn(indexOriginal.db, "collection").mockImplementation(collectionMock as any);
      const result = await importedDailyDiaryFlow.getPetFromFirestore("nonexistentId");
      expect(collectionMock).toHaveBeenCalledWith("pets"); expect(docMock).toHaveBeenCalledWith("nonexistentId"); expect(getMock).toHaveBeenCalled(); expect(result).toBeNull();
    });
    it("returns email and profile when pet exists", async () => {
      const petData = { email: "user@example.com", profile: "pet profile" };
      const getMock = vi.fn().mockResolvedValue({ exists: true, data: () => petData });
      const docMock = vi.fn().mockReturnValue({ get: getMock });
      const collectionMock = vi.fn().mockReturnValue({ doc: docMock });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if(indexOriginal && indexOriginal.db) vi.spyOn(indexOriginal.db, "collection").mockImplementation(collectionMock as any);
      const result = await importedDailyDiaryFlow.getPetFromFirestore("petId123");
      expect(collectionMock).toHaveBeenCalledWith("pets"); expect(docMock).toHaveBeenCalledWith("petId123"); expect(getMock).toHaveBeenCalled(); expect(result).toEqual(petData);
    });
  });

  describe("saveDiaryToFirestore", () => {
    beforeEach(() => { if(indexOriginal && indexOriginal.db) vi.spyOn(indexOriginal.db, "collection").mockClear(); });
    afterEach(()=> { vi.restoreAllMocks(); });
    it("should save diary to Firestore with correct path and data", async () => {
      const itinerary = "Tokyo"; const diary = "Today I visited temples."; const petId = "pet123"; const today = new Date().toISOString().split("T")[0];
      const setMock = vi.fn().mockResolvedValue(undefined);
      const diaryDocMock = vi.fn().mockReturnValue({ set: setMock });
      const diariesCollectionMock = vi.fn().mockReturnValue({ doc: diaryDocMock });
      const petDocRefMock = vi.fn().mockReturnValue({ collection: diariesCollectionMock });
      const collectionMock = vi.fn().mockReturnValue({ doc: petDocRefMock });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if(indexOriginal && indexOriginal.db) vi.spyOn(indexOriginal.db, "collection").mockImplementation(collectionMock as any);
      await importedDailyDiaryFlow.saveDiaryToFirestore(petId, itinerary, diary);
      expect(collectionMock).toHaveBeenCalledWith("pets"); expect(petDocRefMock).toHaveBeenCalledWith(petId); expect(diariesCollectionMock).toHaveBeenCalledWith("diaries"); expect(diaryDocMock).toHaveBeenCalledWith(today); expect(setMock).toHaveBeenCalledWith({ itinerary, diary, date: today });
    });
  });

  describe("sendDiaryEmail", () => {
    let sendEmailMock: ReturnType<typeof vi.spyOn>;
    beforeEach(() => { if(emailUtilsOriginal) sendEmailMock = vi.spyOn(emailUtilsOriginal, "sendEmail").mockResolvedValue(undefined); });
    afterEach(() => { if(sendEmailMock) sendEmailMock.mockRestore(); });
    it("should call sendEmail with correct subject and body containing diary", async () => {
      const email = "user@example.com"; const itinerary = "Kyoto"; const diary = "I saw temples.";
      await importedDailyDiaryFlow.sendDiaryEmail(email, itinerary, diary);
      expect(sendEmailMock).toHaveBeenCalledWith(email, `[旅日記] ${itinerary}`, expect.stringContaining(diary));
    });
  });
});
