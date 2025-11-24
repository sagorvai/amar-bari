// preview.js - Updated with proper Location fields (Thana, Ward No., Village, Road separated)

// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Utility Function: Base64 Data URL to Blob (post.js থেকে নেওয়া)
const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8arr(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}


// --- ১. ডাইনামিক প্রিভিউ HTML জেনারেটর (ওয়ার্ড নং সহ সংশোধিত) ---
function generatePreviewHTML(data) {
    
    // সেফটি: অনুপস্থিত ডেটা হ্যান্ডেল করা
    const isSale = data.category === 'বিক্রয়';
    const isBuiltProperty = data.type !== 'জমি' && data.type !== 'প্লট';
    
    // মূল্য নির্ধারণ
    let priceText;
    if (isSale) {
        priceText = `${data.price || 'আলোচনা সাপেক্ষে'} টাকা`;
    } else {
        priceText = `${data.monthlyRent || 'আলোচনা সাপেক্ষে'} টাকা`;
        priceText += data.rentUnit ? ` (${data.rentUnit})` : ' (মাসিক)';
    }


    let html = `
        <div class="preview-header-section stylish-card">
            <h2 class="preview-title">${data.title || 'শিরোনাম নেই'}</h2>
            <p class="preview-meta-info">পোস্টকারী: <strong class="highlight-text">${data.listerType || 'N/A'}</strong> | ${data.category || 'N/A'} > ${data.type || 'N/A'}</p>
        </div>
        
        <div class="preview-section stylish-card image-gallery-section">
            <h3 class="section-title"><i class="fas fa-image icon-styling"></i> প্রপার্টির ছবি</h3>
            <div id="gallery-container" class="image-grid-container">
                </div>
        </div>
        
        <div class="preview-section stylish-card details-section">
            <h3 class="section-title"><i class="fas fa-info-circle icon-styling"></i> বিস্তারিত বিবরণ</h3>
            <p class="description-text">${data.description || 'কোনো বিবরণ দেওয়া হয়নি।'}</p>
        </div>
        
        <div class="preview-section stylish-card property-info-section">
            <h3 class="section-title"><i class="fas fa-home icon-styling"></i> প্রপার্টির তথ্য</h3>
            <div class="info-grid">
                ${data.areaSqft ? `<div class="info-item"><strong>পরিমাণ (স্কয়ার ফিট):</strong> <span class="info-value">${data.areaSqft}</span></div>` : ''}
                ${data.landArea ? `<div class="info-item"><strong>পরিমাণ:</strong> <span class="info-value">${data.landArea} ${data.landAreaUnit || ''}</span></div>` : ''}
                ${data.houseArea ? `<div class="info-item"><strong>জমির পরিমাণ:</strong> <span class="info-value">${data.houseArea} ${data.houseAreaUnit || ''}</span></div>` : ''}
                ${data.commercialArea ? `<div class="info-item"><strong>পরিমাণ:</strong> <span class="info-value">${data.commercialArea} ${data.commercialAreaUnit || ''}</span></div>` : ''}

                ${isBuiltProperty && data.propertyAge !== undefined ? `<div class="info-item"><strong>বয়স:</strong> <span class="info-value">${data.propertyAge} বছর</span></div>` : ''}
                ${isBuiltProperty && data.facing ? `<div class="info-item"><strong>দিক:</strong> <span class="info-value">${data.facing}</span></div>` : ''}
                
                ${data.rooms ? `<div class="info-item"><strong>রুম সংখ্যা:</strong> <span class="info-value">${data.rooms}টি</span></div>` : ''}
                ${data.bathrooms ? `<div class="info-item"><strong>বাথরুম:</strong> <span class="info-value">${data.bathrooms}টি</span></div>` : ''}
                ${data.kitchen ? `<div class="info-item"><strong>কিচেন:</strong> <span class="info-value">${data.kitchen}টি</span></div>` : ''}
                
                ${data.floors ? `<div class="info-item"><strong>তলা সংখ্যা:</strong> <span class="info-value">${data.floors}টি</span></div>` : ''}
                ${data.floorNo ? `<div class="info-item"><strong>ফ্লোর নং:</strong> <span class="info-value">${data.floorNo}</span></div>` : ''}
                
                ${data.roadWidth ? `<div class="info-item"><strong>চলাচলের রাস্তা:</strong> <span class="info-value">${data.roadWidth} ফিট</span></div>` : ''}
                ${data.landType ? `<div class="info-item"><strong>জমির ধরন:</strong> <span class="info-value">${data.landType}</span></div>` : ''}
                ${data.plotNo ? `<div class="info-item"><strong>প্লট নং:</strong> <span class="info-value">${data.plotNo}</span></div>` : ''}
                
                ${isSale ? `
                    <div class="info-item"><strong>দামের ধরন:</strong> <span class="info-value">${data.priceUnit || 'N/A'}</span></div>
                    <div class="info-item price-item"><strong>দাম:</strong> <span class="info-value price-highlight">${priceText}</span></div>
                ` : `
                    <div class="info-item"><strong>ভাড়ার ধরন:</strong> <span class="info-value">${data.rentUnit || 'মাসিক'}</span></div>
                    <div class="info-item price-item"><strong>ভাড়া:</strong> <span class="info-value price-highlight">${priceText}</span></div>
                `}
                
                ${data.advance ? `<div class="info-item"><strong>অগ্রিম (Advance):</strong> <span class="info-value">${data.advance} টাকা</span></div>` : ''}
                ${data.rentType ? `<div class="info-item"><strong>ভাড়ার জন্য:</strong> <span class="info-value">${data.rentType}</span></div>` : ''}
                ${data.moveInDate ? `<div class="info-item"><strong>ওঠার তারিখ:</strong> <span class="info-value">${data.moveInDate}</span></div>` : ''}
                ${data.shopCount ? `<div class="info-item"><strong>দোকান সংখ্যা:</strong> <span class="info-value">${data.shopCount}টি</span></div>` : ''}
            </div>
            
            ${data.utilities && data.utilities.length > 0 ? `
                <div class="info-item full-width-item utility-section">
                    <strong>সুবিধাসমূহ:</strong>
                    <ul class="utility-list">
                        ${data.utilities.map(u => `<li><i class="fas fa-check-circle utility-icon"></i> ${u}</li>`).join('')}
                    </ul>
                </div>
            ` : ''}

        </div>
        
        <div class="preview-section stylish-card location-section">
            <h3 class="section-title"><i class="fas fa-map-marker-alt icon-styling"></i> অবস্থান</h3>
            <div class="info-grid">
                <div class="info-item"><strong>বিভাগ:</strong> <span class="info-value">${data.location?.division || 'N/A'}</span></div>
                <div class="info-item"><strong>জেলা:</strong> <span class="info-value">${data.location?.district || 'N/A'}</span></div>
                ${data.location?.areaType ? `<div class="info-item"><strong>এলাকার ধরন:</strong> <span class="info-value">${data.location.areaType}</span></div>` : ''}
                
                ${data.location?.upazila ? `<div class="info-item"><strong>উপজেলা:</strong> <span class="info-value">${data.location.upazila}</span></div>` : ''}
                ${data.location?.thana ? `<div class="info-item"><strong>থানা:</strong> <span class="info-value">${data.location.thana}</span></div>` : ''} 
                
                ${data.location?.cityCorporation ? `<div class="info-item"><strong>সিটি কর্পোরেশন:</strong> <span class="info-value">${data.location.cityCorporation}</span></div>` : ''}
                ${data.location?.union ? `<div class="info-item"><strong>ইউনিয়ন:</strong> <span class="info-value">${data.location.union}</span></div>` : ''}
                
                ${data.location?.wardNo || data.location?.ward ? `<div class="info-item"><strong>ওয়ার্ড নং:</strong> <span class="info-value">${data.location.wardNo || data.location.ward}</span></div>` : ''} 
                
                ${data.location?.village ? `<div class="info-item"><strong>গ্রাম:</strong> <span class="info-value">${data.location.village}</span></div>` : ''}
                ${data.location?.road ? `<div class="info-item"><strong>রাস্তা/রোড:</strong> <span class="info-value">${data.location.road}</span></div>` : ''}

                <div class="info-item full-width-item google-map-link-container">
                    <strong>Google ম্যাপ:</strong> <a href="${data.googleMap || '#'}" target="_blank" class="map-link">${data.googleMap ? 'Google ম্যাপে দেখুন' : 'লিঙ্ক নেই'}</a>
                </div>
            </div>
        </div>

        ${isSale && data.owner ? `
            <div class="preview-section stylish-card ownership-section">
                <h3 class="section-title"><i class="fas fa-file-alt icon-styling"></i> মালিকানা তথ্য</h3>
                <div class="info-grid">
                    <div class="info-item"><strong>দাতার নাম:</strong> <span class="info-value">${data.owner.donorName || 'N/A'}</span></div>
                    <div class="info-item"><strong>দাগ নং (${data.owner.dagNoType || 'N/A'}):</strong> <span class="info-value">${data.owner.dagNo || 'N/A'}</span></div>
                    <div class="info-item"><strong>মৌজা:</strong> <span class="info-value">${data.owner.mouja || 'N/A'}</span></div>
                </div>
                <div class="doc-preview-area image-grid-container">
                    <div class="doc-item">
                        <p>সর্বশেষ খতিয়ানের ছবি:</p>
                        <div id="khotian-image-preview" class="doc-image-wrapper">
                            ${!data.owner.khotianBase64 ? '<p class="placeholder-text">ছবি আপলোড করা হয়নি।</p>' : ''}
                        </div>
                    </div>
                    <div class="doc-item">
                        <p>প্রপার্টি স্কেস/নকশা:</p>
                        <div id="sketch-image-preview" class="doc-image-wrapper">
                            ${!data.owner.sketchBase64 ? '<p class="placeholder-text">ছবি আপলোড করা হয়নি।</p>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        ` : ''}
        
        <div class="preview-section stylish-card contact-section">
            <h3 class="section-title"><i class="fas fa-phone-alt icon-styling"></i> যোগাযোগের তথ্য</h3>
            <div class="info-grid">
                <div class="info-item"><strong>প্রাথমিক ফোন:</strong> <span class="info-value">${data.phoneNumber || 'N/A'}</span></div>
                ${data.secondaryPhone ? `<div class="info-item"><strong>অতিরিক্ত ফোন:</strong> <span class="info-value">${data.secondaryPhone}</span></div>` : ''}
            </div>
        </div>
    `;

    return html;
}


// --- ২. Base64 ছবিগুলো রেন্ডার করা (কোনো পরিবর্তন নেই) ---
function renderImages(stagedData) {
    const galleryContainer = document.getElementById('gallery-container');
    const khotianContainer = document.getElementById('khotian-image-preview');
    const sketchContainer = document.getElementById('sketch-image-preview');

    // মূল ছবি
    if (stagedData.base64Images && stagedData.base64Images.length > 0) {
        galleryContainer.innerHTML = stagedData.base64Images.map((base64, index) => {
            return `<img src="${base64}" alt="Property Image ${index + 1}" class="preview-gallery-image">`;
        }).join('');
    } else if (galleryContainer) {
        galleryContainer.innerHTML = '<p class="placeholder-text">কোনো ছবি আপলোড করা হয়নি।</p>';
    }

    // মালিকানার ডকুমেন্ট (যদি থাকে)
    if (stagedData.category === 'বিক্রয়' && stagedData.owner) {
        if (khotianContainer && stagedData.owner.khotianBase64) {
             khotianContainer.innerHTML = `<img src="${stagedData.owner.khotianBase64}" alt="খতিয়ানের ছবি" class="ownership-doc-image">`;
        }
        if (sketchContainer && stagedData.owner.sketchBase64) {
             sketchContainer.innerHTML = `<img src="${stagedData.owner.sketchBase64}" alt="নকশার ছবি" class="ownership-doc-image">`;
        }
    }
}


// --- ৩. ডেটা লোড এবং রেন্ডার করার প্রধান ফাংশন (কোনো পরিবর্তন নেই) ---
function loadAndRenderPreview() {
    const dataString = sessionStorage.getItem('stagedPropertyData');
    const metadataString = sessionStorage.getItem('stagedImageMetadata');
    const previewContainer = document.getElementById('preview-container');
    const actionButtons = document.getElementById('action-buttons');
    const pageTitle = document.getElementById('page-title');

    // ✅ সংশোধিত লজিক: শুধুমাত্র প্রধান ডেটা ('stagedPropertyData') যাচাই করুন। 
    if (!dataString) {
        // ডেটা না পেলে পোস্ট পেজে ফেরত
        alert("কোনো প্রিভিউ ডেটা পাওয়া যায়নি। আপনাকে পোস্ট পেজে নিয়ে যাওয়া হচ্ছে।");
        window.location.href = 'post.html';
        return;
    }

    try {
        // **সম্ভাব্য ত্রুটি পয়েন্ট ১: JSON parsing ফেইল**
        const stagedData = JSON.parse(dataString); // এই লাইনটি এখন try...catch দ্বারা সুরক্ষিত
        // ✅ সংশোধিত লজিক: যদি metadataString না থাকে, তাহলে একটি খালি অবজেক্ট ({}) ব্যবহার করুন।
        const stagedMetadata = metadataString ? JSON.parse(metadataString) : {}; 
        
        // টাইটেল আপডেট
        if (pageTitle) {
            pageTitle.textContent = `${stagedData.title || 'শিরোনাম নেই'} - পোস্ট প্রিভিউ`;
        }
        
        // **সম্ভাব্য ত্রুটি পয়েন্ট ২: রেন্ডারিং এর সময় TypeError**
        // প্রিভিউ HTML জেনারেট এবং ডিসপ্লে
        if (previewContainer) {
            previewContainer.innerHTML = generatePreviewHTML(stagedData);
        }
        
        // Base64 ছবিগুলো রেন্ডার করা 
        renderImages(stagedData);

        // অ্যাকশন বাটন সেটআপ
        const editButton = document.getElementById('edit-button');
        const postButton = document.getElementById('post-button');
        
        if (editButton) {
            editButton.addEventListener('click', () => {
                window.location.href = 'post.html'; // এডিট করার জন্য post.html-এ ফেরত
            });
        }
        if (postButton) {
            // চূড়ান্ত পোস্ট ফাংশনটি নিচে আছে
            postButton.addEventListener('click', () => handleFinalSubmission(stagedData, stagedMetadata));
        }
        
        // বাটনগুলো দেখানো
        if (actionButtons) actionButtons.style.display = 'flex';

    } catch (error) {
        // **ত্রুটি ক্যাচ হলে:**
        console.error('Error loading or rendering staged data:', error);
        
        // ব্যবহারকারীকে ডিটেইলড এরর দেখান (যেমনটা আমি প্রথম সমাধানে দিয়েছিলাম)
        const errorMessageHtml = `
            <div class="error-box">
                <h3>প্রিভিউ লোড করার সময় সমস্যা হয়েছে।</h3>
                <p>সমস্যার বিবরণ (ডেভেলপারের জন্য): <strong>${error.name}: ${error.message}</strong></p>
                <p>দয়া করে 'Edit' বাটনে ক্লিক করে ডেটা চেক করুন বা আবার চেষ্টা করুন।</p>
            </div>
        `;

        if (previewContainer) {
             previewContainer.innerHTML = errorMessageHtml;
        }

        // ডেটা মুছে ফেলা (তাও যদি সমস্যা না কমে)
        // sessionStorage.removeItem('stagedPropertyData');
        // sessionStorage.removeItem('stagedImageMetadata');
        
        if (actionButtons) actionButtons.style.display = 'none';
    }
}


// --- ৪. চূড়ান্ত সাবমিশন (Firebase Storage এবং Firestore-এ আপলোড) ---
async function handleFinalSubmission(stagedData, stagedMetadata) {
    const postButton = document.getElementById('post-button');
    if (postButton) {
        postButton.disabled = true;
        postButton.textContent = 'পোস্ট হচ্ছে... অপেক্ষা করুন';
    }

    if (!auth.currentUser) {
        alert("পোস্ট করার আগে আপনাকে আবার লগইন করতে হবে।");
        if (postButton) {
            postButton.disabled = false;
            postButton.textContent = 'পোস্ট করুন';
        }
        window.location.href = 'auth.html';
        return;
    }

    try {
        const imageURLs = [];
        
        // Firestore-এ একটি নতুন ডকুমেন্ট রেফারেন্স তৈরি করা
        const propertyRef = db.collection('properties').doc();
        const postId = propertyRef.id;
        const userId = auth.currentUser.uid;
        const uploadPath = `properties/${userId}/${postId}/`;
        
        // ১. Base64 ছবিগুলো আপলোড করা এবং URL সংগ্রহ করা
        const imagesToUpload = [
            // stagedMetadata যদি {} হয়, তবুও map function কাজ করবে না। base64Images এ মূল ডেটা আছে।
            // stagedMetadata.images সেফলি অ্যাক্সেস করা হয়েছে।
            ...(stagedMetadata.images || []).map(meta => ({ base64: stagedData.base64Images?.find(b => b.includes(meta.name)), meta, type: 'main' })).filter(item => item.base64),
            (stagedMetadata.khotian && stagedData.owner?.khotianBase64) ? { base64: stagedData.owner.khotianBase64, meta: stagedMetadata.khotian, type: 'khotian' } : null,
            (stagedMetadata.sketch && stagedData.owner?.sketchBase64) ? { base64: stagedData.owner.sketchBase64, meta: stagedMetadata.sketch, type: 'sketch' } : null,
        ].filter(item => item && item.base64);

        for (const item of imagesToUpload) {
            const blob = dataURLtoBlob(item.base64);
            const storageRef = storage.ref().child(uploadPath + item.meta.name);
            const snapshot = await storageRef.put(blob);
            const url = await snapshot.ref.getDownloadURL();

            if (item.type === 'main') {
                imageURLs.push(url);
            } else if (item.type === 'khotian' && stagedData.owner) {
                stagedData.owner.khotianURL = url;
            } else if (item.type === 'sketch' && stagedData.owner) {
                stagedData.owner.sketchURL = url;
            }
        }
        
        // ২. চূড়ান্ত ডেটা প্রস্তুত করা (Base64 ডেটা সরিয়ে URL যোগ করা)
        const finalData = { ...stagedData };
        delete finalData.base64Images;
        if (finalData.owner) {
            delete finalData.owner.khotianBase64;
            delete finalData.owner.sketchBase64;
        }
        finalData.imageURLs = imageURLs;
        finalData.postId = postId;

        // ৩. টাইমস্ট্যাম্প যোগ করা
        finalData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        finalData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // ৪. Firestore-এ সেভ করা
        await propertyRef.set(finalData);
        
        // ৫. সাফল্য এবং ক্লিনআপ
        sessionStorage.removeItem('stagedPropertyData');
        sessionStorage.removeItem('stagedImageMetadata');
        
        alert("আপনার প্রপার্টি সফলভাবে পোস্ট করা হয়েছে! এটি প্রকাশের আগে অনুমোদনের জন্য অপেক্ষা করবে।");
        window.location.href = `profile.html`; 
        
    } catch (error) {
        console.error("পোস্ট করার সময় সমস্যা হয়েছে:", error);
        alert("পোস্ট করতে ব্যর্থতা: " + error.message);
        if (postButton) {
            postButton.disabled = false;
            postButton.textContent = 'আবার চেষ্টা করুন';
        }
    }
}


// DOM লোড হওয়ার পর প্রিভিউ রেন্ডার শুরু করা
document.addEventListener('DOMContentLoaded', function() {
    // অ্যাকশন বাটনগুলির ইভেন্ট লিসেনার সেট আপ করা
    const editButton = document.getElementById('edit-button');
    const postButton = document.getElementById('post-button');

    if (editButton) {
        editButton.addEventListener('click', () => {
            window.location.href = 'post.html';
        });
    }

    loadAndRenderPreview();
    
    // Auth state handler (আপনার post.js থেকে নেওয়া লজিক)
    // প্রোফাইল আইকনে ক্লিক ইভেন্ট যোগ করা হয়েছে, যদিও অন্য ফাংশনও প্রয়োজন হতে পারে।
    const profileImageWrapper = document.getElementById('profileImageWrapper'); 
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }
    
    // headerPostButton, notificationButton, login-link-sidebar ইত্যাদি ইভেন্ট হ্যান্ডেলিং প্রয়োজন...
});
