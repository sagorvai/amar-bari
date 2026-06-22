const db = firebase.firestore();
const auth = firebase.auth();

// UI Elements
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const menuButton = document.getElementById('menuButton');
const propertyGridContainer = document.getElementById('property-grid-container');
const mapSection = document.getElementById('map-section');
const propertyG = document.querySelector('.property-grid');
const mapViewToggleBtn = document.getElementById('mapViewToggleBtn');

const profileImage = document.getElementById('profileImage');
const defaultProfileIcon = document.getElementById('defaultProfileIcon');
const loginLinkSidebar = document.getElementById('login-link-sidebar');

// ফিল্টার ইনপুটসমূহ
const filterType = document.getElementById('filterType');
const filterDivision = document.getElementById('filterDivision');
const globalSearchInput = document.getElementById('globalSearchInput');
const btnAdvancedSearch = document.getElementById('btnAdvancedSearch');
const tabButtons = document.querySelectorAll('.fb-tabs .fb-tab-btn:not(#mapViewToggleBtn)');

let map;

// প্রোফাইল ফটো লোডার
async function loadProfilePicture(user) {
    if (profileImage && defaultProfileIcon) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists && doc.data().profilePic) {
                profileImage.src = doc.data().profilePic;
                profileImage.style.display = 'block';
                defaultProfileIcon.style.display = 'none';
            }
        } catch (e) { console.error("Profile image loading failed", e); }
    }
}

// ফেসবুক স্টাইল পিন মেকার
function createCustomMarker(category, type) {
    const color = category === 'বিক্রয়' ? '#1877f2' : '#42b72a';
    return L.divIcon({
        html: `<div style="background:${color}; color:#fff; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.2);">${type}</div>`,
        className: 'fb-pin', iconSize: [65, 28]
    });
}

async function initMap(category) {
    if (map) map.remove();
    map = L.map('map-container').setView([22.8456, 89.5403], 12); // ডিফল্ট খুলনা লোকেশন ফোকাস
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    try {
        const snap = await db.collection('properties').where('category', '==', category).where('status', '==', 'published').get();
        snap.forEach(doc => {
            const data = doc.data();
            if (data.location?.lat && data.location?.lng) {
                const marker = L.marker([data.location.lat, data.location.lng], {
                    icon: createCustomMarker(data.category, data.type || 'বাসা')
                }).addTo(map);
                marker.bindPopup(`<b>${data.title}</b><br>মূল্য: ৳ ${data.price}<br><a href="details.html?id=${doc.id}">পোস্টে যান</a>`);
            }
        });
    } catch (err) { console.error(err); }
}

// ফেসবুক গ্যালারি ইমেজ স্লাইডার ইন্টিগ্রেশন
function setupSliderLogic() {
    document.querySelectorAll('.fb-slider-btn').forEach(button => {
        button.onclick = function(e) {
            e.preventDefault(); e.stopPropagation();
            const slider = e.target.closest('.fb-slider');
            const slides = slider.querySelectorAll('.fb-slide-item');
            const total = parseInt(slider.dataset.totalSlides);
            let idx = parseInt(slider.dataset.currentIndex);

            if (e.target.classList.contains('fb-next')) {
                idx = (idx + 1) % total;
            } else {
                idx = (idx - 1 + total) % total;
            }

            slides.forEach(s => s.style.display = 'none');
            slides[idx].style.display = 'block';
            slider.dataset.currentIndex = idx;
        };
    });

    // লাইক বাটনের কাস্টম টগল ইন্টারেকশন লজিক
    document.querySelectorAll('.like-btn-toggle').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault(); e.stopPropagation();
            this.classList.toggle('liked');
            const countSpan = this.querySelector('.like-count');
            let count = parseInt(countSpan.textContent);
            if (this.classList.contains('liked')) {
                this.style.color = '#1877f2';
                countSpan.textContent = count + 1;
            } else {
                this.style.color = 'inherit';
                countSpan.textContent = count - 1;
            }
        };
    });
}

// ফেসবুক পোস্ট স্টাইল প্রোপার্টি জেনারেটর
function createFbPostHTML(docId, data) {
    const title = data.title || 'শিরোনামহীন আবাসন';
    const district = data.location?.district || 'খুলনা';
    const thana = data.location?.thana || 'সোনাডাঙ্গা';
    const price = data.price ? new Intl.NumberFormat('bn-BD').format(data.price) : 'আলোচনা সাপেক্ষে';
    const images = data.images || [];

    const hasDocs = data.documents && (data.documents.khotian || data.documents.sketch);
    const verifiedBadge = hasDocs ? `<span class="badge-verified">✓ কাগজ ভেরিফাইড</span>` : '';

    let mediaHTML = `<div class="fb-slide-item" style="background-image: url('https://via.placeholder.com/500x260?text=No+Photo'); display:block;"></div>`;
    if (images.length > 0) {
        mediaHTML = images.map((img, i) => `<div class="fb-slide-item" style="background-image: url('${img.url || img}'); display:${i === 0 ? 'block' : 'none'};"></div>`).join('');
    }

    const navArrows = images.length > 1 ? `
        <button class="fb-slider-btn fb-prev">&#10094;</button>
        <button class="fb-slider-btn fb-next">&#10095;</button>
    ` : '';

    return `
        <div class="fb-feed-card">
            <div class="card-author-header">
                <div class="author-info">
                    <div class="author-avatar"><i class="material-icons">account_balance</i></div>
                    <div class="author-meta">
                        <h4>${data.type || 'ফ্ল্যাট'} - সরাসরি মালিক</h4>
                        <p><i class="material-icons" style="font-size:12px;">place</i> ${thana}, ${district}</p>
                    </div>
                </div>
                <div style="display:flex; gap:6px;">
                    ${verifiedBadge}
                    <span class="badge-category">${data.category}</span>
                </div>
            </div>
            
            <div class="card-body-text">
                <b>${title}</b><br>
                বেডরুম: ${data.bedrooms || '-'} টি | বাথরুম: ${data.bathrooms || '-'} টি। দালালমুক্ত সরাসরি যোগাযোগের জন্য নিচে দেওয়া বাটনে ক্লিক করুন।
            </div>

            <div class="card-media-section">
                <div class="fb-slider" data-current-index="0" data-total-slides="${images.length}">
                    ${mediaHTML}
                    ${navArrows}
                </div>
                <div class="price-tag-overlay">৳ ${price} ${data.category === 'ভাড়া' ? '/মাস' : ''}</div>
            </div>

            <div class="fb-stats-bar">
                <div class="fb-reactions"><i class="material-icons fb-react-icon">thumb_up</i><span class="likes-num">১২ জন পছন্দ করেছেন</span></div>
                <div>৫টি কমেন্ট</div>
            </div>

            <div class="fb-action-buttons">
                <button class="fb-action-btn like-btn-toggle"><i class="material-icons">thumb_up_off_alt</i> লাইক (<span class="like-count">12</span>)</button>
                <a href="details.html?id=${docId}" class="fb-action-btn" style="text-decoration:none;"><i class="material-icons">chat_bubble_outline</i> কমেন্ট ও যোগাযোগ</a>
            </div>
        </div>
    `;
}

async function fetchProperties(category) {
    if (!propertyG) return;
    propertyG.innerHTML = '<p style="text-align:center; padding:20px; color:var(--text-sub);">নিউজ ফিড রিফ্রেশ হচ্ছে...</p>';
    
    try {
        let snap = await db.collection('properties').where('category', '==', category).where('status', '==', 'published').get();
        let html = '';
        
        const searchTxt = globalSearchInput.value.toLowerCase().trim();
        const typeTxt = filterType.value;
        const divisionTxt = filterDivision.value;

        snap.forEach(doc => {
            const data = doc.data();
            if (typeTxt && data.type !== typeTxt) return;
            if (divisionTxt && data.location?.division !== divisionTxt) return;
            if (searchTxt && !data.title?.toLowerCase().includes(searchTxt) && !data.location?.district?.toLowerCase().includes(searchTxt)) return;

            html += createFbPostHTML(doc.id, data);
        });

        propertyG.innerHTML = html || '<p style="text-align:center; padding:40px; color:var(--text-sub);">ফিডে এই মুহূর্তে কোনো পোস্ট নেই।</p>';
        setupSliderLogic();
    } catch (err) { console.error(err); }
}

// ইনিশিয়াল লিসেনারস
document.addEventListener('DOMContentLoaded', () => {
    fetchProperties('বিক্রয়');

    if (menuButton) {
        menuButton.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
        overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    }

    tabButtons.forEach(btn => {
        btn.onclick = function() {
            tabButtons.forEach(b => b.classList.remove('active'));
            if (mapViewToggleBtn) mapViewToggleBtn.classList.remove('active');
            this.classList.add('active');
            propertyGridContainer.style.display = 'block';
            mapSection.style.display = 'none';
            fetchProperties(this.getAttribute('data-category'));
        };
    });

    if (mapViewToggleBtn) {
        mapViewToggleBtn.onclick = function() {
            tabButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            propertyGridContainer.style.display = 'none';
            mapSection.style.display = 'block';
            const activeTab = document.querySelector('.fb-tabs .fb-tab-btn.active');
            initMap(activeTab ? activeTab.getAttribute('data-category') : 'বিক্রয়');
        };
    }

    if (btnAdvancedSearch) {
        btnAdvancedSearch.onclick = () => {
            const activeTab = document.querySelector('.fb-tabs .fb-tab-btn.active');
            fetchProperties(activeTab ? activeTab.getAttribute('data-category') : 'বিক্রয়');
        };
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user);
            if (loginLinkSidebar) loginLinkSidebar.innerHTML = '<i class="material-icons">logout</i> লগআউট';
        }
    });
});
