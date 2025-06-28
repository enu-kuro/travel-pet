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

const STYLE_PROMPT =
  "a soft, storybook-style landscape illustration, watercolor texture, warm muted colors, hand-drawn feel, gentle lighting, 2D digital painting, cozy and nostalgic mood, no characters, no text, no photo-realism";

export const generateDiaryImageFlow = ai.defineFlow(
  {
    name: "generateDiaryImageFlow",
    inputSchema: DiaryImageInputSchema,
    outputSchema: DiaryImageOutputSchema,
  },
  async (input) => {
    const result = await ai.generate({
      model: vertexAI.model("imagen-4.0-fast-generate-preview-06-06"),
      prompt: `${input.prompt}, ${STYLE_PROMPT}`,
      output: { format: "media" },
      config: { aspectRatio: "1:1" },
    });

    const url = result.media?.url;
    if (!url) {
      throw new Error("Failed to generate image");
    }
    return { url };
  }
);
