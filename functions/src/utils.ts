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

// Mock email function
export async function sendEmail(to: string, subject: string, body: string) {
  console.log("=== MOCK EMAIL ===");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log("=== END MOCK EMAIL ===");

  // TODO: Replace with actual Gmail API implementation
  /*
  const gmail = getGmailClient(); // This would need GMAIL_CLIENT_ID etc.
  const emailMessage = [
    `To: ${to}`,
    `Subject: ${subject}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    body,
  ].join("\r\n");

  const encodedMessage = Buffer.from(emailMessage).toString("base64");

  await gmail.users.messages.send({
    userId: "me",
    requestBody: {
      raw: encodedMessage,
    },
  });
  */
}

// It might also be beneficial to move Firestore instance `db`
// and Genkit `ai` instance initialization here if they are broadly used
// and don't have specific configurations per file.
// For example:
// import { initializeApp } from "firebase-admin/app";
// import { getFirestore } from "firebase-admin/firestore";
// import { genkit } from "genkit";
// import { vertexAI } from "@genkit-ai/vertexai";

// initializeApp(); // Ensure this is called only once
// export const db = getFirestore();
// export const ai = genkit({
//   plugins: [
//     vertexAI({ location: "us-central1", projectId: "travel-pet-b6edb" }),
//   ],
// });

// However, to keep changes minimal and focused on the request,
// `db` and `ai` initializations are kept in their respective files or index.ts for now.
// `ai` instance in particular might have different configurations for different flows in complex scenarios.
// `Timestamp` is re-exported here for convenience if needed by other files,
// or they can import it directly from "firebase-admin/firestore".
