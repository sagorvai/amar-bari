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

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;
    const doc = await db.collection('properties').doc(postId).get();
    if (doc.exists) {
        const data = doc.data();
        renderDetails(data);
        loadRelatedPosts(data);
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
    gallery.innerHTML = '';
    if (data.images && data.images.length > 0) {
        data.images.forEach(img => {
            const imgEl = document.createElement('img');
            imgEl.src = img.url;
            imgEl.onclick = () => openLightbox(img.url);
            gallery.appendChild(imgEl);
        });
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
    contactTable.innerHTML = `
        <tr><td>ফোন</td><td>${data.phone || 'গোপন রাখা হয়েছে'}</td></tr>
        <tr>
            <td colspan="2" style="text-align:center; padding-top:15px;">
                <button id="message-btn" class="btn-map" style="background:#007bff; width:100%;">
                    <i class="material-icons">chat</i> সরাসরি মেসেজ দিন
                </button>
            </td>
        </tr>
    `;

    // মেসেজ বাটনে ক্লিক করলে চ্যাট শুরু হবে
    document.getElementById('message-btn').onclick = () => {
        startChat(data.userId, postId, data.title);
    };

    // ৫. ম্যাপ রেন্ডার (Leaflet)
    if (data.location) {
        const map = L.map('map-container').setView([data.location.lat, data.location.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        L.marker([data.location.lat, data.location.lng]).addTo(map);
    }
}

// --- নতুন চ্যাট সিস্টেম ফাংশন ---
async function startChat(ownerId, propertyId, propertyTitle) {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
        alert("চ্যাট করতে হলে আগে লগইন করুন।");
        window.location.href = 'auth.html';
        return;
    }

    if (currentUser.uid === ownerId) {
        alert("এটি আপনার নিজের পোস্ট!");
        return;
    }

    // চ্যাট আইডি তৈরি (ছোট আইডি আগে দিয়ে ইউনিক করা হয়)
    const chatId = currentUser.uid < ownerId ? 
                   `${currentUser.uid}_${ownerId}` : 
                   `${ownerId}_${currentUser.uid}`;

    try {
        // চ্যাট মেটাডেটা তৈরি বা আপডেট
        await db.collection('chats').doc(chatId).set({
            participants: [currentUser.uid, ownerId],
            lastMessage: "প্রপার্টি নিয়ে কথা বলতে চাই: " + propertyTitle,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            propertyId: propertyId,
            propertyTitle: propertyTitle
        }, { merge: true });

        // মেসেজ পেজে রিডাইরেক্ট
        window.location.href = `messages.html?chatId=${chatId}&propertyId=${propertyId}`;
    } catch (error) {
        console.error("Error starting chat:", error);
        alert("চ্যাট শুরু করতে সমস্যা হচ্ছে। আবার চেষ্টা করুন।");
    }
}

function renderTable(targetId, infoMap) {
    const table = document.getElementById(targetId);
    table.innerHTML = '';
    for (let key in infoMap) {
        if (infoMap[key]) {
            const row = `<tr><td>${key}</td><td>${infoMap[key]}</td></tr>`;
            table.innerHTML += row;
        }
    }
}

async function loadRelatedPosts(currentData) {
    const relatedList = document.getElementById('related-list');
    try {
        const snap = await db.collection('properties')
            .where('district', '==', currentData.district)
            .limit(5).get();
        
        snap.forEach(doc => {
            if (doc.id === postId) return;
            const d = doc.data();
            const div = document.createElement('div');
            div.className = 'related-item';
            div.innerHTML = `
                <img src="${d.images[0].url}">
                <p>${d.title}</p>
            `;
            div.onclick = () => location.href = `details.html?id=${doc.id}`;
            relatedList.appendChild(div);
        });
    } catch (e) { console.error(e); }
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const closeMenu = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

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

    if (closeMenu) closeMenu.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');
});
