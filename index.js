// Firebase Config Initialization (আগের কনফিগ অনুযায়ী সেটআপ করা)
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');
const postCount = document.getElementById('post-count'); 

const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');

let map;

// --- সব পেজের হেডারে প্রোফাইল ইমেজ লোড করার ফাংশন ---
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
        } catch (error) {
            console.error("হেডারে প্রোফাইল ছবি লোড করতে ব্যর্থ:", error);
        }
    }
}

// --- আইকন কাউন্টার আপডেট করার ফাংশন ---
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

// --- লগআউট হ্যান্ডলার ---
function handleLogout(e) {
    e.preventDefault();
    auth.signOut().then(() => {
        alert('সফলভাবে লগআউট হয়েছে!');
        window.location.reload();
    });
}

// --- কাস্টমাইজড কালার-কোডেড ম্যাপ পিন (বিক্রয়=লাল, ভাড়া=সবুজ) ---
function createCustomMarker(category, type) {
    // বিক্রয় পোস্ট লাল রঙ্গের, ভাড়া পোস্ট সবুজ রঙ্গের
    const color = category === 'বিক্রয়' ? '#ff4d4d' : '#42b72a';
    return L.divIcon({
        html: `<div style="background:${color}; color:#fff; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:bold; border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,0.3); white-space: nowrap;">${type}</div>`,
        className: 'fb-pin',
        iconSize: [65, 28]
    });
}

// --- ম্যাপ ইনিশিয়েলাইজেশন ফাংশন (সব পোস্ট একই সাথে ভিন্ন কালারে পিন দেখাবে) ---
async function initMap() {
    const mapSection = document.getElementById('map-section');
    if (!mapSection || mapSection.style.display === 'none') return;

    if (map) map.remove();
    
    // খুলনা জোন কেন্দ্রবিন্দু করে ম্যাপ সেটআপ
    map = L.map('map-container').setView([22.8456, 89.5403], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    try {
        const snap = await db.collection('properties').where('status', '==', 'published').get();

        snap.forEach(doc => {
            const data = doc.data();
            if (data.location && data.location.lat && data.location.lng) {
                const marker = L.marker([data.location.lat, data.location.lng], {
                    icon: createCustomMarker(data.category, data.type || 'বাসা')
                }).addTo(map);
                
                let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
                let displayPrice = amount ? new Intl.NumberFormat('bn-BD').format(amount) : 'আলোচনা সাপেক্ষে';

                // পিন ক্লিকে ডিটেইলস পেইজে রিডাইরেক্ট ব্যবস্থা সহ পপআপ
                marker.bindPopup(`
                    <div style="font-family:'Hind Siliguri', sans-serif; text-align:center; min-width:140px;">
                        <b style="font-size:14px; color:#1877f2;">${data.title || 'শিরোনামহীন'}</b><br>
                        মূল্য: ৳ ${displayPrice}<br>
                        <a href="details.html?id=${doc.id}" style="display:inline-block; margin-top:8px; background:#1877f2; color:#fff; padding:4px 10px; text-decoration:none; border-radius:6px; font-size:12px; font-weight:bold; width:80%;">পোস্টে যান</a>
                    </div>
                `);
            }
        });
    } catch (err) {
        console.error("ম্যাপে ডাটা পিন লোড করতে সমস্যা:", err);
    }
}

// --- স্লাইডার এবং ইন্টারেক্টিভ লাইক বাটনের লজিক ---
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

// --- 🎯 প্রোপার্টি কার্ড মেকার (ছবি বা নামে ক্লিক করলে প্রোফাইল পেইজে লিংক করবে) ---
function createFbPostHTML(docId, data) {
    const title = data.title || 'শিরোনামহীন প্রোপার্টি';
    const village = data.location?.village || "তথ্য নেই";
    const thana = data.location?.thana || "তথ্য নেই";
    const district = data.location?.district || "তথ্য নেই";
    
    const size = data.landArea || data.houseArea || data.areaSqft || data.commercialArea || '০';
    const unit = data.landAreaUnit || data.houseAreaUnit || data.areaSqftUnit || data.commercialAreaUnit || '';
    
    const type = data.type || 'প্রপার্টি';
    const category = data.category || 'বিক্রয়';
    
    let amount = category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let priceUnit = data.priceUnit || data.rentUnit || ""; 
    let displayPrice = amount ? new Intl.NumberFormat('bn-BD').format(amount) : 'আলোচনা সাপেক্ষে';

    const hasDocs = data.documents && (data.documents.khotian || data.documents.sketch);
    const verifiedBadge = hasDocs ? `<span class="badge-verified" style="background:#42b72a; color:white; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold; margin-right:5px;">✓ কাগজ ভেরিফাইড</span>` : '';

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

    // প্রোফাইল পেজের কাস্টম ডাইনামিক ইউআরএল জেনারেশন লিংক (data.userId পাস করা হচ্ছে)
    const authorProfileUrl = data.userId ? `profile.html?uid=${data.userId}` : `#`;

    return `
        <div class="fb-feed-card" style="background:#fff; border:1px solid #ced0d4; border-radius:8px; margin-bottom:16px; box-shadow:0 1px 2px rgba(0,0,0,0.05); display:flex; flex-direction:column;">
            
            <div class="card-author-header" style="padding:12px; display:flex; align-items:center; justify-content:space-between;">
                <div class="author-info" style="display:flex; align-items:center; gap:10px;">
                    <a href="${authorProfileUrl}" style="display:block; text-decoration:none;">
                        <img id="author-pic-${docId}" src="https://via.placeholder.com/40?text=Pic" class="author-avatar-img" style="width:40px; height:40px; border-radius:50%; object-fit:cover; border:1px solid #ced0d4;" alt="pic">
                    </a>
                    <div class="author-meta">
                        <a href="${authorProfileUrl}" style="text-decoration:none; hover:underline;">
                            <h4 id="author-name-${docId}" style="margin:0; font-size:15px; font-weight:600; color:#1877f2;">আমার বাড়ি ইউজার</h4>
                        </a>
                        <p style="margin:2px 0 0 0; font-size:12px; color:#65676b; display:flex; align-items:center; gap:4px;">
                            <i class="material-icons" style="font-size:12px;">place</i> ${village}, ${thana}, ${district}
                        </p>
                    </div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${verifiedBadge}
                    <span class="badge-category" style="background:${category === 'বিক্রয়' ? '#ff4d4d' : '#42b72a'}; color:white; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">${category}</span>
                </div>
            </div>
            
            <div class="card-body-text" style="padding:0 12px 12px 12px; font-size:14px; line-height:1.5; color:#050505;">
                <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700; color: #050505;">${title}</h3>
                <div style="margin-top:4px; color:#050505;">
                    <b>${size} ${unit}, ${type}, ${category}।</b> বিস্তারিত জানতে ও সরাসরি যোগাযোগ করতে নিচে দেয়া বাটনে ক্লিক করুন।
                </div>
            </div>

            <div class="card-media-section" style="position:relative; height:280px; background:#000; overflow:hidden;">
                <div class="fb-slider" data-current-index="0" data-total-slides="${images.length}" style="width:100%; height:100%; position:relative;">
                    ${mediaHTML}
                    ${navArrows}
                </div>
                <div class="price-tag-overlay" style="position:absolute; bottom:12px; right:12px; background:rgba(0,0,0,0.75); color:#fff; padding:6px 12px; border-radius:6px; font-weight:bold; font-size:16px; z-index:4;">
                    ৳ ${displayPrice} ${priceUnit ? `(${priceUnit})` : ''}
                </div>
            </div>

            <div class="fb-stats-bar" style="padding:10px 12px; display:flex; justify-content:space-between; font-size:13px; color:#65676b; border-bottom:1px solid #f2f3f5;">
                <div class="fb-reactions" style="display:flex; align-items:center; gap:4px;">
                    <i class="material-icons" style="background:#1877f2; color:white; border-radius:50%; font-size:12px; padding:3px;">thumb_up</i>
                    <span class="likes-num">${data.likes || 0} জন পছন্দ করেছেন</span>
                </div>
                <div>৫টি কমেন্ট</div>
            </div>

            <div class="fb-action-buttons" style="display:flex; padding:4px; border-top:1px solid #f2f3f5;">
                <button class="fb-action-btn like-btn-toggle" style="flex:1; padding:10px; border:none; background:none; cursor:pointer; font-family:inherit; font-size:14px; font-weight:600; color:#65676b; display:flex; align-items:center; justify-content:center; gap:6px; border-radius:4px;"><i class="material-icons">thumb_up_off_alt</i> লাইক</button>
                <a href="details.html?id=${docId}" class="fb-action-btn" style="flex:1; padding:10px; border:none; background:none; cursor:pointer; font-family:inherit; font-size:14px; font-weight:700; color:#ff4d4d; display:flex; align-items:center; justify-content:center; gap:6px; border-radius:4px; text-decoration:none;">
                    <i class="material-icons">double_arrow</i> বিস্তারিত ও যোগাযোগ
                </a>
            </div>
        </div>
    `;
}

// --- ব্যাকগ্রাউন্ডে বিক্রেতার রিয়েল-টাইম ডাটা পুশ ফাংশন ---
function loadPostAuthorDetails(docId, userId) {
    if (!userId) return;
    db.collection('users').doc(userId).get().then(userDoc => {
        if (userDoc.exists) {
            const userData = userDoc.data();
            const nameEl = document.getElementById(`author-name-${docId}`);
            const picEl = document.getElementById(`author-pic-${docId}`);
            if (nameEl) nameEl.textContent = userData.fullName || userData.name || "সম্মানিত গ্রাহক";
            if (picEl && userData.profilePic) picEl.src = userData.profilePic;
        }
    }).catch(err => console.error(err));
}

// --- 🌟 ৩ ঘরের কাস্টম সার্চ এবং ডাইনামিক ফিল্টার ইমপ্লিমেন্টেশন মেইন ইঞ্জিন 🌟 ---
async function fetchAndDisplayProperties() {
    if (!propertyG) return;
    propertyG.innerHTML = '<p style="text-align:center; padding:20px; color:#65676b;">নিউজ ফিড আপডেট হচ্ছে...</p>';
    
    // সার্চ ইনপুট রিড করা
    const categoryInp = document.getElementById('searchCategory')?.value; // ঘর ১
    const typeInp = document.getElementById('searchType')?.value;         // ঘর ২
    const areaInp = document.getElementById('searchArea')?.value.toLowerCase().trim(); // ঘর ৩ (গ্রাম/থানা/জেলা)

    try {
        let queryRef = db.collection('properties').where('status', '==', 'published');

        // ঘর ১ অনুযায়ী বেসিক ফায়ারস্টোর ফিল্টারিং স্পিড বাড়ানোর জন্য
        if (categoryInp) {
            queryRef = queryRef.where('category', '==', categoryInp);
        }

        const snap = await queryRef.get();
        propertyG.innerHTML = ''; 
        let hasPost = false;

        snap.forEach(doc => {
            const data = doc.data();

            // ঘর ২ ফিল্টার ম্যাচিং (টাইপ ম্যাচিং)
            if (typeInp && data.type !== typeInp) return;

            // ঘর ৩ ফিল্টার ম্যাচিং (village, thana, district যেকোনো একটি মিললেই হবে)
            if (areaInp) {
                const village = (data.location?.village || "").toLowerCase();
                const thana = (data.location?.thana || "").toLowerCase();
                const district = (data.location?.district || "").toLowerCase();
                
                if (!village.includes(areaInp) && !thana.includes(areaInp) && !district.includes(areaInp)) {
                    return; // যদি ৩টির একটিও ম্যাচ না করে তবে বাদ যাবে
                }
            }

            hasPost = true;
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(doc.id, data));
            loadPostAuthorDetails(doc.id, data.userId);
        });

        if (!hasPost) {
            propertyG.innerHTML = '<p style="text-align:center; padding:40px; color:#65676b;">আপনার কাঙ্ক্ষিত ফিল্টারের সাথে মিলে এমন কোনো পোস্ট পাওয়া যায়নি।</p>';
        } else {
            setupSliderAndLikeLogic();
        }
    } catch (error) {
        console.error("ফিল্টার ডাটা লোড করতে ব্যর্থ:", error);
        propertyG.innerHTML = '<p style="text-align:center; padding:20px; color:red;">ফিড লোড করতে সমস্যা হয়েছে।</p>';
    }
}

// --- ইউজার ইন্টারফেস ইভেন্ট লিসেনারস রেডি করার ফাংশন ---
function setupUIEventListeners() {
    if (menuButton && sidebar && overlay) {
        menuButton.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
        overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    }

    // সার্চবারের ১ম ঘরের উপর ভিত্তি করে ২য় ঘরের ডাইনামিক ফিল্টার কনফিগারেশন চেঞ্জ
    const searchCategory = document.getElementById('searchCategory');
    if (searchCategory) {
        searchCategory.addEventListener('change', function() {
            fetchAndDisplayProperties();
        });
    }

    document.getElementById('searchType')?.addEventListener('change', fetchAndDisplayProperties);

    // ৩ নম্বর ঘরে টাইপ করলেই রিয়েল-টাইম ম্যাচিং ইঞ্জিন কল হবে
    document.getElementById('searchArea')?.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') fetchAndDisplayProperties();
    });

    // সার্চ বাটন ক্লিক ট্রিপল ফিল্টার অ্যাকশন
    document.getElementById('btnAdvancedSearch').onclick = () => {
        fetchAndDisplayProperties();
    };

    // ট্যাব সুইচার বাটনসমূহ (ক্লিক করলে সার্চবারের প্রথম ঘর আপডেট হয়ে স্বয়ংক্রিয় সার্চ হবে)
    navButtons.forEach(btn => {
        btn.onclick = function() {
            navButtons.forEach(b => b.classList.remove('active'));
            document.getElementById('mapViewToggleBtn')?.classList.remove('active');
            this.classList.add('active');
            
            document.getElementById('property-grid-container').style.display = 'block';
            document.getElementById('map-section').style.display = 'none';

            const targetCategory = this.getAttribute('data-category');
            if (searchCategory) searchCategory.value = targetCategory;

            fetchAndDisplayProperties();
        };
    });

    // ম্যাপ ভিউ বাটন টগল অ্যাকশন
    const mapViewToggleBtn = document.getElementById('mapViewToggleBtn');
    if (mapViewToggleBtn) {
        mapViewToggleBtn.onclick = function() {
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.getElementById('property-grid-container').style.display = 'none';
            document.getElementById('map-section').style.display = 'block';
            
            initMap();
        };
    }
}

// --- DOMContentLoaded অ্যাপ্লিকেশন বুটস্ট্র্যাপ রানার ---
document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    fetchAndDisplayProperties(); 
    
    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user); 
            updateIconCounts(); 
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        }
    });
});
