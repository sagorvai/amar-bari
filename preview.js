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
  
  const grid = document.createElement('div');
  grid.className = 'section-grid';
  s.appendChild(grid);
  
  preview.appendChild(s);
  return grid; 
}

function row(parent, label, value) {
  if (value === undefined || value === null || value === '') return;
  const div = document.createElement('div');
  div.className = 'preview-row';
  
  const isPrice = label.includes('দাম') || label.includes('ভাড়া') || label.includes('এডভান্স');
  const valueClass = isPrice ? 'class="price-tag"' : '';

  div.innerHTML = `<strong>${label}</strong> <span ${valueClass}>: ${value}</span>`;
  parent.appendChild(div);
}

/* ---------------- 🖼️ সকল ছবি লোড করার লজিক ---------------- */

// ১. সাধারণ প্রোপার্টি ছবি গ্যালারি
const imgBox = document.getElementById('previewImages');
if (imgBox) {
  imgBox.innerHTML = ''; 
  const propertyImages = imageData.images || [];
  if (propertyImages.length > 0) {
    propertyImages.forEach(img => {
      const i = document.createElement('img');
      i.src = img.url || img;
      imgBox.appendChild(i);
    });
  } else {
    imgBox.innerHTML = '<p style="color:#94a3b8; padding:10px; margin:0; font-size:13px;">কোনো ছবি আপলোড করা হয়নি</p>';
  }
}

// ২. খতিয়ান ছবি প্রিভিউ
const khotianContainer = document.getElementById('khotianBoxContainer');
const khotianBox = document.getElementById('previewKhotian');
if (khotianBox && imageData.khotian) {
  khotianBox.innerHTML = '';
  khotianContainer.style.display = 'block'; // বক্সটি সচল করা হলো
  const i = document.createElement('img');
  i.src = imageData.khotian.url || imageData.khotian;
  khotianBox.appendChild(i);
}

// ৩. স্কেচ বা নকশা ছবি প্রিভিউ
const sketchContainer = document.getElementById('sketchBoxContainer');
const sketchBox = document.getElementById('previewSketch');
if (sketchBox && imageData.sketch) {
  sketchBox.innerHTML = '';
  sketchContainer.style.display = 'block'; // বক্সটি সচল করা হলো
  const i = document.createElement('img');
  i.src = imageData.sketch.url || imageData.sketch;
  sketchBox.appendChild(i);
}


/* ---------------- ১. প্রপার্টির সাধারণ তথ্য ---------------- */
const basic = section('🏠 প্রপার্টির তথ্য');
row(basic, 'ক্যাটাগরি', postData.category);
row(basic, 'টাইপ', postData.type);
row(basic, 'শিরোনাম', postData.title);
row(basic, 'বর্ণনা', postData.description);

/* ---------------- ২. ডাইনামিক প্রপার্টি ফিল্ডস ---------------- */
row(basic, 'রুম সংখ্যা', postData.rooms);
row(basic, 'বেডরুম', postData.bedRooms || postData.bedrooms);
row(basic, 'ড্রয়িং রুম', postData.drawingRoom);
row(basic, 'ডাইনিং', postData.dining);
row(basic, 'কিচেন', postData.kitchen);
row(basic, 'বাথরুম', postData.bathrooms);
row(basic, 'বেলকনি', postData.balcony);
row(basic, 'ফ্লোর নম্বর', postData.floorNo);
row(basic, 'প্রপার্টির বয়স', postData.propertyAge);
row(basic, 'ফেসিং', postData.facing);
row(basic, 'রাস্তার প্রস্থ (ফিট)', postData.roadWidth);
row(basic, 'গ্যারেজ/পার্কিং', postData.parking || postData.garage);
row(basic, 'প্রপার্টির অবস্থা', postData.propertyStatus || postData.statusCondition);

if (Array.isArray(postData.utilities) && postData.utilities.length > 0) {
  row(basic, 'সুবিধাসমূহ', postData.utilities.join(', '));
}

row(basic, 'জমির ধরন', postData.landType);
row(basic, 'প্লট নম্বর', postData.plotNo);

/* ---------------- ৩. পরিমাণ ও মূল্য সংক্রান্ত ---------------- */
const price = section('💰 পরিমাণ ও মূল্য সংক্রান্ত');

row(price, 'ফ্ল্যাটের সাইজ (স্কয়ার ফিট)', postData.areaSqft);
row(price, 'জমির পরিমাণ', postData.landArea);
row(price, 'জমির ইউনিট', postData.landAreaUnit);
row(price, 'বাড়ির পরিমাণ', postData.houseArea);
row(price, 'বাড়ির ইউনিট', postData.houseAreaUnit);
row(price, 'বাণিজ্যিক স্পেসের পরিমাণ', postData.commercialArea);
row(price, 'বাণিজ্যিক স্পেসের ইউনিট', postData.commercialAreaUnit);

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
const loc = section('📍 ঠিকানা ও অবস্থান');
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

/* ---------------- ৫. মালিকানা তথ্য (বিক্রয়ের জন্য) ---------------- */
if (postData.category === 'বিক্রয়' && postData.owner) {
  const own = section('📑 আইনগত ও মালিকানা তথ্য');
  row(own, 'দাতার নাম', postData.owner.donorName);
  row(own, 'দাগ নম্বর', postData.owner.dagNo);
  row(own, 'দাগের ধরন', postData.owner.dagNoType);
  row(own, 'মৌজা', postData.owner.mouja);
}

/* ---------------- ৬. যোগাযোগ ---------------- */
const contact = section('📞 যোগাযোগ মাধ্যম');
row(contact, 'প্রাথমিক ফোন নম্বর', postData.phoneNumber);
row(contact, 'অতিরিক্ত ফোন নম্বর', postData.secondaryPhone);

/* ---------------- Actions Button Logic ---------------- */
function goBack() {
  location.href = 'post.html';
}

async function publishPost() {
  const user = auth.currentUser;
  if (!user) {
    alert('লগইন আবশ্যক! দয়া করে লগইন করুন।');
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
    alert('🎉 অভিনন্দন বন্ধু! আপনার পোস্টটি সফলভাবে লাইভ হয়েছে।');
    location.href = 'index.html';

  } catch (e) {
    console.error(e);
    alert('পোস্ট প্রকাশ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।');
  }
    }

// 🆕 লগইন করা ইউজারের প্রোফাইল পিকচার হেডারে দেখানোর লজিক
firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    
    if (user && headerProfileImg) {
        try {
            // ফায়ারবেস 'users' কালেকশন থেকে ইউজারের ডাটা আনা হচ্ছে
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().profilePic) {
                // ডাটাবেজে প্রোফাইল পিকচার থাকলে সেটি হেডারে সেট হবে
                headerProfileImg.src = userDoc.data().profilePic;
            } else if (user.photoURL) {
                // গুগল লগইন করা থাকলে গুগল প্রোফাইল পিকচার সেট হবে
                headerProfileImg.src = user.photoURL;
            } else {
                // কোনো ছবি না থাকলে একটি ডিফল্ট অ্যাভাটার সেট হবে
                headerProfileImg.src = 'assets/images/default-avatar.png'; // আপনার প্রজেক্টের ডিফল্ট ছবির পাথ দিন
            }
        } catch (error) {
            console.error("হেডার প্রোফাইল পিকচার লোড করতে ব্যর্থ:", error);
        }
    }
});

  // 🆕 লগইন করা ইউজারের প্রোফাইল পিকচার হেডারে দেখানোর লজিক
firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    
    if (user && headerProfileImg) {
        try {
            // ফায়ারবেস 'users' কালেকশন থেকে ইউজারের ডাটা আনা হচ্ছে
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().profilePic) {
                // ডাটাবেজে প্রোফাইল পিকচার থাকলে সেটি হেডারে সেট হবে
                headerProfileImg.src = userDoc.data().profilePic;
            } else if (user.photoURL) {
                // গুগল লগইন করা থাকলে গুগল প্রোফাইল পিকচার সেট হবে
                headerProfileImg.src = user.photoURL;
            } else {
                // কোনো ছবি না থাকলে একটি ডিফল্ট অ্যাভাটার সেট হবে
                headerProfileImg.src = 'assets/images/default-avatar.png'; // আপনার প্রজেক্টের ডিফল্ট ছবির পাথ দিন
            }
        } catch (error) {
            console.error("হেডার প্রোফাইল পিকচার লোড করতে ব্যর্থ:", error);
        }
    }
});


