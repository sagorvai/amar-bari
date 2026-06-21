const db = firebase.firestore();
const auth = firebase.auth();

// UI Elements
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const toggleMapButton = document.getElementById('toggleMapButton');
const propertyGridContainer = document.getElementById('property-grid-container');
const mapSection = document.getElementById('map-section');
const propertyG = document.querySelector('.property-grid');

const notificationButton = document.getElementById('notificationButton'); 
const messageButton = document.getElementById('messageButton');
const headerPostButton = document.getElementById('headerPostButton'); 
const profileImageWrapper = document.getElementById('profileImageWrapper'); 
const profileImage = document.getElementById('profileImage'); 
const defaultProfileIcon = document.getElementById('defaultProfileIcon'); 

const navButtons = document.querySelectorAll('.nav-filters .nav-button:not(#toggleMapButton)'); 
const loginLinkSidebar = document.getElementById('login-link-sidebar');

// অ্যাডভান্সড ফিল্টার উপাদানসমূহ
const filterType = document.getElementById('filterType');
const filterDivision = document.getElementById('filterDivision');
const globalSearchInput = document.getElementById('globalSearchInput');
const btnAdvancedSearch = document.getElementById('btnAdvancedSearch');

let map;

// হেডারে প্রোফাইল ছবি লোড
async function loadProfilePicture(user) {
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
    } catch (e) {
        console.error("Profile picture load error:", e);
    }
}

// সাইডবার ও অ্যাকশন বাটন ইভেন্ট লিসেনারস
function setupUIEventListeners() {
    if (menuButton && sidebar && overlay) {
        menuButton.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
        overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    }

    if (notificationButton) notificationButton.onclick = () => { window.location.href = 'notifications.html'; };
    if (headerPostButton) headerPostButton.onclick = () => { window.location.href = 'post.html'; };
    if (messageButton) messageButton.onclick = () => { window.location.href = 'messages.html'; };
    if (profileImageWrapper) profileImageWrapper.onclick = () => { window.location.href = 'profile.html'; };

    // ক্যাটাগরি ফিল্টার বাটন টগল (বিক্রয় / ভাড়া)
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            navButtons.forEach(b => b.classList.remove('active'));
            toggleMapButton.classList.remove('active');
            this.classList.add('active');
            
            propertyGridContainer.style.display = 'block';
            mapSection.style.display = 'none';
            
            fetchAndDisplayProperties(this.getAttribute('data-category'));
        });
    });

    // ম্যাপ বাটন টগল লজিক
    if (toggleMapButton) {
        toggleMapButton.onclick = function() {
            navButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            propertyGridContainer.style.display = 'none';
            mapSection.style.display = 'block';
            
            const activeCatBtn = document.querySelector('.nav-filters .nav-button.active');
            const cat = activeCatBtn ? activeCatBtn.getAttribute('data-category') : 'বিক্রয়';
            
            initializeMap(cat);
        };
    }

    // অ্যাডভান্সড সার্চ বাটন ক্লিক ইভেন্ট
    if (btnAdvancedSearch) {
        btnAdvancedSearch.onclick = () => {
            const activeCatBtn = document.querySelector('.nav-filters .nav-button.active');
            const cat = activeCatBtn ? activeCatBtn.getAttribute('data-category') : 'বিক্রয়';
            fetchAndDisplayProperties(cat);
        };
    }
}

// 📋 ডাটাবেস থেকে প্রপার্টি রিড ও ডাইনামিক ফিল্টারিং
async function fetchAndDisplayProperties(category) {
    if (!propertyG) return;
    propertyG.innerHTML = '<p style="text-align:center; width:100%; color:#64748b;">প্রপার্টি খোঁজা হচ্ছে...</p>';
    
    try {
        let query = db.collection('properties').where('category', '==', category);
        const snapshot = await query.get();
        
        propertyG.innerHTML = '';
        let hasData = false;

        snapshot.forEach(doc => {
            const p = doc.data();
            
            // ক্লায়েন্ট-সাইড মাল্টি-ফিল্টার চেক (Type, Division, Search Text)
            if (filterType.value && p.type !== filterType.value) return;
            if (filterDivision.value && p.location && p.location.division !== filterDivision.value) return;
            
            if (globalSearchInput.value.trim() !== '') {
                const searchTxt = globalSearchInput.value.toLowerCase();
                const titleMatch = (p.title || '').toLowerCase().includes(searchTxt);
                const areaMatch = p.location ? (p.location.district || '').toLowerCase().includes(searchTxt) || (p.location.upazila || '').toLowerCase().includes(searchTxt) : false;
                if (!titleMatch && !areaMatch) return;
            }

            hasData = true;
            const card = document.createElement('div');
            card.className = 'property-card';
            
            // নথিপত্র (খতিয়ান ও স্কেচ) থাকলে স্পেশাল ভেরিফাইড ব্যাজ দেখাবে
            const isVerified = p.documents && (p.documents.khotian || p.documents.sketch);
            const verifiedBadgeHTML = isVerified ? `<div class="verified-badge"><i class="material-icons" style="font-size:12px;">verified</i> ভেরিফাইড ডকুমেন্ট</div>` : '';

            let imgUrl = 'https://via.placeholder.com/300x200?text=No+Image';
            if (p.images && p.images.length > 0) imgUrl = p.images[0].url || p.images[0];

            card.innerHTML = `
                ${verifiedBadgeHTML}
                <img src="${imgUrl}" style="width:100%; height:180px; object-fit:cover;">
                <div style="padding:12px;">
                    <h4 style="margin:0 0 6px 0; font-size:15px; color:var(--dark); height:44px; overflow:hidden;">${p.title || 'শিরোনামহীন'}</h4>
                    <p style="color:var(--success); font-weight:bold; margin:0 0 6px 0; font-size:16px;">৳ ${p.price || p.monthlyRent || '০'}</p>
                    <p style="margin:0; font-size:12px; color:#64748b; display:flex; align-items:center; gap:3px;">
                        <i class="material-icons" style="font-size:14px;">location_on</i> ${p.location ? p.location.district + ', ' + p.location.division : 'লোকেশন দেওয়া নেই'}
                    </p>
                </div>
            `;
            
            card.onclick = () => { window.location.href = `details.html?id=${doc.id}`; };
            propertyG.appendChild(card);
        });

        if (!hasData) {
            propertyG.innerHTML = '<p style="text-align:center; width:100%; color:#64748b; padding:20px;">আপনার ফিল্টার অনুযায়ী কোনো প্রপার্টি পাওয়া যায়নি।</p>';
        }

    } catch (e) {
        console.error("Fetch properties error:", e);
        propertyG.innerHTML = '<p style="text-align:center; width:100%; color:red;">তথ্য লোড করতে সমস্যা হয়েছে।</p>';
    }
}

// 🗺️ ম্যাপ ভিউ ফাংশনালিটি
function initializeMap(category) {
    if (map) map.remove();
    
    // ম্যাপের ডিফল্ট সেন্টার বাংলাদেশ রাখা হলো
    map = L.map('map-container').setView([23.8103, 90.4125], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    db.collection('properties').where('category', '==', category).get().then(snapshot => {
        snapshot.forEach(doc => {
            const p = doc.data();
            // যদি ল্যাটিচিউড এবং লঙ্গিচিউড কোঅর্ডিনেট থাকে তবেই পিন বসবে
            if (p.location && p.location.lat && p.location.lng) {
                const color = category === 'বিক্রয়' ? '#ff4d4d' : '#28a745';
                const markerIcon = L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background-color:${color}; color:white; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold; white-space:nowrap; box-shadow:0 2px 4px rgba(0,0,0,0.2);">${p.type || 'Bari'}</div>`
                });

                L.marker([p.location.lat, p.location.lng], { icon: markerIcon })
                 .addTo(map)
                 .bindPopup(`<b>${p.title}</b><br>মূল্য: ৳${p.price || p.monthlyRent}<br><a href="details.html?id=${doc.id}">বিস্তারিত দেখুন</a>`);
            }
        });
    });
}

// লগআউট হ্যান্ডলার
function handleLogout(e) {
    e.preventDefault();
    auth.signOut().then(() => { window.location.reload(); });
}

// DOMContentLoaded বুটস্ট্র্যাপ
document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    fetchAndDisplayProperties('বিক্রয়'); 
    
    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user); 
            if (loginLinkSidebar) {
                loginLinkSidebar.innerHTML = '<i class="material-icons">exit_to_app</i> লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            profileImage.style.display = 'none';
            defaultProfileIcon.style.display = 'block';
            if (loginLinkSidebar) {
                loginLinkSidebar.innerHTML = '<i class="material-icons">lock_open</i> লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });
});
