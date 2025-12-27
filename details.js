const db = firebase.firestore();
const id = new URLSearchParams(location.search).get('id');

let index = 0;

function slide(dir) {
  const slides = document.getElementById('slides');
  index += dir;
  if (index < 0) index = slides.children.length - 1;
  if (index >= slides.children.length) index = 0;
  slides.style.transform = `translateX(-${index * 100}%)`;
}

db.collection('properties').doc(id).get().then(doc => {
  if (!doc.exists) return;

  const d = doc.data();

  document.getElementById('title').innerText = d.title;
  document.getElementById('badge').innerText = `${d.type} | ${d.category}`;

  /* Images (ALL) */
  const slides = document.getElementById('slides');
  (d.images || []).forEach(img => {
    const i = document.createElement('img');
    i.src = img.url;
    slides.appendChild(i);
  });

  /* Details */
  const box = document.getElementById('details');
  box.innerHTML = `
    <div class="section">
      <h3>🏠 প্রপার্টি তথ্য</h3>
      <div class="row"><strong>বর্ণনা:</strong> ${d.description || ''}</div>
      <div class="row"><strong>রুম:</strong> ${d.rooms || '-'}</div>
      <div class="row"><strong>বাথরুম:</strong> ${d.bathrooms || '-'}</div>
      <div class="row"><strong>ফেসিং:</strong> ${d.facing || '-'}</div>
      <div class="row"><strong>সুবিধা:</strong> ${(d.utilities||[]).join(', ')}</div>
    </div>

    <div class="section">
      <h3>💰 মূল্য</h3>
      ${d.category === 'বিক্রয়'
        ? `<div class="row"><strong>দাম:</strong> ${d.price} টাকা</div>`
        : `<div class="row"><strong>ভাড়া:</strong> ${d.monthlyRent} টাকা</div>`
      }
    </div>

    <div class="section">
      <h3>📍 অবস্থান</h3>
      <div class="row"><strong>জেলা:</strong> ${d.location?.district}</div>
      <div class="row"><strong>এলাকা:</strong> ${d.location?.village || d.location?.wardNo}</div>
      <div class="row"><strong>রাস্তা:</strong> ${d.location?.road}</div>
    </div>
  `;

  /* Contact */
  document.getElementById('callBtn').href = `tel:${d.phoneNumber}`;
  document.getElementById('chatBtn').href = `https://wa.me/88${d.phoneNumber}`;

  /* Related Posts */
  db.collection('properties')
    .where('location.district', '==', d.location?.district)
    .limit(6)
    .get()
    .then(snap => {
      const rel = document.getElementById('relatedPosts');
      snap.forEach(p => {
        if (p.id === id) return;
        const x = p.data();
        rel.innerHTML += `
          <a href="details.html?id=${p.id}" class="card">
            <img src="${x.images?.[0]?.url || ''}">
            <div class="card-body">
              <strong>${x.title}</strong><br>
              ${x.price || x.monthlyRent} টাকা
            </div>
          </a>
        `;
      });
    });

});
