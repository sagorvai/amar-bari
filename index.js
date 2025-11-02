// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
// ✅ বিদ্যমান উপাদান
const postLink = document.getElementById('post-link'); // হেডার প্রপার্টি লিঙ্ক (যদি থাকে)
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const profileButton = document.getElementById('profileButton');

// ✅ নতুন/পরিবর্তিত UI উপাদান
const notificationButton = document.getElementById('notificationButton'); 
const messageButton = document.getElementById('messageButton');
const headerPostButton = document.getElementById('headerPostButton'); // ✅ নতুন পোস্ট বাটন
const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const mapButton = document.getElementById('mapButton'); 
const sellButton = document.getElementById('sellButton'); 
const rentButton = document.getElementById('rentButton'); 

const propertyGridContainer = document.getElementById('property-grid-container');
const mapSection = document.getElementById('map-section'); 

const homeLinkSidebar = document.getElementById('home-link-sidebar');
const globalSearchInput = document.getElementById('globalSearchInput');
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');


// --- ১. প্রপার্টি লোডিং এবং ডিসপ্লে লজিক ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    // ... আপনার মূল fetchAndDisplayProperties ফাংশনের কোড ...
    
    propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';
    
    // শুধুমাত্র অনুমোদিত প্রপার্টি দেখানোর জন্য .where('status', '==', 'approved') যুক্ত করা হলো
    let query = db.collection('properties').where('category', '==', category).where('status', '==', 'approved'); 
    
    if (searchTerm) {
        // একটি সহজ সার্চ লজিক (শহর/এলাকার উপর ভিত্তি করে)
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
    // ... আপনার মূল createPropertyCard ফাংশনের কোড ...
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
    
    // কার্ডে ক্লিক করলে সিঙ্গেল প্রপার্টি ভিউতে নেভিগেশন
    card.addEventListener('click', () => {
         window.location.href = `property-view.html?id=${id}`;
    });
    
    return card;
}

function toggleMapAndGrid(showMap) {
    if (showMap) {
        propertyGridContainer.style.display = 'none';
        mapSection.style.display = 'block';
        // এখানে আপনার ম্যাপ ইনিশিয়ালাইজেশন লজিক থাকবে (যদি থাকে)
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
    
    // প্রোফাইল বাটনে ক্লিক করলে
    if (profileButton) {
        profileButton.addEventListener('click', () => {
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
    
    // ✅ নতুন পোস্ট বাটনে ক্লিক করলে
    if (headerPostButton) {
        headerPostButton.addEventListener('click', () => {
            window.location.href = 'post.html';
        });
    }


    // নেভিগেশন/ফিল্টার বাটন লজিক
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

    // গ্লোবাল সার্চ লজিক
    globalSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const searchTerm = globalSearchInput.value.trim();
            const activeCategory = document.querySelector('.nav-filters .nav-button.active');
            let category = 'বিক্রয়'; // Default to sell

            if (activeCategory) {
                category = activeCategory.getAttribute('data-category');
                if (category === 'map') {
                    // ম্যাপ ভিউ থাকলে গ্রিড ভিউতে ফিরিয়ে আনা
                    toggleMapAndGrid(false);
                    // ডিফল্ট ক্যাটাগরি সেট করা
                    document.getElementById('sellButton').classList.add('active');
                    category = 'বিক্রয়';
                }
            }
            fetchAndDisplayProperties(category, searchTerm);
        }
    });
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
            // 'postLink' আপনার মূল index.html-এ ছিল না, এটি sidebar-এর 'post-link-sidebar-menu' হতে পারে
            // if (postLink) postLink.style.display = 'flex'; 
            if (profileButton) profileButton.style.display = 'inline-block';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                // লগআউট লিসেনার সেট করা
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            // লগইন না থাকলে
            // if (postLink) postLink.style.display = 'none';
            if (profileButton) profileButton.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });

});
