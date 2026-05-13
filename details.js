const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

// গ্লোবাল ভেরিয়েবল ডেটা সেভ করে রাখার জন্য
let currentPropertyData = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) {
        console.error("Post ID not found in URL");
        return;
    }

    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            currentPropertyData = doc.data();
            renderDetails(currentPropertyData);
            loadRelatedPosts(currentPropertyData);
        } else {
            console.error("No such property document!");
        }
    } catch (error) {
        console.error("Error fetching property:", error);
    }
});

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    // ১. দাম ও ইউনিট
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = `${amount} ${unit}`;

    // ২. ইমেজ গ্যালারি
    const gallery = document.getElementById('gallery');
    if (gallery) {
        gallery.innerHTML = '';
        if (data.images && data.images.length > 0) {
            data.images.forEach(img => {
                const imgEl = document.createElement('img');
                imgEl.src = img.url;
                imgEl.onclick = () => openLightbox(img.url);
                gallery.appendChild(imgEl);
            });
        }
    }

    // ৩. ইনফো টেবিল রেন্ডার
    renderTable('table-main', {
        "ক্যাটাগরি": data.propertyType,
        "অবস্থা": data.category,
        "আয়তন": data.area ? `${data.area} ${data.areaUnit}` : null,
        "বেডরুম": data.bedrooms,
        "বাথরুম": data.bathrooms
    });

    renderTable('table-location', {
        "জেলা": data.district,
        "উপজেলা": data.upazila,
        "ঠিকানা": data.address
    });

    // ৪. কন্টাক্ট টেবিল এবং চ্যাট বাটন সেটআপ
    const contactTable = document.getElementById('table-contact');
    if (contactTable) {
        contactTable.innerHTML = `
            <tr><td>ফোন</td><td>${data.phone || 'গোপন রাখা হয়েছে'}</td></tr>
            <tr>
                <td colspan="2" style="text-align:center; padding-top:15px;">
                    <button id="message-btn" class="btn-map" style="background:#007bff; width:100%; color:white; border:none; padding:10px; border-radius:8px; cursor:pointer; display:flex; align-items:center; justify-content:center;">
                        <i class="material-icons" style="margin-right:8px;">chat</i> সরাসরি মেসেজ দিন
                    </button>
                </td>
            </tr>
        `;

        // বাটনে ক্লিক লিসেনার (সরাসরি DOM থেকে ধরা হয়েছে)
        const msgBtn = document.getElementById('message-btn');
        if (msgBtn) {
            msgBtn.addEventListener('click', () => {
                startChat(data.userId, postId, data.title);
            });
        }
    }

    // ৫. ম্যাপ রেন্ডার (Leaflet)
    if (data.location && data.location.lat) {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            const map = L.map('map-container').setView([data.location.lat, data.location.lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            L.marker([data.location.lat, data.location.lng]).addTo(map);
        }
    }
}

// --- উন্নত চ্যাট সিস্টেম ফাংশন ---
async function startChat(ownerId, propertyId, propertyTitle) {
    // অথেন্টিকেশন স্টেট চেক করা
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            alert("চ্যাট করতে হলে আগে লগইন করুন।");
            window.location.href = 'auth.html';
            return;
        }

        if (user.uid === ownerId) {
            alert("এটি আপনার নিজের পোস্ট! আপনি নিজেকে মেসেজ দিতে পারবেন না।");
            return;
        }

        // চ্যাট আইডি তৈরি
        const chatId = user.uid < ownerId ? 
                       `${user.uid}_${ownerId}` : 
                       `${ownerId}_${user.uid}`;

        try {
            // চ্যাট শুরু করার আগে বাটন ডিসেবল করে দেওয়া যাতে মাল্টিপল ক্লিক না হয়
            const btn = document.getElementById('message-btn');
            if (btn) btn.disabled = true;

            await db.collection('chats').doc(chatId).set({
                participants: [user.uid, ownerId],
                lastMessage: "প্রপার্টি নিয়ে কথা বলতে চাই: " + propertyTitle,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                propertyId: propertyId,
                propertyTitle: propertyTitle
            }, { merge: true });

            // মেসেজ পেজে নিয়ে যাওয়া
            window.location.href = `messages.html?chatId=${chatId}`;
        } catch (error) {
            console.error("Error starting chat:", error);
            alert("দুঃখিত, চ্যাট শুরু করা যাচ্ছে না। আবার চেষ্টা করুন।");
            if (btn) btn.disabled = false;
        }
    });
}

function renderTable(targetId, infoMap) {
    const table = document.getElementById(targetId);
    if (!table) return;
    table.innerHTML = '';
    for (let key in infoMap) {
        if (infoMap[key] !== undefined && infoMap[key] !== null) {
            const row = `<tr><td>${key}</td><td>${infoMap[key]}</td></tr>`;
            table.innerHTML += row;
        }
    }
}

async function loadRelatedPosts(currentData) {
    const relatedList = document.getElementById('related-list');
    if (!relatedList) return;
    try {
        const snap = await db.collection('properties')
            .where('district', '==', currentData.district)
            .limit(6).get();
        
        relatedList.innerHTML = '';
        snap.forEach(doc => {
            if (doc.id === postId) return;
            const d = doc.data();
            const div = document.createElement('div');
            div.className = 'related-item';
            div.innerHTML = `
                <img src="${d.images && d.images[0] ? d.images[0].url : 'placeholder.jpg'}" alt="Property">
                <p>${d.title}</p>
            `;
            div.onclick = () => location.href = `details.html?id=${doc.id}`;
            relatedList.appendChild(div);
        });
    } catch (e) { console.error("Error loading related posts:", e); }
}

function openLightbox(url) {
    const lbImg = document.getElementById('lb-img');
    const lb = document.getElementById('lightbox');
    if (lbImg && lb) {
        lbImg.src = url;
        lb.style.display = 'flex';
    }
}

// সাইডবার এবং অন্যান্য হেডার অ্যাকশন
document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const closeMenu = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (menuButton && sidebar && overlay) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    const closeSidebar = () => {
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    };

    if (closeMenu) closeMenu.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // হেডার আইকন ইভেন্ট লিসেনার
    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');
});
