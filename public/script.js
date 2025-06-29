document.addEventListener('DOMContentLoaded', () => {
  const generateButton = document.getElementById('generateButton');
  const loader = document.getElementById('loader');

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

  generateButton.addEventListener('click', async () => {
    generateButton.disabled = true;
    generateButton.textContent = 'Generating...';
    loader.style.display = 'inline-block';
    petDetailsDiv.style.display = 'none';
    destinationDetailsDiv.style.display = 'none';
    diaryDetailsDiv.style.display = 'none';
    imageDetailsDiv.style.display = 'none';
    errorDetailsDiv.style.display = 'none';
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
      petOutput.textContent = JSON.stringify(petProfile, null, 2);
      petDetailsDiv.style.display = 'block';
      petDetailsDiv.scrollIntoView({ behavior: 'smooth' });

      // 2. generate destination
      const generateDestination = functions.httpsCallable('generateDestination');
      const date = new Date().toISOString().split('T')[0];
      const { data: destination } = await generateDestination({
        persona_dna: petProfile.persona_dna,
        date,
        past_destinations: []
      });
      destinationOutput.textContent = JSON.stringify(destination, null, 2);
      destinationDetailsDiv.style.display = 'block';
      destinationDetailsDiv.scrollIntoView({ behavior: 'smooth' });

      // 3. generate diary
      const generateDiary = functions.httpsCallable('generateDiary');
      const { data: diary } = await generateDiary({
        persona_dna: petProfile.persona_dna,
        travel_material: destination
      });
      diaryOutput.textContent = diary.diary;
      diaryDetailsDiv.style.display = 'block';
      diaryDetailsDiv.scrollIntoView({ behavior: 'smooth' });

      // 4. generate diary image
      const generateDiaryImage = functions.httpsCallable('generateDiaryImage');
      const { data: image } = await generateDiaryImage({
        prompt: diary.image_prompt
      });
      imageOutput.src = image.url;
      imageDetailsDiv.style.display = 'block';
      imageDetailsDiv.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error(error);
      errorOutput.textContent = error.message;
      errorDetailsDiv.style.display = 'block';
      errorDetailsDiv.scrollIntoView({ behavior: 'smooth' });
    } finally {
      generateButton.disabled = false;
      generateButton.textContent = 'Generate Diary';
      loader.style.display = 'none';
    }
  });
});
