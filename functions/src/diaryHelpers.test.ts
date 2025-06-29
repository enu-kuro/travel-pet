import { describe, it, expect, vi, beforeEach } from "vitest";
import * as index from "./index";
import * as emailUtils from "./email";
import {
  getPetFromFirestore,
  saveDestinationToFirestore,
  saveDiaryToFirestore,
  sendDiaryEmail,
} from "./diaryHelpers";

describe("diary helpers", () => {
  describe("getPetFromFirestore", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("returns null when pet does not exist", async () => {
      const getMock = vi.fn().mockResolvedValue({ exists: false });
      const docMock = vi.fn().mockReturnValue({ get: getMock });
      const collectionMock = vi.fn().mockReturnValue({ doc: docMock });

      vi.spyOn(index.db, "collection").mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collectionMock as any
      );

      const result = await getPetFromFirestore("nonexistentId");

      expect(collectionMock).toHaveBeenCalledWith("pets");
      expect(docMock).toHaveBeenCalledWith("nonexistentId");
      expect(getMock).toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("returns email, profile and destinations when pet exists", async () => {
      const petData = {
        email: "user@example.com",
        profile: {
          name: "p",
          persona_dna: {
            personality: "a",
            guiding_theme: "b",
            emotional_trigger: "c",
            mobility_range: "d",
            interest_depth: "e",
            temporal_focus: "f",
          },
          introduction: "i",
        },
        destinations: [],
      };
      const getMock = vi.fn().mockResolvedValue({
        exists: true,
        data: () => petData,
      });
      const docMock = vi.fn().mockReturnValue({ get: getMock });
      const collectionMock = vi.fn().mockReturnValue({ doc: docMock });

      vi.spyOn(index.db, "collection").mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collectionMock as any
      );

      const result = await getPetFromFirestore("petId123");

      expect(collectionMock).toHaveBeenCalledWith("pets");
      expect(docMock).toHaveBeenCalledWith("petId123");
      expect(getMock).toHaveBeenCalled();
      expect(result).toEqual(petData);
    });
  });

  describe("saveDiaryToFirestore", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should save diary to Firestore with correct path and data", async () => {
      const itinerary = {
        selected_location: "Tokyo",
        summary: "s",
        news_context: "n",
        local_details: "l",
      };
      const diary = "Today I visited temples.";
      const imageUrl = "data:image/png;base64,test";
      const petId = "pet123";
      const today = new Date().toISOString().split("T")[0];

      const setMock = vi.fn().mockResolvedValue(undefined);
      const diaryDocMock = vi.fn().mockReturnValue({ set: setMock });
      const diariesCollectionMock = vi
        .fn()
        .mockReturnValue({ doc: diaryDocMock });
      const petDocRefMock = vi
        .fn()
        .mockReturnValue({ collection: diariesCollectionMock });
      const collectionMock = vi.fn().mockReturnValue({ doc: petDocRefMock });

      vi.spyOn(index.db, "collection").mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collectionMock as any
      );

      await saveDiaryToFirestore(petId, itinerary, diary, imageUrl);

      expect(collectionMock).toHaveBeenCalledWith("pets");
      expect(petDocRefMock).toHaveBeenCalledWith(petId);
      expect(diariesCollectionMock).toHaveBeenCalledWith("diaries");
      expect(diaryDocMock).toHaveBeenCalledWith(today);
      expect(setMock).toHaveBeenCalledWith({
        itinerary,
        diary,
        date: today,
        imageUrl,
      });
    });
  });

  describe("saveDestinationToFirestore", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("saves itinerary for a pet", async () => {
      const itinerary = {
        selected_location: "Osaka",
        summary: "s",
        news_context: "n",
        local_details: "l",
      };
      const petId = "petXYZ";
      const updateMock = vi.fn().mockResolvedValue(undefined);

      const petDocMock = vi.fn().mockReturnValue({ update: updateMock });
      const collectionMock = vi.fn().mockReturnValue({ doc: petDocMock });

      vi.spyOn(index.db, "collection").mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collectionMock as any
      );

      await saveDestinationToFirestore(petId, itinerary);

      expect(collectionMock).toHaveBeenCalledWith("pets");
      expect(petDocMock).toHaveBeenCalledWith(petId);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          nextDestination: itinerary,
          destinations: expect.anything(),
        })
      );
    });
  });

  describe("sendDiaryEmail", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should call sendEmail with correct subject and body containing diary", async () => {
      const sendEmailMock = vi.spyOn(emailUtils, "sendEmail").mockResolvedValue();
      const email = "user@example.com";
      const itinerary = {
        selected_location: "Kyoto",
        summary: "s",
        news_context: "n",
        local_details: "l",
      };
      const diary = "I saw temples.";

      await sendDiaryEmail(email, itinerary, diary);

      expect(sendEmailMock).toHaveBeenCalledWith(
        email,
        "[旅日記] Kyoto",
        expect.stringContaining(diary),
        undefined,
        undefined,
        { html: expect.stringContaining(diary) }
      );

      sendEmailMock.mockRestore();
    });

    it("includes html when imageUrl provided", async () => {
      const sendEmailMock = vi.spyOn(emailUtils, "sendEmail").mockResolvedValue();
      const email = "user@example.com";
      const itinerary = {
        selected_location: "Kyoto",
        summary: "s",
        news_context: "n",
        local_details: "l",
      };
      const diary = "I saw temples.";
      const imageUrl = "data:image/png;base64,test";

      await sendDiaryEmail(email, itinerary, diary, imageUrl);

      expect(sendEmailMock).toHaveBeenCalledWith(
        email,
        "[旅日記] Kyoto",
        expect.stringContaining(diary),
        undefined,
        undefined,
        { html: expect.stringContaining(imageUrl) }
      );

      sendEmailMock.mockRestore();
    });
  });
});
