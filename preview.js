// preview.js

// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Utility Function: Base64 Data URL to Blob (post.js থেকে নেওয়া)
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

// Utility Function: Data/Category থেকে বাংলা লেবেল তৈরি
function getCategoryLabel(category) {
    switch (category) {
        case 'বিক্রয়':
            return 'বিক্রয়ের জন্য';
        case 'ভাড়া':
            return 'ভাড়ার জন্য';
        case 'প্লট':
            return 'প্লট';
        default:
            return 'অন্যান্য';
    }
}

// Utility Function: Bangla number formatter
function formatBanglaNumber(number) {
    if (number === undefined || number === null || isNaN(number)) return 'N/A';
    // Simplified formatting for display
    return number.toLocaleString('bn-BD');
}

// --- ১. প্রিভিউ HTML তৈরি করার ফাংশন ---
function generatePreviewHTML(data) {
    // ডেটা অনুপস্থিত বা ক্যাটাগরি সেট না থাকলে সেফ রিটার্ন
    if (!data || !data.category) {
        return '<p class="error-message">প্রিভিউ ডেটা অসম্পূর্ণ। দয়া করে পোস্ট পেজে ফিরে যান।</p>';
    }

    const priceLabel = data.category === 'ভাড়া' ? 'ভাড়া' : 'মূল্য';
    const areaUnit = data.areaUnit || 'বর্গফুট';
    const bathroomCount = data.bathrooms ? `${data.bathrooms}টি` : 'N/A';
    const bedroomCount = data.bedrooms ? `${data.bedrooms}টি` : 'N/A';
    const floorCount = data.floorNumber ? `${data.floorNumber} তলা` : 'N/A';
    const facingText = data.facing ? data.facing : 'N/A';
    
    // মূল্য নির্ধারণ
    let priceText = 'আলোচনা সাপেক্ষে';
    if (data.price) {
        priceText = `${formatBanglaNumber(data.price)} টাকা`;
        if (data.category === 'ভাড়া') {
            priceText += ` (${data.rentUnit || 'মাসিক'})`;
        }
    }

    // অবস্থান ডেটা সেফলি অ্যাক্সেস করা
    const address = `${data.area ? data.area + ', ' : ''}${data.district || 'N/A'}`;


    let html = `
        <div class="preview-header">
            <h1 class="property-title">${data.title || 'শিরোনাম নেই'}</h1>
            <p class="property-location">${address}</p>
            <p class="property-price"><strong>${priceLabel}:</strong> ${priceText}</p>
        </div>
        
        <div class="property-details">
            <h2>মূল তথ্য</h2>
            <div class="info-grid">
                <div class="info-item"><strong>ধরণ:</strong> ${getCategoryLabel(data.category)}</div>
                <div class="info-item"><strong>ক্ষেত্রের আকার:</strong> ${formatBanglaNumber(data.area)} ${areaUnit}</div>
                ${data.category === 'বিক্রয়' || data.category === 'ভাড়া' ? `
                    <div class="info-item"><strong>বেডরুম:</strong> ${bedroomCount}</div>
                    <div class="info-item"><strong>বাথরুম:</strong> ${bathroomCount}</div>
                ` : ''}
                ${data.category !== 'প্লট' ? `<div class="info-item"><strong>ফ্লোর:</strong> ${floorCount}</div>` : ''}
                <div class="info-item"><strong>মুখী:</strong> ${facingText}</div>
                <div class="info-item"><strong>আইডি:</strong> ${data.propertyID || 'স্বয়ংক্রিয়ভাবে তৈরি হবে'}</div>
                <div class="info-item"><strong>পোস্টের তারিখ:</strong> আজ (প্রিভিউ)</div>
            </div>
        </div>
        
        <div class="property-description">
            <h2>সম্পত্তি সম্পর্কে</h2>
            <p>${data.description ? data.description.replace(/\n/g, '<br>') : 'কোনো বিবরণ দেওয়া হয়নি।'}</p>
        </div>
        
        ${data.features && data.features.length > 0 ? `
            <div class="property-features">
                <h2>অন্যান্য সুবিধা</h2>
                <ul>
                    ${data.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
        ` : ''}

        ${data.owner && (data.category === 'বিক্রয়' || data.category === 'প্লট') ? `
            <div class="property-owner-info">
                <h2>মালিকানার তথ্য</h2>
                <div class="info-grid">
                    <div class="info-item"><strong>দাতার নাম:</strong> ${data.owner.donorName || 'N/A'}</div>
                    <div class="info-item"><strong>ফোন:</strong> ${data.owner.donorPhone || 'N/A'}</div>
                    <div class="info-item"><strong>ঠিকানা:</strong> ${data.owner.donorAddress || 'N/A'}</div>
                </div>
                <p class="note">মালিকানার নথিগুলি শুধুমাত্র যাচাইয়ের জন্য ব্যবহৃত হবে এবং ওয়েবসাইটে প্রকাশ করা হবে না।</p>
                <div id="ownership-docs-container" class="image-gallery">
                    </div>
            </div>
        ` : ''}
    `;

    return html;
}


// --- ২. ছবি রেন্ডার করার ফাংশন ---
function renderImages(stagedData) {
    const mainImageGallery = document.getElementById('main-image-gallery');
    const khotianContainer = document.getElementById('khotian-doc-container');
    const sketchContainer = document.getElementById('sketch-doc-container');

    // প্রধান ছবি
    if (mainImageGallery && stagedData.base64Images && stagedData.base64Images.length > 0) {
        mainImageGallery.innerHTML = stagedData.base64Images.map((base64, index) => `
            <img src="${base64}" alt="Property Image ${index + 1}" class="preview-image" loading="lazy">
        `).join('');
    } else if (mainImageGallery) {
        mainImageGallery.innerHTML = '<p class="no-image-placeholder">কোনো ছবি আপলোড করা হয়নি।</p>';
    }

    // মালিকানার ডকুমেন্ট (যদি থাকে)
    const ownershipDocsContainer = document.getElementById('ownership-docs-container');
    if (ownershipDocsContainer && stagedData.category && (stagedData.category === 'বিক্রয়' || stagedData.category === 'প্লট') && stagedData.owner) {
        let docHtml = '';
        
        if (stagedData.owner.khotianBase64) {
            docHtml += `<div class="doc-wrapper"><img src="${stagedData.owner.khotianBase64}" alt="খতিয়ানের ছবি" class="ownership-doc-image"><p>খতিয়ান</p></div>`;
        }
        if (stagedData.owner.sketchBase64) {
            docHtml += `<div class="doc-wrapper"><img src="${stagedData.owner.sketchBase64}" alt="নকশার ছবি" class="ownership-doc-image"><p>নকশা</p></div>`;
        }
        
        if (docHtml) {
            ownershipDocsContainer.innerHTML = docHtml;
            ownershipDocsContainer.style.display = 'flex';
        } else {
            ownershipDocsContainer.style.display = 'none';
        }
    }
}


// --- ৩. ডেটা লোড এবং রেন্ডার করার প্রধান ফাংশন ---\n
function loadAndRenderPreview() {
    const dataString = sessionStorage.getItem('stagedPropertyData');
    const metadataString = sessionStorage.getItem('stagedImageMetadata');
    const previewContainer = document.getElementById('preview-container');
    const actionButtons = document.getElementById('action-buttons');
    const pageTitle = document.getElementById('page-title');
    const errorMessageBlock = document.getElementById('preview-error-message'); // Ensure you have this ID in your HTML

    // ডেটা না পেলে পোস্ট পেজে ফেরত
    if (!dataString) {
        if (errorMessageBlock) {
             errorMessageBlock.innerHTML = 'কোনো প্রিভিউ ডেটা পাওয়া যায়নি। আপনাকে পোস্ট পেজে নিয়ে যাওয়া হচ্ছে...';
             errorMessageBlock.style.display = 'block';
        }
        console.error("No staged data found. Redirecting.");
        setTimeout(() => { window.location.href = 'post.html'; }, 3000);
        return;
    }

    try {
        // **সম্ভাব্য ত্রুটি পয়েন্ট ১: JSON parsing ফেইল**
        const stagedData = JSON.parse(dataString);
        // যদি মেটাডেটা স্ট্রিং থাকে তবে পার্স করুন
        const stagedMetadata = metadataString ? JSON.parse(metadataString) : null;
        
        // পেজের শিরোনাম সেট করা
        if (pageTitle) {
            pageTitle.textContent = stagedData.title || 'নতুন প্রপার্টি প্রিভিউ';
        }

        // **সম্ভাব্য ত্রুটি পয়েন্ট ২: রেন্ডারিং এর সময় TypeError**
        // ১. প্রিভিউ HTML রেন্ডার করা
        if (previewContainer) {
            previewContainer.innerHTML = generatePreviewHTML(stagedData); 
        }
        
        // ২. ছবি রেন্ডার করা (ছবিগুলি রেন্ডার করার সময় ডেটা অ্যাক্সেস করতে ব্যর্থ হলে এখানে ক্র্যাশ হতে পারে)
        renderImages(stagedData);
        
        // সফল হলে এরর বার্তাটি লুকিয়ে দিন
        if (errorMessageBlock) errorMessageBlock.style.display = 'none';
        if (actionButtons) actionButtons.style.display = 'flex'; // বা 'block'

    } catch (error) {
        // **ত্রুটি ক্যাচ হলে:**
        console.error('Error loading or rendering staged data:', error);
        
        if (errorMessageBlock) {
            errorMessageBlock.innerHTML = `<h3>প্রিভিউ লোড করার সময় সমস্যা হয়েছে।</h3><p>সমস্যার বিবরণ (ডেভেলপারের জন্য): <strong>${error.name}: ${error.message}</strong></p><p>দয়া করে 'Edit' বাটনে ক্লিক করে ডেটা চেক করুন বা আবার চেষ্টা করুন।</p>`;
            errorMessageBlock.style.display = 'block';
        } else {
            // যদি HTML এ এরর ব্লক না থাকে, সরাসরি কন্টেইনারে দেখান
            if (previewContainer) {
                 previewContainer.innerHTML = '<div class="error-box">প্রিভিউ লোড করার সময় সমস্যা হয়েছে।</div>';
            }
        }
        
        // ডেটা ক্লিনআপ করা
        sessionStorage.removeItem('stagedPropertyData');
        sessionStorage.removeItem('stagedImageMetadata');

        if (actionButtons) actionButtons.style.display = 'none';
    }
}

// ... (postToFirebase, editPost functions)

// --- ৪. পোস্ট করার ফাংশন (কোনো পরিবর্তন নেই) ---
async function postToFirebase(event) {
    event.preventDefault();
    const postButton = document.getElementById('post-button');
    // ... (rest of the postToFirebase function as it was)
}

// --- ৫. এডিট বাটনের কার্যকারিতা (কোনো পরিবর্তন নেই) ---
function editPost() {
    window.location.href = 'post.html';
}


// DOM লোড হওয়ার পর প্রিভিউ রেন্ডার শুরু করা
document.addEventListener('DOMContentLoaded', function() {
    // নিশ্চিত করুন যে HTML এ post-button এবং edit-button আছে
    const postButton = document.getElementById('post-button');
    const editButton = document.getElementById('edit-button');

    if (postButton) {
        postButton.addEventListener('click', postToFirebase);
    }
    if (editButton) {
        editButton.addEventListener('click', editPost);
    }

    loadAndRenderPreview();
    
    // Auth state handler (আপনার post.js থেকে নেওয়া লজিক)
    // ... (rest of the DOMContentLoaded content for auth and header)
    
});
