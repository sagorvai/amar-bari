const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",\n    projectId: "amar-bari-website",
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
            
            // পোস্টদাতার তথ্য ফেচ এবং লাইক বাটন সেটআপ
            loadPublisherInfo(data.userId, data.createdAt);
            setupLikeButton(postId);
            
            // চ্যাট বাটনের আইডি অসঙ্গতি দূর করে সেটআপ (details.html এর নতুন id এর সাথে মিল রেখে)
            setupPostBasedChatButton(postId, data.userId);
        }
    } catch (error) {
        console.error("ডিটেইলস লোড করতে সমস্যা হয়েছে:", error);
    }
});

// ১. পোস্টদাতার প্রোফাইল তথ্য লোড করার নতুন ফাংশন
async function loadPublisherInfo(userId, createdAt) {
    const avatarEl = document.getElementById('publisher-avatar');
    const nameEl = document.getElementById('publisher-name');
    const timeEl = document.getElementById('publisher-time');

    // ডিফল্ট অ্যাভাটার
    avatarEl.src = 'https://www.w3schools.com/howto/img_avatar.png';

    // ১.১ টাইমস্ট্যাম্প ফরম্যাটিং
    if (createdAt) {
        let dateObj = createdAt.seconds ? new Date(createdAt.seconds * 1000) : new Date(createdAt);
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        timeEl.innerHTML = `<i class="material-icons" style="font-size: 14px;">schedule</i> ${dateObj.toLocaleDateString('bn-BD', options)}`;
    }

    if (!userId) {
        nameEl.textContent = "অজানা ব্যবহারকারী";
        return;
    }

    // ১.২ ব্যবহারকারীর ডাটাবেজ (`users`) থেকে নাম ও ছবি আনা
    try {
        const userDoc = await db.collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            // profile.js অনুযায়ী fullName এবং profilePic ফিল্ড চেক করা হচ্ছে
            nameEl.textContent = userData.fullName || userData.name || "নামহীন ব্যবহারকারী";
            if (userData.profilePic || userData.profileImageURL) {
                avatarEl.src = userData.profilePic || userData.profileImageURL;
            }
        } else {
            nameEl.textContent = "আমার বাড়ি ইউজার";
        }
    } catch (err) {
        console.error("ইউজার ডেটা লোড করা যায়নি:", err);
        nameEl.textContent = "আমার বাড়ি ইউজার";
    }
}

// ২. লাইক বাটনের লজিক (Firestore Sync সহ)
function setupLikeButton(postId) {
    const likeBtn = document.getElementById('btn-post-like');
    if (!likeBtn) return;

    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            likeBtn.onclick = () => alert('পোস্ট লাইক করতে প্রথমে লগইন করুন!');
            return;
        }

        const userLikeRef = db.collection('users').doc(user.uid).collection('likedPosts').doc(postId);

        // লাইভ চেক ব্যবহারকারী ইতিমধ্যে লাইক করেছে কিনা
        userLikeRef.onSnapshot((doc) => {
            if (doc.exists) {
                likeBtn.classList.add('liked');
                likeBtn.innerHTML = `<i class="material-icons">favorite</i>`;
            } else {
                likeBtn.classList.remove('liked');
                likeBtn.innerHTML = `<i class="material-icons">favorite_border</i>`;
            }
        });

        likeBtn.onclick = async () => {
            const doc = await userLikeRef.get();
            if (doc.exists) {
                await userLikeRef.delete();
            } else {
                await userLikeRef.set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
            }
        };
    });
}

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    // ১. দাম ও ইউনিট (ভাড়া ও বিক্রয় উভয় ঠিক করা হলো)
    let amount = "";
    let unit = "";
    if (data.purpose === 'rent') {
        amount = data.monthlyRent || data.rent || "আলোচনা সাপেক্ষ";
        unit = " / মাস";
    } else {
        amount = data.totalPrice || data.price || "আলোচনা সাপেক্ষ";
        unit = "";
    }
    const displayPrice = typeof amount === 'number' ? `৳ ${amount.toLocaleString('bn-BD')}${unit}` : amount;

    // ২. ইমেজ স্লাইডার রেন্ডার লজিক
    const track = document.getElementById('slider-track');
    const dotsContainer = document.getElementById('slider-dots');
    const prevBtn = document.getElementById('slider-prev');
    const nextBtn = document.getElementById('slider-next');

    if (data.images && data.images.length > 0) {
        data.images.forEach((imgObj, index) => {
            const slide = document.createElement('div');
            slide.className = 'slide';
            const img = document.createElement('img');
            img.src = imgObj.url;
            img.alt = `Property Image ${index + 1}`;
            img.onclick = () => openLightbox(imgObj.url);
            slide.appendChild(img);
            track.appendChild(slide);

            const dot = document.createElement('div');
            dot.className = `dot ${index === 0 ? 'active' : ''}`;
            dot.onclick = () => goToSlide(index);
            dotsContainer.appendChild(dot);
        });

        if (data.images.length > 1) {
            prevBtn.style.display = 'block';
            nextBtn.style.display = 'block';
        }
    } else {
        const slide = document.createElement('div');
        slide.className = 'slide';
        const img = document.createElement('img');
        img.src = 'placeholder-image.jpg'; 
        slide.appendChild(img);
        track.appendChild(slide);
    }

    let currentSlide = 0;
    const slides = document.querySelectorAll('.slide');
    const dots = document.querySelectorAll('.dot');

    function updateSlider() {
        track.style.transform = `translateX(-${currentSlide * 100}%)`;
        dots.forEach((d, idx) => d.classList.toggle('active', idx === currentSlide));
    }

    function goToSlide(index) {
        currentSlide = index;
        updateSlider();
    }

    if (prevBtn) {
        prevBtn.onclick = () => {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            updateSlider();
        };
    }
    if (nextBtn) {
        nextBtn.onclick = () => {
            currentSlide = (currentSlide + 1) % slides.length;
            updateSlider();
        };
    }

    // ৩. টেবিল ডেটা জেনারেট করা (হুবহু অপরিবর্তিত)
    const mainTable = document.getElementById('table-main');
    let mainHTML = `
        <tr><td class="label">উদ্দেশ্য</td><td>${data.purpose === 'rent' ? 'ভাড়া দেওয়া হবে' : 'বিক্রি করা হবে'}</td></tr>
        <tr><td class="label">ক্যাটাগরি</td><td>${getCategoryBangla(data.category)}</td></tr>
        <tr><td class="label">মূল্য/ভাড়া</td><td style="color:var(--success); font-weight:bold;">${displayPrice}</td></tr>
    `;
    if (data.category === 'plot') {
        mainHTML += `<tr><td class="label">জমির পরিমাণ</td><td>${data.landSize || ''} ${data.landUnit || ''}</td></tr>`;
    } else {
        mainHTML += `<tr><td class="label">আয়তন</td><td>${data.propertySize || ''} বর্গফুট</td></tr>`;
    }
    mainTable.innerHTML = mainHTML;

    const interiorTable = document.getElementById('table-interior');
    if (data.category !== 'plot') {
        interiorTable.innerHTML = `
            <tr><td class="label">বেডরুম</td><td>${data.bedrooms || '০'} টি</td></tr>
            <tr><td class="label">বাথরুম</td><td>${data.bathrooms || '০'} টি</td></tr>
            <tr><td class="label">বারান্দা</td><td>${data.balconies || '০'} টি</td></tr>
            <tr><td class="label">ফ্লোর নাম্বার</td><td>${data.floorLevel || 'উল্লেখ নেই'}</td></tr>
        `;
    } else {
        document.getElementById('table-interior').previousElementSibling.style.display = 'none';
        interiorTable.style.display = 'none';
    }

    const rulesTable = document.getElementById('table-rules');
    if (data.category !== 'plot') {
        rulesTable.innerHTML = `
            <tr><td class="label">গ্যাস সুবিধা</td><td>${data.gasFacility || 'নেই'}</td></tr>
            <tr><td class="label">লিফট সুবিধা</td><td>${data.liftFacility || 'নেই'}</td></tr>
            <tr><td class="label">জেনারেটর</td><td>${data.generatorFacility || 'নেই'}</td></tr>
            <tr><td class="label">পার্কিং</td><td>${data.parkingFacility || 'নেই'}</td></tr>
            <tr><td class="label">preferred ভাড়াটিয়া</td><td>${data.preferredTenant || 'যেকোনো'}</td></tr>
        `;
    } else {
        document.getElementById('table-rules').previousElementSibling.style.display = 'none';
        rulesTable.style.display = 'none';
    }

    if (data.category === 'plot' && data.ownershipType) {
        document.getElementById('section-owner').style.display = 'block';
        document.getElementById('table-owner').innerHTML = `
            <tr><td class="label">মালিকানার ধরন</td><td>${data.ownershipType}</td></tr>
            <tr><td class="label">খতিয়ান নম্বর</td><td>${data.khotianNumber || 'উল্লেখ নেই'}</td></tr>
            <tr><td class="label">দাগ নম্বর</td><td>${data.dagNumber || 'উল্লেখ নেই'}</td></tr>
            <tr><td class="label">মৌজা</td><td>${data.mouza || 'উল্লেখ নেই'}</td></tr>
        `;
    }

    document.getElementById('table-location').innerHTML = `
        <tr><td class="label">জেলা</td><td>${data.location?.district || ''}</td></tr>
        <tr><td class="label">উপজেলা/থানা</td><td>${data.location?.upazila || ''}</td></tr>
        <tr><td class="label">এলাকা/রোড</td><td>${data.location?.areaAddress || 'উল্লেখ নেই'}</td></tr>
    `;

    document.getElementById('table-contact').innerHTML = `
        <tr><td class="label">যোগাযোগের ব্যক্তি</td><td>${data.contactName || ''}</td></tr>
        <tr><td class="label">মোবাইল নম্বর</td><td>${data.contactPhone || ''}</td></tr>
    `;

    if (data.contactPhone) {
        document.getElementById('btn-call-owner').href = `tel:${data.contactPhone}`;
    }

    if (data.location?.lat && data.location?.lng) {
        initSinglePropertyMap(data);
    } else {
        document.getElementById('map-container').style.display = 'none';
    }
}

function getCategoryBangla(cat) {
    const mapping = { 'house': 'বাসা/ফ্ল্যাট', 'mess': 'মেস', 'sublet': 'সাবলেট', 'office': 'অফিস/দোকান', 'plot': 'জমি/প্লট' };
    return mapping[cat] || cat;
}

function initSinglePropertyMap(data) {
    try {
        const lat = parseFloat(data.location.lat);
        const lng = parseFloat(data.location.lng);
        const map = L.map('map-container').setView([lat, lng], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        const redPinIcon = L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41]
        });

        const popupContent = `<b>${data.title}</b><br>৳ ${data.monthlyRent || data.totalPrice || ''}`;
        L.marker([lat, lng], { icon: redPinIcon }).addTo(map).bindPopup(popupContent).openPopup();
    } catch (e) {
        console.error(e);
    }
}

async function loadRelatedPosts(currentData) {
    try {
        const querySnapshot = await db.collection('properties')
            .where('category', '==', currentData.category)
            .limit(5)
            .get();
            
        const grid = document.getElementById('related-list');
        let count = 0;

        querySnapshot.forEach((doc) => {
            if (doc.id === postId) return;
            count++;
            const p = doc.data();
            const card = document.createElement('div');
            card.className = 'related-card';
            card.onclick = () => window.location.href = `details.html?id=${doc.id}`;
            
            let amt = currentData.purpose === 'rent' ? (p.monthlyRent || p.rent) : (p.totalPrice || p.price);
            let displayAmt = typeof amt === 'number' ? `৳ ${amt.toLocaleString('bn-BD')}` : 'আলোচনা সাপেক্ষ';

            card.innerHTML = `
                <img src="${(p.images && p.images[0]) ? p.images[0].url : 'placeholder-image.jpg'}">
                <div class="related-card-body">
                    <h4 class="related-title">${p.title || ''}</h4>
                    <p class="related-price">${displayAmt}</p>
                </div>
            `;
            grid.appendChild(card);
        });

        if (count === 0) {
            document.querySelector('.related-section').style.display = 'none';
        }
    } catch (err) {
        console.error("সম্পর্কিত পোস্ট লোড করতে ব্যর্থ:", err);
    }
}

// ৩. চ্যাট সিস্টেম বাটন অ্যাক্টিভেশন লজিক
function setupPostBasedChatButton(postId, sellerId) {
    const chatBtn = document.getElementById('messageOwnerBtn');
    if (!chatBtn) return;

    chatBtn.addEventListener('click', () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert('ম্যাসেজ পাঠাতে প্রথমে লগইন করুন!');
            window.location.href = 'auth.html';
            return;
        }

        if (currentUser.uid === sellerId) {
            alert('এটি আপনার নিজের পোস্ট! আপনি নিজেকে মেসেজ করতে পারবেন না।');
            return;
        }

        // চ্যাট পেজে রিডাইরেক্ট (প্রয়োজনীয় কুয়েরি প্যারামিটার সহ)
        window.location.href = `messages.html?postId=${postId}&sellerId=${sellerId}`;
    });
}

function openLightbox(url) {
    const img = document.getElementById('lb-img');
    const lightbox = document.getElementById('lightbox');
    if (img) img.src = url;
    if (lightbox) lightbox.style.display = 'flex';
}

// হেডার ও মেনু বাটন নেভিগেশন (হুবহু অপরিবর্তিত)
document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const closeMenu = document.getElementById('closeMenu');
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

    if (closeMenu) closeMenu.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');
});