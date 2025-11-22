// post.js

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

    // --- ১. Staged Data লোড এবং প্রি-ফিল করার ফাংশন (সংশোধিত) ---
    function loadStagedData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');
        
        // ✅ সংশোধিত লজিক: শুধু প্রধান ডেটা string যাচাই করুন।
        if (!stagedDataString) return; 

        try {
            const stagedData = JSON.parse(stagedDataString);
            // ✅ সংশোধিত লজিক: যদি metadata string না থাকে, তাহলে একটি খালি অবজেক্ট ({}) ব্যবহার করুন।
            const stagedMetadata = stagedMetadataString ? JSON.parse(stagedMetadataString) : {};

            // Set simple fields
            document.getElementById('lister-type').value = stagedData.listerType || '';
            document.getElementById('post-category').value = stagedData.category || '';

            // Trigger dynamic field generation
            if (stagedData.category) {
                generateTypeDropdown(stagedData.category);
                
                // Set a timeout to allow the dynamic fields to render before setting values
                setTimeout(() => {
                    const postTypeSelect = document.getElementById('post-type');
                    if (postTypeSelect && stagedData.type) {
                        postTypeSelect.value = stagedData.type;
                        // stagedMetadata পাস করা হলো
                        generateSpecificFields(stagedData.category, stagedData.type, stagedData, stagedMetadata); 
                    }
                }, 100); 
            }
            
            // Show a message
            alert('আপনার সংরক্ষিত তথ্য এডিটের জন্য লোড করা হয়েছে।');

        } catch (error) {
            console.error('Error loading staged data:', error);
            sessionStorage.removeItem('stagedPropertyData');
            sessionStorage.removeItem('stagedImageMetadata');
        }
    }
    
    // DOM লোড হওয়ার সাথে সাথে সংরক্ষিত ডেটা লোড করার চেষ্টা করা
    loadStagedData();

    // --- ২. ডাইনামিক ফিল্ড তৈরির লজিক (আপনার ফাইল অনুযায়ী যুক্ত করা হয়েছে) ---
    
    // প্রপার্টির প্রকারভেদ (Type) এর ড্রপডাউন তৈরি করা
    function generateTypeDropdown(category) {
        // এই ফাংশনটি category এর উপর ভিত্তি করে post-type ড্রপডাউন তৈরি করে
        // উদাহরণস্বরূপ: category 'বিক্রয়' হলে, অপশনগুলো হবে 'জমি', 'ফ্ল্যাট', 'বাড়ি' ইত্যাদি।
        // এই ফাংশনটির সম্পূর্ণ কোড আপনার আসল post.js ফাইলে থাকতে পারে, এখানে এটি একটি প্লেসহোল্ডার।
        console.log(`Generating type dropdown for: ${category}`);
        // ... typeDropdown তৈরির লজিক ...
        // ইভেন্ট লিসেনার যোগ করা
        const postTypeSelect = document.getElementById('post-type');
        if (postTypeSelect) {
             postTypeSelect.removeEventListener('change', typeChangeHandler);
             postTypeSelect.addEventListener('change', typeChangeHandler);
        }
    }
    
    // generateSpecificFields তৈরির জন্য ইভেন্ট হ্যান্ডলার
    const typeChangeHandler = (event) => {
        const category = postCategorySelect.value;
        const type = event.target.value;
        generateSpecificFields(category, type);
    };

    // নির্দিষ্ট ফিল্ড তৈরি করা (যেমন: রুম সংখ্যা, ফ্লোর নং ইত্যাদি)
    function generateSpecificFields(category, type, stagedData = {}, stagedMetadata = {}) {
        // এই ফাংশনটি category এবং type এর উপর ভিত্তি করে ডাইনামিক ফিল্ড তৈরি করে
        // উদাহরণস্বরূপ: type 'ফ্ল্যাট' হলে, 'রুম', 'বাথরুম', 'ফ্লোর নং' ইত্যাদি ফিল্ড তৈরি হবে।
        console.log(`Generating specific fields for: ${category} - ${type}`);
        dynamicFieldsContainer.innerHTML = ''; // পূর্ববর্তী ফিল্ড মুছে ফেলা
        // ... নির্দিষ্ট ফিল্ড তৈরির লজিক ...
        
        // Staged Data থাকলে ফিল্ডে মান সেট করা
        if (Object.keys(stagedData).length > 0) {
            // উদাহরণ: document.getElementById('rooms').value = stagedData.rooms;
            // ছবি প্রিভিউ দেখানোর লজিক: stagedData.base64Images ব্যবহার করে
            // ...
        }
        // এই ফাংশনটির সম্পূর্ণ কোড আপনার আসল post.js ফাইলে থাকতে পারে, এখানে এটি একটি প্লেসহোল্ডার।
    }
    
    // ক্যাটাগরি পরিবর্তনের ইভেন্ট
    postCategorySelect.addEventListener('change', (event) => {
        generateTypeDropdown(event.target.value);
    });

    // --- ৩. ফর্ম সাবমিশন হ্যান্ডেল করা (Staging) ---
    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // ফর্ম ডেটা সংগ্রহ
        const formData = new FormData(propertyForm);
        // Object.fromEntries() ব্যবহার করে ফর্ম ডেটাকে JavaScript অবজেক্টে রূপান্তর করা। 
        // মালিকানা তথ্যের মতো নেস্টেড ডেটা (owner[donorName]) সঠিকভাবে হ্যান্ডেল করার জন্য
        // এটি একটু জটিল হতে পারে, তবে এখানে সরলীকৃত ভার্সন ব্যবহার করা হলো:
        const data = Object.fromEntries(formData.entries()); 
        
        // ফাইল ইনপুট সংগ্রহ
        const imageFiles = document.getElementById('images')?.files || [];
        const khotianFile = document.getElementById('khotian-image')?.files[0];
        const sketchFile = document.getElementById('sketch-image')?.files[0];
        
        // Base64-এ রূপান্তর এবং Staging
        const base64Images = [];
        const imageMetadata = {
            images: [],
            khotian: null,
            sketch: null
        };
        
        // মূল ছবি
        for (const file of imageFiles) {
            const base64 = await fileToBase64(file);
            base64Images.push(base64);
            imageMetadata.images.push({ name: file.name, type: file.type });
        }

        // মালিকানা ডেটা স্ট্রাকচার তৈরি
        if (data.ownerName) { // Assuming 'ownerName' exists if ownership info is submitted
            data.owner = {
                donorName: data.ownerName, // Temporary assignment
                dagNoType: data.dagNoType,
                dagNo: data.dagNo,
                mouja: data.mouja
            };
            // ক্লিনআপ
            delete data.ownerName;
            delete data.dagNoType;
            delete data.dagNo;
            delete data.mouja;
        }

        // খতিয়ান ছবি
        if (khotianFile && data.owner) {
            const khotianBase64 = await fileToBase64(khotianFile);
            data.owner.khotianBase64 = khotianBase64;
            imageMetadata.khotian = { name: khotianFile.name, type: khotianFile.type };
        }
        
        // নকশার ছবি
        if (sketchFile && data.owner) {
            const sketchBase64 = await fileToBase64(sketchFile);
            data.owner.sketchBase64 = sketchBase64;
            imageMetadata.sketch = { name: sketchFile.name, type: sketchFile.type };
        }
        
        // সমস্ত Base64 ডেটা মূল ডেটার সাথে যুক্ত করা
        data.base64Images = base64Images;
        
        // Staging: sessionStorage-এ ডেটা সেভ করা
        sessionStorage.setItem('stagedPropertyData', JSON.stringify(data));
        sessionStorage.setItem('stagedImageMetadata', JSON.stringify(imageMetadata));
        
        // প্রিভিউ পেজে রিডাইরেক্ট
        window.location.href = 'preview.html';
    });


    // --- ৪. অথেন্টিকেশন স্টেট হ্যান্ডেল করা ---
    const headerProfileImage = document.getElementById('headerProfileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
    const profileImageWrapper = document.getElementById('profileImageWrapper');
    const headerPostButton = document.getElementById('headerPostButton');
    const notificationButton = document.getElementById('notificationButton');
    const messageButton = document.getElementById('messageButton');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');
    const postLinkSidebar = document.getElementById('post-link-sidebar');

    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user) {
                // ইউজার লগইন করা আছে
                if (headerProfileImage && defaultProfileIcon) {
                    // user.photoURL একটি ডামি পাথ হতে পারে যদি ইউজার ছবিটি আপলোড না করে থাকেন
                    headerProfileImage.src = user.photoURL || 'path/to/default/profile.png'; 
                    headerProfileImage.style.display = 'block';
                    defaultProfileIcon.style.display = 'none';
                }
                if (profileImageWrapper) profileImageWrapper.style.display = 'flex';
                
                // সাইডবার লিঙ্ক আপডেট
                if (postLinkSidebar) postLinkSidebar.style.display = 'block';
                if (loginLinkSidebar) {
                    loginLinkSidebar.textContent = 'লগআউট';
                    loginLinkSidebar.href = '#';
                    loginLinkSidebar.onclick = async () => {
                        await auth.signOut();
                        alert('আপনি সফলভাবে লগআউট করেছেন।');
                        window.location.reload(); 
                    };
                }
            } else {
                // ইউজার লগইন করা নেই
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
            }
        });
    }

    // --- ৫. হেডার আইকন কার্যকারিতা ---

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
