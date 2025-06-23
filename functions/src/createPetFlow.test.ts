import { describe, it, expect, vi, beforeEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import * as index from "./index";
import * as utils from "./utils";

import { savePetToFirestore, sendPetCreationEmail } from "./createPetFlow";

// Mocks for Firestore
const setMock = vi.fn().mockResolvedValue(undefined);
const docMock = vi.fn().mockReturnValue({ id: "mockedPetId", set: setMock });
const collectionMock = vi.fn().mockReturnValue({ doc: docMock });

describe("createPetFlow helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Spy on Firestore collection
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(index.db, "collection").mockImplementation(collectionMock as any);
  });

  describe("savePetToFirestore", () => {
    it("should save pet data to Firestore and return the new document ID", async () => {
      const email = "user@example.com";
      const profile = "Cute pet profile";

      const petId = await savePetToFirestore(email, profile);

      expect(collectionMock).toHaveBeenCalledWith("pets");
      expect(docMock).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith({
        email,
        profile,
        createdAt: expect.any(Timestamp),
      });
      expect(petId).toBe("mockedPetId");
    });
  });

  describe("sendPetCreationEmail", () => {
    it("should call sendEmail with correct subject and body containing profile", async () => {
      const sendEmailMock = vi.spyOn(utils, "sendEmail").mockResolvedValue();
      const email = "user@example.com";
      const profile = "Profile text here";

      await sendPetCreationEmail(email, profile);

      expect(sendEmailMock).toHaveBeenCalledWith(
        email,
        "[旅ペット作成完了]",
        expect.stringContaining(profile)
      );

      sendEmailMock.mockRestore();
    });
  });
});
