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

    // হেডার এবং সাইডবার এলিমেন্টস
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    const profileImageWrapper = document.getElementById('profileImageWrapper');
    const headerProfileImage = document.getElementById('profileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');


    // --- NEW: Function to load and pre-fill data from session storage for editing ---
    function loadStagedData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');
        
        if (stagedDataString) {
            const stagedData = JSON.parse(stagedDataString);
            
            // ক্যাটাগরি এবং টাইপ লোড করা
            postCategorySelect.value = stagedData.category;
            propertyTypeSelect.value = stagedData.type;
            
            // ডাইনামিক ফিল্ড লোড করা
            updateDynamicFields(stagedData.category, stagedData.type, stagedData);
            
            // অন্যান্য ফিল্ড লোড করা
            // টেক্সট ইনপুট
            const simpleFields = ['title', 'description', 'phoneNumber', 'secondaryPhone', 'propertyAge', 'floors', 'floorNo', 'rooms', 'bathrooms', 'kitchen', 'shopCount', 'roadWidth'];
            simpleFields.forEach(field => {
                 const el = document.getElementById(field);
                 if (el && stagedData[field] !== null) {
                    el.value = stagedData[field] || '';
                 }
            });

            // রেডিও বাটন (listerType)
            if (stagedData.listerType) {
                const radio = document.querySelector(`input[name="lister-type"][value="${stagedData.listerType}"]`);
                if (radio) radio.checked = true;
            }

            // ড্রপডাউন (facing, areaUnit)
            const dropdownFields = ['facing', 'areaUnit'];
            dropdownFields.forEach(field => {
                 const el = document.getElementById(field);
                 if (el && stagedData[field] !== null) {
                    el.value = stagedData[field] || '';
                 }
            });

            // লোকেশন ফিল্ডস
            const locationFields = ['division', 'district', 'upazila', 'thana', 'cityCorporation', 'area', 'village', 'road'];
            locationFields.forEach(field => {
                 const el = document.getElementById(field);
                 if (el && stagedData.location && stagedData.location[field] !== null) {
                    el.value = stagedData.location[field] || '';
                 }
            });
            
            // প্রাইস ফিল্ডস
            document.getElementById('price').value = stagedData.price || '';
            document.getElementById('price-type').value = stagedData.priceType || '';
            document.getElementById('deposit').value = stagedData.deposit || '';
            document.getElementById('area-size').value = stagedData.areaSize || '';
            
            // সুবিধার জন্য চেকবক্স
             if (stagedData.utilities && Array.isArray(stagedData.utilities)) {
                 stagedData.utilities.forEach(utility => {
                     const checkbox = document.querySelector(`input[name="utilities"][value="${utility}"]`);
                     if (checkbox) checkbox.checked = true;
                 });
             }
             
            // ইমেজ প্রি-ফিলিং (যদি থাকে)
            if (stagedMetadataString) {
                const stagedMetadata = JSON.parse(stagedMetadataString);
                // মেটাডেটা লোড করার জন্য UI লজিক প্রয়োজন, যা এখানে অন্তর্ভুক্ত নয়।
            }
        }
    }


    // --- ডাইনামিক ফিল্ডস ফাংশন (সংক্ষিপ্ত) ---
    function updateDynamicFields(category, type, stagedData = {}) {
        // এই ফাংশনে আপনার ফর্মের HTML ইনজেকশন লজিক থাকবে
        // ... (লজিক এখানে অপরিবর্তিত)
    }

    // --- ফাইল ইনপুট হ্যান্ডলিং ---
    const imageInput = document.getElementById('image-input');
    const imagePreviews = document.getElementById('image-previews');
    const imageLimit = 5;
    
    // ... (ফাইল ইনপুট লজিক এখানে অপরিবর্তিত)


    // --- Function to handle saving data and moving to the next step (Preview) ---
    function handleNextStep(e) {
        e.preventDefault();
        
        // ফর্ম ভ্যালিডেশন চেক
        if (!propertyForm.checkValidity()) {
            // যদি ব্রাউজারের ডিফল্ট ভ্যালিডেশন কাজ না করে, কাস্টম অ্যালার্ট দেওয়া যেতে পারে
            alert("অনুগ্রহ করে সবগুলি প্রয়োজনীয় ফিল্ড পূরণ করুন।");
            return;
        }

        const propertyData = {
            title: document.getElementById('title').value,
            category: postCategorySelect.value,
            type: propertyTypeSelect.value,
            description: document.getElementById('description').value,
            phoneNumber: document.getElementById('phone-number').value,
            secondaryPhone: document.getElementById('secondary-phone').value || null, 
            
            // Location
            location: {
                division: document.getElementById('division').value || null,
                district: document.getElementById('district').value || null,
                upazila: document.getElementById('upazila') ? document.getElementById('upazila').value || null : null,
                cityCorporation: document.getElementById('city-corporation') ? document.getElementById('city-corporation').value || null : null,
                area: document.getElementById('area').value || null,
                village: document.getElementById('village').value || null,
                road: document.getElementById('road').value || null,
                thana: document.getElementById('thana') ? document.getElementById('thana').value || null : null,
            },
            
            // ✅ ফিক্সড ব্লক: Price & Area - এখানে 'N/A' এর পরিবর্তে 'null' ব্যবহার করা হলো
            price: document.getElementById('price').value || null,
            priceType: document.getElementById('price-type').value || null, 
            deposit: document.getElementById('deposit') ? (document.getElementById('deposit').value || null) : null,
            areaSize: document.getElementById('area-size').value || null, 
            areaUnit: document.getElementById('area-unit').value || null,
            roadWidth: document.getElementById('road-width') ? (document.getElementById('road-width').value || null) : null,
            
            // Property Details
            propertyAge: document.getElementById('property-age') ? document.getElementById('property-age').value || null : null,
            facing: document.getElementById('facing') ? document.getElementById('facing').value || null : null,
            parking: document.querySelector('input[name="parking"]:checked') ? document.querySelector('input[name="parking"]:checked').value : null,
            floors: document.getElementById('floors') ? document.getElementById('floors').value || null : null,
            floorNo: document.getElementById('floor-no') ? document.getElementById('floor-no').value || null : null,
            rooms: document.getElementById('rooms') ? document.getElementById('rooms').value || null : null,
            bathrooms: document.getElementById('bathrooms') ? document.getElementById('bathrooms').value || null : null,
            kitchen: document.getElementById('kitchen') ? document.getElementById('kitchen').value || null : null,
            shopCount: document.getElementById('shop-count') ? document.getElementById('shop-count').value || null : null,
            
            // Utilities (as array)
            utilities: Array.from(document.querySelectorAll('input[name="utilities"]:checked')).map(cb => cb.value),
            
            // Images (base64)
            base64Images: Array.from(document.querySelectorAll('.image-preview img')).map(img => img.src),
            
            // Other data
            listerType: document.querySelector('input[name="lister-type"]:checked') ? document.querySelector('input[name="lister-type"]:checked').value : null,
            moveInDate: document.getElementById('move-in-date') ? document.getElementById('move-in-date').value || null : null,
            
            // Metadata (For final Firebase upload, currently staged)
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'Pending', // Initial status
        };

        // সেশনস্টোরেজে সেভ করে প্রিভিউ পেজে রিডাইরেক্ট
        sessionStorage.setItem('stagedPropertyData', JSON.stringify(propertyData));
        
        // image-metadata সংরক্ষণ (যদি প্রয়োজন হয়)
        const imageMetadata = Array.from(document.querySelectorAll('.image-preview')).map(div => ({
            id: div.dataset.id, // আপনার কাস্টম ID
            fileName: div.dataset.fileName,
        }));
        sessionStorage.setItem('stagedImageMetadata', JSON.stringify(imageMetadata));

        window.location.href = 'preview.html';
    }


    // --- ইভেন্ট লিসেনার ---
    postCategorySelect.addEventListener('change', () => updateDynamicFields(postCategorySelect.value, propertyTypeSelect.value));
    propertyTypeSelect.addEventListener('change', () => updateDynamicFields(postCategorySelect.value, propertyTypeSelect.value));
    
    // ফর্ম সাবমিট
    propertyForm.addEventListener('submit', handleNextStep);


    // --- প্রাথমিক লোডিং ---
    loadStagedData();

    // --- Authentication & UI Update ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            // ব্যবহারকারী লগইন করা আছে
            if (headerProfileImage && defaultProfileIcon) {
                headerProfileImage.src = user.photoURL || 'assets/placeholder-profile.jpg';
                headerProfileImage.style.display = 'block';
                defaultProfileIcon.style.display = 'none';
            }
             if (profileImageWrapper) profileImageWrapper.style.display = 'flex';
             
            // সাইডবার লিঙ্ক আপডেট
            if (postLinkSidebar) postLinkSidebar.style.display = 'block';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = (e) => {
                    e.preventDefault();
                    auth.signOut().then(() => {
                        window.location.href = 'index.html'; 
                    }).catch(error => {
                        console.error("লগআউট ব্যর্থ:", error);
                    });
                };
            }
            if(headerPostButton) headerPostButton.style.display = 'flex';
            
        } else {
            // ব্যবহারকারী লগইন করা নেই
            if (headerProfileImage && defaultProfileIcon) {
                headerProfileImage.style.display = 'none';
                defaultProfileIcon.style.display = 'block';
            }
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex';
            
            // সাইডবার লিঙ্ক আপডেট
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
            if(headerPostButton) headerPostButton.style.display = 'none'; 
        }
    });

    // --- হেডার আইকন কার্যকারিতা ---\n
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
    
    // সাইড মেনু লজিক (আপনার প্রথম ফিক্স)
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
});
