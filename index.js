// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// নেভিগেশন ও প্রোফাইল উপাদান
const notificationButton = document.getElementById('notificationButton'); 
const messageButton = document.getElementById('messageButton');
const headerPostButton = document.getElementById('headerPostButton'); 
const profileImageWrapper = document.getElementById('profileImageWrapper'); 
const profileImage = document.getElementById('profileImage'); 
const defaultProfileIcon = document.getElementById('defaultProfileIcon'); 

// কাউন্টার উপাদান
const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');
const postCount = document.getElementById('post-count'); 

const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');
const globalSearchInput = document.getElementById('globalSearchInput');

// --- ম্যাপের জন্য নতুন ভেরিয়েবল ---
let map;

// --- সব পেজের হেডারে প্রোফাইল ইমেজ লোড করার সঠিক ফাংশন ---
async function loadProfilePicture(user) {
    const headerProfileImage = document.getElementById('profileImage'); 
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');

    if (headerProfileImage && defaultProfileIcon) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists && doc.data().profilePic) {
                headerProfileImage.src = doc.data().profilePic;
                headerProfileImage.style.display = 'block';
                defaultProfileIcon.style.display = 'none';
            } else {
                headerProfileImage.style.display = 'none';
                defaultProfileIcon.style.display = 'block';
            }
        } catch (error) {
            console.error("Header Profile Load Error:", error);
        }
    }
}

// --- কাউন্টার আপডেট করার ফাংশন (আপনার মূল কোড) ---
function updateIconCounts() {
    if (notificationCount) notificationCount.style.display = 'none';
    if (messageCount) messageCount.style.display = 'none';
    if (postCount) postCount.style.display = 'none';
}

// --- ম্যাপের জন্য কাস্টম আইকন তৈরির ফাংশন (নতুন যুক্ত) ---
function createCustomMarker(category, propertyType) {
    const color = category === 'বিক্রয়' ? '#ff4d4d' : '#28a745';
    return L.divIcon({
        html: `<div style="background-color: ${color}; color: white; padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; white-space: nowrap; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3); text-align: center;">${propertyType}</div>`,
        className: 'custom-pin',
        iconSize: [60, 30],
        iconAnchor: [30, 15]
    });
}

// --- ম্যাপ ইনিশিয়ালাইজ করার ফাংশন (নতুন যুক্ত) ---
async function initMap() {
    if (map) { map.remove(); }
    map = L.map('map-container').setView([23.8103, 90.4125], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    try {
        const snapshot = await db.collection('properties').where('status', '==', 'published').get();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.location && data.location.lat && data.location.lng) {
                const marker = L.marker([data.location.lat, data.location.lng], {
                    icon: createCustomMarker(data.category, data.type || 'প্রপার্টি')
                }).addTo(map);
                marker.on('click', () => { window.location.href = `details.html?id=${doc.id}`; });
            }
        });
    } catch (error) { console.error("Map Load Error:", error); }
}

// --- স্লাইডার নেভিগেশন লজিক (আপনার মূল কোড) ---
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

// --- প্রপার্টি কার্ডের HTML তৈরি (আপনার মূল কোড) ---
function createPropertyCardHTML(property) {
    const propertyId = property.id;
    const title = property.title || 'শিরোনামবিহীন প্রপার্টি';
    const district = property.location?.district || 'অজানা জেলা';
    const thana = property.location?.thana || 'অজানা থানা';
    const village = property.location?.village || property.location?.area || 'অজানা গ্রাম/এলাকা'; 
    const fullLocation = `${village}, ${thana}, ${district}`;

    const category = property.category || 'বিক্রয়';
    const propertyType = property.Type || '-';
    const sizeSqft = property.sizeSqft || property.landArea || '-'; 
    const sizeUnit = property.sizeUnit || 'স্কয়ার ফিট'; 
    const displaySize = sizeSqft !== '-' ? `${sizeSqft} ${sizeUnit}` : '-';
    
    const bedrooms = property.bedrooms || '-';
    const bathrooms = property.bathrooms || '-';
    
    const priceValue = property.price ? new Intl.NumberFormat('bn-BD').format(property.price) : 'আলোচনা সাপেক্ষে';
    let priceDetailsHTML = '';
    let specsHTML = ''; 
    
    if (category === 'বিক্রয়') {
        priceDetailsHTML = `<div class="property-price sale-price">৳ ${priceValue}</div>`;
        specsHTML = `
            <span title="ধরন"><i class="material-icons">home</i> ${propertyType}</span>
            <span title="পরিমাপ"><i class="material-icons">square_foot</i> ${displaySize}</span>
            <span title="বেডরুম"><i class="material-icons">king_bed</i> ${bedrooms}</span> 
        `;
    } else {
        priceDetailsHTML = `<div class="property-price rent-price">৳ ${priceValue} <span class="unit">/মাস</span></div>`;
        specsHTML = `
            <span title="ধরন"><i class="material-icons">home</i> ${propertyType}</span>
            <span title="বেডরুম"><i class="material-icons">king_bed</i> ${bedrooms}</span>
            <span title="বাথরুম"><i class="material-icons">bathtub</i> ${bathrooms}</span>
        `;
    }

    const images = property.images || [];
    const sliderItemsHTML = images.map((img, idx) => 
        `<div class="slider-item" style="background-image: url('${img.url}'); ${idx === 0 ? 'display: block;' : 'display: none;'}"></div>`
    ).join('');

    const sliderNav = images.length > 1 ? `
        <button class="slider-nav-btn prev-btn">&#10094;</button>
        <button class="slider-nav-btn next-btn">&#10095;</button>
    ` : '';
    
    return `
        <a href="details.html?id=${propertyId}" class="property-card">
            <div class="property-image-container slider-container">
                <div class="image-slider" data-current-index="0" data-total-slides="${images.length}">
                    ${sliderItemsHTML}
                </div>
                ${sliderNav}
                <span class="property-category">${category}</span>
            </div>
            <div class="property-details">
                <h3 class="property-title">${title}</h3>
                <p class="property-location"><i class="material-icons location-icon">location_on</i> ${fullLocation}</p>
                <div class="property-specs">${specsHTML}</div>
                ${priceDetailsHTML}
            </div>
        </a>`;
}

// --- প্রপার্টি ফেচ ও ডিসপ্লে ফাংশন (আপনার মূল লজিক + ম্যাপ কন্ডিশন) ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    const isMapView = (category === 'map');
    const propertyGridContainer = document.getElementById('property-grid-container');
    const mapSection = document.getElementById('map-section');

    if (isMapView) {
        if (propertyGridContainer) propertyGridContainer.style.display = 'none';
        if (mapSection) mapSection.style.display = 'block';
        propertyG.innerHTML = ''; 
        initMap(); 
        return;
    } else {
        if (propertyGridContainer) propertyGridContainer.style.display = 'block';
        if (mapSection) mapSection.style.display = 'none';
        propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';
    }

    try {
        let query = db.collection('properties')
                      .where('category', '==', category)
                      .where('status', '==', 'published') 
                      .orderBy('createdAt', 'desc');
        
        const snapshot = await query.get();
        if (snapshot.empty) {
            propertyG.innerHTML = `<p class="no-results-message">কোনো প্রপার্টি পাওয়া যায়নি।</p>`;
            return;
        }
        
        let html = '';
        const lowerSearchTerm = searchTerm.toLowerCase();

        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id; 

            // আপনার মূল সার্চ লজিক
            const titleMatch = data.title?.toLowerCase().includes(lowerSearchTerm);
            const cityMatch = data.location?.district?.toLowerCase().includes(lowerSearchTerm);
            const areaMatch = data.location?.area?.toLowerCase().includes(lowerSearchTerm) || data.location?.village?.toLowerCase().includes(lowerSearchTerm);

            if (!searchTerm || titleMatch || cityMatch || areaMatch) {
                html += createPropertyCardHTML(data);
            }
        });
        
        propertyG.innerHTML = html || `<p class="no-results-message">আপনার খোঁজা অনুযায়ী কিছু পাওয়া যায়নি।</p>`;
        setupSliderLogic();
    } catch (error) {
        console.error("Error fetching properties:", error);
        propertyG.innerHTML = `<p class="error-message">প্রপার্টি লোড করতে সমস্যা হয়েছে।</p>`;
    }
}

// --- লগআউট হ্যান্ডলার (আপনার মূল কোড) ---
const handleLogout = async (e) => {
    e.preventDefault();
    try {
        await auth.signOut();
        location.reload();
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

// --- ইভেন্ট লিসেনার সেটআপ (আপনার মূল কোড) ---
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

    if (notificationButton) notificationButton.onclick = () => location.href = 'notifications.html';
    if (headerPostButton) headerPostButton.onclick = () => location.href = 'post.html';
    if (messageButton) messageButton.onclick = () => location.href = 'messages.html';
    if (profileImageWrapper) profileImageWrapper.onclick = () => location.href = 'profile.html';

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.getAttribute('data-category');
            fetchAndDisplayProperties(category, globalSearchInput.value);
        });
    });

    if (globalSearchInput) {
        globalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const activeNavButton = document.querySelector('.nav-button.active');
                const category = activeNavButton ? activeNavButton.getAttribute('data-category') : 'বিক্রয়';
                fetchAndDisplayProperties(category, globalSearchInput.value);
            }
        });
    }
}

// --- DOMContentLoaded (আপনার মূল লজিক) ---
document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
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
