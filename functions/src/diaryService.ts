import { db } from "./firebase";
import { generateDestinationFlow } from "./generateDestinationFlow";
import { generateDiaryFlow } from "./generateDiaryFlow";
import {
  getPetFromFirestore,
  saveDestinationToFirestore,
  getDestinationFromFirestore,
  saveDiaryToFirestore,
  sendDiaryEmail,
} from "./diaryHelpers";

export async function generateDestinationsForAllPets(): Promise<void> {
  const petsSnapshot = await db.collection("pets").get();

  if (petsSnapshot.empty) {
    console.log("No pets found");
    return;
  }

  console.log(`Generating destinations for ${petsSnapshot.size} pets`);

  const promises = petsSnapshot.docs.map(async (petDoc) => {
    const petId = petDoc.id;
    try {
      const petData = await getPetFromFirestore(petId);
      if (!petData) {
        console.error(`Failed to get pet data for: ${petId}`);
        return;
      }

      const destination = await generateDestinationFlow({
        persona_dna: petData.profile.persona_dna,
        date: new Date().toISOString().split("T")[0],
      });

      await saveDestinationToFirestore(petId, destination);

      console.log(`Destination generated for pet: ${petId}`);
    } catch (error) {
      console.error(`Failed to generate destination for pet ${petId}:`, error);
    }
  });

  await Promise.allSettled(promises);
  console.log("Destination generation completed");
}

export async function generateDiaryEntriesForAllPets(): Promise<void> {
  const petsSnapshot = await db.collection("pets").get();

  if (petsSnapshot.empty) {
    console.log("No pets found");
    return;
  }

  console.log(`Generating diaries for ${petsSnapshot.size} pets`);

  const promises = petsSnapshot.docs.map(async (petDoc) => {
    const petId = petDoc.id;
    try {
      const petData = await getPetFromFirestore(petId);
      if (!petData) {
        console.error(`Failed to get pet data for: ${petId}`);
        return;
      }

      const itinerary = await getDestinationFromFirestore(petId);
      if (!itinerary) {
        console.error(`No destination found for pet ${petId}`);
        return;
      }

      const diaryResult = await generateDiaryFlow({
        persona_dna: petData.profile.persona_dna,
        travel_material: itinerary,
      });

      await saveDiaryToFirestore(petId, itinerary, diaryResult.diary);
      await sendDiaryEmail(petData.email, itinerary, diaryResult.diary);

      console.log(`Diary generated for pet: ${petId}`);
    } catch (error) {
      console.error(`Failed to generate diary for pet ${petId}:`, error);
    }
  });

  await Promise.allSettled(promises);
  console.log("Diary generation completed");
}

export async function generateDiariesForAllPets(): Promise<void> {
  await generateDestinationsForAllPets();
  await generateDiaryEntriesForAllPets();
}
