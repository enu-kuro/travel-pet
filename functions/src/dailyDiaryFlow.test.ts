import { describe, it, expect, vi, beforeEach } from "vitest";
import * as index from "./index";
import * as emailUtils from "./email";
import {
  getPetFromFirestore,
  saveDestinationToFirestore,
  getDestinationFromFirestore,
  saveDiaryToFirestore,
  sendDiaryEmail,
} from "./dailyDiaryFlow";

describe("dailyDiaryFlow helpers", () => {
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

    it("returns email and profile when pet exists", async () => {
      const petData = { email: "user@example.com", profile: "pet profile" };
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
      const itinerary = "Tokyo";
      const diary = "Today I visited temples.";
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

      await saveDiaryToFirestore(petId, itinerary, diary);

      expect(collectionMock).toHaveBeenCalledWith("pets");
      expect(petDocRefMock).toHaveBeenCalledWith(petId);
      expect(diariesCollectionMock).toHaveBeenCalledWith("diaries");
      expect(diaryDocMock).toHaveBeenCalledWith(today);
      expect(setMock).toHaveBeenCalledWith({ itinerary, diary, date: today });
    });
  });

  describe("saveDestinationToFirestore and getDestinationFromFirestore", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("saves and retrieves itinerary for a pet", async () => {
      const itinerary = "Osaka";
      const petId = "petXYZ";
      const getMock = vi.fn().mockResolvedValue({ exists: true, data: () => ({ nextDestination: itinerary }) });
      const updateMock = vi.fn().mockResolvedValue(undefined);

      const petDocMock = vi.fn().mockReturnValue({ update: updateMock, get: getMock });
      const collectionMock = vi.fn().mockReturnValue({ doc: petDocMock });

      vi.spyOn(index.db, "collection").mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        collectionMock as any
      );

      await saveDestinationToFirestore(petId, itinerary);
      const result = await getDestinationFromFirestore(petId);

      expect(collectionMock).toHaveBeenCalledWith("pets");
      expect(petDocMock).toHaveBeenCalledWith(petId);
      expect(updateMock).toHaveBeenCalled();
      expect(updateMock.mock.calls[0][0].nextDestination).toBe(itinerary);
      expect(result).toBe(itinerary);
    });
  });

  describe("sendDiaryEmail", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should call sendEmail with correct subject and body containing diary", async () => {
      const sendEmailMock = vi.spyOn(emailUtils, "sendEmail").mockResolvedValue();
      const email = "user@example.com";
      const itinerary = "Kyoto";
      const diary = "I saw temples.";

      await sendDiaryEmail(email, itinerary, diary);

      expect(sendEmailMock).toHaveBeenCalledWith(
        email,
        `[旅日記] ${itinerary}`,
        expect.stringContaining(diary)
      );

      sendEmailMock.mockRestore();
    });
  });
});
