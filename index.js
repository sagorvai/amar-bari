// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const postLink = document.getElementById('post-link'); // সাইডবার প্রপার্টি লিঙ্ক
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const profileButton = document.getElementById('profileButton');

// ✅ নতুন/পরিবর্তিত UI উপাদান
const navButtons = document.querySelectorAll('.nav-filters .nav-button'); // সমস্ত ফিল্টার বাটন
const mapButton = document.getElementById('mapButton'); // ম্যাপ বাটন
const sellButton = document.getElementById('sellButton'); // বিক্রয় বাটন
const rentButton = document.getElementById('rentButton'); // ভাড়া বাটন

const propertyGridContainer = document.getElementById('property-grid-container');
const mapSection = document.getElementById('map-section'); // ম্যাপ সেকশন

// অন্যান্য সেকশনের উপাদান
const homeLinkSidebar = document.getElementById('home-link-sidebar');
const tipsLinkSidebar = document.getElementById('tips-link-sidebar');
const aboutLinkSidebar = document.getElementById('about-link-sidebar');
const contactLinkSidebar = document.getElementById('contact-link-sidebar');

const aboutSection = document.getElementById('about-section');
const tipsSection = document.getElementById('tips-section');
const contactSection = document.getElementById('contact-section');

const globalSearchInput = document.getElementById('globalSearchInput');
const propertyGrid = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');


// --- ডামি ডেটা (কার্যকারিতা পরীক্ষার জন্য) ---
const dummyProperties = [
    {
        id: 'dummy1',
        category: 'বিক্রয়',
        type: 'বাড়ি',
        title: 'শান্তিনগরে আধুনিক ডিজাইনের বাড়ি',
        price: '৳ 1.5 কোটি',
        location: 'শান্তিনগর, ঢাকা',
        rooms: 4,
        baths: 3,
        size: '2200 বর্গ ফুট',
        images: ['https://via.placeholder.com/400x300?text=বাড়ি+১'],
        // ✅ ম্যাপের জন্য ডামি অক্ষাংশ ও দ্রাঘিমাংশ
        lat: 23.7461, 
        lng: 90.3952
    },
    {
        id: 'dummy2',
        category: 'ভাড়া',
        type: 'ফ্লাট',
        title: 'গুলশানে সুন্দর 2 বেডের ফ্লাট',
        price: '৳ 35,000/মাস',
        location: 'গুলশান, ঢাকা',
        rooms: 2,
        baths: 2,
        size: '1200 বর্গ ফুট',
        images: ['https://via.placeholder.com/400x300?text=ফ্লাট+২'],
        lat: 23.7947, 
        lng: 90.4150
    },
    {
        id: 'dummy3',
        category: 'বিক্রয়',
        type: 'জমি',
        title: 'আশুলিয়ায় ১ কাঠা জমি',
        price: '৳ 20 লাখ',
        location: 'আশুলিয়া, সাভার',
        rooms: 0,
        baths: 0,
        size: '720 বর্গ ফুট',
        images: ['https://via.placeholder.com/400x300?text=জমি+৩'],
        lat: 23.8961, 
        lng: 90.3473
    },
    {
        id: 'dummy4',
        category: 'ভাড়া',
        type: 'দোকান',
        title: 'মিরপুরে দোকানের জন্য ভালো স্পেস',
        price: '৳ 18,000/মাস',
        location: 'মিরপুর, ঢাকা',
        rooms: 0,
        baths: 1,
        size: '450 বর্গ ফুট',
        images: ['https://via.placeholder.com/400x300?text=দোকান+৪'],
        lat: 23.8052, 
        lng: 90.3667
    },
];

// --- ইউটিলিটি ফাংশন ---

// প্রপার্টি কার্ড তৈরির ফাংশন (একই থাকবে)
function createPropertyCard(property) {
    const card = document.createElement('a');
    card.href = 'property-details.html?id=' + property.id; 
    card.classList.add('property-card');
    
    const categoryClass = property.category === 'বিক্রয়' ? 'sell' : 'rent';

    card.innerHTML = `
        <div class="property-image" style="background-image: url('${property.images[0] || 'https://via.placeholder.com/400x300?text=ছবি+নেই'}');"></div>
        <div class="property-info">
            <div class="category-tag ${categoryClass}">${property.category}</div>
            <h3>${property.title}</h3>
            <p class="price">${property.price}</p>
            <p class="location"><i class="material-icons">location_on</i> ${property.location}</p>
            <div class="details">
                <span><i class="material-icons">king_bed</i> ${property.rooms} বেড</span>
                <span><i class="material-icons">bathtub</i> ${property.baths} বাথ</span>
                <span><i class="material-icons">square_foot</i> ${property.size}</span>
            </div>
        </div>
    `;
    return card;
}

// প্রপার্টি লোড ও ডিসপ্লে করার ফাংশন (বিক্রয়/ভাড়া ফিল্টারিং সহ)
function fetchAndDisplayProperties(category, searchTerm = '') {
    // অন্য সব সেকশন লুকানো, শুধু গ্রিড কন্টেইনার দেখানো
    hideAllSections(); 
    propertyGridContainer.style.display = 'block';

    propertyGrid.innerHTML = '<p class="loading-message">পোস্ট লোড হচ্ছে...</p>';
    
    let filteredProperties = dummyProperties;
    
    // ক্যাটাগরি ফিল্টারিং
    if (category && category !== 'all') {
        filteredProperties = filteredProperties.filter(p => p.category === category);
    }
    
    // সার্চ ফিল্টারিং
    if (searchTerm) {
        const lowerSearch = searchTerm.toLowerCase();
        filteredProperties = filteredProperties.filter(p => 
            p.title.toLowerCase().includes(lowerSearch) || 
            p.location.toLowerCase().includes(lowerSearch)
        );
    }

    propertyGrid.innerHTML = '';
    
    if (filteredProperties.length === 0) {
        propertyGrid.innerHTML = '<p class="no-results-message">এই শর্তে কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।</p>';
    } else {
        filteredProperties.forEach(property => {
            propertyGrid.appendChild(createPropertyCard(property));
        });
    }
}

// সব কন্টেন্ট সেকশন লুকানো
function hideAllSections() {
    const sections = [propertyGridContainer, mapSection, aboutSection, tipsSection, contactSection];
    sections.forEach(sec => sec.style.display = 'none');
}

// নেভিগেশন বাটন সক্রিয় করা
function activateNavButton(button) {
    navButtons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
}

// --- ম্যাপ কার্যকারিতা ---

// ✅ ম্যাপ ইনিশিয়ালাইজেশন ফাংশন
window.initMap = function(propertiesToMap = dummyProperties) {
    const mapContainer = document.getElementById('map-container');
    
    // ঢাকার কেন্দ্র
    const dhaka = { lat: 23.7772, lng: 90.3994 };
    
    // ম্যাপটি পুনরায় তৈরি করার জন্য
    if (mapContainer.hasChildNodes()) {
         mapContainer.innerHTML = '';
    }
    
    const map = new google.maps.Map(mapContainer, {
        zoom: 11,
        center: dhaka,
        mapId: 'DEMO_MAP_ID' // আপনার নিজস্ব Map ID ব্যবহার করুন
    });

    // প্রতিটি প্রপার্টির জন্য মার্কার তৈরি
    propertiesToMap.forEach(property => {
        if (property.lat && property.lng) {
            const marker = new google.maps.Marker({
                position: { lat: property.lat, lng: property.lng },
                map: map,
                title: property.title
            });

            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div>
                        <h4>${property.title}</h4>
                        <p><strong>${property.price}</strong></p>
                        <p>${property.location}</p>
                        <a href="property-details.html?id=${property.id}" target="_blank">বিস্তারিত দেখুন</a>
                    </div>
                `
            });

            marker.addListener("click", () => {
                infoWindow.open(map, marker);
            });
        }
    });
};


// --- ইভেন্ট লিসেনার সেটআপ ---

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
            if (auth.currentUser) {
                window.location.href = 'profile.html';
            } else {
                alert("প্রোফাইল দেখতে আপনাকে প্রথমে লগইন করতে হবে।");
                window.location.href = 'auth.html';
            }
        });
    }

    // গ্লোবাল সার্চ ইনপুট ইভেন্ট
    document.querySelector('.search-bar button').addEventListener('click', () => {
        const searchTerm = globalSearchInput.value.trim();
        // এখন গ্রিড ভিউতে সার্চ হবে, যদি গ্রিড ভিউ সক্রিয় থাকে
        if (propertyGridContainer.style.display === 'block') {
             // সক্রিয় ফিল্টার ক্যাটাগরি বের করা
             const activeBtn = document.querySelector('.nav-filters .nav-button.active');
             const activeCategory = activeBtn && activeBtn.dataset.category !== 'map' ? activeBtn.dataset.category : 'all';

             fetchAndDisplayProperties(activeCategory, searchTerm);
        } else {
             alert(`অনুগ্রহ করে সার্চ করার জন্য ম্যাপ ভিউ বন্ধ করে গ্রিড ভিউতে যান।`);
        }
    });
    
    
    // ✅ ফিল্টার বাটন ইভেন্ট (ম্যাপ, বিক্রয়, ভাড়া)
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const category = e.currentTarget.dataset.category;
            activateNavButton(e.currentTarget);
            
            // অন্য সব সেকশন লুকানো
            hideAllSections();

            if (category === 'map') {
                // ম্যাপ ভিউ
                mapSection.style.display = 'block';
                if (typeof window.initMap === 'function') {
                    // ম্যাপ লোড/রি-লোড করা
                    window.initMap(); 
                } else {
                    console.error("Google Maps API লোড হয়নি।");
                    document.getElementById('map-container').innerHTML = '<p style="text-align: center; padding-top: 250px; color: #e74c3c;">Google Maps API লোড করতে ব্যর্থ। আপনার API Key চেক করুন।</p>';
                }
            } else {
                // গ্রিড ভিউ (বিক্রয়/ভাড়া)
                fetchAndDisplayProperties(category, globalSearchInput.value.trim());
            }
        });
    });

    // সাইডবার লিঙ্ক ইভেন্ট (একই থাকবে)
    const sidebarLinks = [
        { id: homeLinkSidebar, section: propertyGridContainer, default: true },
        { id: tipsLinkSidebar, section: tipsSection },
        { id: aboutLinkSidebar, section: aboutSection },
        { id: contactLinkSidebar, section: contactSection }
    ];

    sidebarLinks.forEach(linkObj => {
        if (linkObj.id) {
            linkObj.id.addEventListener('click', (e) => {
                e.preventDefault();
                hideAllSections();
                linkObj.section.style.display = 'block';
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
                
                // হোম লিঙ্কে ক্লিক করলে বিক্রয় বাটন সক্রিয় করা 
                if (linkObj.default) {
                    activateNavButton(sellButton); // ডিফল্টভাবে বিক্রয় সক্রিয়
                    fetchAndDisplayProperties('বিক্রয়', ''); 
                } else {
                    // অন্য লিঙ্কে ক্লিক করলে nav-filters কে নিষ্ক্রিয় রাখা 
                    navButtons.forEach(btn => btn.classList.remove('active'));
                }
            });
        }
    });
}

// লগআউট হ্যান্ডেলার (সাইডবার থেকে লগআউট করার জন্য)
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
    
    // Auth State Change Handler (একই থাকবে)
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
