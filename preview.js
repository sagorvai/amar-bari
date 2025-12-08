// preview.js - Updated for strict dynamic rendering based on post.js input

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


// --- ১. ডাইনামিক প্রিভিউ HTML জেনারেটর ---
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

    // সমস্ত সম্ভাব্য প্রপার্টি ইনফো আইটেম জেনারেট করা
    const infoItems = [
        data.category ? `<div class="info-item"><i class="material-icons">sell</i><p>${data.category}</p></div>` : '',
        data.type ? `<div class="info-item"><i class="material-icons">category</i><p>${data.type}</p></div>` : '',
        data.areaSize ? `<div class="info-item"><i class="material-icons">fullscreen</i><p>${data.areaSize} ${data.areaUnit || 'বর্গফুট'}</p></div>` : '',
        
        // নির্মিত প্রপার্টির জন্য নির্দিষ্ট তথ্য
        isBuiltProperty && data.bedrooms ? `<div class="info-item"><i class="material-icons">king_bed</i><p>${data.bedrooms} বেডরুম</p></div>` : '',
        isBuiltProperty && data.bathrooms ? `<div class="info-item"><i class="material-icons">bathtub</i><p>${data.bathrooms} বাথরুম</p></div>` : '',
        isBuiltProperty && data.balconies ? `<div class="info-item"><i class="material-icons">balcony</i><p>${data.balconies} বারান্দা</p></div>` : '',
        isBuiltProperty && data.floorNumber ? `<div class="info-item"><i class="material-icons">layers</i><p>ফ্লোর: ${data.floorNumber}</p></div>` : '',
        
        data.division ? `<div class="info-item"><i class="material-icons">location_city</i><p>${data.division}</p></div>` : '',
        data.district ? `<div class="info-item"><i class="material-icons">apartment</i><p>${data.district}</p></div>` : '',
        data.area ? `<div class="info-item"><i class="material-icons">place</i><p>${data.area}</p></div>` : '',
        data.roadNo ? `<div class="info-item"><i class="material-icons">signpost</i><p>রোড: ${data.roadNo}</p></div>` : '',

    ].filter(item => item !== '').join(''); // খালি আইটেম ফিল্টার করা

    // প্রপার্টি ইমেজের HTML তৈরি (Base64 URL ব্যবহার করে)
    let imagesHTML = '';
    if (data.imagePreviews && data.imagePreviews.length > 0) {
        imagesHTML = data.imagePreviews.map((url, index) => `
            <div class="image-slide ${index === 0 ? 'active' : ''}">
                <img src="${url}" alt="Property Image ${index + 1}">
            </div>
        `).join('');
    } else {
        imagesHTML = '<div class="no-image-placeholder">কোনো ছবি আপলোড করা হয়নি।</div>';
    }

    // ফিচার লিস্ট তৈরি
    const featuresList = data.features ? data.features.map(f => `<li><i class="material-icons">check_circle</i> ${f}</li>`).join('') : '';


    // ম্যাপের জন্য আইফ্রেম URL তৈরি
    const mapEmbedUrl = data.latitude && data.longitude
        ? `https://maps.google.com/maps?q=${data.latitude},${data.longitude}&z=15&output=embed`
        : null;


    return `
        <div class="property-details-header">
            <h1>${data.title || 'শিরোনাম নেই'}</h1>
            <p class="property-location"><i class="material-icons">location_on</i> ${data.fullAddress || 'ঠিকানা দেওয়া হয়নি'}</p>
        </div>
        
        <div class="image-gallery">
            <div class="slideshow-container">
                ${imagesHTML}
            </div>
            ${data.imagePreviews && data.imagePreviews.length > 1 ? `
                <a class="prev-slide" onclick="changeSlide(-1)">❮</a>
                <a class="next-slide" onclick="changeSlide(1)">❯</a>
            ` : ''}
        </div>
        
        <div class="details-section">
            <div class="price-box">
                <i class="material-icons">monetization_on</i>
                <h2>${priceText}</h2>
            </div>
            
            <div class="property-info-grid">
                ${infoItems}
            </div>

            ${data.description ? `
                <h2 class="section-heading">বিস্তারিত বর্ণনা</h2>
                <p class="details-description">${data.description.replace(/\n/g, '<br>')}</p>
            ` : ''}
            
            ${data.features && data.features.length > 0 ? `
                <h2 class="section-heading">বিশেষ ফিচারসমূহ</h2>
                <ul class="features-list">
                    ${featuresList}
                </ul>
            ` : ''}
            
            <div class="contact-section-preview">
                <h2 class="section-heading">যোগাযোগের তথ্য (পোস্টকারীর)</h2>
                <p><i class="material-icons">person</i> <strong>নাম:</strong> ${data.userName || 'অজানা'}</p>
                <p><i class="material-icons">phone</i> <strong>ফোন নম্বর:</strong> <a href="tel:${data.phoneNumber}">${data.phoneNumber || 'প্রদান করা হয়নি'}</a></p>
            </div>
            
            ${mapEmbedUrl ? `
            <div class="map-container">
                <h2 class="section-heading">মানচিত্রে আনুমানিক অবস্থান</h2>
                <iframe 
                    width="100%" 
                    height="400" 
                    frameborder="0" 
                    style="border:0; border-radius: 8px;" 
                    src="${mapEmbedUrl}" 
                    allowfullscreen>
                </iframe>
            </div>
            ` : ''}
        </div>
    `;
}


// --- ২. স্লাইডশো কার্যকারিতা ---
let slideIndex = 1;

window.changeSlide = (n) => {
  showSlides(slideIndex += n);
}

function showSlides(n) {
  let i;
  let slides = document.getElementsByClassName("image-slide");
  if (slides.length === 0) return;

  if (n > slides.length) {slideIndex = 1}
  if (n < 1) {slideIndex = slides.length}
  for (i = 0; i < slides.length; i++) {
    slides[i].classList.remove('active');
  }
  slides[slideIndex-1].classList.add('active');
}

// --- ৩. ডেটা লোড এবং রেন্ডার করা ---
function loadAndRenderPreview() {
    const dataString = sessionStorage.getItem('stagedPropertyData');
    const metadataString = sessionStorage.getItem('stagedImageMetadata');
    const previewContainer = document.getElementById('property-preview-container');

    if (!dataString || !metadataString) {
        previewContainer.innerHTML = '<p class="error-box">পোস্ট করার ডেটা খুঁজে পাওয়া যায়নি। দয়া করে আবার <a href="post.html">পোস্ট পেজে</a> যান।</p>';
        return;
    }

    try {
        const data = JSON.parse(dataString);
        // মেটাডেটা থেকে Base64 ইউআরএলগুলো লোড করা
        const metadata = JSON.parse(metadataString);
        data.imagePreviews = metadata.imagePreviews || []; 

        previewContainer.innerHTML = generatePreviewHTML(data);
        showSlides(slideIndex); // স্লাইডশো শুরু করা

    } catch (e) {
        console.error("ডেটা পার্স করতে ব্যর্থ:", e);
        previewContainer.innerHTML = '<p class="error-box">ডেটা লোড করতে সমস্যা হয়েছে।</p>';
    }
}


// --- ৪. ছবি আপলোড এবং চূড়ান্ত ডেটাবেস পোস্ট ---

// ছবিগুলোকে Base64 থেকে Blob এ রূপান্তর করে Firebase Storage-এ আপলোড করা
async function uploadImagesAndGetURLs(metadata, userId) {
    const uploadPromises = [];
    
    // প্রতিটা ছবির জন্য
    metadata.imagePreviews.forEach((base64Url, index) => {
        const blob = dataURLtoBlob(base64Url);
        // স্টোরেজ পাথ: properties/ইউজার_আইডি/টাইমস্ট্যাম্প_ইনডেক্স
        const storagePath = `properties/${userId}/${Date.now()}_${index}`;
        
        // আপলোড প্রমিজ তৈরি করা
        const uploadTask = storage.ref(storagePath).put(blob)
            .then(snapshot => snapshot.ref.getDownloadURL()); // আপলোডের পর URL নেওয়া
        
        uploadPromises.push(uploadTask);
    });
    
    // সমস্ত আপলোড সম্পন্ন হওয়ার জন্য অপেক্ষা করা এবং URL গুলো সংগ্রহ করা
    const imageURLs = await Promise.all(uploadPromises);
    return imageURLs;
}


window.postProperty = async () => {
    const postButton = document.getElementById('post-button');
    if (postButton) {
        postButton.disabled = true;
        postButton.textContent = 'পোস্ট হচ্ছে...';
    }
    
    const user = auth.currentUser;
    if (!user) {
        alert("পোস্ট করার জন্য আপনাকে লগইন করতে হবে।");
        if (postButton) {
            postButton.disabled = false;
            postButton.textContent = 'পোস্ট করুন';
        }
        window.location.href = 'auth.html';
        return;
    }

    const dataString = sessionStorage.getItem('stagedPropertyData');
    const metadataString = sessionStorage.getItem('stagedImageMetadata');

    if (!dataString || !metadataString) {
        alert("পোস্ট করার ডেটা অনুপস্থিত।");
        if (postButton) {
            postButton.disabled = false;
            postButton.textContent = 'পোস্ট করুন';
        }
        return;
    }

    try {
        const finalData = JSON.parse(dataString);
        const metadata = JSON.parse(metadataString);
        
        // ১. ছবি আপলোড করা এবং URL সংগ্রহ করা
        const imageURLs = await uploadImagesAndGetURLs(metadata, user.uid);
        
        // ২. Firestore ডকুমেন্ট তৈরি
        const propertyRef = db.collection('properties').doc();
        const postId = propertyRef.id;

        // ৩. চূড়ান্ত ডেটাতে ফিল্ডগুলো যুক্ত করা
        finalData.userId = user.uid; // পোস্টকারীর আইডি
        finalData.imageURLs = imageURLs;
        finalData.postId = postId;

        finalData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        finalData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
        
        // ✅ অটো-অনুমোদন যুক্ত করা হলো
        finalData.isApproved = true; 
        
        await propertyRef.set(finalData);
        
        // ৪. সেশন স্টোরেজ ক্লিয়ার করা
        sessionStorage.removeItem('stagedPropertyData');
        sessionStorage.removeItem('stagedImageMetadata');
        
        // ✅ সফলতার বার্তা পরিবর্তন করা হলো
        alert("আপনার প্রপার্টি সফলভাবে পোস্ট করা হয়েছে! এটি এখন প্রকাশিত।"); 
        window.location.href = `profile.html`; 
        
    } catch (error) {
        // ✅ ত্রুটি হ্যান্ডলিং আপডেট করা হলো
        console.error("পোস্ট করার সময় সমস্যা হয়েছে:", error);
        
        // ত্রুটি বার্তা স্পষ্ট করা
        let errorMessage = "পোস্ট করতে ব্যর্থতা।";
        if (error.code && error.code.includes('permission-denied')) {
             errorMessage += " কারণ: Firebase Storage বা Firestore Rules এ অনুমতির সমস্যা।";
        } else if (error.message) {
             errorMessage += " বিস্তারিত: " + error.message;
        }

        alert(errorMessage);

        if (postButton) {
            // ত্রুটি ঘটলে বাটন আবার চালু করা হলো
            postButton.disabled = false;
            postButton.textContent = 'আবার চেষ্টা করুন';
        }
    }
}


// DOM লোড হওয়ার পর প্রিভিউ রেন্ডার শুরু করা
document.addEventListener('DOMContentLoaded', function() {
    
    const editButton = document.getElementById('edit-button');
    const postButton = document.getElementById('post-button');

    // পোস্ট বাটন ক্লিক হ্যান্ডলার
    if (postButton) {
        postButton.addEventListener('click', window.postProperty);
    }

    if (editButton) {
        editButton.addEventListener('click', () => {
            window.location.href = 'post.html';
        });
    }

    loadAndRenderPreview();
    
    // হেডার ও সাইডবার কার্যকারিতা
    const profileImageWrapper = document.getElementById('profileImageWrapper'); 
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }

    // অথেন্টিকেশন স্টেট পরিবর্তন (Auth state change handler)
    const postLinkSidebar = document.getElementById('post-link'); 
    const loginLinkSidebar = document.getElementById('login-link-sidebar'); 
    
    // লগআউট হ্যান্ডেলার ফাংশন
    const handleLogout = async () => {
        try {
            await auth.signOut();
            alert('সফলভাবে লগআউট করা হয়েছে!');
            window.location.href = 'index.html';
        } catch (error) {
            console.error("লগআউট ব্যর্থ হয়েছে:", error);
            alert("লগআউট ব্যর্থ হয়েছে।");
        }
    };
    
    auth.onAuthStateChanged(user => {
        if (user) {
            // ইউজার লগইন থাকলে
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                // লগআউট ইভেন্ট হ্যান্ডেলার সেট করা
                loginLinkSidebar.onclick = handleLogout;
            }
        } else {
            // ইউজার লগইন না থাকলে
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null; // লগইন লিঙ্কে ক্লিক করলে auth.html এ যাবে
            }
        }
    });
});
