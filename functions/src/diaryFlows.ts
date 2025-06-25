import {
  ai,
  DestinationSchema,
  GenerateDestinationInputSchema,
  GenerateDiaryInputSchema,
  DiarySchema,
} from "./genkit.config";

const generateDestinationPrompt = ai.prompt<
  typeof GenerateDestinationInputSchema,
  typeof DestinationSchema
>("generate-destination");

const generateDiaryPrompt = ai.prompt<
  typeof GenerateDiaryInputSchema,
  typeof DiarySchema
>("generate-diary");

export const generateDestinationFlow = ai.defineFlow(
  {
    name: "generateDestinationFlow",
    inputSchema: GenerateDestinationInputSchema,
    outputSchema: DestinationSchema,
  },
  async (input) => {
    const { output } = await generateDestinationPrompt(input);
    if (!output) {
      throw new Error("Failed to generate destination");
    }
    return output;
  }
);

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

