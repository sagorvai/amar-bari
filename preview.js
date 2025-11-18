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

    // হেডার আইকন এবং বাটন এলিমেন্টগুলো (আইকন ফিক্সের জন্য নিশ্চিত করা হলো)
    const profileImage = document.getElementById('profileImage');
    const profileImageWrapper = document.getElementById('profileImageWrapper');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon'); // assuming this element is in your header HTML
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
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
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0) || value === 'N/A') {
            return defaultValue;
        }
        // Array handling for utilities (displays as a styled list)
        if (Array.isArray(value)) {
             const listItems = value.map(item => `<li>${item}</li>`).join('');
             return `<ul class="utility-list">${listItems}</ul>`;
        }
        // Handle multiline description
        if (typeof value === 'string' && value.includes('\n')) {
             return value.replace(/\n/g, '<br>');
        }
        return `${value} ${unit}`.trim();
    }

    // Function to render the preview data (Extensively updated to show all fields)
    const renderPreview = (data) => {
        if (!data || Object.keys(data).length === 0) {
            previewContent.innerHTML = '<div class="not-found">প্রিভিউ করার মতো কোনো ডেটা পাওয়া যায়নি। অনুগ্রহ করে পোস্ট করার পেজে ফিরে যান।</div>';
            return;
        }

        // ছবিগুলি রেন্ডার করুন
        let imageHTML = '';
        if (data.base64Images && data.base64Images.length > 0) {
            imageHTML = `<div class="preview-section image-carousel-section">
                            <h3>🖼️ প্রপার্টির ছবি (${data.base64Images.length}টি)</h3>
                            <div id="image-carousel">
                                ${data.base64Images.map((base64, index) => 
                                    `<div class="preview-image-wrapper">
                                        <img src="${base64}" alt="Property Image ${index + 1}" class="preview-image">
                                    </div>`
                                ).join('')}
                            </div>
                         </div>`;
        }

        // Location Details
        const locationDetails = `
            <div class="preview-section">
                <h3>📍 অবস্থান ও ঠিকানা</h3>
                <div class="preview-item"><span class="preview-label">বিভাগ:</span><span class="preview-value">${checkAndFormat(data.location.division)}</span></div>
                <div class="preview-item"><span class="preview-label">জেলা:</span><span class="preview-value">${checkAndFormat(data.location.district)}</span></div>
                ${data.location.upazila || data.location.thana ? `<div class="preview-item"><span class="preview-label">উপজেলা/থানা:</span><span class="preview-value">${checkAndFormat(data.location.upazila || data.location.thana)}</span></div>` : ''}
                ${data.location.cityCorporation ? `<div class="preview-item"><span class="preview-label">সিটি কর্পোরেশন:</span><span class="preview-value">${checkAndFormat(data.location.cityCorporation)}</span></div>` : ''}
                ${data.location.area ? `<div class="preview-item"><span class="preview-label">এলাকার নাম:</span><span class="preview-value">${checkAndFormat(data.location.area)}</span></div>` : ''}
                ${data.location.village ? `<div class="preview-item"><span class="preview-label">গ্রাম:</span><span class="preview-value">${checkAndFormat(data.location.village)}</span></div>` : ''}
                ${data.location.road ? `<div class="preview-item"><span class="preview-label">রোড:</span><span class="preview-value">${checkAndFormat(data.location.road)}</span></div>` : ''}
            </div>
        `;

        // Price/Area Details
        const priceAreaDetails = `
            <div class="preview-section">
                <h3>টাকা ও পরিমাণ</h3>
                <div class="preview-item"><span class="preview-label">মূল্য:</span><span class="preview-value">${checkAndFormat(data.price, 'টাকা')}</span></div>
                <div class="preview-item"><span class="preview-label">মূল্যের ধরন:</span><span class="preview-value">${checkAndFormat(data.priceType)}</span></div>
                ${data.deposit ? `<div class="preview-item"><span class="preview-label">ডিপোজিট/অগ্রিম:</span><span class="preview-value">${checkAndFormat(data.deposit, 'টাকা')}</span></div>` : ''}
                <div class="preview-item"><span class="preview-label">মোট পরিমাণ:</span><span class="preview-value">${checkAndFormat(data.areaSize, data.areaUnit || '')}</span></div>
                ${data.roadWidth ? `<div class="preview-item"><span class="preview-label">রাস্তার প্রস্থ:</span><span class="preview-value">${checkAndFormat(data.roadWidth, 'ফিট')}</span></div>` : ''}
            </div>
        `;
        
        // Property Details (Rooms, Bathrooms, Utilities, etc.)
        let propertyDetails = '';
        if (data.type !== 'জমি' && data.type !== 'প্লট') {
             propertyDetails = `
                 <div class="preview-section">
                    <h3>প্রপার্টি বিবরণ</h3>
                    ${data.propertyAge !== undefined ? `<div class="preview-item"><span class="preview-label">প্রপার্টির বয়স:</span><span class="preview-value">${checkAndFormat(data.propertyAge, 'বছর')}</span></div>` : ''}
                    ${data.facing ? `<div class="preview-item"><span class="preview-label">প্রপার্টির দিক:</span><span class="preview-value">${checkAndFormat(data.facing)}</span></div>` : ''}
                    ${data.parking ? `<div class="preview-item"><span class="preview-label">পার্কিং সুবিধা:</span><span class="preview-value">${checkAndFormat(data.parking)}</span></div>` : ''}
                    ${data.floors ? `<div class="preview-item"><span class="preview-label">তলা সংখ্যা:</span><span class="preview-value">${checkAndFormat(data.floors)}</span></div>` : ''}
                    ${data.floorNo ? `<div class="preview-item"><span class="preview-label">ফ্লোর নং:</span><span class="preview-value">${checkAndFormat(data.floorNo)}</span></div>` : ''}
                    ${data.rooms ? `<div class="preview-item"><span class="preview-label">রুম সংখ্যা:</span><span class="preview-value">${checkAndFormat(data.rooms, 'টি')}</span></div>` : ''}
                    ${data.bathrooms ? `<div class="preview-item"><span class="preview-label">বাথরুম সংখ্যা:</span><span class="preview-value">${checkAndFormat(data.bathrooms, 'টি')}</span></div>` : ''}
                    ${data.kitchen ? `<div class="preview-item"><span class="preview-label">কিচেন সংখ্যা:</span><span class="preview-value">${checkAndFormat(data.kitchen, 'টি')}</span></div>` : ''}
                    ${data.shopCount ? `<div class="preview-item"><span class="preview-label">দোকান সংখ্যা:</span><span class="preview-value">${checkAndFormat(data.shopCount, 'টি')}</span></div>` : ''}
                    ${data.utilities ? `<div class="preview-item"><span class="preview-label">সুবিধা:</span><span class="preview-value">${checkAndFormat(data.utilities)}</span></div>` : ''}
                 </div>
             `;
        }

        // Full Description
        const descriptionSection = `
            <div class="preview-section">
                <h3>সম্পূর্ণ বিবরণ</h3>
                <p class="preview-description">${checkAndFormat(data.description)}</p>
            </div>
        `;


        previewContent.innerHTML = `
            ${imageHTML}
            
            <div class="preview-section">
                <h3>🔑 প্রধান তথ্য</h3>
                <div class="preview-item"><span class="preview-label">শিরোনাম:</span><span class="preview-value">${checkAndFormat(data.title)}</span></div>
                <div class="preview-item"><span class="preview-label">পোস্ট ক্যাটাগরি:</span><span class="preview-value">${checkAndFormat(data.category)}</span></div>
                <div class="preview-item"><span class="preview-label">প্রপার্টির ধরন:</span><span class="preview-value">${checkAndFormat(data.type)}</span></div>
                <div class="preview-item"><span class="preview-label">লিস্টার টাইপ:</span><span class="preview-value">${checkAndFormat(data.listerType)}</span></div>
                ${data.moveInDate ? `<div class="preview-item"><span class="preview-label">ওঠার তারিখ:</span><span class="preview-value">${checkAndFormat(data.moveInDate)}</span></div>` : ''}
            </div>
            
            ${locationDetails}
            ${priceAreaDetails}
            ${propertyDetails}
            ${descriptionSection}
            
            <div class="preview-section">
                <h3>📞 যোগাযোগের তথ্য</h3>
                <div class="preview-item"><span class="preview-label">ফোন নম্বর:</span><span class="preview-value">${checkAndFormat(data.phoneNumber)}</span></div>
                ${data.secondaryPhone ? `<div class="preview-item"><span class="preview-label">অতিরিক্ত নম্বর:</span><span class="preview-value">${checkAndFormat(data.secondaryPhone)}</span></div>` : ''}
            </div>
        `;
        
        confirmButton.disabled = false;
    }

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
    
    // Function to handle the final post confirmation and Firebase upload (Placeholder)
    const handleConfirmPost = async () => {
        confirmButton.disabled = true; 
        confirmButton.innerHTML = `<i class="material-icons rotating">sync</i> পোস্ট করা হচ্ছে...`;

        // The actual Firebase upload logic is complex and omitted here.
        // It should handle data validation, image upload, and Firestore saving.
        
        // DEMO: Simulate success
        try {
             // Simulate image and data processing time
             await new Promise(resolve => setTimeout(resolve, 1500)); 
             
             sessionStorage.removeItem('stagedPropertyData');
             sessionStorage.removeItem('stagedImageMetadata');
             alert("পোস্ট সফলভাবে জমা দেওয়া হয়েছে। অনুমোদনের জন্য অপেক্ষা করুন।");
             window.location.href = 'dashboard.html'; 

        } catch (error) {
            console.error("পোস্ট করতে ব্যর্থ:", error);
            alert(`পোস্ট করতে সমস্যা হয়েছে: ${error.message}`);
            confirmButton.disabled = false;
            confirmButton.innerHTML = `<i class="material-icons" style="font-size: 1.2em; vertical-align: middle;">check_circle</i> নিশ্চিত করে পোস্ট করুন`;
        }
    }


    // --- প্রাথমিক ডেটা লোডিং ---
    const stagedData = JSON.parse(sessionStorage.getItem('stagedPropertyData'));
    const stagedImageMetadata = JSON.parse(sessionStorage.getItem('stagedImageMetadata')); 

    if (stagedData) {
        renderPreview(stagedData);
    } else {
        previewContent.innerHTML = '<div class="not-found">প্রিভিউ করার মতো কোনো ডেটা পাওয়া যায়নি। অনুগ্রহ করে পোস্ট করার পেজে ফিরে যান।</div>';
    }


    // --- ইভেন্ট লিসেনার ---
    editButton.addEventListener('click', () => {
        window.location.href = 'post.html';
    });

    confirmButton.addEventListener('click', handleConfirmPost);
    
    // --- Authentication & UI Update (আইকন ফিক্সের মূল লজিক) ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            // ব্যবহারকারী লগইন করা আছে
            if (profileImage) {
                profileImage.src = user.photoURL || 'assets/placeholder-profile.jpg';
                profileImage.style.display = 'block';
            }
             if (defaultProfileIcon) {
                defaultProfileIcon.style.display = 'none';
            }
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex';

            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout; 
            }
             if (postLinkSidebar) {
                postLinkSidebar.style.display = 'block';
            }
            const headerPostButton = document.getElementById('headerPostButton');
            if(headerPostButton) headerPostButton.style.display = 'flex'; 
            
        } else {
            // ব্যবহারকারী লগইন করা নেই
             if (profileImage) {
                profileImage.style.display = 'none';
            }
             if (defaultProfileIcon) {
                defaultProfileIcon.style.display = 'block';
            }
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 

            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
            if (postLinkSidebar) {
                postLinkSidebar.style.display = 'none';
            }
             const headerPostButton = document.getElementById('headerPostButton');
            if(headerPostButton) headerPostButton.style.display = 'none'; 
        }
    });

    // --- হেডার আইকন কার্যকারিতা (আইকন ফিক্স) ---
    // এই লজিকটি preview.html এর স্ক্রিপ্ট ব্লক থেকে নিয়ে এসে এখানে যোগ করা হয়েছে, যা সমস্যার সমাধান করবে।
    
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
    
    // সাইড মেনু লজিক (preview.html থেকে নিশ্চিত করা হলো)
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
