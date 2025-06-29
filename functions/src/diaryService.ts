import { db } from "./firebase";
import { generateDestinationFlow } from "./flows/generateDestinationFlow";
import { generateDiaryFlow } from "./flows/generateDiaryFlow";
import { generateDiaryImageFlow } from "./flows/generateDiaryImageFlow";
import {
  getPetFromFirestore,
  saveDestinationToFirestore,
  saveDiaryToFirestore,
  sendDiaryEmail,
  saveImageToStorage,
  getDiaryFromFirestore,
} from "./diaryHelpers";


export async function generateDiariesForAllPets(): Promise<void> {
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

      const itinerary = await generateDestinationFlow({
        persona_dna: petData.profile.persona_dna,
        date: new Date().toISOString().split("T")[0],
        past_destinations: petData.destinations ?? [],
      });

      await saveDestinationToFirestore(petId, itinerary);

      const diaryResult = await generateDiaryFlow({
        persona_dna: petData.profile.persona_dna,
        travel_material: itinerary,
      });

      const imageResult = await generateDiaryImageFlow({
        prompt: diaryResult.image_prompt,
      });

      const today = new Date().toISOString().split("T")[0];
      const storedUrl = await saveImageToStorage(imageResult.url, petId, today);

      await saveDiaryToFirestore(
        petId,
        itinerary,
        diaryResult.diary,
        storedUrl
      );

      console.log(`Diary generated for pet: ${petId}`);
    } catch (error) {
      console.error(`Failed to generate diary for pet ${petId}:`, error);
    }
  });

  await Promise.allSettled(promises);
  console.log("Diary generation completed");
}

export async function sendDiaryEmailsForAllPets(): Promise<void> {
  const petsSnapshot = await db.collection("pets").get();

  if (petsSnapshot.empty) {
    console.log("No pets found");
    return;
  }

  const today = new Date().toISOString().split("T")[0];
  console.log(`Sending diary emails for ${petsSnapshot.size} pets`);

  const promises = petsSnapshot.docs.map(async (petDoc) => {
    const petId = petDoc.id;
    try {
      const petData = await getPetFromFirestore(petId);
      if (!petData) {
        console.error(`Failed to get pet data for: ${petId}`);
        return;
      }

      const diaryEntry = await getDiaryFromFirestore(petId, today);
      if (!diaryEntry) {
        console.error(`Diary not found for pet ${petId}`);
        return;
      }

      await sendDiaryEmail(
        petData.email,
        diaryEntry.itinerary,
        diaryEntry.diary,
        diaryEntry.imageUrl
      );

      console.log(`Diary email sent for pet: ${petId}`);
    } catch (error) {
      console.error(`Failed to send diary email for pet ${petId}:`, error);
    }
  });

  await Promise.allSettled(promises);
  console.log("Diary email sending completed");
}
