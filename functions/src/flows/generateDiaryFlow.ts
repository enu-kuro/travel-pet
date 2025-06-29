import { onCallGenkit } from "firebase-functions/v2/https";
import { ai, GenerateDiaryInputSchema, DiarySchema } from "../genkit.config";

const generateDiaryPrompt = ai.prompt<
  typeof GenerateDiaryInputSchema,
  typeof DiarySchema
>("generate-diary");

export const generateDiaryFlow = ai.defineFlow(
  {
    name: "generateDiaryFlow",
    inputSchema: GenerateDiaryInputSchema,
    outputSchema: DiarySchema,
  },
  async (input) => {
    const { output } = await generateDiaryPrompt(input);
    if (!output) {
      throw new Error("Failed to generate diary");
    }
    return output;
  }
);

// Export callable Cloud Function for client access
export const generateDiary = onCallGenkit(generateDiaryFlow);


