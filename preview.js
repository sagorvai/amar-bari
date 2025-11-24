// preview.js - Updated to ensure all dynamic fields are mirrored exactly

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


// --- ১. ডাইনামিক প্রিভিউ HTML জেনারেটর (চূড়ান্ত সংশোধন) ---
function generatePreviewHTML(data) {
    
    const NA = 'N/A';
    
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

    // ✅ নতুন: এরিয়া/সাইজ ডেটা বাধ্যতামূলকভাবে লোড করা
    const areaSqft = data.areaSqft || NA;
    const landArea = data.landArea ? `${data.landArea} ${data.landAreaUnit || ''}` : NA;
    const houseArea = data.houseArea ? `${data.houseArea} ${data.houseAreaUnit || ''}` : NA;
    const commercialArea = data.commercialArea ? `${data.commercialArea} ${data.commercialAreaUnit || ''}` : NA;
    
    // অবস্থান ডেটা বাধ্যতামূলকভাবে লোড করা (পূর্বের ফিক্স)
    const division = data.location?.division || NA;
    const district = data.location?.district || NA;
    const areaType = data.location?.areaType || NA;
    const upazila = data.location?.upazila || NA;
    const thana = data.location?.thana || NA;
    const cityCorporation = data.location?.cityCorporation || NA;
    const union = data.location?.union || NA;
    const wardNo = data.location?.wardNo || data.location?.ward || NA; 
    const village = data.location?.village || NA;
    const road = data.location?.road || NA;
    const googleMapLink = data.googleMap || '#';
    const googleMapText = data.googleMap ? 'Google ম্যাপে দেখুন' : 'লিঙ্ক নেই';


    let html = `
        <div class="preview-header-section stylish-card">
            <h2 class="preview-title">${data.title || 'শিরোনাম নেই'}</h2>
            <p class="preview-meta-info">পোস্টকারী: <strong class="highlight-text">${data.listerType || NA}</strong> | ${data.category || NA} > ${data.type || NA}</p>
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
                <div class="info-item"><strong>ফ্ল্যাটের সাইজ (স্ক. ফিট):</strong> <span class="info-value">${areaSqft}</span></div>
                <div class="info-item"><strong>জমি (Land Area):</strong> <span class="info-value">${landArea}</span></div>
                <div class="info-item"><strong>হাউস এরিয়া (Area):</strong> <span class="info-value">${houseArea}</span></div>
                <div class="info-item"><strong>কমার্শিয়াল এরিয়া (Area):</strong> <span class="info-value">${commercialArea}</span></div>

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
                    <div class="info-item"><strong>দামের ধরন:</strong> <span class="info-value">${data.priceUnit || NA}</span></div>
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
                <div class="info-item"><strong>বিভাগ:</strong> <span class="info-value">${division}</span></div>
                <div class="info-item"><strong>জেলা:</strong> <span class="info-value">${district}</span></div>
                <div class="info-item"><strong>এলাকার ধরন:</strong> <span class="info-value">${areaType}</span></div>
                
                <div class="info-item"><strong>উপজেলা:</strong> <span class="info-value">${upazila}</span></div>
                <div class="info-item"><strong>থানা:</strong> <span class="info-value">${thana}</span></div> 
                
                <div class="info-item"><strong>সিটি কর্পোরেশন:</strong> <span class="info-value">${cityCorporation}</span></div>
                <div class="info-item"><strong>ইউনিয়ন:</strong> <span class="info-value">${union}</span></div>
                <div class="info-item"><strong>ওয়ার্ড নং:</strong> <span class="info-value">${wardNo}</span></div> 
                
                <div class="info-item"><strong>গ্রাম:</strong> <span class="info-value">${village}</span></div>
                <div class="info-item"><strong>রাস্তা/রোড:</strong> <span class="info-value">${road}</span></div>

                <div class="info-item full-width-item google-map-link-container">
                    <strong>Google ম্যাপ:</strong> <a href="${googleMapLink}" target="_blank" class="map-link">${googleMapText}</a>
                </div>
            </div>
        </div>

        ${isSale && data.owner ? `
            <div class="preview-section stylish-card ownership-section">
                <h3 class="section-title"><i class="fas fa-file-alt icon-styling"></i> মালিকানা তথ্য</h3>
                <div class="info-grid">
                    <div class="info-item"><strong>দাতার নাম:</strong> <span class="info-value">${data.owner.donorName || NA}</span></div>
                    <div class="info-item"><strong>দাগ নং (${data.owner.dagNoType || NA}):</strong> <span class="info-value">${data.owner.dagNo || NA}</span></div>
                    <div class="info-item"><strong>মৌজা:</strong> <span class="info-value">${data.owner.mouja || NA}</span></div>
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
                <div class="info-item"><strong>প্রাথমিক ফোন:</strong> <span class="info-value">${data.phoneNumber || NA}</span></div>
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

    if (!dataString) {
        alert("কোনো প্রিভিউ ডেটা পাওয়া যায়নি। আপনাকে পোস্ট পেজে নিয়ে যাওয়া হচ্ছে।");
        window.location.href = 'post.html';
        return;
    }

    try {
        const stagedData = JSON.parse(dataString);
        const stagedMetadata = metadataString ? JSON.parse(metadataString) : {}; 
        
        if (pageTitle) {
            pageTitle.textContent = `${stagedData.title || 'শিরোনাম নেই'} - পোস্ট প্রিভিউ`;
        }
        
        if (previewContainer) {
            previewContainer.innerHTML = generatePreviewHTML(stagedData);
        }
        
        renderImages(stagedData);

        const editButton = document.getElementById('edit-button');
        const postButton = document.getElementById('post-button');
        
        if (editButton) {
            editButton.addEventListener('click', () => {
                window.location.href = 'post.html';
            });
        }
        if (postButton) {
            postButton.addEventListener('click', () => handleFinalSubmission(stagedData, stagedMetadata));
        }
        
        if (actionButtons) actionButtons.style.display = 'flex';

    } catch (error) {
        console.error('Error loading or rendering staged data:', error);
        
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
        const propertyRef = db.collection('properties').doc();
        const postId = propertyRef.id;
        const userId = auth.currentUser.uid;
        const uploadPath = `properties/${userId}/${postId}/`;
        
        const imagesToUpload = [
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
        
        const finalData = { ...stagedData };
        delete finalData.base64Images;
        if (finalData.owner) {
            delete finalData.owner.khotianBase64;
            delete finalData.owner.sketchBase64;
        }
        finalData.imageURLs = imageURLs;
        finalData.postId = postId;

        finalData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        finalData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        await propertyRef.set(finalData);
        
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
    
    const editButton = document.getElementById('edit-button');
    const postButton = document.getElementById('post-button');

    if (editButton) {
        editButton.addEventListener('click', () => {
            window.location.href = 'post.html';
        });
    }

    loadAndRenderPreview();
    
    const profileImageWrapper = document.getElementById('profileImageWrapper'); 
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }
});
