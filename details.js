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

let currentUser = null;

// ================= AUTH READY =================
auth.onAuthStateChanged(user => {
    currentUser = user;
});

// ================= LOAD =================
document.addEventListener('DOMContentLoaded', async () => {

    // BUTTON EVENTS
    document.getElementById('p-message')?.addEventListener('click', handleMessageClick);
    document.getElementById('p-save')?.addEventListener('click', handleSave);
    document.getElementById('p-share')?.addEventListener('click', handleShare);

    if (!postId) return;

    try {
        const doc = await db.collection('properties').doc(postId).get();

        if (doc.exists) {
            const data = doc.data();
            renderDetails(data);
            loadRelatedPosts(data);
        } else {
            alert("পোস্ট পাওয়া যায়নি");
        }
    } catch (e) {
        console.error(e);
        alert("ডেটা লোড করতে সমস্যা হয়েছে");
    }
});

// ================= MESSAGE =================
async function handleMessageClick() {

    if (!currentUser) {
        alert("মেসেজ করতে লগইন করুন");
        window.location.href = "auth.html";
        return;
    }

    const ownerId = window.propertyOwnerId;

    if (!ownerId) {
        alert("ডাটা এখনো লোড হয়নি");
        return;
    }

    if (currentUser.uid === ownerId) {
        alert("নিজের পোস্টে মেসেজ করা যাবে না");
        return;
    }

    try {
        const chatId = await createOrGetChat(currentUser.uid, ownerId);
        window.location.href = `messages.html?chatId=${chatId}`;
    } catch (e) {
        console.error(e);
        alert("চ্যাট তৈরি করতে সমস্যা হয়েছে");
    }
}

// ================= SAVE =================
function handleSave() {
    if (!postId) return;

    let saved = JSON.parse(localStorage.getItem('savedPosts') || "[]");

    if (saved.includes(postId)) {
        alert("আগেই সেভ করা আছে");
        return;
    }

    saved.push(postId);
    localStorage.setItem('savedPosts', JSON.stringify(saved));

    alert("সেভ হয়েছে ✅");
}

// ================= SHARE =================
async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
        try {
            await navigator.share({
                title: document.getElementById('p-title')?.textContent,
                url
            });
        } catch {}
    } else {
        await navigator.clipboard.writeText(url);
        alert("লিংক কপি হয়েছে ✅");
    }
}

// ================= CHAT CREATE =================
async function createOrGetChat(user1, user2) {

    if (!user1 || !user2) {
        throw new Error("User ID missing");
    }

    const chatId = [user1, user2].sort().join("_");

    const chatRef = db.collection("chats").doc(chatId);

    try {
        const doc = await chatRef.get();

        if (!doc.exists) {
            await chatRef.set({
                users: [user1, user2],
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }

        return chatId;

    } catch (e) {
        console.error("CREATE CHAT ERROR:", e);
        throw e;
    }
}

// ================= RENDER =================
function renderDetails(data) {

    window.propertyOwnerId = data.userId;

    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    // Location text
    if (data.location) {
        document.getElementById('p-location').textContent =
            `${data.location.village || ''}, ${data.location.thana || ''}, ${data.location.district || ''}`;
    }

    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || "";
    document.getElementById('p-price').textContent =
        amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // Images
    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));

    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';

    images.slice(0, 5).forEach(url => {
        gallery.innerHTML += `<div class="gal-item"><img src="${url}" onclick="openLightbox('${url}')"></div>`;
    });

    const addRow = (id, l, v) => {
        if (!v) return;
        document.getElementById(id).innerHTML += `<tr><td>${l}</td><td>${v}</td></tr>`;
    };

    document.getElementById('table-basic').innerHTML = "";

    addRow('table-basic', "ক্যাটাগরি", data.category);
    addRow('table-basic', "টাইপ", data.type);
    addRow('table-basic', "বেডরুম", data.rooms ? data.rooms + " টি" : "");

    document.getElementById('table-contact').innerHTML = "";
    addRow('table-contact', "ফোন", data.phoneNumber);

    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;

    if (data.location?.lat && data.location?.lng) {
        initSinglePropertyMap(data);
    }
}

// ================= MAP =================
function initSinglePropertyMap(data) {
    const map = L.map('map-container').setView([data.location.lat, data.location.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
        .addTo(map);

    L.marker([data.location.lat, data.location.lng])
        .addTo(map)
        .bindPopup(data.title)
        .openPopup();
}

// ================= RELATED =================
async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');

    const snapshot = await db.collection('properties')
        .where('category', '==', currentData.category)
        .limit(10)
        .get();

    list.innerHTML = "";

    snapshot.forEach(doc => {
        if (doc.id !== postId) {
            const d = doc.data();
            list.innerHTML += `<div class="rel-card" onclick="location.href='details.html?id=${doc.id}'">
                <img src="${d.images?.[0]?.url || ''}">
                <div class="rel-info">
                    <h4>${d.title}</h4>
                </div>
            </div>`;
        }
    });
}

// ================= LIGHTBOX =================
function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
}
