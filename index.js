// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
// ... বিদ্যমান উপাদান ...
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// ✅ নতুন/পরিবর্তিত UI উপাদান
const notificationButton = document.getElementById('notificationButton'); 
const messageButton = document.getElementById('messageButton');
const headerPostButton = document.getElementById('headerPostButton'); 
const profileImageWrapper = document.getElementById('profileImageWrapper'); // wrapper
const profileImage = document.getElementById('profileImage'); // img element
const defaultProfileIcon = document.getElementById('defaultProfileIcon'); // default icon

// কাউন্টার
const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');
const postCount = document.getElementById('post-count'); // নতুন পোস্ট কাউন্টার

const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const globalSearchInput = document.getElementById('globalSearchInput');
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');

// ... (fetchAndDisplayProperties এবং createPropertyCard ফাংশন অপরিবর্তিত থাকবে) ...
async function fetchAndDisplayProperties(category, searchTerm = '') {
    // ... (পূর্বের কোড)
}
function createPropertyCard(property, id) {
    // ... (পূর্বের কোড)
}
function toggleMapAndGrid(showMap) {
    // ... (পূর্বের কোড)
}


// --- ২. ইভেন্ট লিসেনার সেটআপ করা ---
function setupUIEventListeners() {
    
    // সাইড মেনু খোলার/বন্ধ করার কার্যকারিতা
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
    
    // প্রোফাইল ছবি/আইকনে ক্লিক করলে
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }

    // নোটিফিকেশন বাটনে ক্লিক করলে
    if (notificationButton) {
        notificationButton.addEventListener('click', () => {
            window.location.href = 'notifications.html'; 
        });
    }

    // ম্যাসেজ বাটনে ক্লিক করলে
    if (messageButton) {
        messageButton.addEventListener('click', () => {
            window.location.href = 'messages.html'; 
        });
    }
    
    // পোস্ট বাটনে ক্লিক করলে
    if (headerPostButton) {
        headerPostButton.addEventListener('click', () => {
            window.location.href = 'post.html';
        });
    }


    // ... (নেভিগেশন/ফিল্টার বাটন লজিক এবং গ্লোবাল সার্চ লজিক অপরিবর্তিত থাকবে) ...
    const navButtons = document.querySelectorAll('.nav-filters .nav-button');
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // ... (পূর্বের কোড)
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const category = button.getAttribute('data-category');
            
            if (category === 'map') {
                toggleMapAndGrid(true);
            } else {
                toggleMapAndGrid(false);
                fetchAndDisplayProperties(category, ''); 
            }
        });
    });

    globalSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = globalSearchInput.value.trim();
            const activeCategory = document.querySelector('.nav-filters .nav-button.active');
            let category = 'বিক্রয়'; 
            // ... (পূর্বের কোড)
            fetchAndDisplayProperties(category, searchTerm);
        }
    });
}

// --- ৩. নোটিফিকেশন কাউন্টার আপডেট করা (ডামি ডেটা) ---
function updateIconCounts() {
    // এই ফাংশনটি Firebase থেকে আসল কাউন্ট লোড করবে।
    // আপাতত UI দেখানোর জন্য ডামি ডেটা ব্যবহার করা হলো:

    // ডামি নোটিফিকেশন কাউন্ট
    const notifCount = 3; 
    if (notifCount > 0) {
        notificationCount.textContent = notifCount;
        notificationCount.style.display = 'block';
    } else {
        notificationCount.style.display = 'none';
    }

    // ডামি ম্যাসেজ কাউন্ট
    const msgCount = 1; 
    if (msgCount > 0) {
        messageCount.textContent = msgCount;
        messageCount.style.display = 'block';
    } else {
        messageCount.style.display = 'none';
    }
    
    // ডামি পোস্ট কাউন্ট (এটি নতুন পোস্ট আপডেটের সংখ্যা হতে পারে, বা আপাতত 0 রাখা হলো)
    const newPostCount = 0; 
    if (newPostCount > 0) {
        postCount.textContent = newPostCount;
        postCount.style.display = 'block';
    } else {
        postCount.style.display = 'none';
    }
}


// --- ৪. প্রোফাইল ছবি লোড করা ---
async function loadProfilePicture(user) {
    if (user.photoURL) {
        // যদি Firebase এ photoURL থাকে, তবে সেটি ব্যবহার করা হবে
        profileImage.src = user.photoURL;
        profileImage.style.display = 'block';
        defaultProfileIcon.style.display = 'none';
    } else {
        // যদি ছবি না থাকে বা লোড করতে ব্যর্থ হয়, তবে ডিফল্ট আইকন দেখানো হবে
        profileImage.style.display = 'none';
        defaultProfileIcon.style.display = 'block';
        
        // যদি আপনি ফায়ারস্টোর থেকে ছবি আনতে চান তবে এই লজিকটি এখানে যুক্ত করুন
        // যেমন: userDoc.data().profileImageUrl
    }
}


// --- ৫. লগআউট হ্যান্ডেলার ---
const handleLogout = async () => {
    try {
        await auth.signOut();
        alert('সফলভাবে লগআউট করা হয়েছে!');
        window.location.reload();
    } catch (error) {
        console.error("লগআউট ব্যর্থ হয়েছে:", error);
        alert("লগআউট ব্যর্থ হয়েছে।");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // সকল ইভেন্ট লিসেনার সেটআপ করা হলো
    setupUIEventListeners();
    
    // প্রাথমিক লোড: ডিফল্টভাবে 'বিক্রয়' ক্যাটাগরি দেখাবে
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    // Auth State Change Handler 
    auth.onAuthStateChanged(user => {
        
        if (user) {
            // লগইন থাকলে
            loadProfilePicture(user); // প্রোফাইল ছবি লোড করা
            updateIconCounts(); // আইকন কাউন্টার আপডেট করা (ডামি)
            
            // if (postLink) postLink.style.display = 'flex'; // postLink নেই, তাই কমেন্ট করা হলো
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; // ছবি দেখানোর জন্য flex
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                // লগআউট লিসেনার সেট করা
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            // লগইন না থাকলে
            profileImage.style.display = 'none';
            defaultProfileIcon.style.display = 'block';
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; // ডিফল্ট আইকন দেখাতে হবে

            // সমস্ত কাউন্টার লুকানো
            notificationCount.style.display = 'none';
            messageCount.style.display = 'none';
            postCount.style.display = 'none';
            
            // if (postLink) postLink.style.display = 'none'; // postLink নেই
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });

});
