const db = firebase.firestore();
const auth = firebase.auth();

const propertyData = JSON.parse(sessionStorage.getItem('stagedPropertyData'));
const imageData = JSON.parse(sessionStorage.getItem('stagedImageMetadata'));

if (!propertyData || !imageData) {
  alert("প্রিভিউ ডেটা পাওয়া যায়নি");
  window.location.href = 'post.html';
}

/* ------------------ Render Images ------------------ */
const imageContainer = document.getElementById('preview-images');

(imageData.images || []).forEach(img => {
  const el = document.createElement('img');
  el.src = img.url;
  el.className = 'preview-image';
  imageContainer.appendChild(el);
});

/* ------------------ Render Details ------------------ */
const details = document.getElementById('preview-details');

function row(label, value) {
  if (!value) return '';
  return `<div class="preview-row"><strong>${label}:</strong> ${value}</div>`;
}

details.innerHTML = `
  <div class="preview-card">
    ${row('ক্যাটাগরি', propertyData.category)}
    ${row('প্রপার্টি টাইপ', propertyData.type)}
    ${row('শিরোনাম', propertyData.title)}
    ${row('বর্ণনা', propertyData.description)}
    ${row('ফোন', propertyData.phoneNumber)}
    ${row('অতিরিক্ত ফোন', propertyData.secondaryPhone)}
  </div>

  <div class="preview-card">
    <h4>📐 প্রপার্টি তথ্য</h4>
    ${row('রুম', propertyData.rooms)}
    ${row('বাথরুম', propertyData.bathrooms)}
    ${row('কিচেন', propertyData.kitchen)}
    ${row('আয়তন', propertyData.areaSqft || propertyData.landArea)}
    ${row('ফেসিং', propertyData.facing)}
    ${row('সুবিধা', (propertyData.utilities || []).join(', '))}
  </div>

  <div class="preview-card">
    <h4>📍 ঠিকানা</h4>
    ${row('বিভাগ', propertyData.location?.division)}
    ${row('জেলা', propertyData.location?.district)}
    ${row('এলাকা', propertyData.location?.village)}
    ${row('রাস্তা', propertyData.location?.road)}
  </div>

  <div class="preview-card">
    <h4>💰 মূল্য</h4>
    ${
      propertyData.category === 'বিক্রয়'
        ? row('দাম', propertyData.price + ' টাকা')
        : row('ভাড়া', propertyData.monthlyRent + ' টাকা')
    }
  </div>
`;

/* ------------------ Edit Button ------------------ */
document.getElementById('editPostBtn').onclick = () => {
  window.location.href = 'post.html';
};

/* ------------------ Final Publish ------------------ */
document.getElementById('confirmPostBtn').onclick = async () => {
  const user = auth.currentUser;
  if (!user) {
    alert("লগইন আবশ্যক");
    return;
  }

  try {
    await db.collection('properties').add({
      ...propertyData,
      images: imageData.images,
      documents: {
        khotian: imageData.khotian || null,
        sketch: imageData.sketch || null
      },
      status: 'published',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      userId: user.uid
    });

    sessionStorage.clear();
    alert("🎉 সফলভাবে পোস্ট লাইভ হয়েছে!");
    window.location.href = 'index.html';

  } catch (err) {
    console.error(err);
    alert("পোস্ট করতে সমস্যা হয়েছে");
  }
};
