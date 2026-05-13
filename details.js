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
    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            const data = doc.data();
            renderDetails(data);
            loadRelatedPosts(data);
        }
    } catch (error) {
        console.error("Error loading property details:", error);
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

    // ৪. কন্টাক্ট টেবিল এবং চ্যাট বাটন (এখানে সরাসরি বাটন যোগ করা হয়েছে)
    const contactTable = document.getElementById('table-contact');
    if (contactTable) {
        contactTable.innerHTML = `
            <tr><td>ফোন</td><td>${data.phone || 'গোপন রাখা হয়েছে'}</td></tr>
            <tr>
                <td colspan="2" style="text-align:center; padding-top:15px;">
                    <button id="message-btn" class="btn-map" style="background:#007bff; width:100%; border:none; padding:12px; color:white; border-radius:8px; cursor:pointer; font-weight:bold; display:flex; align-items:center; justify-content:center;">
                        <i class="material-icons" style="margin-right:8px;">chat</i> সরাসরি মেসেজ দিন
                    </button>
                </td>
            </tr>
        `;

        document.getElementById('message-btn').onclick = () => {
            handleStartChat(data.userId, postId, data.title);
        };
    }

    // ৫. ম্যাপ রেন্ডার
    if (data.location && typeof L !== 'undefined') {
        const map = L.map('map-container').setView([data.location.lat, data.location.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
        L.marker([data.location.lat, data.location.lng]).addTo(map);
    }
}

// --- সরাসরি চ্যাট শুরু করার লজিক ---
async function handleStartChat(ownerId, propertyId, propertyTitle) {
    const user = auth.currentUser;
    if (!user) {
        alert("মেসেজ দিতে হলে দয়া করে আগে লগইন করুন।");
        window.location.href = 'auth.html';
        return;
    }

    if (user.uid === ownerId) {
        alert("এটি আপনার নিজের পোস্ট!");
        return;
    }

    // ইউনিক চ্যাট আইডি (ক্রেতা এবং বিক্রেতার আইডি দিয়ে)
    const chatId = user.uid < ownerId ? `${user.uid}_${ownerId}` : `${ownerId}_${user.uid}`;

    try {
        // চ্যাট লিস্টে এই চ্যাটটি তৈরি বা আপডেট করা
        await db.collection('chats').doc(chatId).set({
            participants: [user.uid, ownerId],
            propertyId: propertyId,
            propertyTitle: propertyTitle,
            lastMessage: "আমি এই প্রপার্টিটি নিয়ে কথা বলতে আগ্রহী।",
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            // চ্যাট তালিকায় নাম দেখানোর জন্য অতিরিক্ত তথ্য (ঐচ্ছিক)
            buyerId: user.uid,
            sellerId: ownerId
        }, { merge: true });

        // সরাসরি মেসেজ পেজে নিয়ে যাওয়া
        window.location.href = `messages.html?chatId=${chatId}`;
    } catch (error) {
        console.error("Chat start failed:", error);
        alert("দুঃখিত, চ্যাট শুরু করা যাচ্ছে না।");
    }
}

function renderTable(targetId, infoMap) {
    const table = document.getElementById(targetId);
    if (!table) return;
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
    if (!relatedList) return;
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

// সাইডবার এবং সাধারণ হেডার লজিক
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');
});
