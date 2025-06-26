import { Destination, PetProfileData } from "./genkit.config";

export interface PetProfile {
  email: string;
  profile: PetProfileData;
  createdAt: FirebaseFirestore.Timestamp;
  nextDestination?: Destination;
  destinations?: Destination[];
}

export interface DiaryEntry {
  itinerary: Destination;
  diary: string;
  date: string;
  imageUrl?: string;
}

export interface EmailProcessor {
  checkExistingPet(email: string): Promise<boolean>;
  createPet(email: string): Promise<void>;
}
