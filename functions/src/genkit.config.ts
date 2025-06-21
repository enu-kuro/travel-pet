import vertexAI from "@genkit-ai/vertexai";
import { genkit } from "genkit";

export const ai = genkit({
  plugins: [
    vertexAI({ location: "us-central1", projectId: "travel-pet-b6edb" }),
  ],
});
