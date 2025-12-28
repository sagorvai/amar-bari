const db = firebase.firestore();
const auth = firebase.auth();
const postId = new URLSearchParams(location.search).get('id');

let postData = null;

/* ---------- Load Post ---------- */
db.collection('properties').doc(postId).get().then(doc => {
  if (!doc.exists) return;

  postData = doc.data();

  /* View Count */
  db.collection('properties').doc(postId)
    .update({ views: firebase.firestore.FieldValue.increment(1) });

  document.getElementById('title').innerText = postData.title;
  document.getElementById('badge').innerText =
    `${postData.type} | ${postData.category}`;

  /* Images (3 property + khotian + sketch) */
  const slides = document.getElementById('slides');
  const allImages = [
    ...(postData.images || []).map(i => i.url),
    postData.documents?.khotian?.url,
    postData.documents?.sketch?.url
  ].filter(Boolean);

  allImages.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    slides.appendChild(img);
  });

  /* Contact */
  document.getElementById('callBtn').href = `tel:${postData.phoneNumber}`;
  document.getElementById('chatBtn').href = `chat.html?postId=${postId}`;

  /* Dynamic Details */
  const d = document.getElementById('details');

  function row(label, value){
    if(!value) return '';
    return `<div class="row"><strong>${label}:</strong> ${value}</div>`;
  }

  d.innerHTML = `
    <div class="section">
      <h3>🏠 প্রপার্টি তথ্য</h3>
      ${row('বর্ণনা', postData.description)}
      ${row('রুম', postData.rooms)}
      ${row('বাথরুম', postData.bathrooms)}
      ${row('কিচেন', postData.kitchen)}
      ${row('ফ্লোর', postData.floorNo)}
      ${row('ফেসিং', postData.facing)}
      ${row('সুবিধা', (postData.utilities||[]).join(', '))}
    </div>

    <div class="section">
      <h3>💰 মূল্য</h3>
      ${
        postData.category === 'বিক্রয়'
          ? row('দাম', postData.price + ' টাকা')
          : row('ভাড়া', postData.monthlyRent + ' টাকা') +
            row('এডভান্স', postData.advance + ' টাকা')
      }
    </div>

    <div class="section">
      <h3>📍 অবস্থান</h3>
      ${row('জেলা', postData.location?.district)}
      ${row('এলাকা', postData.location?.village || postData.location?.wardNo)}
      ${row('রাস্তা', postData.location?.road)}
    </div>
  `;

  /* Related */
  db.collection('properties')
    .where('location.district', '==', postData.location?.district)
    .limit(6)
    .get()
    .then(snap => {
      const r = document.getElementById('related');
      snap.forEach(p => {
        if (p.id === postId) return;
        const x = p.data();
        r.innerHTML += `
          <a href="details.html?id=${p.id}" class="card">
            <img src="${x.images?.[0]?.url || ''}">
            <div class="card-body">
              <strong>${x.title}</strong><br>
              ${(x.price||x.monthlyRent)||''} টাকা
            </div>
          </a>
        `;
      });
    });
});

/* ---------- Save ---------- */
function savePost(){
  const user = auth.currentUser;
  if(!user){ alert('লগইন প্রয়োজন'); return; }

  db.collection('savedPosts')
    .doc(user.uid)
    .collection('items')
    .doc(postId)
    .set({ createdAt: firebase.firestore.FieldValue.serverTimestamp() });

  alert('❤️ সেভ করা হয়েছে');
}

/* ---------- Share ---------- */
function sharePost(){
  if(navigator.share){
    navigator.share({
      title: postData.title,
      url: location.href
    });
  } else {
    alert('লিংক কপি করে শেয়ার করুন');
  }
}
