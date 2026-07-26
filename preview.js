// preview.js - Fixed with Production-Ready Storage Moving, Price Drop Alert & Security Rules Sync
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

const khotianContainer = document.getElementById('khotianBoxContainer');
const khotianBox = document.getElementById('previewKhotian');
if (khotianBox && imageData.khotian) {
  khotianBox.innerHTML = '';
  khotianContainer.style.display = 'block'; 
  const i = document.createElement('img');
  i.src = imageData.khotian.url || imageData.khotian;
  khotianBox.appendChild(i);
}

const sketchContainer = document.getElementById('sketchBoxContainer');
const sketchBox = document.getElementById('previewSketch');
if (sketchBox && imageData.sketch) {
  sketchBox.innerHTML = '';
  sketchContainer.style.display = 'block'; 
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
  row(loc, 'উপজেলা/থানা', postData.location.upazila || postData.location.thana);
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
  row(own, 'খতিয়ান টাইপ', postData.owner.khotianNoType);
  row(own, 'খতিয়ান নং', postData.owner.khotianNo);
  row(own, 'মৌজা', postData.owner.mouja);
}

/* ---------------- ৬. যোগাযোগ ---------------- */
const contact = section('📞 যোগাযোগ মাধ্যম');
row(contact, 'প্রাথমিক ফোন নম্বর', postData.phoneNumber);
row(contact, 'অতিরিক্ত ফোন নম্বর', postData.secondaryPhone);

/* ---------------- Actions Button Logic ---------------- */
function goBack() {
  const originalPostId = sessionStorage.getItem('editingPostId');
  if (originalPostId) {
    location.href = `post.html?edit=${originalPostId}`;
  } else {
    location.href = 'post.html';
  }
}

async function moveImageToPermanentStorage(url, realAuthUid, docType = 'images') {
  if (!url) return null;
  
  if (url.includes('properties/images') || url.includes('properties/documents')) {
    return url; 
  }
  
  try {
    const response = await fetch(url);
    const blob = await response.blob();

    const storageRef = firebase.storage().ref();
    const baseDir = docType === 'images' ? 'properties/images' : `properties/documents/${docType}`;
    
    // ফাইল নেম তৈরি এবং আসল UID দিয়ে পাথ তৈরি
    const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const permanentFileRef = storageRef.child(`${baseDir}/${realAuthUid}/${filename}`);

    await permanentFileRef.put(blob);
    return await permanentFileRef.getDownloadURL();
  } catch (error) {
    console.error("ফাইল স্থায়ী স্টোরেজে স্থানান্তর করতে ব্যর্থ:", error);
    return url; 
  }
}

async function publishPost() {
  const user = auth.currentUser;
  if (!user) {
    alert('লগইন আবশ্যক! দয়া করে লগইন করুন।');
    return;
  }

  const originalBtn = document.querySelector('.btn-publish');
  if(originalBtn) {
     originalBtn.disabled = true;
     originalBtn.innerText = '⏳ প্রসেসিং হচ্ছে...';
  }

  try {
    const realAuthUid = user.uid; // আসল ফায়ারবেস Auth UID

    // 🎯 বর্তমান অ্যাক্টিভ আইডেন্টিটি রিকভারি
    const activeIdentity = (typeof window.getActiveIdentity === 'function') ? window.getActiveIdentity() : {
      id: realAuthUid,
      type: 'user',
      ownerUid: realAuthUid,
      name: user.displayName || 'ইউজার',
      avatar: user.photoURL || ''
    };

    // 🖼️ ১. স্থায়ী স্টোরেজে ছবি সেভ (সবসময় আসল Auth UID দিয়ে)
    const finalImages = [];
    const propertyImages = imageData.images || [];
    for (let img of propertyImages) {
      const currentUrl = img.url || img;
      if (currentUrl) {
        const permanentUrl = await moveImageToPermanentStorage(currentUrl, realAuthUid, 'images');
        finalImages.push(img.url ? { ...img, url: permanentUrl } : permanentUrl);
      }
    }

    let finalKhotian = null;
    if (imageData.khotian) {
      const khotianUrl = imageData.khotian.url || imageData.khotian;
      const permanentKhotianUrl = await moveImageToPermanentStorage(khotianUrl, realAuthUid, 'khotian');
      finalKhotian = imageData.khotian.url ? { ...imageData.khotian, url: permanentKhotianUrl } : permanentKhotianUrl;
    }

    let finalSketch = null;
    if (imageData.sketch) {
      const sketchUrl = imageData.sketch.url || imageData.sketch;
      const permanentSketchUrl = await moveImageToPermanentStorage(sketchUrl, realAuthUid, 'sketch');
      finalSketch = imageData.sketch.url ? { ...imageData.sketch, url: permanentSketchUrl } : permanentSketchUrl;
    }

    // 🎯 ২. সিকিউরিটি রুলসের (Firestore Security Rules) সাথে ১০০% সিঙ্ক করা ডেটা অবজেক্ট
    const preparedData = {
      ...postData,
      images: finalImages,
      documents: {
        khotian: finalKhotian,
        sketch: finalSketch
      },
      status: 'published',
      
      // 🔥 সিকিউরিটি রুলসের প্রধান ফিল্ডসমূহ
      authorType: activeIdentity.type,                            // 'user' অথবা 'company'
      authorId: activeIdentity.id,                                // ইউজার আইডি অথবা কোম্পানি আইডি
      userId: realAuthUid,                                       // রুলস চেক পার করার জন্য মূল Auth UID
      companyId: activeIdentity.type === 'company' ? activeIdentity.id : null, // কোম্পানির ফিল্টারিং
      createdByUid: realAuthUid,                                 // এডিট/ডিলিট পারমিশন ম্যাচ করার জন্য
      
      // UI ও যোগাযোগের তথ্যাদি
      ownerId: activeIdentity.id,            
      ownerType: activeIdentity.type,        
      postedByName: activeIdentity.name,     
      postedByAvatar: activeIdentity.avatar, 

      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // 🎯 ৩. এডিট নাকি নতুন পোস্ট চেক
    const originalPostId = sessionStorage.getItem('editingPostId') || postData.editPostId || postData.id;

    if (originalPostId) {
      // ডুপ্লিকেট কি রিমুভ
      delete preparedData.id; 
      delete preparedData.postId;
      delete preparedData.editPostId;
      delete preparedData.isEditMode;

      // ফায়ারস্টোর আপডেট
      await db.collection('properties').doc(originalPostId).update(preparedData);

      // 🎯 দাম কমার নোটিফিকেশন অ্যালার্ট
      const oldPrice = parseFloat(sessionStorage.getItem('preEditPriceBackup') || '0');
      const newPrice = parseFloat(preparedData.category === 'বিক্রয়' ? preparedData.price : preparedData.monthlyRent);

      if (oldPrice > 0 && newPrice < oldPrice) {
          const discountAlert = {
              postId: originalPostId,
              title: "দাম কমেছে! 📉",
              message: `আপনার সেভ করা '${preparedData.title}' প্রপার্টির দাম ৳${oldPrice} থেকে কমিয়ে ৳${newPrice} টাকা করা হয়েছে!`,
              type: "price_drop",
              createdAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          await db.collection('notifications').add(discountAlert);
      }
      
      sessionStorage.clear();
      alert('🎉 অভিনন্দন বন্ধু! আমার বাড়ি প্ল্যাটফর্মে আপনার পোস্টটি সফলভাবে সংশোধন করা হয়েছে।');
      
      if (document.referrer && !document.referrer.includes('post.html') && !document.referrer.includes('preview.html')) {
        location.href = document.referrer;
      } else {
        location.href = 'index.html';
      }

    } else {
      preparedData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      
      await db.collection('properties').add(preparedData);
      
      sessionStorage.clear();
      alert('🎉 অভিনন্দন বন্ধু! আমার বাড়ি প্ল্যাটফর্মে আপনার পোস্টটি সফলভাবে লাইভ হয়েছে।');
      location.href = 'index.html';
    }

  } catch (e) {
    console.error("Firestore Save Error:", e);
    alert('পোস্ট প্রকাশ করতে সমস্যা হয়েছে: ' + e.message);
    if(originalBtn) {
      originalBtn.disabled = false;
      originalBtn.innerText = '✅ চূড়ান্ত পোস্ট করুন';
    }
  }
}

firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    if (user && headerProfileImg) {
        try {
            // 🎯 এক্টিভ আইডেন্টিটির প্রোফাইল ছবি দিয়ে হেডার আপডেট
            const activeIdentity = (typeof window.getActiveIdentity === 'function') ? window.getActiveIdentity() : null;
            
            if (activeIdentity && activeIdentity.avatar) {
                headerProfileImg.src = activeIdentity.avatar;
            } else {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().profilePic) {
                    headerProfileImg.src = userDoc.data().profilePic;
                } else if (user.photoURL) {
                    headerProfileImg.src = user.photoURL;
                } else {
                    headerProfileImg.src = 'assets/images/default-avatar.png'; 
                }
            }
        } catch (error) {
            console.error("হেডার প্রোফাইল পিকচার লোড করতে ব্যর্থ:", error);
        }
    }
});
