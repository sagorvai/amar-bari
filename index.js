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


// --- প্রধান ফাংশন: প্রপার্টি লোড ও প্রদর্শন (পরীক্ষামূলক: সব ইনডেক্স বাইপাস) ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    
    // লোডিং মেসেজ দেখান
    propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';
    
    // ⭐⭐ পরীক্ষামূলক কোড: শুধুমাত্র কালেকশন থেকে প্রথম ১০টি ডকুমেন্ট আনুন ⭐⭐
    let query = db.collection('properties');

    try {
        // কোনো where() বা orderBy() ব্যবহার করা হচ্ছে না। 
        // এটি ইনডেক্সিং কনফ্লিক্ট এড়িয়ে যাবে এবং Firebase সংযোগ পরীক্ষা করবে।
        const snapshot = await query.limit(10).get(); 
        
        propertyG.innerHTML = ''; // লোডিং মেসেজ মুছে দিন
        
        if (snapshot.empty) {
            propertyG.innerHTML = `<p class="empty-message">ডেটাবেসে কোনো পোস্ট খুঁজে পাওয়া যায়নি (অথবা প্রথম ১০টি লোড হয়নি)।</p>`;
            return;
        }

        let htmlContent = ''; 
        
        // ৫. ডেটা রেন্ডারিং
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // ডিফল্ট ইমেজ প্লেসহোল্ডার
            const imageUrl = (data.images && data.images.length > 0 && data.images[0].url) ? data.images[0].url : 'placeholder.jpg';
            
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
        
        propertyG.innerHTML = htmlContent; 
        
    } catch (error) {
        console.error("প্রপার্টি লোড করতে ব্যর্থ হয়েছে:", error);
        
        // এই মেসেজটি এখন শুধুমাত্র প্রকৃত ব্যর্থতা দেখালে আসবে।
        propertyG.innerHTML = '<p class="error-message" style="color: red;">পোস্ট লোড করা যায়নি। অনুগ্রহ করে ব্রাউজারের কনসোল (F12) চেক করুন। ফায়ারবেস সংযোগে সমস্যা থাকতে পারে।</p>';
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
            
            // ম্যাপ বাটন ক্লিক করলে গ্রিড ও ম্যাপ টগল
            if (category === 'map') {
                document.getElementById('property-grid-container').style.display = 'none';
                document.getElementById('map-section').style.display = 'block';
                // ম্যাপ লোড করার ফাংশন এখানে কল করতে হবে
            } else {
                document.getElementById('property-grid-container').style.display = 'block';
                document.getElementById('map-section').style.display = 'none';
                // পরীক্ষামূলক কোডটিতে ক্যাটাগরি ফিল্টার কাজ করবে না, কিন্তু ডেটা লোড করার চেষ্টা করবে
                fetchAndDisplayProperties(category, globalSearchInput.value); 
            }
        });
    });

    // গ্লোবাল সার্চ ইনপুট ইভেন্ট
    globalSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const activeCategory = document.querySelector('.nav-filters .nav-button.active').dataset.category;
            // পরীক্ষামূলক কোডটিতে সার্চ ইনপুট ব্যবহার করা হবে না
            fetchAndDisplayProperties(activeCategory, globalSearchInput.value);
            console.log("সার্চ ফিচার বর্তমানে নিষ্ক্রিয় রয়েছে।");
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    
    // ✅ প্রাথমিক লোড: ডিফল্টভাবে 'বিক্রয়' ক্যাটাগরি দেখাবে (যা HTML-এ Active আছে)
    // এই ফাংশনটি এখন প্রথম ১০টি পোস্ট লোড করবে (ক্যাটাগরি নির্বিশেষে)
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    // Auth State Change Handler 
    auth.onAuthStateChanged(user => {
        
        if (user) {
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
