// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const postLink = document.getElementById('post-link'); // সাইডবার প্রপার্টি লিঙ্ক
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const profileButton = document.getElementById('profileButton');
const navButtons = document.querySelectorAll('.nav-filters .nav-button');
const globalSearchInput = document.getElementById('globalSearchInput');
const propertyGrid = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar'); // সাইডবার লগইন লিঙ্ক

// নতুন যুক্ত সেকশনের উপাদান
const homeLinkSidebar = document.getElementById('home-link-sidebar');
const tipsLinkSidebar = document.getElementById('tips-link-sidebar');
const aboutLinkSidebar = document.getElementById('about-link-sidebar');
const contactLinkSidebar = document.getElementById('contact-link-sidebar');

const propertyGridContainer = document.getElementById('property-grid-container');
const aboutSection = document.getElementById('about-section');
const tipsSection = document.getElementById('tips-section');
const contactSection = document.getElementById('contact-section');


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
    },
];

// ===================================
// ফাংশন: প্রপার্টি লোড ও ডিসপ্লে
// ===================================
function createPropertyCard(property) {
    const card = document.createElement('div');
    card.className = 'property-card';
    const tagClass = property.category === 'ভাড়া' ? 'rent-tag' : '';
    const priceText = property.category === 'ভাড়া' ? property.rentAmount : property.price;

    card.innerHTML = `
        <div class="property-image-container">
            <img src="${property.images[0] || 'https://via.placeholder.com/350x250?text=No+Image'}" alt="${property.title}">
            <span class="property-tag ${tagClass}">${property.category}</span>
        </div>
        <div class="property-card-content">
            <h4>${property.title}</h4>
            <p class="location"><i class="material-icons">location_on</i> ${property.location?.upazila || ''}, ${property.location?.district || ''}</p>
            <p class="price">${priceText || ''}</p>
            <div class="property-features">
                <span><i class="material-icons">bed</i> ${property.rooms || '?'}</span>
                <span><i class="material-icons">bathtub</i> ${property.bathrooms || '?'}</span>
            </div>
        </div>
    `;
    return card;
}

// প্রপার্টি ফ্রেচ ও ডিসপ্লে
async function fetchAndDisplayProperties(category, searchTerm = '') {
    if (!propertyGrid) return;
    
    // অন্য সেকশনগুলো লুকানো
    hideAllSections(); 

    propertyGridContainer.style.display = 'block'; // প্রপার্টি গ্রিড দেখানো
    propertyGrid.innerHTML = '<div class="placeholder-text">প্রপার্টি লোড হচ্ছে...</div>'; // লোডিং মেসেজ

    let propertiesToDisplay = [];
    
    // ডামি ডেটা ফিল্টার করা
    propertiesToDisplay = dummyProperties.filter(p => {
        const categoryMatch = category === 'all' || p.category === category;
        const searchMatch = !searchTerm || 
                            p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.location.upazila.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.location.district.toLowerCase().includes(searchTerm.toLowerCase());
        return categoryMatch && searchMatch;
    });

    propertyGrid.innerHTML = ''; 

    if (propertiesToDisplay.length > 0) {
        propertiesToDisplay.forEach(property => {
            const card = createPropertyCard(property);
            propertyGrid.appendChild(card);
        });
    } else {
        propertyGrid.innerHTML = '<div class="placeholder-text">এই ক্যাটাগরিতে কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।</div>';
    }
}


// ===================================
// ফাংশন: সেকশন লুকানো ও দেখানো
// ===================================
function hideAllSections() {
    [propertyGridContainer, aboutSection, tipsSection, contactSection].forEach(section => {
        if (section) section.style.display = 'none';
    });
}

function showSection(sectionElement) {
    hideAllSections();
    if (sectionElement) sectionElement.style.display = 'block';
}


// ===================================
// ইভেন্ট লিসেনার সেটআপ
// ===================================
function setupUIEventListeners() {
    
    // সাইড মেনু খোলার/বন্ধ করার কার্যকারিতা
    menuButton.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    // ওভারলেতে ক্লিক করলে সাইড মেনু বন্ধ হবে
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });
    
    // সাইডবারের 'হোম' লিংক: প্রপার্টি গ্রিড দেখাবে
    homeLinkSidebar.addEventListener('click', (e) => {
        e.preventDefault();
        fetchAndDisplayProperties(document.querySelector('.nav-filters .nav-button.active')?.id.replace('Button', '') === 'rent' ? 'ভাড়া' : 'বিক্রয়', globalSearchInput.value);
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    // সাইডবারের 'পরামর্শ' লিঙ্ক
    if (tipsLinkSidebar) {
        tipsLinkSidebar.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(tipsSection);
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // সাইডবারের 'এবাউট' লিঙ্ক
    if (aboutLinkSidebar) {
        aboutLinkSidebar.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(aboutSection);
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    
    // সাইডবারের 'যোগাযোগ' লিঙ্ক
    if (contactLinkSidebar) {
        contactLinkSidebar.addEventListener('click', (e) => {
            e.preventDefault();
            showSection(contactSection);
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // সাব-হেডারের ফিল্টার বাটনগুলোর কার্যকারিতা
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            const actionType = button.id.replace('Button', ''); // sell, rent, map
            let category = 'বিক্রয়'; 
            
            if (actionType === 'rent') {
                category = 'ভাড়া';
                fetchAndDisplayProperties(category, globalSearchInput.value);
            } else if (actionType === 'sell') {
                category = 'বিক্রয়';
                fetchAndDisplayProperties(category, globalSearchInput.value);
            } else if (actionType === 'map') {
                // ম্যাপের জন্য কোড
                hideAllSections(); 
                propertyGridContainer.style.display = 'block';
                propertyGrid.innerHTML = '<div class="placeholder-text" style="height: 300px;">এখানে Google Map দেখানো হবে। (বর্তমানে ডামি)</div>';
            }
        });
    });

    // গ্লোবাল সার্চ ইনপুট ও বাটন
    const performSearch = () => {
        const searchTerm = globalSearchInput.value.trim();
        const activeCategory = document.querySelector('.nav-filters .nav-button.active')?.id.replace('Button', '');
        let category = activeCategory === 'rent' ? 'ভাড়া' : 'বিক্রয়';

        // ম্যাপ সিলেক্ট করা থাকলে ম্যাপ দেখাবে
        if (activeCategory === 'map') {
             hideAllSections(); 
             propertyGridContainer.style.display = 'block';
             propertyGrid.innerHTML = '<div class="placeholder-text" style="height: 300px;">ম্যাপ ভিউতে সার্চের ফলাফল প্রদর্শিত হবে। (বর্তমানে ডামি)</div>';
             return;
        }

        fetchAndDisplayProperties(category, searchTerm);
    };

    globalSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    document.getElementById('searchIconButton')?.addEventListener('click', performSearch);
}


// ===================================
// অথেন্টিকেশন স্টেট হ্যান্ডেলিং
// ===================================
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
    
    // প্রাথমিক লোড: শুরুতে 'বিক্রয়' ক্যাটাগরি দেখাবে
    fetchAndDisplayProperties('বিক্রয়', '');
    document.getElementById('sellButton')?.classList.add('active'); 


    // Auth State Change Handler
    auth.onAuthStateChanged(user => {
        
        if (user) {
            // লগইন থাকলে
            if (postLink) postLink.style.display = 'flex'; 
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
