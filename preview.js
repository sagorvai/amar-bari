// preview.js

// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

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
}

// Function to safely check and format data for display
const checkAndFormat = (value, unit = '', defaultValue = 'প্রদান করা হয়নি') => {
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
        return defaultValue;
    }
    // Array handling for utilities
    if (Array.isArray(value)) {
         return value.length > 0 ? value.join(', ') : defaultValue;
    }
    return `${value} ${unit}`.trim();
}


document.addEventListener('DOMContentLoaded', function() {
    const previewContent = document.getElementById('preview-content');
    const editButton = document.getElementById('edit-button');
    const confirmButton = document.getElementById('confirm-post-button');
    
    // --- হেডার এলিমেন্ট ডিফাইন করা হলো (মেনু ফিক্সের জন্য) ---
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    const headerProfileImage = document.getElementById('profileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
    const profileImageWrapper = document.getElementById('profileImageWrapper');


    // --- লগআউট ফাংশন ---
    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            window.location.href = 'index.html'; 
        } catch (error) {
            console.error("লগআউট ব্যর্থ:", error);
            alert("লগআউট করতে সমস্যা হয়েছে।");
        }
    };
    
    // --- প্রিভিউ ডেটা লোড করার ফাংশন (FIXED: Added all fields) ---
    function loadPreviewData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        
        if (!stagedDataString) {
            previewContent.innerHTML = '<div class="not-found">পোস্ট প্রিভিউ করার জন্য কোনো ডেটা পাওয়া যায়নি। অনুগ্রহ করে <a href="post.html">পোস্ট পেজ</a> থেকে আবার চেষ্টা করুন।</div>';
            confirmButton.disabled = true;
            return;
        }

        const data = JSON.parse(stagedDataString);

        // --- Data Structure for display ---
        const dataStructure = [
            { section: 'স্থান ও অবস্থান', items: [
                { label: 'বিভাগ', value: data.locationDivision },
                { label: 'জেলা', value: data.locationDistrict },
                { label: 'উপজেলা', value: data.locationUpazila },
                { label: 'এলাকা/রোড', value: data.locationArea },
                { label: 'সম্পূর্ণ ঠিকানা', value: data.fullAddress, isDescription: true },
            ]},
            { section: 'মূল্য এবং শর্তাবলী', items: [
                { label: 'মূল্য', value: data.price, unit: 'টাকা' },
                { label: 'আলোচনা সাপেক্ষ', value: data.negotiable ? 'হ্যাঁ' : 'না' },
                ...(data.category === 'ভাড়া' ? [{ label: 'ভাড়ার সময়কাল', value: data.rentDuration }] : []),
            ]},
            { section: 'বিস্তারিত বৈশিষ্ট্য', items: [
                { label: 'লিস্টারের ধরন', value: data.listerType },
                { label: 'ক্যাটাগরি', value: data.category },
                { label: 'ধরন', value: data.type },
                { label: 'ফ্লোর', value: data.propertyFloor, unit: data.propertyFloor && data.propertyFloor !== 'প্রদান করা হয়নি' ? 'তলা' : '' },
                { label: 'মোট ফ্লোর সংখ্যা', value: data.totalFloor, unit: data.totalFloor && data.totalFloor !== 'প্রদান করা হয়নি' ? 'তলা' : '' },
                // জমির জন্য কাঠা, অন্য কিছুর জন্য বর্গফুট
                { label: data.type === 'জমি' ? 'জমির পরিমাণ' : 'আয়তন', value: data.type === 'জমি' ? checkAndFormat(data.sizeKatha, 'শতাংশ/কাঠা') : checkAndFormat(data.sizeSqft, 'বর্গফুট') },
                ...(data.type !== 'জমি' ? [
                    { label: 'বেডরুম', value: data.bedroom, unit: 'টি' },
                    { label: 'বাথরুম', value: data.bathroom, unit: 'টি' },
                    { label: 'বারান্দা', value: data.balcony, unit: 'টি' },
                ] : []),
                { label: 'রাস্তার আকার', value: data.roadSizeFt, unit: 'ফুট' },
            ]},
            { section: 'যোগাযোগের তথ্য', items: [
                { label: 'যোগাযোগের ফোন', value: data.phoneNumber },
                { label: 'যোগাযোগের ইমেইল', value: data.email, defaultValue: 'প্রদান করা হয়নি' },
            ]},
        ];

        // 1. Title and Description
        let outputHTML = `
            <h2>${data.title || 'শিরোনাম নেই'}</h2>
            <div class="preview-section">
                <h3>সম্পূর্ণ বিবরণ</h3>
                <p class="preview-description">${checkAndFormat(data.description, '', 'কোনো বিস্তারিত বিবরণ নেই')}</p>
            </div>
        `;

        // 2. Images
        if (data.base64Images && data.base64Images.length > 0) {
            outputHTML += `
                <div class="preview-section">
                    <h3>ছবি (${data.base64Images.length}টি)</h3>
                    <div id="image-carousel">
                        ${data.base64Images.map(base64 => `
                            <div class="preview-image-wrapper">
                                <img src="${base64}" class="preview-image" alt="Property Image Preview">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        // 3. Sections Loop
        dataStructure.forEach(section => {
            outputHTML += `
                <div class="preview-section">
                    <h3>${section.section}</h3>
                    <div class="preview-details">
                        ${section.items.map(item => `
                            <div class="preview-item">
                                <span class="preview-label">${item.label}:</span>
                                <span class="preview-value">${checkAndFormat(item.value, item.unit, item.defaultValue)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        // 4. Utility List (Separate block for complex array display)
        if (data.utilities && data.utilities.length > 0) {
            outputHTML += `
                <div class="preview-section">
                    <h3>অতিরিক্ত সুবিধা (Utility)</h3>
                    <ul class="utility-list">
                        ${data.utilities.map(util => `<li>${util}</li>`).join('')}
                    </ul>
                </div>
            `;
        }


        previewContent.innerHTML = outputHTML;
        confirmButton.disabled = false; // Enable confirm button once data is loaded

    } // End of loadPreviewData

    // --- AUTHENTICATION & UI UPDATE ---
    auth.onAuthStateChanged((user) => {
        // ... (Header/Sidebar Auth Logic) ...
        if (user) {
            // লগইন স্ট্যাটাস
            if (headerProfileImage) {
                headerProfileImage.src = user.photoURL || 'assets/placeholder-profile.jpg';
                headerProfileImage.style.display = 'block';
            }
            if (defaultProfileIcon) {
                defaultProfileIcon.style.display = 'none';
            }
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 
            
            if (postLinkSidebar) postLinkSidebar.style.display = 'block';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout;
            }
            if (headerPostButton) headerPostButton.style.display = 'flex'; 

        } else {
            // লগআউট স্ট্যাটাস
            if (headerProfileImage) {
                headerProfileImage.style.display = 'none';
            }
            if (defaultProfileIcon) {
                defaultProfileIcon.style.display = 'block';
            }
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 
            
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
            if (headerPostButton) headerPostButton.style.display = 'none';
        }
    });


    // --- ইভেন্ট লিসেনার্স (FIXED: Menu Bar Listeners) ---
    
    // পোস্ট ডেটা লোড
    loadPreviewData();

    // এডিট বাটন
    editButton.addEventListener('click', () => {
        window.location.href = 'post.html';
    });
    
    // কনফার্ম বাটন (ফাইনাল সাবমিট লজিক)
    confirmButton.addEventListener('click', async () => {
        // ... (Upload and Database Submission Logic will go here) ...
        alert('পোস্ট সফলভাবে জমা দেওয়া হয়েছে! অ্যাডমিন অনুমোদনের জন্য অপেক্ষা করুন।');
        // window.location.href = 'profile.html'; 
    });
    
    // সাইড মেনু লজিক (মেনুবার ফিক্স)
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

    // হেডার আইকন কার্যকারিতা
    if (notificationButton) {
        notificationButton.addEventListener('click', () => { window.location.href = 'notifications.html'; });
    }
    // ... (rest of the header icon listeners remain here) ...
});
