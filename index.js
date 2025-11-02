// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const postLink = document.getElementById('post-link'); 
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const profileButton = document.getElementById('profileButton');
const messageButton = document.getElementById('messageButton');
const messagesLinkSidebar = document.getElementById('messages-link-sidebar');


const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const globalSearchInput = document.getElementById('globalSearchInput');
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');


// --- ১. প্রপার্টি লোডিং এবং ডিসপ্লে লজিক ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    // এখানে আপনার প্রপার্টি লোডিং এবং গ্রিডে ডিসপ্লে করার লজিক থাকবে।
    
    propertyG.innerHTML = `
        <div style="text-align: center; padding: 20px; font-size: 1.2em; color: #007bff;">
            ${category === 'map' ? 'ম্যাপ ভিউ লোড হচ্ছে...' : `${category} ক্যাটাগরির প্রপার্টি লোড হচ্ছে...`}
        </div>
    `;
    
    setTimeout(() => {
        propertyG.innerHTML = `
             <h3 style="width: 100%; text-align: center; margin: 20px 0;">
                ${category === 'map' ? 'এখানে ম্যাপ ভিউ প্রদর্শিত হবে' : `${category} ক্যাটাগরির প্রপার্টি`} 
             </h3>
             <div style="width: 100%; text-align: center; padding: 10px; color: #6c757d;">
                (যদি ডেটা না থাকে, তবে এখানে কোনো কার্ড দেখাবে না)
             </div>
        `;
    }, 500);
}

// --- ২. ফিল্টার এবং UI লজিক ---

function setupUIEventListeners() {
    
    // হেডার নেভিগেশন (বিক্রয়/ভাড়া/ম্যাপ)
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            fetchAndDisplayProperties(category, globalSearchInput.value);
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
    
    // ম্যাসেজ বাটন ক্লিক লজিক
    if (messageButton) {
        messageButton.addEventListener('click', () => {
            if (auth.currentUser) {
                window.location.href = 'messages.html'; 
            } else {
                alert("মেসেজ দেখার জন্য আপনাকে লগইন করতে হবে।");
                window.location.href = 'auth.html';
            }
        });
    }
    
    // সার্চ ইনপুট ইভেন্ট লিসেনার
    if (globalSearchInput) {
        globalSearchInput.addEventListener('keypress', (e) => {
             if (e.key === 'Enter') {
                 const activeCategory = document.querySelector('.nav-button.active').dataset.category;
                 fetchAndDisplayProperties(activeCategory, globalSearchInput.value);
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
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    // Auth State Change Handler 
    auth.onAuthStateChanged(user => {
        
        if (user) {
            // লগইন থাকলে
            if (postLink) postLink.style.display = 'flex'; 
            if (profileButton) profileButton.style.display = 'inline-block';
            
            // ম্যাসেজ আইকন এখন inline-flex হিসাবে দেখানো হবে
            if (messageButton) messageButton.style.display = 'inline-flex'; 
            if (messagesLinkSidebar) messagesLinkSidebar.style.display = 'flex';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            // লগইন না থাকলে
            if (postLink) postLink.style.display = 'none';
            if (profileButton) profileButton.style.display = 'none';
            
            // ম্যাসেজ আইকন এবং সাইডবার লিঙ্ক লুকিয়ে রাখছে
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
