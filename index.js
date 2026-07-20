// Firebase Global Reference
const db = firebase.firestore();
const auth = firebase.auth();

const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const navButtons = document.querySelectorAll('.fb-tabs .fb-tab-btn'); 
const propertyG = document.querySelector('.property-grid');
const globalSearchInput = document.getElementById('globalSearchInput');

// ----------------------------------------------------
// 🔵 ১. নীল রঙের "এখনই ফ্রিতে পোস্ট করুন" ব্যানার (অরিজিনাল ডিজাইন)
// ----------------------------------------------------
function createBluePostPromptHTML() {
    return `
        <div class="fb-feed-card" style="background: linear-gradient(135deg, #1877f2, #0d52b5); color: #fff; border-radius: 12px; padding: 24px 16px; margin-bottom: 16px; text-align: center; box-shadow: 0 4px 12px rgba(24, 119, 242, 0.25);">
            <span style="background: rgba(255, 255, 255, 0.2); font-size: 12px; padding: 4px 12px; border-radius: 20px; font-weight: bold; letter-spacing: 0.5px;">বিজ্ঞাপন / স্পন্সরড</span>
            <h2 style="margin: 14px 0 8px 0; font-size: 20px; font-weight: 700; line-height: 1.3;">আপনার প্রোপার্টি দ্রুত বিক্রি বা ভাড়া দিতে চান?</h2>
            <p style="margin: 0 0 18px 0; font-size: 13px; opacity: 0.95; line-height: 1.5;">আমার বাড়ি.কম-এ সরাসরি কোনো থার্ড-পার্টি কমিশন ছাড়াই হাজারও প্রকৃত ক্রেতার কাছে প্রোপার্টি পৌঁছে দিন।</p>
            <a href="post.html" style="display: inline-block; background: #ffffff; color: #1877f2; text-decoration: none; padding: 10px 24px; border-radius: 25px; font-weight: 700; font-size: 14px; box-shadow: 0 2px 6px rgba(0,0,0,0.15);">এখনই ফ্রিতে পোস্ট করুন</a>
        </div>
    `;
}

// ----------------------------------------------------
// 🖼️ ২. JPG পিকচার ব্যানার স্লাইডার (ইমেজ ভিত্তিক + (+) বাটন)
// ----------------------------------------------------
function createImageBannerSliderHTML() {
    // ডেমো ব্যানার ইমেজ লিঙ্ক (JPG)
    const banners = [
        { img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80", link: "post.html" },
        { img: "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&auto=format&fit=crop&q=80", link: "boost.html" },
        { img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&auto=format&fit=crop&q=80", link: "tips.html" }
    ];

    const slidesHTML = banners.map((item, i) => `
        <div style="min-width: 280px; width: 280px; height: 130px; border-radius: 8px; overflow: hidden; flex-shrink: 0; position: relative; border: 1px solid #ced0d4;" onclick="window.location.href='${item.link}'">
            <img src="${item.img}" style="width: 100%; height: 100%; object-fit: cover;" alt="Banner ${i+1}">
            <span style="position: absolute; bottom: 6px; right: 6px; background: rgba(0,0,0,0.6); color: #fff; font-size: 9px; padding: 2px 6px; border-radius: 4px;">বিজ্ঞাপন</span>
        </div>
    `).join('');

    return `
        <div class="fb-feed-card" style="background: #fff; padding: 12px; margin-bottom: 16px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                <span style="font-weight: 700; font-size: 13px; color: #1877f2; display: flex; align-items: center; gap: 4px;">
                    <i class="material-icons" style="font-size: 16px; color: #ff9800;">campaign</i> বিশেষ স্পন্সরড অফার
                </span>
                <span style="font-size: 11px; color: #65676b;">স্ক্রোল করুন ➔</span>
            </div>

            <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 4px; scroll-behavior: smooth; -webkit-overflow-scrolling: touch;">
                ${slidesHTML}
                
                <!-- ➕ প্লাস (+) ব্যানার এড বাটন -->
                <div style="min-width: 110px; width: 110px; height: 130px; background: #f0f2f5; border: 2px dashed #1877f2; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; flex-shrink: 0; cursor: pointer;" onclick="window.location.href='boost.html'">
                    <div style="width: 36px; height: 36px; background: #1877f2; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 4px;">
                        <i class="material-icons">add</i>
                    </div>
                    <span style="font-size: 11px; font-weight: bold; color: #1877f2;">ব্যানার অ্যাড দিন</span>
                </div>
            </div>
        </div>
    `;
}

// ----------------------------------------------------
// 🌟 ৩. বড় আকৃতির ফিচার্ড পোস্ট স্লাইডার (Large Featured Scroll)
// ----------------------------------------------------
function createLargeFeaturedPostsHTML(featuredList) {
    if (!featuredList || featuredList.length === 0) return '';
    const list = featuredList.slice(0, 5);

    const cardsHTML = list.map(item => {
        const data = item.data;
        const imgUrl = (data.images && data.images.length > 0) ? (data.images[0].url || data.images[0]) : 'https://via.placeholder.com/300x160?text=Featured+Property';
        const price = data.price || data.monthlyRent || 'আলোচনা সাপেক্ষে';
        const displayPrice = typeof price === 'number' ? new Intl.NumberFormat('bn-BD').format(price) : price;

        return `
            <div class="featured-card-item">
                <div class="featured-img-box" style="background-image: url('${imgUrl}');">
                    <span style="position: absolute; top: 8px; left: 8px; background: #ff9800; color: #fff; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">⭐ ফিচার্ড অফার</span>
                </div>
                <div style="padding: 10px;">
                    <h4 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #050505; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${data.title || 'শিরোনামহীন ফ্ল্যাট/জমি'}</h4>
                    <p style="margin: 0; font-size: 12px; color: #65676b;">📍 ${data.location?.district || 'বাংলাদেশ'}, ${data.location?.thana || ''}</p>
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                        <span style="font-size: 15px; font-weight: 800; color: #1877f2;">৳ ${displayPrice}</span>
                        <a href="details.html?id=${item.id}" style="background: #ff9800; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; text-decoration: none;">বিস্তারিত</a>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="fb-feed-card" style="background: #fffdf6; border: 1px solid #ffe082; padding: 12px; margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-weight: 700; font-size: 15px; color: #e65100; display: flex; align-items: center; gap: 4px;">
                    <i class="material-icons" style="font-size: 20px; color: #ff9800;">stars</i> ফিচার্ড প্রপার্টিসমূহ (৫টি)
                </span>
                <span style="font-size: 11px; color: #65676b;">ডানে স্লাইড করুন ➔</span>
            </div>
            <div class="featured-scroll-container">
                ${cardsHTML}
            </div>
        </div>
    `;
}

// ----------------------------------------------------
// 📱 ৪. সাধারণ/বুস্টেড পোস্ট কার্ড
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
    let displayPrice = amount ? new Intl.NumberFormat('bn-BD').format(amount) : 'আলোচনা সাপেক্ষে';

    const verifiedBadge = data.documents ? `<span class="badge-verified">✓ ভেরিফাইড</span>` : '';
    const boostedBadge = isBoosted ? `<span class="badge-boosted"><i class="material-icons" style="font-size:12px;">bolt</i> স্পন্সরড</span>` : '';

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
        <div class="fb-feed-card ${isBoosted ? 'boosted-card' : ''}">
            <div class="card-author-header">
                <div class="author-info">
                    <img id="author-pic-${docId}" src="https://via.placeholder.com/40?text=Pic" class="fb-profile-pic" alt="pic">
                    <div class="author-meta">
                        <h4 id="author-name-${docId}">আমার বাড়ি ইউজার</h4>
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
                <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700;">${title}</h3>
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
// 🚀 ৫. মাস্টার নিউজ ফিড সিকোয়েন্স লজিক
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
        snap.forEach(doc => allDocs.push({ id: doc.id, data: doc.data() }));

        if (allDocs.length === 0) {
            propertyG.innerHTML = '<p style="text-align:center; padding:40px; color:#65676b;">কোনো পোস্ট পাওয়া যায়নি।</p>';
            return;
        }

        let boostedList = allDocs.filter(item => item.data.isBoosted === true);
        let normalList = allDocs.filter(item => item.data.isBoosted !== true);
        let featuredList = allDocs.slice(0, 5); // ডেমো ৫টি ফিচার্ড

        // 🟢 সিকোয়েন্স ১: সর্বপ্রথমে ১বার "এখনই ফ্রিতে পোস্ট করুন" নীল কার্ড
        propertyG.insertAdjacentHTML('beforeend', createBluePostPromptHTML());

        // 🖼️ সিকোয়েন্স ২: ৩টি JPG ব্যানার স্লাইডার + (+) বাটন
        propertyG.insertAdjacentHTML('beforeend', createImageBannerSliderHTML());

        let normalIdx = 0;
        let boostedIdx = 0;

        // 📱 সিকোয়েন্স ৩: ২টি সাধারণ পোস্ট
        for (let i = 0; i < 2 && normalIdx < normalList.length; i++, normalIdx++) {
            const item = normalList[normalIdx];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(item.id, item.data));
            loadPostAuthorDetails(item.id, item.data.userId);
        }

        // 🌟 সিকোয়েন্স ৪: ৫টি ফিচার্ড পোস্ট (বড় সাইজ ও স্ক্রোলিং)
        propertyG.insertAdjacentHTML('beforeend', createLargeFeaturedPostsHTML(featuredList));

        // 📱 সিকোয়েন্স ৫: আরও ২টি সাধারণ পোস্ট
        for (let i = 0; i < 2 && normalIdx < normalList.length; i++, normalIdx++) {
            const item = normalList[normalIdx];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(item.id, item.data));
            loadPostAuthorDetails(item.id, item.data.userId);
        }

        // ⚡ সিকোয়েন্স ৬: ১ম বুস্টেড পোস্ট (১টি দেখাবে)
        if (boostedList.length > 0 && boostedIdx < boostedList.length) {
            const bItem = boostedList[boostedIdx++];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(bItem.id, bItem.data));
            loadPostAuthorDetails(bItem.id, bItem.data.userId);
        }

        // 🔄 সিকোয়েন্স ৭: প্রতি ৪টি সাধারণ পোস্টের পর ঠিক ১টি বুস্টেড পোস্ট
        let countNormal = 0;
        while (normalIdx < normalList.length) {
            const item = normalList[normalIdx++];
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(item.id, item.data));
            loadPostAuthorDetails(item.id, item.data.userId);
            countNormal++;

            if (countNormal % 4 === 0) {
                if (boostedIdx < boostedList.length) {
                    const bItem = boostedList[boostedIdx++];
                    propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(bItem.id, bItem.data));
                    loadPostAuthorDetails(bItem.id, bItem.data.userId);
                }
            }
        }

        setupSliderAndLikeLogic();

    } catch (error) {
        console.error("ত্রুটি:", error);
        propertyG.innerHTML = '<p style="text-align:center; padding:20px; color:red;">ফিড লোড করতে সমস্যা হয়েছে।</p>';
    }
}

// সাপোর্ট ফাংশনস
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
}

document.addEventListener('DOMContentLoaded', () => {
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

    fetchAndDisplayProperties('বিক্রয়', ''); 
});
