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

    // --- NEW: UI Elements for Header and Sidebar ---
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


    // --- NEW: Function to load user profile info to update header UI ---
    function loadHeaderProfile(user) {
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

    // --- NEW: Logout Handler ---
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
    
    
    // --- NEW: Function to load and pre-fill data from session storage for editing ---
    function loadStagedData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata'); 
        // ... (বাকি loadStagedData ফাংশন লজিক)
    }

    // --- বিদ্যমান Auth State Change লজিক ---
    const propertyFormDisplay = document.getElementById('property-form-display');
    const authWarningMessage = document.getElementById('auth-warning-message');
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');
    const primaryPhoneInput = document.getElementById('primary-phone');

    auth.onAuthStateChanged(user => {
        if (user) {
            // ✅ NEW: Load header profile
            loadHeaderProfile(user); 
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; // প্রোফাইল ইমেজ দেখান

            if (propertyFormDisplay) propertyFormDisplay.style.display = 'block';
            if (authWarningMessage) authWarningMessage.style.display = 'none';
            
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout; // ✅ লগআউট হ্যান্ডেলার যুক্ত
            }
            
             if (primaryPhoneInput) {
                primaryPhoneInput.value = '01712345678'; 
                primaryPhoneInput.disabled = false; 
             }
             
             // NEW: Load staged data on successful auth
             loadStagedData();

        } else {
             // ✅ NEW: Hide profile image when logged out
            if (headerProfileImage && defaultProfileIcon) {
                headerProfileImage.style.display = 'none';
                defaultProfileIcon.style.display = 'block';
            }
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; // আইকন/র‍্যাপার রাখা হলো
            
            if (propertyFormDisplay) propertyFormDisplay.style.display = 'none';
            if (authWarningMessage) authWarningMessage.style.display = 'block';
            
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
    
    // Set the initial submit button text
    if (submitBtn) {
         submitBtn.textContent = 'এগিয়ে যান';
    }


    // --- ✅ NEW: হেডার আইকন কার্যকারিতা যুক্ত করা হলো ---
    
    // সাইডবার টগল
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

    // প্লাস আইকন (পোস্ট)
    if (headerPostButton) {
        headerPostButton.addEventListener('click', () => {
            // যেহেতু এটি পোস্ট পেজ, তাই অন্য কোনো অ্যাকশন না করে রিলোড/কনসোল লগ করা যেতে পারে
            console.log("Already on Post Page."); 
            // window.location.href = 'post.html';
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

    // --- (বাকি বিদ্যমান ফাংশন লজিক এখানে থাকবে, যেমন dynamic field generation, form submission, image upload) --- 

});
