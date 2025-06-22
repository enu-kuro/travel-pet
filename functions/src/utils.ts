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
import Imap from "imap"; // Add Imap import
import { EMAIL_ADDRESS, EMAIL_APP_PASSWORD } from "./index"; // Import secrets

// Email client setup using nodemailer with App Password
async function getEmailTransporter() {
  const user = EMAIL_ADDRESS.value(); // Access secret value
  const pass = EMAIL_APP_PASSWORD.value(); // Access secret value

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
}

export async function sendEmail(to: string, subject: string, body: string) {
  const transporter = await getEmailTransporter();
  const mailOptions = {
    from: EMAIL_ADDRESS.value(), // Access secret value
    to: to,
    subject: subject,
    text: body,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Email sent to: ${to}, Subject: ${subject}`);
  } catch (error) {
    console.error("Error sending email:", error);
    throw error; // Re-throw the error to be handled by the caller
  }
}

// IMAP client setup for reading emails
export async function getImapClient() {
  const user = EMAIL_ADDRESS.value(); // Access secret value
  const password = EMAIL_APP_PASSWORD.value(); // Access secret value

  return new Imap({
    user,
    password,
    host: 'imap.gmail.com',
    port: 993,
    tls: true,
    tlsOptions: {
      rejectUnauthorized: false, // Note: For production, consider certificate validation carefully
    },
  });
}

// Note: Firestore 'db' and Genkit 'ai' instances are initialized elsewhere (index.ts, genkit.config.ts)
// and imported where needed. This keeps utils.ts focused on utility functions.
