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
    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            const data = doc.data();
            renderDetails(data);
            loadRelatedPosts(data);
            setupStarRatingSystem(); // ⭐ FIX: রেটিং সিস্টেম এখানে চালু করা হলো
        }
    } catch (e) {
        console.error("ডেটা লোড করতে সমস্যা:", e);
    }
});

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    // ১. দাম ও ইউনিট
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // ইমেজ গ্যালারি
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

    // 🆕 পোস্টদাতার ডাটা লোড ও প্রোফাইল পেইজ রিডাইরেক্ট লজিক
    if (data.userId) {
        db.collection('users').doc(data.userId).get().then(userDoc => {
            if (userDoc.exists) {
                const userData = userDoc.data();
                document.getElementById('pub-name').textContent = userData.fullName || userData.name || "সম্মանিত বিক্রেতা";
                if (userData.profilePic) {
                    document.getElementById('pub-avatar').src = userData.profilePic;
                }
            } else {
                document.getElementById('pub-name').textContent = "সাধারণ ইউজার";
            }
        }).catch(() => {
            document.getElementById('pub-name').textContent = "আমার বাড়ি ইউজার";
        });

        // ছবি ও নামের বক্সের ওপর ক্লিক করলে সেলার প্রোফাইলে নিয়ে যাবে userId সহ
        const authorTrigger = document.getElementById('authorProfileTrigger');
        if (authorTrigger) {
            authorTrigger.onclick = () => {
                window.location.href = `seller-profile.html?userId=${data.userId}`;
            };
        }
    } else {
        document.getElementById('pub-name').textContent = "বিজ্ঞাপনদাতা";
    }

    if (data.createdAt) {
        let dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        document.getElementById('pub-time').textContent = formatPostTime(dateObj);
    } else {
        document.getElementById('pub-time').textContent = "কিছুক্ষণ আগে";
    }

    // ⭐ FIX 1: ডুপ্লিকেট addRow ফাংশন ডিক্লেয়ারেশন রিমুভ করে একটি রাখা হলো
    const addRow = (tableId, label, value) => {
        if (!value || value === "" || value === "undefined") return;
        const table = document.getElementById(tableId);
        if (table) table.innerHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // ২. 🏠 প্রপার্টির তথ্য
    const basicT = 'table-basic';
    if (document.getElementById(basicT)) {
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
    }

    // ৩. 📑 মালিকানা তথ্য
    const ownerSection = document.getElementById('section-owner');
    if (ownerSection) {
        if (data.category === 'বিক্রয়' && data.owner) {
            ownerSection.style.display = 'block';
            const ownT = 'table-owner';
            if (document.getElementById(ownT)) {
                document.getElementById(ownT).innerHTML = "";
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
    
    // ৪. 📍 অবস্থান
    const locT = 'table-location';
    if (document.getElementById(locT)) {
        document.getElementById(locT).innerHTML = "";
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

    // ৫. 📞 যোগাযোগ ও মেসেজ অ্যাকশন
    const conT = 'table-contact';
    if (document.getElementById(conT)) {
        document.getElementById(conT).innerHTML = "";
        addRow(conT, "প্রাথমিক ফোন", data.phoneNumber);
        addRow(conT, "অতিরিক্ত ফোন", data.secondaryPhone);
    }
    if (document.getElementById('p-call')) {
        document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
    }

    // 💬 FIX 3: মেসেজ সিস্টেম বাটন অ্যাকশন হ্যান্ডলার যুক্ত করা হলো
    const msgBtn = document.getElementById('p-message');
    if (msgBtn) {
        msgBtn.onclick = () => {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) { 
                alert("মেসেজ করতে প্রথমে লগইন করুন।"); 
                window.location.href = "auth.html"; 
                return; 
            }
            if (currentUser.uid === data.userId) { 
                alert("এটি আপনার নিজের পোস্ট!"); 
                return; 
            }
            const chatId = [currentUser.uid, data.userId].sort().join('_') + `_${postId}`;
            window.location.href = `messages.html?chatId=${chatId}&postId=${postId}`;
        };
    }
}
    
function initSinglePropertyMap(data) {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;
    try {
        const map = L.map('map-container').setView([data.location.lat, data.location.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const propertyType = data.type || data.propertyType || 'প্রপার্টি';
        const redPinIcon = L.divIcon({
            html: `
                <div style="position: relative; width: 60px; height: 35px; display: flex; flex-direction: column; align-items: center;">
                    <div style="background-color: #e74c3c; color: white; padding: 4px 8px; border-radius: 15px; font-size: 11px; font-weight: bold; white-space: nowrap; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); text-align: center; min-width: 50px;">
                        ${propertyType}
                    </div>
                    <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 10px solid #e74c3c; margin-top: -2px;"></div>
                </div>`,
            className: 'custom-pin',
            iconSize: [60, 45],
            iconAnchor: [30, 45]
        });

        L.marker([data.location.lat, data.location.lng], { icon: redPinIcon })
         .addTo(map)
         .bindPopup(`<b>${data.title}</b><br>লোকেশন এখানে`)
         .openPopup();
    } catch (e) {
        console.error("ম্যাপ লোড এরর:", e);
    }
}

function setupStarRatingSystem() {
    const starZone = document.getElementById('starRatingZone');
    const statusText = document.getElementById('ratingStatusText');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    const storageKey = `rated_stars_${postId}`;
    let savedRating = localStorage.getItem(storageKey);
    
    if (savedRating) {
        updateStarDisplay(stars, parseInt(savedRating));
        statusText.textContent = `আপনার রেটিং: ${savedRating} স্টার`;
    }

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const ratingValue = parseInt(star.getAttribute('data-value'));
            localStorage.setItem(storageKey, ratingValue);
            updateStarDisplay(stars, ratingValue);
            statusText.textContent = `আপনার রেটিং: ${ratingValue} স্টার`;
        });
    });
}

function updateStarDisplay(stars, value) {
    stars.forEach(star => {
        const starVal = parseInt(star.getAttribute('data-value'));
        if (starVal <= value) {
            star.textContent = 'star';
            star.classList.add('active');
        } else {
            star.textContent = 'star_border';
            star.classList.remove('active');
        }
    });
}

function formatPostTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMins / 60);
    const diffDay = Math.floor(diffHours / 24);
    const Week = Math.floor(diffDays / 7);
    const diffMonth = Math.floor(diffWeeks / 4);
    
    if (diffMins < 1) return "এইমাত্র";
    if (diffMins < 60) return `${diffMins} মিনিট আগে`;
    if (diffHour < 24) return `${diffHours} ঘণ্টা আগে`;
    if (diffDay < 7) return `${diffDays} দিন আগে`;
    if (Week < 4) return `${diffWeek} সপ্তাহ আগে`;
    if (diffMonth < 3) return `${diffMonth} মাস আগে`;
    return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
}

async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');
    const seeMoreBox = document.getElementById('see-more-box');
    if (!list) return;
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

        list.innerHTML = "";
        allPosts.slice(0, 10).forEach(post => {
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
        if (allPosts.length > 10 && seeMoreBox) seeMoreBox.style.display = 'block';
    } catch (e) { console.error(e); }
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
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

    if (overlay) overlay.addEventListener('click', closeSidebar);

    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');
});

// 🆕 লগইন করা ইউজারের প্রোফাইল পিকচার হেডারে দেখানোর লজিক
firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    
    if (user && headerProfileImg) {
        try {
            // ফায়ারবেস 'users' কালেকশন থেকে ইউজারের ডাটা আনা হচ্ছে
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().profilePic) {
                // ডাটাবেজে প্রোফাইল পিকচার থাকলে সেটি হেডারে সেট হবে
                headerProfileImg.src = userDoc.data().profilePic;
            } else if (user.photoURL) {
                // গুগল লগইন করা থাকলে গুগল প্রোফাইল পিকচার সেট হবে
                headerProfileImg.src = user.photoURL;
            } else {
                // কোনো ছবি না থাকলে একটি ডিফল্ট অ্যাভাটার সেট হবে
                headerProfileImg.src = 'assets/images/default-avatar.png'; // আপনার প্রজেক্টের ডিফল্ট ছবির পাথ দিন
            }
        } catch (error) {
            console.error("হেডার প্রোফাইল পিকচার লোড করতে ব্যর্থ:", error);
        }
    }
});

