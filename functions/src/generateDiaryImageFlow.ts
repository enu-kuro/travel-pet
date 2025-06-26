import vertexAI from "@genkit-ai/vertexai";
import { ai } from "./genkit.config";
import { z } from "zod";

const DiaryImageInputSchema = ai.defineSchema(
  "DiaryImageInput",
  z.object({ prompt: z.string() })
);

export const DiaryImageOutputSchema = ai.defineSchema(
  "DiaryImageOutput",
  z.object({ url: z.string() })
);

export const generateDiaryImageFlow = ai.defineFlow(
  {
    name: "generateDiaryImageFlow",
    inputSchema: DiaryImageInputSchema,
    outputSchema: DiaryImageOutputSchema,
  },
  async (input) => {
    const result = await ai.generate({
      model: vertexAI.model("imagen-4.0-fast-generate-preview-06-06"),
      prompt: input.prompt,
      output: { format: "media" },
    });

    const url = result.media?.url;
    if (!url) {
      throw new Error("Failed to generate image");
    }
    return { url };
  }
);
