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

// কাউন্টারস
const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');

// 🎯 সংশোধন: HTML ফাইলের সঠিক ক্লাস সিলেক্টর ম্যাপিং (.fb-tabs .fb-tab-btn)
const navButtons = document.querySelectorAll('.fb-tabs .fb-tab-btn:not(#mapViewToggleBtn)'); 
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');
const globalSearchInput = document.getElementById('globalSearchInput');

let map;

// প্রোফাইল পিকচার লোডার
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
            console.error("প্রোফাইল ছবি লোড ত্রুটি:", error);
            profileImage.style.display = 'none';
            defaultProfileIcon.style.display = 'block';
        }
    }
}

// আইকন কাউন্টার আপডেট
async function updateIconCounts() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        const notifSnap = await db.collection('notifications').where('userId', '==', user.uid).where('read', '==', false).get();
        if (notificationCount) {
            if (!notifSnap.empty) {
                notificationCount.textContent = notifSnap.size;
                notificationCount.style.display = 'inline-block';
            } else {
                notificationCount.style.display = 'none';
            }
        }

        const msgSnap = await db.collection('messages').where('receiverId', '==', user.uid).where('read', '==', false).get();
        if (messageCount) {
            if (!msgSnap.empty) {
                messageCount.textContent = msgSnap.size;
                messageCount.style.display = 'inline-block';
            } else {
                messageCount.style.display = 'none';
            }
        }
    } catch (error) {
        console.error("কাউন্টার আপডেট ত্রুটি:", error);
    }
}

// লগআউট হ্যান্ডলার
function handleLogout(e) {
    e.preventDefault();
    auth.signOut().then(() => {
        alert('সফলভাবে লগআউট হয়েছে!');
        window.location.reload();
    }).catch(err => {
        console.error('লগআউট ত্রুটি:', err);
    });
}

// কাস্টম ম্যাপ পিন
function createCustomMarker(category, type) {
    const color = category === 'বিক্রয়' ? '#1877f2' : '#42b72a';
    return L.divIcon({
        html: `<div style="background:${color}; color:#fff; padding:4px 8px; border-radius:12px; font-size:12px; font-weight:bold; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.2); white-space: nowrap;">${type}</div>`,
        className: 'fb-pin',
        iconSize: [65, 28]
    });
}

// ম্যাপ ইনিশিয়েলাইজেশন
async function initMap(category) {
    const mapSection = document.getElementById('map-section');
    if (!mapSection || mapSection.style.display === 'none') return;

    if (map) { map.remove(); }
    
    map = L.map('map-container').setView([22.8456, 89.5403], 12);
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
                const marker = L.marker([data.location.lat, data.location.lng], {
                    icon: createCustomMarker(data.category, data.type || 'বাসা')
                }).addTo(map);
                
                let pAmt = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
                let displayPrice = pAmt ? new Intl.NumberFormat('bn-BD').format(pAmt) : 'আলোচনা সাপেক্ষে';

                marker.bindPopup(`
                    <div style="font-family:'Hind Siliguri', sans-serif;">
                        <b style="font-size:14px; color:#1877f2;">${data.title || 'শিরোনামহীন'}</b><br>
                        মূল্য: ৳ ${displayPrice}<br>
                        <a href="details.html?id=${doc.id}" style="display:inline-block; margin-top:6px; background:#1877f2; color:#fff; padding:3px 8px; text-decoration:none; border-radius:4px; font-size:11px;">পোস্টে যান</a>
                    </div>
                `);
            }
        });
    } catch (err) {
        console.error("ম্যাপ ডেটা লোড ত্রুটি:", err);
    }
}

// স্লাইডার ও লাইক লজিক
function setupSliderAndLikeLogic() {
    document.querySelectorAll('.fb-slider-btn').forEach(button => {
        button.onclick = function(e) {
            e.preventDefault(); 
            e.stopPropagation();
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

    document.querySelectorAll('.like-btn-toggle').forEach(btn => {
        btn.onclick = function(e) {
            e.preventDefault(); 
            e.stopPropagation();
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

// ফেসবুক পোস্ট কার্ড মেকার (HTML জেনারেটর)
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
        mediaHTML = images.map((img, i) => `
            <div class="fb-slide-item" style="background-image: url('${img}'); display:${i === 0 ? 'block' : 'none'}; width:100%; height:100%; background-size:cover; background-position:center;"></div>
        `).join('');
    }

    const navArrows = images.length > 1 ? `
        <button class="fb-slider-btn fb-prev" style="position: absolute; top: 50%; left: 12px; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; z-index: 5;">&#10094;</button>
        <button class="fb-slider-btn fb-next" style="position: absolute; top: 50%; right: 12px; transform: translateY(-50%); background: rgba(0,0,0,0.5); color: white; border: none; width: 36px; height: 36px; border-radius: 50%; cursor: pointer; z-index: 5;">&#10095;</button>
    ` : '';

    return `
        <div class="fb-feed-card" style="background:#fff; border:1px solid #ced0d4; border-radius:8px; margin-bottom:16px; box-shadow:0 1px 2px rgba(0,0,0,0.05); display:flex; flex-direction:column; font-family:'Hind Siliguri', sans-serif;">
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
                    ${verifiedBadge}
                    <span class="badge-category" style="background:#1877f2; color:white; padding:2px 6px; border-radius:4px; font-size:11px; font-weight:bold;">${category}</span>
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
                    ৳ ${displayPrice} ${priceUnit ? `(${priceUnit})` : ''} ${category === 'ভাড়া' ? '/মাস' : ''}
                </div>
            </div>

            <div class="fb-stats-bar" style="padding:10px 12px; display:flex; justify-content:space-between; font-size:13px; color:#65676b; border-bottom:1px solid #f2f3f5;">
                <div class="fb-reactions" style="display:flex; align-items:center; gap:4px;">
                    <i class="material-icons" style="background:#1877f2; color:white; border-radius:50%; font-size:12px; padding:3px;">thumb_up</i>
                    <span class="likes-num"><span class="like-count">${data.likes || 0}</span> জন পছন্দ করেছেন</span>
                </div>
                <div>কমেন্ট দেখুন</div>
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

// প্রোপার্টি আপলোড দাতার ছবি ও নাম লোডার
function loadPostAuthorDetails(docId, userId) {
    if (!userId) return;
    db.collection('users').doc(userId).get().then(userDoc => {
        if (userDoc.exists) {
            const userData = userDoc.data();
            const nameEl = document.getElementById(`author-name-${docId}`);
            const picEl = document.getElementById(`author-pic-${docId}`);
            
            if (nameEl) nameEl.textContent = userData.fullName || userData.name || "সম্মানিত বিক্রেতা";
            if (picEl && userData.profilePic) {
                picEl.src = userData.profilePic;
            }
        }
    }).catch(err => console.error("ইউজার কার্ড ডাটা লোড ত্রুটি:", err));
}

// সংশোধিত ডাটাবেজ ফেচ এবং কাস্টম সার্চ ইঞ্জিন মেকানিজম
async function fetchAndDisplayProperties(category, searchFilter = '') {
    if (!propertyG) return;
    propertyG.innerHTML = '<p style="text-align:center; padding:20px; color:#65676b; font-family:inherit;">নিউজ ফিড রিফ্রেশ হচ্ছে...</p>';
    
    try {
        let snap = await db.collection('properties')
            .where('category', '==', category)
            .where('status', '==', 'published')
            .get();
            
        propertyG.innerHTML = '';
        let hasPost = false;
        
        // নতুন ইনপুট ফিল্ডগুলোর ভ্যালু রিড করা
        const filterType = document.getElementById('filterType')?.value;
        const filterDistrict = document.getElementById('filterDistrict')?.value; // জেলা ফিল্টার
        const formattedSearch = searchFilter.toLowerCase().trim();

        snap.forEach(doc => {
            const data = doc.data();
            
            // ১. আবাসনের ধরন চেক (বাড়ি, জমি, প্লট, ফ্ল্যাট, অফিস, দোকান)
            if (filterType && data.type !== filterType) return;
            
            // ২. জেলা চেক (ডাটাবেজের location.district ফিল্ডের সাথে মিলানো হচ্ছে)
            if (filterDistrict && data.location?.district !== filterDistrict) return;
            
            // ৩. এলাকা সার্চ (থানা, গ্রাম বা রোড এবং টাইটেল চেক)
            if (formattedSearch) {
                const titleMatch = data.title?.toLowerCase().includes(formattedSearch);
                const villageMatch = data.location?.village?.toLowerCase().includes(formattedSearch);
                const thanaMatch = data.location?.thana?.toLowerCase().includes(formattedSearch);
                const roadMatch = data.location?.road?.toLowerCase().includes(formattedSearch); // যদি রোড ফিল্ড থাকে
                
                // কোনোটির সাথে না মিললে এই পোস্টটি স্কিপ করবে
                if (!titleMatch && !villageMatch && !thanaMatch && !roadMatch) return;
            }

            hasPost = true;
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(doc.id, data));
            loadPostAuthorDetails(doc.id, data.userId);
        });

        if (!hasPost) {
            propertyG.innerHTML = '<p style="text-align:center; padding:40px; color:#65676b;">আপনার সার্চ অনুযায়ী এই মুহূর্তে কোনো পোস্ট পাওয়া যায়নি।</p>';
        } else {
            setupSliderAndLikeLogic();
        }
    } catch (error) {
        console.error("প্রোপার্টি ডেটা ফেচ ত্রুটি:", error);
        propertyG.innerHTML = '<p style="text-align:center; padding:20px; color:red;">ফিড লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।</p>';
    }
}

// ইভেন্ট লিসেনার সেটআপ
function setupUIEventListeners() {
    if (menuButton && sidebar && overlay) {
        menuButton.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
        overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    }

    // 🎯 সংশোধন: সঠিক ক্লাস ফিল্টারিং অনুযায়ী লুপ সেটআপ
    navButtons.forEach(btn => {
        btn.onclick = function() {
            navButtons.forEach(b => b.classList.remove('active'));
            const mapViewToggleBtn = document.getElementById('mapViewToggleBtn');
            if (mapViewToggleBtn) mapViewToggleBtn.classList.remove('active');
            
            this.classList.add('active');
            
            const gridContainer = document.getElementById('property-grid-container');
            const mapSection = document.getElementById('map-section');
            if (gridContainer) gridContainer.style.display = 'block';
            if (mapSection) mapSection.style.display = 'none';
            
            fetchAndDisplayProperties(this.getAttribute('data-category'), globalSearchInput?.value || '');
        };
    });

    const mapViewToggleBtn = document.getElementById('mapViewToggleBtn');
    if (mapViewToggleBtn) {
        mapViewToggleBtn.onclick = function() {
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            const gridContainer = document.getElementById('property-grid-container');
            const mapSection = document.getElementById('map-section');
            if (gridContainer) gridContainer.style.display = 'none';
            if (mapSection) mapSection.style.display = 'block';
            
            // 🎯 সংশোধন: ক্যাটগরি চেক করার জন্য ডাইনামিক ক্লাস রিড করা
            const activeNavButton = document.querySelector('.fb-tabs .fb-tab-btn.active:not(#mapViewToggleBtn)');
            const currentCat = activeNavButton ? activeNavButton.getAttribute('data-category') : 'বিক্রয়';
            initMap(currentCat);
        };
    }

    const btnAdvancedSearch = document.getElementById('btnAdvancedSearch');
    if (btnAdvancedSearch) {
        btnAdvancedSearch.onclick = () => {
            const activeNavButton = document.querySelector('.fb-tabs .fb-tab-btn.active:not(#mapViewToggleBtn)');
            const category = activeNavButton ? activeNavButton.getAttribute('data-category') : 'বিক্রয়';
            fetchAndDisplayProperties(category, globalSearchInput?.value || '');
        };
    }

    if (globalSearchInput) {
        globalSearchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const activeNavButton = document.querySelector('.fb-tabs .fb-tab-btn.active:not(#mapViewToggleBtn)');
                const category = activeNavButton ? activeNavButton.getAttribute('data-category') : 'বিক্রয়';
                fetchAndDisplayProperties(category, globalSearchInput.value);
            }
        });
    }
}

// অ্যাপ্লিকেশন রানিং সোর্স
document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user); 
            updateIconCounts(); 
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            if (profileImage) profileImage.style.display = 'none';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
            if (notificationCount) notificationCount.style.display = 'none';
            if (messageCount) messageCount.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });
});
