import nodemailer from "nodemailer";
import Imap from "imap";
import { SecretProvider, FirebaseSecretProvider } from "./config";

const ALIAS_SUFFIX = "+travel-pet";

// シンプルなメール送信
export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  senderName?: string,
  secretProvider: SecretProvider = new FirebaseSecretProvider()
): Promise<void> {
  const user = await secretProvider.getEmailAddress();
  const pass = await secretProvider.getEmailAppPassword();
  const aliasEmail = await getAliasEmailAddress(secretProvider);

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  const fromField = senderName ? `${senderName} <${aliasEmail}>` : aliasEmail;

  await transporter.sendMail({
    from: fromField,
    to,
    subject,
    text: body,
  });

  console.log(`Email sent to: ${to}, Subject: ${subject}`);
}

export async function getAliasEmailAddress(
  secretProvider: SecretProvider = new FirebaseSecretProvider()
): Promise<string> {
  const baseEmail = await secretProvider.getEmailAddress();
  const [localPart, domain] = baseEmail.split("@");

  if (!localPart || !domain) {
    throw new Error(`Invalid email format: ${baseEmail}`);
  }

  return `${localPart}${ALIAS_SUFFIX}@${domain}`;
}

export async function getImapClient(
  secretProvider: SecretProvider = new FirebaseSecretProvider()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const user = await secretProvider.getEmailAddress();
  const password = await secretProvider.getEmailAppPassword();

  const isLocalDev = process.env.FUNCTIONS_EMULATOR === "true";

  const baseConfig = {
    user,
    password,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
  };

  if (isLocalDev) {
    // Local環境: 証明書検証を緩和
    return new Imap({
      ...baseConfig,
      tlsOptions: {
        rejectUnauthorized: false,
        servername: "imap.gmail.com",
      },
    });
  } else {
    // Production環境: 厳格な証明書検証
    return new Imap({
      ...baseConfig,
      tlsOptions: {
        servername: "imap.gmail.com",
      },
    });
  }
}
