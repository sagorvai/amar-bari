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

let map; // গ্লোবাল ভেরিয়েবল যাতে বারবার ম্যাপ তৈরি না হয়

// --- পিনের জন্য কাস্টম আইকন তৈরি ---
function createCustomMarker(category, propertyType) {
    const color = category === 'বিক্রয়' ? '#ff4d4d' : '#28a745'; // বিক্রয় হলে লাল, ভাড়া হলে সবুজ
    
    return L.divIcon({
        html: `<div style="
                background-color: ${color}; 
                color: white; 
                padding: 5px 10px; 
                border-radius: 20px; 
                font-size: 12px; 
                font-weight: bold; 
                white-space: nowrap;
                border: 2px solid white;
                box-shadow: 0 2px 5px rgba(0,0,0,0.3);
                text-align: center;">
                ${propertyType}
               </div>`,
        className: 'custom-pin',
        iconSize: [60, 30],
        iconAnchor: [30, 15]
    });
}

// --- ম্যাপ ইনিশিয়ালাইজ ও পিন রেন্ডার ফাংশন ---
async function initMap() {
    if (map) {
        map.remove();
    }

    // ডিফল্ট ঢাকা লোকেশনে ম্যাপ সেট করা
    map = L.map('map-container').setView([23.8103, 90.4125], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    try {
        const snapshot = await db.collection('properties')
                                 .where('status', '==', 'published')
                                 .get();

        snapshot.forEach(doc => {
            const data = doc.data();
            const id = doc.id;
            
            if (data.location && data.location.lat && data.location.lng) {
                const marker = L.marker([data.location.lat, data.location.lng], {
                    icon: createCustomMarker(data.category, data.Type || 'প্রপার্টি')
                }).addTo(map);

                marker.on('click', () => {
                    window.location.href = `details.html?id=${id}`;
                });
            }
        });
    } catch (error) {
        console.error("ম্যাপ ডেটা লোড করতে সমস্যা:", error);
    }
}

// --- সব পেজের হেডারে প্রোফাইল ইমেজ লোড করার ফাংশন ---
async function loadProfilePicture(user) {
    if (profileImage && defaultProfileIcon) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists && doc.data().profilePic) {
                profileImage.src = doc.data().profilePic;
                profileImage.style.display = 'block';
                defaultProfileIcon.style.display = 'none';
            } else {
                profileImage.style.display = 'none';
                defaultProfileIcon.style.display = 'block';
            }
        } catch (error) {
            console.error("Header Profile Load Error:", error);
        }
    }
}

// --- প্রপার্টি কার্ডের HTML তৈরি ---
function createPropertyCardHTML(property) {
    const propertyId = property.id;
    const title = property.title || 'শিরোনামবিহীন';
    const district = property.location?.district || 'অজানা';
    const thana = property.location?.thana || 'অজানা';
    const village = property.location?.village || property.location?.area || 'অজানা'; 
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
        specsHTML = `<span><i class="material-icons">home</i> ${propertyType}</span><span><i class="material-icons">square_foot</i> ${displaySize}</span>`;
    } else {
        priceDetailsHTML = `<div class="property-price rent-price">৳ ${priceValue} <span class="unit">/মাস</span></div>`;
        specsHTML = `<span><i class="material-icons">home</i> ${propertyType}</span><span><i class="material-icons">king_bed</i> ${bedrooms}</span>`;
    }

    const images = property.images || [];
    const sliderItemsHTML = images.map((img, i) => `<div class="slider-item" style="background-image: url('${img.url}'); ${i === 0 ? 'display: block;' : 'display: none;'}"></div>`).join('');
    const sliderNav = images.length > 1 ? `<button class="slider-nav-btn prev-btn">&#10094;</button><button class="slider-nav-btn next-btn">&#10095;</button>` : '';

    return `
        <a href="details.html?id=${propertyId}" class="property-card">
            <div class="property-image-container slider-container">
                <div class="image-slider" data-current-index="0" data-total-slides="${images.length}">${sliderItemsHTML}</div>
                ${sliderNav}
                <span class="property-category">${category}</span>
            </div>
            <div class="property-details">
                <h3 class="property-title">${title}</h3>
                <p class="property-location"><i class="material-icons">location_on</i> ${fullLocation}</p>
                <div class="property-specs">${specsHTML}</div>
                ${priceDetailsHTML}
            </div>
        </a>`;
}

// --- মেইন ফেচ ফাংশন ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    const isMapView = category === 'map';
    const gridContainer = document.getElementById('property-grid-container');
    const mapSection = document.getElementById('map-section');

    if (isMapView) {
        gridContainer.style.display = 'none';
        mapSection.style.display = 'block';
        initMap();
        return;
    } else {
        gridContainer.style.display = 'block';
        mapSection.style.display = 'none';
        propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';
    }

    try {
        let query = db.collection('properties').where('category', '==', category).where('status', '==', 'published').orderBy('createdAt', 'desc');
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            propertyG.innerHTML = `<p class="no-results-message">কোনো প্রপার্টি পাওয়া যায়নি।</p>`;
            return;
        }

        let html = '';
        const sTerm = searchTerm.toLowerCase();
        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            if (!sTerm || data.title?.toLowerCase().includes(sTerm) || data.location?.district?.toLowerCase().includes(sTerm)) {
                html += createPropertyCardHTML(data);
            }
        });
        propertyG.innerHTML = html || `<p class="no-results-message">খোঁজা অনুযায়ী কিছু পাওয়া যায়নি।</p>`;
        setupSliderLogic();
    } catch (e) {
        console.error(e);
        propertyG.innerHTML = `<p class="error-message">লোড করতে সমস্যা হয়েছে।</p>`;
    }
}

// --- স্লাইডার লজিক ---
function setupSliderLogic() {
    document.querySelectorAll('.slider-nav-btn').forEach(btn => {
        btn.onclick = (e) => {
            e.preventDefault(); e.stopPropagation();
            const slider = e.target.closest('.property-card').querySelector('.image-slider');
            const items = slider.querySelectorAll('.slider-item');
            let idx = parseInt(slider.dataset.currentIndex);
            const total = parseInt(slider.dataset.totalSlides);

            idx = e.target.classList.contains('next-btn') ? (idx + 1) % total : (idx - 1 + total) % total;
            items.forEach(s => s.style.display = 'none');
            items[idx].style.display = 'block';
            slider.dataset.currentIndex = idx;
        };
    });
}

// --- ইভেন্ট লিসেনার ও ইনিশিয়ালাইজেশন ---
function setupUI() {
    menuButton.onclick = () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
    overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    
    navButtons.forEach(btn => {
        btn.onclick = () => {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            fetchAndDisplayProperties(btn.dataset.category, globalSearchInput.value);
        };
    });

    globalSearchInput.onkeypress = (e) => {
        if (e.key === 'Enter') {
            const cat = document.querySelector('.nav-button.active').dataset.category;
            fetchAndDisplayProperties(cat, globalSearchInput.value);
        }
    };
}

document.addEventListener('DOMContentLoaded', () => {
    setupUI();
    fetchAndDisplayProperties('বিক্রয়');
    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user);
            loginLinkSidebar.textContent = 'লগআউট';
            loginLinkSidebar.onclick = () => auth.signOut().then(() => location.reload());
        }
    });
});
