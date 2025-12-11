// index.js (চূড়ান্ত ডায়াগনস্টিক: শুধু ৫টি ডেটা লোড করা)

// ... (অন্যান্য কোড অপরিবর্তিত) ...

// --- প্রধান ফাংশন: ফায়ারবেস থেকে সব ডেটা লোড করা (ONLY LIMIT 5) ---
async function fetchAllPublishedProperties() {
    
    propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';
    
    let query = db.collection('properties');
    
    // ⭐⭐ চূড়ান্ত পরীক্ষা: শুধুমাত্র প্রথম ৫টি ডকুমেন্ট লোড করা হবে, কোনো ফিল্টার বা অর্ডারিং নয় ⭐⭐
    try {
        const snapshot = await query.limit(5).get(); 
        
        // ⭐ গ্লোবাল ভ্যারিয়েবলে ডেটা সংরক্ষণ
        allPropertyDocs = snapshot.docs;
        
    } catch (error) {
        console.error("সমস্ত প্রপার্টি লোড করতে ব্যর্থ হয়েছে:", error);
        propertyG.innerHTML = '<p class="error-message" style="color: red;">পোস্ট লোড করা যায়নি। ফায়ারবেস সংযোগ বা সিকিউরিটি রুলস চেক করুন।</p>';
    }
}
// ... (বাকি কোড অপরিবর্তিত থাকবে) ...

// index.js (চূড়ান্ত ফিক্স ২: orderBy ক্লজ বাদ দিয়ে ক্লায়েন্ট-সাইড ফিল্টারিং)

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

// ⭐ গ্লোবাল ভ্যারিয়েবল: লোড হওয়া সমস্ত প্রপার্টি ডেটা এখানে থাকবে
let allProperties = []; 
let allPropertyDocs = []; // ডকুমেন্ট স্ন্যাপশটগুলিও সংরক্ষণ করা হলো


// --- ⭐ প্রোফাইল ইমেজ লোড করার ফাংশন ⭐ ---
async function loadProfilePicture(user) {
    // ফাংশন অপরিবর্তিত
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


// --- ডেটা রেন্ডারিং ফাংশন ---
function renderProperties(propertiesToDisplay, category) {
    propertyG.innerHTML = '';
    
    if (propertiesToDisplay.length === 0) {
        const message = (category === 'সকল' || category === 'বিক্রয়') ? 'এই ক্যাটাগরিতে কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।' : `"${category}" ক্যাটাগরিতে কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।`;
        propertyG.innerHTML = `<p class="empty-message">${message}</p>`;
        return;
    }

    let htmlContent = ''; 
    
    propertiesToDisplay.forEach(doc => {
        const data = doc.data();
        
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
}


// --- প্রধান ফাংশন: ফায়ারবেস থেকে সব ডেটা লোড করা (orderBy বাদ দিয়ে) ---
async function fetchAllPublishedProperties() {
    
    propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';
    
    let query = db.collection('properties');
    
    // ⭐ শুধুমাত্র 'status' ফিল্টার ব্যবহার করা হচ্ছে। orderBy ক্লজ বাদ দেওয়া হয়েছে।
    // এটি ফায়ারস্টোরের ইনডেক্সিং সমস্যা এড়াতে সাহায্য করবে।
    query = query.where('status', '==', 'published');
    
    try {
        const snapshot = await query.get(); // কোনো orderBy নেই
        
        // ⭐ গ্লোবাল ভ্যারিয়েবলে ডেটা সংরক্ষণ
        allPropertyDocs = snapshot.docs;
        
    } catch (error) {
        console.error("সমস্ত প্রপার্টি লোড করতে ব্যর্থ হয়েছে:", error);
        propertyG.innerHTML = '<p class="error-message" style="color: red;">পোস্ট লোড করা যায়নি। ফায়ারবেস সংযোগ বা সিকিউরিটি রুলস চেক করুন।</p>';
    }
}


// --- ক্যাটাগরি ফিল্টার এবং ডিসপ্লে ফাংশন (ক্লায়েন্ট-সাইড) ---
function filterAndDisplayProperties(category, searchTerm = '') {
    if (category === 'map') return;
    
    let filteredDocs = [];

    if (category === 'সকল' || category === '') {
        filteredDocs = allPropertyDocs;
    } else {
        // ক্লায়েন্ট-সাইডে ক্যাটাগরি দ্বারা ফিল্টার
        filteredDocs = allPropertyDocs.filter(doc => doc.data().category === category);
    }
    
    // ডেটা রেন্ডার করার আগে, আমরা ক্লায়েন্ট-সাইডে createdAt দ্বারা সাজিয়ে নিতে পারি (ঐচ্ছিক)
    filteredDocs.sort((a, b) => b.data().createdAt.toDate() - a.data().createdAt.toDate());

    renderProperties(filteredDocs, category);
}
// --- প্রধান ফাংশন শেষ ---


// লগআউট হ্যান্ডেলার (অপরিবর্তিত)
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

// আইকন কাউন্টার আপডেট করার ডামি ফাংশন (অপরিবর্তিত)
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

// ইভেন্ট লিসেনার সেটআপ (অপরিবর্তিত)
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
            } else {
                document.getElementById('property-grid-container').style.display = 'block';
                document.getElementById('map-section').style.display = 'none';
                // ✅ এখন এই ফাংশনটি ফিল্টার করবে
                filterAndDisplayProperties(category, globalSearchInput.value); 
            }
        });
    });

    // গ্লোবাল সার্চ ইনপুট ইভেন্ট
    globalSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const activeCategory = document.querySelector('.nav-filters .nav-button.active').dataset.category;
            filterAndDisplayProperties(activeCategory, globalSearchInput.value);
            console.warn("সার্চ লজিক বর্তমানে নিষ্ক্রিয় রয়েছে।");
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    setupUIEventListeners();
    
    // ⭐ প্রাথমিক লোড: প্রথমে সব ডেটা ফায়ারবেস থেকে লোড হবে
    await fetchAllPublishedProperties(); 
    
    // এরপর ডিফল্ট ক্যাটাগরি 'বিক্রয়' ফিল্টার করে দেখানো হবে
    filterAndDisplayProperties('বিক্রয়', '');
    
    // Auth State Change Handler (অপরিবর্তিত)
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
