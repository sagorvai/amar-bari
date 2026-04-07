const db = firebase.firestore();
const auth = firebase.auth();

const postData = JSON.parse(sessionStorage.getItem('stagedPropertyData') || '{}');
const imageData = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');

if (!Object.keys(postData).length) {
  alert('প্রিভিউ ডেটা পাওয়া যায়নি');
  location.href = 'post.html';
}

const preview = document.getElementById('previewContent');

/* ---------------- Helper Functions ---------------- */
function section(title) {
  const s = document.createElement('div');
  s.className = 'preview-section';
  s.innerHTML = `<h3>${title}</h3>`;
  preview.appendChild(s);
  return s;
}

function row(parent, label, value) {
  if (value === undefined || value === null || value === '') return;
  const div = document.createElement('div');
  div.className = 'preview-row';
  div.innerHTML = `<strong>${label}:</strong> ${value}`;
  parent.appendChild(div);
}

/* ---------------- Images ---------------- */
const imgBox = document.getElementById('previewImages');
(imageData.images || []).forEach(img => {
  const i = document.createElement('img');
  i.src = img.url;
  imgBox.appendChild(i);
});

/* ---------------- Basic Info ---------------- */
const basic = section('🏠 প্রপার্টির তথ্য');
row(basic, 'ক্যাটাগরি', postData.category);
row(basic, 'টাইপ', postData.type);
row(basic, 'শিরোনাম', postData.title);
row(basic, 'বর্ণনা', postData.description);

/* ---------------- Dynamic Property Fields ---------------- */
row(basic, 'রুম', postData.rooms);
row(basic, 'ডাইনিং', postData.dining);
row(basic, 'কিচেন', postData.kitchen);
row(basic, 'বাথরুম', postData.bathrooms);
row(basic, 'বেলকনি', postData.balcony);
row(basic, 'ফ্লোর নং', postData.floorNo);
row(basic, 'প্রপার্টির বয়স', postData.propertyAge);
row(basic, 'ফেসিং', postData.facing);
row(basic, 'রাস্তার প্রস্থ (ফিট)', postData.roadWidth);

if (Array.isArray(postData.utilities)) {
  row(basic, 'সুবিধাসমূহ', postData.utilities.join(', '));
}

/* ---------------- Land / Plot ---------------- */
row(basic, 'জমির ধরন', postData.landType);
row(basic, 'প্লট নং', postData.plotNo);

/* ---------------- Pricing ---------------- */
const price = section('💰 মূল্য সংক্রান্ত');

row(price, 'স্কয়ার ফিট', postData.areaSqft);
row(price, 'জমির পরিমাণ', postData.landArea);
row(price, 'ইউনিট', postData.landAreaUnit);

if (postData.category === 'বিক্রয়') {
  row(price, 'দাম', postData.price + ' টাকা');
} else {
  row(price, 'মাসিক ভাড়া', postData.monthlyRent + ' টাকা');
  row(price, 'এডভান্স', postData.advance + ' টাকা');
}

/* ---------------- Location ---------------- */
const loc = section('📍 ঠিকানা');

if (postData.location) {
  row(loc, 'বিভাগ', postData.location.division);
  row(loc, 'জেলা', postData.location.district);
  row(loc, 'এলাকার ধরন', postData.location.areaType);
  row(loc, 'উপজেলা/থানা', postData.location.upazila);
  row(loc, 'ইউনিয়ন', postData.location.union);
  row(loc, 'ওয়ার্ড', postData.location.wardNo);
  row(loc, 'গ্রাম/এলাকা', postData.location.village);
  row(loc, 'রাস্তা', postData.location.road);
}

/* ---------------- Ownership (Sale Only) ---------------- */
if (postData.category === 'বিক্রয়' && postData.owner) {
  const own = section('📑 মালিকানা তথ্য');
  row(own, 'দাতার নাম', postData.owner.donorName);
  row(own, 'দাগ নং', postData.owner.dagNo);
  row(own, 'দাগ ধরন', postData.owner.dagNoType);
  row(own, 'মৌজা', postData.owner.mouja);
}

/* ---------------- Contact ---------------- */
const contact = section('📞 যোগাযোগ');
row(contact, 'ফোন', postData.phoneNumber);
row(contact, 'অতিরিক্ত ফোন', postData.secondaryPhone);

/* ---------------- Actions ---------------- */
function goBack() {
  location.href = 'post.html';
}

async function publishPost() {
  const user = auth.currentUser;
  if (!user) {
    alert('লগইন আবশ্যক');
    return;
  }

  try {
    await db.collection('properties').add({
      ...postData,
      images: imageData.images || [],
      documents: {
        khotian: imageData.khotian || null,
        sketch: imageData.sketch || null
      },
      status: 'published',
      userId: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    sessionStorage.clear();
    alert('🎉 পোস্ট সফলভাবে লাইভ হয়েছে');
    location.href = 'index.html';

  } catch (e) {
    console.error(e);
    alert('পোস্ট প্রকাশে সমস্যা হয়েছে');
  }
}
