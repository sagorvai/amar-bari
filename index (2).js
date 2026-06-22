// Firebase SDKs setup
const db = firebase.firestore();
const auth = firebase.auth();

// UI Elements
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

const notificationButton = document.getElementById('notificationButton'); 
const messageButton = document.getElementById('messageButton');
const headerPostButton = document.getElementById('headerPostButton'); 
const profileImageWrapper = document.getElementById('profileImageWrapper'); 
const profileImage = document.getElementById('profileImage'); 
const defaultProfileIcon = document.getElementById('defaultProfileIcon'); 

const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');
const postCount = document.getElementById('post-count'); 

const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const loginLinkSidebar = document.getElementById('login-link-sidebar');
const globalSearchInput = document.getElementById('globalSearchInput');
const searchBtn = document.getElementById('searchBtn');
const langSelect = document.getElementById('langSelect');

let map;
let currentLanguage = 'bn';

// --- Multi-Language Dictionary ---
const translations = {
    bn: {
        title: "আমার বাড়ি.কম | বাংলাদেশ ও খুলনায় ফ্ল্যাট, প্লট এবং বাড়ি কেনাবেচার সেরা মাধ্যম",
        mainHeading: "খুলনা ও বাংলাদেশে ফ্ল্যাট, প্লট এবং বাড়ি কেনাবেচার সেরা মাধ্যম - আমার বাড়ি.কম",
        searchPlaceholder: "প্রপার্টি খুঁজুন (যেমন: খুলনা, ফ্ল্যাট)...",
        btnSale: "বিক্রয়",
        btnRent: "ভাড়া",
        mapToggle: "ম্যাপ ভিউ",
        mapTitle: "📍 প্রপার্টি ম্যাপ ভিউ",
        mapLoading: "ম্যাপ লোড হচ্ছে...",
        titleRecent: "🆕 সাম্প্রতিক প্রপার্টিসমূহ (Recent Properties)",
        titleFeatured: "⭐ জনপ্রিয় ও ভেরিফাইড প্রপার্টি (Featured Properties)",
        titleLocations: "📍 প্রধান লোকেশন ভিত্তিক লিস্টিং",
        seoTitle: "আমার বাড়ি.কম - দالاলি মুক্ত বাংলাদেশের একমাত্র আবাসন সামাজিক মাধ্যম",
        seoBody: "<p>বর্তমান ডিজিটাল যুগে সঠিক ও ঝামেলামুক্ত উপায়ে নিজের জন্য একটি আবাসন বা প্রপার্টি খুঁজে নেওয়া বেশ কঠিন। "আমার বাড়ি.কম" আপনাকে দিচ্ছে কোনো দালাল বা মধ্যস্বত্বভোগী ছাড়াই সরাসরি প্রপার্টি মালিকের সাথে যোগাযোগের এক অনন্য সুযোগ। এখানে আপনি খুলনা বিভাগসহ বাংলাদেশের যেকোনো প্রান্তের জমি, ফ্ল্যাট, কমার্শিয়াল স্পেস বা স্বাধীন বাড়ি কেনাবেচা ও ভাড়া নেওয়ার ডাইনামিক লাইভ লিস্টিং দেখতে পাবেন। আমাদের বিশেষত্ব হলো বিজ্ঞাপনের স্বচ্ছতা—যেখানে প্রপার্টির বাহ্যিক রূপের পাশাপাশি আইনি মালিকানা নিশ্চিত করতে খতিয়ান এবং স্কেচ বা ভূমির নকশা সরাসরি দেখার ফিচার যুক্ত রয়েছে। নিরাপদ ও commission-মুক্ত আবাসন গড়ার এই যাত্রায় আমাদের সাথেই থাকুন।</p><p>গুগল সার্চ ইঞ্জিন ফ্রেন্ডলি ইন্টারফেসের কারণে আমাদের প্রতিটা ডিটেইলস পেজ অত্যন্ত দ্রুত ইনডেক্স হয়। ক্রেতা এবং বিক্রেতার মাঝে সরাসরি মেলবন্ধন তৈরি করাই আমাদের লক্ষ্য। কোনো হিডেন চার্জ ছাড়াই আপনার প্রপার্টি লিস্টিং সাবমিট করুন এবং সেরা ডিলটি লুফে নিন।</p>",
        footerText: "&copy; 2026 আমার বাড়ি.কম। ফেসবুক স্টাইল আবাসন সামাজিক যোগাযোগ মাধ্যম। সর্বস্বত্ব সংরক্ষিত。",
        unknownDistrict: "অজানা জেলা",
        unknownThana: "অজানা থানা",
        unknownArea: "অজানা এলাকা",
        untitledProperty: "শিরোনামবিহীন প্রপার্টি",
        sqft: "স্কয়ার ফিট",
        discuss: "আলোচনা সাপেক্ষে",
        perMonth: "/মাস",
        loading: "লোড হচ্ছে...",
        noResults: "কোনো প্রপার্টি পাওয়া যায়নি।"
    },
    en: {
        title: "AmarBari.com | Best platform to buy, sell, or rent flats, plots & houses in Bangladesh & Khulna",
        mainHeading: "Best platform to Buy, Sell, Rent Flats, Plots & Houses in Khulna & BD - AmarBari.com",
        searchPlaceholder: "Search properties (e.g., Khulna, Flat)...",
        btnSale: "Sale",
        btnRent: "Rent",
        mapToggle: "Map View",
        mapTitle: "📍 Property Map View",
        mapLoading: "Loading map...",
        titleRecent: "🆕 Recent Properties",
        titleFeatured: "⭐ Popular & Verified Properties (Featured)",
        titleLocations: "📍 Listings by Top Locations",
        seoTitle: "AmarBari.com - Bangladesh's Only Broker-Free Real Estate Social Network",
        seoBody: "<p>In today's digital era, finding the perfect housing or property safely and without hassle is often quite challenging. "AmarBari.com" offers you a unique opportunity to directly connect with property owners without any brokers or third-party middlemen. Here, you will find dynamic live listings for land, flats, commercial spaces, or independent houses for sale and rent across any corner of Bangladesh, including Khulna Division. Our specialization is ad transparency—featuring the ability to view sub-deeds, land maps, and ledger copies directly online to ensure legal ownership. Stay with us in building a safe and commission-free real estate network.</p>",
        footerText: "&copy; 2026 AmarBari.com. Facebook-style real estate social network. All rights reserved.",
        unknownDistrict: "Unknown District",
        unknownThana: "Unknown Thana",
        unknownArea: "Unknown Area",
        untitledProperty: "Untitled Property",
        sqft: "Sqft",
        discuss: "Negotiable",
        perMonth: "/mo",
        loading: "Loading properties...",
        noResults: "No properties found matching your criteria."
    }
};

// --- Apply Language Updates to DOM ---
function updateLanguage(lang) {
    currentLanguage = lang;
    const t = translations[lang];

    document.title = t.title;
    document.getElementById('main-heading').textContent = t.mainHeading;
    globalSearchInput.placeholder = t.searchPlaceholder;
    document.getElementById('btn-sale').textContent = t.btnSale;
    document.getElementById('btn-rent').textContent = t.btnRent;
    document.getElementById('txt-map').textContent = t.mapToggle;
    document.getElementById('map-title').textContent = t.mapTitle;
    document.getElementById('map-loading-text').textContent = t.mapLoading;
    document.getElementById('title-recent').textContent = t.titleRecent;
    document.getElementById('title-featured').textContent = t.titleFeatured;
    document.getElementById('title-locations').textContent = t.titleLocations;
    document.getElementById('seo-title').textContent = t.seoTitle;
    document.getElementById('seo-body').innerHTML = t.seoBody;
    document.getElementById('footer-text').innerHTML = t.footerText;

    // Re-fetch current data to match selected language representation
    const activeBtn = document.querySelector('.nav-filters .nav-button.active');
    const category = activeBtn ? activeBtn.getAttribute('data-category') : 'বিক্রয়';
    fetchAndDisplayProperties(category, globalSearchInput.value);
}

// --- Dynamic Image Slider Inside Cards ---
function setupSliderLogic() {
    const sliderButtons = document.querySelectorAll('.slider-nav-btn');
    sliderButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation(); 

            const card = e.target.closest('.property-card');
            const slider = card.querySelector('.image-slider');
            const slides = slider.querySelectorAll('.slider-item');
            const totalSlides = parseInt(slider.dataset.totalSlides);
            
            if (totalSlides <= 1) return;

            let currentIndex = parseInt(slider.dataset.currentIndex);
            
            if (e.target.classList.contains('next-btn')) {
                currentIndex = (currentIndex + 1) % totalSlides;
            } else if (e.target.classList.contains('prev-btn')) {
                currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            }
            
            slides.forEach(slide => slide.style.display = 'none');
            slides[currentIndex].style.display = 'block';
            slider.dataset.currentIndex = currentIndex;
        });
    });
}

// --- HTML Property Card Constructor ---
function createPropertyCardHTML(property) {
    const t = translations[currentLanguage];
    const propertyId = property.id;
    const title = property.title || t.untitledProperty;
    
    const district = property.location?.district || t.unknownDistrict;
    const thana = property.location?.thana || t.unknownThana;
    const village = property.location?.village || property.location?.area || t.unknownArea; 
    const fullLocation = `${village}, ${thana}, ${district}`;

    const category = property.category || 'বিক্রয়';
    const propertyType = property.Type || '-';
    const sizeSqft = property.sizeSqft || property.landArea || '-'; 
    const sizeUnit = currentLanguage === 'bn' ? (property.sizeUnit || 'স্কয়ার ফিট') : 'Sqft'; 
    const displaySize = sizeSqft !== '-' ? `${sizeSqft} ${sizeUnit}` : '-';
    
    const bedrooms = property.bedrooms || '-';
    const bathrooms = property.bathrooms || '-';
    
    const priceValue = property.price ? new Intl.NumberFormat(currentLanguage === 'bn' ? 'bn-BD' : 'en-US').format(property.price) : t.discuss;
    let priceDetailsHTML = '';
    let specsHTML = ''; 
    
    if (category === 'বিক্রয়') {
        priceDetailsHTML = `<div class="property-price sale-price">৳ ${priceValue}</div>`;
        specsHTML = `
            <span title="Type"><i class="material-icons">home</i> ${propertyType}</span>
            <span title="Size"><i class="material-icons">square_foot</i> ${displaySize}</span>
            <span title="Bedrooms"><i class="material-icons">king_bed</i> ${bedrooms}</span> 
        `;
    } else {
        priceDetailsHTML = `<div class="property-price rent-price">৳ ${priceValue} <span class="unit">${t.perMonth}</span></div>`;
        specsHTML = `
            <span title="Type"><i class="material-icons">home</i> ${propertyType}</span>
            <span title="Bedrooms"><i class="material-icons">king_bed</i> ${bedrooms}</span>
            <span title="Bathrooms"><i class="material-icons">bathtub</i> ${bathrooms}</span>
        `;
    }

    const images = property.images || [];
    // If no images are available, apply a placeholder
    const finalImages = images.length > 0 ? images : [{url: 'https://via.placeholder.com/400x250?text=AmarBari'}];
    
    const sliderItemsHTML = finalImages.map((img, idx) => 
        `<div class="slider-item" style="background-image: url('${img.url}'); ${idx === 0 ? 'display: block;' : 'display: none;'}"></div>`
    ).join('');

    const sliderNav = finalImages.length > 1 ? `
        <button class="slider-nav-btn prev-btn">&#10094;</button>
        <button class="slider-nav-btn next-btn">&#10095;</button>
    ` : '';
    
    return `
        <a href="details.html?id=${propertyId}" class="property-card">
            <div class="property-image-container slider-container">
                <div class="image-slider" data-current-index="0" data-total-slides="${finalImages.length}">
                    ${sliderItemsHTML}
                </div>
                ${sliderNav}
                <span class="property-category">${category === 'বিক্রয়' ? t.btnSale : t.btnRent}</span>
            </div>
            <div class="property-details">
                <h3 class="property-title">${title}</h3>
                <p class="property-location"><i class="material-icons location-icon">location_on</i> ${fullLocation}</p>
                <div class="property-specs">${specsHTML}</div>
                ${priceDetailsHTML}
            </div>
        </a>`;
}

// --- Fetch and Display Real-time Properties (Firebase Firestore Integration) ---
async function fetchAndDisplayProperties(category = 'বিক্রয়', searchQuery = '', locationQuery = '') {
    const recentGrid = document.getElementById('recent-grid');
    const featuredGrid = document.getElementById('featured-grid');
    const t = translations[currentLanguage];

    if(recentGrid) recentGrid.innerHTML = `<p class="loading-message">${t.loading}</p>`;
    if(featuredGrid) featuredGrid.innerHTML = `<p class="loading-message">${t.loading}</p>`;

    try {
        let queryRef = db.collection('properties');
        
        // Filtering by active category (Sale/Rent)
        if (category) {
            queryRef = queryRef.where('category', '==', category);
        }

        const snapshot = await queryRef.orderBy('createdAt', 'desc').get();
        let properties = [];
        snapshot.forEach(doc => {
            properties.push({ id: doc.id, ...doc.data() });
        });

        // Search text filter logic
        if (searchQuery) {
            const sq = searchQuery.toLowerCase();
            properties = properties.filter(p => 
                (p.title && p.title.toLowerCase().includes(sq)) || 
                (p.location?.district && p.location.district.toLowerCase().includes(sq)) ||
                (p.location?.thana && p.location.thana.toLowerCase().includes(sq))
            );
        }

        // Location quick tags filter logic
        if (locationQuery) {
            const lq = locationQuery.toLowerCase();
            properties = properties.filter(p => 
                p.location?.district && p.location.district.toLowerCase().includes(lq)
            );
        }

        if (properties.length === 0) {
            const emptyMsg = `<p class="no-results-message">${t.noResults}</p>`;
            if(recentGrid) recentGrid.innerHTML = emptyMsg;
            if(featuredGrid) featuredGrid.innerHTML = emptyMsg;
            return;
        }

        // Recent section (Up to top 4 latest properties)
        const recentProperties = properties.slice(0, 4);
        if(recentGrid) {
            recentGrid.innerHTML = recentProperties.map(p => createPropertyCardHTML(p)).join('');
        }

        // Featured section (Simulated logic or based on a true 'isVerified/isFeatured' field)
        const featuredProperties = properties.filter(p => p.isVerified === true || p.isFeatured === true);
        const finalFeatured = featuredProperties.length > 0 ? featuredProperties : properties.slice(Math.max(0, properties.length - 4));
        if(featuredGrid) {
            featuredGrid.innerHTML = finalFeatured.map(p => createPropertyCardHTML(p)).join('');
        }

        // Re-bind image slider control buttons
        setupSliderLogic();
        
        // Update Leaflet markers if map is toggled open
        if (map) {
            updateMapMarkers(properties);
        }

    } catch (error) {
        console.error("Error fetching properties: ", error);
        const errMsg = `<p class="error-message">Error loading data</p>`;
        if(recentGrid) recentGrid.innerHTML = errMsg;
        if(featuredGrid) featuredGrid.innerHTML = errMsg;
    }
}

// --- Map Markers Updates ---
function updateMapMarkers(properties) {
    if (!map) return;
    // Clear old markers if necessary or re-initialize
    properties.forEach(p => {
        if (p.location?.lat && p.location?.lng) {
            L.marker([p.location.lat, p.location.lng])
                .addTo(map)
                .bindPopup(`<b>${p.title || 'Property'}</b><br>৳ ${p.price || ''}`);
        }
    });
}

// --- Profile Details Load ---
async function loadProfilePicture(user) {
    if (user) {
        if (profileImage) {
            profileImage.src = user.photoURL || 'https://via.placeholder.com/32';
            profileImage.style.display = 'block';
        }
        if (defaultProfileIcon) defaultProfileIcon.style.display = 'none';
    }
}

// --- Counts Updates Mock ---
function updateIconCounts() {
    if(notificationCount) notificationCount.textContent = '3';
    if(messageCount) messageCount.textContent = '5';
    if(postCount) postCount.textContent = '2';
}

// --- UI Event Listeners ---
function setupUIEventListeners() {
    // Language Dropdown Action
    if (langSelect) {
        langSelect.addEventListener('change', (e) => {
            updateLanguage(e.target.value);
        });
    }

    // Sidebar Toggle
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

    // Nav Category Buttons Filters Switcher
    navButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            if (e.target.id === 'btn-map-toggle' || e.target.closest('#btn-map-toggle')) {
                // Map section visibility toggling
                const mapSection = document.getElementById('map-section');
                if (mapSection.style.display === 'none') {
                    mapSection.style.display = 'block';
                    if (!map) {
                        map = L.map('map-container').setView([22.8456, 89.5403], 13); // Centered on Khulna
                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                            maxZoom: 19,
                        }).addTo(map);
                    }
                } else {
                    mapSection.style.display = 'none';
                }
                return;
            }

            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const category = btn.getAttribute('data-category');
            fetchAndDisplayProperties(category, globalSearchInput.value);
        });
    });

    // Main search logic triggers
    if (searchBtn) {
        searchBtn.addEventListener('click', () => {
            const activeBtn = document.querySelector('.nav-filters .nav-button.active');
            const category = activeBtn ? activeBtn.getAttribute('data-category') : 'বিক্রয়';
            fetchAndDisplayProperties(category, globalSearchInput.value);
        });
    }

    // Quick location selection tags trigger
    const locButtons = document.querySelectorAll('.loc-tag-btn');
    locButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const loc = btn.getAttribute('data-loc');
            const activeBtn = document.querySelector('.nav-filters .nav-button.active');
            const category = activeBtn ? activeBtn.getAttribute('data-category') : 'বিক্রয়';
            fetchAndDisplayProperties(category, '', loc);
        });
    });
}

function handleLogout(e) {
    e.preventDefault();
    auth.signOut().then(() => {
        window.location.reload();
    });
}

// --- Initialization Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user); 
            updateIconCounts(); 
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = currentLanguage === 'bn' ? 'লগআউট' : 'Logout';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            if (profileImage) profileImage.style.display = 'none';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = currentLanguage === 'bn' ? 'লগইন' : 'Login';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });
});
