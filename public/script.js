document.addEventListener('DOMContentLoaded', () => {
    const generateButton = document.getElementById('generateButton');
    const loader = document.getElementById('loader');

    const petOutput = document.getElementById('petOutput');
    const destinationOutput = document.getElementById('destinationOutput');
    const diaryOutput = document.getElementById('diaryOutput');
    const errorOutput = document.getElementById('errorOutput');

    const petDetailsDiv = document.getElementById('petDetails');
    const destinationDetailsDiv = document.getElementById('destinationDetails');
    const diaryDetailsDiv = document.getElementById('diaryDetails');
    const errorDetailsDiv = document.getElementById('errorDetails');

    // Initialize Firebase
    // firebase.initializeApp(firebaseConfig); // Already handled by /__/firebase/init.js
    const functions = firebase.app().functions('us-central1'); // Specify the region if not default

    generateButton.addEventListener('click', async () => {
        // Reset UI
        generateButton.disabled = true;
        loader.style.display = 'inline-block';
        petDetailsDiv.style.display = 'none';
        destinationDetailsDiv.style.display = 'none';
        diaryDetailsDiv.style.display = 'none';
        errorDetailsDiv.style.display = 'none';
        petOutput.textContent = '';
        destinationOutput.textContent = '';
        diaryOutput.textContent = '';
        errorOutput.textContent = '';

        try {
            // 1. Create Pet
            console.log('Calling createPetFlow...');
            const createPet = functions.httpsCallable('createPetFlow');
            const petResult = await createPet({
                // For simplicity, using a fixed name and type for now.
                // Ideally, these could come from user input.
                name: 'Fluffy',
                type: 'cat'
            });
            console.log('createPetFlow response:', petResult.data);
            const petDataWrapper = petResult.data; // This is { profile: PetProfileData }
            if (!petDataWrapper || !petDataWrapper.profile || !petDataWrapper.profile.name || !petDataWrapper.profile.type || !petDataWrapper.profile.personality) {
                throw new Error('Invalid pet data received from createPetFlow. Expected { profile: { name, type, personality, ... } }');
            }
            const petProfile = petDataWrapper.profile; // This is the actual PetProfileData
            petOutput.textContent = JSON.stringify(petProfile, null, 2);
            petDetailsDiv.style.display = 'block';

            // 2. Generate Destination
            console.log('Calling generateDestinationFlow with pet profile:', petProfile);
            const generateDestination = functions.httpsCallable('generateDestinationFlow');
            const destinationResult = await generateDestination({ pet: petProfile }); // Pass the petProfile
            console.log('generateDestinationFlow response:', destinationResult.data);
            const destination = destinationResult.data;
            if (!destination || !destination.name || !destination.description) {
                throw new Error('Invalid destination data received from generateDestinationFlow.');
            }
            destinationOutput.textContent = JSON.stringify(destination, null, 2);
            destinationDetailsDiv.style.display = 'block';

            // 3. Generate Diary
            console.log('Calling generateDiaryFlow with pet profile and destination:', petProfile, destination);
            const generateDiary = functions.httpsCallable('generateDiaryFlow');
            const diaryResult = await generateDiary({ pet: petProfile, destination }); // Pass the petProfile
            console.log('generateDiaryFlow response:', diaryResult.data);
            const diary = diaryResult.data;
            if (!diary || !diary.title || !diary.entry) {
                throw new Error('Invalid diary data received from generateDiaryFlow.');
            }
            diaryOutput.textContent = `Title: ${diary.title}\n\nEntry:\n${diary.entry}`;
            diaryDetailsDiv.style.display = 'block';

        } catch (error) {
            console.error('Error during flow execution:', error);
            errorOutput.textContent = `Error: ${error.message}\n\nDetails: ${error.details ? JSON.stringify(error.details) : 'N/A'}`;
            errorDetailsDiv.style.display = 'block';
        } finally {
            generateButton.disabled = false;
            loader.style.display = 'none';
        }
    });
});
