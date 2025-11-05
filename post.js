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

// --- নতুন ফাংশন: হেডার প্রোফাইল লোড করার জন্য ---
function loadHeaderProfile(user) {
    const headerProfileImage = document.getElementById('profileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');

    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.profilePictureUrl && headerProfileImage && defaultProfileIcon) {
                headerProfileImage.src = data.profilePictureUrl;
                headerProfileImage.style.display = 'block';
                defaultProfileIcon.style.display = 'none';
            }
        }
    }).catch(error => {
        console.error("Header profile load failed:", error);
    });
}

// --- নতুন ফাংশন: লগআউট হ্যান্ডেলার ---
const handleLogout = async (e) => {
    e.preventDefault();
    try {
        await auth.signOut();
        alert('সফলভাবে লগআউট করা হয়েছে!');
        window.location.href = 'index.html';
    } catch (error) {
        console.error("লগআউট ব্যর্থ হয়েছে:", error);
        alert("লগআউট ব্যর্থ হয়েছে।");
    }
};

document.addEventListener('DOMContentLoaded', function() {
    
    // --- UI উপাদানগুলো (হেডার/সাইডবার + পোস্ট পেজ লজিকের জন্য) ---
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');
    const propertyFormDisplay = document.getElementById('property-form-display');
    const authWarningMessage = document.getElementById('auth-warning-message');
    
    const primaryPhoneInput = document.getElementById('primary-phone');
    
    // হেডার/সাইডবারের উপাদান
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    const profileImageWrapper = document.getElementById('profileImageWrapper'); 
    const headerProfileImage = document.getElementById('profileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');


    // --- বিদ্যমান Function: loadStagedData ---
    function loadStagedData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata'); 
        // ... (loadStagedData এর বাকি লজিক এখানে থাকবে)
    }

    // --- Auth State Change লজিক (পোস্ট পেজ ও হেডার আপডেট) ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // ✅ হেডার প্রোফাইল লোড
            loadHeaderProfile(user); 
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 

            // পোস্ট পেজের মূল লজিক (লগইন)
            if (propertyFormDisplay) propertyFormDisplay.style.display = 'block';
            if (authWarningMessage) authWarningMessage.style.display = 'none';
            
            // সাইডবার আপডেট
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout; 
            }
            
             if (primaryPhoneInput) {
                // এই লজিকটি ইউজার ডেটা থেকে ফোন নম্বর প্রি-ফিল করতে পারে, যা এখানে রাখা হলো
                primaryPhoneInput.value = '01712345678'; 
                primaryPhoneInput.disabled = false; 
             }
             
             loadStagedData();

        } else {
            // লগআউট অবস্থায় হেডার আইকন এবং ফর্ম লুকানো/পরিবর্তন
            if (headerProfileImage && defaultProfileIcon) {
                headerProfileImage.style.display = 'none';
                defaultProfileIcon.style.display = 'block';
            }
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex';
            
            // পোস্ট পেজের মূল লজিক (লগআউট)
            if (propertyFormDisplay) propertyFormDisplay.style.display = 'none';
            if (authWarningMessage) authWarningMessage.style.display = 'block';
            
            // সাইডবার আপডেট
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
            if (primaryPhoneInput) {
                primaryPhoneInput.value = '';
                primaryPhoneInput.disabled = true;
            }
        }
    });
    
    // Set the initial submit button text (পোস্ট পেজের মূল লজিক)
    if (submitBtn) {
         submitBtn.textContent = 'এগিয়ে যান';
    }


    // --- হেডার আইকন কার্যকারিতা (নতুন এবং কার্যক্ষম) ---
    
    // মেনু বাটন এবং সাইডবার টগল
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

    // নোটিফিকেশন আইকন
    if (notificationButton) {
        notificationButton.addEventListener('click', () => {
             window.location.href = 'notifications.html'; 
        });
    }

    // প্লাস আইকন (পোস্ট) - যেহেতু এটি পোস্ট পেজ, এটি রিডাইরেক্ট করবে না
    if (headerPostButton) {
        headerPostButton.addEventListener('click', () => {
            console.log("Already on Post Page. You can add more complex logic here if needed."); 
        });
    }

    // ম্যাসেজ আইকন
    if (messageButton) {
        messageButton.addEventListener('click', () => {
             window.location.href = 'messages.html';
        });
    }
    
    // প্রোফাইল ইমেজ
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }


    // --- বিদ্যমান পোস্ট পেজের অন্যান্য লজিক (যেমন: dynamic field generation, form submission, image upload) এখানে থাকবে --- 


});
