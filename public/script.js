document.addEventListener('DOMContentLoaded', () => {
  const generateButton = document.getElementById('generateButton');
  const spinner = document.getElementById('buttonSpinner');
  const generateText = generateButton.querySelector('span');

  const petOutput = document.getElementById('petOutput');
  const destinationOutput = document.getElementById('destinationOutput');
  const diaryOutput = document.getElementById('diaryOutput');
  const imageOutput = document.getElementById('imageOutput');
  const errorOutput = document.getElementById('errorOutput');

  const petDetailsDiv = document.getElementById('petDetails');
  const destinationDetailsDiv = document.getElementById('destinationDetails');
  const diaryDetailsDiv = document.getElementById('diaryDetails');
  const imageDetailsDiv = document.getElementById('imageDetails');
  const errorDetailsDiv = document.getElementById('errorDetails');
  const db = firebase.app().firestore();

  const functions = firebase.app().functions('us-central1');
  const viewEntriesLink = document.getElementById('viewEntries');

  function displayPetDetails(profile) {
    petOutput.innerHTML = `
      <table class="table-auto text-sm w-full border-separate border-spacing-y-2">
        <tbody>
          <tr class="border-b"><th class="py-1 pr-3 text-left align-top whitespace-nowrap">Name</th><td class="py-1">${profile.name}</td></tr>
          <tr class="border-b"><th class="py-1 pr-3 text-left align-top">Introduction</th><td class="py-1">${profile.introduction}</td></tr>
        </tbody>
      </table>
      <h3 class="mt-4 font-medium">Personality DNA</h3>
      <table class="table-auto text-sm w-full mt-2 border-separate border-spacing-y-2">
        <tbody>
          ${Object.entries(profile.persona_dna).map(([k,v]) => `<tr class='border-b'><th class='py-1 pr-3 text-left whitespace-nowrap'>${k}</th><td class='py-1'>${v}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  function displayDestination(dest) {
    destinationOutput.innerHTML = `
      <table class="table-auto text-sm w-full border-separate border-spacing-y-2">
        <tbody>
          <tr class="border-b"><th class="py-1 pr-3 text-left align-top whitespace-nowrap">Location</th><td class="py-1">${dest.selected_location}</td></tr>
          <tr class="border-b"><th class="py-1 pr-3 text-left align-top">Summary</th><td class="py-1">${dest.summary}</td></tr>
          <tr class="border-b"><th class="py-1 pr-3 text-left align-top">News</th><td class="py-1">${dest.news_context}</td></tr>
          <tr class="border-b"><th class="py-1 pr-3 text-left align-top">Local Details</th><td class="py-1">${dest.local_details}</td></tr>
        </tbody>
      </table>`;
  }

  generateButton.addEventListener('click', async () => {
    generateButton.disabled = true;
    if (viewEntriesLink) {
      viewEntriesLink.classList.add('pointer-events-none', 'opacity-60');
    }
    generateText.textContent = 'Generating...';
    spinner.classList.remove('hidden');
    petDetailsDiv.classList.add('hidden');
    destinationDetailsDiv.classList.add('hidden');
    diaryDetailsDiv.classList.add('hidden');
    imageDetailsDiv.classList.add('hidden');
    errorDetailsDiv.classList.add('hidden');
    petOutput.textContent = '';
    destinationOutput.textContent = '';
    diaryOutput.textContent = '';
    imageOutput.src = '';
    errorOutput.textContent = '';

    try {
      // 1. create pet
      const createPet = functions.httpsCallable('createPet');
      const { data: petWrapper } = await createPet({});
      const petProfile = petWrapper.profile;
      displayPetDetails(petProfile);
      petDetailsDiv.classList.remove('hidden');
      petDetailsDiv.scrollIntoView({ behavior: 'smooth' });

      // 2. generate destination
      const generateDestination = functions.httpsCallable('generateDestination');
      const date = new Date().toISOString().split('T')[0];
      const { data: destination } = await generateDestination({
        persona_dna: petProfile.persona_dna,
        date,
        past_destinations: []
      });
      displayDestination(destination);
      destinationDetailsDiv.classList.remove('hidden');
      destinationDetailsDiv.scrollIntoView({ behavior: 'smooth' });

      // 3. generate diary
      const generateDiary = functions.httpsCallable('generateDiary');
      const { data: diary } = await generateDiary({
        persona_dna: petProfile.persona_dna,
        travel_material: destination
      });
      diaryOutput.textContent = diary.diary;
      diaryDetailsDiv.classList.remove('hidden');
      diaryDetailsDiv.scrollIntoView({ behavior: 'smooth' });

      // 4. generate diary image
      const generateDiaryImage = functions.httpsCallable('generateDiaryImage');
      const { data: image } = await generateDiaryImage({
        prompt: diary.image_prompt
      });
      imageOutput.src = image.url;
      imageDetailsDiv.classList.remove('hidden');
      imageDetailsDiv.scrollIntoView({ behavior: 'smooth' });

      const saveImage = functions.httpsCallable('saveDemoImage');
      const { data: saved } = await saveImage({ dataUrl: image.url });

      await db.collection('demoDiaries').add({
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        profile: petProfile,
        destination,
        diary: diary.diary,
        imageUrl: saved.url,
      });
    } catch (error) {
      console.error(error);
      errorOutput.textContent = error.message;
      errorDetailsDiv.classList.remove('hidden');
      errorDetailsDiv.scrollIntoView({ behavior: 'smooth' });
    } finally {
      generateButton.disabled = false;
      generateText.textContent = 'Generate Diary';
      spinner.classList.add('hidden');
      if (viewEntriesLink) {
        viewEntriesLink.classList.remove('pointer-events-none', 'opacity-60');
      }
    }
  });
});
