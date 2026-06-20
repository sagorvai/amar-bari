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
if (imgBox) {
  imgBox.innerHTML = ''; // আগের কোনো ইমেজ থাকলে ক্লিয়ার করার জন্য
  (imageData.images || []).forEach(img => {
    const i = document.createElement('img');
    i.src = img.url;
    imgBox.appendChild(i);
  });
}

/* ---------------- ১. প্রপার্টির সাধারণ তথ্য ---------------- */
const basic = section('🏠 প্রপার্টির তথ্য');
row(basic, 'ক্যাটাগরি', postData.category);
row(basic, 'টাইপ', postData.type);
row(basic, 'শিরোনাম', postData.title);
row(basic, 'वर्णना', postData.description);

/* ---------------- ২. ডাইনামিক প্রপার্টি ফিল্ডস (ক্যাটাগরি ভিত্তিক) ---------------- */
// ফ্ল্যাট, বাড়ি বা বাণিজ্যিক প্রপার্টির রুম ও অন্যান্য বিবরণ
row(basic, 'রুম', postData.rooms);
row(basic, 'বেডরুম', postData.bedRooms || postData.bedrooms);
row(basic, 'ড্রয়িং রুম', postData.drawingRoom);
row(basic, 'ডাইনিং', postData.dining);
row(basic, 'কিচেন', postData.kitchen);
row(basic, 'বাথরুম', postData.bathrooms);
row(basic, 'বেলকনি', postData.balcony);
row(basic, 'ফ্লোর নং', postData.floorNo);
row(basic, 'প্রপার্টির বয়স', postData.propertyAge);
row(basic, 'ফেসিং', postData.facing);
row(basic, 'রাস্তার প্রস্থ (ফিট)', postData.roadWidth);
row(basic, 'গ্যারেজ/পার্কিং', postData.parking || postData.garage);
row(basic, 'প্রপার্টির অবস্থা', postData.propertyStatus || postData.statusCondition);

// ইউটিলিটি বা সুবিধাসমূহ (যদি এরে আকারে থাকে)
if (Array.isArray(postData.utilities) && postData.utilities.length > 0) {
  row(basic, 'সুবিধাসমূহ', postData.utilities.join(', '));
}

// শুধুমাত্র জমি বা প্লটের তথ্য
row(basic, 'জমির ধরন', postData.landType);
row(basic, 'প্লট নং', postData.plotNo);

/* ---------------- ৩. পরিমাণ ও মূল্য সংক্রান্ত ---------------- */
const price = section('💰 পরিমাণ ও মূল্য সংক্রান্ত');

// পরিমাণের ডাইনামিক ফিল্ড ও ইউনিট (গ্রাহক যা ইনপুট দিবে শুধু সেটাই দেখাবে)
row(price, 'ফ্ল্যাটের সাইজ (স্কয়ার ফিট)', postData.areaSqft);
row(price, 'জমির পরিমাণ', postData.landArea);
row(price, 'জমির ইউনিট', postData.landAreaUnit);
row(price, 'বাড়ির পরিমাণ', postData.houseArea);
row(price, 'বাড়ির ইউনিট', postData.houseAreaUnit);
row(price, 'বাণিজ্যিক স্পেসের পরিমাণ', postData.commercialArea);
row(price, 'বাণিজ্যিক স্পেসের ইউনিট', postData.commercialAreaUnit);

// বিক্রয় বা ভাড়ার ওপর ভিত্তি করে মূল্য
if (postData.category === 'বিক্রয়') {
  let priceTypeString = postData.isNegotiable || postData.priceType === 'Negotiable' ? ' (আলোচনা সাপেক্ষে)' : ' (ফিক্সড)';
  row(price, 'দাম', postData.price + ' টাকা' + priceTypeString);
  row(price, 'দামের একক', postData.priceUnit);
} else {
  row(price, 'মাসিক ভাড়া', postData.monthlyRent + ' টাকা');
  row(price, 'এডভান্স', postData.advance + ' টাকা');
  row(price, 'ভাড়ার একক', postData.priceUnit);
}

/* ---------------- ৪. ঠিকানা ও অবস্থান ---------------- */
const loc = section('📍 ঠিকানা');
if (postData.location) {
  row(loc, 'বিভাগ', postData.location.division);
  row(loc, 'জেলা', postData.location.district);
  row(loc, 'এলাকার ধরন', postData.location.areaType);
  row(loc, 'উপজেলা/থানা', postData.location.upazila);
  row(loc, 'ইউনিয়ন', postData.location.union);
  row(loc, 'ওয়ার্ড নম্বর', postData.location.wardNo);
  row(loc, 'গ্রাম/এলাকা', postData.location.village);
  row(loc, 'রাস্তা/ব্লক/সেক্টর', postData.location.road);
}

/* ---------------- ৫. মালিকানা তথ্য (শুধুমাত্র বিক্রয়ের জন্য) ---------------- */
if (postData.category === 'বিক্রয়' && postData.owner) {
  const own = section('📑 মালিকানা তথ্য');
  row(own, 'দাতার নাম', postData.owner.donorName);
  row(own, 'দাগ নং', postData.owner.dagNo);
  row(own, 'দাগ ধরন', postData.owner.dagNoType);
  row(own, 'মৌজা', postData.owner.mouja);
}

/* ---------------- ৬. যোগাযোগ ---------------- */
const contact = section('📞 যোগাযোগ');
row(contact, 'ফোন নম্বর', postData.phoneNumber);
row(contact, 'অতিরিক্ত ফোন নম্বর', postData.secondaryPhone);

/* ---------------- Actions Button লজিক ---------------- */
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
