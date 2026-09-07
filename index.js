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

let map = null;
let currentUserData = null;

// ----------------------------------------------------
// 📸 ১. অটো-স্লাইড কভার ছবি লজিক
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
    "চট্টগ্রাম": ["চট্টগ্রাম", "কক্সবাজার", "কুমিল্লা", "ফেনী", "নোয়াখালী", "লক্ষ্মীপুর", "চাঁদপুর", "ব্রাহ্মণবাড়িয়া", "রাঙ্গামাটি", "বান্দরবান", "খাগড়াছড়ি"],
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
async function loadProfilePicture(user) {
    if (!user) {
        if (profileImage) profileImage.style.display = 'none';
        if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
        return;
    }

    const activeMode = localStorage.getItem('activeMode'); 
    const activeCompanyId = localStorage.getItem('activeCompanyId') || localStorage.getItem('activePageId');
    const activeAvatar = localStorage.getItem('activeAvatar');

    if ((activeMode === 'company' || activePageIdCheck()) && activeCompanyId) {
        try {
            const compDoc = await db.collection('companies').doc(activeCompanyId).get();
            if (compDoc.exists) {
                const cData = compDoc.data();
                const photo = cData.logo || cData.companyLogo || cData.profilePic || activeAvatar;
                if (profileImage && photo) {
                    profileImage.src = photo;
                    profileImage.style.display = 'block';
                    if (defaultProfileIcon) defaultProfileIcon.style.display = 'none';
                    return;
                }
            }
        } catch (err) {
            console.error("কোম্পানি প্রোফাইল লোড ত্রুটি:", err);
        }
    }

    loadUserDefaultPic(user);
}

function activePageIdCheck() {
    const activeMode = localStorage.getItem('activeMode');
    return activeMode ? activeMode === 'company' : !!localStorage.getItem('activePageId');
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
        } else {
            if (profileImage && user.photoURL) {
                profileImage.src = user.photoURL;
                profileImage.style.display = 'block';
                if (defaultProfileIcon) defaultProfileIcon.style.display = 'none';
            }
        }
    }).catch(err => {
        console.error("ইউজার প্রোফাইল লোড ত্রুটি:", err);
        if (profileImage && user.photoURL) {
            profileImage.src = user.photoURL;
            profileImage.style.display = 'block';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'none';
        }
    });
}

// ----------------------------------------------------
// 🗺️ ৪. ম্যাপ ফিল্টারিং ও ব্যাক বাটন লজিক
// ----------------------------------------------------
function createCustomMarker(category, type, isPaid = false) {
    const color = isPaid ? '#ff9800' : (category === 'বিক্রয়' ? '#1877f2' : '#2e7d32');
    return L.divIcon({
        html: `<div style="background:${color}; color:#fff; padding:3px 8px; border-radius:12px; font-size:11px; font-weight:bold; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.4); white-space:nowrap;">${type} (${category}) ${isPaid ? '⭐' : ''}</div>`,
        className: 'fb-pin',
        iconSize: [85, 26]
    });
}

function updateMapBackButton(show = false) {
    let backBtnContainer = document.getElementById('mapBackNavContainer');
    const tabsContainer = document.querySelector('.fb-tabs') || document.getElementById('map-section');

    if (show) {
        if (!backBtnContainer) {
            backBtnContainer = document.createElement('div');
            backBtnContainer.id = 'mapBackNavContainer';
            backBtnContainer.style.cssText = "padding: 8px 12px; background: #f0f2f5; margin-bottom: 8px; display: flex; align-items: center;";

            const backBtn = document.createElement('button');
            backBtn.id = 'mapBackToFeedBtn';
            backBtn.innerHTML = '<i class="material-icons" style="font-size:16px; vertical-align:middle;">arrow_back</i> পোস্ট লিস্টে ফিরে যান';
            Object.assign(backBtn.style, {
                backgroundColor: '#1877f2',
                color: '#ffffff',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '20px',
                fontWeight: 'bold',
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
            });

            backBtn.onclick = () => {
                const mapSection = document.getElementById('map-section');
                const propertyContainer = document.getElementById('property-grid-container');

                if (mapSection) mapSection.style.display = 'none';
                if (propertyContainer) propertyContainer.style.display = 'block';

                document.getElementById('mapViewToggleBtn')?.classList.remove('active');
                
                const activeNavBtn = document.querySelector('.fb-tabs .fb-tab-btn:not(#mapViewToggleBtn).active') || document.querySelector('.fb-tabs .fb-tab-btn:not(#mapViewToggleBtn)');
                if (activeNavBtn) {
                    activeNavBtn.click();
                }
            };

            backBtnContainer.appendChild(backBtn);
            if (tabsContainer && tabsContainer.parentNode) {
                tabsContainer.parentNode.insertBefore(backBtnContainer, tabsContainer);
            }
        } else {
            backBtnContainer.style.display = 'flex';
        }
    } else {
        if (backBtnContainer) backBtnContainer.style.display = 'none';
    }
}

async function initMap(category = 'বিক্রয়') {
    const mapSection = document.getElementById('map-section');
    if (!mapSection || mapSection.style.display === 'none') return;

    updateMapBackButton(true);

    if (map) {
        map.remove();
        map = null;
    }
    
    map = L.map('map-container').setView([22.8456, 89.5403], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);

    try {
        const filterType = document.getElementById('filterType')?.value || '';
        const filterDistrict = document.getElementById('filterDistrict')?.value || '';

        let snap = await db.collection('properties')
            .where('category', '==', category)
            .where('status', '==', 'published')
            .get();

        const bounds = [];

        snap.forEach(doc => {
            const data = doc.data();

            if (filterType && data.type !== filterType) return;
            if (filterDistrict && data.location?.district !== filterDistrict) return;

            if (data.location && data.location.lat && data.location.lng) {
                const lat = parseFloat(data.location.lat);
                const lng = parseFloat(data.location.lng);

                if (!isNaN(lat) && !isNaN(lng)) {
                    bounds.push([lat, lng]);
                    const marker = L.marker([lat, lng], {
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
            }
        });

        if (bounds.length > 0) {
            map.fitBounds(bounds, { padding: [30, 30] });
        }
    } catch (err) {
        console.error("ম্যাপ ডাটা লোড ত্রুটি:", err);
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
            let redirectUrl = `seller-profile.html?companyId=${cId}&mode=company`;

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
            console.error("কোম্পানি ডাটা সমস্যা:", e);
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
// 🟢 ৬. প্রপার্টি পোস্ট কার্ড HTML (আপডেটেড লেআউট)
// ----------------------------------------------------
function createFbPostHTML(docId, data) {
    const title = data.title || 'শিরোনামহীন প্রোপার্টি';
    const description = data.description || 'কোন বিবরণ দেওয়া হয়নি।';
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

    // ইমেজ অ্যারে প্রসেসিং
    let images = [];
    if (data.images && data.images.length > 0) {
        data.images.forEach(img => {
            const url = typeof img === 'string' ? img : (img.url || '');
            if (url) images.push(url);
        });
    }
    
    if (images.length === 0) {
        images.push('https://via.placeholder.com/500x300?text=No+Photo');
    }

    // ৫টি থাম্বনেইল পিকচার তৈরির লজিক
    const displayThumbs = images.slice(0, 5);
    const thumbHTML = displayThumbs.map((img, i) => `
        <div class="thumb-box ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="switchSlide('${docId}', ${i}, event)">
            <img src="${img}" alt="thumb">
        </div>
    `).join('');

    // টাইপ অনুযায়ী ইনফরমেশন গ্রিড তৈরি
    const isLandOrPlot = (type === 'জমি' || type === 'প্লট');
    
    let infoSectionHTML = '';
    if (isLandOrPlot) {
        infoSectionHTML = `
            <div class="prop-info-left">
                <div>◾ প্রপার্টির ধরন: <b>${category}</b></div>
                <div>◾ টাইপ: <b>${type}</b></div>
                <div>◾ পরিমাণ: <b>${size} ${unit}</b></div>
                <div>◾ রোড: <b>${data.roadSize || 'তথ্য নেই'}</b></div>
            </div>
        `;
    } else {
        infoSectionHTML = `
            <div class="prop-info-left">
                <div>◾ প্রপার্টির ধরন: <b>${category} (${type})</b></div>
                <div>◾ বেড: <b>${data.bedrooms || '০'}টি</b></div>
                <div>◾ পরিমাণ: <b>${size} ${unit}</b></div>
                <div>◾ বাথ: <b>${data.bathrooms || '০'}টি</b></div>
            </div>
        `;
    }

    return `
        <div class="fb-feed-card ${isBoosted ? 'boosted-card' : ''}" id="post-card-${docId}">
            <!-- ১. হেডার সেকশন -->
            <div class="card-author-header">
                <div class="author-info">
                    <img id="author-pic-${docId}" src="https://via.placeholder.com/40?text=..." class="fb-profile-pic" alt="pic">
                    <div class="author-meta">
                        <h4 id="author-name-${docId}">লোডিং...</h4>
                        <p><i class="material-icons" style="font-size:12px;">place</i> ${village}, ${thana}, ${district}</p>
                    </div>
                </div>
                <div style="display:flex; gap:4px; align-items:center;">
                    ${verifiedBadge}
                    ${boostedBadge}
                    <span class="badge-category">${category}</span>
                </div>
            </div>

            <!-- ২. হাইলাইটেড সবুজ শিরোনাম -->
            <div class="custom-card-title-banner">
                ${title}
            </div>

            <!-- ৩. সর্ট ডেসক্রিপশন উইথ টগল -->
            <div class="custom-card-desc">
                <p class="desc-text clamp-line" id="desc-${docId}">${description}</p>
                <span class="read-more-btn" onclick="toggleReadMore('${docId}')">আরও পড়ুন...</span>
            </div>

            <!-- ৪. মেইন কভার ফটো ও থাম্বনেইল স্লাইডার -->
            <div class="custom-media-wrapper">
                <a href="details.html?id=${docId}" class="main-cover-link">
                    <img id="main-cover-${docId}" src="${images[0]}" class="main-cover-img" alt="${title}">
                </a>
                
                <div class="thumb-strip" id="thumbs-${docId}">
                    ${thumbHTML}
                </div>
            </div>

            <!-- ৫. প্রপার্টি স্পেসিফিকেশন ও প্রাইস সেকশন -->
            <div class="custom-prop-details-grid">
                ${infoSectionHTML}
                <div class="prop-info-right">
                    <div class="price-amount">${displayPrice} টাকা</div>
                    <div class="price-unit">(${unit || 'একমুঠো'})</div>
                </div>
            </div>

            <!-- ৬. বিস্তারিত বাটন -->
            <div style="padding: 10px 12px 14px 12px;">
                <a href="details.html?id=${docId}" class="btn-details-outline">
                    &gt;&gt; বিস্তারিত জানুন
                </a>
            </div>
        </div>
    `;
}

// ----------------------------------------------------
// 🔄 ৭. স্লাইডার ও ইন্টারঅ্যাকশন ফাংশনসমূহ
// ----------------------------------------------------

// বিবরণ বড়/ছোট করার লজিক
function toggleReadMore(docId) {
    const descEl = document.getElementById(`desc-${docId}`);
    const btn = descEl.nextElementSibling;
    if (descEl.classList.contains('clamp-line')) {
        descEl.classList.remove('clamp-line');
        btn.textContent = 'সংক্ষিপ্ত করুন';
    } else {
        descEl.classList.add('clamp-line');
        btn.textContent = 'আরও পড়ুন...';
    }
}

// ম্যানুয়াল থাম্বনেইল সুইচিং
function switchSlide(docId, index, event) {
    if(event) event.stopPropagation();
    const card = document.getElementById(`post-card-${docId}`);
    if (!card) return;

    const images = Array.from(card.querySelectorAll('.thumb-box img')).map(img => img.src);
    const mainImg = document.getElementById(`main-cover-${docId}`);
    if (mainImg && images[index]) {
        mainImg.src = images[index];
    }

    const thumbs = card.querySelectorAll('.thumb-box');
    thumbs.forEach((t, i) => {
        if (i === index) t.classList.add('active');
        else t.classList.remove('active');
    });

    card.dataset.currentIndex = index;
}

// অটোপ্লে স্লাইডার রেজিস্ট্রি ও ইন্টারসেকশন অবজারভার
let activeIntervals = {};

function setupAutoSliders() {
    // আগের সব টাইমার ক্লিয়ার
    Object.keys(activeIntervals).forEach(key => clearInterval(activeIntervals[key]));
    activeIntervals = {};

    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.5 // স্ক্রিনে ৫০% আসলে স্লাইড শুরু হবে
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            const card = entry.target;
            const docId = card.id.replace('post-card-', '');

            if (entry.isIntersecting) {
                // স্ক্রিনে আসলে স্লাইড চালু হবে
                if (!activeIntervals[docId]) {
                    card.dataset.currentIndex = card.dataset.currentIndex || 0;
                    activeIntervals[docId] = setInterval(() => {
                        const thumbs = card.querySelectorAll('.thumb-box');
                        if (thumbs.length <= 1) return;
                        
                        let curr = parseInt(card.dataset.currentIndex || 0);
                        let next = (curr + 1) % thumbs.length;
                        switchSlide(docId, next, null);
                    }, 3000); // ৩ সেকেন্ট পর পর অটো স্লাইড
                }
            } else {
                // স্ক্রিনের বাইরে গেলে স্লাইড বন্ধ হবে (পারফরম্যান্স সেভ করার জন্য)
                if (activeIntervals[docId]) {
                    clearInterval(activeIntervals[docId]);
                    delete activeIntervals[docId];
                }
            }
        });
    }, observerOptions);

    document.querySelectorAll('.fb-feed-card[id^="post-card-"]').forEach(card => {
        observer.observe(card);
    });
}

function setupSliderAndLikeLogic() {
    setupAutoSliders();
}


// ----------------------------------------------------
// 🚀 ৮. নিউজ ফিড রেন্ডারিং লজিক
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
// 📌 পোস্টে পেজ/ইউজার নাম এবং লোগো ফেচিং
// ----------------------------------------------------
async function loadPostAuthorDetails(docId, postData = {}) {
    const nameEl = document.getElementById(`author-name-${docId}`);
    const picEl = document.getElementById(`author-pic-${docId}`);

    if (!nameEl || !picEl) return;

    const isCompany = postData.ownerType === 'company' || postData.authorType === 'company' || !!postData.companyId;
    const companyId = postData.companyId || postData.ownerId || postData.authorId;
    const userId = postData.userId || postData.createdByUid || postData.createdByUserId;

    if (isCompany && companyId) {
        try {
            const compDoc = await db.collection('companies').doc(companyId).get();
            if (compDoc.exists) {
                const compData = compDoc.data();
                nameEl.textContent = compData.companyName || compData.name || postData.postedByName || "অফিসিয়াল কোম্পানি";
                
                const logo = compData.logo || compData.companyLogo || compData.profilePic || postData.postedByAvatar;
                if (logo) picEl.src = logo;
            } else {
                nameEl.textContent = postData.postedByName || "কোম্পানি পেজ";
                if (postData.postedByAvatar) picEl.src = postData.postedByAvatar;
            }
        } catch (e) {
            nameEl.textContent = postData.postedByName || "আমার বাড়ি প্ল্যাটফর্ম কোম্পানি";
        }
        return;
    } 

    if (userId) {
        try {
            const userDoc = await db.collection('users').doc(userId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                nameEl.textContent = userData.fullName || userData.name || postData.postedByName || "সম্মানিত বিক্রেতা";
                
                const avatar = userData.profilePic || postData.postedByAvatar;
                if (avatar) picEl.src = avatar;
            } else {
                nameEl.textContent = postData.postedByName || "সাধারণ ইউজার";
            }
        } catch (e) {
            nameEl.textContent = "আমার বাড়ি প্ল্যাটফর্ম ইউজার";
        }
        return;
    }

    nameEl.textContent = postData.postedByName || "বিজ্ঞাপনদাতা";
}

// ----------------------------------------------------
// 👍 লাইক অপশন লজিক
// ----------------------------------------------------
async function toggleLike(docId, btnEl) {
    const user = auth.currentUser;
    if (!user) {
        alert("লাইক দিতে প্রথমে লগইন করুন।");
        window.location.href = "auth.html";
        return;
    }

    const postRef = db.collection('properties').doc(docId);
    const likeCountSpan = btnEl.closest('.fb-feed-card').querySelector('.like-count');

    try {
        await db.runTransaction(async (transaction) => {
            const postDoc = await transaction.get(postRef);
            if (!postDoc.exists) return;

            const data = postDoc.data();
            let likes = data.likes || 0;
            let likedBy = data.likedBy || [];

            const userIndex = likedBy.indexOf(user.uid);

            if (userIndex === -1) {
                likes += 1;
                likedBy.push(user.uid);
                btnEl.style.color = '#1877f2';
            } else {
                likes = Math.max(0, likes - 1);
                likedBy.splice(userIndex, 1);
                btnEl.style.color = '#65676b';
            }

            transaction.update(postRef, { likes, likedBy });
            if (likeCountSpan) likeCountSpan.textContent = likes;
        });
    } catch (err) {
        console.error("লাইক দিতে ব্যর্থ:", err);
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
// 🔝 ৯. স্ক্রোল টু টপ বাটন
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
        backgroundColor: 'rgba(24, 119, 242, 0.85)',
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

    navButtons.forEach(btn => {
        btn.onclick = function() {
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const selectedCategory = this.getAttribute('data-category');
            const mapSection = document.getElementById('map-section');
            const propertyContainer = document.getElementById('property-grid-container');

            if (mapSection && mapSection.style.display !== 'none') {
                initMap(selectedCategory);
            } else {
                updateMapBackButton(false);
                if (propertyContainer) propertyContainer.style.display = 'block';
                fetchAndDisplayProperties(selectedCategory, globalSearchInput?.value || '');
            }
        };
    });

    const mapViewToggleBtn = document.getElementById('mapViewToggleBtn');
    if (mapViewToggleBtn) {
        mapViewToggleBtn.onclick = function() {
            const mapSection = document.getElementById('map-section');
            const propertyContainer = document.getElementById('property-grid-container');

            if (propertyContainer) propertyContainer.style.display = 'none';
            if (mapSection) mapSection.style.display = 'block';
            
            const activeNavBtn = document.querySelector('.fb-tabs .fb-tab-btn.active:not(#mapViewToggleBtn)');
            const currentCat = activeNavBtn ? activeNavBtn.getAttribute('data-category') : 'বিক্রয়';
            initMap(currentCat);
        };
    }

    const btnAdvancedSearch = document.getElementById('btnAdvancedSearch');
    if (btnAdvancedSearch) {
        btnAdvancedSearch.onclick = () => {
            const mapSection = document.getElementById('map-section');
            const isMapActive = mapSection && mapSection.style.display !== 'none';
            const activeNavBtn = document.querySelector('.fb-tabs .fb-tab-btn.active:not(#mapViewToggleBtn)');
            const category = activeNavBtn ? activeNavBtn.getAttribute('data-category') : 'বিক্রয়';

            if (isMapActive) {
                initMap(category);
            } else {
                fetchAndDisplayProperties(category, globalSearchInput?.value || '');
            }
        };
    }

    // লগআউট লজিক
    const logoutBtn = document.getElementById('logout-link-sidebar');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            auth.signOut().then(() => {
                window.location.reload();
            });
        };
    }

    // ডিফল্ট লোড
    fetchAndDisplayProperties('বিক্রয়', ''); 

    // ফায়ারবেস অথ লিসেনার
    auth.onAuthStateChanged(user => {
        const loginLink = document.getElementById('login-link-sidebar');
        const logoutLink = document.getElementById('logout-link-sidebar');

        if (user) {
            loadProfilePicture(user);
            if (loginLink) loginLink.style.display = 'none';
            if (logoutLink) logoutLink.style.display = 'flex';
        } else {
            if (profileImage) profileImage.style.display = 'none';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
            if (loginLink) loginLink.style.display = 'flex';
            if (logoutLink) logoutLink.style.display = 'none';
        }
    });
    
    window.addEventListener('storage', () => {
        const user = auth.currentUser;
        if (user) loadProfilePicture(user);
    });
});
