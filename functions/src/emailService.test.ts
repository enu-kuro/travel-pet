import { describe, it, expect, vi } from "vitest";
import { Readable } from "stream";
import { EventEmitter } from "events";
import {
  processEmailMessage,
  checkNewEmailsAndCreatePet,
} from "./emailService";
import { TRAVEL_PET_LABEL } from "./config";
import * as petService from "./petService";
import { EmailProcessor } from "./types";
import { simpleParser } from "mailparser";
import { getImapClient, getAliasEmailAddress } from "./email";

vi.mock("mailparser", () => ({
  simpleParser: vi.fn(),
}));

vi.mock("./email", () => ({
  getImapClient: vi.fn(),
  getAliasEmailAddress: vi.fn(),
}));

describe("processEmailMessage", () => {
  it("handles unsubscribe emails", async () => {
    const mockProcessor: EmailProcessor = {
      checkExistingPet: vi.fn(),
      createPet: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(simpleParser).mockResolvedValue({
      from: { value: [{ address: "user@example.com" }] },
      subject: "配信停止してください",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const deleteMock = vi
      .spyOn(petService, "deletePetByEmail")
      .mockResolvedValue(true);
    const sendMock = vi
      .spyOn(petService, "sendUnsubscribeEmail")
      .mockResolvedValue();

    const stream = Readable.from("dummy");
    await processEmailMessage(stream, 1, mockProcessor);

    expect(deleteMock).toHaveBeenCalledWith("user@example.com");
    expect(sendMock).toHaveBeenCalledWith("user@example.com");
    expect(mockProcessor.checkExistingPet).not.toHaveBeenCalled();
    expect(mockProcessor.createPet).not.toHaveBeenCalled();
  });

  it("responds when pet already exists", async () => {
    const mockProcessor: EmailProcessor = {
      checkExistingPet: vi.fn().mockResolvedValue(true),
      createPet: vi.fn(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(simpleParser).mockResolvedValue({
      from: { value: [{ address: "user@example.com" }] },
      subject: "こんにちは",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const existingMock = vi
      .spyOn(petService, "sendExistingPetEmail")
      .mockResolvedValue();

    const stream = Readable.from("dummy");
    await processEmailMessage(stream, 1, mockProcessor);

    expect(mockProcessor.checkExistingPet).toHaveBeenCalledWith(
      "user@example.com"
    );
    expect(existingMock).toHaveBeenCalledWith("user@example.com");
    expect(mockProcessor.createPet).not.toHaveBeenCalled();
  });
});

describe("checkNewEmailsAndCreatePet", () => {
  it("opens Travel-Pet label", async () => {
    interface ImapMock extends EventEmitter {
      openBox(box: string, readOnly: boolean, cb: (e?: Error) => void): void;
      search(criteria: unknown, cb: (e: unknown, r: number[]) => void): void;
      fetch(): void;
      addFlags(uids: unknown, flags: string[], cb: () => void): void;
      end(): void;
      connect(): void;
    }

    const openBox = vi.fn((box: string, _r: boolean, cb: (e?: Error) => void) =>
      cb()
    );
    const imapMock = new EventEmitter() as ImapMock;
    imapMock.openBox = openBox;
    imapMock.search = vi.fn((_: unknown, cb: (e: null, r: number[]) => void) =>
      cb(null, [])
    );
    imapMock.fetch = vi.fn();
    imapMock.addFlags = vi.fn((_: unknown, __: string[], cb: () => void) =>
      cb()
    );
    imapMock.end = vi.fn();
    imapMock.connect = () => imapMock.emit("ready");
    imapMock.once = imapMock.on.bind(imapMock);

    vi.mocked(getImapClient).mockResolvedValue(imapMock);
    vi.mocked(getAliasEmailAddress).mockResolvedValue("alias@example.com");

    const processor: EmailProcessor = {
      checkExistingPet: vi.fn().mockResolvedValue(false),
      createPet: vi.fn().mockResolvedValue(undefined),
    };

    await checkNewEmailsAndCreatePet(undefined, processor);

    expect(openBox).toHaveBeenCalledWith(
      TRAVEL_PET_LABEL,
      false,
      expect.any(Function)
    );
  });
});
