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

// --- প্রপার্টি লোডিং এবং ডিসপ্লে লজিক ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    // ... (পূর্বের কোড)
    
    propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';
    
    let query = db.collection('properties').where('category', '==', category).where('status', '==', 'approved'); 
    
    if (searchTerm) {
        query = query.where('location.district', '==', searchTerm.trim()); 
    }
    
    try {
        const snapshot = await query.get();
        if (snapshot.empty) {
            propertyG.innerHTML = '<p class="no-results-message">এই ক্যাটাগরিতে কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।</p>';
            return;
        }

        propertyG.innerHTML = '';
        snapshot.forEach(doc => {
            const property = doc.data();
            const card = createPropertyCard(property, doc.id);
            propertyG.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching properties:", error);
        propertyG.innerHTML = '<p class="error-message">প্রপার্টি লোড করার সময় একটি সমস্যা হয়েছে।</p>';
    }
}

function createPropertyCard(property, id) {
    // ... (পূর্বের কোড)
    const card = document.createElement('div');
    card.classList.add('property-card');
    card.setAttribute('data-id', id);

    const priceText = property.category === 'ভাড়া' ? 
        `${property.monthlyRent ? property.monthlyRent.toLocaleString('bn-BD') : 'অজানা'} টাকা/মাস` : 
        `${(property.price ? property.price / 100000 : 0).toFixed(2)} লক্ষ টাকা`;
    
    const areaText = property.location && property.location.district ? property.location.district : 'অজানা এলাকা';
    const beds = property.rooms || '-';
    const baths = property.bathrooms || '-';
    let sizeText = property.areaSqft ? `${property.areaSqft} স্কয়ার ফিট` : (property.landArea ? `${property.landArea} ${property.landAreaUnit}` : '-');

    card.innerHTML = `
        <div class="property-image-container">
            <img src="${property.images[0] || 'https://via.placeholder.com/300x200?text=No+Image'}" alt="${property.title}" class="property-image">
            <span class="property-category">${property.category}</span>
        </div>
        <div class="property-info">
            <h3 class="property-title">${property.title || property.type}</h3>
            <p class="property-area"><i class="material-icons">place</i> ${areaText}</p>
            <p class="property-price">${priceText}</p>
            <div class="property-features">
                <span><i class="material-icons">bed</i> ${beds} বেড</span>
                <span><i class="material-icons">bathtub</i> ${baths} বাথ</span>
                <span><i class="material-icons">square_foot</i> ${sizeText}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => {
         window.location.href = `property-view.html?id=${id}`;
    });
    
    return card;
}

function toggleMapAndGrid(showMap) {
    if (showMap) {
        propertyGridContainer.style.display = 'none';
        mapSection.style.display = 'block';
    } else {
        propertyGridContainer.style.display = 'block';
        mapSection.style.display = 'none';
    }
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
    
    // ✅ প্রোফাইল, নোটিফিকেশন, ম্যাসেজ, পোস্ট বাটনের নেভিগেশন
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }

    if (notificationButton) {
        notificationButton.addEventListener('click', () => {
            window.location.href = 'notifications.html'; 
        });
    }

    if (messageButton) {
        messageButton.addEventListener('click', () => {
            window.location.href = 'messages.html'; 
        });
    }
    
    if (headerPostButton) {
        headerPostButton.addEventListener('click', () => {
            window.location.href = 'post.html';
        });
    }

    // ... (নেভিগেশন/ফিল্টার বাটন লজিক এবং গ্লোবাল সার্চ লজিক অপরিবর্তিত থাকবে) ...
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
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
            fetchAndDisplayProperties(category, searchTerm);
        }
    });
}

// --- ৩. নোটিফিকেশন কাউন্টার আপডেট করা (ডামি ডেটা) ---
function updateIconCounts() {
    // এই ফাংশনটি Firebase থেকে আসল কাউন্ট লোড করবে।
    // আপাতত UI দেখানোর জন্য ডামি ডেটা ব্যবহার করা হলো:

    const notifCount = 3; 
    if (notifCount > 0) {
        notificationCount.textContent = notifCount;
        notificationCount.style.display = 'block';
    } else {
        notificationCount.style.display = 'none';
    }

    const msgCount = 1; 
    if (msgCount > 0) {
        messageCount.textContent = msgCount;
        messageCount.style.display = 'block';
    } else {
        messageCount.style.display = 'none';
    }
    
    const newPostCount = 0; 
    if (newPostCount > 0) {
        postCount.textContent = newPostCount;
        postCount.style.display = 'block';
    } else {
        postCount.style.display = 'none';
    }
}


// প্রোফাইল ইমেজ রিডাইরেক্ট
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }
});


// --- ৪. লগআউট হ্যান্ডেলার ---
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
