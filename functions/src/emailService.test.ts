import { describe, it, expect, vi } from "vitest";
import { Readable } from "stream";
import { processEmailMessage } from "./emailService";
import * as petService from "./petService";
import { EmailProcessor } from "./types";
import { simpleParser } from "mailparser";

vi.mock("mailparser", () => ({
  simpleParser: vi.fn(),
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
});
