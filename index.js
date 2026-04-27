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

let map;

// --- ১. ছবি ও ধরন অনুযায়ী আকর্ষণীয় কাস্টম পিন তৈরি ---
function createCustomMarker(category, propertyType) {
    const color = category === 'বিক্রয়' ? '#e74c3c' : '#2ecc71'; // বিক্রয় লাল, ভাড়া সবুজ
    
    // আপনার দেওয়া ছবির মতো পিন ডিজাইন (নিচে সুচালো এবং উপরে গোল)
    return L.divIcon({
        html: `
            <div style="position: relative; width: 60px; height: 35px; display: flex; flex-direction: column; align-items: center;">
                <div style="
                    background-color: ${color}; 
                    color: white; 
                    padding: 4px 8px; 
                    border-radius: 15px; 
                    font-size: 11px; 
                    font-weight: bold; 
                    white-space: nowrap;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                    z-index: 2;
                    text-align: center;
                    min-width: 50px;">
                    ${propertyType}
                </div>
                <div style="
                    width: 0; 
                    height: 0; 
                    border-left: 7px solid transparent;
                    border-right: 7px solid transparent;
                    border-top: 10px solid ${color};
                    margin-top: -2px;
                    z-index: 1;">
                </div>
            </div>`,
        className: 'custom-pin',
        iconSize: [60, 45],
        iconAnchor: [30, 45] // পিনের একদম নিচের বিন্দুকে লোকেশনে সেট করবে
    });
}

// --- ২. ম্যাপ ও ইউজার লোকেশন লজিক ---
async function initMap() {
    if (map) { map.remove(); }

    // ডিফল্ট ঢাকা সেন্টার
    map = L.map('map-container').setView([23.8103, 90.4125], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // ইউজারের বর্তমান লোকেশন খোঁজা
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;

            // ইউজার যেখানে দাঁড়িয়ে আছেন সেখানে একটি নীল পিন
            L.marker([userLat, userLng], {
                icon: L.divIcon({
                    html: '<div style="background-color: #3498db; width: 15px; height: 15px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px #3498db;"></div>',
                    className: 'user-location'
                })
            }).addTo(map).bindPopup("আপনি এখানে আছেন").openPopup();

            // ম্যাপটি ইউজারের কাছাকাছি জুম করা
            map.setView([userLat, userLng], 13);
        }, () => {
            console.log("ইউজার লোকেশন অ্যাক্সেস পাওয়া যায়নি।");
        });
    }

    try {
        const snapshot = await db.collection('properties').where('status', '==', 'published').get();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.location && data.location.lat && data.location.lng) {
                const marker = L.marker([data.location.lat, data.location.lng], {
                    icon: createCustomMarker(data.category, data.type ||'প্রপার্টি' )
                }).addTo(map);

                marker.on('click', () => {
                    window.location.href = `details.html?id=${doc.id}`;
                });
            }
        });
    } catch (error) {
        console.error("ম্যাপ ডেটা লোড সমস্যা:", error);
    }
}

// --- আপনার মূল ফাইলের বাকি ফাংশনগুলো (অপরিবর্তিত) ---

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
        } catch (error) { console.error(error); }
    }
}

function setupSliderLogic() {
    document.querySelectorAll('.slider-nav-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); e.stopPropagation(); 
            const card = e.target.closest('.property-card');
            const slider = card.querySelector('.image-slider');
            const slides = slider.querySelectorAll('.slider-item');
            const totalSlides = parseInt(slider.dataset.totalSlides);
            if (totalSlides <= 1) return;
            let currentIndex = parseInt(slider.dataset.currentIndex);
            if (e.target.classList.contains('next-btn')) { currentIndex = (currentIndex + 1) % totalSlides; } 
            else { currentIndex = (currentIndex - 1 + totalSlides) % totalSlides; }
            slides.forEach(slide => slide.style.display = 'none');
            slides[currentIndex].style.display = 'block';
            slider.dataset.currentIndex = currentIndex;
        });
    });
}

function createPropertyCardHTML(property) {
    const propertyId = property.id;
    const title = property.title || 'শিরোনামবিহীন';
    const district = property.location?.district || 'অজানা জেলা';
    const thana = property.location?.thana || 'অজানা থানা';
    const village = property.location?.village || property.location?.area || 'অজানা এলাকা';
    const fullLocation = `${village}, ${thana}, ${district}`;
    const category = property.category || 'বিক্রয়';
    const propertyType = property.Type || '-';
    const priceValue = property.price ? new Intl.NumberFormat('bn-BD').format(property.price) : 'আলোচনা সাপেক্ষে';

    const images = property.images || [];
    const sliderItemsHTML = images.map((img, idx) => 
        `<div class="slider-item" style="background-image: url('${img.url}'); ${idx === 0 ? 'display: block;' : 'display: none;'}"></div>`
    ).join('');

    return `
        <a href="details.html?id=${propertyId}" class="property-card">
            <div class="property-image-container slider-container">
                <div class="image-slider" data-current-index="0" data-total-slides="${images.length}">${sliderItemsHTML}</div>
                ${images.length > 1 ? '<button class="slider-nav-btn prev-btn">&#10094;</button><button class="slider-nav-btn next-btn">&#10095;</button>' : ''}
                <span class="property-category">${category}</span>
            </div>
            <div class="property-details">
                <h3 class="property-title">${title}</h3>
                <p class="property-location"><i class="material-icons">location_on</i> ${fullLocation}</p>
                <div class="property-specs"><span><i class="material-icons">home</i> ${propertyType}</span></div>
                <div class="property-price">${category === 'ভাড়া' ? '৳ ' + priceValue + ' /মাস' : '৳ ' + priceValue}</div>
            </div>
        </a>`;
}

async function fetchAndDisplayProperties(category, searchTerm = '') {
    const isMapView = category === 'map';
    const propertyGridContainer = document.getElementById('property-grid-container');
    const mapSection = document.getElementById('map-section');
    
    if (isMapView) {
        propertyGridContainer.style.display = 'none';
        mapSection.style.display = 'block';
        initMap(); 
        return;
    }

    propertyGridContainer.style.display = 'block';
    mapSection.style.display = 'none';
    propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';

    try {
        const snapshot = await db.collection('properties')
                                 .where('category', '==', category)
                                 .where('status', '==', 'published')
                                 .orderBy('createdAt', 'desc').get();
        
        let html = '';
        const sTerm = searchTerm.trim().toLowerCase();
        snapshot.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            if (!sTerm || data.title?.toLowerCase().includes(sTerm) || data.location?.district?.toLowerCase().includes(sTerm)) {
                html += createPropertyCardHTML(data);
            }
        });
        propertyG.innerHTML = html || '<p class="no-results-message">কিছু পাওয়া যায়নি।</p>';
        setupSliderLogic();
    } catch (e) { console.error(e); }
}

// ইভেন্ট লিসেনার ও অন্যান্য (অপরিবর্তিত)
function setupUIEventListeners() {
    menuButton.onclick = () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
    overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    navButtons.forEach(btn => btn.onclick = () => {
        navButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        fetchAndDisplayProperties(btn.dataset.category, globalSearchInput.value);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    fetchAndDisplayProperties('বিক্রয়', '');
    auth.onAuthStateChanged(user => {
        if (user) { 
            loadProfilePicture(user); 
            if (loginLinkSidebar) { loginLinkSidebar.textContent = 'লগআউট'; loginLinkSidebar.onclick = () => auth.signOut(); }
        }
    });
});
