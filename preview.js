// নিশ্চিত করুন যে post.js এ সংজ্ঞায়িত 'db', 'auth', 'storage' ইত্যাদি ভ্যারিয়েবল এখানে উপলব্ধ।

document.addEventListener('DOMContentLoaded', function() {
    const propertyData = JSON.parse(sessionStorage.getItem('stagedPropertyData'));
    
    const previewContent = document.getElementById('previewContent');
    const errorMessage = document.getElementById('errorMessage');
    
    const imageGallery = document.getElementById('imageGallery');
    const ownershipImagesSection = document.getElementById('ownershipImagesSection');
    const ownershipImagesGallery = document.getElementById('ownershipImagesGallery');
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
    
    previewContent.style.display = 'block';

    // --- B. রেন্ডারিং ফাংশনসমূহ ---

    // ছবি গ্যালারি রেন্ডারিং (URL ব্যবহার করে)
    function renderImageGallery() {
        // ১. প্রধান ছবি
        if (propertyData.imageUrls && propertyData.imageUrls.length > 0) {
            propertyData.imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.alt = 'প্রপার্টির ছবি';
                imageGallery.appendChild(img);
            });
        } else {
            imageGallery.innerHTML = '<p style="color: #666;">কোনো প্রধান ছবি আপলোড করা হয়নি।</p>';
        }

        // ২. মালিকানার ছবি (খতিয়ান, স্কেচ)
        const owner = propertyData.owner || {};
        const isSale = propertyData.type === 'বিক্রয়';

        if (isSale && (owner.khotianUrl || owner.sketchUrl)) {
            ownershipImagesSection.style.display = 'block';
            let hasOwnershipImage = false;
            
            if (owner.khotianUrl) {
                const img = document.createElement('img');
                img.src = owner.khotianUrl;
                img.alt = 'খতিয়ানের ছবি';
                ownershipImagesGallery.appendChild(img);
                hasOwnershipImage = true;
            }
            if (owner.sketchUrl) {
                const img = document.createElement('img');
                img.src = owner.sketchUrl;
                img.alt = 'স্কেচ ছবি';
                ownershipImagesGallery.appendChild(img);
                hasOwnershipImage = true;
            }
             if (!hasOwnershipImage) {
                 ownershipImagesGallery.innerHTML = '<p style="color: #666;">কোনো ডকুমেন্ট আপলোড করা হয়নি।</p>';
             }
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
        const price = propertyData.price || propertyData.monthlyRent;
        const priceLabel = propertyData.type === 'ভাড়া' ? 'মাসিক ভাড়া (৳):' : 'দাম (৳):';
        
        if (price) {
            html += `<p class="preview-item"><strong>${priceLabel}</strong> ${price.toLocaleString('bn-BD')}</p>`;
        } else {
            html += `<p class="preview-item"><strong>${priceLabel}</strong> N/A</p>`;
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

    // ডাইনামিক ফিল্ড রেন্ডারিং
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
        // টেক্সট ডেটা loadStagedData() দিয়ে প্রি-ফিল হয়ে যাবে
        window.location.href = 'post.html'; 
    });

    // নিশ্চিতকরণ বাটন: ডেটা সার্ভারে (Firestore) আপলোড করুন
    confirmButton.addEventListener('click', async () => {
        confirmButton.disabled = true;
        confirmButton.textContent = 'পোস্ট নিশ্চিত হচ্ছে... ✅';
        
        try {
            // ১. চূড়ান্ত ডেটা অবজেক্ট তৈরি করা
            const finalData = {
                ...propertyData,
                isStaged: firebase.firestore.FieldValue.delete(), // স্টেজ করা ডেটা ফ্ল্যাগ মুছে ফেলা
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                isApproved: false, // অনুমোদনের জন্য পেন্ডিং রাখা
            };
            
            // ২. Firestore-এ সেভ করা
            await db.collection('properties').add(finalData);
            
            // ৩. সেশন স্টোরেজ ক্লিন করা
            sessionStorage.removeItem('stagedPropertyData');
            
            // ৪. সফলতার বার্তা ও রিডাইরেক্ট
            alert('আপনার পোস্টটি সফলভাবে জমা দেওয়া হয়েছে! এটি অনুমোদনের অপেক্ষায় রয়েছে।');
            window.location.href = 'profile.html'; 

        } catch (error) {
            console.error('পোস্ট আপলোডে সমস্যা:', error);
            alert('পোস্ট আপলোডে একটি গুরুতর ত্রুটি হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
            confirmButton.disabled = false;
            confirmButton.textContent = 'পোস্ট নিশ্চিত করুন ও প্রকাশ করুন ✅';
        }
    });
});
