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

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

// ================= LOAD =================
document.addEventListener('DOMContentLoaded', async () => {

    // ✅ BUTTON EVENTS
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
    const currentUser = firebase.auth().currentUser;

    if (!currentUser) {
        alert("মেসেজ করতে লগইন করুন");
        window.location.href = "auth.html";
        return;
    }

    const ownerId = window.propertyOwnerId;

    if (!ownerId) {
        alert("ডাটা লোড হচ্ছে, একটু অপেক্ষা করুন...");
        return;
    }

    if (currentUser.uid === ownerId) {
        alert("নিজের পোস্টে মেসেজ করা যাবে না");
        return;
    }

    const chatId = await createOrGetChat(currentUser.uid, ownerId);
    window.location.href = `messages.html?chatId=${chatId}`;
}

// ================= SAVE =================
function handleSave() {
    if (!postId) return;

    let saved = JSON.parse(localStorage.getItem('savedPosts') || "[]");

    if (saved.includes(postId)) {
        alert("এই পোস্টটি আগেই সেভ করা হয়েছে");
        return;
    }

    saved.push(postId);
    localStorage.setItem('savedPosts', JSON.stringify(saved));

    alert("পোস্টটি সেভ হয়েছে ✅");
}

// ================= SHARE =================
async function handleShare() {
    const url = window.location.href;

    if (navigator.share) {
        try {
            await navigator.share({
                title: document.getElementById('p-title')?.textContent || "Property",
                text: "এই প্রপার্টিটি দেখুন",
                url: url
            });
        } catch (err) {
            console.log("Share cancelled");
        }
    } else {
        await navigator.clipboard.writeText(url);
        alert("লিংক কপি হয়েছে ✅");
    }
}

// ================= CHAT CREATE =================
async function createOrGetChat(user1, user2) {
    const chatId = [user1, user2].sort().join("_");

    const chatRef = db.collection("chats").doc(chatId);
    const doc = await chatRef.get();

    if (!doc.exists) {
        await chatRef.set({
            users: [user1, user2],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    return chatId;
}

// ================= RENDER =================
function renderDetails(data) {

    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    window.propertyOwnerId = data.userId;

    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || "";
    document.getElementById('p-price').textContent =
        amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // ===== IMAGE =====
    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));
    if (data.documents?.khotian) images.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) images.push(data.documents.sketch.url || data.documents.sketch);

    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';

    images.slice(0, 5).forEach(url => {
        const div = document.createElement('div');
        div.className = 'gal-item';
        div.innerHTML = `<img src="${url}" onclick="openLightbox('${url}')">`;
        gallery.appendChild(div);
    });

    const addRow = (tableId, label, value) => {
        if (!value) return;
        document.getElementById(tableId).innerHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // ===== BASIC =====
    document.getElementById('table-basic').innerHTML = "";

    addRow('table-basic', "ক্যাটাগরি", data.category);
    addRow('table-basic', "টাইপ", data.type);
    addRow('table-basic', "জমির ধরন", data.landType);
    addRow('table-basic', "প্রপার্টির বয়স", data.propertyAge ? `${data.propertyAge} বছর` : "");

    if (data.category === 'ভাড়া') {
        addRow('table-basic', "ভাড়ার ধরন", data.rentType);
        addRow('table-basic', "ওঠার তারিখ", data.moveInDate);
        addRow('table-basic', "অগ্রিম", data.advance ? `৳ ${data.advance}` : "");
    }

    addRow('table-basic', "বেডরুম", data.rooms ? `${data.rooms} টি` : "");
    addRow('table-basic', "ডাইনিং", data.dining ? `${data.dining} টি` : "");
    addRow('table-basic', "বাথরুম", data.bathrooms ? `${data.bathrooms} টি` : "");
    addRow('table-basic', "কিচেন", data.kitchen ? `${data.kitchen} টি` : "");
    addRow('table-basic', "বেলকনি", data.balcony ? `${data.balcony} টি` : "");
    addRow('table-basic', "ফ্লোর", data.floorNo || data.floorLevel);
    addRow('table-basic', "রাস্তা", data.roadWidth ? `${data.roadWidth} ফিট` : "");
    addRow('table-basic', "ফেসিং", data.facing ? `${data.facing} দিক` : "");

    if (data.utilities) {
        addRow('table-basic', "সুবিধা", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);
    }

    let area = data.landArea || data.houseArea || data.areaSqft || data.commercialArea;
    let areaUnit = data.landAreaUnit || data.houseAreaUnit || data.commercialAreaUnit || "";
    addRow('table-basic', "পরিমাণ", area ? `${area} (${areaUnit})` : "");

    // ===== OWNER =====
    const ownerSection = document.getElementById('section-owner');

    if (data.category === 'বিক্রয়' && data.owner) {
        ownerSection.style.display = 'block';
        document.getElementById('table-owner').innerHTML = "";

        addRow('table-owner', "দাতার নাম", data.owner.donorName);
        addRow('table-owner', "খতিয়ান", data.owner.khotianNo);
        addRow('table-owner', "দাগ", data.owner.dagNo);
        addRow('table-owner', "মৌজা", data.owner.mouja);
    } else {
        ownerSection.style.display = 'none';
    }

    // ===== LOCATION =====
    document.getElementById('table-location').innerHTML = "";

    addRow('table-location', "জেলা", data.location?.district);
    addRow('table-location', "থানা", data.location?.thana);
    addRow('table-location', "গ্রাম", data.location?.village);

    if (data.location?.lat && data.location?.lng) {
        initSinglePropertyMap(data);
    }

    // ===== CONTACT =====
    document.getElementById('table-contact').innerHTML = "";

    addRow('table-contact', "ফোন", data.phoneNumber);
    addRow('table-contact', "অতিরিক্ত", data.secondaryPhone);

    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
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
        .limit(50)
        .get();

    let posts = [];

    snapshot.forEach(doc => {
        if (doc.id !== postId) posts.push({ id: doc.id, ...doc.data() });
    });

    list.innerHTML = "";

    posts.slice(0, 10).forEach(p => {
        list.innerHTML += `<div onclick="location.href='details.html?id=${p.id}'">${p.title}</div>`;
    });
}

// ================= LIGHTBOX =================
function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
        }
