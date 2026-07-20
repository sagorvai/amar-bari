// Firebase Global Reference
const db = firebase.firestore();
const auth = firebase.auth();

// UI Elements Selector
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

const notificationButton = document.getElementById('notificationButton'); 
const messageButton = document.getElementById('messageButton');
const profileImageWrapper = document.getElementById('profileImageWrapper'); 
const profileImage = document.getElementById('profileImage'); 
const defaultProfileIcon = document.getElementById('defaultProfileIcon'); 

const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');

const navButtons = document.querySelectorAll('.fb-tabs .fb-tab-btn:not(#mapViewToggleBtn)'); 
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');
const globalSearchInput = document.getElementById('globalSearchInput');

let map;
let bannerInterval = null; // অটো স্লাইডারের জন্য

// ----------------------------------------------------
// 🎨 ১. অটো-স্ক্রোলিং ৩টি ব্যানার বিজ্ঞাপন + প্লাস (+) আইকন
// ----------------------------------------------------
function createAutoScrollBannerHTML() {
    return `
        <div class="fb-feed-card auto-banner-wrapper" style="background:#fff; border:1px solid #ced0d4; border-radius:8px; padding:12px; margin-bottom:16px; box-shadow:0 1px 2px rgba(0,0,0,0.05); font-family:'Hind Siliguri', sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-weight:700; font-size:13px; color:#1877f2; display:flex; align-items:center; gap:4px;">
                    <i class="material-icons" style="font-size:16px; color:#ff9800;">campaign</i> বিশেষ অফার ও বিজ্ঞাপন
                </span>
                <span style="font-size:10px; background:#e4e6eb; color:#65676b; padding:2px 6px; border-radius:10px;">স্পন্সরড</span>
            </div>

            <div id="bannerScrollContainer" style="display:flex; gap:12px; overflow-x:auto; padding-bottom:8px; scroll-behavior:smooth; -webkit-overflow-scrolling:touch;">
                <!-- ব্যানার ১ -->
                <div style="min-width:260px; width:260px; background:linear-gradient(135deg, #1877f2, #0d52b5); color:#fff; border-radius:8px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; flex-shrink:0;">
                    <div>
                        <span style="background:rgba(255,255,255,0.25); font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold;">অফার ১</span>
                        <h4 style="margin:6px 0 4px 0; font-size:14px;">আপনার প্রপার্টি কেনাবেচা দ্রুত করুন</h4>
                        <p style="margin:0; font-size:11px; opacity:0.9;">কোনো কমিশন ছাড়াই সরাসরি ক্রেতা ও বিক্রেতার সাথে চ্যাট করুন।</p>
                    </div>
                    <a href="post.html" style="margin-top:8px; background:#fff; color:#1877f2; text-align:center; padding:5px; border-radius:6px; font-weight:bold; font-size:12px; text-decoration:none;">ফ্রি পোস্ট করুন</a>
                </div>

                <!-- ব্যানার ২ -->
                <div style="min-width:260px; width:260px; background:linear-gradient(135deg, #00a884, #005c4b); color:#fff; border-radius:8px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; flex-shrink:0;">
                    <div>
                        <span style="background:rgba(255,255,255,0.25); font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold;">অফার ২</span>
                        <h4 style="margin:6px 0 4px 0; font-size:14px;">খুলনায় ফ্ল্যাট ও জমির সেরা বাজার</h4>
                        <p style="margin:0; font-size:11px; opacity:0.9;">যাচাইকৃত খতিয়ান ও নকশাসহ বিশ্বস্ত আবাসন খুঁজে নিন।</p>
                    </div>
                    <a href="tips.html" style="margin-top:8px; background:#fff; color:#005c4b; text-align:center; padding:5px; border-radius:6px; font-weight:bold; font-size:12px; text-decoration:none;">গাইডলাইন দেখুন</a>
                </div>

                <!-- ব্যানার ৩ -->
                <div style="min-width:260px; width:260px; background:linear-gradient(135deg, #ff9800, #e65100); color:#fff; border-radius:8px; padding:12px; display:flex; flex-direction:column; justify-content:space-between; flex-shrink:0;">
                    <div>
                        <span style="background:rgba(255,255,255,0.25); font-size:10px; padding:2px 6px; border-radius:4px; font-weight:bold;">অফার ৩</span>
                        <h4 style="margin:6px 0 4px 0; font-size:14px;">জরুরি বিক্রয় বা ভাড়ার বিজ্ঞাপন?</h4>
                        <p style="margin:0; font-size:11px; opacity:0.9;">ফিডের সবার উপরে আপনার পোস্ট তুলে ধরুন খুব সহজে।</p>
                    </div>
                    <a href="boost.html" style="margin-top:8px; background:#fff; color:#e65100; text-align:center; padding:5px; border-radius:6px; font-weight:bold; font-size:12px; text-decoration:none;">বুস্ট করুন</a>
                </div>

                <!-- ➕ প্লাস (+) আইকন (ইউজার নিজের ব্যানার বা অ্যাড যুক্ত করতে পারবে) -->
                <div style="min-width:110px; width:110px; background:#f0f2f5; border:2px dashed #1877f2; border-radius:8px; padding:8px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; flex-shrink:0; cursor:pointer;" onclick="window.location.href='boost.html'">
                    <div style="width:36px; height:36px; background:#1877f2; color:#fff; border-radius:50%; display:flex; align-items:center; justify-content:center; margin-bottom:4px;">
                        <i class="material-icons" style="font-size:20px;">add</i>
                    </div>
                    <span style="font-size:11px; font-weight:bold; color:#1877f2;">অ্যাড দিন</span>
                </div>
            </div>
        </div>
    `;
}

// অটো স্লাইডার টাইমার শুরু করার ফাংশন
function startAutoScrollBanner() {
    if (bannerInterval) clearInterval(bannerInterval);
    const container = document.getElementById('bannerScrollContainer');
    if (!container) return;

    bannerInterval = setInterval(() => {
        if (container.scrollLeft + container.clientWidth >= container.scrollWidth - 10) {
            container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: 270, behavior: 'smooth' });
        }
    }, 3500); // ৩.৫ সেকেন্ড পর পর স্লাইড হবে
}

// ----------------------------------------------------
// 🎨 ২. ৫টি ফিচার্ড পোস্টের হরিজন্টাল স্লাইডার
// ----------------------------------------------------
function createFeaturedPostsSliderHTML(featuredList) {
    if (!featuredList || featuredList.length === 0) return '';

    // সর্বোচ্চ ৫টি নেওয়া
    const list = featuredList.slice(0, 5);

    const cardsHTML = list.map(item => {
        const data = item.data;
        const imgUrl = (data.images && data.images.length > 0) ? (data.images[0].url || data.images[0]) : 'https://via.placeholder.com/220x130?text=No+Image';
        const price = data.price || data.monthlyRent || 'আলোচনা সাপেক্ষে';
        const displayPrice = typeof price === 'number' ? new Intl.NumberFormat('bn-BD').format(price) : price;

        return `
            <div style="min-width:220px; width:220px; background:#fff; border:1px solid #ff9800; border-radius:8px; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; flex-shrink:0; box-shadow:0 2px 4px rgba(0,0,0,0.08);">
                <div>
                    <div style="height:120px; background-image:url('${imgUrl}'); background-size:cover; background-position:center; position:relative;">
                        <span style="position:absolute; top:6px; left:6px; background:#ff9800; color:#fff; font-size:10px; font-weight:bold; padding:2px 6px; border-radius:4px;">⭐ ফিচার্ড</span>
                    </div>
                    <div style="padding:8px;">
                        <h4 style="margin:0 0 4px 0; font-size:13px; font-weight:700; color:#050505; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${data.title || 'শিরোনামহীন'}</h4>
                        <p style="margin:0; font-size:11px; color:#65676b;">📍 ${data.location?.district || ''}, ${data.location?.thana || ''}</p>
                        <p style="margin:4px 0 0 0; font-size:13px; font-weight:bold; color:#1877f2;">৳ ${displayPrice}</p>
                    </div>
                </div>
                <div style="padding:0 8px 8px 8px;">
                    <a href="details.html?id=${item.id}" style="display:block; text-align:center; background:#fff3e0; color:#e65100; border:1px solid #ffe082; padding:4px; border-radius:4px; font-size:11px; font-weight:bold; text-decoration:none;">দেখুন</a>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="fb-feed-card featured-slider-wrapper" style="background:#fffdf6; border:1px solid #ffe082; border-radius:8px; padding:12px; margin-bottom:16px; font-family:'Hind Siliguri', sans-serif;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span style="font-weight:700; font-size:14px; color:#e65100; display:flex; align-items:center; gap:4px;">
                    <i class="material-icons" style="font-size:18px; color:#ff9800;">stars</i> ফিচার্ড প্রপার্টিসমূহ
                </span>
                <span style="font-size:11px; color:#65676b;">পাশে স্ক্রোল করুন ➔</span>
            </div>
            <div style="display:flex; gap:12px; overflow-x:auto; padding-bottom:6px; scroll-behavior:smooth; -webkit-overflow-scrolling:touch;">
                ${cardsHTML}
            </div>
        </div>
    `;
}

// ----------------------------------------------------
// 🎨 ৩. সিঙ্গেল প্রপার্টি পোস্ট কার্ড (সাধারণ বা বুস্টেড)
// ----------------------------------------------------
function createFbPostHTML(docId, data) {
    const title = data.title || 'শিরোনামহীন প্রোপার্টি';
    const village = data.location?.village || "তথ্য নেই";
    const thana = data.location?.thana || data.location?.upazila || "তথ্য নেই";
    const district = data.location?.district || "তথ্য নেই";
    
    const size = data.landArea || data.houseArea || data.areaSqft || data.commercialArea || '০';
    const unit = data.landAreaUnit || data.houseAreaUnit || data.areaSqftUnit || data.commercialAreaUnit || '';
    
    const type = data.type || 'প্রপার্টি';
    const category = data.category || 'বিক্রয়';
    const isBoosted = data.isBoosted === true;
    
    let amount = category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let priceUnit = data.priceUnit || data.rentUnit || ""; 
    let displayPrice = amount ? new Intl.NumberFormat('bn-BD').format(amount) : 'আলোচনা সাপেক্ষে';

    const hasDocs = data.documents && (data.documents.khotian || data.documents.sketch);
    const verifiedBadge = hasDocs ? `<span class="badge-verified">✓ ভেরিফাইড</span>` : '';
    const boostedBadge = isBoosted ? `
        <span class="badge-boosted">
            <i class="material-icons" style="font-size:12px;">bolt</i> স্পন্সরড
        </span>
    ` : '';

    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));
    
    let mediaHTML = `<div class="fb-slide-item" style="background-image: url('https://via.placeholder.com/500x260?text=No+Photo'); display:block;"></div>`;
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
        <div class="fb-feed-card ${isBoosted ? 'boosted-card' : ''}" style="background:#fff; border:1px solid ${isBoosted ? '#ff9800' : '#ced0d4'}; border-radius:8px; margin-bottom:16px; box-shadow:0 1px 2px rgba(0,0,0,0.05); display:flex; flex-direction:column; font-family:'Hind Siliguri', sans-serif;">
            <div class="card-author-header" style="padding:12px; display:flex; align-items:center; justify-content:space-between;">
                <div class="author-info" style="display:flex; align-items:center; gap:10px;">
                    <img id="author-pic-${docId}" src="https://via.placeholder.com/40?text=Pic" class="author-avatar-img" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #ced0d4;" alt="pic">
                    <div class="author-meta">
                        <h4 id="author-name-${docId}" style="margin:0; font-size:15px; font-weight:600; color:#050505;">আমার বাড়ি ইউজার</h4>
                        <p style="margin:2px 0 0 0; font-size:12px; color:#65676b; display:flex; align-items:center; gap:4px;">
                            <i class="material-icons" style="font-size:12px;">place</i> ${village}, ${thana}, ${district}
                        </p>
                    </div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${boostedBadge}
                    ${verifiedBadge}
                    <span class="badge-category">${category}</span>
                </div>
            </div>
            
            <div class="card-body-text" style="padding:0 12px 12px 12px; font-size:14px; line-height:1.5; color:#050505;">
                <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #050505;">${title}</h3>
                <div style="margin-top:4px; color:#050505;">
                    <b>${size} ${unit}, ${type}, ${category}।</b> বিস্তারিত জানতে ও সরাসরি যোগাযোগ করতে নিচে দেয়া বাটনে ক্লিক করুন।
                </div>
            </div>

            <div class="card-media-section">
                <div class="fb-slider" data-current-index="0" data-total-slides="${images.length}">
                    ${mediaHTML}
                    ${navArrows}
                </div>
                <div class="price-tag-overlay">
                    ৳ ${displayPrice} ${priceUnit ? `(${priceUnit})` : ''} ${category === 'ভাড়া' ? '/মাস' : ''}
                </div>
            </div>

            <div class="fb-stats-bar">
                <div class="fb-reactions">
                    <i class="material-icons" style="background:#1877f2; color:white; border-radius:50%; font-size:12px; padding:3px;">thumb_up</i>
                    <span class="likes-num"><span class="like-count">${data.likes || 0}</span> জন পছন্দ করেছেন</span>
                </div>
                <div>কমেন্ট দেখুন</div>
            </div>

            <div class="fb-action-buttons">
                <button class="fb-action-btn like-btn-toggle"><i class="material-icons">thumb_up_off_alt</i> লাইক</button>
                <a href="details.html?id=${docId}" class="fb-action-btn" style="color:#ff4d4d; font-weight:700; text-decoration:none;">
                    <i class="material-icons">double_arrow</i> বিস্তারিত ও যোগাযোগ
                </a>
            </div>
        </div>
    `;
}

// ----------------------------------------------------
// 🎯 ৪. সম্পূর্ণ নিউজ ফিড মাস্টার রেন্ডারার (সিকোয়েন্স লজিক)
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

        const filterType = document.getElementById('filterType')?.value || '';
        const filterDistrict = document.getElementById('filterDistrict')?.value || '';
        const formattedSearch = searchFilter.toLowerCase().trim();

        let allDocs = [];

        snap.forEach(doc => {
            const data = doc.data();
            let isMatched = true; 

            if (filterType && data.type !== filterType) isMatched = false;
            if (filterDistrict && data.location?.district !== filterDistrict) isMatched = false;
            
            if (formattedSearch) {
                const titleMatch = data.title?.toLowerCase().includes(formattedSearch);
                const villageMatch = data.location?.village?.toLowerCase().includes(formattedSearch);
                const thanaMatch = data.location?.thana?.toLowerCase().includes(formattedSearch);
                const roadMatch = data.location?.road?.toLowerCase().includes(formattedSearch);
                const districtTextMatch = data.location?.district?.toLowerCase().includes(formattedSearch);
                
                if (!titleMatch && !villageMatch && !thanaMatch && !roadMatch && !districtTextMatch) {
                    isMatched = false;
                }
            }

            if (isMatched) {
                allDocs.push({ id: doc.id, data: data });
            }
        });

        if (allDocs.length === 0) {
            propertyG.innerHTML = '<p style="text-align:center; padding:40px; color:#65676b;">আপনার সার্চ অনুযায়ী এই মুহূর্তে কোনো পোস্ট পাওয়া যায়নি।</p>';
            return;
        }

        // সাধারণ, বুস্টেড এবং ফিচার্ড পোস্ট আলাদা করা
        let boostedList = allDocs.filter(item => item.data.isBoosted === true);
        let normalList = allDocs.filter(item => item.data.isBoosted !== true);
        let featuredList = allDocs.filter(item => item.data.isFeatured === true || item.data.isBoosted === true);
        
        // যদি ডাটাবেজে ফিচার্ড কম থাকে, তবে স্বাভাবিক ডেমোর জন্য ১ম ৫টি পোস্ট ফিচার্ডে থাকবে
        if (featuredList.length < 5) {
            featuredList = allDocs.slice(0, 5);
        }

        // ==========================================
        // 🚀 সিকোয়েন্স রেন্ডারিং লজিক (তোমার শর্ত অনুযায়ী)
        // ==========================================

        // ১. সর্বপ্রথমে ৩টি অটো-স্লাইড ব্যানার অ্যাড + (+) আইকন
        propertyG.insertAdjacentHTML('beforeend', createAutoScrollBannerHTML());
        startAutoScrollBanner();

        let normalIdx = 0;
        let boostedIdx = 0;

        // ২. ২টি সাধারণ পোস্ট দেখাবে
        for (let i = 0; i < 2 && normalIdx < normalList.length; i++, normalIdx++) {
            const item = normalList[normalIdx];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(item.id, item.data));
            loadPostAuthorDetails(item.id, item.data.userId);
        }

        // ৩. ৫টি ফিচার্ড পোস্ট স্লাইডার
        propertyG.insertAdjacentHTML('beforeend', createFeaturedPostsSliderHTML(featuredList));

        // ৪. আরও ২টি সাধারণ পোস্ট দেখাবে
        for (let i = 0; i < 2 && normalIdx < normalList.length; i++, normalIdx++) {
            const item = normalList[normalIdx];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(item.id, item.data));
            loadPostAuthorDetails(item.id, item.data.userId);
        }

        // ৫. ১টি বুস্টেড পোস্ট দেখাবে
        if (boostedList.length > 0 && boostedIdx < boostedList.length) {
            const bItem = boostedList[boostedIdx++];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(bItem.id, bItem.data));
            loadPostAuthorDetails(bItem.id, bItem.data.userId);
        } else if (normalIdx < normalList.length) {
            // বুস্টেড পোস্ট না থাকলে ডেমো সাধারণ পোস্টকে বুস্টেড স্টাইলে দেখাবে
            let fallbackItem = normalList[normalIdx];
            fallbackItem.data.isBoosted = true; 
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(fallbackItem.id, fallbackItem.data));
            loadPostAuthorDetails(fallbackItem.id, fallbackItem.data.userId);
        }

        // ৬. এর পর থেকে প্রতি ৪টি সাধারণ পোস্টের পর ১টি করে বুস্টেড পোস্ট
        let currentNormalCounter = 0;

        while (normalIdx < normalList.length) {
            const item = normalList[normalIdx++];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(item.id, item.data));
            loadPostAuthorDetails(item.id, item.data.userId);
            currentNormalCounter++;

            if (currentNormalCounter % 4 === 0) {
                if (boostedIdx < boostedList.length) {
                    const bItem = boostedList[boostedIdx++];
                    propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(bItem.id, bItem.data));
                    loadPostAuthorDetails(bItem.id, bItem.data.userId);
                }
            }
        }

        setupSliderAndLikeLogic();

    } catch (error) {
        console.error("সার্চইঞ্জিন ত্রুটি:", error);
        propertyG.innerHTML = '<p style="text-align:center; padding:20px; color:red;">ফিড লোড করতে সমস্যা হয়েছে।</p>';
    }
}

// ----------------------------------------------------
// ইউটিলিটি ও সাপোর্ট ফাংশনস
// ----------------------------------------------------
function loadProfilePicture(user) {
    if (profileImage && defaultProfileIcon) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().profilePic) {
                profileImage.src = doc.data().profilePic;
                profileImage.style.display = 'block';
                defaultProfileIcon.style.display = 'none';
            } else {
                profileImage.style.display = 'none';
                defaultProfileIcon.style.display = 'block';
            }
        }).catch(() => {
            profileImage.style.display = 'none';
            defaultProfileIcon.style.display = 'block';
        });
    }
}

function updateIconCounts() {
    const user = auth.currentUser;
    if (!user) return;

    db.collection('notifications').where('userId', '==', user.uid).where('read', '==', false).get().then(notifSnap => {
        if (notificationCount) {
            notificationCount.textContent = notifSnap.size;
            notificationCount.style.display = notifSnap.empty ? 'none' : 'inline-block';
        }
    });

    db.collection('messages').where('receiverId', '==', user.uid).where('read', '==', false).get().then(msgSnap => {
        if (messageCount) {
            messageCount.textContent = msgSnap.size;
            messageCount.style.display = msgSnap.empty ? 'none' : 'inline-block';
        }
    });
}

function handleLogout(e) {
    e.preventDefault();
    auth.signOut().then(() => {
        alert('সফলভাবে লগআউট হয়েছে!');
        window.location.reload();
    });
}

function loadPostAuthorDetails(docId, userId) {
    if (!userId) return;
    db.collection('users').doc(userId).get().then(userDoc => {
        if (userDoc.exists) {
            const userData = userDoc.data();
            const nameEl = document.getElementById(`author-name-${docId}`);
            const picEl = document.getElementById(`author-pic-${docId}`);
            if (nameEl) nameEl.textContent = userData.fullName || userData.name || "সম্মানিত বিক্রেতা";
            if (picEl && userData.profilePic) picEl.src = userData.profilePic;
        }
    });
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

    document.querySelectorAll('.like-btn-toggle').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault(); e.stopPropagation();
            this.classList.toggle('liked');
            const countSpan = this.querySelector('.like-count');
            let count = parseInt(countSpan.textContent);
            countSpan.textContent = this.classList.contains('liked') ? count + 1 : count - 1;
            this.style.color = this.classList.contains('liked') ? '#1877f2' : 'inherit';
        };
    });
}

// জেলা ডাইনামিক ফিল্টার ডিকশনারি
const bdDistricts = {
    "খুলনা": ["বাগেরহাট", "চুয়াডাঙ্গা", "যশোর", "ঝিনাইদহ", "খুলনা", "কুষ্টিয়া", "মাগুরা", "মেহেরপুর", "নড়াইল", "সাতক্ষীরা"],
    "ঢাকা": ["ঢাকা", "ফরিদপুর", "গাজীপুর", "গোপালগঞ্জ", "কিশোরগঞ্জ", "মাদারীপুর", "মানিকগঞ্জ", "মুন্সিগঞ্জ", "নারায়ণগঞ্জ", "নরসিংদী", "রাজবাড়ী", "শরীয়তপুর", "টাঙ্গাইল"],
    "চট্টগ্রাম": ["বান্দরবান", "ব্রাহ্মণবাড়িয়া", "চাঁদপুর", "চট্টগ্রাম", "কুমিল্লা", "কক্সবাজার", "ফেনী", "খাগড়াছড়ি", "লক্ষ্মীপুর", "নোয়াখালী", "রাঙ্গামাটি"],
    "রাজশাহী": ["বগুড়া", "জয়পুরহাট", "নওগাঁ", "নাটোর", "নবাবগঞ্জ", "পাবনা", "রাজশাহী", "সিরাজগঞ্জ"],
    "রংপুর": ["দিনাজপুর", "গাইবান্ধা", "কুড়িগ্রাম", "লালমনিরহাট", "নীলফামারী", "পঞ্চগড়", "রংপুর", "ঠাকুরগাঁও"],
    "বরিশাল": ["বরগুনা", "বরিশাল", "ভোলা", "ঝালকাঠি", "পটুয়াখালী", "পিরোজপুর"],
    "সিলেট": ["হবিগঞ্জ", "মৌলভীবাজার", "সুনামগঞ্জ", "সিলেট"],
    "ময়মনসিংহ": ["ময়মনসিংহ", "নেত্রকোনা", "শেরপুর", "জামালপুর"]
};

const filterDivisionEl = document.getElementById('filterDivision');
const filterDistrictEl = document.getElementById('filterDistrict');

if (filterDivisionEl && filterDistrictEl) {
    filterDivisionEl.addEventListener('change', function() {
        const selectedDivision = this.value;
        filterDistrictEl.innerHTML = '<option value="">সব জেলা</option>';
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

function setupUIEventListeners() {
    if (menuButton && sidebar && overlay) {
        menuButton.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
        overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    }

    navButtons.forEach(btn => {
        btn.onclick = function() {
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            fetchAndDisplayProperties(this.getAttribute('data-category'), globalSearchInput?.value || '');
        };
    });

    const btnAdvancedSearch = document.getElementById('btnAdvancedSearch');
    if (btnAdvancedSearch) {
        btnAdvancedSearch.onclick = () => {
            const activeNavBtn = document.querySelector('.fb-tabs .fb-tab-btn.active');
            const category = activeNavBtn ? activeNavBtn.getAttribute('data-category') : 'বিক্রয়';
            fetchAndDisplayProperties(category, globalSearchInput?.value || '');
        };
    }
}

// অ্যাপ্লিকেশন স্টার্টআপ
document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user); 
            updateIconCounts(); 
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            if (profileImage) profileImage.style.display = 'none';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
            }
        }
    });
});
