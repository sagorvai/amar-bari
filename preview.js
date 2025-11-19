// preview.js

// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const previewContent = document.getElementById('preview-content');
    const editButton = document.getElementById('edit-button');
    const confirmButton = document.getElementById('confirm-post-button');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');

    // হেডার আইকন এবং বাটন এলিমেন্টগুলো
    const profileImage = document.getElementById('profileImage');
    const profileImageWrapper = document.getElementById('profileImageWrapper');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon'); 
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    // --- ইউটিলিটি ফাংশন ---

    // Utility Function: Base64 to Blob (for final Firebase upload)
    const dataURLtoBlob = (dataurl) => {
        const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    };

    // Utility Function: ডেটা চেক এবং ফরম্যাট (যদি ডেটা না থাকে তবে "প্রদান করা হয়নি" দেখাবে)
    const checkAndFormat = (value, unit = '') => {
        if (!value || (typeof value === 'string' && value.trim() === '') || value === 'undefined') {
            return '<span class="not-available">তথ্য প্রদান করা হয়নি</span>';
        }
        return `${value} ${unit}`.trim();
    };

    // --- প্রিভিউ রেন্ডারিং লজিক ---

    function renderPreview(data, imageMetadata, imageData) {
        // 'প্রিভিউ করার মতো কোনো ডেটা পাওয়া যায়নি' বার্তাটি সরিয়ে দেওয়া
        previewContent.innerHTML = ''; 
        
        // --- ১. ছবি প্রিভিউ সেকশন ---
        const mainImagePreviews = imageData.mainImages.map((base64Url, index) => {
            return `<div class="image-preview-item"><img src="${base64Url}" alt="Main Image ${index + 1}"><span>${imageMetadata.mainImagesMetadata[index]?.name || ''}</span></div>`;
        }).join('');

        const khotianImagePreviews = imageData.khotianImages.map((base64Url, index) => {
            return `<div class="image-preview-item"><img src="${base64Url}" alt="Khotian Image ${index + 1}"><span>${imageMetadata.khotianImagesMetadata[index]?.name || ''}</span></div>`;
        }).join('');

        const sketchImagePreviews = imageData.sketchImages.map((base64Url, index) => {
            return `<div class="image-preview-item"><img src="${base64Url}" alt="Sketch Image ${index + 1}"><span>${imageMetadata.sketchImagesMetadata[index]?.name || ''}</span></div>`;
        }).join('');


        const imageSection = `
            <div class="preview-section image-gallery">
                <h3>🖼️ ছবিসমূহ</h3>
                
                <h4>প্রধান ছবি (${imageData.mainImages.length}টি)</h4>
                <div class="image-previews-container">${mainImagePreviews || '<p class="not-available">কোনো ছবি প্রদান করা হয়নি।</p>'}</div>
                
                ${imageData.khotianImages.length > 0 ? `
                <h4>খতিয়ান বা কাগজপত্র (${imageData.khotianImages.length}টি)</h4>
                <div class="image-previews-container">${khotianImagePreviews}</div>` : ''}
                
                ${imageData.sketchImages.length > 0 ? `
                <h4>ম্যাপ বা স্কেচ (${imageData.sketchImages.length}টি)</h4>
                <div class="image-previews-container">${sketchImagePreviews}</div>` : ''}
                
            </div>
            <hr>
        `;

        // --- ২. প্রাথমিক ও ঠিকানা বিবরণ ---
        const locationDetails = `
            <div class="preview-section">
                <h3>📍 অবস্থান ও প্রাথমিক বিবরণ</h3>
                <div class="preview-item"><span class="preview-label">পোস্টের ক্যাটাগরি:</span><span class="preview-value">${checkAndFormat(data.category)}</span></div>
                <div class="preview-item"><span class="preview-label">প্রপার্টির ধরন:</span><span class="preview-value">${checkAndFormat(data.type)}</span></div>
                <div class="preview-item"><span class="preview-label">বিভাগ:</span><span class="preview-value">${checkAndFormat(data.division)}</span></div>
                <div class="preview-item"><span class="preview-label">জেলা:</span><span class="preview-value">${checkAndFormat(data.district)}</span></div>
                <div class="preview-item"><span class="preview-label">উপজেলা/সিটি কর্পোরেশন:</span><span class="preview-value">${checkAndFormat(data.upazilaOrCity)}</span></div>
                <div class="preview-item full-width"><span class="preview-label">বিস্তারিত ঠিকানা:</span><span class="preview-value">${checkAndFormat(data.subAddress)}</span></div>
            </div>
            <hr>
        `;

        // --- ৩. মূল্য ও পরিমাণ বিবরণ (Key Mismatch Fix) ---
        
        const isForSale = data.category === 'বিক্রয়';
        let priceLabel, priceValue, priceUnit, advanceValue, areaLabel, areaValue, areaUnit;

        if (isForSale) {
            priceLabel = 'বিক্রয় মূল্য:';
            priceValue = data.price;
            priceUnit = data.priceUnit || 'টাকা'; 
            advanceValue = undefined;
        } else {
            priceLabel = 'মাসিক ভাড়া:';
            priceValue = data.monthlyRent; 
            priceUnit = 'টাকা';
            advanceValue = data.advance; 
        }

        // এরিয়া/পরিমাণের জন্য ডাইনামিক হ্যান্ডলিং (post.js এ সেভ করা Key অনুযায়ী)
        if (data.type === 'জমি' || data.type === 'প্লট') {
            areaLabel = 'জমির পরিমাণ:';
            areaValue = data.landArea;
            areaUnit = data.landAreaUnit;
        } else if (data.type === 'ফ্লাট' || data.type === 'বাড়ি') {
            areaLabel = 'আয়তন (স্কয়ার ফিট):';
            areaValue = data.areaSqft;
            areaUnit = 'স্কয়ার ফিট';
        } else if (data.type === 'দোকান' || data.type === 'অফিস') {
            areaLabel = 'বাণিজ্যিক আয়তন:';
            areaValue = data.commercialArea;
            areaUnit = data.commercialAreaUnit || 'স্কয়ার ফিট';
        }

        const priceAreaDetails = `
            <div class="preview-section">
                <h3>টাকা ও পরিমাণ</h3>
                <div class="preview-item"><span class="preview-label">${priceLabel}</span><span class="preview-value">${checkAndFormat(priceValue, priceUnit)}</span></div>
                ${advanceValue !== undefined && checkAndFormat(advanceValue) !== '<span class="not-available">তথ্য প্রদান করা হয়নি</span>' ? `<div class="preview-item"><span class="preview-label">ডিপোজিট/অগ্রিম:</span><span class="preview-value">${checkAndFormat(advanceValue, 'টাকা')}</span></div>` : ''}
                
                ${areaValue !== undefined && checkAndFormat(areaValue) !== '<span class="not-available">তথ্য প্রদান করা হয়নি</span>' ? `<div class="preview-item"><span class="preview-label">${areaLabel}</span><span class="preview-value">${checkAndFormat(areaValue, areaUnit || '')}</span></div>` : ''}
                
                ${data.roadWidth ? `<div class="preview-item"><span class="preview-label">রাস্তার প্রস্থ:</span><span class="preview-value">${checkAndFormat(data.roadWidth, 'ফিট')}</span></div>` : ''}
            </div>
            <hr>
        `;
        
        // --- ৪. প্রপার্টি বিবরণ (রুম, বয়স, ফ্লোর, ইত্যাদি) ---
        
        let propertyDetails = '';
        if (data.type !== 'জমি' && data.type !== 'প্লট') {
             propertyDetails = `
                 <div class="preview-section">
                    <h3>প্রপার্টি বিবরণ</h3>
                    ${data.propertyAge ? `<div class="preview-item"><span class="preview-label">প্রপার্টির বয়স:</span><span class="preview-value">${checkAndFormat(data.propertyAge, 'বছর')}</span></div>` : ''}
                    ${data.facing ? `<div class="preview-item"><span class="preview-label">প্রপার্টির দিক:</span><span class="preview-value">${checkAndFormat(data.facing)}</span></div>` : ''}
                    
                    ${data.rooms ? `<div class="preview-item"><span class="preview-label">রুম সংখ্যা:</span><span class="preview-value">${checkAndFormat(data.rooms)}</span></div>` : ''}
                    ${data.bathrooms ? `<div class="preview-item"><span class="preview-label">বাথরুম সংখ্যা:</span><span class="preview-value">${checkAndFormat(data.bathrooms)}</span></div>` : ''}
                    ${data.kitchen ? `<div class="preview-item"><span class="preview-label">কিচেন সংখ্যা:</span><span class="preview-value">${checkAndFormat(data.kitchen)}</span></div>` : ''}
                    ${data.balconies ? `<div class="preview-item"><span class="preview-label">বারান্দা সংখ্যা:</span><span class="preview-value">${checkAndFormat(data.balconies)}</span></div>` : ''}
                    
                    ${data.floors ? `<div class="preview-item"><span class="preview-label">মোট তলা সংখ্যা:</span><span class="preview-value">${checkAndFormat(data.floors)}</span></div>` : ''}
                    ${data.floorNo ? `<div class="preview-item"><span class="preview-label">ফ্লোর নং (আপনার ফ্লাট):</span><span class="preview-value">${checkAndFormat(data.floorNo)}</span></div>` : ''}
                    
                    ${data.parking ? `<div class="preview-item"><span class="preview-label">পার্কিং সুবিধা:</span><span class="preview-value">${checkAndFormat(data.parking)}</span></div>` : ''}
                    ${data.landType ? `<div class="preview-item"><span class="preview-label">জমির ধরন:</span><span class="preview-value">${checkAndFormat(data.landType)}</span></div>` : ''}
                    
                    ${data.utilities ? `<div class="preview-item full-width"><span class="preview-label">অন্যান্য সুবিধা (ইউটিলিটি):</span><span class="preview-value">${checkAndFormat(data.utilities)}</span></div>` : ''}
                 </div>
                 <hr>
             `;
        }

        // --- ৫. মালিকের বিবরণ ---
        const ownerDetails = `
            <div class="preview-section">
                <h3>👤 মালিকের বিবরণ</h3>
                <div class="preview-item"><span class="preview-label">নাম:</span><span class="preview-value">${checkAndFormat(data.ownerName)}</span></div>
                <div class="preview-item"><span class="preview-label">ফোন নম্বর:</span><span class="preview-value">${checkAndFormat(data.ownerPhone)}</span></div>
                <div class="preview-item"><span class="preview-label">ইমেইল:</span><span class="preview-value">${checkAndFormat(data.ownerEmail)}</span></div>
            </div>
        `;


        // সব সেকশন একসাথে যুক্ত করা
        previewContent.innerHTML = `
            ${imageSection}
            <h2 class="preview-title">${checkAndFormat(data.title)}</h2>
            <p class="preview-description">${checkAndFormat(data.description)}</p>
            <hr>
            ${locationDetails}
            ${priceAreaDetails}
            ${propertyDetails}
            ${ownerDetails}
        `;

        // লগইন করা থাকলে কনফার্ম বাটন এনাবল করা
        auth.onAuthStateChanged((user) => {
            if (user) {
                confirmButton.disabled = false;
            } else {
                confirmButton.disabled = true;
            }
        });
    }


    // --- ডেটা লোডিং ---
    function loadPreviewData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');

        if (!stagedDataString || !stagedMetadataString) {
            // ডেটা না পেলে ডিফল্ট বার্তা দেখাবে
            confirmButton.disabled = true;
            editButton.disabled = false;
            return;
        }

        try {
            const data = JSON.parse(stagedDataString);
            const metadata = JSON.parse(stagedMetadataString);
            
            // Base64 ডেটা পুনরুদ্ধার
            const imageData = {
                mainImages: JSON.parse(sessionStorage.getItem('stagedMainImages') || '[]'),
                khotianImages: JSON.parse(sessionStorage.getItem('stagedKhotianImages') || '[]'),
                sketchImages: JSON.parse(sessionStorage.getItem('stagedSketchImages') || '[]'),
            };

            // রেন্ডারিং শুরু
            renderPreview(data, metadata, imageData);
            
        } catch (error) {
            console.error("Error parsing staged data:", error);
            // ত্রুটি হলে ডেটা না পাওয়ার বার্তা
            previewContent.innerHTML = '<p class="not-found">সংরক্ষিত ডেটা পুনরুদ্ধার করা যায়নি। অনুগ্রহ করে <a href="post.html">পোস্ট ফর্মে</a> ফিরে যান।</p>';
            confirmButton.disabled = true;
        }
    }


    // --- ইভেন্ট লিসেনার্স ---

    editButton.addEventListener('click', () => {
        // এডিটের জন্য post.html এ নিয়ে যাওয়া হবে। post.js স্বয়ংক্রিয়ভাবে ডেটা প্রি-ফিল করবে।
        window.location.href = 'post.html';
    });

    confirmButton.addEventListener('click', postProperty);


    // --- চূড়ান্ত পোস্ট লজিক (Firebase এ আপলোড) ---

    async function postProperty() {
        confirmButton.disabled = true;
        confirmButton.textContent = 'পোস্ট করা হচ্ছে...';
        
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');

        if (!auth.currentUser || !stagedDataString || !stagedMetadataString) {
            alert("আপলোড ব্যর্থ: লগইন করা নেই বা ডেটা অনুপস্থিত।");
            confirmButton.disabled = false;
            confirmButton.textContent = 'নিশ্চিত করে পোস্ট করুন';
            return;
        }

        try {
            const propertyData = JSON.parse(stagedDataString);
            const imageMetadata = JSON.parse(stagedMetadataString);
            
            const imageData = {
                mainImages: JSON.parse(sessionStorage.getItem('stagedMainImages') || '[]'),
                khotianImages: JSON.parse(sessionStorage.getItem('stagedKhotianImages') || '[]'),
                sketchImages: JSON.parse(sessionStorage.getItem('stagedSketchImages') || '[]'),
            };

            const userUid = auth.currentUser.uid;
            const propertyId = db.collection('properties').doc().id; 
            const uploadPromises = [];
            const uploadedImageUrls = {};

            // --- ১. ছবিগুলি Firebase Storage এ আপলোড করা ---
            
            for (const [key, base64List] of Object.entries(imageData)) {
                uploadedImageUrls[key] = [];
                const metadataList = imageMetadata[key.replace('Images', 'ImagesMetadata')] || [];

                for (let i = 0; i < base64List.length; i++) {
                    const base64 = base64List[i];
                    const meta = metadataList[i];
                    
                    if (!base64 || !meta) continue;

                    const blob = dataURLtoBlob(base64);
                    const fileExtension = meta.name.split('.').pop();
                    const storageRef = storage.ref(`property_images/${userUid}/${propertyId}/${key}/${i}.${fileExtension}`);
                    
                    const uploadTask = storageRef.put(blob);
                    
                    uploadPromises.push(
                        uploadTask.then(snapshot => snapshot.ref.getDownloadURL())
                            .then(downloadURL => {
                                uploadedImageUrls[key].push(downloadURL);
                            })
                    );
                }
            }

            await Promise.all(uploadPromises);
            
            // --- ২. Firestore এ ডেটা সেভ করা ---
            
            const finalData = {
                ...propertyData,
                ownerId: userUid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'pending', // প্রাথমিক স্ট্যাটাস 
                
                // Base64 ডেটার পরিবর্তে আপলোড করা ছবির URL যোগ করা
                mainImageUrls: uploadedImageUrls.mainImages || [],
                khotianImageUrls: uploadedImageUrls.khotianImages || [],
                sketchImageUrls: uploadedImageUrls.sketchImages || [],

                // সেশন স্টোরেজের Base64 ডেটা সরিয়ে দেওয়া
                stagedMainImages: firebase.firestore.FieldValue.delete(),
                stagedKhotianImages: firebase.firestore.FieldValue.delete(),
                stagedSketchImages: firebase.firestore.FieldValue.delete(),
            };
            
            // আপলোড করার আগে বড় ছবি মেটাডেটা সরিয়ে দেওয়া
            delete finalData.mainImagesMetadata;
            delete finalData.khotianImagesMetadata;
            delete finalData.sketchImagesMetadata;


            await db.collection('properties').doc(propertyId).set(finalData);

            // --- ৩. পরিষ্করণ ও সমাপ্তি ---
            sessionStorage.removeItem('stagedPropertyData');
            sessionStorage.removeItem('stagedImageMetadata');
            sessionStorage.removeItem('stagedMainImages');
            sessionStorage.removeItem('stagedKhotianImages');
            sessionStorage.removeItem('stagedSketchImages');

            alert("🎉 অভিনন্দন! আপনার প্রপার্টি সফলভাবে পোস্ট করা হয়েছে। অ্যাডমিন অনুমোদনের অপেক্ষায় রয়েছে।");
            window.location.href = 'dashboard.html'; // ড্যাশবোর্ডে রিডাইরেক্ট

        } catch (error) {
            console.error("Firebase পোস্ট করার সময় ত্রুটি:", error);
            alert(`পোস্ট করা যায়নি। ত্রুটি: ${error.message}`);
            confirmButton.disabled = false;
            confirmButton.textContent = 'নিশ্চিত করে পোস্ট করুন';
        }
    }


    // --- ইনিশিয়ালাইজেশন ---
    loadPreviewData();
    
    // হেডার এবং সাইডবার লজিক (preview.html থেকে নিশ্চিত করা হলো)
    // এই অংশটি post.js থেকে কপি করা হয়েছে যাতে হেডার এবং মেনু সঠিকভাবে কাজ করে।
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    if (notificationButton) {
        notificationButton.addEventListener('click', () => {
             window.location.href = 'notifications.html'; 
        });
    }
    if (headerPostButton) {
        headerPostButton.addEventListener('click', () => {
            window.location.href = 'post.html'; 
        });
    }
    if (messageButton) {
        messageButton.addEventListener('click', () => {
             window.location.href = 'messages.html';
        });
    }
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }
    
});
