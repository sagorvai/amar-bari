// preview.js - Updated for Firebase URL Preview and Direct Publishing

// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// --- REMOVED: dataURLtoBlob utility function ---

// --- ১. ডাইনামিক প্রিভিউ HTML জেনারেটর (শুধুমাত্র ইনপুট করা ডেটা দেখাবে) ---
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

    // সমস্ত সম্ভাব্য প্রপার্টি ইনফো আইটেম জেনারেট করা (শুধুমাত্র যদি ডেটা থাকে)
    const propertyInfoItems = `
        ${data.areaSqft ? `<div class="info-item"><strong>ফ্ল্যাটের সাইজ (স্ক. ফিট):</strong> <span class="info-value">${data.areaSqft}</span></div>` : ''}
        ${data.landArea ? `<div class="info-item"><strong>জমির পরিমাণ:</strong> <span class="info-value">${data.landArea} ${data.landAreaUnit || ''}</span></div>` : ''}
        ${data.houseArea ? `<div class="info-item"><strong>জমির পরিমাণ (হাউস):</strong> <span class="info-value">${data.houseArea} ${data.houseAreaUnit || ''}</span></div>` : ''}
        ${data.commercialArea ? `<div class="info-item"><strong>কমার্শিয়াল এরিয়া:</strong> <span class="info-value">${data.commercialArea} ${data.commercialAreaUnit || ''}</span></div>` : ''}

        ${isBuiltProperty && data.propertyAge ? `<div class="info-item"><strong>বয়স:</strong> <span class="info-value">${data.propertyAge} বছর</span></div>` : ''}
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
            ${data.priceUnit ? `<div class="info-item"><strong>দামের ধরন:</strong> <span class="info-value">${data.priceUnit}</span></div>` : ''}
            <div class="info-item price-item"><strong>দাম:</strong> <span class="info-value price-highlight">${priceText}</span></div>
        ` : `
            ${data.rentUnit ? `<div class="info-item"><strong>ভাড়ার ধরন:</strong> <span class="info-value">${data.rentUnit}</span></div>` : ''}
            <div class="info-item price-item"><strong>ভাড়া:</strong> <span class="info-value price-highlight">${priceText}</span></div>
        `}
        
        ${data.advance ? `<div class="info-item"><strong>অগ্রিম (Advance):</strong> <span class="info-value">${data.advance} টাকা</span></div>` : ''}
        ${data.rentType ? `<div class="info-item"><strong>ভাড়ার জন্য:</strong> <span class="info-value">${data.rentType}</span></div>` : ''}
        ${data.moveInDate ? `<div class="info-item"><strong>ওঠার তারিখ:</strong> <span class="info-value">${data.moveInDate}</span></div>` : ''}
        ${data.shopCount ? `<div class="info-item"><strong>দোকান সংখ্যা:</strong> <span class="info-value">${data.shopCount}টি</span></div>` : ''}
    `;
    
    // অন্যান্য সুবিধা (Utilities)
    let utilitiesHTML = '';
    if (isBuiltProperty && data.utilities && data.utilities.length > 0) {
        utilitiesHTML = `
            <div class="preview-section stylish-card features-section">
                <h3 class="section-title"><i class="fas fa-check-circle icon-styling"></i> অন্যান্য সুবিধা</h3>
                <div class="info-grid utility-grid">
                    ${data.utilities.map(u => `<div class="info-item utility-item"><span class="info-value">${u}</span></div>`).join('')}
                </div>
            </div>
        `;
    }

    // সমস্ত সম্ভাব্য অবস্থান আইটেম জেনারেট করা (শুধুমাত্র যদি ডেটা থাকে)
    const locationInfoItems = `
        ${data.location?.division ? `<div class="info-item"><strong>বিভাগ:</strong> <span class="info-value">${data.location.division}</span></div>` : ''}
        ${data.location?.district ? `<div class="info-item"><strong>জেলা:</strong> <span class="info-value">${data.location.district}</span></div>` : ''}
        ${data.location?.areaType ? `<div class="info-item"><strong>এলাকার ধরন:</strong> <span class="info-value">${data.location.areaType}</span></div>` : ''}
        
        ${data.location?.upazila ? `<div class="info-item"><strong>উপজেলা:</strong> <span class="info-value">${data.location.upazila}</span></div>` : ''}
        ${data.location?.thana ? `<div class="info-item"><strong>থানা:</strong> <span class="info-value">${data.location.thana}</span></div>` : ''} 
        
        ${data.location?.cityCorporation ? `<div class="info-item"><strong>সিটি কর্পোরেশন:</strong> <span class="info-value">${data.location.cityCorporation}</span></div>` : ''}
        ${data.location?.union ? `<div class="info-item"><strong>ইউনিয়ন:</strong> <span class="info-value">${data.location.union}</span></div>` : ''}
        
        ${data.location?.wardNo || data.location?.ward ? `<div class="info-item"><strong>ওয়ার্ড নং:</strong> <span class="info-value">${data.location.wardNo || data.location.ward}</span></div>` : ''} 
        
        ${data.location?.village ? `<div class="info-item"><strong>গ্রাম:</strong> <span class="info-value">${data.location.village}</span></div>` : ''}
        ${data.location?.road ? `<div class="info-item"><strong>রাস্তা/রোড:</strong> <span class="info-value">${data.location.road}</span></div>` : ''}

        ${data.googleMap ? `
            <div class="info-item full-width-item google-map-link-container">
                <strong>Google ম্যাপ:</strong> <a href="${data.googleMap}" target="_blank" class="map-link">Google ম্যাপে দেখুন</a>
            </div>
        ` : ''}
    `;

    // মালিকানা ডকুমেন্ট (শুধুমাত্র বিক্রয়ের জন্য)
    let ownershipHTML = '';
    if (isSale && data.owner) {
        ownershipHTML = `
            <div class="preview-section stylish-card ownership-document-section">
                <h3 class="section-title"><i class="fas fa-file-alt icon-styling"></i> মালিকানা ও ডকুমেন্ট বিবরণ</h3>
                <div class="info-grid">
                    <div class="info-item"><strong>দাতার নাম:</strong> <span class="info-value">${data.owner.donorName || 'N/A'}</span></div>
                    <div class="info-item"><strong>দাগ নং (ধরন):</strong> <span class="info-value">${data.owner.dagNoType || 'N/A'}</span></div>
                    <div class="info-item"><strong>দাগ নং:</strong> <span class="info-value">${data.owner.dagNo || 'N/A'}</span></div>
                    <div class="info-item"><strong>মৌজা:</strong> <span class="info-value">${data.owner.mouja || 'N/A'}</span></div>
                </div>
                
                <div class="document-previews">
                    <h4>ডকুমেন্ট ছবি (প্রিভিউ)</h4>
                    <div class="doc-preview-container">
                        <div class="doc-image-wrapper">
                            <h5>খতিয়ান</h5>
                            <div id="khotian-image-preview">
                                <p class="placeholder-text">ছবি লোড হচ্ছে...</p>
                            </div>
                        </div>
                        <div class="doc-image-wrapper">
                            <h5>প্রপার্টি স্কেচ</h5>
                            <div id="sketch-image-preview">
                                <p class="placeholder-text">ছবি লোড হচ্ছে...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }


    // মূল HTML স্ট্রাকচার
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
        
        ${data.description ? `
            <div class="preview-section stylish-card details-section">
                <h3 class="section-title"><i class="fas fa-info-circle icon-styling"></i> বিস্তারিত বর্ণনা</h3>
                <p class="description-text">${data.description}</p>
            </div>
        ` : ''}
        
        <div class="preview-section stylish-card info-section">
            <h3 class="section-title"><i class="fas fa-list icon-styling"></i> প্রপার্টির তথ্য</h3>
            <div class="info-grid">
                ${propertyInfoItems}
            </div>
        </div>

        ${utilitiesHTML} 
        
        <div class="preview-section stylish-card location-section">
            <h3 class="section-title"><i class="fas fa-map-marker-alt icon-styling"></i> অবস্থান</h3>
            <div class="info-grid">
                ${locationInfoItems}
            </div>
        </div>

        ${ownershipHTML}

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

// --- ২. ছবি রেন্ডারিং (Firebase URL ব্যবহার করে) ---
function renderImages(stagedMetadata) {
    const galleryContainer = document.getElementById('gallery-container');
    const khotianContainer = document.getElementById('khotian-image-preview');
    const sketchContainer = document.getElementById('sketch-image-preview');

    const mainImages = stagedMetadata.images || [];

    // মূল ছবি (Main Images)
    if (mainImages.length > 0) {
        galleryContainer.innerHTML = mainImages.map((meta) => {
             // Base64 এর বদলে meta.url ব্যবহার করা হচ্ছে
            return `<img src="${meta.url}" alt="${meta.fileName || 'Property Image'}" class="preview-gallery-image">`;
        }).join('');
    } else if (galleryContainer) {
        galleryContainer.innerHTML = '<p class="placeholder-text">কোনো ছবি আপলোড করা হয়নি।</p>';
    }

    // মালিকানার ডকুমেন্ট (যদি থাকে)
    if (stagedMetadata.khotian) {
        if (khotianContainer) {
             // Base64 এর বদলে meta.url ব্যবহার করা হচ্ছে
            khotianContainer.innerHTML = `<img src="${stagedMetadata.khotian.url}" alt="${stagedMetadata.khotian.fileName}" class="ownership-doc-image">`;
        }
    } else if (khotianContainer) {
        khotianContainer.innerHTML = '<p class="placeholder-text">খতিয়ানের ছবি আপলোড করা হয়নি।</p>';
    }

    if (stagedMetadata.sketch) {
        if (sketchContainer) {
             // Base64 এর বদলে meta.url ব্যবহার করা হচ্ছে
            sketchContainer.innerHTML = `<img src="${stagedMetadata.sketch.url}" alt="${stagedMetadata.sketch.fileName}" class="ownership-doc-image">`;
        }
    } else if (sketchContainer) {
        sketchContainer.innerHTML = '<p class="placeholder-text">স্কেসের ছবি আপলোড করা হয়নি।</p>';
    }
}


// --- ৩. ডেটা লোড এবং রেন্ডার ---
function loadAndRenderPreview() {
    const previewContainer = document.getElementById('preview-content-container');
    const stagedDataString = sessionStorage.getItem('stagedPropertyData');
    const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');
    
    if (!stagedDataString || !stagedMetadataString) {
        previewContainer.innerHTML = '<div class="stylish-card" style="padding: 20px;"><p style="color: red;">প্রিভিউ ডেটা পাওয়া যায়নি। অনুগ্রহ করে <a href="post.html">পোস্ট পেজে</a> ফিরে যান এবং ডেটা পুনরায় পূরণ করুন।</p></div>';
        const postButton = document.getElementById('post-button');
        if (postButton) postButton.disabled = true;
        return;
    }

    try {
        const stagedData = JSON.parse(stagedDataString);
        const stagedMetadata = JSON.parse(stagedMetadataString);
        
        // রেন্ডারিং
        previewContainer.innerHTML = generatePreviewHTML(stagedData);
        renderImages(stagedMetadata); 
        
        // পোস্ট বাটন কার্যকারিতা যোগ করা
        const postButton = document.getElementById('post-button');
        if (postButton) {
            postButton.addEventListener('click', () => uploadImagesAndPost(stagedData, stagedMetadata, postButton));
        }

    } catch (error) {
         console.error('Error parsing staged data:', error);
         previewContainer.innerHTML = '<div class="stylish-card" style="padding: 20px;"><p style="color: red;">সংরক্ষিত ডেটা লোড করতে সমস্যা হয়েছে।</p></div>';
    }
}


// --- ৪. চূড়ান্ত পোস্ট ফাংশন (সরাসরি লাইভ) ---
// ছবিগুলো post.js-এ ইতিমধ্যেই আপলোড করা হয়েছে। এখানে শুধু ডেটাবেসে পোস্ট করা হবে।
async function uploadImagesAndPost(postData, stagedMetadata, postButton) {
    
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
        const propertyRef = db.collection('properties').doc();
        const postId = propertyRef.id;

        // Main Image URLs
        const mainImageURLs = (stagedMetadata.images || [])
            .map(meta => meta.url)
            .filter(url => url);
        
        // Ownership Document URLs (if applicable)
        const khotianURL = stagedMetadata.khotian ? stagedMetadata.khotian.url : undefined;
        const sketchURL = stagedMetadata.sketch ? stagedMetadata.sketch.url : undefined;


        // চূড়ান্ত ডেটা কাঠামো
        const finalData = {
            ...postData,
            imageURLs: mainImageURLs, // প্রাক-আপলোড করা URL ব্যবহার

            // মালিকানা ডকুমেন্টের URL (বিক্রয়ের জন্য)
            owner: postData.owner ? { 
                ...postData.owner,
                khotianURL: khotianURL,
                sketchURL: sketchURL,
            } : undefined,

            postId: postId,
            
            // --- সরাসরি পাবলিশিং এর জন্য পরিবর্তন ---
            status: 'published', // 'pending' এর বদলে সরাসরি 'published'
            isApproved: true, // অনুমোদিত হিসাবে সেট করুন
            
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        // Firestore-এ সংরক্ষণ
        await propertyRef.set(finalData);
        
        // সেশন স্টোরেজ খালি করা
        sessionStorage.removeItem('stagedPropertyData');
        sessionStorage.removeItem('stagedImageMetadata');
        
        // সফলতার বার্তা ও রিডাইরেক্ট
        alert("আপনার প্রপার্টি সফলভাবে পোস্ট করা হয়েছে এবং এটি এখন লাইভ!");
        window.location.href = `property.html?id=${postId}`; // নতুন তৈরি হওয়া প্রপার্টি পেজে রিডাইরেক্ট

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
