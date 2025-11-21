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
        pageTitle.textContent = `${stagedData.title} - প্রিভিউ`;
        
        // --- ২. প্রিভিউ রেন্ডারিং লজিক (এই অংশটি অক্ষত থাকবে) ---
        let html = `
            <h2>${stagedData.title}</h2>
            <div class="property-details">
                <p><strong>স্থান:</strong> ${stagedData.location}</p>
                <p><strong>দাম:</strong> ৳ ${stagedData.price.toLocaleString('bn-BD')}</p>
                <p><strong>বিভাগ:</strong> ${stagedData.category} (${stagedData.transactionType})</p>
                ${stagedData.area ? `<p><strong>ক্ষেত্রফল:</strong> ${stagedData.area} ${stagedData.unit}</p>` : ''}
                ${stagedData.bedrooms ? `<p><strong>বেডরুম:</strong> ${stagedData.bedrooms}</p>` : ''}
                ${stagedData.bathrooms ? `<p><strong>বাথরুম:</strong> ${stagedData.bathrooms}</p>` : ''}
            </div>
            
            <div class="property-description">
                <h3>সম্পূর্ণ বিবরণ</h3>
                <p>${stagedData.description.replace(/\n/g, '<br>')}</p>
            </div>
            
            <div class="property-images">
                <h3>ছবিসমূহ (${stagedMetadata.length}টি)</h3>
                <div class="image-gallery">
        `;

        stagedMetadata.forEach(meta => {
            html += `<img src="${meta.base64Data}" alt="${stagedData.title} - Image" class="preview-image">`;
        });

        html += `
                </div>
            </div>
            
            <div class="property-contact">
                <h3>যোগাযোগের তথ্য</h3>
                <p><strong>নাম:</strong> ${stagedData.contactName}</p>
                <p><strong>ফোন:</strong> ${stagedData.contactPhone}</p>
                <p><strong>ইমেল:</strong> ${stagedData.contactEmail}</p>
            </div>
        `;

        previewContainer.innerHTML = html;
        actionButtons.style.display = 'flex';

    } catch (e) {
        console.error("প্রিভিউ ডেটা পার্স করতে সমস্যা হয়েছে:", e);
        alert("প্রিভিউ ডেটা লোড করা সম্ভব হয়নি। পোস্ট পেজে ফেরত যাওয়া হচ্ছে।");
        window.location.href = 'post.html';
    }
}


// --- ২. Firebase Storage এ ইমেজ আপলোড করার ফাংশন ---
async function uploadImages(propertyId, stagedMetadata) {
    const imageUrls = [];
    const storageRef = storage.ref(`properties/${propertyId}/`);

    for (const [index, meta] of stagedMetadata.entries()) {
        const blob = dataURLtoBlob(meta.base64Data);
        const imageRef = storageRef.child(`image_${index + 1}`);
        
        // আপলোড শুরু
        const uploadTask = imageRef.put(blob);

        // আপলোড সম্পন্ন হওয়ার জন্য অপেক্ষা
        await uploadTask; 

        // ডাউনলোড URL সংগ্রহ
        const downloadURL = await imageRef.getDownloadURL();
        imageUrls.push(downloadURL);
    }
    return imageUrls;
}


// --- ৩. পোস্ট করার প্রধান ফাংশন ---
async function postProperty() {
    const postButton = document.getElementById('post-button');
    postButton.disabled = true;
    postButton.textContent = 'পোস্ট করা হচ্ছে...';
    
    try {
        const dataString = sessionStorage.getItem('stagedPropertyData');
        const metadataString = sessionStorage.getItem('stagedImageMetadata');
        const stagedData = JSON.parse(dataString);
        const stagedMetadata = JSON.parse(metadataString);
        
        const user = auth.currentUser;
        if (!user) {
            alert("পোস্ট করার জন্য আপনাকে অবশ্যই লগইন করতে হবে।");
            window.location.href = 'auth.html';
            return;
        }

        // ১. একটি নতুন ডকুমেন্ট রেফারেন্স তৈরি করা
        const propertyRef = db.collection('properties').doc();
        const propertyId = propertyRef.id;

        // ২. ইমেজ আপলোড
        const imageUrls = await uploadImages(propertyId, stagedMetadata);

        // ৩. চূড়ান্ত ডেটা প্রস্তুত করা
        const finalData = {
            ...stagedData,
            id: propertyId,
            userId: user.uid,
            imageUrls: imageUrls,
            status: 'pending_approval', // অনুমোদনের জন্য অপেক্ষা করছে
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
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
    
    // *** REMOVED: Redundant header logic, now handled by post.js ***
    /*
    const profileImageWrapper = document.getElementById('profileImageWrapper'); 
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }
    */
    
    // পোস্ট বাটন ক্লিক হ্যান্ডেলার
    const postButton = document.getElementById('post-button');
    if (postButton) {
        postButton.addEventListener('click', postProperty);
    }
    
    // সম্পাদন বাটন (post.html-এ ফেরত) onclick="window.location.href='post.html'" দ্বারা HTML-এ হ্যান্ডেল করা হয়েছে
});
