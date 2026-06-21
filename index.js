// Firebase Setup
const db = firebase.firestore();
const auth = firebase.auth();

// UI Elements
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const propertyGridContainer = document.getElementById('property-grid-container');
const mapSection = document.getElementById('map-section');
const propertyG = document.querySelector('.property-grid');
const mapViewToggleBtn = document.getElementById('mapViewToggleBtn');

// নেভিগেশন ও প্রোফাইল এলিমেন্টস
const notificationButton = document.getElementById('notificationButton'); 
const messageButton = document.getElementById('messageButton');
const headerPostButton = document.getElementById('headerPostButton'); 
const profileImageWrapper = document.getElementById('profileImageWrapper'); 
const profileImage = document.getElementById('profileImage'); 
const defaultProfileIcon = document.getElementById('defaultProfileIcon'); 

const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');
const postCount = document.getElementById('post-count'); 

const navButtons = document.querySelectorAll('.nav-filters .nav-button:not(#mapViewToggleBtn)'); 
const loginLinkSidebar = document.getElementById('login-link-sidebar');

// অ্যাডভান্সড ফিল্টার ইনপুটস
const filterType = document.getElementById('filterType');
const filterDivision = document.getElementById('filterDivision');
const globalSearchInput = document.getElementById('globalSearchInput');
const btnAdvancedSearch = document.getElementById('btnAdvancedSearch');

let map;

// --- প্রোফাইল পিকচার লোডার ফাংশন ---
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
            console.error("Profile picture error:", error);
        }
    }
}

function updateIconCounts() {
    if (notificationCount) notificationCount.style.display = 'none';
    if (messageCount) messageCount.style.display = 'none';
    if (postCount) postCount.style.display = 'none';
}

// --- ম্যাপের কাস্টম মার্কার পিন (রোডম্যাপের কালার কোড অনুযায়ী) ---
function createCustomMarker(category, propertyType) {
    const color = category === 'বিক্রয়' ? '#ff4d4d' : '#28a745';
    return L.divIcon({
        html: `<div style="background-color: ${color}; color: white; padding: 5px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; white-space: nowrap; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); text-align: center;">${propertyType}</div>`,
        className: 'custom-pin',
        iconSize: [60, 25]
    });
}

// --- ম্যাপ ইনিশিয়ালাইজেশন ---
async function initMap(category) {
    if (map) { map.remove(); }
    map = L.map('map-container').setView([23.8103, 90.4125], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    try {
        const snapshot = await db.collection('properties').where('category', '==', category).where('status', '==', 'published').get();
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.location && data.location.lat && data.location.lng) {
                const marker = L.marker([data.location.lat, data.location.lng], {
                    icon: createCustomMarker(data.category, data.type || 'প্রপার্টি')
                }).addTo(map);
                marker.bindPopup(`<b>${data.title || 'শিরোনামহীন'}</b><br>মূল্য: ৳ ${data.price || 'আলোচনা সাপেক্ষে'}<br><a href="details.html?id=${doc.id}">বিস্তারিত দেখুন</a>`);
            }
        });
    } catch (error) { console.error("Map query error:", error); }
}

// --- স্লাইডার কন্ট্রোল লজিক (তোমার অরিজিনাল কোড) ---
function setupSliderLogic() {
    const sliderButtons = document.querySelectorAll('.slider-nav-btn');
    sliderButtons.forEach(button => {
        button.onclick = function(e) {
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
        };
    });
}

// --- প্রোপার্টি কার্ডের ডাইনামিক HTML জেনারেশন ---
function createPropertyCardHTML(property) {
    const propertyId = property.id;
    const title = property.title || 'শিরোনামবিহীন প্রপার্টি';
    const district = property.location?.district || 'অজানা জেলা';
    const thana = property.location?.thana || 'অজানা থানা';
    const fullLocation = `${thana}, ${district}`;

    const category = property.category || 'বিক্রয়';
    const propertyType = property.type || 'প্রপার্টি';
    const priceValue = property.price ? new Intl.NumberFormat('bn-BD').format(property.price) : 'আলোচনা সাপেক্ষে';
    
    // আইনি নথিপত্র (খতিয়ান বা নকশা) আপলোড করা থাকলে এসইও ভেরিফাইড ব্যাজ অন হবে
    const hasDocs = property.documents && (property.documents.khotian || property.documents.sketch);
    const verifiedBadge = hasDocs ? `<div class="verified-badge"><i class="material-icons" style="font-size:12px;">verified</i> ভেরিফাইড কাগজ</div>` : '';

    const images = property.images || [];
    let sliderItemsHTML = `<div class="slider-item" style="background-image: url('https://via.placeholder.com/300x180?text=No+Image'); display: block;"></div>`;
    
    if (images.length > 0) {
        sliderItemsHTML = images.map((img, idx) => {
            const url = img.url || img;
            return `<div class="slider-item" style="background-image: url('${url}'); ${idx === 0 ? 'display: block;' : 'display: none;'}"></div>`;
        }).join('');
    }

    const sliderNav = images.length > 1 ? `
        <button class="slider-nav-btn prev-btn">&#10094;</button>
        <button class="slider-nav-btn next-btn">&#10095;</button>
    ` : '';
    
    return `
        <a href="details.html?id=${propertyId}" class="property-card">
            ${verifiedBadge}
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
                <div class="property-specs">
                    <span><i class="material-icons">home</i> ${propertyType}</span>
                    <span><i class="material-icons">king_bed</i> ${property.bedrooms || '-'}</span>
                </div>
                <div class="property-price">৳ ${priceValue} ${category === 'ভাড়া' ? '<span style="font-size:12px;color:#666;">/মাস</span>' : ''}</div>
            </div>
        </a>`;
}

// --- ফেচ ও ডাইনামিক মাল্টি-ফিল্টার সার্চ মেকানিজম ---
async function fetchAndDisplayProperties(category) {
    if (!propertyG) return;
    propertyG.innerHTML = '<p style="text-align:center; width:100%; color:var(--gray-text);">লোডিং প্রপার্টি...</p>';

    try {
        let query = db.collection('properties').where('category', '==', category).where('status', '==', 'published');
        const snapshot = await query.get();
        
        let html = '';
        const searchTxt = globalSearchInput.value.toLowerCase().trim();
        const typeTxt = filterType.value;
        const divisionTxt = filterDivision.value;

        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;

            // মাল্টি-ফিল্টার ক্রস ম্যাচিং লজিক
            if (typeTxt && data.type !== typeTxt) return;
            if (divisionTxt && data.location?.division !== divisionTxt) return;
            
            if (searchTxt) {
                const titleMatch = (data.title || '').toLowerCase().includes(searchTxt);
                const districtMatch = (data.location?.district || '').toLowerCase().includes(searchTxt);
                const upazilaMatch = (data.location?.upazila || '').toLowerCase().includes(searchTxt);
                if (!titleMatch && !districtMatch && !upazilaMatch) return;
            }

            html += createPropertyCardHTML(data);
        });
        
        propertyG.innerHTML = html || `<p style="text-align:center; width:100%; color:var(--gray-text); padding:30px;">আপনার অনুসন্ধান অনুযায়ী কোনো প্রপার্টি পাওয়া যায়নি।</p>`;
        setupSliderLogic();
    } catch (error) {
        console.error("Error fetching properties:", error);
        propertyG.innerHTML = `<p style="text-align:center; width:100%; color:red;">প্রপার্টি লোড করতে ত্রুটি হয়েছে।</p>`;
    }
}

// --- ইউজার ইভেন্ট লিসেনার সেটআপ ---
function setupUIEventListeners() {
    if (menuButton && sidebar && overlay) {
        menuButton.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
        overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    }

    if (notificationButton) notificationButton.onclick = () => location.href = 'notifications.html';
    if (headerPostButton) headerPostButton.onclick = () => location.href = 'post.html';
    if (messageButton) messageButton.onclick = () => location.href = 'messages.html';
    if (profileImageWrapper) profileImageWrapper.onclick = () => location.href = 'profile.html';

    // বিক্রয় ও ভাড়া বাটন হ্যান্ডলিং
    navButtons.forEach(button => {
        button.addEventListener('click', function() {
            navButtons.forEach(btn => btn.classList.remove('active'));
            if (mapViewToggleBtn) mapViewToggleBtn.classList.remove('active');
            this.classList.add('active');
            
            if (propertyGridContainer) propertyGridContainer.style.display = 'block';
            if (mapSection) mapSection.style.display = 'none';
            
            fetchAndDisplayProperties(this.getAttribute('data-category'));
        });
    });

    // ম্যাপ ভিউ বাটন টগল অ্যাকশন
    if (mapViewToggleBtn) {
        mapViewToggleBtn.onclick = function() {
            navButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            if (propertyGridContainer) propertyGridContainer.style.display = 'none';
            if (mapSection) mapSection.style.display = 'block';
            
            const activeCatBtn = document.querySelector('.nav-filters .nav-button.active');
            const currentCat = activeCatBtn ? activeCatBtn.getAttribute('data-category') : 'বিক্রয়';
            initMap(currentCat);
        };
    }

    // অ্যাডভান্সড সার্চ বাটন এক্সিকিউশন
    if (btnAdvancedSearch) {
        btnAdvancedSearch.onclick = () => {
            if (propertyGridContainer.style.display === 'none') {
                if (mapViewToggleBtn) mapViewToggleBtn.click();
            } else {
                const activeCatBtn = document.querySelector('.nav-filters .nav-button.active');
                const currentCat = activeCatBtn ? activeCatBtn.getAttribute('data-category') : 'বিক্রয়';
                fetchAndDisplayProperties(currentCat);
            }
        };
    }
}

const handleLogout = async (e) => {
    e.preventDefault();
    try { await auth.signOut(); location.reload(); } catch (err) { console.error(err); }
};

// DOM Init
document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    fetchAndDisplayProperties('বিক্রয়'); 
    
    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user); 
            updateIconCounts(); 
            if (loginLinkSidebar) {
                loginLinkSidebar.innerHTML = '<i class="material-icons">exit_to_app</i> লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            if (profileImage) profileImage.style.display = 'none';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
            if (loginLinkSidebar) {
                loginLinkSidebar.innerHTML = '<i class="material-icons">lock_open</i> লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });
});
