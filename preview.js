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
  // এডিট মোড চালু থাকলে এডিটিং আইডিসহ ফেরত যাবে
  const originalPostId = postData.id || postData.postId || sessionStorage.getItem('editingPostId');
  if (originalPostId) {
    location.href = `post.html?edit=${originalPostId}`;
  } else {
    location.href = 'post.html';
  }
}

// একটি ইউআরএল থেকে ফাইল অবজেক্ট বা ব্লব তৈরি করে নতুন লোকেশনে আপলোড করার হেল্পার ফাংশন
async function moveImageToPermanentStorage(url, userId, docType = 'images') {
  if (!url) return null;
  
  // ফিক্স: যদি ছবি বা ফাইলটি ইতিমধ্যে স্থায়ী ফোল্ডারে (properties/) আপলোড করা থাকে (যেমন এডিটিং মুডে), তবে পুনরায় আপলোড করবে না
  if (url.includes('properties/images') || url.includes('properties/documents')) {
    return url; 
  }
  
  try {
    // ১. স্টোরেজের বর্তমান ইউআরএল থেকে ফাইলটি ডাউনলোড (fetch) করা হচ্ছে
    const response = await fetch(url);
    const blob = await response.blob();

    // ২. স্থায়ী ফোল্ডারের পাথ নির্ধারণ (staging/ থেকে সরিয়ে সরাসরি properties/-এ)
    const storageRef = firebase.storage().ref();
    const baseDir = docType === 'images' ? 'properties/images' : `properties/documents/${docType}`;
    
    // ফাইলের একটি ইউনিক নাম তৈরি করা
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const permanentFileRef = storageRef.child(`${baseDir}/${userId}/${filename}`);

    // ৩. স্থায়ী ফোল্ডারে নতুন করে আপলোড করা
    const uploadTask = await permanentFileRef.put(blob);
    
    // ৪. নতুন স্থায়ী ডাউনলোড ইউআরএল রিটার্ন করা
    return await permanentFileRef.getDownloadURL();
  } catch (error) {
    console.error("ফাইল স্থায়ী স্টোরেজে স্থানান্তর করতে ব্যর্থ:", error);
    return url; // কোনো কারণে ব্যর্থ হলে আগের ইউআরএলটিই ব্যাকআপ হিসেবে রাখা
  }
}

async function publishPost() {
  const user = auth.currentUser;
  if (!user) {
    alert('লগইন আবশ্যক! দয়া করে লগইন করুন।');
    return;
  }

  // বোতাম নিষ্ক্রিয় এবং স্পিনার দেখানো হলো
  const originalBtn = document.querySelector('.btn-publish');
  if(originalBtn) {
     originalBtn.disabled = true;
     originalBtn.innerText = '⏳ প্রসেসিং হচ্ছে...';
  }

  try {
    const userId = user.uid;

    // ১. সাধারণ প্রোপার্টি ছবিগুলো একে একে স্থায়ী ফোল্ডারে মুভ করা
    const finalImages = [];
    const propertyImages = imageData.images || [];
    for (let img of propertyImages) {
      const currentUrl = img.url || img;
      if (currentUrl) {
        const permanentUrl = await moveImageToPermanentStorage(currentUrl, userId, 'images');
        finalImages.push(img.url ? { ...img, url: permanentUrl } : permanentUrl);
      }
    }

    // ২. খতিয়ান ইমেজ স্থায়ী ফোল্ডারে মুভ করা
    let finalKhotian = null;
    if (imageData.khotian) {
      const khotianUrl = imageData.khotian.url || imageData.khotian;
      const permanentKhotianUrl = await moveImageToPermanentStorage(khotianUrl, userId, 'khotian');
      finalKhotian = imageData.khotian.url ? { ...imageData.khotian, url: permanentKhotianUrl } : permanentKhotianUrl;
    }

    // ৩. নকশা/স্কেচ ইমেজ স্থায়ী ফোল্ডারে মুভ করা
    let finalSketch = null;
    if (imageData.sketch) {
      const sketchUrl = imageData.sketch.url || imageData.sketch;
      const permanentSketchUrl = await moveImageToPermanentStorage(sketchUrl, userId, 'sketch');
      finalSketch = imageData.sketch.url ? { ...imageData.sketch, url: permanentSketchUrl } : permanentSketchUrl;
    }

    // প্রিপেয়ার করা ডেটা অবজেক্ট
    const preparedData = {
      ...postData,
      images: finalImages,
      documents: {
        khotian: finalKhotian,
        sketch: finalSketch
      },
      status: 'published',
      userId: userId,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp() // আপডেট ট্র্যাকিং
    };

    // 🔍 এডিট পোস্টের ক্ষেত্রে প্রোপার্টির মূল আইডিটি খুঁজে বের করার ৩ স্তরের শক্তিশালী চেক
    const originalPostId = postData.id || postData.postId || sessionStorage.getItem('editingPostId');

    if (originalPostId) {
      // 🔄 ৪.১: এডিট মুড চালু থাকলে বিদ্যমান আইডি-তে 'Update' করা হবে (নতুন পোস্ট তৈরি হবে না)
      // ডাটাবেজ ফিল্ড থেকে আইডি রিমুভ করছি যেন ফিল্ড ডুপ্লিকেট না হয়
      delete preparedData.id; 
      delete preparedData.postId;

      await db.collection('properties').doc(originalPostId).update(preparedData);
      
      sessionStorage.clear();
      alert('🎉 অভিনন্দন বন্ধু! আপনার পোস্টটি সফলভাবে সংশোধন করা হয়েছে।');
      
      // পূর্বের পেজে ফেরত পাঠানো হচ্ছে
      if (document.referrer && !document.referrer.includes('post.html') && !document.referrer.includes('preview.html')) {
        location.href = document.referrer;
      } else {
        location.href = 'index.html';
      }

    } else {
      // ➕ ৪.২: নতুন পোস্ট তৈরির জন্য 'Add' করা হবে
      preparedData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      
      await db.collection('properties').add(preparedData);
      
      sessionStorage.clear();
      alert('🎉 অভিনন্দন বন্ধু! আপনার পোস্টটি সফলভাবে লাইভ হয়েছে।');
      location.href = 'index.html';
    }

  } catch (e) {
    console.error(e);
    alert('পোস্ট প্রকাশ করতে সমস্যা হয়েছে, আবার চেষ্টা করুন।');
    if(originalBtn) {
      originalBtn.disabled = false;
      originalBtn.innerText = '✅ চূড়ান্ত পোস্ট করুন';
    }
  }
}

// 🆕 লগইন করা ইউজারের প্রোফাইল পিকচার হেডারে দেখানোর লজিক
firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    
    if (user && headerProfileImg) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().profilePic) {
                headerProfileImg.src = userDoc.data().profilePic;
            } else if (user.photoURL) {
                headerProfileImg.src = user.photoURL;
            } else {
                headerProfileImg.src = 'assets/images/default-avatar.png'; 
            }
        } catch (error) {
            console.error("হেডার প্রোফাইল পিকচার লোড করতে ব্যর্থ:", error);
        }
    }
});
