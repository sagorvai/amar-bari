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

    // ১. দাম ও ইউনিট (ভাড়া ও বিক্রয় উভয় ঠিক করা হলো)
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // ইমেজ গ্যালারি
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
        if (!value || value === "" || value === "undefined") return;
        const table = document.getElementById(tableId);
        table.innerHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // ২. 🏠 প্রপার্টির তথ্য
    const basicT = 'table-basic';
    document.getElementById(basicT).innerHTML = ""; 

    addRow(basicT, "ক্যাটাগরি", data.category);
    addRow(basicT, "টাইপ", data.type);
    addRow(basicT, "জমির ধরন", data.landType);
    addRow(basicT, "প্রপার্টির বয়স", data.propertyAge? `${data.propertyAge} বছর` : "");
    
    // ভাড়ার জন্য বিশেষ তথ্য (উঠার তারিখ, ধরন, এডভ্যান্স)
    if (data.category === 'ভাড়া') {
        addRow(basicT, "ভাড়ার ধরন", data.rentType); // ফ্যামিলি/ব্যাচেলর
        addRow(basicT, "ওঠার তারিখ", data.moveInDate);
        addRow(basicT, "অগ্রিম (এডভ্যান্স)", data.advance ? `৳ ${data.advance} টাকা` : "");
    }

    addRow(basicT, "বেডরুম", data.bedrooms || data.rooms? `${data.rooms} টি` : "");
    addRow(basicT, "ডাইনিং", data.dining? `${data.dining} টি` : "");
    addRow(basicT, "বাথরুম", data.bathrooms? `${data.bathrooms} টি` : "");
    addRow(basicT, "কিচেন", data.kitchen? `${data.kitchen} টি` : "");
    addRow(basicT, "বেলকনি", data.balcony? `${data.balcony} টি` : "");
    addRow(basicT, "ফ্লোর নম্বর", data.floorNo || data.floorLevel);
    addRow(basicT, "রাস্তা", data.roadWidth ? `${data.roadWidth} ফিট` : "");
    addRow(basicT, "ফেসিং", data.facing? `${data.facing} দিক` : "");
    
    // সুবিধা সমূহ (Utilities - কমা দিয়ে সুন্দর করে দেখানো)
    if (data.utilities && data.utilities.length > 0) {
        addRow(basicT, "সুবিধা সমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);
    }

    // পরিমাণের পাসে ব্র্যাকেটে ইউনিট
    let area = data.landArea || data.houseArea || data.areaSqft || data.commercialArea;
    let areaUnit = data.landAreaUnit || data.houseAreaUnit || data.commercialAreaUnit || "";
    addRow(basicT, "পরিমাণ", area ? `${area} (${areaUnit})` : "");

    // ৩. 📑 মালিকানা তথ্য
const ownerSection = document.getElementById('section-owner');
if (data.category === 'বিক্রয়' && data.owner) {
    ownerSection.style.display = 'block';
    const ownT = 'table-owner';
    document.getElementById(ownT).innerHTML = "";
    addRow(ownT, "দাতার নাম", data.owner.donorName);
    
    let khotian = data.owner.khotianNo;
    let khotianType = data.owner.khotianNoType || "";
    addRow(ownT, "খতিয়ান নং", khotian ? `${khotian} (${khotianType})` : "");
    
    let dag = data.owner.dagNo;
    let dagType = data.owner.dagNoType || "";
    addRow(ownT, "দাগ নং", dag ? `${dag} (${dagType})` : "");
    
    addRow(ownT, "মৌজা", data.owner.mouja);
} else {
    ownerSection.style.display = 'none';
}
    
    // ৪. 📍 অবস্থান
    const locT = 'table-location';
    document.getElementById(locT).innerHTML = "";
    addRow(locT, "জেলা", data.location?.district);
    addRow(locT, "এরিয়া", data.location?.areaType);
    addRow(locT, "উপজেলা", data.location?.upazila);
    addRow(locT, "থানা", data.location?.thana);
    addRow(locT, "ইউনিয়ন", data.location?.union);
    addRow(locT, "ওয়ার্ড নম্বর", data.location?.wardNo);
    addRow(locT, "গ্রাম/এলাকা", data.location?.village);
    addRow(locT, "রাস্তা", data.location?.road);

    // ফাংশনের শেষে ম্যাপ কল করার এই অংশটুকু নিশ্চিত করুন
    if (data.location && data.location.lat && data.location.lng) {
        initSinglePropertyMap(data);
    }


    // ৫. 📞 যোগাযোগ
    const conT = 'table-contact';
    document.getElementById(conT).innerHTML = "";
    addRow(conT, "প্রাথমিক ফোন", data.phoneNumber);
    addRow(conT, "অতিরিক্ত ফোন", data.secondaryPhone);
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
}

// বিস্তারিত পেইজে চ্যাট শুরু করার জন্য ফাংশন
async function initiateChat(propertyId, userId, propertyTitle) {
    const currentUserId = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;

    if (!currentUserId) {
        alert("চ্যাট শুরু করতে অনুগ্রহ করে লগইন করুন।");
        window.location.href = 'auth.html';
        return;
    }

    // প্রপার্টির মালিক (ownerId) এবং বর্তমান ইউজার একই কি না যাচাই
    if (currentUserId === ownerId) {
        alert("এটি আপনার নিজের প্রপার্টি, তাই এখানে চ্যাট অপশন নেই।");
        return;
    }

    // চ্যাট আইডি তৈরি (ইউনিক আইডি নিশ্চিত করতে)
    const sortedIds = [currentUserId, ownerId].sort();
    const chatIdentifier = `${sortedIds[0]}_${sortedIds[1]}_${propertyId}`;

    const chatRef = db.collection("chats").doc(chatIdentifier);
    const chatDoc = await chatRef.get();

    // যদি চ্যাট না থাকে, তবে নতুন চ্যাট তৈরি করুন
    if (!chatDoc.exists) {
        await chatRef.set({
            propertyId: propertyId,
            propertyTitle: propertyTitle,
            participants: [currentUserId, ownerId],
            lastMessage: 'নতুন কথোপকথন শুরু হলো',
            lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // মেসেজ পেইজে রিডাইরেক্ট করুন
    window.location.href = `messages.html?chatId=${chatIdentifier}`;
}

// renderDetails ফাংশনের ভেতরে নিচের অংশটি যুক্ত করুন
function renderDetails(data, id) {
    // ... আপনার আগের কোড ...

    // বাটন ক্লিকের ইভেন্ট হ্যান্ডলার
    const messageBtn = document.getElementById('messageButton');
    if (messageBtn) {
        messageBtn.onclick = () => {
            // এখানে data.userId ব্যবহার করা হয়েছে, কারণ প্রপার্টি ডকুমেন্টে এটিই মালিকের আইডি
            initiateChat(id, data.userId, data.title);
        };
    }
}

// শুধুমাত্র এই প্রপার্টির জন্য ম্যাপ ফাংশন
function initSinglePropertyMap(data) {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    // ম্যাপ সেটআপ (জুম লেভেল ১৫ দেওয়া হয়েছে যাতে লোকেশন পরিষ্কার বোঝা যায়)
    const map = L.map('map-container').setView([data.location.lat, data.location.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // শুধুমাত্র লাল রঙের সুচালো পিন ডিজাইন
    const propertyType = data.type || data.propertyType || 'প্রপার্টি';

    const redPinIcon = L.divIcon({
        html: `
            <div style="position: relative; width: 60px; height: 35px; display: flex; flex-direction: column; align-items: center;">
                <div style="
                    background-color: #e74c3c; 
                    color: white; 
                    padding: 4px 8px; 
                    border-radius: 15px; 
                    font-size: 11px; 
                    font-weight: bold; 
                    white-space: nowrap;
                    border: 2px solid white;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.4);
                    z-index: 2;
                    text-align: center;
                    min-width: 50px;">
                    ${propertyType}
                </div>
                <div style="
                    width: 0; 
                    height: 0; 
                    border-left: 7px solid transparent;
                    border-right: 7px solid transparent;
                    border-top: 10px solid #e74c3c;
                    margin-top: -2px;
                    z-index: 1;">
                </div>
            </div>`,
        className: 'custom-pin',
        iconSize: [60, 45],
        iconAnchor: [30, 45]
    });

    // ম্যাপে মার্কার বা পিন বসানো
    L.marker([data.location.lat, data.location.lng], { icon: redPinIcon })
     .addTo(map)
     .bindPopup(`<b>${data.title}</b><br>লোকেশন এখানে`)
     .openPopup();
}

// সম্পর্কিত পোস্ট লজিক (আগের মতোই সঠিক আছে)
async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');
    const seeMoreBox = document.getElementById('see-more-box');
    try {
        const snapshot = await db.collection('properties')
            .where('category', '==', currentData.category)
            .limit(50) 
            .get();

        let allPosts = [];
        snapshot.forEach(doc => {
            if (doc.id !== postId) allPosts.push({ id: doc.id, ...doc.data() });
        });

        allPosts.sort((a, b) => {
            const aVillage = (a.location?.village === currentData.location?.village) ? 1 : 0;
            const bVillage = (b.location?.village === currentData.location?.village) ? 1 : 0;
            if (aVillage !== bVillage) return bVillage - aVillage;
            const aThana = (a.location?.thana === currentData.location?.thana) ? 1 : 0;
            const bThana = (b.location?.thana === currentData.location?.thana) ? 1 : 0;
            return bThana - aThana;
        });

        const displayPosts = allPosts.slice(0, 10);
        list.innerHTML = "";
        displayPosts.forEach(post => {
            let pAmt = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let pUnit = post.priceUnit || post.rentUnit || "";
            list.innerHTML += `
                <div class="rel-card" onclick="location.href='details.html?id=${post.id}'">
                    <img src="${post.images?.[0]?.url || post.images?.[0] || 'placeholder.jpg'}">
                    <div class="rel-info">
                        <h4 class="rel-title">${post.title}</h4>
                        <p class="rel-price">৳ ${pAmt} (${pUnit})</p>
                        <p class="rel-loc">${post.location?.village || ''}, ${post.location?.thana || ''}, ${post.location?.district || ''}</p>
                    </div>
                </div>`;
        });
        if (allPosts.length > 10) seeMoreBox.style.display = 'block';
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

    // মেনু খোলা
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    // মেনু বন্ধ করা
    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    if (closeMenu) closeMenu.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // হেডার বাটনগুলোর লিঙ্ক
    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');
});





