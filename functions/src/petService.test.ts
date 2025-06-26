import { describe, it, expect, vi, beforeEach } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import * as index from "./index";
import * as petService from "./petService";
import * as emailUtils from "./email";
import { PET_LIFESPAN_DAYS } from "./config";

describe("deleteExpiredPets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes pets older than lifespan and sends farewell", async () => {
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
        email: "old@example.com",
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

    const sendEmailMock = vi
      .spyOn(emailUtils, "sendEmail")
      .mockResolvedValue();

    await petService.deleteExpiredPets();

    expect(collectionMockFn).toHaveBeenCalledWith("diaries");
    expect(listDocumentsMock).toHaveBeenCalled();
    expect(diaryDeleteMock).toHaveBeenCalled();
    expect(docDeleteMock).toHaveBeenCalled();
    expect(newPetRef.delete).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledWith(
      oldPet.data().email,
      "[旅ペットとのお別れ]",
      expect.any(String)
    );
  });
});

describe("sendFarewellEmail", () => {
  it("should call sendEmail with correct subject and body", async () => {
    const sendEmailMock = vi.spyOn(emailUtils, "sendEmail").mockResolvedValue();
    const email = "user@example.com";

    await petService.sendFarewellEmail(email);

    expect(sendEmailMock).toHaveBeenCalledWith(
      email,
      "[旅ペットとのお別れ]",
      expect.stringContaining("冒険は終了")
    );

    sendEmailMock.mockRestore();
  });
});

describe("sendUnsubscribeEmail", () => {
  it("should call sendEmail with correct subject and body", async () => {
    const sendEmailMock = vi.spyOn(emailUtils, "sendEmail").mockResolvedValue();
    const email = "user@example.com";

    await petService.sendUnsubscribeEmail(email);

    expect(sendEmailMock).toHaveBeenCalledWith(
      email,
      "[旅ペット配信停止完了]",
      expect.stringContaining("配信停止")
    );

    sendEmailMock.mockRestore();
  });
});

describe("deletePetByEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes pet and diaries when pet exists", async () => {
    const diaryDeleteMock = vi.fn().mockResolvedValue(undefined);
    const listDocumentsMock = vi.fn().mockResolvedValue([{ delete: diaryDeleteMock }]);
    const docDeleteMock = vi.fn().mockResolvedValue(undefined);
    const petRef = { collection: vi.fn().mockReturnValue({ listDocuments: listDocumentsMock }), delete: docDeleteMock };
    const doc = { ref: petRef };

    const getMock = vi.fn().mockResolvedValue({ empty: false, docs: [doc] });
    const limitMock = vi.fn().mockReturnValue({ get: getMock });
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(index.db, "collection").mockReturnValue({ where: whereMock } as any);

    const result = await petService.deletePetByEmail("test@example.com");

    expect(result).toBe(true);
    expect(whereMock).toHaveBeenCalledWith("email", "==", "test@example.com");
    expect(limitMock).toHaveBeenCalledWith(1);
    expect(getMock).toHaveBeenCalled();
    expect(listDocumentsMock).toHaveBeenCalled();
    expect(diaryDeleteMock).toHaveBeenCalled();
    expect(docDeleteMock).toHaveBeenCalled();
  });

  it("returns false when no pet found", async () => {
    const getMock = vi.fn().mockResolvedValue({ empty: true, docs: [] });
    const limitMock = vi.fn().mockReturnValue({ get: getMock });
    const whereMock = vi.fn().mockReturnValue({ limit: limitMock });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.spyOn(index.db, "collection").mockReturnValue({ where: whereMock } as any);

    const result = await petService.deletePetByEmail("none@example.com");

    expect(result).toBe(false);
    expect(whereMock).toHaveBeenCalledWith("email", "==", "none@example.com");
    expect(limitMock).toHaveBeenCalledWith(1);
    expect(getMock).toHaveBeenCalled();
  });
});
