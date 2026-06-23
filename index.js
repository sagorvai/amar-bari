const db = firebase.firestore();
const auth = firebase.auth();

// UI Elements
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

// বাংলাদেশের বিভাগ অনুযায়ী জেলার ম্যাপিং তালিকা
const bdDistricts = {
    "খুলনা": ["বাগেরহাট", "চুয়াডাঙ্গা", "যশোর", "ঝিনাইদহ", "খুলনা", "কুষ্টিয়া", "মাগুরা", "মেহেরপুর", "নড়াইল", "সাতক্ষীরা"],
    "ঢাকা": ["ঢাকা", "ফریدপুর", "গাজীপুর", "গোপালগঞ্জ", "কিশোরগঞ্জ", "মাদারীপুর", "মানিকগঞ্জ", "মুন্সিগঞ্জ", "নারায়ণগঞ্জ", "নরসিংদী", "রাজবাড়ী", "শরীয়তপুর", "টাঙ্গাইল"],
    "চট্টগ্রাম": ["বান্দরবান", "ব্রাহ্মণবাড়িয়া", "চাঁদপুর", "চট্টগ্রাম", "কুমিল্লা", "কক্সবাজার", "ফেনী", "খাগড়াছড়ি", "লক্ষ্মীপুর", "নোয়াখালী", "রাঙ্গামাটি"],
    "রাজশাহী": ["বগুড়া", "জয়পুরহাট", "নওগাঁ", "নাটোর", "নবাবগঞ্জ", "পাবনা", "রাজশাহী", "সিরাজগঞ্জ"],
    "রংপুর": ["দিনাজপুর", "গাইবান্ধা", "কুড়িগ্রাম", "লালমনিরহাট", "নীলфামারী", "পঞ্চগড়", "রংপুর", "ঠাকুরগাঁও"],
    "বরিশাল": ["বরগুনা", "বরিশাল", "ভোলা", "ঝালকাঠি", "পটুয়াখালী", "পিরোজপুর"],
    "সিলেট": ["হবিগঞ্জ", "মৌলভীবাজার", "সুনামগঞ্জ", "সিলেট"],
    "ময়মনসিংহ": ["ময়মনসিংহ", "নেত্রকোনা", "শেরপুর", "জামালপুর"]
};

// ডাইনামিক জেলা ড্রপডাউন হ্যান্ডলার লোডার
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

// প্রোফাইল পিকচার লোডার
async function loadProfilePicture(user) {
    if (profileImage && defaultProfileIcon) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists && doc.data().profilePic) {
                profileImage.src = doc.data().profilePic;
                if(profileImageWrapper) profileImageWrapper.style.display = 'block';
                defaultProfileIcon.style.display = 'none';
            } else {
                if(profileImageWrapper) profileImageWrapper.style.display = 'none';
                defaultProfileIcon.style.display = 'block';
            }
        } catch (error) {
            console.error("প্রোফাইল ছবি লোড ত্রুটি:", error);
        }
    }
}

// কাউন্টার আপডেট
async function updateIconCounts() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const notifSnap = await db.collection('notifications').where('userId', '==', user.uid).where('read', '==', false).get();
        if (notificationCount) {
            notificationCount.textContent = notifSnap.size;
            notificationCount.style.display = notifSnap.empty ? 'none' : 'inline-block';
        }
        const msgSnap = await db.collection('messages').where('receiverId', '==', user.uid).where('read', '==', false).get();
        if (messageCount) {
            messageCount.textContent = msgSnap.size;
            messageCount.style.display = msgSnap.empty ? 'none' : 'inline-block';
        }
    } catch (error) { console.error(error); }
}

function handleLogout(e) {
    e.preventDefault();
    auth.signOut().then(() => { window.location.reload(); });
}

// 🎯 ম্যাজিক মাল্টি-ফিল্টার সার্চ ইঞ্জিন লজিক (যা গ্রাহক সার্চ করুক, মিলবেই)
async function fetchAndDisplayProperties(category, searchFilter = '') {
    if (!propertyG) return;
    propertyG.innerHTML = '<p style="text-align:center; padding:20px; color:#65676b;">নিউজ ফিড রিফ্রেশ হচ্ছে...</p>';
    
    try {
        let snap = await db.collection('properties')
            .where('category', '==', category)
            .where('status', '==', 'published')
            .get();
            
        propertyG.innerHTML = '';
        let hasPost = false;
        
        // ৪টি ইনপুট ফিল্ডের ইনস্ট্যান্ট ভ্যালু নেওয়া হচ্ছে
        const filterType = document.getElementById('filterType')?.value;
        const filterDivision = document.getElementById('filterDivision')?.value;
        const filterDistrict = document.getElementById('filterDistrict')?.value;
        const formattedSearch = searchFilter.toLowerCase().trim();

        snap.forEach(doc => {
            const data = doc.data();
            
            // ১. শুধু ধরন পূরণ করলে ম্যাচ করবে (ফাঁকা থাকলে স্কিপ করবে না)
            if (filterType && data.type !== filterType) return;
            
            // ২. শুধু বিভাগ পূরণ করলে ম্যাচ করবে
            if (filterDivision && data.location?.division !== filterDivision) return;
            
            // ৩. শুধু জেলা পূরণ করলে ম্যাচ করবে
            if (filterDistrict && data.location?.district !== filterDistrict) return;
            
            // ৪. শুধু এলাকা বা টেক্সট বক্স পূরণ করলে ম্যাচ করবে
            if (formattedSearch) {
                const titleMatch = data.title?.toLowerCase().includes(formattedSearch);
                const villageMatch = data.location?.village?.toLowerCase().includes(formattedSearch);
                const thanaMatch = data.location?.thana?.toLowerCase().includes(formattedSearch);
                const roadMatch = data.location?.road?.toLowerCase().includes(formattedSearch);
                const districtTextMatch = data.location?.district?.toLowerCase().includes(formattedSearch);
                
                // যদি কোনো টেক্সটের সাথেই ম্যাচ না করে, তবেই এটি হাইড হবে
                if (!titleMatch && !villageMatch && !thanaMatch && !roadMatch && !districtTextMatch) return;
            }

            hasPost = true;
            propertyG.insertAdjacentHTML('beforeend', createFbPostHTML(doc.id, data));
            loadPostAuthorDetails(doc.id, data.userId);
        });

        if (!hasPost) {
            propertyG.innerHTML = '<p style="text-align:center; padding:40px; color:#65676b;">আপনার নির্বাচিত ফিল্টার অনুযায়ী কোনো পোস্ট পাওয়া যায়নি।</p>';
        } else {
            setupSliderAndLikeLogic();
        }
    } catch (error) {
        console.error("ডেটা ফেচ ত্রুটি:", error);
        propertyG.innerHTML = '<p style="text-align:center; padding:20px; color:red;">ফিড লোড করা যায়নি।</p>';
    }
}

// ফেসবুক স্টাইল পোস্ট মেকার
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
    const verifiedBadge = hasDocs ? `<span class="badge-verified">✓ কাগজ ভেরিফাইড</span>` : '';

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
        <div class="fb-feed-card">
            <div class="card-author-header">
                <div class="author-info">
                    <img id="author-pic-${docId}" src="https://via.placeholder.com/40?text=Pic" class="author-avatar-img" alt="pic">
                    <div class="author-meta">
                        <h4 id="author-name-${docId}">আমার বাড়ি ইউজার</h4>
                        <p><i class="material-icons" style="font-size:12px;">place</i> ${village}, ${thana}, ${district}</p>
                    </div>
                </div>
                <div style="display:flex; gap:6px; align-items:center;">
                    ${verifiedBadge}
                    <span class="badge-category">${category}</span>
                </div>
            </div>
            
            <div class="card-body-text">
                <h3 style="margin: 0 0 6px 0; font-size: 16px; font-weight: 700;">${title}</h3>
                <div><b>${size} ${unit}, ${type}, ${category}।</b> বিস্তারিত জানতে ও সরাসরি যোগাযোগ করতে নিচে বাটনে ক্লিক করুন।</div>
            </div>

            <div class="card-media-section">
                <div class="fb-slider" data-current-index="0" data-total-slides="${images.length}">
                    ${mediaHTML}
                    ${navArrows}
                </div>
                <div class="price-tag-overlay">৳ ${displayPrice} ${priceUnit}</div>
            </div>

            <div class="fb-stats-bar">
                <div class="fb-reactions">
                    <i class="material-icons" style="background:#1877f2; color:white; border-radius:50%; font-size:12px; padding:3px;">thumb_up</i>
                    <span><span class="like-count">${data.likes || 0}</span> জন পছন্দ করেছেন</span>
                </div>
                <div>বিস্তারিত দেখুন</div>
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
            e.preventDefault(); this.classList.toggle('liked');
            const countSpan = this.querySelector('.like-count');
            let count = parseInt(countSpan ? countSpan.textContent : 0);
            if (this.classList.contains('liked')) {
                this.style.color = '#1877f2';
                if(countSpan) countSpan.textContent = count + 1;
            } else {
                this.style.color = 'inherit';
                if(countSpan) countSpan.textContent = count - 1;
            }
        };
    });
}

// ইভেন্ট লিসেনারের সেটআপ
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
            const activeNavButton = document.querySelector('.fb-tabs .fb-tab-btn.active');
            const category = activeNavButton ? activeNavButton.getAttribute('data-category') : 'বিক্রয়';
            fetchAndDisplayProperties(category, globalSearchInput?.value || '');
        };
    }

    if (globalSearchInput) {
        globalSearchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const activeNavButton = document.querySelector('.fb-tabs .fb-tab-btn.active');
                const category = activeNavButton ? activeNavButton.getAttribute('data-category') : 'বিক্রয়';
                fetchAndDisplayProperties(category, globalSearchInput.value);
            }
        });
    }
}

// ডকুমেন্ট রেডি রানার
document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user);
            updateIconCounts();
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        }
    });
});
