import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendEmail, getAliasEmailAddress, getImapClient } from "./email";
import { SecretProvider } from "./config";

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(),
  },
}));

vi.mock("imap", () => ({
  default: vi.fn(),
}));

// モックしたモジュールをインポート
import nodemailer from "nodemailer";
import Imap from "imap";

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
}

describe("utils", () => {
  const mockSendMail = vi.fn();
  const mockTransporter = { sendMail: mockSendMail };
  const mockImapInstance = {
    connect: vi.fn(),
    once: vi.fn(),
    end: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // モックの設定
    vi.mocked(nodemailer.createTransport).mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockTransporter as any
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    vi.mocked(Imap).mockReturnValue(mockImapInstance as any);
    mockSendMail.mockResolvedValue(undefined);
  });

  describe("sendEmail", () => {
    it("should send email with senderName", async () => {
      const mockProvider = new MockSecretProvider();

      await sendEmail(
        "recipient@example.com",
        "Test Subject",
        "Test Body",
        "Test Sender",
        mockProvider
      );

      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        service: "gmail",
        auth: { user: "test@example.com", pass: "testpass123" },
      });

      expect(mockSendMail).toHaveBeenCalledWith({
        from: "Test Sender <test+travel-pet@example.com>",
        to: "recipient@example.com",
        subject: "Test Subject",
        text: "Test Body",
      });
    });

    it("should send email without senderName", async () => {
      const mockProvider = new MockSecretProvider();

      await sendEmail(
        "recipient@example.com",
        "Test Subject",
        "Test Body",
        undefined,
        mockProvider
      );

      expect(mockSendMail).toHaveBeenCalledWith({
        from: "test+travel-pet@example.com",
        to: "recipient@example.com",
        subject: "Test Subject",
        text: "Test Body",
      });
    });

    it("should handle email sending errors", async () => {
      const mockProvider = new MockSecretProvider();
      mockSendMail.mockRejectedValueOnce(new Error("SMTP error"));

      await expect(
        sendEmail(
          "test@example.com",
          "Subject",
          "Body",
          undefined,
          mockProvider
        )
      ).rejects.toThrow("SMTP error");
    });
  });

  describe("getAliasEmailAddress", () => {
    it("should generate alias email with +travel-pet suffix", async () => {
      const mockProvider = new MockSecretProvider("user@gmail.com");
      const result = await getAliasEmailAddress(mockProvider);
      expect(result).toBe("user+travel-pet@gmail.com");
    });

    it("should handle different domains", async () => {
      const mockProvider = new MockSecretProvider("test@yahoo.com");
      const result = await getAliasEmailAddress(mockProvider);
      expect(result).toBe("test+travel-pet@yahoo.com");
    });

    it("should handle existing plus in email", async () => {
      const mockProvider = new MockSecretProvider(
        "john.doe+existing@company.co.jp"
      );
      const result = await getAliasEmailAddress(mockProvider);
      expect(result).toBe("john.doe+existing+travel-pet@company.co.jp");
    });

    it("should throw error for invalid email (no @)", async () => {
      const mockProvider = new MockSecretProvider("invalid-email");
      await expect(getAliasEmailAddress(mockProvider)).rejects.toThrow(
        "Invalid email format: invalid-email"
      );
    });

    it("should throw error for empty local part", async () => {
      const mockProvider = new MockSecretProvider("@domain.com");
      await expect(getAliasEmailAddress(mockProvider)).rejects.toThrow(
        "Invalid email format: @domain.com"
      );
    });

    it("should throw error for empty domain", async () => {
      const mockProvider = new MockSecretProvider("user@");
      await expect(getAliasEmailAddress(mockProvider)).rejects.toThrow(
        "Invalid email format: user@"
      );
    });
  });

  describe("getImapClient", () => {
    it("should create Imap client with correct config", async () => {
      const mockProvider = new MockSecretProvider(
        "user@gmail.com",
        "password123"
      );

      const result = await getImapClient(mockProvider);

      expect(Imap).toHaveBeenCalledWith({
        user: "user@gmail.com",
        password: "password123",
        host: "imap.gmail.com",
        port: 993,
        tls: true,
      });

      expect(result).toBe(mockImapInstance);
    });
  });
});
