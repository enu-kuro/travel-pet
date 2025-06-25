import { db } from "./firebase";
import { PET_LIFESPAN_DAYS } from "./config";
import { PetProfile } from "./types";

// Delete pets whose lifetime exceeds PET_LIFESPAN_DAYS
export async function deleteExpiredPets(): Promise<void> {
  const petsSnapshot = await db.collection("pets").get();

  if (petsSnapshot.empty) {
    console.log("No pets found");
    return;
  }

  const now = Date.now();

  const promises = petsSnapshot.docs.map(async (petDoc) => {
    const petData = petDoc.data() as PetProfile;
    const createdAt = petData.createdAt.toDate();
    const ageInDays =
      (now - createdAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageInDays >= PET_LIFESPAN_DAYS) {
      // delete diaries subcollection
      const diaries = await petDoc.ref.collection("diaries").listDocuments();
      await Promise.all(diaries.map((d) => d.delete()));
      await petDoc.ref.delete();
      console.log(`Deleted expired pet: ${petDoc.id}`);
    }
  });

  await Promise.all(promises);
}
