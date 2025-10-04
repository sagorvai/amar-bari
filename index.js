// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const postLink = document.getElementById('post-link'); // index.html এর সাইডবার থেকে
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const profileButton = document.getElementById('profileButton');
const navButtons = document.querySelectorAll('.sub-header .nav-button');
const globalSearchInput = document.getElementById('globalSearchInput');
const propertyGrid = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar'); // সাইডবার লগইন লিঙ্ক

// --- ডামি ডেটা (কার্যকারিতা পরীক্ষার জন্য) ---
const dummyProperties = [
    {
        id: 'dummy1',
        category: 'বিক্রয়',
        type: 'বাড়ি',
        title: 'শান্তিনগরে আধুনিক ডিজাইনের বাড়ি',
        images: ['https://via.placeholder.com/350x250?text=House+for+Sale'],
        price: '৳ ১,৫০,০০,০০০',
        location: {
            upazila: 'মতিঝিল',
            district: 'ঢাকা',
        },
        rooms: 3, 
        bathrooms: 2, 
        timestamp: new Date().getTime(),
    },
    {
        id: 'dummy2',
        category: 'ভাড়া',
        type: 'ফ্লাট',
        title: 'গুলশানে ২ রুমের ফ্লাট ভাড়া',
        images: ['https://via.placeholder.com/350x250?text=Flat+for+Rent'],
        rentAmount: '৳ ২৫,০০০/মাস',
        location: {
            upazila: 'গুলশান',
            district: 'ঢাকা',
        },
        rooms: 2, 
        bathrooms: 1, 
        timestamp: new Date().getTime() - 86400000,
    }
];

// ফাংশন: প্রপার্টি লোড ও ডিসপ্লে
async function fetchAndDisplayProperties(category = 'বিক্রয়', searchTerm = '') {
    if (!propertyGrid) return;
    propertyGrid.innerHTML = '<h3>প্রপার্টি লোড হচ্ছে...</h3>';
    
    // ডামি ডেটা ফিল্টারিং (সার্চ ও ক্যাটাগরি)
    let filteredProperties = dummyProperties.filter(p => {
        const categoryMatch = p.category === category;
        const searchMatch = !searchTerm || 
                            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.location.upazila.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.location.district.toLowerCase().includes(searchTerm.toLowerCase());
        return categoryMatch && searchMatch;
    });

    // ডামি ডেটা দিয়ে কার্ড তৈরি
    if (filteredProperties.length === 0) {
        propertyGrid.innerHTML = '<p>এই ক্যাটাগরিতে কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।</p>';
        return;
    }

    const cardsHTML = filteredProperties.map(property => `
        <div class="property-card" data-id="${property.id}">
            <div class="property-image-container">
                <img src="${property.images[0]}" alt="${property.title}">
                <span class="property-tag ${property.category === 'ভাড়া' ? 'rent-tag' : ''}">${property.category}</span>
            </div>
            <div class="property-card-content">
                <h4>${property.title}</h4>
                <p class="location"><i class="material-icons" style="font-size: 16px;">location_on</i> ${property.location.upazila}, ${property.location.district}</p>
                <p class="price">${property.price || property.rentAmount}</p>
            </div>
        </div>
    `).join('');

    propertyGrid.innerHTML = cardsHTML;
}

// ফাংশন: লগআউট হ্যান্ডেল
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

// ফাংশন: UI ইভেন্ট লিসেনার সেটআপ
function setupUIEventListeners() {
    
    // ১. সাইড মেনু খোলার/বন্ধ করার কার্যকারিতা
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

    // ২. সাব-হেডারের বাটনগুলোর কার্যকারিতা (ম্যাপ, বিক্রয়, ভাড়া)
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const actionType = button.id.replace('Button', ''); // map, sell, rent
            
            if (actionType === 'map') {
                propertyGrid.innerHTML = '<div class="placeholder-text">সাইটের সকল পোস্টগুলো এখন Google Map আকারে দৃশ্যমান হবে।</div>';
            } else if (actionType === 'sell') {
                fetchAndDisplayProperties('বিক্রয়', globalSearchInput.value);
            } else if (actionType === 'rent') {
                fetchAndDisplayProperties('ভাড়া', globalSearchInput.value);
            }
        });
    });
    
    // ৩. সার্চ ফাংশন
    const searchIconButton = document.getElementById('searchIconButton');
    if (searchIconButton) {
        searchIconButton.addEventListener('click', () => {
            const activeCategory = document.querySelector('.sub-header .nav-button.active')?.id === 'rentButton' ? 'ভাড়া' : 'বিক্রয়';
            fetchAndDisplayProperties(activeCategory, globalSearchInput.value);
        });
    }
}


// ===================================
// ডোম লোড ও Auth স্টেট হ্যান্ডেলিং
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    // সকল ইভেন্ট লিসেনার সেটআপ করা হলো
    setupUIEventListeners();
    
    // প্রাথমিক লোড: শুরুতে 'বিক্রয়' ক্যাটাগরি দেখাবে
    fetchAndDisplayProperties('বিক্রয়', '');
    document.getElementById('sellButton')?.classList.add('active'); // নিশ্চিত করা হলো

    // Auth State Change Handler
    auth.onAuthStateChanged(user => {
        if (user) {
            // লগইন থাকলে
            if (postLink) postLink.style.display = 'flex'; // flex/inline-flex ব্যবহার করা ভালো
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
            if (postLink) postLink.style.display = 'none';
            if (profileButton) profileButton.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });
});
