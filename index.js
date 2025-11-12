// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// ✅ নেভিগেশন ও প্রোফাইল উপাদান
const notificationButton = document.getElementById('notificationButton'); 
const messageButton = document.getElementById('messageButton');
const headerPostButton = document.getElementById('headerPostButton'); 
const profileImageWrapper = document.getElementById('profileImageWrapper'); 
const profileImage = document.getElementById('profileImage'); 
const defaultProfileIcon = document.getElementById('defaultProfileIcon'); 

// ✅ কাউন্টার উপাদান
const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');
const postCount = document.getElementById('post-count'); 

const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');
const globalSearchInput = document.getElementById('globalSearchInput');

// --- ⭐ FIX: প্রোফাইল ইমেজ লোড করার ফাংশন যোগ করা হলো ⭐ ---
async function loadProfilePicture(user) {
    if (profileImage && defaultProfileIcon) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.profilePictureUrl) {
                    profileImage.src = data.profilePictureUrl;
                    profileImage.style.display = 'block';
                    defaultProfileIcon.style.display = 'none';
                } else {
                    // যদি URL না থাকে, ডিফল্ট আইকন দেখান
                    profileImage.style.display = 'none';
                    defaultProfileIcon.style.display = 'block';
                }
            }
        } catch (error) {
            console.error("Profile picture load failed:", error);
            // কোনো সমস্যা হলে ডিফল্ট আইকন দেখান
            profileImage.style.display = 'none';
            defaultProfileIcon.style.display = 'block';
        }
    }
}
// --- FIX: প্রোফাইল ইমেজ লোড করার ফাংশন শেষ ---


// --- অন্যান্য ফাংশন ---

async function fetchAndDisplayProperties(category, searchTerm = '') {
    // ... (পূর্বের কোড)
    
    propertyG.innerHTML = '<p class=\"loading-message\">প্রপার্টি লোড হচ্ছে...</p>';
    
    let query = db.collection('properties').where('category', '==', category);
    
    // ... (পূর্বের কোড)
    
}

// লগআউট হ্যান্ডেলার
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

// আইকন কাউন্টার আপডেট করার ডামি ফাংশন (যদি ফায়ারবেস লজিক থাকে)
function updateIconCounts() {
    // এই ফাংশন ফায়ারবেস থেকে নোটিফিকেশন/মেসেজ কাউন্ট লোড করবে
    // এখন এটি শুধু ডামি ডেটা দেখাচ্ছে
    if (notificationCount) {
        notificationCount.textContent = 5;
        notificationCount.style.display = 'block';
    }
    if (messageCount) {
        messageCount.textContent = 3;
        messageCount.style.display = 'block';
    }
    if (postCount) {
        postCount.textContent = 1;
        postCount.style.display = 'block';
    }
}

// ইভেন্ট লিসেনার সেটআপ
function setupUIEventListeners() {
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
    
    // নেভিগেশন আইকন রিডাইরেক্ট
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
    
    // প্রপার্টি ক্যাটাগরি ফিল্টার
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.dataset.category;
            fetchAndDisplayProperties(category, globalSearchInput.value);
        });
    });

    // গ্লোবাল সার্চ ইনপুট ইভেন্ট
    globalSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const activeCategory = document.querySelector('.nav-filters .nav-button.active').dataset.category;
            fetchAndDisplayProperties(activeCategory, globalSearchInput.value);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // সকল ইভেন্ট লিসেনার সেটআপ করা হলো
    setupUIEventListeners();
    
    // প্রাথমিক লোড: ডিফল্টভাবে 'বিক্রয়' ক্যাটাগরি দেখাবে
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    // Auth State Change Handler 
    auth.onAuthStateChanged(user => {
        
        if (user) {
            // লগইন থাকলে
            loadProfilePicture(user); 
            updateIconCounts(); 
            
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            // লগইন না থাকলে
            profileImage.style.display = 'none';
            defaultProfileIcon.style.display = 'block';
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 

            notificationCount.style.display = 'none';
            messageCount.style.display = 'none';
            postCount.style.display = 'none';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });

});
