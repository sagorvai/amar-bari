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
        setupStarRatingSystem(); // 🆕 নতুন কাস্টম রেটিং সিস্টেম ইনিশিয়েলাইজেশন
    }
});

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    // ১. দাম ও ইউনিট (ভাড়া ও বিক্রয় উভয় ঠিক করা হলো)
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} ${unit}` : "আলোচনা সাপেক্ষ";

    // ইমেজ সেটিংস
    let images = [];
    if (data.images && data.images.length > 0) {
        data.images.forEach(img => {
            if (img && img.url) images.push(img.url);
            else if (typeof img === 'string') images.push(img);
        });
    }

    // খতিয়ান ও স্কেচ এর ছবি যদি থাকে তবে পুশ হবে
    if (data.owner && data.owner.khotianPic) images.push(data.owner.khotianPic);
    if (data.owner && data.owner.sketchPic) images.push(data.owner.sketchPic);

    const mainImg = document.getElementById('p-main-img');
    const gallery = document.getElementById('p-gallery');

    if (images.length > 0) {
        mainImg.src = images[0];
        mainImg.onclick = () => openLightbox(images[0]);
    } else {
        mainImg.src = 'placeholder.jpg';
    }

    if (gallery) {
        gallery.innerHTML = '';
        images.forEach(url => {
            const imgNode = document.createElement('img');
            imgNode.src = url;
            imgNode.className = 'thumb';
            imgNode.onclick = () => {
                mainImg.src = url;
                mainImg.onclick = () => openLightbox(url);
            };
            gallery.appendChild(imgNode);
        });
    }

    // 🆕 নতুন সংযোজন: ফায়ারবেস থেকে পোস্টদাতার ছবি এবং নাম রেন্ডার লজিক
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

    // ডাইনামিক পোস্ট টাইম রেন্ডারিং
    if (data.createdAt) {
        let dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        document.getElementById('pub-time').textContent = formatPostTime(dateObj);
    } else {
        document.getElementById('pub-time').textContent = "কিছুক্ষণ আগে";
    }

    // টেবিল ডাটা ফাংশন
    const addRow = (tableId, label, value) => {
        if (value === undefined || value === null || value === "" || value === "undefined") return;
        const table = document.getElementById(tableId);
        if (table) {
            table.innerHTML += `<tr><td>${label}</td><td><strong>${value}</strong></td></tr>`;
        }
    };

    // ২. 🏠 প্রপার্টির তথ্য টেবিল রেন্ডার
    const basicTable = document.getElementById('table-basic');
    if (basicTable) basicTable.innerHTML = "";

    addRow('table-basic', "ক্যাটাগরি", data.category);
    addRow('table-basic', "টাইপ", data.type);
    addRow('table-basic', "জমির ধরন", data.landType);
    addRow('table-basic', "প্রপার্টির বয়স", data.propertyAge ? `${data.propertyAge} বছর` : "");

    if (data.category === 'ভাড়া') {
        addRow('table-basic', "ভাড়ার ধরন", data.rentType);
        addRow('table-basic', "ওঠার তারিখ", data.moveInDate);
        addRow('table-basic', "নগদ অগ্রিম (জামানত)", data.advance ? `৳ ${data.advance}` : "");
    }

    addRow('table-basic', "রুম সংখ্যা", data.rooms ? `${data.rooms} টি` : "");
    addRow('table-basic', "ডাইনিং", data.dining ? `${data.dining} টি` : "");
    addRow('table-basic', "বাথরুম", data.bathrooms ? `${data.bathrooms} টি` : "");
    addRow('table-basic', "কিচেন", data.kitchen ? `${data.kitchen} টি` : "");
    addRow('table-basic', "বেলকনি", data.balcony ? `${data.balcony} টি` : "");
    addRow('table-basic', "ফ্লোর নম্বর", data.floorNo);
    addRow('table-basic', "তলা সংখ্যা (বিল্ডিং)", data.floors ? `${data.floors} তলা` : "");
    addRow('table-basic', "চলাচলের রাস্তা", data.roadWidth ? `${data.roadWidth} ফিট` : "");
    addRow('table-basic', "ফেসিং (দিক)", data.facing);

    if (data.utilities && data.utilities.length > 0) {
        addRow('table-basic', "সুবিধা সমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);
    }

    let area = data.landArea || data.houseArea || data.areaSqft || data.commercialArea;
    let areaUnit = data.landAreaUnit || data.houseAreaUnit || data.commercialAreaUnit || "স্কয়ার ফিট";
    addRow('table-basic', "পরিমাণ/আয়তন", area ? `${area} ${areaUnit}` : "");

    // ৩. 📑 মালিকানা তথ্য সেকশন
    const ownerSection = document.getElementById('section-owner');
    const ownerTable = document.getElementById('table-owner');
    if (ownerSection && ownerTable) {
        if (data.category === 'বিক্রয়' && data.owner) {
            ownerSection.style.display = 'block';
            ownerTable.innerHTML = "";
            addRow('table-owner', "দাতার নাম", data.owner.donorName);
            addRow('table-owner', "খতিয়ান নং", data.owner.khotianNo ? `${data.owner.khotianNo} (${data.owner.khotianNoType || ''})` : "");
            addRow('table-owner', "দাগ নং", data.owner.dagNo ? `${data.owner.dagNo} (${data.owner.dagNoType || ''})` : "");
            addRow('table-owner', "মৌজা", data.owner.mouja);
        } else {
            ownerSection.style.display = 'none';
        }
    }

    // ৪. 📍 অবস্থান টেবিল রেন্ডার
    const locTable = document.getElementById('table-location');
    if (locTable) locTable.innerHTML = "";
    addRow('table-location', "বিভাগ", data.location?.division);
    addRow('table-location', "জেলা", data.location?.district);
    addRow('table-location', "এরিয়ার ধরন", data.location?.areaType);
    addRow('table-location', "উপজেলা", data.location?.upazila);
    addRow('table-location', "থানা", data.location?.thana);
    addRow('table-location', "ইউনিয়ন", data.location?.union);
    addRow('table-location', "ওয়ার্ড নম্বর", data.location?.wardNo);
    addRow('table-location', "গ্রাম/মহল্লা", data.location?.village);
    addRow('table-location', "রাস্তা/রোড", data.location?.road);

    // ম্যাপ ট্রিক্স লোডার
    if (data.location && data.location.lat && data.location.lng) {
        try {
            const map = L.map('map-container').setView([data.location.lat, data.location.lng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
            L.marker([data.location.lat, data.location.lng]).addTo(map)
                .bindPopup(`<b>${data.title || 'প্রপার্টি অবস্থান'}</b>`).openPopup();
        } catch (e) { console.error("ম্যাপ লোড এরর:", e); }
    }

    // ৫. 📞 যোগাযোগ টেবিল রেন্ডার
    const conTable = document.getElementById('table-contact');
    if (conTable) conTable.innerHTML = "";
    addRow('table-contact', "প্রাথমিক ফোন", data.phoneNumber);
    addRow('table-contact', "অতিরিক্ত ফোন", data.secondaryPhone);

    const callBtn = document.getElementById('p-call');
    if (callBtn && data.phoneNumber) {
        callBtn.href = `tel:${data.phoneNumber}`;
    }

    // চ্যাট ইনবক্স মেসেজ বাটন ক্লিক ইন্টিগ্রেশন
    const msgBtn = document.getElementById('p-message');
    if (msgBtn) {
        msgBtn.onclick = () => {
            const user = firebase.auth().currentUser;
            if (!user) {
                alert("মেসেজ করতে প্রথমে লগইন করুন।");
                window.location.href = "auth.html";
                return;
            }
            if (user.uid === data.userId) {
                alert("এটি আপনার নিজের পোস্ট!");
                return;
            }
            const chatId = [user.uid, data.userId].sort().join('_') + `_${postId}`;
            window.location.href = `messages.html?chatId=${chatId}&postId=${postId}`;
        };
    }
}

// 🆕 নতুন সংযোজন: ৫-স্টার রেটিং জেনারেটর মেকানিজম (লোকাল স্টোরেজ ব্যাকড)
function setupStarRatingSystem() {
    const starZone = document.getElementById('starRatingZone');
    const statusText = document.getElementById('ratingStatusText');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    const storageKey = `rated_stars_${postId}`;
    
    // আগের সেভ করা রেটিং ভ্যালু রিড করা
    let savedRating = localStorage.getItem(storageKey);
    
    if (savedRating) {
        updateStarDisplay(stars, parseInt(savedRating));
        statusText.textContent = `আপনার রেটিং: ${savedRating} স্টার`;
    }

    stars.forEach(star => {
        // মাউস বা টাচ ওভার ইন্টারেকশন ইফেক্ট
        star.addEventListener('click', () => {
            const ratingValue = parseInt(star.getAttribute('data-value'));
            localStorage.setItem(storageKey, ratingValue);
            updateStarDisplay(stars, ratingValue);
            statusText.textContent = `আপনার রেটিং: ${ratingValue} স্টার`;
        });
    });
}

// স্টারের ভিজ্যুয়াল ক্লাস ফিল-আপ করার হেল্পার ফাংশন
function updateStarDisplay(stars, value) {
    stars.forEach(star => {
        const starVal = parseInt(star.getAttribute('data-value'));
        if (starVal <= value) {
            star.textContent = 'star'; // ফিল স্টার আইকন
            star.classList.add('active');
        } else {
            star.textContent = 'star_border'; // বর্ডার স্টার আইকন
            star.classList.remove('active');
        }
    });
}

// বাংলা পোস্ট টাইম কনভার্টার
function formatPostTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffMins < 1) return "এইমাত্র";
    if (diffMins < 60) return `${diffMins} মিনিট আগে`;
    if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
    
    return date.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
}

// সম্পর্কিত পোস্ট লোড করার লজিক
async function loadRelatedPosts(currentData) {
    try {
        const list = document.getElementById('related-list');
        const seeMoreBox = document.getElementById('see-more-box');
        if (!list) return;

        const snapshot = await db.collection('properties').where('category', '==', currentData.category).limit(10).get();
        let allPosts = [];
        snapshot.forEach(doc => {
            if (doc.id !== postId) allPosts.push({ id: doc.id, ...doc.data() });
        });

        list.innerHTML = "";
        if (allPosts.length === 0) {
            list.innerHTML = "<p>কোনো সম্পর্কিত পোস্ট পাওয়া যায়নি।</p>";
            return;
        }

        allPosts.slice(0, 4).forEach(post => {
            let pAmt = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let imgUrl = (post.images && post.images[0]) ? (post.images[0].url || post.images[0]) : 'placeholder.jpg';
            
            list.innerHTML += `
                <div class="related-card" onclick="location.href='details.html?id=${post.id}'">
                    <img src="${imgUrl}" alt="Related">
                    <h4>${post.title || 'শিরোনামহীন'}</h4>
                    <p class="price">৳ ${pAmt || 'আলোচনা সাপেক্ষ'}</p>
                </div>`;
        });

        if (allPosts.length > 4 && seeMoreBox) seeMoreBox.style.display = 'block';
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
