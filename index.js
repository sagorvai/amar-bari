// Firebase Global Reference
const db = firebase.firestore();
const auth = firebase.auth();

const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const navButtons = document.querySelectorAll('.fb-tabs .fb-tab-btn:not(#mapViewToggleBtn)'); 
const propertyG = document.querySelector('.property-grid');
const globalSearchInput = document.getElementById('globalSearchInput');

const profileImage = document.getElementById('profileImage');
const defaultProfileIcon = document.getElementById('defaultProfileIcon');

let map;
let currentUserData = null;

// ----------------------------------------------------
// 📸 ১. অটো-স্লাইড কভার ছবি লজিক (৩টি ছবি)
// ----------------------------------------------------
function initCoverSlider() {
    const slides = document.querySelectorAll('.cover-slide');
    if (slides.length === 0) return;
    let currentSlide = 0;

    setInterval(() => {
        slides[currentSlide].classList.remove('active');
        currentSlide = (currentSlide + 1) % slides.length;
        slides[currentSlide].classList.add('active');
    }, 4000);
}

// ----------------------------------------------------
// 🗺️ ২. পূর্ণাঙ্গ ৮টি বিভাগ ও ৬৪টি জেলার লিস্ট
// ----------------------------------------------------
const bdDistricts = {
    "ঢাকা": ["ঢাকা", "গাজীপুর", "নারায়ণগঞ্জ", "টাঙ্গাইল", "মানিকগঞ্জ", "মুন্সিগঞ্জ", "রাজবাড়ী", "ফরিদপুর", "মাদারীপুর", "শরীয়তপুর", "গোপালগঞ্জ", "কিশোরগঞ্জ", "নরসিংদী"],
    "খুলনা": ["খুলনা", "যশোর", "সাতক্ষীরা", "বাগেরহাট", "ঝিনাইদহ", "কুষ্টিয়া", "মেহেরপুর", "চুয়াডাঙ্গা", "মাগুরা", "নড়াইল"],
    "চট্টগ্রাম": ["চট্টগ্রাম", "কক্সবাজার", "কুমিল্লা", "ফেনী", "নোখালী", "লক্ষ্মীপুর", "চাঁদপুর", "ব্রাহ্মণবাড়িয়া", "রাঙ্গামাটি", "বান্দরবান", "খাগড়াছড়ি"],
    "রাজশাহী": ["রাজশাহী", "বগুড়া", "পাবনা", "সিরাজগঞ্জ", "নওগাঁ", "নাটোর", "জয়পুরহাট", "চাপাইনবাবগঞ্জ"],
    "রংপুর": ["রংপুর", "দিনাজপুর", "গাইবান্ধা", "কুড়িগ্রাম", "লালমনিরহাট", "নীলফামারী", "পঞ্চগড়", "ঠাকুরগাঁও"],
    "বরিশাল": ["বরিশাল", "পটুয়াখালী", "ভোলা", "পিরোজপুর", "বরগুনা", "ঝালকাঠি"],
    "সিলেট": ["সিলেট", "মৌলভীবাজার", "হবিগঞ্জ", "সুনামগঞ্জ"],
    "ময়মনসিংহ": ["ময়মনসিংহ", "জামালপুর", "নেত্রকোনা", "শেরপুর"]
};

const filterDivisionEl = document.getElementById('filterDivision');
const filterDistrictEl = document.getElementById('filterDistrict');

if (filterDivisionEl && filterDistrictEl) {
    filterDivisionEl.addEventListener('change', function() {
        const selectedDivision = this.value;
        filterDistrictEl.innerHTML = '<option value="">সব জেলা (All Districts)</option>';
        
        if (selectedDivision && bdDistricts[selectedDivision]) {
            filterDistrictEl.disabled = false;
            bdDistricts[selectedDivision].forEach(district => {
                const option = document.createElement('option');
                option.value = district;
                option.textContent = district;
                filterDistrictEl.appendChild(option);
            });
        } else {
            filterDistrictEl.disabled = true;
            filterDistrictEl.innerHTML = '<option value="">প্রথমে বিভাগ মেলান</option>';
        }
    });
}

// ----------------------------------------------------
// 👤 ৩. হেডারে ইউজার/পেজ প্রোফাইল পিকচার লোডার
// ----------------------------------------------------
function loadProfilePicture(user) {
    if (!user) return;
    
    const activePageId = localStorage.getItem('activePageId');

    if (activePageId) {
        db.collection('companies').doc(activePageId).get().then(doc => {
            if (doc.exists) {
                const cData = doc.data();
                const photo = cData.logo || cData.companyLogo || cData.profilePic;
                if (profileImage && photo) {
                    profileImage.src = photo;
                    profileImage.style.display = 'block';
                    if (defaultProfileIcon) defaultProfileIcon.style.display = 'none';
                    return;
                }
            }
            loadUserDefaultPic(user);
        }).catch(() => loadUserDefaultPic(user));
    } else {
        loadUserDefaultPic(user);
    }
}

function loadUserDefaultPic(user) {
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            currentUserData = doc.data();
            const photo = currentUserData.profilePic || currentUserData.photoURL || user.photoURL;
            if (profileImage && photo) {
                profileImage.src = photo;
                profileImage.style.display = 'block';
                if (defaultProfileIcon) defaultProfileIcon.style.display = 'none';
            } else {
                if (profileImage) profileImage.style.display = 'none';
                if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
            }
        }
    }).catch(err => {
        console.error("প্রোফাইল লোড ত্রুটি:", err);
    });
}

// ----------------------------------------------------
// 🗺️ ৪. ম্যাপ ফিল্টারিং লজিক
// ----------------------------------------------------
function createCustomMarker(category, type, isPaid = false) {
    const color = isPaid ? '#ff9800' : (category === 'বিক্রয়' ? '#1877f2' : '#2e7d32');
    return L.divIcon({
        html: `<div style="background:${color}; color:#fff; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.4); white-space:nowrap;">${type} (${category}) ${isPaid ? '⭐' : ''}</div>`,
        className: 'fb-pin',
        iconSize: [85, 26]
    });
}

async function initMap(category = 'বিক্রয়') {
    const mapSection = document.getElementById('map-section');
    if (!mapSection || mapSection.style.display === 'none') return;

    if (map) { map.remove(); }
    
    map = L.map('map-container').setView([22.8456, 89.5403], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    try {
        const snap = await db.collection('properties')
            .where('category', '==', category)
            .where('status', '==', 'published')
            .get();

        snap.forEach(doc => {
            const data = doc.data();
            if (data.location && data.location.lat && data.location.lng) {
                const marker = L.marker([data.location.lat, data.location.lng], {
                    icon: createCustomMarker(data.category, data.type || 'প্রপার্টি', data.isPaidPost)
                }).addTo(map);

                marker.bindPopup(`
                    <div style="font-family:'Hind Siliguri', sans-serif;">
                        <b style="font-size:13px; color:#1877f2;">${data.title || 'শিরোনামহীন'}</b><br>
                        <span style="font-size:11px; color:#555;">ক্যাটাগরি: <b>${data.category}</b></span><br>
                        <a href="details.html?id=${doc.id}" style="display:inline-block; margin-top:5px; background:#1877f2; color:#fff; padding:3px 8px; text-decoration:none; border-radius:4px; font-size:11px;">বিস্তারিত দেখুন</a>
                    </div>
                `);
            }
        });
    } catch (err) {
        console.error("ম্যাপ লোড ত্রুটি:", err);
    }
}

// ----------------------------------------------------
// 🏢 ৫. রেজিস্টার্ড কোম্পানি / এজেন্সি স্লাইডার HTML
// ----------------------------------------------------
async function generateCompanySliderHTML(allMatchedDocs) {
    const companiesMap = new Map();
    
    allMatchedDocs.forEach(item => {
        const data = item.data;
        const isCompany = data.ownerType === 'company' || data.authorType === 'company' || data.postAsPage === true || !!data.companyId;
        const cId = data.companyId || data.ownerId || data.authorId;
        
        if (isCompany && cId) {
            if (!companiesMap.has(cId)) {
                companiesMap.set(cId, {
                    id: cId,
                    fallbackName: data.companyName || data.pageName || data.postedByName || "",
                    fallbackLogo: data.companyLogo || data.logo || data.postedByAvatar || ""
                });
            }
        }
    });

    if (companiesMap.size === 0) return '';

    const companyCards = [];
    
    for (const [cId, initialInfo] of companiesMap) {
        try {
            let name = initialInfo.fallbackName;
            let logo = initialInfo.fallbackLogo;
            let redirectUrl = `seller-profile.html?id=${cId}&companyId=${cId}&type=company`;

            const compDoc = await db.collection('companies').doc(cId).get();
            if (compDoc.exists) {
                const cData = compDoc.data();
                name = cData.companyName || cData.name || cData.pageName || name;
                logo = cData.logo || cData.companyLogo || cData.profilePic || cData.photoURL || logo;
            }

            if (!name) name = "রেজিস্টার্ড পেজ";
            if (!logo || logo.trim() === '') {
                logo = "https://ui-avatars.com/api/?name=" + encodeURIComponent(name) + "&background=1877f2&color=fff";
            }

            companyCards.push(`
                <div onclick="window.location.href='${redirectUrl}'" style="min-width: 95px; width: 95px; display: flex; flex-direction: column; align-items: center; text-align: center; cursor: pointer; flex-shrink: 0; background: #fff; padding: 8px 5px; border-radius: 10px; border: 1px solid #e4e6eb; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <img src="${logo}" onerror="this.onerror=null; this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=1877f2&color=fff';" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover; border: 2px solid #1877f2;" alt="${name}">
                    <span style="font-size: 11.5px; font-weight: 600; color: #050505; margin-top: 6px; line-height: 1.4; height: 32px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis; word-break: break-word; padding: 0 2px;">${name}</span>
                </div>
            `);
        } catch (e) {
            console.error("কোম্পানি ডাটা লোড সমস্যা:", e);
        }
    }

    if (companyCards.length === 0) return '';

    return `
        <div class="fb-feed-card" style="background: #ffffff; padding: 10px 12px; margin-bottom: 12px; border-radius: 12px; border: 1px solid #e4e6eb;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 700; font-size: 12.5px; color: #1877f2; display: flex; align-items: center; gap: 4px;">
                    <i class="material-icons" style="font-size: 16px;">business</i> রেজিস্টার্ড কোম্পানি / এজেন্সিসমূহ
                </span>
                <span style="font-size: 10.5px; color: #65676b;">স্ক্রোল করুন ➔</span>
            </div>
            <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; scroll-behavior: smooth; -webkit-overflow-scrolling: touch;">
                ${companyCards.join('')}
            </div>
        </div>
    `;
}

// ----------------------------------------------------
// 🔵 ৬. প্রমোশনাল ব্যানার ও কার্ডস
// ----------------------------------------------------
function createBluePostPromptHTML() {
    return `
        <div class="fb-feed-card" style="background: linear-gradient(135deg, #1877f2, #0d52b5); color: #fff; border-radius: 12px; padding: 22px 16px; margin-bottom: 16px; text-align: center; box-shadow: 0 4px 12px rgba(24, 119, 242, 0.2);">
            <span style="background: rgba(255, 255, 255, 0.2); font-size: 11px; padding: 3px 10px; border-radius: 20px; font-weight: bold;">বিজ্ঞাপন / স্পন্সরড</span>
            <h2 style="margin: 12px 0 6px 0; font-size: 18px; font-weight: 700; line-height: 1.3;">আপনার প্রোপার্টি দ্রুত বিক্রি বা ভাড়া দিতে চান?</h2>
            <p style="margin: 0 0 16px 0; font-size: 12.5px; opacity: 0.95;">আমার বাড়ি.কম-এ সরাসরি কোনো কমিশন ছাড়াই পোস্ট করুন।</p>
            <a href="post.html" style="display: inline-block; background: #ffffff; color: #1877f2; text-decoration: none; padding: 9px 22px; border-radius: 25px; font-weight: 700; font-size: 13.5px;">এখনই ফ্রিতে পোস্ট করুন</a>
        </div>
    `;
}

function createImageBannerSliderHTML() {
    const banners = [
        { img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80", link: "post.html" },
        { img: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&auto=format&fit=crop&q=80", link: "boost.html" },
        { img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80", link: "tips.html" }
    ];

    const slidesHTML = banners.map((item, i) => `
        <div style="min-width: 260px; width: 260px; height: 125px; border-radius: 8px; overflow: hidden; flex-shrink: 0; position: relative; border: 1px solid #ced0d4; cursor:pointer;" onclick="window.location.href='${item.link}'">
            <img src="${item.img}" style="width: 100%; height: 100%; object-fit: cover;" alt="Banner ${i+1}">
            <span style="position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.6); color: #fff; font-size: 9px; padding: 2px 5px; border-radius: 4px;">বিজ্ঞাপন</span>
        </div>
    `).join('');

    return `
        <div class="fb-feed-card" style="background: #fff; padding: 12px; margin-bottom: 16px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 700; font-size: 13px; color: #1877f2; display: flex; align-items: center; gap: 4px;">
                    <i class="material-icons" style="font-size: 16px; color: #ff9800;">campaign</i> প্রমোশনাল অফার
                </span>
                <span style="font-size: 11px; color: #65676b;">স্ক্রোল করুন ➔</span>
            </div>
            <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; scroll-behavior: smooth; -webkit-overflow-scrolling: touch;">
                ${slidesHTML}
                <div style="min-width: 100px; width: 100px; height: 125px; background: #f0f2f5; border: 2px dashed #1877f2; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; flex-shrink: 0; cursor: pointer;" onclick="window.location.href='boost.html'">
                    <div style="width: 32px; height: 32px; background: #1877f2; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                        <i class="material-icons">add</i>
                    </div>
                    <span style="font-size: 10.5px; font-weight: bold; color: #1877f2;">অ্যাড দিন</span>
                </div>
            </div>
        </div>
    `;
}

function createLargeFeaturedPostsHTML(featuredList) {
    if (!featuredList || featuredList.length === 0) return '';
    const list = featuredList.slice(0, 5);

    const cardsHTML = list.map(item => {
        const data = item.data;
        const imgUrl = (data.images && data.images.length > 0) ? (data.images[0].url || data.images[0]) : 'https://via.placeholder.com/300x160?text=Featured';
        const price = data.price || data.monthlyRent || 'আলোচনা সাপেক্ষে';
        const displayPrice = typeof price === 'number' ? new Intl.NumberFormat('bn-BD').format(price) : price;

        return `
            <div class="featured-card-item">
                <div class="featured-img-box" style="background-image: url('${imgUrl}');">
                    <span style="position: absolute; top: 8px; left: 8px; background: #ff9800; color: #fff; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px;">⭐ ফিচার্ড</span>
                </div>
                <div style="padding: 10px;">
                    <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 700; color: #050505; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.title || 'শিরোনামহীন'}</h4>
                    <p style="margin: 0; font-size: 11.5px; color: #65676b;">📍 ${data.location?.district || ''}, ${data.location?.thana || ''}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <span style="font-size: 14px; font-weight: 800; color: #1877f2;">৳ ${displayPrice}</span>
                        <a href="details.html?id=${item.id}" style="background: #ff9800; color: #fff; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; text-decoration: none;">বিস্তারিত</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="fb-feed-card" style="background: #fffdf6; border: 1px solid #ffe082; padding: 12px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 700; font-size: 14px; color: #e65100; display: flex; align-items: center; gap: 4px;">
                    <i class="material-icons" style="font-size: 18px; color: #ff9800;">stars</i> ফিচার্ড প্রপার্টিসমূহ
                </span>
                <span style="font-size: 11px; color: #65676b;">ডানে স্লাইড করুন ➔</span>
            </div>
            <div class="featured-scroll-container">
                ${cardsHTML}
            </div>
        </div>
    `;
}

function createFbPostHTML(docId, data) {
    const title = data.title || 'শিরোনামহীন প্রোপার্টি';
    const village = data.location?.village || "তথ্য নেই";
    const thana = data.location?.thana || data.location?.upazila || "তথ্য নেই";
    const district = data.location?.district || "তথ্য নেই";
    
    const size = data.landArea || data.houseArea || data.areaSqft || data.commercialArea || '০';
    const unit = data.landAreaUnit || data.houseAreaUnit || data.areaSqftUnit || data.commercialAreaUnit || '';
    
    const type = data.type || 'প্রপার্টি';
    const category = data.category || 'বিক্রয়';
    const isBoosted = data.isBoosted === true || data.isPaidPost === true;
    
    let amount = category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let displayPrice = amount ? new Intl.NumberFormat('bn-BD').format(amount) : 'আলোচনা সাপেক্ষে';

    const verifiedBadge = data.documents ? `<span class="badge-verified">✓ ভেরিফাইড</span>` : '';
    const boostedBadge = isBoosted ? `<span class="badge-boosted"><i class="material-icons" style="font-size:11px;">bolt</i> স্পন্সরড</span>` : '';

    let images = [];
    if (data.images) {
        data.images.forEach(img => {
            const url = typeof img === 'string' ? img : (img.url || '');
            if (url) images.push(url);
        });
    }
    
    let mediaHTML = `<div class="fb-slide-item" style="background-image: url('https://via.placeholder.com/500x250?text=No+Photo'); display:block;"></div>`;
    if (images.length > 0) {
        mediaHTML = images.map((img, i) => `
            <div class="fb-slide-item" style="background-image: url('${img}'); display:${i === 0 ? 'block' : 'none'};"></div>
        `).join('');
    }

    const navArrows = images.length > 1 ? `
        <button class="fb-slider-btn fb-prev">&#10094;</button>
        <button class="fb-slider-btn fb-next">&#10095;</button>
    ` : '';

    return `
        <div class="fb-feed-card ${isBoosted ? 'boosted-card' : ''}">
            <div class="card-author-header">
                <div class="author-info">
                    <img id="author-pic-${docId}" src="https://via.placeholder.com/40?text=..." class="fb-profile-pic" alt="pic">
                    <div class="author-meta">
                        <h4 id="author-name-${docId}" style="line-height:1.3; font-size:14px;">লোডিং...</h4>
                        <p><i class="material-icons" style="font-size:12px;">place</i> ${village}, ${thana}, ${district}</p>
                    </div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${boostedBadge}
                    ${verifiedBadge}
                    <span class="badge-category">${category}</span>
                </div>
            </div>
            
            <div class="card-body-text">
                <h3 style="margin: 0 0 4px 0; font-size: 15px; font-weight: 700;">${title}</h3>
                <div><b>${size} ${unit}, ${type}, ${category}।</b> বিস্তারিত জানতে নিচে ক্লিক করুন।</div>
            </div>

            <div class="card-media-section">
                <div class="fb-slider" data-current-index="0" data-total-slides="${images.length}">
                    ${mediaHTML}
                    ${navArrows}
                </div>
                <div class="price-tag-overlay">
                    ৳ ${displayPrice} ${category === 'ভাড়া' ? '/মাস' : ''}
                </div>
            </div>

            <div class="fb-stats-bar">
                <div><span class="like-count">${data.likes || 0}</span> জন পছন্দ করেছেন</div>
                <div>কমেন্ট দেখুন</div>
            </div>

            <div class="fb-action-buttons">
                <button class="fb-action-btn like-btn-toggle"><i class="material-icons">thumb_up_off_alt</i> লাইক</button>
                <a href="details.html?id=${docId}" class="fb-action-btn" style="color:#ff4d4d; font-weight:700;">
                    <i class="material-icons">double_arrow</i> বিস্তারিত ও যোগাযোগ
                </a>
            </div>
        </div>
    `;
}

// ----------------------------------------------------
// 🚀 ৭. নিউজ ফিড রেন্ডারিং লজিক
// ----------------------------------------------------
async function fetchAndDisplayProperties(category, searchFilter = '') {
    if (!propertyG) return;
    propertyG.innerHTML = '<p style="text-align:center; padding:20px; color:#65676b;">নিউজ ফিড লোড হচ্ছে...</p>';
    
    try {
        let snap = await db.collection('properties')
            .where('category', '==', category)
            .where('status', '==', 'published')
            .get();
            
        propertyG.innerHTML = '';

        let allDocs = [];
        const filterType = document.getElementById('filterType')?.value || '';
        const filterDistrict = document.getElementById('filterDistrict')?.value || '';
        const formattedSearch = searchFilter.toLowerCase().trim();

        snap.forEach(doc => {
            const data = doc.data();
            let isMatched = true;

            if (filterType && data.type !== filterType) isMatched = false;
            if (filterDistrict && data.location?.district !== filterDistrict) isMatched = false;
            if (formattedSearch) {
                const titleMatch = data.title?.toLowerCase().includes(formattedSearch);
                const villageMatch = data.location?.village?.toLowerCase().includes(formattedSearch);
                const thanaMatch = data.location?.thana?.toLowerCase().includes(formattedSearch);
                if (!titleMatch && !villageMatch && !thanaMatch) isMatched = false;
            }

            if (isMatched) allDocs.push({ id: doc.id, data: data });
        });

        if (allDocs.length === 0) {
            propertyG.innerHTML = '<p style="text-align:center; padding:40px; color:#65676b;">কোনো পোস্ট পাওয়া যায়নি।</p>';
            return;
        }

        let boostedList = allDocs.filter(item => item.data.isBoosted === true || item.data.isPaidPost === true);
        let normalList = allDocs.filter(item => !item.data.isBoosted && !item.data.isPaidPost);
        let featuredList = allDocs.slice(0, 5); 

        // ১. কোম্পানি স্লাইডার
        const companySliderHTML = await generateCompanySliderHTML(allDocs);
        if (companySliderHTML) {
            propertyG.insertAdjacentHTML('beforeend', companySliderHTML);
        }

        // ২. নীল পোস্ট ব্যানার
        propertyG.insertAdjacentHTML('beforeend', createBluePostPromptHTML());

        // ৩. প্রমোশনাল অফার ব্যানার
        propertyG.insertAdjacentHTML('beforeend', createImageBannerSliderHTML());

        let normalIdx = 0;
        let boostedIdx = 0;

        // ৪. ২টি সাধারণ পোস্ট
        for (let i = 0; i < 2 && normalIdx < normalList.length; i++, normalIdx++) {
            const item = normalList[normalIdx];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(item.id, item.data));
            loadPostAuthorDetails(item.id, item.data);
        }

        // ৫. ফিচার্ড পোস্ট স্লাইডার
        propertyG.insertAdjacentHTML('beforeend', createLargeFeaturedPostsHTML(featuredList));

        // ৬. আরও ২টি সাধারণ পোস্ট
        for (let i = 0; i < 2 && normalIdx < normalList.length; i++, normalIdx++) {
            const item = normalList[normalIdx];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(item.id, item.data));
            loadPostAuthorDetails(item.id, item.data);
        }

        // ৭. ১ম বুস্টেড পোস্ট
        if (boostedList.length > 0 && boostedIdx < boostedList.length) {
            const bItem = boostedList[boostedIdx++];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(bItem.id, bItem.data));
            loadPostAuthorDetails(bItem.id, bItem.data);
        }

        // ৮. সাধারণ ও বুস্টেড পোস্ট রেন্ডার
        let countNormal = 0;
        while (normalIdx < normalList.length) {
            const item = normalList[normalIdx++];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(item.id, item.data));
            loadPostAuthorDetails(item.id, item.data);
            countNormal++;

            if (countNormal % 4 === 0) {
                if (boostedIdx < boostedList.length) {
                    const bItem = boostedList[boostedIdx++];
                    propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(bItem.id, bItem.data));
                    loadPostAuthorDetails(bItem.id, bItem.data);
                }
            }
        }

        setupSliderAndLikeLogic();

    } catch (error) {
        console.error("ত্রুটি:", error);
        propertyG.innerHTML = '<p style="text-align:center; padding:20px; color:red;">ফিড লোড করতে সমস্যা হয়েছে।</p>';
    }
}

// ----------------------------------------------------
// 📌 নির্ভুল ইউজার/পেজ পোস্ট ডিক্লেয়ারেশন লোডার
// ----------------------------------------------------
async function loadPostAuthorDetails(docId, postData = {}) {
    const nameEl = document.getElementById(`author-name-${docId}`);
    const picEl = document.getElementById(`author-pic-${docId}`);

    if (!nameEl || !picEl) return;

    // ১. চেক করা যে পোস্টটি সরাসরি পেজ হিসেবে করা হয়েছিল কি না
    const isCompanyPost = postData.postAsPage === true || postData.ownerType === 'company' || postData.authorType === 'company';
    const companyId = postData.companyId || postData.ownerId || postData.authorId;
    const userId = postData.userId || postData.createdByUid;

    // A. যদি পোস্টটি কোম্পানির/পেজের হয়ে থাকে
    if (isCompanyPost && companyId) {
        try {
            const compDoc = await db.collection('companies').doc(companyId).get();
            if (compDoc.exists) {
                const cData = compDoc.data();
                nameEl.textContent = cData.companyName || cData.name || cData.pageName || postData.companyName || "অফিসিয়াল কোম্পানি";
                picEl.src = cData.logo || cData.companyLogo || cData.profilePic || postData.companyLogo || "https://ui-avatars.com/api/?name=Company";
                return;
            }
        } catch (e) {
            console.error("কোম্পানি ফেচিং ভুল:", e);
        }
    }

    // B. যদি পোস্টটি সাধারণ ইউজারের হয়
    if (userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                nameEl.textContent = uData.fullName || uData.name || postData.postedByName || "সম্মানিত ইউজার";
                picEl.src = uData.profilePic || uData.photoURL || postData.postedByAvatar || "https://ui-avatars.com/api/?name=User";
                return;
            }
        } catch (e) {
            console.error("ইউজার ফেচিং ভুল:", e);
        }
    }

    // C. ব্যাকআপ ডাটা রেন্ডার
    if (isCompanyPost) {
        nameEl.textContent = postData.companyName || postData.pageName || "রেজিস্টার্ড পেজ";
        picEl.src = postData.companyLogo || postData.logo || "https://ui-avatars.com/api/?name=Page";
    } else {
        nameEl.textContent = postData.postedByName || "আমার বাড়ি ইউজার";
        picEl.src = postData.postedByAvatar || "https://ui-avatars.com/api/?name=User";
    }
}

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
}

// ----------------------------------------------------
// 🔝 ৮. স্ক্রোল টু টপ বাটন
// ----------------------------------------------------
function setupScrollToTop() {
    const scrollTopBtn = document.createElement('button');
    scrollTopBtn.id = 'scrollTopBtn';
    scrollTopBtn.innerHTML = '<i class="material-icons" style="font-size:24px;">keyboard_arrow_up</i>';
    
    Object.assign(scrollTopBtn.style, {
        position: 'fixed',
        bottom: '25px',
        right: '20px',
        width: '42px',
        height: '42px',
        backgroundColor: 'rgba(24, 119, 242, 0.75)',
        color: '#ffffff',
        border: 'none',
        borderRadius: '50%',
        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(4px)',
        cursor: 'pointer',
        display: 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: '9999',
        transition: 'opacity 0.3s ease, transform 0.2s ease',
        outline: 'none'
    });

    document.body.appendChild(scrollTopBtn);

    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            scrollTopBtn.style.display = 'flex';
            scrollTopBtn.style.opacity = '1';
        } else {
            scrollTopBtn.style.opacity = '0';
            setTimeout(() => {
                if (window.scrollY <= 300) scrollTopBtn.style.display = 'none';
            }, 300);
        }
    });

    scrollTopBtn.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

// ----------------------------------------------------
// ⚙️ ইভেন্ট সেটআপ ও অ্যাপ ইনিশিয়ালাইজেশন
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    initCoverSlider();
    setupScrollToTop();

    if (menuButton && sidebar && overlay) {
        menuButton.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
        overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    }

    // 🔄 বিক্রির পোস্ট / ভাড়ার পোস্ট ট্যাবে ক্লিক করলে নিউজফিডে ব্যাক করা
    navButtons.forEach(btn => {
        btn.onclick = function() {
            navButtons.forEach(b => b.classList.remove('active'));
            document.getElementById('mapViewToggleBtn')?.classList.remove('active');
            this.classList.add('active');
            
            const selectedCategory = this.getAttribute('data-category');
            
            // ম্যাপ সেকশন পুরোপুরি বন্ধ করে নিউজফিড শো করা
            const mapSection = document.getElementById('map-section');
            const propertyContainer = document.getElementById('property-grid-container');

            if (mapSection) mapSection.style.display = 'none';
            if (propertyContainer) propertyContainer.style.display = 'block';

            fetchAndDisplayProperties(selectedCategory, globalSearchInput?.value || '');
        };
    });

    // 🗺️ "ম্যাপে দেখুন" বাটনে ক্লিক করলে কেবল ম্যাপ শো করা
    const mapViewToggleBtn = document.getElementById('mapViewToggleBtn');
    if (mapViewToggleBtn) {
        mapViewToggleBtn.onclick = function() {
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const mapSection = document.getElementById('map-section');
            const propertyContainer = document.getElementById('property-grid-container');

            if (propertyContainer) propertyContainer.style.display = 'none';
            if (mapSection) mapSection.style.display = 'block';
            
            const currentCat = document.querySelector('.fb-tabs .fb-tab-btn.active:not(#mapViewToggleBtn)')?.getAttribute('data-category') || 'বিক্রয়';
            initMap(currentCat);
        };
    }

    const btnAdvancedSearch = document.getElementById('btnAdvancedSearch');
    if (btnAdvancedSearch) {
        btnAdvancedSearch.onclick = () => {
            const activeNavBtn = document.querySelector('.fb-tabs .fb-tab-btn.active:not(#mapViewToggleBtn)');
            const category = activeNavBtn ? activeNavBtn.getAttribute('data-category') : 'বিক্রয়';
            fetchAndDisplayProperties(category, globalSearchInput?.value || '');
        };
    }

    // ডিফল্ট নিউজফিড লোড
    fetchAndDisplayProperties('বিক্রয়', ''); 

    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user);
        } else {
            if (profileImage) profileImage.style.display = 'none';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
        }
    });
});
