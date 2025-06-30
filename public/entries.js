document.addEventListener('DOMContentLoaded', () => {
  const db = firebase.app().firestore();
  const entriesList = document.getElementById('entriesList');
  const loading = document.getElementById('loading');

  async function loadEntries() {
    loading.classList.remove('hidden');
    const query = db.collection('demoDiaries').orderBy('createdAt', 'desc').limit(100);
    const snap = await query.get();
    loading.classList.add('hidden');
    if (snap.empty) {
      entriesList.innerHTML = '<p class="text-center text-sm text-gray-600">データがありません</p>';
      return;
    }

    const html = snap.docs
      .map((doc) => {
        const d = doc.data();
        const name = d.profile?.name ?? '';
        const loc = d.destination?.selected_location ?? '';
        const diary = d.diary ?? '';
        const diaryHtml = diary.replace(/\n/g, '<br>');
        const image = d.imageUrl
          ? `<img src="${d.imageUrl}" width="512" height="512" loading="lazy" class="max-w-full h-auto mt-2" />`
          : '';
        return `
          <div class="border rounded p-4">
            <div class="font-medium">${name} - ${loc}</div>
            <details class="mt-1 text-sm">
              <summary class="cursor-pointer">日記を読む</summary>
              <div class="whitespace-pre-wrap mt-1">${diaryHtml}</div>
              ${image}
            </details>
          </div>`;
      })
      .join('');
    entriesList.insertAdjacentHTML('beforeend', html);
  }

  loadEntries();
});
