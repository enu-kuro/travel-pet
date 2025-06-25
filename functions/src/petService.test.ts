import { describe, it, expect, vi, beforeEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import * as index from "./index";
import { deleteExpiredPets } from "./petService";
import { PET_LIFESPAN_DAYS } from "./config";

describe("deleteExpiredPets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes pets older than lifespan", async () => {
    const diaryDeleteMock = vi.fn().mockResolvedValue(undefined);
    const listDocumentsMock = vi.fn().mockResolvedValue([{ delete: diaryDeleteMock }]);
    const docDeleteMock = vi.fn().mockResolvedValue(undefined);
    const collectionMockFn = vi.fn().mockReturnValue({ listDocuments: listDocumentsMock });

    const oldPetRef = { collection: collectionMockFn, delete: docDeleteMock };
    const oldPet = {
      id: "oldPet",
      data: () => ({
        createdAt: Timestamp.fromDate(
          new Date(Date.now() - (PET_LIFESPAN_DAYS + 1) * 24 * 60 * 60 * 1000)
        ),
      }),
      ref: oldPetRef,
    };

    const newPetRef = { collection: vi.fn(), delete: vi.fn() };
    const newPet = {
      id: "newPet",
      data: () => ({ createdAt: Timestamp.now() }),
      ref: newPetRef,
    };

    const getMock = vi.fn().mockResolvedValue({ empty: false, docs: [oldPet, newPet] });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(index.db, "collection").mockReturnValue({ get: getMock } as any);

    await deleteExpiredPets();

    expect(collectionMockFn).toHaveBeenCalledWith("diaries");
    expect(listDocumentsMock).toHaveBeenCalled();
    expect(diaryDeleteMock).toHaveBeenCalled();
    expect(docDeleteMock).toHaveBeenCalled();
    expect(newPetRef.delete).not.toHaveBeenCalled();
  });
});
