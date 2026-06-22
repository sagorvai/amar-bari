// 🎯 ১. ফায়ারবেস কনফিগারেশন অবজেক্ট (এখানে তোমার প্রজেক্টের সঠিক ক্রেডেনশিয়াল বসাও)
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// ২. সেফটি চেক: ফায়ারবেস ডাবল ইনিশিয়ালাইজেশন রোধ করা
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// ৩. ডাটাবেজ গ্লোবাল রেফারেন্স ডিক্লেয়ারেশন
const db = firebase.firestore();
const auth = firebase.auth();

// UI উপাদানসমূহ
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');
const globalSearchInput = document.getElementById('globalSearchInput');
const navButtons = document.querySelectorAll('.fb-tab-btn'); 

let map;
let currentLang = localStorage.getItem('siteLang') || 'bn';

// মাল্টি-ল্যাঙ্গুয়েজ ডিকশনারি
const languages = {
    bn: {
        title: "আমার বাড়ি.কম | বাংলাদেশ ও খুলনায় ফ্ল্যাট, প্লট এবং বাড়ি কেনাবেচার সেরা মাধ্যম",
        logo: "আমার বাড়ি.কম",
        searchBtn: "কাঙ্ক্ষিত প্রপার্টি খুঁজুন",
        areaPlaceholder: "এলাকা (গ্রাম, থানা বা জেলা)",
        tabSell: "বিক্রয় পোস্ট",
        tabRent: "ভাড়া পোস্ট",
        tabMap: "ম্যাপ ভিউ",
        noticeTitle: "📢 নিরাপদ আবাসন বার্তা",
        noticeDesc: "যে কোনো প্রপার্টি ক্রয়ের পূর্বে অবশ্যই ফিজিক্যালি কাগজ স্কেচ এবং মূল মালিকের খতিয়ান ডাবল চেক করে নিন। আমার বাড়ি.কম কোনো থার্ড পার্টি কমিশন নেয় না।",
        home: "হোমপেজ",
        login: "লগইন",
        logout: "লগআউট",
        loading: "নিউজ ফিড আপডেট হচ্ছে...",
        noPost: "আপনার ফিল্টারের সাথে মিলে এমন কোনো পোস্ট পাওয়া যায়নি।",
        error: "ফিড লোড করতে সমস্যা হয়েছে।",
        detailBtn: "বিস্তারিত ও যোগাযোগ",
        verified: "✓ কাগজ ভেরিফাইড",
        anonymous: "আমার বাড়ি ইউজার",
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
        title: "AmarBari.com | Best platform to Buy, Sell and Rent properties in Bangladesh",
        logo: "AmarBari.com",
        searchBtn: "Search Desired Property",
        areaPlaceholder: "Area (Village, Thana or District)",
        tabSell: "For Sale",
        tabRent: "For Rent",
        tabMap: "Map View",
        noticeTitle: "📢 Safe Housing Notice",
        noticeDesc: "Always physically double-check documents, sketches, and Khatian before making any purchase. AmarBari does not charge any commission.",
        home: "Homepage",
        login: "Login",
        logout: "Logout",
        loading: "Updating news feed...",
        noPost: "No properties found matching your filters.",
        error: "Failed to load feed.",
        detailBtn: "Details & Contact",
        verified: "✓ Document Verified",
        anonymous: "Amar Bari User",
        categories: [
            { val: "", text: "All Categories (Sale/Rent)" },
            { val: "বিক্রয়", text: "For Sale" },
            { val: "ভাড়া", text: "For Rent" }
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

// ইন্টারফেস ল্যাঙ্গুয়েজ হ্যান্ডলার
function applyLanguage() {
    const lang = languages[currentLang];
    
    document.title = lang.title;
    document.getElementById('txtLogo').textContent = lang.logo;
    document.getElementById('txtSearchBtn').textContent = lang.searchBtn;
    if (globalSearchInput) globalSearchInput.placeholder = lang.areaPlaceholder;
    document.getElementById('txtTabSell').textContent = lang.tabSell;
    document.getElementById('txtTabRent').textContent = lang.tabRent;
    document.getElementById('txtTabMap').textContent = lang.tabMap;
    document.getElementById('txtNoticeTitle').textContent = lang.noticeTitle;
    document.getElementById('txtNoticeDesc').textContent = lang.noticeDesc;
    document.getElementById('menuHome').innerHTML = `<i class="material-icons">home</i> ${lang.home}`;
    
    const catSelect = document.getElementById('searchCategory');
    if (catSelect) {
        const prevVal = catSelect.value;
        catSelect.innerHTML = lang.categories.map(c => `<option value="${c.val}">${c.text}</option>`).join('');
        catSelect.value = prevVal;
    }

    const typeSelect = document.getElementById('searchType');
    if (typeSelect) {
        const prevVal = typeSelect.value;
        typeSelect.innerHTML = lang.types.map(t => `<option value="${t.val}">${t.text}</option>`).join('');
        typeSelect.value = prevVal;
    }

    document.getElementById('langLabel').textContent = currentLang === 'bn' ? 'EN' : 'BN';
    
    const activeBtn = document.querySelector('.fb-tab-btn.active');
    if (activeBtn && activeBtn.id === 'mapViewToggleBtn') {
        const activeNavBtn = document.querySelector('.fb-tab-btn[data-category]');
        initMap(activeNavBtn ? activeNavBtn.getAttribute('data-category') : 'বিক্রয়');
    } else {
        const activeCat = activeBtn ? activeBtn.getAttribute('data-category') : 'বিক্রয়';
        fetchAndDisplayProperties(activeCat, globalSearchInput?.value || '');
    }
}

// 🎨 কাস্টম কালার-কোডেড মার্কার (বিক্রয়=লাল, ভাড়া=সবুজ এবং ভেতরে টাইপ টেক্সট)
function createCustomMarker(category, type) {
    const bgColor = category === 'বিক্রয়' ? '#ff4d4d' : '#42b72a';
    return L.divIcon({
        html: `<div style="background:${bgColor}; color:#fff; padding:4px 10px; border-radius:20px; font-size:12px; font-weight:bold; border:2px solid #fff; box-shadow:0 3px 8px rgba(0,0,0,0.3); white-space: nowrap; text-align: center; font-family:'SolaimanLipi',sans-serif;">${type}</div>`,
        className: 'fb-pin',
        iconSize: [70, 28],
        iconAnchor: [35, 14]
    });
}

// 📍 ম্যাপ রেন্ডারিং এবং ডিরেক্ট ক্লিক রিডাইরেক্ট মেকানিজম
async function initMap(category) {
    const mapSection = document.getElementById('map-section');
    if (!mapSection || mapSection.style.display === 'none') return;

    if (map) { map.remove(); }
    
    map = L.map('map').setView([22.8456, 89.5403], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    try {
        const snap = await db.collection('properties')
            .where('category', '==', category)
            .where('status', '==', 'published')
            .get();

        snap.forEach(doc => {
            const data = doc.data();
            if (data.location && data.location.lat && data.location.lng) {
                const propertyType = data.type || 'বাসা';
                
                const marker = L.marker([parseFloat(data.location.lat), parseFloat(data.location.lng)], {
                    icon: createCustomMarker(data.category, propertyType)
                }).addTo(map);
                
                // পিন ক্লিকে সরাসরি রিডাইরেক্ট
                marker.on('click', function() {
                    window.location.href = `details.html?id=${doc.id}`;
                });
            }
        });
    } catch (err) { console.error("ম্যাপ লোড ত্রুটি:", err); }
}

// ফেসবুক ফিড পোস্ট মেকার কার্ড
function createFbPostHTML(docId, data) {
    const lang = languages[currentLang];
    const title = data.title || '---';
    const village = data.location?.village || "---";
    const thana = data.location?.thana || "---";
    const district = data.location?.district || "---";
    
    const size = data.landArea || data.houseArea || data.areaSqft || data.commercialArea || '০';
    const unit = data.landAreaUnit || data.houseAreaUnit || data.areaSqftUnit || data.commercialAreaUnit || '';
    
    const category = data.category || 'বিক্রয়';
    const type = data.type || 'প্রপার্টি';
    
    let amount = category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let displayPrice = amount ? new Intl.NumberFormat(currentLang === 'bn' ? 'bn-BD' : 'en-US').format(amount) : '---';

    const hasDocs = data.documents && (data.documents.khotian || data.documents.sketch);
    const verifiedBadge = hasDocs ? `<span style="background:#42b72a; color:white; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold; margin-right:5px;">${lang.verified}</span>` : '';

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

    return `
        <div class="fb-feed-card" style="background:#fff; border:1px solid #ced0d4; border-radius:8px; margin-bottom:16px; box-shadow:0 1px 2px rgba(0,0,0,0.05); display:flex; flex-direction:column; padding-bottom: 8px;">
            <div style="padding:12px; display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <img id="author-pic-${docId}" src="https://via.placeholder.com/40" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
                    <div>
                        <h4 id="author-name-${docId}" style="margin:0; font-size:15px; font-weight:600;">${lang.anonymous}</h4>
                        <p style="margin:2px 0 0 0; font-size:12px; color:#65676b;"><i class="material-icons" style="font-size:12px;">place</i> ${village}, ${thana}, ${district}</p>
                    </div>
                </div>
                <div>${verifiedBadge}<span style="background:#1877f2; color:white; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">${category}</span></div>
            </div>
            <div style="padding:0 12px 12px 12px; font-size:14px;">
                <h3 style="margin:0 0 6px 0; font-size:16px; font-weight:700;">${title}</h3>
                <b>${size} ${unit}, ${type}.</b>
            </div>
            <div style="position:relative; height:280px; background:#000; overflow:hidden;">
                <div class="fb-slider" data-current-index="0" data-total-slides="${images.length}" style="width:100%; height:100%;">
                    ${mediaHTML} ${navArrows}
                </div>
                <div style="position:absolute; bottom:12px; right:12px; background:rgba(0,0,0,0.75); color:#fff; padding:6px 12px; border-radius:6px; font-weight:bold;">৳ ${displayPrice}</div>
            </div>
            <div style="display:flex; padding:4px; margin-top:8px; border-top:1px solid #f2f3f5;">
                <a href="details.html?id=${docId}" style="flex:1; text-align:center; padding:10px; font-weight:700; color:#ff4d4d; text-decoration:none;"><i class="material-icons" style="vertical-align:middle; font-size:18px;">double_arrow</i> ${lang.detailBtn}</a>
            </div>
        </div>
    `;
}

function loadPostAuthorDetails(docId, userId) {
    if (!userId) return;
    db.collection('users').doc(userId).get().then(uDoc => {
        if (uDoc.exists) {
            const uData = uDoc.data();
            const n = document.getElementById(`author-name-${docId}`);
            const p = document.getElementById(`author-pic-${docId}`);
            if (n) n.textContent = uData.fullName || uData.name || languages[currentLang].anonymous;
            if (p && uData.profilePic) p.src = uData.profilePic;
        }
    });
}

// ডেটাবেজ ফেচ এবং ফিল্টারিং মেকানিজম
async function fetchAndDisplayProperties(category, searchFilter = '') {
    if (!propertyG) return;
    const lang = languages[currentLang];
    propertyG.innerHTML = `<p style="text-align:center; padding:20px; color:#65676b;">${lang.loading}</p>`;
    
    const filterCat = document.getElementById('searchCategory')?.value;
    const filterType = document.getElementById('searchType')?.value;
    const formattedSearch = searchFilter.toLowerCase().trim();

    try {
        let queryRef = db.collection('properties').where('status', '==', 'published');
        queryRef = queryRef.where('category', '==', filterCat || category);

        const snap = await queryRef.get();
        propertyG.innerHTML = '';
        let hasPost = false;

        snap.forEach(doc => {
            const data = doc.data();
            if (filterType && data.type !== filterType) return;
            
            if (formattedSearch) {
                const village = (data.location?.village || "").toLowerCase();
                const thana = (data.location?.thana || "").toLowerCase();
                const district = (data.location?.district || "").toLowerCase();
                if (!village.includes(formattedSearch) && !thana.includes(formattedSearch) && !district.includes(formattedSearch)) return;
            }

            hasPost = true;
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(doc.id, data));
            loadPostAuthorDetails(doc.id, data.userId);
        });

        if (!hasPost) propertyG.innerHTML = `<p style="text-align:center; padding:40px; color:#65676b;">${lang.noPost}</p>`;
    } catch (err) { propertyG.innerHTML = `<p style="text-align:center; padding:20px; color:red;">${lang.error}</p>`; }
}

// ইভেন্ট লিসেনার সেটআপ
function setupUIEventListeners() {
    if (menuButton && sidebar && overlay) {
        menuButton.onclick = () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
        overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    }

    document.getElementById('langToggle').onclick = function() {
        currentLang = currentLang === 'bn' ? 'en' : 'bn';
        localStorage.setItem('siteLang', currentLang);
        applyLanguage();
    };

    navButtons.forEach(btn => {
        btn.onclick = function() {
            if (this.id === 'mapViewToggleBtn') return; 
            
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.getElementById('property-grid-container').style.display = 'block';
            document.getElementById('map-section').style.display = 'none';

            const targetCategory = this.getAttribute('data-category');
            const catSelect = document.getElementById('searchCategory');
            if (catSelect) catSelect.value = targetCategory;

            fetchAndDisplayProperties(targetCategory, globalSearchInput?.value || '');
        };
    });

    document.getElementById('mapViewToggleBtn').onclick = function() {
        navButtons.forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        
        document.getElementById('property-grid-container').style.display = 'none';
        document.getElementById('map-section').style.display = 'block';
        
        const activeNavBtn = document.querySelector('.fb-tab-btn[data-category]');
        const currentCat = activeNavBtn ? activeNavBtn.getAttribute('data-category') : 'বিক্রয়';
        
        setTimeout(() => {
            initMap(currentCat);
            if (map) map.invalidateSize();
        }, 200);
    };

    document.getElementById('btnAdvancedSearch').onclick = () => {
        const activeNavBtn = document.querySelector('.fb-tab-btn[data-category].active') || document.querySelector('.fb-tab-btn[data-category]');
        const currentCat = activeNavBtn ? activeNavBtn.getAttribute('data-category') : 'বিক্রয়';
        fetchAndDisplayProperties(currentCat, globalSearchInput?.value || '');
    };
}

// ইনিশিয়েট রানার
document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    applyLanguage(); 
});
