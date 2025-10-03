// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements - এগুলোকে DOMContentLoaded-এর বাইরে রাখা হয়েছে যাতে সব ফাংশন অ্যাক্সেস করতে পারে
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const navButtons = document.querySelectorAll('.sub-header .nav-button');
const globalSearchInput = document.getElementById('globalSearchInput');
const propertyGrid = document.querySelector('.property-grid');
const postLinkSidebar = document.getElementById('post-link');
const loginLinkSidebar = document.getElementById('login-link-sidebar');


// --- ডামি ডেটা (কার্যকারিতা পরীক্ষার জন্য) ---
const dummyProperties = [
    // আপনার ফাইল থেকে নেওয়া ডামি ডেটা...
    { id: 'dummy1', category: 'বিক্রয়', type: 'বাড়ি', title: 'শান্তিনগরে আধুনিক ডিজাইনের বাড়ি', images: ['https://via.placeholder.com/350x250?text=House+for+Sale'], price: '৳ ১,৫০,০০,০০০', location: { upazila: 'মতিঝিল', district: 'ঢাকা' }, rooms: 3, bathrooms: 2 },
    { id: 'dummy2', category: 'ভাড়া', type: 'ফ্লাট', title: 'গুলশানে ২ রুমের ফ্লাট ভাড়া', images: ['https://via.placeholder.com/350x250?text=Flat+for+Rent'], rentAmount: '৳ ২৫,০০০/মাস', location: { upazila: 'গুলশান', district: 'ঢাকা' }, rooms: 2, bathrooms: 1 },
    { id: 'dummy3', category: 'বিক্রয়', type: 'জমি', title: 'খুলনায় বাণিজ্যিক প্লট', images: ['https://via.placeholder.com/350x250?text=Land+for+Sale'], price: '৳ ৫০,০০,০০০ /শতক', location: { upazila: 'সোনাডাঙ্গা', district: 'খুলনা' }, rooms: null, bathrooms: null },
    { id: 'dummy4', category: 'ভাড়া', type: 'দোকান', title: 'ধানমন্ডিতে ভালো লোকেশনের দোকান', images: ['https://via.placeholder.com/350x250?text=Shop+for+Rent'], rentAmount: '৳ ১২,০০০/মাস', location: { upazila: 'ধানমন্ডি', district: 'ঢাকা' }, rooms: null, bathrooms: null }
];
// ------------------------------------

/**
 * প্রপার্টি ডেটা কার্ড আকারে ডিসপ্লে করার ফাংশন
 * (আগের ডিজাইনের কার্ড কাঠামো বজায় রাখা হয়েছে)
 */
function displayProperties(properties) {
    if (!propertyGrid) return;
    propertyGrid.innerHTML = '';

    if (properties.length === 0) {
        propertyGrid.innerHTML = '<p class="placeholder-text" style="text-align:center; padding: 50px 0; color: #999;">কোনো প্রপার্টি পাওয়া যায়নি।</p>';
        return;
    }

    properties.forEach(property => {
        const card = document.createElement('div');
        card.classList.add('property-card');

        const imageUrl = property.images && property.images.length > 0
            ? property.images[0]
            : 'https://via.placeholder.com/350x250?text=No+Image';
            
        const roomInfo = property.rooms ? `<span><i class="material-icons">bed</i> ${property.rooms} বেড</span>` : '';
        const bathroomInfo = property.bathrooms ? `<span><i class="material-icons">bathtub</i> ${property.bathrooms} বাথ</span>` : '';
        
        const priceDisplay = property.price || property.rentAmount || '';
        const tag = property.category === 'বিক্রয়' ? 'বিক্রয়ের জন্য' : 'ভাড়ার জন্য';
        const tagClass = property.category === 'ভাড়া' ? 'rent-tag' : '';


        card.innerHTML = `
            <div class="property-image-container">
                <img src="${imageUrl}" alt="${property.title}" class="property-image">
                <span class="property-tag ${tagClass}">${tag}</span>
            </div>
            <div class="property-card-content">
                <h4>${property.title}</h4>
                <p class="location">
                    <i class="material-icons" style="font-size: 16px; margin-right: 5px; color: #7f8c8d;">location_on</i>
                    ${property.location?.upazila || ''}, ${property.location?.district || ''}
                </p>
                <p class="price">${priceDisplay}</p>
                <div class="property-info">
                    ${roomInfo}
                    ${bathroomInfo}
                </div>
            </div>
        `;
        
        propertyGrid.appendChild(card);
    });
}

/**
 * প্রপার্টি ডেটা ফিল্টার এবং ডিসপ্লে করার ফাংশন
 */
function fetchAndDisplayProperties(category = 'বিক্রয়', searchTerm = '') {
    
    // ১. ডেটা ফিল্টারিং
    let filteredProperties = dummyProperties.filter(property => {
        // ক্যাটাগরি ফিল্টার
        const categoryMatch = property.category === category;

        // সার্চ টার্ম ফিল্টার (টাইটেল বা অবস্থান দিয়ে অনুসন্ধান)
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = property.title.toLowerCase().includes(searchLower);
        const locationMatch = `${property.location?.upazila || ''}, ${property.location?.district || ''}`.toLowerCase().includes(searchLower);

        return categoryMatch && (titleMatch || locationMatch);
    });
    
    // ২. ডেটা ডিসপ্লে
    displayProperties(filteredProperties);
}

/**
 * সকল বাটন এবং UI ইভেন্ট লিসেনার সেটআপ করার ফাংশন
 */
function setupUIEventListeners() {
    
    // ১. মোবাইল হেডার ইউআই লজিক (সাইডবার টগল)
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

    // ২. সাব-হেডার নেভিগেশন (বিক্রয়/ভাড়া ফিল্টারিং)
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            // পুরোনো লিসেনার থাকলে তা সরিয়ে নতুন লিসেনার যোগ করা
            button.removeEventListener('click', handleNavClick); 
            button.addEventListener('click', handleNavClick);
        });
    }
    
    // ৩. সার্চ কার্যকারিতা
    const performSearch = () => {
        const activeCategory = document.querySelector('.sub-header .nav-button.active');
        let currentCategory = 'বিক্রয়'; 
        
        if (activeCategory && activeCategory.id === 'rentButton') {
            currentCategory = 'ভাড়া';
        }

        const searchTerm = globalSearchInput.value;
        fetchAndDisplayProperties(currentCategory, searchTerm);
    };

    if (globalSearchInput) {
        globalSearchInput.removeEventListener('input', performSearch);
        globalSearchInput.addEventListener('input', performSearch);
    }
    const searchIconButton = document.getElementById('searchIconButton');
    if (searchIconButton) {
        searchIconButton.removeEventListener('click', performSearch);
        searchIconButton.addEventListener('click', performSearch);
    }
}

function handleNavClick() {
    // অ্যাকটিভ ক্লাস পরিবর্তন
    navButtons.forEach(btn => btn.classList.remove('active'));
    this.classList.add('active');

    const category = this.id === 'sellButton' ? 'বিক্রয়' : 
                     this.id === 'rentButton' ? 'ভাড়া' : null;
    
    if (category) {
        // নতুন ফিল্টার প্রয়োগ
        const currentSearchTerm = globalSearchInput.value;
        fetchAndDisplayProperties(category, currentSearchTerm);
    }
    // ম্যাপ বাটনের জন্য আলাদা লজিক
    if (this.id === 'mapButton') {
        if(propertyGrid) {
            propertyGrid.innerHTML = '<p class="placeholder-text" style="text-align:center; padding: 50px 0; color: #999;">সকল পোস্টগুলো এখন Google Map আকারে দৃশ্যমান হবে। (কার্যকরী ম্যাপের জন্য আরো কোড প্রয়োজন)</p>';
        }
    }
}

// লগআউট হ্যান্ডেলার
const handleLogout = async (e) => {
    e.preventDefault();
    try {
        await auth.signOut();
        alert('সফলভাবে লগআউট করা হয়েছে!');
        window.location.reload();
    } catch (error) {
        console.error("লগআউট ব্যর্থ হয়েছে:", error);
        alert("লগআউট ব্যর্থ হয়েছে।");
    }
};

// ===================================
// ডোম লোড ও Auth স্টেট হ্যান্ডেলিং
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // সকল ইভেন্ট লিসেনার সেটআপ করা হলো
    setupUIEventListeners();
    
    // প্রাথমিক লোড: শুরুতে 'বিক্রয়' ক্যাটাগরি দেখাবে
    fetchAndDisplayProperties('বিক্রয়', '');
    document.getElementById('sellButton')?.classList.add('active');


    // Auth State Change Handler
    auth.onAuthStateChanged(user => {
        
        if (user) {
            // লগইন থাকলে
            if (postLinkSidebar) postLinkSidebar.style.display = 'block';

            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                // ডুপ্লিকেট লিসেনার এড়াতে: পুরোনোটি সরিয়ে নতুনটি সেট করা
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            // লগইন না থাকলে
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';

            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); // লগআউট লিসেনার সরানো
            }
        }
    });
});
