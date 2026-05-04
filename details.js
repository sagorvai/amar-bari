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

let currentOwnerId = null;
let currentPostTitle = null;

document.addEventListener('DOMContentLoaded', async () => {
    // ১. Event Listeners (যে কোনো পেজেই মেনু ও বাটনের কাজ করবে)
    document.getElementById('messageOwnerButton')?.addEventListener('click', startChat);
    document.getElementById('saveButton')?.addEventListener('click', toggleSave);
    document.getElementById('shareButton')?.addEventListener('click', sharePost);
    // এই লাইনটি আপনার ডিটেইলস পেজের DOMContentLoaded এর ভেতরে রাখুন
    document.getElementById('messageOwnerButton')?.addEventListener('click', startChat);
    
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
    document.getElementById('PostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');

    // ২. প্রপার্টি ডাটা লোড
    if (postId) {
        try {
            const doc = await db.collection('properties').doc(postId).get();
            if (doc.exists) {
                const data = doc.data();
                renderDetails(data);
                loadRelatedPosts(data);
                
                currentOwnerId = data.userId || data.uid || data.ownerId || data.owner?.uid;
                currentPostTitle = data.title;

                checkSaveButtonState();
            }
        } catch (e) {
            console.error("Error loading property details:", e);
        }
    }
});

// --- ফাংশন: মেসেজ বাটন ---
async function startChat() {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        alert("চ্যাট করার জন্য লগইন করুন।");
        location.href = "login.html";
        return;
    }

    if (!currentOwnerId) {
        alert("এই পোস্টের মালিকের আইডি পাওয়া যায়নি।");
        return;
    }

    if (currentUser.uid === currentOwnerId) {
        alert("এটি আপনার নিজের পোস্ট, তাই চ্যাট করার প্রয়োজন নেই।");
        return;
    }

    const chatsRef = db.collection('chats');

    try {
        const existingChat = await chatsRef
            .where('postId', '==', postId)
            .where('users', 'array-contains', currentUser.uid)
            .get();

        let chatId;
        if (!existingChat.empty) {
            chatId = existingChat.docs[0].id;
        } else {
            const newChat = await chatsRef.add({
                postId: postId,
                postTitle: currentPostTitle || "প্রপার্টি চ্যাট",
                users: [currentUser.uid, currentOwnerId],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: "চ্যাট শুরু হয়েছে..."
            });
            chatId = newChat.id;
        }

        location.href = `messages.html?chatId=${chatId}`;
    } catch (e) {
        console.error("Error starting chat:", e);
        alert("চ্যাট শুরু করতে সমস্যা হয়েছে।");
    }
}

// --- ফাংশন: সেভ বাটন ---
async function toggleSave() {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) { 
        alert("সেভ করতে লগইন করুন।"); 
        return; 
    }

    const saveRef = db.collection('users').doc(currentUser.uid).collection('savedPosts').doc(postId);
    const doc = await saveRef.get();

    if (doc.exists) {
        await saveRef.delete();
        alert("সেভ লিস্ট থেকে সরিয়ে ফেলা হয়েছে।");
        const saveBtn = document.getElementById('saveButton');
        if (saveBtn) saveBtn.textContent = "Save";
    } else {
        await saveRef.set({ postId: postId, savedAt: new Date() });
        alert("পোস্টটি সেভ হয়েছে!");
        const saveBtn = document.getElementById('saveButton');
        if (saveBtn) saveBtn.textContent = "Saved";
    }
}

// সেভ বাটনের প্রাথমিক স্টেট চেক
async function checkSaveButtonState() {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser || !postId) return;
    
    try {
        const saveRef = db.collection('users').doc(currentUser.uid).collection('savedPosts').doc(postId);
        const doc = await saveRef.get();
        const saveBtn = document.getElementById('saveButton');
        if (saveBtn) {
            saveBtn.textContent = doc.exists ? "Saved" : "Save";
        }
    } catch (e) {
        console.error("Error checking save state", e);
    }
}

// --- ফাংশন: শেয়ার বাটন ---
function sharePost() {
    if (navigator.share) {
        navigator.share({
            title: document.title,
            url: window.location.href
        }).catch(err => console.error(err));
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert("লিঙ্কটি কপি করা হয়েছে!");
    }
}

// রেন্ডারিং ও অন্যান্য ফাংশন
function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    currentOwnerId = data.userId || data.uid || data.ownerId; // মালিকের আইডি সেট
    currentPostTitle = data.title; // পোস্টের শিরোনাম সেট
    
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));
    if (data.documents?.khotian) images.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) images.push(data.documents.sketch.url || data.documents.sketch);

    const gallery = document.getElementById('p-gallery');
    if (gallery) {
        gallery.innerHTML = '';
        images.slice(0, 5).forEach(url => {
            const div = document.createElement('div');
            div.className = 'gal-item';
            div.innerHTML = `<img src="${url}" onclick="openLightbox('${url}')">`;
            gallery.appendChild(div);
        });
    }

    const addRow = (tableId, label, value) => {
        if (!value || value === "" || value === "undefined") return;
        const table = document.getElementById(tableId);
        if (table) {
            table.innerHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
        }
    };

    const basicT = 'table-basic';
    const basicTEl = document.getElementById(basicT);
    if (basicTEl) {
        basicTEl.innerHTML = ""; 
        addRow(basicT, "ক্যাটাগরি", data.category);
        addRow(basicT, "টাইপ", data.type);
        addRow(basicT, "জমির ধরন", data.landType);
        addRow(basicT, "প্রপারটির বয়স", data.propertyAge? `${data.propertyAge} বছর` : "");
        
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
    }

    const ownerSection = document.getElementById('section-owner');
    if (ownerSection) {
        if (data.category === 'বিক্রয়' && data.owner) {
            ownerSection.style.display = 'block';
            const ownT = 'table-owner';
            const ownEl = document.getElementById(ownT);
            if (ownEl) {
                ownEl.innerHTML = "";
                addRow(ownT, "দাতার নাম", data.owner.donorName);
                
                let khotian = data.owner.khotianNo;
                let khotianType = data.owner.khotianNoType || "";
                addRow(ownT, "খতিয়ান নং", khotian ? `${khotian} (${khotianType})` : "");
                
                let dag = data.owner.dagNo;
                let dagType = data.owner.dagNoType || "";
                addRow(ownT, "দাগ নং", dag ? `${dag} (${dagType})` : "");
                
                addRow(ownT, "মৌজা", data.owner.mouja);
            }
        } else {
            ownerSection.style.display = 'none';
        }
    }
    
    const locT = 'table-location';
    const locEl = document.getElementById(locT);
    if (locEl) {
        locEl.innerHTML = "";
        addRow(locT, "জেলা", data.location?.district);
        addRow(locT, "এরিয়া", data.location?.areaType);
        addRow(locT, "উপজেলা", data.location?.upazila);
        addRow(locT, "থানা", data.location?.thana);
        addRow(locT, "ইউনিয়ন", data.location?.union);
        addRow(locT, "ওয়ার্ড নম্বর", data.location?.wardNo);
        addRow(locT, "গ্রাম/এলাকা", data.location?.village);
        addRow(locT, "রাস্তা", data.location?.road);
    }

    if (data.location && data.location.lat && data.location.lng) {
        initSinglePropertyMap(data);
    }

    const conT = 'table-contact';
    const conEl = document.getElementById(conT);
    if (conEl) {
        conEl.innerHTML = "";
        addRow(conT, "প্রাথমিক ফোন", data.phoneNumber);
        addRow(conT, "অতিরিক্ত ফোন", data.secondaryPhone);
        const pCall = document.getElementById('p-call');
        if (pCall) {
            pCall.href = `tel:${data.phoneNumber}`;
        }
    }
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
        if (list) {
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
        }
        if (seeMoreBox && allPosts.length > 10) seeMoreBox.style.display = 'block';
    } catch (e) { console.error(e); }
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
    }

// --- Post-based Chat System Logic ---
async function startChat() {
    const currentUser = firebase.auth().currentUser;
    
    // ১. লগইন চেক
    if (!currentUser) {
        alert("চ্যাট শুরু করার জন্য দয়া করে লগইন করুন।");
        location.href = "login.html";
        return;
    }

    // ২. নিজের পোস্ট কি না চেক
    if (!currentOwnerId) {
        alert("পোস্টের মালিকের তথ্য পাওয়া যায়নি।");
        return;
    }
    if (currentUser.uid === currentOwnerId) {
        alert("এটি আপনার নিজের পোস্ট, তাই চ্যাট করার প্রয়োজন নেই।");
        return;
    }

    // ৩. চ্যাট চেক বা নতুন চ্যাট তৈরি
    const chatsRef = db.collection('chats');
    try {
        // ইতিমধ্যে এই পোস্টের জন্য চ্যাট আছে কি না চেক করছে
        const existingChat = await chatsRef
            .where('postId', '==', postId)
            .where('users', 'array-contains', currentUser.uid)
            .get();

        let chatId;

        if (!existingChat.empty) {
            // চ্যাট থাকলে সেই আইডি নিচ্ছে
            chatId = existingChat.docs[0].id;
        } else {
            // নতুন চ্যাট তৈরি করছে
            const newChat = await chatsRef.add({
                postId: postId,
                postTitle: currentPostTitle || "প্রপার্টি চ্যাট",
                users: [currentUser.uid, currentOwnerId], // দুইজন ইউজার আইডি
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                lastMessage: "চ্যাট শুরু হয়েছে..."
            });
            chatId = newChat.id;
        }

        // চ্যাট পেজে রিডাইরেক্ট
        location.href = `messages.html?chatId=${chatId}`;

    } catch (e) {
        console.error("Error starting chat:", e);
        alert("চ্যাট শুরু করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
    }
}
