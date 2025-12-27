const db = firebase.firestore();

/* ---------------- Utils ---------------- */
const qs = new URLSearchParams(window.location.search);
const postId = qs.get('id');

if (!postId) {
  alert('পোস্ট খুঁজে পাওয়া যায়নি');
  location.href = 'index.html';
}

const content = document.getElementById('detailsContent');

function section(title) {
  const s = document.createElement('div');
  s.className = 'details-section';
  s.innerHTML = `<h3>${title}</h3>`;
  content.appendChild(s);
  return s;
}

function row(parent, label, value) {
  if (!value) return;
  const r = document.createElement('div');
  r.className = 'details-row';
  r.innerHTML = `<strong>${label}:</strong> ${value}`;
  parent.appendChild(r);
}

/* ---------------- Load Post ---------------- */
db.collection('properties').doc(postId).get()
  .then(doc => {
    if (!doc.exists) {
      alert('পোস্ট পাওয়া যায়নি');
      location.href = 'index.html';
      return;
    }

    const data = doc.data();

    /* ---------- Header ---------- */
    document.getElementById('postTitle').innerText = data.title || 'প্রপার্টি';
    document.getElementById('postBadge').innerText =
      `${data.type || ''} | ${data.category || ''}`;

    /* ---------- Images ---------- */
    const gallery = document.getElementById('imageGallery');
    (data.images || []).forEach(img => {
      const i = document.createElement('img');
      i.src = img.url;
      gallery.appendChild(i);
    });

    /* ---------- Basic Info ---------- */
    const basic = section('🏠 প্রপার্টি তথ্য');
    row(basic, 'ক্যাটাগরি', data.category);
    row(basic, 'টাইপ', data.type);
    row(basic, 'বর্ণনা', data.description);
    row(basic, 'ফেসিং', data.facing);
    row(basic, 'রাস্তার প্রস্থ', data.roadWidth);

    if (Array.isArray(data.utilities)) {
      row(basic, 'সুবিধা', data.utilities.join(', '));
    }

    /* ---------- Structure ---------- */
    row(basic, 'রুম', data.rooms);
    row(basic, 'বাথরুম', data.bathrooms);
    row(basic, 'কিচেন', data.kitchen);
    row(basic, 'ফ্লোর নং', data.floorNo);

    /* ---------- Land / Plot ---------- */
    row(basic, 'জমির ধরন', data.landType);
    row(basic, 'প্লট নং', data.plotNo);

    /* ---------- Price ---------- */
    const price = section('💰 মূল্য');

    if (data.category === 'বিক্রয়') {
      row(price, 'দাম', data.price + ' টাকা');
      row(price, 'জমির পরিমাণ', data.landArea);
    } else {
      row(price, 'মাসিক ভাড়া', data.monthlyRent + ' টাকা');
      row(price, 'এডভান্স', data.advance + ' টাকা');
    }

    /* ---------- Location ---------- */
    const loc = section('📍 ঠিকানা');
    if (data.location) {
      row(loc, 'বিভাগ', data.location.division);
      row(loc, 'জেলা', data.location.district);
      row(loc, 'উপজেলা/থানা', data.location.upazila);
      row(loc, 'ইউনিয়ন', data.location.union);
      row(loc, 'ওয়ার্ড', data.location.wardNo);
      row(loc, 'গ্রাম/এলাকা', data.location.village);
      row(loc, 'রাস্তা', data.location.road);
    }

    /* ---------- Ownership ---------- */
    if (data.category === 'বিক্রয়' && data.owner) {
      const own = section('📑 মালিকানা');
      row(own, 'দাতার নাম', data.owner.donorName);
      row(own, 'দাগ নং', data.owner.dagNo);
      row(own, 'দাগ ধরন', data.owner.dagNoType);
      row(own, 'মৌজা', data.owner.mouja);
    }

    /* ---------- Contact ---------- */
    const contact = section('📞 যোগাযোগ');
    row(contact, 'ফোন', data.phoneNumber);
    row(contact, 'অতিরিক্ত ফোন', data.secondaryPhone);

  })
  .catch(err => {
    console.error(err);
    alert('ডেটা লোড করতে সমস্যা হয়েছে');
  });
