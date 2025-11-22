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
        
        // ✅ সংশোধিত লজিক: শুধু প্রধান ডেটা string যাচাই করুন। (Base64 ডেটা না থাকলেও লোড হবে)
        if (!stagedDataString) return; 

        try {
            const stagedData = JSON.parse(stagedDataString);
            // ✅ সংশোধিত লজিক: যদি metadata string না থাকে, তাহলে একটি খালি অবজেক্ট ({}) ব্যবহার করুন।
            const stagedMetadata = stagedMetadataString ? JSON.parse(stagedMetadataString) : {};

            // Set simple fields
            // Assuming the simple fields exist in the form
            const listerTypeElement = document.getElementById('lister-type');
            if (listerTypeElement) listerTypeElement.value = stagedData.listerType || '';
            if (postCategorySelect) postCategorySelect.value = stagedData.category || '';

            // Trigger dynamic field generation
            if (stagedData.category) {
                generateTypeDropdown(stagedData.category);
                
                // Set a timeout to allow the dynamic fields to render before setting values
                setTimeout(() => {
                    const postTypeSelect = document.getElementById('post-type');
                    if (postTypeSelect && stagedData.type) {
                        postTypeSelect.value = stagedData.type;
                        // stagedMetadata সহ নির্দিষ্ট ফিল্ড জেনারেশন
                        generateSpecificFields(stagedData.category, stagedData.type, stagedData, stagedMetadata); 
                    } else if (stagedData.type) {
                        // যদি postTypeSelect না পাওয়া যায়, তবুও ডেটা লোড করার চেষ্টা করা
                        generateSpecificFields(stagedData.category, stagedData.type, stagedData, stagedMetadata);
                    }
                }, 100); 
            }
            
            // Show a message
            alert('আপনার সংরক্ষিত তথ্য এডিটের জন্য লোড করা হয়েছে।');

        } catch (error) {
            console.error('Error loading staged data:', error);
            // ডেটা ত্রুটিপূর্ণ হলে মুছে ফেলা
            sessionStorage.removeItem('stagedPropertyData');
            sessionStorage.removeItem('stagedImageMetadata');
        }
    }
    
    // DOM লোড হওয়ার সাথে সাথে সংরক্ষিত ডেটা লোড করার চেষ্টা করা
    loadStagedData();

    // --- ২. ডাইনামিক ফিল্ড তৈরির লজিক (আপনার ফাইল অনুযায়ী অনুমান করা কাঠামো) ---

    // প্রপার্টির প্রকারভেদ (Type) এর ড্রপডাউন তৈরি করা
    function generateTypeDropdown(category) {
        // এই ফাংশনটি category এর উপর ভিত্তি করে post-type ড্রপডাউন তৈরি করে
        
        let typeOptions = [];
        if (category === 'বিক্রয়') {
            typeOptions = ['জমি', 'ফ্ল্যাট', 'বাড়ি', 'প্লট', 'কমার্শিয়াল'];
        } else if (category === 'ভাড়া') {
            typeOptions = ['ফ্ল্যাট', 'বাড়ি', 'রুম', 'অফিস', 'দোকান'];
        } else {
             dynamicFieldsContainer.innerHTML = '';
             return;
        }

        const postTypeHtml = `
            <div class="form-group">
                <label for="post-type">প্রপার্টির প্রকারভেদ *</label>
                <select id="post-type" name="type" required>
                    <option value="">নির্বাচন করুন</option>
                    ${typeOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
            </div>
        `;
        
        // dynamicFieldsContainer-এর শুরুতেই যুক্ত করা
        const typeDropdownDiv = document.createElement('div');
        typeDropdownDiv.innerHTML = postTypeHtml;
        const existingType = document.getElementById('post-type-wrapper');
        if (existingType) existingType.remove();
        
        const typeWrapper = document.createElement('div');
        typeWrapper.id = 'post-type-wrapper';
        typeWrapper.appendChild(typeDropdownDiv.firstChild);
        
        // existingType এর ঠিক পরেই এটি ঢুকানো উচিত।
        postCategorySelect.parentNode.insertBefore(typeWrapper, postCategorySelect.nextSibling);

        const postTypeSelect = document.getElementById('post-type');
        if (postTypeSelect) {
             postTypeSelect.removeEventListener('change', typeChangeHandler);
             postTypeSelect.addEventListener('change', typeChangeHandler);
        }
        
        // পূর্বের ডেটা থাকলে সেট করা
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        if (stagedDataString) {
             const stagedData = JSON.parse(stagedDataString);
             if (postTypeSelect && stagedData.type) {
                 postTypeSelect.value = stagedData.type;
             }
        }
        
        // প্রথমবার জেনারেট হওয়ার পরে, নির্দিষ্ট ফিল্ডগুলোও জেনারেট করা
        if (postTypeSelect && postTypeSelect.value) {
            generateSpecificFields(category, postTypeSelect.value);
        }
    }
    
    // generateSpecificFields তৈরির জন্য ইভেন্ট হ্যান্ডলার
    const typeChangeHandler = (event) => {
        const category = postCategorySelect.value;
        const type = event.target.value;
        generateSpecificFields(category, type);
    };

    // নির্দিষ্ট ফিল্ড তৈরি করা
    function generateSpecificFields(category, type, stagedData = {}, stagedMetadata = {}) {
        // এই ফাংশনটি আপনার আসল ফাইলে থাকা সবচেয়ে বড় এবং গুরুত্বপূর্ণ লজিক।
        // এখানে শুধু একটি প্লেসহোল্ডার কাঠামো দেওয়া হলো।
        
        let fieldsHtml = '';
        
        // ১. সাধারণ ফিল্ড (সমস্ত প্রকারের জন্য)
        fieldsHtml += `<h3 class="dynamic-heading">অবস্থান ও দাম</h3>`;
        fieldsHtml += `
            <div class="form-group">
                <label for="price">দাম/ভাড়া *</label>
                <input type="number" id="price" name="price" value="${stagedData.price || ''}" required>
            </div>
            `;
        
        // ২. প্রকারভেদের উপর ভিত্তি করে ফিল্ড
        if (type === 'ফ্ল্যাট' || type === 'বাড়ি') {
             fieldsHtml += `<h3 class="dynamic-heading">আবাসিক বৈশিষ্ট্য</h3>`;
             fieldsHtml += `
                <div class="form-group">
                    <label for="rooms">রুম সংখ্যা *</label>
                    <input type="number" id="rooms" name="rooms" value="${stagedData.rooms || ''}" required>
                </div>
                `;
        } else if (type === 'জমি' || type === 'প্লট') {
             fieldsHtml += `<h3 class="dynamic-heading">জমির বৈশিষ্ট্য</h3>`;
             fieldsHtml += `
                <div class="form-group">
                    <label for="landArea">জমির পরিমাণ (শতাংশ/কাঠা) *</label>
                    <input type="number" id="landArea" name="landArea" value="${stagedData.landArea || ''}" required>
                </div>
                `;
        }
        
        // ৩. ছবি এবং মালিকানা তথ্য (বিক্রয়ের জন্য)
        fieldsHtml += `<h3 class="dynamic-heading">ছবি আপলোড</h3>`;
        fieldsHtml += `
             <div class="form-group">
                <label for="images">প্রপার্টির ছবি (সর্বোচ্চ ৫টি)</label>
                <input type="file" id="images" name="images" accept="image/*" multiple>
             </div>
             `;
        
        if (category === 'বিক্রয়') {
             fieldsHtml += `<h3 class="dynamic-heading">মালিকানা ও ডকুমেন্ট</h3>`;
             fieldsHtml += `
                <div class="form-group">
                    <label for="khotian-image">সর্বশেষ খতিয়ানের ছবি</label>
                    <input type="file" id="khotian-image" name="khotian-image" accept="image/*">
                </div>
                `;
        }
        
        dynamicFieldsContainer.innerHTML = fieldsHtml;
        
        // **পুনরায় ডেটা সেট করা:** generateSpecificFields তৈরি হওয়ার পর stagedData থেকে মান সেট করা হয়।
        // যেহেতু এটি একটি প্লেসহোল্ডার, আপনাকে এখানে আপনার মূল ফাইলের লজিক অনুযায়ী সকল ইনপুট ফিল্ডে মান সেট করার কোড যোগ করতে হবে।
        // উদাহরণ: if (stagedData.description) document.getElementById('description').value = stagedData.description;
    }
    
    // ক্যাটাগরি পরিবর্তনের ইভেন্ট
    postCategorySelect.addEventListener('change', (event) => {
        generateTypeDropdown(event.target.value);
    });

    // --- ৩. ফর্ম সাবমিশন হ্যান্ডেল করা (Staging) ---
    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // ইনপুট ডিজেবল করে লোডিং স্টেট দেখানো
        submitBtn.disabled = true;
        submitBtn.textContent = 'প্রিভিউ তৈরি হচ্ছে...';

        // ফর্ম ডেটা সংগ্রহ
        const formData = new FormData(propertyForm);
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

        // মালিকানা ডেটা স্ট্রাকচার তৈরি (যদি ফর্ম ডেটাতে মালিকানা সংক্রান্ত ফিল্ড থাকে)
        if (data.ownerName) { // Assuming 'ownerName' is a submitted field
            data.owner = {
                donorName: data.ownerName, 
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
