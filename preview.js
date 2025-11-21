// preview.js

// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Utility Function: Base64 Data URL to Blob (post.js থেকে নেওয়া)
const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}

// --- ১. ডেটা লোড এবং রেন্ডার করার প্রধান ফাংশন ---
function loadAndRenderPreview() {
    const dataString = sessionStorage.getItem('stagedPropertyData');
    const metadataString = sessionStorage.getItem('stagedImageMetadata');
    const previewContainer = document.getElementById('preview-container');
    const actionButtons = document.getElementById('action-buttons');
    const pageTitle = document.getElementById('page-title');

    if (!dataString || !metadataString) {
        // ডেটা না পেলে পোস্ট পেজে ফেরত
        alert("কোনো প্রিভিউ ডেটা পাওয়া যায়নি। আপনাকে পোস্ট পেজে নিয়ে যাওয়া হচ্ছে।");
        window.location.href = 'post.html';
        return;
    }

    try {
        const stagedData = JSON.parse(dataString);
        const stagedMetadata = JSON.parse(metadataString);
        
        // টাইটেল আপডেট
        pageTitle.textContent = `${stagedData.title} - পোস্ট প্রিভিউ`;
        
        // প্রিভিউ HTML জেনারেট এবং ডিসপ্লে
        previewContainer.innerHTML = generatePreviewHTML(stagedData);
        
        // Base64 ছবিগুলো রেন্ডার করা
        renderImages(stagedData);

        // অ্যাকশন বাটন সেটআপ
        document.getElementById('edit-button').addEventListener('click', () => {
            window.location.href = 'post.html'; // এডিট করার জন্য post.html-এ ফেরত
        });
        document.getElementById('post-button').addEventListener('click', () => {
            handleFinalSubmission(stagedData, stagedMetadata); // চূড়ান্ত পোস্ট
        });
        
        // বাটনগুলো দেখানো
        actionButtons.style.display = 'flex';

    } catch (error) {
        console.error('Error loading staged data:', error);
        previewContainer.innerHTML = '<p class="error-message">প্রিভিউ লোড করার সময় সমস্যা হয়েছে।</p>';
        // ডেটা মুছে ফেলা
        sessionStorage.removeItem('stagedPropertyData');
        sessionStorage.removeItem('stagedImageMetadata');
        actionButtons.style.display = 'none';
    }
}

// --- ২. Base64 ছবিগুলো রেন্ডার করা ---
function renderImages(stagedData) {
    const galleryContainer = document.getElementById('gallery-container');
    const khotianContainer = document.getElementById('khotian-image-preview');
    const sketchContainer = document.getElementById('sketch-image-preview');

    // মূল ছবি
    if (stagedData.base64Images && stagedData.base64Images.length > 0) {
        galleryContainer.innerHTML = stagedData.base64Images.map((base64, index) => {
            return `<img src="${base64}" alt="Property Image ${index + 1}" class="preview-gallery-image">`;
        }).join('');
    } else {
        galleryContainer.innerHTML = '<p>কোনো ছবি আপলোড করা হয়নি।</p>';
    }

    // মালিকানার ডকুমেন্ট (যদি থাকে)
    if (stagedData.category === 'বিক্রয়' && stagedData.owner) {
        if (stagedData.owner.khotianBase64) {
             khotianContainer.innerHTML = `<img src="${stagedData.owner.khotianBase64}" alt="খতিয়ানের ছবি" class="ownership-doc-image">`;
        }
        if (stagedData.owner.sketchBase64) {
             sketchContainer.innerHTML = `<img src="${stagedData.owner.sketchBase64}" alt="নকশার ছবি" class="ownership-doc-image">`;
        }
    }
}

// --- ৩. ডাইনামিক প্রিভিউ HTML জেনারেটর ---
function generatePreviewHTML(data) {
    
    const isSale = data.category === 'বিক্রয়';
    const isBuiltProperty = data.type !== 'জমি' && data.type !== 'প্লট';
    
    let html = `
        <div class="preview-header">
            <h2>${data.title}</h2>
            <p class="meta-info">পোস্টকারী: <strong>${data.listerType}</strong> | ${data.category} > ${data.type}</p>
        </div>
        
        <div class="preview-section image-gallery-section">
            <h3 class="section-title">🖼️ প্রপার্টির ছবি</h3>
            <div id="gallery-container" class="image-gallery">
                </div>
        </div>
        
        <div class="preview-section details-section">
            <h3 class="section-title">📝 বিস্তারিত বিবরণ</h3>
            <p class="description-text">${data.description}</p>
        </div>
        
        <div class="preview-section property-info-section">
            <h3 class="section-title">🏠 প্রপার্টির তথ্য</h3>
            <div class="info-grid">
                ${data.areaSqft ? `<div class="info-item"><strong>পরিমাণ (স্কয়ার ফিট):</strong> ${data.areaSqft}</div>` : ''}
                ${data.landArea ? `<div class="info-item"><strong>পরিমাণ:</strong> ${data.landArea} ${data.landAreaUnit}</div>` : ''}
                ${data.houseArea ? `<div class="info-item"><strong>জমির পরিমাণ:</strong> ${data.houseArea} ${data.houseAreaUnit}</div>` : ''}
                ${data.commercialArea ? `<div class="info-item"><strong>পরিমাণ:</strong> ${data.commercialArea} ${data.commercialAreaUnit}</div>` : ''}

                ${isBuiltProperty && data.propertyAge !== undefined ? `<div class="info-item"><strong>বয়স:</strong> ${data.propertyAge} বছর</div>` : ''}
                ${isBuiltProperty && data.facing ? `<div class="info-item"><strong>দিক:</strong> ${data.facing}</div>` : ''}
                
                ${data.rooms ? `<div class="info-item"><strong>রুম সংখ্যা:</strong> ${data.rooms}টি</div>` : ''}
                ${data.bathrooms ? `<div class="info-item"><strong>বাথরুম:</strong> ${data.bathrooms}টি</div>` : ''}
                ${data.kitchen ? `<div class="info-item"><strong>কিচেন:</strong> ${data.kitchen}টি</div>` : ''}
                
                ${data.floors ? `<div class="info-item"><strong>তলা সংখ্যা:</strong> ${data.floors}টি</div>` : ''}
                ${data.floorNo ? `<div class="info-item"><strong>ফ্লোর নং:</strong> ${data.floorNo}</div>` : ''}
                
                ${data.roadWidth ? `<div class="info-item"><strong>চলাচলের রাস্তা:</strong> ${data.roadWidth} ফিট</div>` : ''}
                
                ${data.landType ? `<div class="info-item"><strong>জমির ধরন:</strong> ${data.landType}</div>` : ''}
                ${data.plotNo ? `<div class="info-item"><strong>প্লট নং:</strong> ${data.plotNo}</div>` : ''}
                ${data.shopCount ? `<div class="info-item"><strong>দোকান সংখ্যা:</strong> ${data.shopCount}টি</div>` : ''}
            </div>
        </div>

        <div class="preview-section price-rent-section">
            <h3 class="section-title">💰 ${isSale ? 'দাম' : 'ভাড়া ও শর্তাবলী'}</h3>
            <div class="info-grid">
                ${isSale ? 
                    `<div class="info-item info-highlight"><strong>বিক্রয় মূল্য:</strong> ${data.price} টাকা (${data.priceUnit} প্রতি)</div>` :
                    `
                    <div class="info-item info-highlight"><strong>মাসিক ভাড়া:</strong> ${data.monthlyRent} টাকা</div>
                    <div class="info-item"><strong>এডভান্স / জামানত:</strong> ${data.advance} টাকা</div>
                    <div class="info-item"><strong>ওঠার তারিখ:</strong> ${data.moveInDate}</div>
                    ${data.rentType ? `<div class="info-item"><strong>ভাড়ার ধরন:</strong> ${data.rentType}</div>` : ''}
                    `
                }
            </div>
        </div>

        ${isBuiltProperty ? `
            <div class="preview-section utilities-section">
                <h3 class="section-title">🛠️ অন্যান্য সুবিধা</h3>
                ${data.utilities && data.utilities.length > 0 ? 
                    `<div class="utility-list">${data.utilities.map(u => `<span class="utility-tag">${u}</span>`).join('')}</div>` :
                    `<p>কোনো সুবিধা উল্লেখ করা হয়নি।</p>`
                }
            </div>
        ` : ''}
        
        <div class="preview-section address-section">
            <h3 class="section-title">📍 ঠিকানা ও অবস্থান</h3>
            <div class="info-grid">
                <div class="info-item"><strong>বিভাগ:</strong> ${data.location.division}</div>
                <div class="info-item"><strong>জেলা:</strong> ${data.location.district}</div>
                <div class="info-item"><strong>এলাকার ধরন:</strong> ${data.location.areaType}</div>
                ${data.location.upazila ? `<div class="info-item"><strong>উপজেলা:</strong> ${data.location.upazila}</div>` : ''}
                ${data.location.union ? `<div class="info-item"><strong>ইউনিয়ন:</strong> ${data.location.union}</div>` : ''}
                ${data.location.cityCorporation ? `<div class="info-item"><strong>সিটি কর্পোরেশন:</strong> ${data.location.cityCorporation}</div>` : ''}
                <div class="info-item"><strong>থানা:</strong> ${data.location.thana}</div>
                ${data.location.wardNo ? `<div class="info-item"><strong>ওয়ার্ড নং:</strong> ${data.location.wardNo}</div>` : ''}
                <div class="info-item"><strong>গ্রাম:</strong> ${data.location.village}</div>
                <div class="info-item"><strong>রোড:</strong> ${data.location.road}</div>
                ${data.googleMap ? `<div class="info-item google-map-link"><strong>গুগল ম্যাপ:</strong> <a href="${data.googleMap}" target="_blank">ম্যাপে দেখুন</a></div>` : ''}
            </div>
        </div>

        ${isSale ? `
            <div class="preview-section ownership-section">
                <h3 class="section-title">📜 মালিকানা বিবরণ (বিক্রয়ের জন্য)</h3>
                <div class="info-grid">
                    <div class="info-item"><strong>দাতার নাম:</strong> ${data.owner.donorName}</div>
                    <div class="info-item"><strong>মৌজা:</strong> ${data.owner.mouja}</div>
                    <div class="info-item"><strong>দাগ নং:</strong> ${data.owner.dagNo} (${data.owner.dagNoType})</div>
                </div>
                <h4 class="section-title" style="border:none; margin-top: 20px;">ডকুমেন্টের প্রিভিউ</h4>
                <div class="doc-preview-area">
                    <div>
                        <p>সর্বশেষ খতিয়ানের ছবি:</p>
                        <div id="khotian-image-preview"></div>
                    </div>
                    <div>
                        <p>প্রপার্টি স্কেস/নকশা:</p>
                        <div id="sketch-image-preview"></div>
                    </div>
                </div>
            </div>
        ` : ''}
        
        <div class="preview-section contact-section">
            <h3 class="section-title">📞 যোগাযোগের তথ্য</h3>
            <div class="info-grid">
                <div class="info-item"><strong>প্রাথমিক ফোন:</strong> ${data.phoneNumber}</div>
                ${data.secondaryPhone ? `<div class="info-item"><strong>অতিরিক্ত ফোন:</strong> ${data.secondaryPhone}</div>` : ''}
            </div>
        </div>
    `;
    
    return html;
}

// --- ৪. চূড়ান্ত সাবমিশন (Firebase Storage এবং Firestore-এ আপলোড) ---
async function handleFinalSubmission(stagedData, stagedMetadata) {
    const postButton = document.getElementById('post-button');
    postButton.disabled = true;
    postButton.textContent = 'পোস্ট হচ্ছে... অপেক্ষা করুন';
    
    if (!auth.currentUser) {
        alert("পোস্ট করার আগে আপনাকে আবার লগইন করতে হবে।");
        postButton.disabled = false;
        postButton.textContent = 'পোস্ট করুন';
        window.location.href = 'auth.html';
        return;
    }
    
    try {
        const imageURLs = [];
        // Firestore-এ একটি নতুন ডকুমেন্ট রেফারেন্স তৈরি করে আইডি নেওয়া
        const propertyRef = db.collection('properties').doc();
        const propertyID = propertyRef.id;
        const uploadPath = `property_images/${propertyID}`;

        // ১. মূল ছবিগুলো আপলোড
        for (let i = 0; i < stagedData.base64Images.length; i++) {
            const base64 = stagedData.base64Images[i];
            const meta = stagedMetadata.images[i];
            const blob = dataURLtoBlob(base64);
            const fileName = `main_${i}_${meta.name}`;
            const storageRef = storage.ref(`${uploadPath}/${fileName}`);
            
            await storageRef.put(blob, { contentType: meta.type });
            const url = await storageRef.getDownloadURL();
            imageURLs.push(url);
        }
        
        // ২. মালিকানার ডকুমেন্ট আপলোড (যদি থাকে)
        if (stagedData.category === 'বিক্রয়') {
            const owner = stagedData.owner;
            const khotianMeta = stagedMetadata.khotian;
            const sketchMeta = stagedMetadata.sketch;
            
            if (owner.khotianBase64 && khotianMeta) {
                const khotianBlob = dataURLtoBlob(owner.khotianBase64);
                const storageRef = storage.ref(`${uploadPath}/khotian_${khotianMeta.name}`);
                await storageRef.put(khotianBlob, { contentType: khotianMeta.type });
                owner.khotianUrl = await storageRef.getDownloadURL();
            }
             if (owner.sketchBase64 && sketchMeta) {
                const sketchBlob = dataURLtoBlob(owner.sketchBase64);
                const storageRef = storage.ref(`${uploadPath}/sketch_${sketchMeta.name}`);
                await storageRef.put(sketchBlob, { contentType: sketchMeta.type });
                owner.sketchUrl = await storageRef.getDownloadURL();
            }
            
            // Base64 ডেটা মুছে ফেলা
            delete owner.khotianBase64;
            delete owner.sketchBase64;
        }

        // ৩. Firestore-এর জন্য চূড়ান্ত ডেটা প্রস্তুত করা
        const finalData = { ...stagedData };
        delete finalData.base64Images; // Base64 ডেটা সরিয়ে দেওয়া
        finalData.imageURLs = imageURLs; // Firebase Storage URL যুক্ত করা
        finalData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        finalData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // ৪. Firestore-এ সেভ করা
        await propertyRef.set(finalData);
        
        // ৫. সাফল্য এবং ক্লিনআপ
        sessionStorage.removeItem('stagedPropertyData');
        sessionStorage.removeItem('stagedImageMetadata');
        
        alert("আপনার প্রপার্টি সফলভাবে পোস্ট করা হয়েছে! এটি প্রকাশের আগে অনুমোদনের জন্য অপেক্ষা করবে।");
        // সফলতার পর অন্য কোনো পেজে রিডাইরেক্ট করুন (যেমন: প্রোফাইল বা নতুন প্রপার্টির ডিটেইল পেজ)
        window.location.href = `profile.html`; 
        
    } catch (error) {
        console.error("পোস্ট করার সময় সমস্যা হয়েছে:", error);
        alert("পোস্ট করতে ব্যর্থতা: " + error.message);
        postButton.disabled = false;
        postButton.textContent = 'আবার চেষ্টা করুন';
    }
}


// DOM লোড হওয়ার পর প্রিভিউ রেন্ডার শুরু করা
document.addEventListener('DOMContentLoaded', function() {
    loadAndRenderPreview();
    
    // Auth state handler (আপনার post.js থেকে নেওয়া লজিক)
    // প্রোফাইল আইকনে ক্লিক ইভেন্ট যোগ করা হয়েছে, যদিও অন্য ফাংশনও প্রয়োজন হতে পারে।
    const profileImageWrapper = document.getElementById('profileImageWrapper'); 
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }
    
    // headerPostButton, notificationButton, login-link-sidebar ইত্যাদি ইভেন্ট হ্যান্ডেলিং প্রয়োজন হলে এখানে যোগ করুন।
});
