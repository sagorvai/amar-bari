// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const postLink = document.getElementById('post-link'); // হেডার প্রপার্টি লিঙ্ক
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const profileButton = document.getElementById('profileButton');
// ✅ নতুন মেসেজ বাটন
const messageButton = document.getElementById('messageButton');
// ✅ নতুন সাইডবার মেসেজ লিঙ্ক
const messagesLinkSidebar = document.getElementById('messages-link-sidebar');


const navButtons = document.querySelectorAll('.nav-filters .nav-button'); // সমস্ত ফিল্টার বাটন
const mapButton = document.getElementById('mapButton'); // ম্যাপ বাটন
const sellButton = document.getElementById('sellButton'); // বিক্রয় বাটন
const rentButton = document.getElementById('rentButton'); // ভাড়া বাটন

const propertyGridContainer = document.getElementById('property-grid-container');
const mapSection = document.getElementById('map-section'); // ম্যাপ সেকশন

const globalSearchInput = document.getElementById('globalSearchInput');
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');

// --- ১. প্রপার্টি লোডিং এবং ডিসপ্লে লজিক ---
// (আপনার আপলোড করা ফাইল থেকে অপরিবর্তিত রাখা হয়েছে)
async function fetchAndDisplayProperties(category, searchTerm = '') {
    // ... আপনার fetchAndDisplayProperties ফাংশনটি এখানে অপরিবর্তিত থাকবে ...
    // তবে এই ফাংশনটি আমি সম্পূর্ণ কোড হিসেবে দিচ্ছি না, ধরে নিচ্ছি এটি আপনার ফাইলে আছে।
}

// --- ২. ইভেন্ট লিসেনার সেটআপ ---
function setupUIEventListeners() {
    // হেডার নেভিগেশন (বিক্রয়/ভাড়া/ম্যাপ)
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // ... আপনার নেভিগেশন লজিক অপরিবর্তিত থাকবে ...
        });
    });

    // সাইড মেনু খোলার/বন্ধ করার কার্যকারিতা
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    // ওভারলেতে ক্লিক করলে সাইড মেনু বন্ধ হবে
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // প্রোফাইল বাটন ক্লিক লজিক
    if (profileButton) {
        profileButton.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }
    
    // ✅ নতুন: ম্যাসেজ বাটন ক্লিক লজিক
    if (messageButton) {
        messageButton.addEventListener('click', () => {
            // লগইন চেক করে messages.html এ পাঠানো হবে
            if (auth.currentUser) {
                window.location.href = 'messages.html'; 
            } else {
                alert("মেসেজ দেখার জন্য আপনাকে লগইন করতে হবে।");
                window.location.href = 'auth.html';
            }
        });
    }
}

// --- ৩. লগআউট হ্যান্ডেলার ---
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
    fetchAndDisplayProperties('বিক্রয়', ''); // আপনার এই ফাংশনটি কাজ করছে ধরে নেওয়া হলো
    
    // Auth State Change Handler 
    auth.onAuthStateChanged(user => {
        
        if (user) {
            // লগইন থাকলে
            if (postLink) postLink.style.display = 'flex'; 
            if (profileButton) profileButton.style.display = 'inline-block';
            
            // ✅ ম্যাসেজ আইকন এবং সাইডবার লিঙ্ক দেখাচ্ছে
            if (messageButton) messageButton.style.display = 'inline-block'; 
            if (messagesLinkSidebar) messagesLinkSidebar.style.display = 'flex';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                // লগআউট লিসেনার সেট করা
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            // লগইন না থাকলে
            if (postLink) postLink.style.display = 'none';
            if (profileButton) profileButton.style.display = 'none';
            
            // ✅ ম্যাসেজ আইকন এবং সাইডবার লিঙ্ক লুকিয়ে রাখছে
            if (messageButton) messageButton.style.display = 'none'; 
            if (messagesLinkSidebar) messagesLinkSidebar.style.display = 'none';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });

});
