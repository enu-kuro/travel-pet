import { ai } from "./genkit.config";
import { gemini } from "@genkit-ai/vertexai";
import { z } from "zod";

const OutputSchema = ai.defineSchema(
  "GenerateImageOutput",
  z.object({ url: z.string() })
);

export const generateCatImage = ai.defineFlow(
  {
    name: "generateCatImage",
    inputSchema: ai.defineSchema("GenerateImageInput", z.object({})),
    outputSchema: OutputSchema,
  },
  async () => {
    const result = await ai.generate({
      model: gemini("gemini-2.0-flash-preview-image-generation"),
      prompt: "絵日記風のかわいい猫のイラストを描いてください",
    });

    const url =
      result.message?.content.find((p) => "media" in p && p.media)?.media?.url;

    if (!url) {
      throw new Error("Failed to generate image");
    }
    return { url };
  }
);
