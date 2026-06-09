// ফায়ারবেস ব্যাকএন্ড কনফিগারেশন স্ট্রাকচার
const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};

// ইনিশিয়েলাইজেশন প্রোটেকশন চেক লুপ
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

// URL রাউটার কোয়েরি প্যারামিটার আইডি এক্সট্রাকশন লজিক
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;

    try {
        // রিয়েল-টাইম ডাটা ফেচিং আর্কিটেকচার
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            const data = doc.data();
            renderDetails(data);
            loadRelatedPosts(data);
            setupLikeSystem(); // লাইক রেন্ডার ট্র্যাকিং মডিউল
        } else {
            console.error("কোনো প্রপার্টি পাওয়া যায়নি!");
        }
    } catch (error) {
        console.error("ডিটেইলস লোড করতে সমস্যা হয়েছে:", error);
    }
});

// মূল UI বাইন্ডিং রেন্ডার ইঞ্জিন ফাংশন
function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "শিরোনামহীন";
    document.getElementById('p-desc').textContent = data.description || "কোনো বিবরণ দেওয়া হয়নি।";

    // ১. প্রপার্টি কস্ট প্রাইস ক্যালকুলেশন ম্যাপিং
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || "";
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // ২. ইমেজ প্রসেসিং অ্যারে হ্যান্ডলিং মেকানিজম
    let images = [];
    if (data.images) {
        data.images.forEach(img => {
            if (img && img.url) images.push(img.url);
            else if (typeof img === 'string') images.push(img);
        });
    }
    
    // ব্যাকএন্ড খতিয়ান ও স্কেচ ফাইল পুশ ট্র্যাকিং (প্রাপ্যতা সাপেক্ষে)
    if (data.owner?.khotianPic) images.push(data.owner.khotianPic);
    if (data.owner?.sketchPic) images.push(data.owner.sketchPic);

    const gallery = document.getElementById('p-gallery');
    const mainImg = document.getElementById('p-main-img');
    
    if (images.length > 0) {
        mainImg.src = images[0]; // ১ম ছবিকে মেইন ফিচারড করা হলো
    }

    if (gallery) {
        gallery.innerHTML = '';
        if (images.length === 0) {
            gallery.innerHTML = `<div class="gal-item"><img src="placeholder.jpg"></div>`;
        } else {
            images.slice(0, 4).forEach((url, index) => {
                const div = document.createElement('div');
                div.className = 'gal-item';
                div.innerHTML = `<img src="${url}" onclick="changeMainImage('${url}')">`;
                gallery.appendChild(div);
            });
        }
    }

    // ৩. 🆕 নতুন সংযোজন: পোস্টদাতার ডেফিনিটিভ প্রোফাইল ও টাইম রেন্ডারিং ইন্টিগ্রেশন
    if (data.userId) {
        db.collection('users').doc(data.userId).get().then(userDoc => {
            if (userDoc.exists) {
                const uData = userDoc.data();
                document.getElementById('pub-name').textContent = uData.fullName || uData.name || "সম্মানিত ইউজার";
                if (uData.profilePic) {
                    document.getElementById('pub-avatar').src = uData.profilePic;
                }
            } else {
                document.getElementById('pub-name').textContent = "অজানা পোস্টদাতা";
            }
        }).catch(() => {
            document.getElementById('pub-name').textContent = "ব্যবহারকারী";
        });
    }

    // ডাইনামিক ডেট ফরমেট রেন্ডারিং ইঞ্জিন লজিক
    if (data.createdAt) {
        let dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        document.getElementById('pub-time').textContent = formatPostTime(dateObj);
    } else {
        document.getElementById('pub-time').textContent = "কিছুক্ষণ আগে";
    }

    // ৪. ডাইনামিক টেবিল রো ক্রিয়েশন রুলস
    const addRow = (tableId, label, value) => {
        if (value === undefined || value === null || value === "" || value === "undefined") return;
        const table = document.getElementById(tableId);
        if (!table) return;
        table.innerHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // ৫. 🏠 বেসিক প্রপার্টি ডাটা শীট জেনারেটর
    const basicT = 'table-basic';
    const basicTable = document.getElementById(basicT);
    if (basicTable) basicTable.innerHTML = "";

    addRow(basicT, "ক্যাটাগরি", data.category);
    addRow(basicT, "টাইপ", data.type);
    addRow(basicT, "জমির ধরন", data.landType);
    addRow(basicT, "প্রপার্টির বয়স", data.propertyAge ? `${data.propertyAge} বছর` : "");

    if (data.category === 'ভাড়া') {
        addRow(basicT, "ভাড়ার ধরন", data.rentType);
        addRow(basicT, "ওঠার তারিখ", data.moveInDate);
        addRow(basicT, "নগদ অগ্রিম (জামানত)", data.advance ? `৳ ${data.advance} টাকা` : "");
    }

    addRow(basicT, "রুম সংখ্যা", data.rooms ? `${data.rooms} টি` : "");
    addRow(basicT, "ডাইনিং", data.dining ? `${data.dining} টি` : "");
    addRow(basicT, "বাথরুম", data.bathrooms ? `${data.bathrooms} টি` : "");
    addRow(basicT, "কিচেন", data.kitchen ? `${data.kitchen} টি` : "");
    addRow(basicT, "বেলকনি", data.balcony ? `${data.balcony} টি` : "");
    addRow(basicT, "ফ্লোর নম্বর", data.floorNo);
    addRow(basicT, "তলা সংখ্যা (বিল্ডিং)", data.floors ? `${data.floors} তলা` : "");
    addRow(basicT, "চলাচলের রাস্তা", data.roadWidth ? `${data.roadWidth} ফিট` : "");
    addRow(basicT, "ফেসিং (দিক)", data.facing);

    if (data.utilities && data.utilities.length > 0) {
        addRow(basicT, "সুবিধা সমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);
    }

    let area = data.landArea || data.houseArea || data.areaSqft || data.commercialArea;
    let areaUnit = data.landAreaUnit || data.houseAreaUnit || data.commercialAreaUnit || "স্কয়ার ফিট";
    addRow(basicT, "পরিমাণ/আয়তন", area ? `${area} ${areaUnit}` : "");

    // ৬. 📑 বিক্রয় অপশনের সিকিউর ওনারশিপ ডাটা ভিউ
    const ownerSection = document.getElementById('section-owner');
    if (ownerSection) {
        if (data.category === 'বিক্রয়' && data.owner) {
            ownerSection.style.display = 'block';
            const ownT = 'table-owner';
            const ownerTable = document.getElementById(ownT);
            if (ownerTable) ownerTable.innerHTML = "";

            addRow(ownT, "দাতার নাম", data.owner.donorName);
            addRow(ownT, "খতিয়ান নং", data.owner.khotianNo ? `${data.owner.khotianNo} (${data.owner.khotianNoType || ''})` : "");
            addRow(ownT, "দাগ নং", data.owner.dagNo ? `${data.owner.dagNo} (${data.owner.dagNoType || ''})` : "");
            addRow(ownT, "মৌজা", data.owner.mouja);
        } else {
            ownerSection.style.display = 'none';
        }
    }

    // ৭. 📍 জিও-লোকেশন ইনফরমেশন প্রসেসর
    const locT = 'table-location';
    const locTable = document.getElementById(locT);
    if (locTable) locTable.innerHTML = "";

    addRow(locT, "বিভাগ", data.location?.division);
    addRow(locT, "জেলা", data.location?.district);
    addRow(locT, "এরিয়ার ধরন", data.location?.areaType);
    addRow(locT, "উপজেলা", data.location?.upazila);
    addRow(locT, "থানা", data.location?.thana);
    addRow(locT, "ইউনিয়ন", data.location?.union);
    addRow(locT, "ওয়ার্ড নম্বর", data.location?.wardNo);
    addRow(locT, "গ্রাম/মহল্লা", data.location?.village);
    addRow(locT, "রাস্তা/রোড", data.location?.road);

    if (data.location && data.location.lat && data.location.lng) {
        initSinglePropertyMap(data);
    }

    // ৮. 📞 ফোন ডায়ালিং ইন্টারঅ্যাকশন কন্ট্রোলার
    const conT = 'table-contact';
    const conTable = document.getElementById(conT);
    if (conTable) conTable.innerHTML = "";

    addRow(conT, "প্রাথমিক ফোন", data.phoneNumber);
    addRow(conT, "অতিরিক্ত ফোন", data.secondaryPhone);

    const callBtn = document.getElementById('p-call');
    if (callBtn && data.phoneNumber) {
        callBtn.href = `tel:${data.phoneNumber}`;
    }

    // ৯. বায়ার-সেলার কাস্টম চ্যাট মেকানিজম বাটন একটিভেশন মডিউল
    setupPostBasedChatButton(data);
}

// 🆕 নতুন সংযোজন: ডাইনামিক লাইক বাটন ইন্টারঅ্যাকশন ও স্টেট হ্যান্ডলিং ফাংশন
function setupLikeSystem() {
    const likeBtn = document.getElementById('likeButton');
    if (!likeBtn) return;

    // সেশন মেমরিতে বা লোকাল স্টোরেজে লাইক স্ট্যাটাস সেভ রাখার মেকানিজম
    const storageKey = `liked_${postId}`;
    let isLiked = localStorage.getItem(storageKey) === 'true';

    if (isLiked) {
        likeBtn.classList.add('liked');
    }

    likeBtn.addEventListener('click', () => {
        const user = auth.currentUser;
        if (!user) {
            alert("পোস্টে লাইক দিতে অনুগ্রহ করে আগে লগইন করুন।");
            return;
        }

        isLiked = !isLiked;
        if (isLiked) {
            likeBtn.classList.add('liked');
            localStorage.setItem(storageKey, 'true');
        } else {
            likeBtn.classList.remove('liked');
            localStorage.removeItem(storageKey);
        }
    });
}

// ডেট অবজেক্ট কনভার্টার (বাংলা ফরম্যাটিং কাস্টম রুলস)
function formatPostTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return "এইমাত্র";
    if (diffMins < 60) return `${diffMins} মিনিট আগে`;
    if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
    
    // সাধারণ স্ট্যান্ডার্ড ডেট ডিসপ্লে রুলস
    return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
}

// থাম্বনেইলে ক্লিক করলে বড় ছবি পরিবর্তন করার হ্যান্ডলার
function changeMainImage(url) {
    document.getElementById('p-main-img').src = url;
}

// লাইটবক্স মোডাল ওপেন ফাংশন
function openLightbox(url) {
    const img = document.getElementById('lb-img');
    const lightbox = document.getElementById('lightbox');
    if (img) img.src = url;
    if (lightbox) lightbox.style.display = 'flex';
}

// কাস্টম পোস্ট-বেসড সিকিউর মেসেজিং ইঞ্জিন
function setupPostBasedChatButton(data) {
    const messageBtn = document.getElementById('messageOwnerBtn');
    if (!messageBtn) return;

    const newBtn = messageBtn.cloneNode(true);
    messageBtn.parentNode.replaceChild(newBtn, messageBtn);

    newBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("মেসেজ করতে প্রথমে লগইন করুন।");
            window.location.href = "auth.html";
            return;
        }

        if (user.uid === data.userId) {
            alert("এটি আপনার নিজের পোস্ট! নিজেকে মেসেজ করা যাবে না।");
            return;
        }

        newBtn.disabled = true;
        newBtn.textContent = "চ্যাট তৈরি হচ্ছে...";

        try {
            const buyerId = user.uid;
            const sellerId = data.userId;
            const propertyId = postId;

            const sortedParticipants = [buyerId, sellerId].sort();
            const chatId = `${propertyId}_${sortedParticipants[0]}_${sortedParticipants[1]}`;

            const chatRef = db.collection('chats').doc(chatId);
            const chatDoc = await chatRef.get();

            if (!chatDoc.exists) {
                // সমসাময়িক ইউজার ডাটা ক্যাচিং
                const [buyerProfile, sellerProfile] = await Promise.all([
                    fetchUserProfile(buyerId),
                    fetchUserProfile(sellerId)
                ]);

                await chatRef.set({
                    participants: [buyerId, sellerId],
                    propertyId: propertyId,
                    propertyTitle: data.title || "",
                    propertyImage: data.images?.[0]?.url || data.images?.[0] || "",
                    buyerId,
                    sellerId,
                    buyerName: buyerProfile.name || user.displayName || "ক্রেতা",
                    sellerName: sellerProfile.name || "বিক্রেতা",
                    buyerPhoto: buyerProfile.photoURL || user.photoURL || "",
                    sellerPhoto: sellerProfile.photoURL || "",
                    lastMessage: "",
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }

            window.location.href = `messages.html?chatId=${chatId}`;
        } catch (error) {
            console.error("চ্যাট তৈরি করতে সমস্যা হয়েছে:", error);
            alert("দুঃখিত, চ্যাট রুম তৈরি করা যায়নি। আবার চেষ্টা করুন।");
            newBtn.disabled = false;
            newBtn.textContent = "মেসেজ";
        }
    });
}

// হেল্পার প্রোফাইল সিঙ্ক মডিউল
async function fetchUserProfile(uid) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const data = userDoc.data() || {};
            return {
                name: data.fullName || data.name || "", 
                photoURL: data.profilePic || data.photoURL || "" 
            };
        }
    } catch (error) {
        console.error("ইউজার প্রোফাইল ডাটা আনতে সমস্যা:", error);
    }
    return { name: "", photoURL: "" };
}

// একক লিফলেট ম্যাপ ইন্টিগ্রেশন প্রসেসর
function initSinglePropertyMap(data) {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;

    const map = L.map('map-container').setView([data.location.lat, data.location.lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const propertyType = data.type || 'প্রপার্টি';

    const redPinIcon = L.divIcon({
        html: `
            <div style="position: relative; width: 60px; height: 35px; display: flex; flex-direction: column; align-items: center;">
                <div style="background-color: #e74c3c; color: white; padding: 4px 8px; border-radius: 15px; font-size: 11px; font-weight: bold; white-space: nowrap; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); z-index: 2; text-align: center; min-width: 50px;">
                    ${propertyType}
                </div>
                <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 10px solid #e74c3c; margin-top: -2px; z-index: 1;"></div>
            </div>`,
        className: 'custom-pin',
        iconSize: [60, 45],
        iconAnchor: [30, 45]
    });

    L.marker([data.location.lat, data.location.lng], { icon: redPinIcon })
        .addTo(map)
        .bindPopup(`<b>${data.title}</b>`)
        .openPopup();
}

// রিলেটেড বা সিমিলার ক্যাটাগরি প্রপার্টি ম্যাচিং লুপ অ্যালগরিদম
async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');
    if (!list) return;

    try {
        const snapshot = await db.collection('properties')
            .where('category', '==', currentData.category)
            .limit(10)
            .get();

        let allPosts = [];
        snapshot.forEach(doc => {
            if (doc.id !== postId) allPosts.push({ id: doc.id, ...doc.data() });
        });

        // স্মার্ট সর্টিং: একই গ্রাম বা থনা মিললে তালিকায় সবার আগে পুশ হবে
        allPosts.sort((a, b) => {
            const aVillage = (a.location?.village === currentData.location?.village) ? 1 : 0;
            const bVillage = (b.location?.village === currentData.location?.village) ? 1 : 0;
            if (aVillage !== bVillage) return bVillage - aVillage;

            const aThana = (a.location?.thana === currentData.location?.thana) ? 1 : 0;
            const bThana = (b.location?.thana === currentData.location?.thana) ? 1 : 0;
            return bThana - aThana;
        });

        list.innerHTML = "";
        if(allPosts.length === 0) {
            list.innerHTML = "<p style='color:#7f8c8d; font-size:14px;'>কোনো সম্পর্কিত পোস্ট পাওয়া যায়নি।</p>";
            return;
        }

        allPosts.slice(0, 4).forEach(post => {
            let pAmt = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let pUnit = post.priceUnit || "";
            let imgUrl = (post.images?.[0]?.url || post.images?.[0] || 'placeholder.jpg');

            list.innerHTML += `
                <div class="rel-card" onclick="location.href='details.html?id=${post.id}'">
                    <img src="${imgUrl}">
                    <div class="rel-info">
                        <h4 class="rel-title">${post.title || 'শিরোনামহীন'}</h4>
                        <p class="rel-price">৳ ${pAmt || 'আলোচনা সাপেক্ষ'} ${pUnit ? `(${pUnit})` : ''}</p>
                        <p class="rel-loc">${post.location?.village || ''}, ${post.location?.thana || ''}</p>
                    </div>
                </div>`;
        });
    } catch (e) {
        console.error("সম্পর্কিত পোস্ট লোড করা যায়নি:", e);
    }
}

// সাইডবার ডায়ালগ ওপেনার লজিক ট্রিগার
document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
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

    if (overlay) overlay.addEventListener('click', closeSidebar);
});
