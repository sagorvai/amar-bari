// post.js - UPDATED (ডাটা স্টেজ ও প্রিভিউতে পাঠানোর জন্য ফিক্স করা হলো)

// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Utility Function: File to Base64 (for staging)
const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
});

// Utility Function: Base64 Data URL to Blob (for preview display)
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


document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');

    // --- NEW: Function to load and pre-fill data from session storage for editing ---
    function loadStagedData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');

        if (stagedDataString) {
            const data = JSON.parse(stagedDataString);
            
            // ১. মূল ফিল্ডগুলো পূরণ করা
            document.getElementById('post-category').value = data.category || '';
            document.getElementById('title').value = data.title || '';
            document.getElementById('full-address').value = data.fullAddress || '';
            document.getElementById('description').value = data.description || '';
            document.getElementById('user-name').value = data.userName || '';
            document.getElementById('phone-number').value = data.phoneNumber || '';

            // ২. ক্যাটাগরি পরিবর্তনের মাধ্যমে ডাইনামিক ফিল্ডগুলো লোড করা
            postCategorySelect.dispatchEvent(new Event('change')); // এটি ডাইনামিক ফিল্ড দেখাবে

            // ৩. ডাইনামিক ফিল্ডের ভ্যালুগুলো পূরণ করা (কিছু সময় বিরতির পরে)
            // ক্যাটাগরি পরিবর্তনের পর DOM-এ নতুন এলিমেন্ট তৈরি হতে পারে, তাই setTimeout ব্যবহার করা হলো
            setTimeout(() => {
                const fieldsToPopulate = ['type', 'price', 'monthlyRent', 'rentUnit', 'areaSize', 'areaUnit', 'bedrooms', 'bathrooms', 'balconies', 'floorNumber', 'division', 'district', 'area', 'roadNo', 'latitude', 'longitude'];
                fieldsToPopulate.forEach(field => {
                    const el = document.getElementById(field);
                    if (el && data[field] !== undefined) {
                        el.value = data[field];
                    }
                });
                
                // ফিচার চেক বক্স পূরণ
                if (data.features && Array.isArray(data.features)) {
                    document.querySelectorAll('#features-checkboxes input[type="checkbox"]').forEach(checkbox => {
                        checkbox.checked = data.features.includes(checkbox.value);
                    });
                }
            }, 100); 

            // ৪. ছবি প্রিভিউ লোড করা (মেটাডেটা থেকে)
            if (stagedMetadataString) {
                const metadata = JSON.parse(stagedMetadataString);
                renderImagePreviews(metadata.imagePreviews); // এই ফাংশনটি নিচে আছে
            }

            alert("সম্পাদনার জন্য পূর্বের ডেটা লোড করা হয়েছে।");
        }
    }
    
    // --- ২. ছবি প্রিভিউ রেন্ডার করার ফাংশন ---
    function renderImagePreviews(imageUrls) {
        const previewContainer = document.getElementById('image-previews-container');
        previewContainer.innerHTML = '';
        if (imageUrls && imageUrls.length > 0) {
            imageUrls.forEach(url => {
                const img = document.createElement('img');
                img.src = url;
                img.style.maxWidth = '100px';
                img.style.maxHeight = '100px';
                img.style.marginRight = '10px';
                img.style.borderRadius = '4px';
                img.style.border = '1px solid #ddd';
                previewContainer.appendChild(img);
            });
        }
    }

    // --- ৩. ফর্ম ডেটা সংগ্রহ এবং স্টেজ করার ফাংশন ⭐ এইটিই আপনার প্রিভিউ লোড হওয়ার মূল কারণ ⭐ ---
    async function stagePropertyData(e) {
        e.preventDefault(); // ফর্ম সাবমিট হওয়া আটকানো

        submitBtn.disabled = true;
        submitBtn.textContent = 'ডেটা প্রক্রিয়াকরণ হচ্ছে...';

        // ১. সকল ফর্ম ডেটা সংগ্রহ
        const data = {
            category: postCategorySelect.value,
            title: document.getElementById('title').value,
            fullAddress: document.getElementById('full-address').value,
            description: document.getElementById('description').value,
            userName: document.getElementById('user-name').value,
            phoneNumber: document.getElementById('phone-number').value,
            // ডিফল্ট ভ্যালু সেট করা
            features: [],
        };
        
        // ২. ডাইনামিক ফিল্ডের ডেটা সংগ্রহ
        const dynamicFields = ['type', 'price', 'monthlyRent', 'rentUnit', 'areaSize', 'areaUnit', 'bedrooms', 'bathrooms', 'balconies', 'floorNumber', 'division', 'district', 'area', 'roadNo', 'latitude', 'longitude'];
        dynamicFields.forEach(field => {
            const el = document.getElementById(field);
            if (el) {
                // নম্বর ফিল্ডের জন্য স্ট্রিং থেকে নম্বর এ রূপান্তর
                data[field] = (field === 'price' || field === 'monthlyRent' || field === 'areaSize' || field === 'bedrooms' || field === 'bathrooms' || field === 'balconies' || field === 'floorNumber') 
                    ? (el.value ? Number(el.value) : el.value) // যদি ভ্যালু থাকে তবে নাম্বারে কনভার্ট করবে
                    : el.value;
            }
        });

        // ৩. ফিচারের ডেটা সংগ্রহ
        document.querySelectorAll('#features-checkboxes input[type="checkbox"]:checked').forEach(checkbox => {
            data.features.push(checkbox.value);
        });

        // ৪. ছবি ফাইল হ্যান্ডেল করা এবং Base64 এ রূপান্তর করে মেটাডেটাতে রাখা
        const imageInput = document.getElementById('property-images');
        const files = Array.from(imageInput.files);
        const imagePreviews = [];

        try {
            for (const file of files) {
                // ⚠️ সতর্কতা: প্রচুর ছবি হলে এটি সময় নিতে পারে
                const base64Url = await fileToBase64(file); 
                imagePreviews.push(base64Url);
            }
        } catch (error) {
            alert("ছবি প্রক্রিয়াকরণে সমস্যা হয়েছে: " + error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'প্রিভিউ দেখুন';
            return;
        }

        const metadata = { imagePreviews: imagePreviews };

        // ৫. ডেটা sessionStorage-এ সংরক্ষণ করা
        try {
            sessionStorage.setItem('stagedPropertyData', JSON.stringify(data));
            sessionStorage.setItem('stagedImageMetadata', JSON.stringify(metadata));
            
            // ৬. সফলভাবে সংরক্ষণ করার পর প্রিভিউ পেজে রিডাইরেক্ট করা
            window.location.href = 'preview.html'; 
            
        } catch (error) {
            console.error("Session Storage Error:", error);
            alert("ডেটা সংরক্ষণ করতে ব্যর্থ। ব্রাউজারের স্টোরেজ পূর্ণ কিনা পরীক্ষা করুন।");
            submitBtn.disabled = false;
            submitBtn.textContent = 'প্রিভিউ দেখুন';
        }
    }


    // --- ৪. ডাইনামিক ফিল্ড তৈরির ফাংশন (আগের মতোই) ---
    function renderDynamicFields(category) {
        // ... (এই ফাংশনটি আপনার পূর্বের কোড অনুযায়ী থাকবে)
        // সুবিধার জন্য, আমি এর ভেতরের কোডটি এখানে যোগ করছি:
        let html = '';
        if (category === 'বিক্রয়') {
            html += `
                <div class="input-group">
                    <label for="price">বিক্রয় মূল্য (টাকা):</label>
                    <input type="number" id="price" placeholder="যেমন: 5000000" required>
                </div>
            `;
        } else if (category === 'ভাড়া') {
            html += `
                <div class="input-group">
                    <label for="monthlyRent">মাসিক ভাড়া (টাকা):</label>
                    <input type="number" id="monthlyRent" placeholder="যেমন: 15000" required>
                </div>
                <div class="input-group">
                    <label for="rentUnit">ভাড়ার সময়কাল:</label>
                    <select id="rentUnit" required>
                        <option value="মাসিক">মাসিক</option>
                        <option value="দৈনিক">দৈনিক</option>
                        <option value="বাৎসরিক">বাৎসরিক</option>
                    </select>
                </div>
            `;
        }
        
        // সমস্ত ক্ষেত্রেই সাধারণ ফিল্ড
        html += `
            <div class="input-group">
                <label for="type">প্রপার্টির ধরণ:</label>
                <select id="type" required onchange="renderSpecificFeatures(this.value)">
                    <option value="">নির্বাচন করুন</option>
                    <option value="ফ্ল্যাট/অ্যাপার্টমেন্ট">ফ্ল্যাট/অ্যাপার্টমেন্ট</option>
                    <option value="বাড়ি">বাড়ি</option>
                    <option value="জমি">জমি</option>
                    <option value="কমার্শিয়াল স্পেস">কমার্শিয়াল স্পেস</option>
                    <option value="প্লট">প্লট</option>
                </select>
            </div>
            
            <div id="specific-features-container"></div>

            <div class="input-group">
                <label for="areaSize">আয়তন:</label>
                <input type="number" id="areaSize" placeholder="যেমন: 1200" required>
            </div>
            <div class="input-group">
                <label for="areaUnit">আয়তন ইউনিট:</label>
                <select id="areaUnit" required>
                    <option value="বর্গফুট">বর্গফুট</option>
                    <option value="কাঠা">কাঠা</option>
                    <option value="বিঘা">বিঘা</option>
                    <option value="একর">একর</option>
                </select>
            </div>

            <h3 style="margin-top: 25px;">ঠিকানার তথ্য</h3>
            <div class="input-group">
                <label for="division">বিভাগ:</label>
                <input type="text" id="division" placeholder="যেমন: ঢাকা" required>
            </div>
            <div class="input-group">
                <label for="district">জেলা:</label>
                <input type="text" id="district" placeholder="যেমন: ঢাকা" required>
            </div>
            <div class="input-group">
                <label for="area">এলাকা/উপজেলা:</label>
                <input type="text" id="area" placeholder="যেমন: ধানমন্ডি/সাভার" required>
            </div>
            <div class="input-group">
                <label for="roadNo">রোড/ব্লক/সেক্টর (ঐচ্ছিক):</label>
                <input type="text" id="roadNo" placeholder="যেমন: রোড #৫, ব্লক এ">
            </div>
            
            <h3 style="margin-top: 25px;">ম্যাপের অবস্থান (ঐচ্ছিক)</h3>
             <p style="font-size: 0.9em; color: #777; margin-bottom: 10px;">Google Maps থেকে ল্যাটিটিউড ও লংগিটিউড যোগ করুন।</p>
            <div class="input-group">
                <label for="latitude">Latitude:</label>
                <input type="text" id="latitude" placeholder="যেমন: 23.8103">
            </div>
            <div class="input-group">
                <label for="longitude">Longitude:</label>
                <input type="text" id="longitude" placeholder="যেমন: 90.4125">
            </div>

            <h3 style="margin-top: 25px;">ফিচার ও সুবিধা</h3>
            <div id="features-checkboxes" class="features-grid">
                <label><input type="checkbox" value="গ্যাস সংযোগ"> গ্যাস সংযোগ</label>
                <label><input type="checkbox" value="বিদ্যুৎ সংযোগ"> বিদ্যুৎ সংযোগ</label>
                <label><input type="checkbox" value="পানি সংযোগ"> পানি সংযোগ</label>
                <label><input type="checkbox" value="লিফট"> লিফট</label>
                <label><input type="checkbox" value="জিম/ফিটনেস সেন্টার"> জিম/ফিটনেস সেন্টার</label>
                <label><input type="checkbox" value="পার্কিং সুবিধা"> পার্কিং সুবিধা</label>
                <label><input type="checkbox" value="২৪ ঘন্টা নিরাপত্তা"> ২৪ ঘন্টা নিরাপত্তা</label>
                <label><input type="checkbox" value="সি সি ক্যামেরা"> সি সি ক্যামেরা</label>
            </div>
        `;
        
        dynamicFieldsContainer.innerHTML = html;
    }
    
    // --- ৫. নির্দিষ্ট ফিচার রেন্ডার ফাংশন ---
    window.renderSpecificFeatures = (type) => {
        const specificContainer = document.getElementById('specific-features-container');
        let html = '';
        
        // নির্মিত প্রপার্টির জন্য (ফ্ল্যাট/বাড়ি/কমার্শিয়াল)
        if (type !== 'জমি' && type !== 'প্লট' && type !== '') {
            html += `
                <div class="input-group">
                    <label for="bedrooms">বেডরুম:</label>
                    <input type="number" id="bedrooms" placeholder="যেমন: 3" min="0">
                </div>
                <div class="input-group">
                    <label for="bathrooms">বাথরুম:</label>
                    <input type="number" id="bathrooms" placeholder="যেমন: 2" min="0">
                </div>
                <div class="input-group">
                    <label for="balconies">বারান্দা:</label>
                    <input type="number" id="balconies" placeholder="যেমন: 2" min="0">
                </div>
                <div class="input-group">
                    <label for="floorNumber">ফ্লোর নম্বর:</label>
                    <input type="number" id="floorNumber" placeholder="যেমন: 5" min="0">
                </div>
            `;
        }
        
        specificContainer.innerHTML = html;
    }
    

    // --- ৬. ইভেন্ট লিসেনার্স ---
    postCategorySelect.addEventListener('change', (e) => {
        renderDynamicFields(e.target.value);
    });
    
    // প্রথমবার পেজ লোড হলে ডিফল্ট ক্যাটাগরি সেট করা
    renderDynamicFields(postCategorySelect.value);
    
    // ⭐ ফর্ম সাবমিট ইভেন্ট হ্যান্ডেলার (গুরুত্বপূর্ণ) ⭐
    propertyForm.addEventListener('submit', stagePropertyData);

    // প্রোফাইল ছবি আপলোড প্রিভিউ
    const imageInput = document.getElementById('property-images');
    if (imageInput) {
        imageInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            const imageUrls = [];
            for (const file of files) {
                try {
                    const base64Url = await fileToBase64(file);
                    imageUrls.push(base64Url);
                } catch (error) {
                    console.error("ছবি প্রিভিউ লোড করতে ব্যর্থ:", error);
                }
            }
            renderImagePreviews(imageUrls);
        });
    }


    // --- ৭. হেডার এবং সাইডবার কার্যকারিতা ---
    
    // (আপনার অন্যান্য UI লজিক এখানে যুক্ত করা হলো)
    const loginLinkSidebar = document.getElementById('login-link-sidebar');
    const postLinkSidebar = document.getElementById('post-link'); 
    
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
            // লগইন করা থাকলে পোস্ট লিঙ্ক দেখানো উচিত
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex'; 
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                // লগআউট ইভেন্ট হ্যান্ডেলার সেট করা
                loginLinkSidebar.onclick = handleLogout;
            }
        } else {
            // ইউজার লগইন না থাকলে
            alert("প্রপার্টি পোস্ট করতে আপনাকে অবশ্যই লগইন করতে হবে।");
            window.location.href = 'auth.html'; // লগইন পেজে রিডাইরেক্ট করা
            
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
        }
    });


    // প্রিভিউ লোড হওয়ার পর লোড করার চেষ্টা করা 
    loadStagedData();
    
    // অন্যান্য UI লজিক
    const notificationButton = document.getElementById('notificationButton'); 
    const headerPostButton = document.getElementById('headerPostButton'); 
    const messageButton = document.getElementById('messageButton');
    const profileImageWrapper = document.getElementById('profileImageWrapper'); 

    // নোটিফিকেশন আইকন রিডাইরেক্ট
    if (notificationButton) {
        notificationButton.addEventListener('click', () => {
             window.location.href = 'notifications.html'; 
        });
    }

    // পোস্ট আইকন রিডাইরেক্ট
    if (headerPostButton) {
        headerPostButton.addEventListener('click', () => {
            window.location.href = 'post.html'; 
        });
    }

    // ম্যাসেজ আইকন রিডাইরেক্ট
    if (messageButton) {
        messageButton.addEventListener('click', () => {
             window.location.href = 'messages.html';
        });
    }
    
    // প্রোফাইল ইমেজ রিডাইরেক্ট
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }
});
