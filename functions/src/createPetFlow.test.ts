import { describe, it, expect, vi, beforeEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import * as index from "./index";
import * as emailUtils from "./email";

import {
  savePetToFirestore,
  sendPetCreationEmail,
} from "./flows/createPetFlow";

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
      const profile = {
        name: "Fido",
        persona_dna: {
          personality: "curious",
          guiding_theme: "food",
          emotional_trigger: "smell",
          mobility_range: "walker",
          interest_depth: "deep",
          temporal_focus: "present",
        },
        introduction: "hi",
      };

      const petId = await savePetToFirestore(email, profile);

      expect(collectionMock).toHaveBeenCalledWith("pets");
      expect(docMock).toHaveBeenCalled();
      expect(setMock).toHaveBeenCalledWith({
        email,
        profile,
        createdAt: expect.any(Timestamp),
        destinations: [],
      });
      expect(petId).toBe("mockedPetId");
    });
  });

  describe("sendPetCreationEmail", () => {
    it("should call sendEmail with correct subject and body containing profile", async () => {
      const sendEmailMock = vi.spyOn(emailUtils, "sendEmail").mockResolvedValue();
      const email = "user@example.com";
      const profile = {
        name: "Fido",
        persona_dna: {
          personality: "curious",
          guiding_theme: "food",
          emotional_trigger: "smell",
          mobility_range: "walker",
          interest_depth: "deep",
          temporal_focus: "present",
        },
        introduction: "hi",
      };

      await sendPetCreationEmail(email, profile);

      expect(sendEmailMock).toHaveBeenCalledWith(
        email,
        "[旅ペット作成完了]",
        expect.stringContaining(profile.name),
        undefined,
        undefined,
        { html: expect.stringContaining(profile.name) }
      );

      sendEmailMock.mockRestore();
    });
  });
});
