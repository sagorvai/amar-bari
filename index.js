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
// --- প্রোফাইল ইমেজ লোড করার ফাংশন শেষ ---


// --- প্রধান ফাংশন: প্রপার্টি লোড ও প্রদর্শন (স্থায়ী ফিক্স) ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    
    // লোডিং মেসেজ সেট করা
    propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';
    
    let query = db.collection('properties');
    
    // ১. ক্যাটাগরি ফিল্টার: ডেটাবেস ভ্যালু অনুযায়ী ক্যাটাগরি ধরে ডেটা ফিল্টার করা
    if (category && category !== 'সকল') {
        // 🔥 ফিক্স: এখানে আশা করা হচ্ছে যে category ভেরিয়েবলের মান ডাটাবেসের "বিক্রয়" বা "ভাড়া" মানের সাথে হুবহু মিলবে।
        query = query.where('category', '==', category);
    }
    
    // ২. স্ট্যাটাস ফিল্টার: শুধুমাত্র 'published' পোস্ট লোড করা (আবশ্যক)
    query = query.where('status', '==', 'published');
    
    // ৩. সার্চ টার্ম ফিল্টার (যদি থাকে)
    if (searchTerm) {
        // ফায়ারস্টোরে উন্নত টেক্সট সার্চের লজিক এখানে যুক্ত করা যেতে পারে।
    }

    try {
        // ৪. সময় অনুসারে সাজানো এবং কোয়েরি চালানো
        const snapshot = await query.orderBy('createdAt', 'desc').get();
        
        // প্রপার্টি গ্রিড পরিষ্কার করা
        propertyG.innerHTML = '';
        
        if (snapshot.empty) {
            propertyG.innerHTML = `<p class="empty-message">এই ক্যাটাগরিতে কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।</p>`;
            return;
        }

        let htmlContent = ''; 
        
        // ৫. ডেটা রেন্ডারিং
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // ডিফল্ট বা প্রথম ছবি ব্যবহার করা
            const imageUrl = (data.images && data.images.length > 0 && data.images[0].url) ? data.images[0].url : 'placeholder.jpg';
            
            // দাম বা ভাড়ার জন্য টেক্সট তৈরি করা
            // price এবং monthlyRent উভয়ই string হিসেবে আসে।
            let priceText = '';
            if (data.price) {
                priceText = `${data.price}`;
            } else if (data.monthlyRent) {
                priceText = `${data.monthlyRent}/মাস`;
            } else {
                priceText = 'দাম আলোচনা সাপেক্ষ';
            }
            
            // নিশ্চিত করুন যে দামের সামনে '৳' প্রতীক যোগ করা হয়েছে, তবে যদি priceText নিজেই 'দাম আলোচনা সাপেক্ষ' হয় তবে নয়।
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
        console.error("প্রপার্টি লোড করতে ব্যর্থ হয়েছে:", error);
        propertyG.innerHTML = '<p class="error-message" style="color: red;">প্রপার্টি লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে কনসোল চেক করুন।</p>';
    }
}
// --- প্রধান ফাংশন শেষ ---

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

// আইকন কাউন্টার আপডেট করার ডামি ফাংশন 
function updateIconCounts() {
    // এই ফাংশন ফায়ারবেস থেকে নোটিফিকেশন/মেসেজ কাউন্ট লোড করবে
    // এখন এটি শুধু ডামি ডেটা দেখাচ্ছে
    if (notificationCount) {
        notificationCount.textContent = 0;
        notificationCount.style.display = 'none'; 
    }
    if (messageCount) {
        messageCount.textContent = 0;
        messageCount.style.display = 'none'; 
    }
    if (postCount) {
        postCount.textContent = 0;
        postCount.style.display = 'none'; 
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
