import vertexAI from "@genkit-ai/vertexai";
import { genkit } from "genkit";
import { z } from "zod";

export const ai = genkit({
  plugins: [
    vertexAI({ location: "us-central1", projectId: "travel-pet-b6edb" }),
  ],
});

export const EmptySchema = ai.defineSchema("EmptySchema", z.object({}));

export const PersonaSchema = ai.defineSchema(
  "PersonaSchema",
  z.object({
    personality: z.string(),
    guiding_theme: z.string(),
    emotional_trigger: z.string(),
    mobility_range: z.string(),
    interest_depth: z.string(),
    temporal_focus: z.string(),
  })
);

export const PetProfileSchema = ai.defineSchema(
  "PetProfileSchema",
  z.object({
    name: z.string(),
    persona_dna: PersonaSchema,
    introduction: z.string(),
  })
);

export const GenerateDestinationInputSchema = ai.defineSchema(
  "GenerateDestinationInput",
  z.object({
    persona_dna: PersonaSchema,
    date: z.string(),
  })
);

export const DestinationSchema = ai.defineSchema(
  "DestinationSchema",
  z.object({
    selected_location: z.string(),
    summary: z.string(),
    news_context: z.string(),
    local_details: z.string(),
  })
);

export const GenerateDiaryInputSchema = ai.defineSchema(
  "GenerateDiaryInput",
  z.object({
    persona_dna: PersonaSchema,
    travel_material: DestinationSchema,
  })
);

export const DiarySchema = ai.defineSchema(
  "DiarySchema",
  z.object({
    diary: z.string(),
  })
);

export type Persona = z.infer<typeof PersonaSchema>;
export type PetProfileData = z.infer<typeof PetProfileSchema>;
export type Destination = z.infer<typeof DestinationSchema>;
export type DiaryData = z.infer<typeof DiarySchema>;
