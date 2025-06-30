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

  const functions = firebase.app().functions('us-central1');

  function displayPetDetails(profile) {
    petOutput.innerHTML = `
      <table class="table-auto text-sm w-full">
        <tbody>
          <tr><th class="pr-2 text-left">Name</th><td>${profile.name}</td></tr>
          <tr><th class="pr-2 text-left align-top">Introduction</th><td>${profile.introduction}</td></tr>
        </tbody>
      </table>
      <h3 class="mt-3 font-medium">Personality DNA</h3>
      <table class="table-auto text-sm w-full mt-1">
        <tbody>
          ${Object.entries(profile.persona_dna).map(([k,v]) => `<tr><th class='pr-2 text-left'>${k}</th><td>${v}</td></tr>`).join('')}
        </tbody>
      </table>
    `;
  }

  function displayDestination(dest) {
    destinationOutput.innerHTML = `
      <table class="table-auto text-sm w-full">
        <tbody>
          <tr><th class="pr-2 text-left">Location</th><td>${dest.selected_location}</td></tr>
          <tr><th class="pr-2 text-left">Summary</th><td>${dest.summary}</td></tr>
          <tr><th class="pr-2 text-left">News</th><td>${dest.news_context}</td></tr>
          <tr><th class="pr-2 text-left">Local Details</th><td>${dest.local_details}</td></tr>
        </tbody>
      </table>`;
  }

  generateButton.addEventListener('click', async () => {
    generateButton.disabled = true;
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
    } catch (error) {
      console.error(error);
      errorOutput.textContent = error.message;
      errorDetailsDiv.classList.remove('hidden');
      errorDetailsDiv.scrollIntoView({ behavior: 'smooth' });
    } finally {
      generateButton.disabled = false;
      generateText.textContent = 'Generate Diary';
      spinner.classList.add('hidden');
    }
  });
});
