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

// ================= LOAD DATA =================
document.addEventListener('DOMContentLoaded', async () => {

    // 👉 Message button event (early attach - safe handler use করা হয়েছে)
    document.getElementById('p-message')?.addEventListener('click', handleMessageClick);

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

// ================= MESSAGE HANDLER =================
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

// ================= RENDER DETAILS =================
function renderDetails(data) {

    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    // Seller ID set
    if (!data.userId) {
        console.error("Seller ID missing!");
    }
    window.propertyOwnerId = data.userId;

    // Price
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || "";
    document.getElementById('p-price').textContent =
        amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // Image Gallery
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

    // Helper
    const addRow = (tableId, label, value) => {
        if (!value) return;
        const table = document.getElementById(tableId);
        table.innerHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // ================= BASIC =================
    const basicT = 'table-basic';
    document.getElementById(basicT).innerHTML = "";

    addRow(basicT, "ক্যাটাগরি", data.category);
    addRow(basicT, "টাইপ", data.type);
    addRow(basicT, "জমির ধরন", data.landType);
    addRow(basicT, "প্রপার্টির বয়স", data.propertyAge ? `${data.propertyAge} বছর` : "");

    if (data.category === 'ভাড়া') {
        addRow(basicT, "ভাড়ার ধরন", data.rentType);
        addRow(basicT, "ওঠার তারিখ", data.moveInDate);
        addRow(basicT, "অগ্রিম", data.advance ? `৳ ${data.advance}` : "");
    }

    addRow(basicT, "বেডরুম", data.bedrooms || data.rooms ? `${data.rooms} টি` : "");
    addRow(basicT, "ডাইনিং", data.dining ? `${data.dining} টি` : "");
    addRow(basicT, "বাথরুম", data.bathrooms ? `${data.bathrooms} টি` : "");
    addRow(basicT, "কিচেন", data.kitchen ? `${data.kitchen} টি` : "");
    addRow(basicT, "বেলকনি", data.balcony ? `${data.balcony} টি` : "");
    addRow(basicT, "ফ্লোর", data.floorNo || data.floorLevel);
    addRow(basicT, "রাস্তা", data.roadWidth ? `${data.roadWidth} ফিট` : "");
    addRow(basicT, "ফেসিং", data.facing ? `${data.facing} দিক` : "");

    if (data.utilities && data.utilities.length > 0) {
        addRow(basicT, "সুবিধা", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);
    }

    let area = data.landArea || data.houseArea || data.areaSqft || data.commercialArea;
    let areaUnit = data.landAreaUnit || data.houseAreaUnit || data.commercialAreaUnit || "";
    addRow(basicT, "পরিমাণ", area ? `${area} (${areaUnit})` : "");

    // ================= OWNER =================
    const ownerSection = document.getElementById('section-owner');

    if (data.category === 'বিক্রয়' && data.owner) {
        ownerSection.style.display = 'block';
        const ownT = 'table-owner';
        document.getElementById(ownT).innerHTML = "";

        addRow(ownT, "দাতার নাম", data.owner.donorName);
        addRow(ownT, "খতিয়ান", data.owner.khotianNo ? `${data.owner.khotianNo} (${data.owner.khotianNoType || ""})` : "");
        addRow(ownT, "দাগ", data.owner.dagNo ? `${data.owner.dagNo} (${data.owner.dagNoType || ""})` : "");
        addRow(ownT, "মৌজা", data.owner.mouja);

    } else {
        ownerSection.style.display = 'none';
    }

    // ================= LOCATION =================
    const locT = 'table-location';
    document.getElementById(locT).innerHTML = "";

    addRow(locT, "জেলা", data.location?.district);
    addRow(locT, "এরিয়া", data.location?.areaType);
    addRow(locT, "উপজেলা", data.location?.upazila);
    addRow(locT, "থানা", data.location?.thana);
    addRow(locT, "ইউনিয়ন", data.location?.union);
    addRow(locT, "ওয়ার্ড", data.location?.wardNo);
    addRow(locT, "গ্রাম", data.location?.village);
    addRow(locT, "রাস্তা", data.location?.road);

    if (data.location?.lat && data.location?.lng) {
        initSinglePropertyMap(data);
    }

    // ================= CONTACT =================
    const conT = 'table-contact';
    document.getElementById(conT).innerHTML = "";

    addRow(conT, "ফোন", data.phoneNumber);
    addRow(conT, "অতিরিক্ত", data.secondaryPhone);

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

    let allPosts = [];

    snapshot.forEach(doc => {
        if (doc.id !== postId) {
            allPosts.push({ id: doc.id, ...doc.data() });
        }
    });

    list.innerHTML = "";

    allPosts.slice(0, 10).forEach(post => {
        list.innerHTML += `
        <div onclick="location.href='details.html?id=${post.id}'">
            <p>${post.title}</p>
        </div>`;
    });
}

// ================= LIGHTBOX =================
function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
        }
