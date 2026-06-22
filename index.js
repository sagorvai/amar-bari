// Firebase Config Initialization
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');
const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');

let map;
let currentLang = localStorage.getItem('siteLang') || 'bn'; // ডিফল্ট ভাষা বাংলা

// --- 🌐 ভাষা ডিকশনারি (মাল্টি ল্যাংগুয়েজ ট্রান্সলেশন অবজেক্ট) ---
const languages = {
    bn: {
        logo: "আমার বাড়ি.কম",
        searchBtn: "কাঙ্ক্ষিত প্রপার্টি খুঁজুন",
        areaPlaceholder: "এলাকা (গ্রাম, থানা বা জেলা)",
        tabSell: "বিক্রয় প্রপার্টি",
        tabRent: "ভাড়া প্রপার্টি",
        mapView: "ম্যাপ ভিউ",
        mapTitle: "📍 প্রপার্টি ম্যাপ ভিউ",
        indSell: "বিক্রয় (লাল)",
        indRent: "ভাড়া (সবুজ)",
        home: "হোমপেজ",
        login: "লগইন",
        logout: "লগআউট",
        loading: "নিউজ ফিড আপডেট হচ্ছে...",
        noPost: "আপনার কাঙ্ক্ষিত ফিল্টারের সাথে মিলে এমন কোনো পোস্ট পাওয়া যায়নি।",
        error: "ফিড লোড করতে সমস্যা হয়েছে।",
        detailBtn: "বিস্তারিত ও যোগাযোগ",
        likeBtn: "লাইক",
        likedBy: "জন পছন্দ করেছেন",
        verified: "✓ কাগজ ভেরিফাইড",
        anonymous: "আমার বাড়ি ইউজার",
        goPost: "পোস্টে যান",
        priceTitle: "মূল্য: ৳",
        categories: [
            { val: "", text: "সব ক্যাটাগরি (বিক্রয়/ভাড়া)" },
            { val: "বিক্রয়", text: "বিক্রয় পোস্ট" },
            { val: "ভাড়া", text: "ভাড়া পোস্ট" }
        ],
        types: [
            { val: "", text: "সব ধরণের প্রপার্টি" },
            { val: "জমি", text: "জমি" },
            { val: "বাড়ি", text: "বাড়ি" },
            { val: "প্লট", text: "প্লট" },
            { val: "ফ্ল্যাট", text: "ফ্ল্যাট" },
            { val: "দোকান", text: "দোকান" },
            { val: "অফিস", text: "অফিস" }
        ]
    },
    en: {
        logo: "AmarBari.com",
        searchBtn: "Search Desired Property",
        areaPlaceholder: "Area (Village, Thana or District)",
        tabSell: "For Sale",
        tabRent: "For Rent",
        mapView: "Map View",
        mapTitle: "📍 Property Map View",
        indSell: "Sale (Red)",
        indRent: "Rent (Green)",
        home: "Homepage",
        login: "Login",
        logout: "Logout",
        loading: "Updating news feed...",
        noPost: "No properties found matching your filters.",
        error: "Failed to load feed.",
        detailBtn: "Details & Contact",
        likeBtn: "Like",
        likedBy: "people liked this",
        verified: "✓ Document Verified",
        anonymous: "Amar Bari User",
        goPost: "View Post",
        priceTitle: "Price: ৳",
        categories: [
            { val: "", text: "All Categories (Sale/Rent)" },
            { val: "বিক্রয়", text: "For Sale Posts" },
            { val: "ভাড়া", text: "For Rent Posts" }
        ],
        types: [
            { val: "", text: "All Property Types" },
            { val: "জমি", text: "Land" },
            { val: "বাড়ি", text: "House" },
            { val: "প্লট", text: "Plot" },
            { val: "ফ্ল্যাট", text: "Flat" },
            { val: "দোকান", text: "Shop" },
            { val: "অফিস", text: "Office" }
        ]
    }
};

// --- ভাষার ডেটা ইন্টারফেসে রেন্ডার করার মেথড ---
function applyLanguage() {
    const lang = languages[currentLang];
    
    document.getElementById('siteLogo').textContent = lang.logo;
    document.getElementById('txtSearchBtn').textContent = lang.searchBtn;
    document.getElementById('searchArea').placeholder = lang.areaPlaceholder;
    document.getElementById('tabSell').textContent = lang.tabSell;
    document.getElementById('tabRent').textContent = lang.tabRent;
    document.getElementById('txtMapView').textContent = lang.mapView;
    document.getElementById('txtMapTitle').textContent = lang.mapTitle;
    document.getElementById('txtIndSell').textContent = lang.indSell;
    document.getElementById('txtIndRent').textContent = lang.indRent;
    document.getElementById('menuHome').innerHTML = `<i class="material-icons">home</i> ${lang.home}`;
    
    // ক্যাটাগরি ড্রপডাউন রি-বিল্ড
    const catSelect = document.getElementById('searchCategory');
    const prevCatVal = catSelect.value;
    catSelect.innerHTML = lang.categories.map(c => `<option value="${c.val}">${c.text}</option>`).join('');
    catSelect.value = prevCatVal;

    // টাইপ ড্রপডাউন রি-বিল্ড
    const typeSelect = document.getElementById('searchType');
    const prevTypeVal = typeSelect.value;
    typeSelect.innerHTML = lang.types.map(t => `<option value="${t.val}">${t.text}</option>`).join('');
    typeSelect.value = prevTypeVal;

    document.getElementById('langLabel').textContent = currentLang === 'bn' ? 'EN' : 'BN';
    
    // রি-ফ্রেশ কন্টেন্ট 
    fetchAndDisplayProperties();
}

// --- প্রোফাইল ছবি ও কাউন্টার ম্যানেজারস ---
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
            }
        } catch (e) { console.error(e); }
    }
}

async function updateIconCounts() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const notifSnap = await db.collection('notifications').where('userId', '==', user.uid).where('read', '==', false).get();
        if (notificationCount) notificationCount.style.display = !notifSnap.empty ? (notificationCount.textContent = notifSnap.size, 'inline-block') : 'none';

        const msgSnap = await db.collection('messages').where('receiverId', '==', user.uid).where('read', '==', false).get();
        if (messageCount) messageCount.style.display = !msgSnap.empty ? (messageCount.textContent = msgSnap.size, 'inline-block') : 'none';
    } catch (e) { console.error(e); }
}

function handleLogout(e) {
    e.preventDefault();
    auth.signOut().then(() => window.location.reload());
}

// --- কাস্টমাইজড কালার-কোডেড ম্যাপ পিন (বিক্রয়=লাল, ভাড়া=সবুজ) ---
function createCustomMarker(category, type) {
    const color = category === 'বিক্রয়' ? '#ff4d4d' : '#42b72a';
    return L.divIcon({
        html: `<div style="background:${color}; color:#fff; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:bold; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;">${type}</div>`,
        className: 'fb-pin',
        iconSize: [65, 28]
    });
}

// --- ম্যাপ ইনিশিয়েলাইজেশন ---
async function initMap() {
    const mapSection = document.getElementById('map-section');
    if (!mapSection || mapSection.style.display === 'none') return;
    if (map) map.remove();
    
    map = L.map('map-container').setView([22.8456, 89.5403], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    try {
        const snap = await db.collection('properties').where('status', '==', 'published').get();
        snap.forEach(doc => {
            const data = doc.data();
            if (data.location && data.location.lat && data.location.lng) {
                const marker = L.marker([data.location.lat, data.location.lng], {
                    icon: createCustomMarker(data.category, data.type || 'Property')
                }).addTo(map);
                
                let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
                let displayPrice = amount ? new Intl.NumberFormat(currentLang === 'bn' ? 'bn-BD' : 'en-US').format(amount) : '---';

                marker.bindPopup(`
                    <div style="font-family: inherit; text-align:center; min-width:140px;">
                        <b style="font-size:14px; color:#1877f2;">${data.title || 'Property'}</b><br>
                        ${languages[currentLang].priceTitle} ${displayPrice}<br>
                        <a href="details.html?id=${doc.id}" style="display:inline-block; margin-top:8px; background:#1877f2; color:#fff; padding:4px 10px; text-decoration:none; border-radius:6px; font-size:12px; font-weight:bold; width:80%;">${languages[currentLang].goPost}</a>
                    </div>
                `);
            }
        });
    } catch (err) { console.error(err); }
}

// --- স্লাইডার এবং লাইক বাটন লজিক ---
function setupSliderAndLikeLogic() {
    document.querySelectorAll('.fb-slider-btn').forEach(button => {
        button.onclick = function(e) {
            e.preventDefault(); e.stopPropagation();
            const slider = e.target.closest('.fb-slider');
            const slides = slider.querySelectorAll('.fb-slide-item');
            const total = parseInt(slider.dataset.totalSlides);
            let idx = parseInt(slider.dataset.currentIndex);

            idx = e.target.classList.contains('fb-next') ? (idx + 1) % total : (idx - 1 + total) % total;
            slides.forEach(s => s.style.display = 'none');
            slides[idx].style.display = 'block';
            slider.dataset.currentIndex = idx;
        };
    });

    document.querySelectorAll('.like-btn-toggle').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault(); e.stopPropagation();
            this.classList.toggle('liked');
            this.style.color = this.classList.contains('liked') ? '#1877f2' : 'inherit';
        };
    });
}

// --- ডাইনামিক ফেসবুক স্টাইল প্রোপার্টি কার্ড মেকার ---
function createFbPostHTML(docId, data) {
    const lang = languages[currentLang];
    const title = data.title || '---';
    const village = data.location?.village || "---";
    const thana = data.location?.thana || "---";
    const district = data.location?.district || "---";
    
    const size = data.landArea || data.houseArea || data.areaSqft || data.commercialArea || '0';
    const unit = data.landAreaUnit || data.houseAreaUnit || data.areaSqftUnit || data.commercialAreaUnit || '';
    
    // ইংরেজি মোডে ক্যাটাগরি ও টাইপ কনভার্ট টেক্সট দেখানোর সুবিধা
    const category = data.category || 'বিক্রয়';
    const displayCategory = currentLang === 'bn' ? category : (category === 'বিক্রয়' ? 'For Sale' : 'For Rent');
    const displayType = data.type || 'Property';
    
    let amount = category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let priceUnit = data.priceUnit || data.rentUnit || ""; 
    let displayPrice = amount ? new Intl.NumberFormat(currentLang === 'bn' ? 'bn-BD' : 'en-US').format(amount) : '---';

    const hasDocs = data.documents && (data.documents.khotian || data.documents.sketch);
    const verifiedBadge = hasDocs ? `<span class="badge-verified" style="background:#42b72a; color:white; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold; margin-right:5px;">${lang.verified}</span>` : '';

    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));
    
    let mediaHTML = `<div class="fb-slide-item" style="background-image: url('https://via.placeholder.com/500x260?text=No+Photo'); display:block; width:100%; height:100%; background-size:cover; background-position:center;"></div>`;
    if (images.length > 0) {
        mediaHTML = images.map((img, i) => `<div class="fb-slide-item" style="background-image: url('${img}'); display:${i === 0 ? 'block' : 'none'}; width:100%; height:100%; background-size:cover; background-position:center;"></div>`).join('');
    }

    const navArrows = images.length > 1 ? `
        <button class="fb-slider-btn fb-prev" style="position: absolute; top: 50%; left: 12px; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; z-index: 5;">&#10094;</button>
        <button class="fb-slider-btn fb-next" style="position: absolute; top: 50%; right: 12px; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; z-index: 5;">&#10095;</button>
    ` : '';

    const authorProfileUrl = data.userId ? `profile.html?uid=${data.userId}` : `#`;

    return `
        <div class="fb-feed-card" style="background:#fff; border:1px solid #ced0d4; border-radius:8px; margin-bottom:16px; box-shadow:0 1px 2px rgba(0,0,0,0.05); display:flex; flex-direction:column;">
            <div class="card-author-header" style="padding:12px; display:flex; align-items:center; justify-content:space-between;">
                <div class="author-info" style="display:flex; align-items:center; gap:10px;">
                    <a href="${authorProfileUrl}"><img id="author-pic-${docId}" src="https://via.placeholder.com/40" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #ced0d4;"></a>
                    <div class="author-meta">
                        <a href="${authorProfileUrl}" style="text-decoration:none;"><h4 id="author-name-${docId}" style="margin:0; font-size:15px; font-weight:600; color:#1877f2;">${lang.anonymous}</h4></a>
                        <p style="margin:2px 0 0 0; font-size:12px; color:#65676b; display:flex; align-items:center; gap:4px;">
                            <i class="material-icons" style="font-size:12px;">place</i> ${village}, ${thana}, ${district}
                        </p>
                    </div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${verifiedBadge}
                    <span class="badge-category" style="background:${category === 'বিক্রয়' ? '#ff4d4d' : '#42b72a'}; color:white; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">${displayCategory}</span>
                </div>
            </div>
            
            <div class="card-body-text" style="padding:0 12px 12px 12px; font-size:14px; line-height:1.5;">
                <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700;">${title}</h3>
                <div><b>${size} ${unit}, ${displayType}, ${displayCategory}.</b></div>
            </div>

            <div class="card-media-section" style="position:relative; height:280px; background:#000; overflow:hidden;">
                <div class="fb-slider" data-current-index="0" data-total-slides="${images.length}" style="width:100%; height:100%; position:relative;">
                    ${mediaHTML} ${navArrows}
                </div>
                <div class="price-tag-overlay" style="position:absolute; bottom:12px; right:12px; background:rgba(0,0,0,0.75); color:#fff; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:16px; z-index:4;">
                    ৳ ${displayPrice} ${priceUnit}
                </div>
            </div>

            <div class="fb-stats-bar" style="padding:10px 12px; display:flex; justify-content:space-between; font-size:13px; color:#65676b; border-bottom:1px solid #f2f3f5;">
                <div class="fb-reactions" style="display:flex; align-items:center; gap:4px;">
                    <i class="material-icons" style="background:#1877f2; color:white; border-radius:50%; font-size:12px; padding:3px;">thumb_up</i>
                    <span>${data.likes || 0} ${lang.likedBy}</span>
                </div>
            </div>

            <div class="fb-action-buttons" style="display:flex; padding:4px; border-top:1px solid #f2f3f5;">
                <button class="fb-action-btn like-btn-toggle" style="flex:1; padding:10px; border:none; background:none; cursor:pointer; font-family:inherit; font-size:14px; color:#65676b; display:flex; align-items:center; justify-content:center; gap:6px;"><i class="material-icons">thumb_up_off_alt</i> ${lang.likeBtn}</button>
                <a href="details.html?id=${docId}" style="flex:1; padding:10px; font-family:inherit; font-size:14px; font-weight:700; color:#ff4d4d; display:flex; align-items:center; justify-content:center; gap:6px; text-decoration:none;">
                    <i class="material-icons">double_arrow</i> ${lang.detailBtn}
                </a>
            </div>
        </div>
    `;
}

function loadPostAuthorDetails(docId, userId) {
    if (!userId) return;
    db.collection('users').doc(userId).get().then(userDoc => {
        if (userDoc.exists) {
            const userData = userDoc.data();
            const nameEl = document.getElementById(`author-name-${docId}`);
            const picEl = document.getElementById(`author-pic-${docId}`);
            if (nameEl) nameEl.textContent = userData.fullName || userData.name || languages[currentLang].anonymous;
            if (picEl && userData.profilePic) picEl.src = userData.profilePic;
        }
    });
}

// --- ৩ ঘরের সর্বজনীন মাল্টি-সার্চ এবং রিফ্রেশ ইঞ্জিন ---
async function fetchAndDisplayProperties() {
    if (!propertyG) return;
    const lang = languages[currentLang];
    propertyG.innerHTML = `<p style="text-align:center; padding:20px; color:#65676b;">${lang.loading}</p>`;
    
    const categoryInp = document.getElementById('searchCategory')?.value;
    const typeInp = document.getElementById('searchType')?.value;
    const areaInp = document.getElementById('searchArea')?.value.toLowerCase().trim();

    try {
        let queryRef = db.collection('properties').where('status', '==', 'published');
        if (categoryInp) {
            queryRef = queryRef.where('category', '==', categoryInp);
        }

        const snap = await queryRef.get();
        propertyG.innerHTML = ''; 
        let hasPost = false;

        snap.forEach(doc => {
            const data = doc.data();

            if (typeInp && data.type !== typeInp) return;

            if (areaInp) {
                const village = (data.location?.village || "").toLowerCase();
                const thana = (data.location?.thana || "").toLowerCase();
                const district = (data.location?.district || "").toLowerCase();
                if (!village.includes(areaInp) && !thana.includes(areaInp) && !district.includes(areaInp)) return;
            }

            hasPost = true;
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(doc.id, data));
            loadPostAuthorDetails(doc.id, data.userId);
        });

        if (!hasPost) {
            propertyG.innerHTML = `<p style="text-align:center; padding:40px; color:#65676b;">${lang.noPost}</p>`;
        } else {
            setupSliderAndLikeLogic();
        }
    } catch (error) {
        propertyG.innerHTML = `<p style="text-align:center; padding:20px; color:red;">${lang.error}</p>`;
    }
}

// --- ইভেন্ট লিসেনারস কনফিগারেশন ---
function setupUIEventListeners() {
    if (menuButton && sidebar && overlay) {
        menuButton.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
        overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    }

    // 🌐 ভাষা পরিবর্তন বাটন ক্লিক লজিক
    document.getElementById('langToggle').onclick = function() {
        currentLang = currentLang === 'bn' ? 'en' : 'bn';
        localStorage.setItem('siteLang', currentLang);
        applyLanguage();
    };

    document.getElementById('searchCategory')?.addEventListener('change', fetchAndDisplayProperties);
    document.getElementById('searchType')?.addEventListener('change', fetchAndDisplayProperties);
    document.getElementById('searchArea')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') fetchAndDisplayProperties();
    });

    document.getElementById('btnAdvancedSearch').onclick = fetchAndDisplayProperties;

    navButtons.forEach(btn => {
        btn.onclick = function() {
            navButtons.forEach(b => b.classList.remove('active'));
            document.getElementById('mapViewToggleBtn')?.classList.remove('active');
            this.classList.add('active');
            
            document.getElementById('property-grid-container').style.display = 'block';
            document.getElementById('map-section').style.display = 'none';

            const targetCategory = this.getAttribute('data-category');
            const catSelect = document.getElementById('searchCategory');
            if (catSelect) catSelect.value = targetCategory;

            fetchAndDisplayProperties();
        };
    });

    document.getElementById('mapViewToggleBtn').onclick = function() {
        navButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.getElementById('property-grid-container').style.display = 'none';
        document.getElementById('map-section').style.display = 'block';
        initMap();
    };
}

// --- ইনিশিয়াল রানার ---
document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    applyLanguage(); // প্রথমবারেই ভাষা ও ড্রপডাউন লোড করবে
    
    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user); 
            updateIconCounts(); 
            if (loginLinkSidebar) {
                loginLinkSidebar.innerHTML = `<i class="material-icons">logout</i> ${languages[currentLang].logout}`;
                loginLinkSidebar.href = '#';
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            if (loginLinkSidebar) {
                loginLinkSidebar.innerHTML = `<i class="material-icons">lock_open</i> ${languages[currentLang].login}`;
                loginLinkSidebar.href = 'auth.html';
            }
        }
    });
});
