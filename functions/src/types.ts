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

export interface EmailProcessor {
  checkExistingPet(email: string): Promise<boolean>;
  createPet(email: string): Promise<void>;
}
