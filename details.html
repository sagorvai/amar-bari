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

// গ্লোবালি পোস্টের ডাটা সংরক্ষণ করার জন্য ভেরিয়েবল
let currentPostData = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;
    const doc = await db.collection('properties').doc(postId).get();
    if (doc.exists) {
        const data = doc.data();
        currentPostData = data; // ডাটা সংরক্ষণ করা হলো
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

    // লোকেশন স্ট্রিং দেখানো
    if (document.getElementById('p-location') && data.location) {
        document.getElementById('p-location').textContent = 
            data.location.village && data.location.district ? `${data.location.village}, ${data.location.district}` : "";
    }

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
    
    if (data.category === 'ভাড়া') {
        addRow(basicT, "ভাড়ার ধরন", data.rentType);
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
    
    if (data.utilities && data.utilities.length > 0) {
        addRow(basicT, "সুবিধা সমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);
    }

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
    
function initSinglePropertyMap(data) {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    const map = L.map('map-container').setView([data.location.lat, data.location.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

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

    L.marker([data.location.lat, data.location.lng], { icon: redPinIcon })
     .addTo(map)
     .bindPopup(`<b>${data.title}</b><br>লোকেশন এখানে`)
     .openPopup();
}

async function loadRelatedPostsFunction(currentData) {
    // আগের loadRelatedPosts ফাংশনটি
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

async function loadRelatedPosts(currentData) {
    loadPostsFunction(currentData);
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
}

// DOMContentLoaded ইভেন্টসমূহ
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

    // হেডার বাটনগুলোর লিঙ্ক
    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButtonHeader')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('headerPostButtonSidebar')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');

    // ★ নতুন চ্যাট সিস্টেমের লজিক (p-message বাটনের জন্য)
    const messageButton = document.getElementById('p-message');
    if (messageButton) {
        messageButton.addEventListener('click', async () => {
            const user = firebase.auth().currentUser;
            
            // ১. ব্যবহারকারী লগইন করা আছে কিনা যাচাই
            if (!user) {
                alert('চ্যাট শুরু করতে অনুগ্রহ করে লগইন করুন।');
                location.href = 'auth.html';
                return;
            }

            // ২. পোস্ট ডাটা লোড হয়েছে কিনা যাচাই
            if (!currentPostData) {
                alert('প্রপার্টির তথ্য লোড হচ্ছে, কিছুক্ষণ অপেক্ষা করুন।');
                return;
            }

            const data = currentPostData;
            const buyerId = user.uid;
            // পোস্ট ক্রিয়েটরের আইডি (Data-তে userId বা uid থাকলে সেটি ধরবে)
            const sellerId = data.userId || data.uid; 

            if (!sellerId) {
                alert('প্রপার্টি পোস্টকারীর (Seller) আইডি পাওয়া যায়নি।');
                return;
            }

            // নিজের পোস্টে নিজে চ্যাট করার বাধা
            if (buyerId === sellerId) {
                alert('আপনি নিজের প্রপার্টিতে নিজে চ্যাট করতে পারবেন না।');
                return;
            }

            try {
                const chatRef = db.collection('chats');
                
                // ৩. আগে থেকেই চ্যাট খোলা আছে কিনা চেক করা
                const snapshot = await chatRef
                    .where('postId', '==', postId)
                    .where('buyerId', '==', buyerId)
                    .where('sellerId', '==', sellerId)
                    .get();

                let chatId = '';

                if (!snapshot.empty) {
                    chatId = snapshot.docs[0].id;
                } else {
                    // ৪. নতুন চ্যাট লিস্ট তৈরি করা
                    const newChat = {
                        postId: postId,
                        postTitle: data.title,
                        buyerId: buyerId,
                        sellerId: sellerId,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        lastMessage: 'চ্যাট শুরু হলো',
                        lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    const newDoc = await chatRef.add(newChat);
                    chatId = newDoc.id;
                }

                // ৫. চ্যাট পেজে রিডাইরেক্ট করা
                location.href = `messages.html?chatId=${chatId}`;

            } catch (error) {
                console.error('Error in creating chat list:', error);
                alert('চ্যাট লিস্ট তৈরি করতে সমস্যা হয়েছে।');
            }
        });
    }
});
