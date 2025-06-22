import { describe, it, expect, vi } from "vitest";
import { sendEmail, getAliasEmailAddress, getImapClient } from "./utils";
import nodemailer from "nodemailer";
import Imap from "imap";
import { SecretProvider } from "./config";

// Mock nodemailer
vi.mock("nodemailer", () => {
  const mockSendMailFn = vi.fn().mockResolvedValue(undefined);
  const mockCreateTransportFn = vi.fn().mockReturnValue({
    sendMail: mockSendMailFn,
  });
  return {
    default: {
      createTransport: mockCreateTransportFn,
    },
  };
});

// Mock Imap
vi.mock("imap", () => ({
  default: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    once: vi.fn(),
    end: vi.fn(),
    // Add other methods if needed
  })),
}));

// モックSecretProvider
class MockSecretProvider implements SecretProvider {
  constructor(
    private email: string = "test@example.com",
    private password: string = "testpass123"
  ) {}

  async getEmailAddress(): Promise<string> {
    return this.email;
  }

  async getEmailAppPassword(): Promise<string> {
    return this.password;
  }

  // Add getOpenAiApiKey if it's part of the SecretProvider interface and used elsewhere
  async getOpenAiApiKey(): Promise<string> {
    return "openai-key";
  }
}

describe("utils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  describe("sendEmail", () => {
    it("should send an email with the correct parameters when senderName is provided", async () => {
      const to = "recipient@example.com";
      const subject = "Test Subject";
      const body = "Test Body";
      const senderName = "Test Sender";
      const mockProvider = new MockSecretProvider();

      await sendEmail(to, subject, body, senderName, mockProvider);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: "gmail",
        auth: { user: "test@example.com", pass: "testpass123" },
      });
      // Check the sendMail on the instance returned by createTransport
      expect((nodemailer.createTransport as any).mock.results[0].value.sendMail).toHaveBeenCalledWith({
        from: `${senderName} <test+travel-pet@example.com>`,
        to,
        subject,
        text: body,
      });
    });

    it("should send an email with the correct parameters when senderName is not provided", async () => {
      const to = "recipient@example.com";
      const subject = "Test Subject";
      const body = "Test Body";
      const mockProvider = new MockSecretProvider();

      await sendEmail(to, subject, body, undefined, mockProvider);

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: "gmail",
        auth: { user: "test@example.com", pass: "testpass123" },
      });
      expect((nodemailer.createTransport as any).mock.results[0].value.sendMail).toHaveBeenCalledWith({
        from: "test+travel-pet@example.com",
        to,
        subject,
        text: body,
      });
    });
  });

  describe('getAliasEmailAddress', () => {
    it('should generate correct alias email with +travel-pet suffix', async () => {
      const mockProvider = new MockSecretProvider("user@gmail.com");
      const aliasEmail = await getAliasEmailAddress(mockProvider);

      expect(aliasEmail).toBe("user+travel-pet@gmail.com");
    });

    it('should handle different email domains', async () => {
      const mockProvider = new MockSecretProvider("test@yahoo.com");
      const aliasEmail = await getAliasEmailAddress(mockProvider);

      expect(aliasEmail).toBe("test+travel-pet@yahoo.com");
    });

    it('should handle complex email addresses', async () => {
      const mockProvider = new MockSecretProvider("john.doe+existing@company.co.jp");
      const aliasEmail = await getAliasEmailAddress(mockProvider);

      expect(aliasEmail).toBe("john.doe+existing+travel-pet@company.co.jp");
    });

    it('should throw error for invalid email format (no @ symbol)', async () => {
      const mockProvider = new MockSecretProvider("invalid-email");

      await expect(getAliasEmailAddress(mockProvider)).rejects.toThrow("Invalid email format: invalid-email");
    });

    it('should throw error for email with empty local part', async () => {
      const mockProvider = new MockSecretProvider("@domain.com");

      await expect(getAliasEmailAddress(mockProvider)).rejects.toThrow("Invalid email format: @domain.com");
    });

    it('should throw error for email with empty domain', async () => {
      const mockProvider = new MockSecretProvider("user@");

      await expect(getAliasEmailAddress(mockProvider)).rejects.toThrow("Invalid email format: user@");
    });
  });

  describe("getImapClient", () => {
    it("should create an Imap instance with the correct parameters", async () => {
      const mockProvider = new MockSecretProvider();
      await getImapClient(mockProvider);
      expect(Imap).toHaveBeenCalledWith({
        user: "test@example.com",
        password: "testpass123",
        host: "imap.gmail.com",
        port: 993,
        tls: true,
      });
    });
  });
});
