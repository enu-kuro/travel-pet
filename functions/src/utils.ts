// Interface definitions
export interface PetProfile {
  email: string;
  profile: string;
  createdAt: FirebaseFirestore.Timestamp;
}

export interface DiaryEntry {
  itinerary: string;
  diary: string;
  date: string;
}
import nodemailer from "nodemailer";
import Imap from "imap";
import { EMAIL_ADDRESS, EMAIL_APP_PASSWORD } from "./index";

const ALIAS_SUFFIX = "+travel-pet";

// Email client setup using nodemailer with App Password
async function getEmailTransporter() {
  const user = await EMAIL_ADDRESS.value();
  const pass = await EMAIL_APP_PASSWORD.value();

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user,
      pass,
    },
  });
}

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  senderName?: string // オプショナル
) {
  const transporter = await getEmailTransporter();
  const aliasEmail = await getAliasEmailAddress();

  // senderNameがあれば使う、なければエイリアスのみ
  const fromField = senderName ? `${senderName} <${aliasEmail}>` : aliasEmail;

  const mailOptions = {
    from: fromField,
    to: to,
    subject: subject,
    text: body,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(
      `Email sent to: ${to}, Subject: ${subject}, From: ${fromField}`
    );
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
}

// Get alias email address for sending
export async function getAliasEmailAddress(): Promise<string> {
  const baseEmail = await EMAIL_ADDRESS.value();
  const [localPart, domain] = baseEmail.split("@");
  return `${localPart}${ALIAS_SUFFIX}@${domain}`;
}

// IMAP client setup for reading emails
export async function getImapClient() {
  const user = await EMAIL_ADDRESS.value();
  const password = await EMAIL_APP_PASSWORD.value();

  return new Imap({
    user,
    password,
    host: "imap.gmail.com",
    port: 993,
    tls: true,
  });
}
