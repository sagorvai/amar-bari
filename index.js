// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// নেভিগেশন ও প্রোফাইল উপাদান
const notificationButton = document.getElementById('notificationButton'); 
const messageButton = document.getElementById('messageButton');
const headerPostButton = document.getElementById('headerPostButton'); 
const profileImageWrapper = document.getElementById('profileImageWrapper'); 
const profileImage = document.getElementById('profileImage'); 
const defaultProfileIcon = document.getElementById('defaultProfileIcon'); 

// কাউন্টার উপাদান
const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');
const postCount = document.getElementById('post-count'); 

const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');
const globalSearchInput = document.getElementById('globalSearchInput');

let map; // গ্লোবাল ম্যাপ ভেরিয়েবল

// --- ১. ম্যাপ ইনিশিয়ালাইজেশন ফাংশন ---
function initMap(category = 'all') {
    // যদি আগে ম্যাপ তৈরি করা থাকে তবে তা রিমুভ করবে
    if (map) { map.remove(); }

    // ম্যাপের ডিফল্ট ভিউ (বাংলাদেশ কেন্দ্রিক)
    map = L.map('map-container').setView([23.6850, 90.3563], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // ফায়ারস্টোর থেকে ডেটা ফেচ
    db.collection('properties').get().then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            
            // ফিল্টার অনুযায়ী ডেটা চেক
            if (category !== 'all' && data.category !== category) return;

            // লোকেশন ডেটা থাকলে পিন বসাবে
            if (data.location && data.location.lat && data.location.lng) {
                const pinColor = data.category === 'বিক্রয়' ? 'red' : 'blue';
                const postType = data.type || "প্রপার্টি";

                // কাস্টম আইকন ডিজাইন
                const customIcon = L.divIcon({
                    className: 'custom-div-icon',
                    html: `<div style="background-color:${pinColor}; color:white; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold; white-space:nowrap; border:1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${postType}</div>`,
                    iconSize: [40, 20],
                    iconAnchor: [20, 10]
                });

                const marker = L.marker([data.location.lat, data.location.lng], { icon: customIcon }).addTo(map);

                // পিনে ক্লিক করলে সরাসরি ডিটেইলস পেজে নিয়ে যাবে
                marker.on('click', function() {
                    window.location.href = `details.html?id=${doc.id}`;
                });
            }
        });
    });
}

// --- ২. ইউজার ইন্টারফেস ইভেন্ট হ্যান্ডলার ---
function setupUIEventListeners() {
    // সাইডবার কন্ট্রোল
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    if (overlay) overlay.addEventListener('click', closeSidebar);

    // নেভিগেশন ফিল্টার বাটনসমূহ
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const category = btn.getAttribute('data-category');
            
            if (category === 'map') {
                // ম্যাপ ভিউ দেখাবে
                document.getElementById('property-grid-container').style.display = 'none';
                document.getElementById('map-section').style.display = 'block';
                setTimeout(() => { initMap('all'); }, 200);
            } else {
                // গ্রিড ভিউ দেখাবে
                document.getElementById('property-grid-container').style.display = 'block';
                document.getElementById('map-section').style.display = 'none';
                fetchAndDisplayProperties(category, globalSearchInput.value);
            }
        });
    });

    // গ্লোবাল সার্চ
    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', (e) => {
            const activeBtn = document.querySelector('.nav-button.active');
            const category = activeBtn ? activeBtn.getAttribute('data-category') : 'বিক্রয়';
            if (category !== 'map') {
                fetchAndDisplayProperties(category, e.target.value);
            }
        });
    }
}

// --- ৩. প্রোফাইল ইমেজ লোড করার ফাংশন ---
async function loadProfilePicture(user) {
    if (user && user.photoURL) {
        profileImage.src = user.photoURL;
        profileImage.style.display = 'block';
        defaultProfileIcon.style.display = 'none';
    } else {
        profileImage.style.display = 'none';
        defaultProfileIcon.style.display = 'block';
    }
}

// --- ৪. প্রপার্টি ফেচ এবং ডিসপ্লে ফাংশন ---
function fetchAndDisplayProperties(category, searchText) {
    propertyG.innerHTML = '<p style="text-align:center; width:100%;">লোড হচ্ছে...</p>';
    
    db.collection('properties').where('category', '==', category).get().then((querySnapshot) => {
        propertyG.innerHTML = "";
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (searchText && !data.title.toLowerCase().includes(searchText.toLowerCase())) return;

            const card = document.createElement('div');
            card.className = 'property-card';
            card.innerHTML = createPropertyCardHTML(doc.id, data);
            propertyG.appendChild(card);
        });
    });
}

function createPropertyCardHTML(id, data) {
    const price = data.category === 'বিক্রয়' ? `৳ ${data.price}` : `৳ ${data.monthlyRent}/মাস`;
    return `
        <div onclick="location.href='details.html?id=${id}'">
            <img src="${data.images ? data.images[0] : ''}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
            <h3 style="margin:10px 0 5px 0; font-size:16px;">${data.title}</h3>
            <p style="color:#27ae60; font-weight:bold;">${price}</p>
            <p style="font-size:12px; color:#666;"><i class="material-icons" style="font-size:12px;">place</i> ${data.address || ''}</p>
        </div>
    `;
}

// --- ৫. লগআউট হ্যান্ডলার ---
function handleLogout(e) {
    e.preventDefault();
    auth.signOut().then(() => {
        window.location.reload();
    });
}

// --- ৬. পেজ লোড হলে শুরু হবে ---
document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    auth.onAuthStateChanged(user => {
        if (user) {
            loadProfilePicture(user); 
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
            }
        }
    });
});
