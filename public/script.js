document.addEventListener('DOMContentLoaded', () => {
  const generateButton = document.getElementById('generateButton');
  const loader = document.getElementById('loader');
  const buttonText = document.getElementById('buttonText');

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

  function objectToRows(obj) {
    return Object.entries(obj)
      .map(([k, v]) => {
        const value = v && typeof v === 'object'
          ? `<table class="ml-4">${objectToRows(v)}</table>`
          : v;
        return `<tr><th class="text-left pr-2 align-top">${k}</th><td>${value}</td></tr>`;
      })
      .join('');
  }

  function renderObject(element, obj) {
    element.innerHTML = `<table class="w-full">${objectToRows(obj)}</table>`;
  }

  generateButton.addEventListener('click', async () => {
    generateButton.disabled = true;
    buttonText.textContent = 'Generating...';
    loader.style.display = 'inline-block';
    petDetailsDiv.classList.add('hidden');
    destinationDetailsDiv.classList.add('hidden');
    diaryDetailsDiv.classList.add('hidden');
    imageDetailsDiv.classList.add('hidden');
    errorDetailsDiv.classList.add('hidden');
    petOutput.innerHTML = '';
    destinationOutput.innerHTML = '';
    diaryOutput.textContent = '';
    imageOutput.src = '';
    errorOutput.textContent = '';

    try {
      // 1. create pet
      const createPet = functions.httpsCallable('createPet');
      const { data: petWrapper } = await createPet({});
      const petProfile = petWrapper.profile;
      renderObject(petOutput, petProfile);
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
      renderObject(destinationOutput, destination);
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
      buttonText.textContent = 'Generate Diary';
      loader.style.display = 'none';
    }
  });
});
