// index.js

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

// --- ⭐ প্রোফাইল ইমেজ লোড করার ফাংশন ⭐ ---
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
                    profileImage.style.display = 'none';
                    defaultProfileIcon.style.display = 'block';
                }
            }
        } catch (error) {
            console.error("Profile picture load failed:", error);
            profileImage.style.display = 'none';
            defaultProfileIcon.style.display = 'block';
        }
    }
}
// --- প্রোফাইল ইমেজ লোড করার ফাংশন শেষ ---


// --- প্রধান ফাংশন: প্রপার্টি লোড ও প্রদর্শন (স্থায়ী ফিক্স) ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    
    // লোডিং মেসেজ সেট করা
    propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';
    
    let query = db.collection('properties');
    
    // ১. ক্যাটাগরি ফিল্টার: শুধুমাত্র 'সকল' বা খালি না হলে ক্যাটাগরি দ্বারা ফিল্টার করা হবে
    if (category && category !== 'সকল' && category !== '' && category !== 'map') {
        // 🔥 ফিক্সড: index.html থেকে আসা data-category মান ব্যবহার করা হচ্ছে
        query = query.where('category', '==', category);
    }
    
    // ২. স্ট্যাটাস ফিল্টার: শুধুমাত্র 'published' পোস্ট লোড করা (preview.js থেকে নিশ্চিত)
    query = query.where('status', '==', 'published');
    
    // ৩. সার্চ টার্ম ফিল্টার (যদি থাকে)
    if (searchTerm) {
        // ... (সার্চ লজিক) ...
    }

    try {
        // ৪. সময় অনুসারে সাজানো এবং কোয়েরি চালানো
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        // প্রপার্টি গ্রিড পরিষ্কার করা
        propertyG.innerHTML = '';
        
        if (snapshot.empty) {
            propertyG.innerHTML = `<p class="empty-message">এই ফিল্টারে কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।</p>`;
            return;
        }

        let htmlContent = ''; 
        
        // ৫. ডেটা রেন্ডারিং
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // ডিফল্ট বা প্রথম ছবি ব্যবহার করা
            const imageUrl = (data.images && data.images.length > 0 && data.images[0].url) ? data.images[0].url : 'placeholder.jpg';
            
            // দাম বা ভাড়ার জন্য টেক্সট তৈরি করা
            let priceText = '';
            if (data.price) {
                priceText = `${data.price}`;
            } else if (data.monthlyRent) {
                priceText = `${data.monthlyRent}/মাস`;
            } else {
                priceText = 'দাম আলোচনা সাপেক্ষ';
            }
            
            const finalPriceText = priceText.includes('আলোচনা সাপেক্ষ') ? priceText : `৳ ${priceText}`;
            
            const cardHtml = `
                <div class="property-card" data-id="${doc.id}" onclick="window.location.href='details.html?id=${doc.id}'">
                    <img src="${imageUrl}" alt="${data.title}">
                    <div class="card-info">
                        <h3>${data.title}</h3>
                        <p class="location"><i class="material-icons">location_on</i> ${data.location && data.location.district ? data.location.district : 'অজানা জেলা'}</p>
                        <p class="price">${finalPriceText}</p>
                    </div>
                </div>
            `;
            htmlContent += cardHtml; 
        });
        
        // লুপের বাইরে একবার মাত্র DOM আপডেট করা
        propertyG.innerHTML = htmlContent; 
        
    } catch (error) {
        // 🚨 সবচেয়ে গুরুত্বপূর্ণ অংশ: ফায়ারবেস ইনডেক্স মিসিং!
        if (error.code === 'failed-precondition' && error.message.includes('The query requires an index')) {
             console.error("🔥🔥 মারাত্মক ত্রুটি: ফায়ারস্টোর ইনডেক্স প্রয়োজন 🔥🔥", error);
             propertyG.innerHTML = `
                <p class="error-message" style="color: red; font-weight: bold;">ইনডেক্সিং সমস্যা: ডেটাবেস থেকে ডেটা আনতে আপনার ফায়ারস্টোর কনসোলে একটি কম্পোজিট ইনডেক্স তৈরি করা প্রয়োজন।</p>
                <p style="color: black; font-size: 0.9em;">ত্রুটিটি ফায়ারস্টোর কনসোলে দেখুন এবং ইনডেক্স লিংকটি অনুসরণ করে তৈরি করুন।</p>
             `;
             // যদি এই error.message এ কোনো ইনডেক্স লিংক থাকে, তাহলে আপনি সেটি এখানে দেখাতে পারেন।
        } else {
            console.error("প্রপার্টি লোড করতে ব্যর্থ হয়েছে:", error);
            propertyG.innerHTML = '<p class="error-message" style="color: red;">প্রপার্টি লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে কনসোল চেক করুন।</p>';
        }
    }
}
// --- প্রধান ফাংশন শেষ ---


// ... (লগআউট, কাউন্টার, ইভেন্ট লিসেনার ফাংশনগুলো অপরিবর্তিত) ...

// ইভেন্ট লিসেনার সেটআপ
function setupUIEventListeners() {
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
    
    // ... (অন্যান্য বাটন রিডাইরেক্ট) ...
    
    // প্রপার্টি ক্যাটাগরি ফিল্টার
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.dataset.category;
            
            // ম্যাপ বাটন ক্লিক করলে গ্রিড ও ম্যাপ টগল
            if (category === 'map') {
                document.getElementById('property-grid-container').style.display = 'none';
                document.getElementById('map-section').style.display = 'block';
                // ম্যাপ লোড করার ফাংশন এখানে কল করতে হবে
            } else {
                document.getElementById('property-grid-container').style.display = 'block';
                document.getElementById('map-section').style.display = 'none';
                fetchAndDisplayProperties(category, globalSearchInput.value); 
            }
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
    setupUIEventListeners();
    
    // 🔥 চূড়ান্ত ফিক্স: প্রাথমিক লোড
    // ডিফল্টভাবে 'বিক্রয়' ক্যাটাগরি সহ স্ট্যাটাস 'published' ফিল্টার করা হবে
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    // Auth State Change Handler 
    auth.onAuthStateChanged(user => {
        // ... (Auth লজিক) ...
    });

});
