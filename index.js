// index.js (ইউনিফাইড কোড)

// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements - এগুলোকে DOMContentLoaded-এর বাইরে রাখা হয়েছে যাতে সব ফাংশন অ্যাক্সেস করতে পারে
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const navButtons = document.querySelectorAll('.sub-header .nav-button');
const globalSearchInput = document.getElementById('globalSearchInput');
const searchIconButton = document.getElementById('searchIconButton'); 
const propertyGrid = document.querySelector('.property-grid');

// Links used in Auth State Change 
const postLink = document.getElementById('post-link'); // main header
const loginLink = document.getElementById('login-link'); // main header
const loginLinkSidebar = document.getElementById('login-link-sidebar'); // sidebar


// --- ডামি ডেটা (কার্যকারিতা পরীক্ষার জন্য) ---
const dummyProperties = [
    { id: 'dummy1', category: 'বিক্রয়', type: 'বাড়ি', title: 'শান্তিনগরে আধুনিক ডিজাইনের বাড়ি', images: ['https://via.placeholder.com/350x250?text=House+for+Sale'], price: '৳ ১,৫০,০০,০০০', location: { upazila: 'মতিঝিল', district: 'ঢাকা' }, rooms: 3, bathrooms: 2 },
    { id: 'dummy2', category: 'ভাড়া', type: 'ফ্লাট', title: 'গুলশানে ২ রুমের ফ্লাট ভাড়া', images: ['https://via.placeholder.com/350x250?text=Flat+for+Rent'], rentAmount: '৳ ২৫,০০০/মাস', location: { upazila: 'গুলশান', district: 'ঢাকা' }, rooms: 2, bathrooms: 1 },
    { id: 'dummy3', category: 'বিক্রয়', type: 'জমি', title: 'খুলনায় বাণিজ্যিক প্লট', images: ['https://via.placeholder.com/350x250?text=Land+for+Sale'], price: '৳ ৫০,০০,০০০ /শতক', location: { upazila: 'সোনাডাঙ্গা', district: 'খুলনা' }, rooms: null, bathrooms: null },
    { id: 'dummy4', category: 'ভাড়া', type: 'দোকান', title: 'ধানমন্ডিতে ভালো লোকেশনের দোকান', images: ['https://via.placeholder.com/350x250?text=Shop+for+Rent'], rentAmount: '৳ ১২,০০০/মাস', location: { upazila: 'ধানমন্ডি', district: 'ঢাকা' }, rooms: null, bathrooms: null }
];
// ------------------------------------


function displayProperties(properties) {
    // [displayProperties ফাংশনের কোড আগের মতোই থাকবে, শুধু ডামি ডেটা দিয়ে কার্ড তৈরি করবে]
    //... (এখানে কার্ড জেনারেশন লজিক)...
    if (!propertyGrid) return;
    propertyGrid.innerHTML = '';

    if (properties.length === 0) {
        propertyGrid.innerHTML = '<p class="placeholder-text" style="text-align:center; padding: 50px 0; color: #999;">এই ফিল্টারে কোনো প্রপার্টি পাওয়া যায়নি।</p>';
        return;
    }
    // ... (কার্ড তৈরির লজিক) ...
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


function fetchAndDisplayProperties(category = 'বিক্রয়', searchTerm = '') {
    if (category === 'ম্যাপ') {
        if(propertyGrid) {
            propertyGrid.innerHTML = '<p class="placeholder-text" style="text-align:center; padding: 50px 0; color: #999;">সাইটের সকল পোস্টগুলো এখন Google Map আকারে দৃশ্যমান হবে। (কার্যকরী ম্যাপের জন্য আরো কোড প্রয়োজন)</p>';
        }
        return;
    }
    
    let filteredProperties = dummyProperties.filter(property => {
        const categoryMatch = property.category === category;
        const searchLower = searchTerm.toLowerCase();
        const titleMatch = property.title.toLowerCase().includes(searchLower);
        const locationMatch = `${property.location?.upazila || ''}, ${property.location?.district || ''}`.toLowerCase().includes(searchLower);
        return categoryMatch && (titleMatch || locationMatch);
    });
    
    displayProperties(filteredProperties);
}

// লগআউট হ্যান্ডেলার
const handleLogout = async (e) => {
    e.preventDefault();
    await auth.signOut();
    alert('সফলভাবে লগআউট করা হয়েছে!');
    window.location.reload(); // লগআউটের পর রিফ্রেশ করে UI আপডেট করবে
};


/**
 * বাটনগুলোর ইভেন্ট লিসেনার সেটআপ করার ফাংশন
 */
function setupUIEventListeners() {
    
    // ১. মোবাইল হেডার ইউআই লজিক (সাইডবার টগল)
    if (menuButton && sidebar && overlay) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // ২. সাব-হেডার নেভিগেশন (বিক্রয়/ভাড়া ফিল্টারিং)
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // অ্যাকটিভ ক্লাস পরিবর্তন
                navButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                const category = this.id === 'sellButton' ? 'বিক্রয়' : 
                                 this.id === 'rentButton' ? 'ভাড়া' : 
                                 this.id === 'mapButton' ? 'ম্যাপ' : null;
                
                if (category) {
                    const currentSearchTerm = globalSearchInput ? globalSearchInput.value : '';
                    fetchAndDisplayProperties(category, currentSearchTerm);
                }
                
                // সাইডবার বন্ধ করা
                if(sidebar) {
                    sidebar.classList.remove('active');
                    overlay.classList.remove('active');
                }
            });
        });
    }
    
    // ৩. সার্চ কার্যকারিতা
    const performSearch = () => {
        const activeCategory = document.querySelector('.sub-header .nav-button.active');
        let currentCategory = 'বিক্রয়'; 
        
        if (activeCategory) {
            if (activeCategory.id === 'rentButton') {
                currentCategory = 'ভাড়া';
            } else if (activeCategory.id === 'mapButton') {
                currentCategory = 'ম্যাপ';
            }
        }

        const searchTerm = globalSearchInput ? globalSearchInput.value : '';
        fetchAndDisplayProperties(currentCategory, searchTerm);
    };

    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', performSearch);
    }
    if (searchIconButton) {
        searchIconButton.addEventListener('click', performSearch);
    }
}


// ===================================
// ডোম লোড ও Auth স্টেট হ্যান্ডেলিং
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // সকল ইভেন্ট লিসেনার সেটআপ করা হলো
    setupUIEventListeners();
    
    // প্রাথমিক লোড: শুরুতে 'বিক্রয়' ক্যাটাগরি দেখাবে এবং বাটনকে সক্রিয় করবে
    fetchAndDisplayProperties('বিক্রয়', '');
    document.getElementById('sellButton')?.classList.add('active');


    // Auth State Change Handler - লগইন/লগআউটের পর UI আপডেট করা
    auth.onAuthStateChanged(user => {
        
        if (user) {
            // ইউজার লগইন থাকলে
            if (postLink) postLink.style.display = 'inline-block';
            if (loginLink) {
                loginLink.textContent = 'লগআউট';
                loginLink.href = '#';
                loginLink.removeEventListener('click', handleLogout); // ডুপ্লিকেট সরানো
                loginLink.addEventListener('click', handleLogout);
            }
            if (loginLinkSidebar) { // সাইডবার লিঙ্ক আপডেট
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            // ইউজার লগইন না থাকলে
            if (postLink) postLink.style.display = 'none';
            if (loginLink) {
                loginLink.textContent = 'লগইন';
                loginLink.href = 'auth.html';
                loginLink.removeEventListener('click', handleLogout); 
            }
            if (loginLinkSidebar) { // সাইডবার লিঙ্ক আপডেট
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout);
            }
        }
    });
});
