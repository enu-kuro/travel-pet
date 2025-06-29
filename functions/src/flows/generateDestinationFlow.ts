import {
  ai,
  DestinationSchema,
  GenerateDestinationInputSchema,
} from "../genkit.config";

const generateDestinationPrompt = ai.prompt<
  typeof GenerateDestinationInputSchema,
  typeof DestinationSchema
>("generate-destination");

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
