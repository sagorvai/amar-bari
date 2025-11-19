// post.js থেকে: const db, storage, auth, fileToBase64, dataURLtoBlob ইত্যাদি ভ্যারিয়েবল এখানে পাওয়া যাবে।

document.addEventListener('DOMContentLoaded', function() {
    const propertyData = JSON.parse(sessionStorage.getItem('stagedPropertyData'));
    const imageMetadata = JSON.parse(sessionStorage.getItem('stagedImageMetadata'));
    
    const previewContent = document.getElementById('previewContent');
    const errorMessage = document.getElementById('errorMessage');
    
    const imageGallery = document.getElementById('imageGallery');
    const basicInfoDiv = document.getElementById('basicInfo');
    const descriptionDisplay = document.getElementById('descriptionDisplay');
    const locationInfoDiv = document.getElementById('locationInfo');
    const dynamicFieldsDiv = document.getElementById('dynamicFields');
    const editButton = document.getElementById('editButton');
    const confirmButton = document.getElementById('confirmButton');

    // --- A. ডেটা লোডিং ও যাচাই ---
    if (!propertyData) {
        errorMessage.style.display = 'block';
        editButton.style.display = 'none';
        confirmButton.style.display = 'none';
        return; 
    }
    
    // ডেটা লোড হলে প্রিভিউ কন্টেন্ট দেখাও
    previewContent.style.display = 'block';

    // --- B. রেন্ডারিং ফাংশনসমূহ ---

    // ছবি গ্যালারি রেন্ডারিং
    function renderImageGallery() {
        if (propertyData.base64Images && propertyData.base64Images.length > 0) {
            propertyData.base64Images.forEach(base64Str => {
                const img = document.createElement('img');
                img.src = base64Str; // Base64 সরাসরি ইমেজ সোর্স
                img.alt = 'প্রপার্টির ছবি';
                imageGallery.appendChild(img);
            });
        } else {
            imageGallery.innerHTML = '<p style="color: #666;">কোনো ছবি আপলোড করা হয়নি।</p>';
        }
    }
    
    // সাধারণ তথ্য রেন্ডারিং (টাইটেল, মূল্য, ক্যাটাগরি, টাইপ)
    function renderBasicInfo() {
        let html = `
            <p class="preview-item"><strong>শিরোনাম:</strong> ${propertyData.title || 'N/A'}</p>
            <p class="preview-item"><strong>পোস্টের বিভাগ:</strong> ${propertyData.category || 'N/A'}</p>
            <p class="preview-item"><strong>লেনদেনের ধরন:</strong> ${propertyData.type || 'N/A'}</p>
        `;
        
        // মূল্য/ভাড়া ডাইনামিকভাবে যোগ করা
        if (propertyData.type === 'বিক্রয়' || propertyData.type === 'ইজারা') {
            html += `<p class="preview-item"><strong>দাম (৳):</strong> ${propertyData.price ? propertyData.price.toLocaleString('bn-BD') : 'N/A'}</p>`;
        } else if (propertyData.type === 'ভাড়া') {
            html += `<p class="preview-item"><strong>মাসিক ভাড়া (৳):</strong> ${propertyData.monthlyRent ? propertyData.monthlyRent.toLocaleString('bn-BD') : 'N/A'}</p>`;
        }
        
        basicInfoDiv.innerHTML = html;
        descriptionDisplay.textContent = propertyData.description || 'কোনো বিস্তারিত বিবরণ দেওয়া হয়নি।';
    }

    // অবস্থান এবং যোগাযোগ তথ্য রেন্ডারিং
    function renderLocationInfo() {
        locationInfoDiv.innerHTML = `
            <p class="preview-item"><strong>বিভাগ:</strong> ${propertyData.division || 'N/A'}</p>
            <p class="preview-item"><strong>জেলা:</strong> ${propertyData.district || 'N/A'}</p>
            <p class="preview-item"><strong>এলাকা/উপজেলা:</strong> ${propertyData.area || 'N/A'}</p>
            <p class="preview-item"><strong>সম্পূর্ণ ঠিকানা:</strong> ${propertyData.fullAddress || 'N/A'}</p>
            <p class="preview-item"><strong>যোগাযোগ নম্বর:</strong> ${propertyData.phoneNumber || 'N/A'}</p>
            <p class="preview-item"><strong>পোস্টকারীর ধরন:</strong> ${propertyData.listerType || 'N/A'}</p>
        `;
    }

    // ডাইনামিক ফিল্ড রেন্ডারিং (পোস্ট পেজের ইনপুট অনুযায়ী)
    function renderDynamicFields() {
        let html = '';
        const category = propertyData.category;
        
        // বাড়ি/ফ্লাট (Bari/Flat) এর জন্য:
        if (category === 'বাড়ি/ফ্লাট') {
            html += `
                <p class="preview-item"><strong>রুম সংখ্যা:</strong> ${propertyData.rooms || 'N/A'}</p>
                <p class="preview-item"><strong>বাথরুম সংখ্যা:</strong> ${propertyData.bathrooms || 'N/A'}</p>
                <p class="preview-item"><strong>রান্নাঘর সংখ্যা:</strong> ${propertyData.kitchens || 'N/A'}</p>
                <p class="preview-item"><strong>স্কয়ার ফিট:</strong> ${propertyData.areaSqft || 'N/A'} Sqft</p>
                <p class="preview-item"><strong>পার্কিং সুবিধা:</strong> ${propertyData.parking === 'yes' ? 'আছে' : 'নেই'}</p>
            `;
        } 
        // জমি (Jomi) এর জন্য:
        else if (category === 'জমি') {
            html += `
                <p class="preview-item"><strong>জমির পরিমাণ (ডেসিমেল):</strong> ${propertyData.landAreaDecimal || 'N/A'}</p>
                <p class="preview-item"><strong>জমির পরিমাণ (কাঠা):</strong> ${propertyData.landAreaKatha || 'N/A'}</p>
                <p class="preview-item"><strong>রাস্তার প্রস্থ (ফিট):</strong> ${propertyData.roadWidth || 'N/A'} ফুট</p>
                <p class="preview-item"><strong>জমির ধরন:</strong> ${propertyData.landType || 'N/A'}</p>
            `;
        }
        // অন্যান্য সাধারণ ডাইনামিক ফিল্ড (যদি থাকে)
        if (propertyData.utilities && Array.isArray(propertyData.utilities) && propertyData.utilities.length > 0) {
             html += `<p class="preview-item"><strong>অন্যান্য সুবিধা:</strong> ${propertyData.utilities.join(', ')}</p>`;
        } else {
             html += `<p style="color: #666;">কোনো অতিরিক্ত সুবিধা যোগ করা হয়নি।</p>`;
        }

        dynamicFieldsDiv.innerHTML = html;
    }

    // সমস্ত রেন্ডারিং ফাংশন কল করা
    renderImageGallery();
    renderBasicInfo();
    renderLocationInfo();
    renderDynamicFields();

    // --- C. অ্যাকশন বাটন লজিক ---
    
    // এডিট বাটন: পোস্ট ফর্মে ফিরে যান
    editButton.addEventListener('click', () => {
        window.location.href = 'post.html';
    });

    // Firebase Storage-এ Base64 আপলোড করার ফাংশন
    async function uploadBase64Image(base64Str, filePath) {
        const blob = dataURLtoBlob(base64Str); // post.js থেকে dataURLtoBlob ব্যবহার করা হলো
        const storageRef = storage.ref(filePath);
        const snapshot = await storageRef.put(blob);
        return await snapshot.ref.getDownloadURL();
    }
    
    // নিশ্চিতকরণ বাটন: ডেটা সার্ভারে আপলোড করুন
    confirmButton.addEventListener('click', async () => {
        confirmButton.disabled = true;
        confirmButton.textContent = 'পোস্ট আপলোড হচ্ছে... 🚀';
        
        try {
            // ১. ছবি আপলোড করে URL সংগ্রহ করা
            const uploadedImageUrls = [];
            const uploadPromises = propertyData.base64Images.map((base64Str, index) => {
                const imageName = imageMetadata[index].name;
                const timestamp = Date.now();
                const filePath = `properties/${propertyData.uid}/${timestamp}_${imageName}`;
                return uploadBase64Image(base64Str, filePath);
            });
            
            const urls = await Promise.all(uploadPromises);
            uploadedImageUrls.push(...urls);

            // ২. চূড়ান্ত ডেটা অবজেক্ট তৈরি করা
            const finalData = {
                ...propertyData,
                imageUrls: uploadedImageUrls, // নতুন URL অ্যারে যোগ করা
                base64Images: firebase.firestore.FieldValue.delete(), // Base64 ডেটা মুছে ফেলা
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isApproved: false, // প্রথমে অনুমোদনের জন্য পেন্ডিং রাখা
                // আপনি এখানে অন্য কোনো মেটাডেটা (যেমন user UID) যোগ করতে পারেন
            };
            
            // ৩. Firestore-এ সেভ করা
            await db.collection('properties').add(finalData);
            
            // ৪. সেশন স্টোরেজ ক্লিন করা
            sessionStorage.removeItem('stagedPropertyData');
            sessionStorage.removeItem('stagedImageMetadata');
            
            // ৫. সফলতার বার্তা ও রিডাইরেক্ট
            alert('আপনার পোস্টটি সফলভাবে জমা দেওয়া হয়েছে! এটি অনুমোদনের অপেক্ষায় রয়েছে।');
            window.location.href = 'profile.html'; // ড্যাশবোর্ড বা প্রোফাইলে ফেরত পাঠানো হলো

        } catch (error) {
            console.error('পোস্ট আপলোডে সমস্যা:', error);
            alert('পোস্ট আপলোডে একটি গুরুতর ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
            confirmButton.disabled = false;
            confirmButton.textContent = 'পোস্ট নিশ্চিত করুন ও প্রকাশ করুন ✅';
        }
    });
});
