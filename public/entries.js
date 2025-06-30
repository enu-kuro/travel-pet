document.addEventListener('DOMContentLoaded', () => {
  const db = firebase.app().firestore();
  const entriesList = document.getElementById('entriesList');
  const loadMoreBtn = document.getElementById('loadMore');
  let lastDoc = null;

  async function loadEntries() {
    let query = db.collection('demoDiaries').orderBy('createdAt', 'desc').limit(10);
    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }
    const snap = await query.get();
    if (snap.empty) {
      loadMoreBtn.disabled = true;
      return;
    }
    lastDoc = snap.docs[snap.docs.length - 1];

    const html = snap.docs
      .map((doc) => {
        const d = doc.data();
        const name = d.profile?.name ?? '';
        const loc = d.destination?.selected_location ?? '';
        const diary = d.diary ?? '';
        const diaryHtml = diary.replace(/\n/g, '<br>');
        const image = d.imageUrl
          ? `<img src="${d.imageUrl}" class="max-w-full h-auto mt-2" />`
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

  loadMoreBtn.addEventListener('click', loadEntries);
  loadEntries();
});
