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

document.addEventListener('DOMContentLoaded', async () => {
    // হেডার প্রোফাইল ইমেজ হ্যান্ডলিং
    auth.onAuthStateChanged(user => {
        const pImg = document.getElementById('profileImage');
        const pIcon = document.getElementById('defaultProfileIcon');
        if (user && user.photoURL) {
            pImg.src = user.photoURL;
            pImg.style.display = 'block';
            pIcon.style.display = 'none';
        } else {
            pImg.style.display = 'none';
            pIcon.style.display = 'block';
        }
    });

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

    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // ইমেজ গ্যালারি (সর্বোচ্চ ৫টি)
    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));
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

    const basicT = 'table-basic';
    document.getElementById(basicT).innerHTML = ""; 

    addRow(basicT, "ক্যাটাগরি", data.category);
    addRow(basicT, "টাইপ", data.type);

    // --- নতুন লজিক যুক্ত করা হলো ---

    // ১. বিক্রয় ক্যাটাগরি
    if (data.category === 'বিক্রয়') {
        if (data.type === 'প্লট') {
            addRow(basicT, "প্লট নং", data.plotNo);
        } else if (data.type === 'বাড়ি') {
            addRow(basicT, "তালা সংখ্যা", data.totalFloors || data.floorNo);
            addRow(basicT, "রুম সংখ্যা", data.bedrooms || data.rooms);
            addRow(basicT, "বাথরুম সংখ্যা", data.bathrooms);
            addRow(basicT, "কিচেন সংখ্যা", data.kitchen);
        }
    }

    // ২. ভাড়া ক্যাটাগরি
    if (data.category === 'ভাড়া') {
        if (data.type === 'বাড়ি') {
            addRow(basicT, "তালা সংখ্যা", data.totalFloors || data.floorNo);
            addRow(basicT, "রুম", data.bedrooms || data.rooms);
            addRow(basicT, "বাথরুম", data.bathrooms);
            addRow(basicT, "কিচেন", data.kitchen);
            addRow(basicT, "ওঠার তারিখ", data.availableDate);
            addRow(basicT, "এডভ্যান্স টাকা", data.advanceAmount ? `৳ ${data.advanceAmount}` : "");
        } else if (['ফ্লাট', 'অফিস', 'দোকান'].includes(data.type)) {
            addRow(basicT, "ওঠার তারিখ", data.availableDate);
            addRow(basicT, "এডভ্যান্স টাকা", data.advanceAmount ? `৳ ${data.advanceAmount}` : "");
        }
    }

    // কমন তথ্য
    let area = data.landArea || data.houseArea || data.areaSqft;
    let areaUnit = data.landAreaUnit || data.houseAreaUnit || "";
    addRow(basicT, "পরিমাণ", area ? `${area} (${areaUnit})` : "");
    addRow(basicT, "ফেসিং", data.facing);
    if (data.utilities) addRow(basicT, "সুবিধা সমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);

    // মালিকানা তথ্য (বিক্রয়ের জন্য)
    if (data.category === 'বিক্রয়' && data.owner) {
        document.getElementById('section-owner').style.display = 'block';
        const ownT = 'table-owner';
        document.getElementById(ownT).innerHTML = "";
        addRow(ownT, "দাতার নাম", data.owner.donorName);
        addRow(ownT, "দাগ নং", data.owner.dagNo ? `${data.owner.dagNo} (${data.owner.dagNoType || ''})` : "");
        addRow(ownT, "মৌজা", data.owner.mouja);
    }

    // অবস্থান
    const locT = 'table-location';
    document.getElementById(locT).innerHTML = "";
    addRow(locT, "জেলা", data.location?.district);
    addRow(locT, "থানা", data.location?.thana);
    addRow(locT, "গ্রাম/এলাকা", data.location?.village);

    if (data.googleMap) {
        const m = document.getElementById('p-map');
        m.href = data.googleMap;
        m.style.display = 'flex';
    }

    // যোগাযোগ
    const conT = 'table-contact';
    document.getElementById(conT).innerHTML = "";
    addRow(conT, "ফোন", data.phoneNumber);
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
}

// সম্পর্কিত পোস্ট (পূর্বের লজিক ঠিক রাখা হয়েছে)
async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');
    try {
        const snapshot = await db.collection('properties')
            .where('category', '==', currentData.category)
            .limit(6)
            .get();

        list.innerHTML = "";
        snapshot.forEach(doc => {
            if (doc.id !== postId) {
                const post = doc.data();
                list.innerHTML += `
                    <div class="rel-card" onclick="location.href='details.html?id=${doc.id}'">
                        <img src="${post.images?.[0]?.url || post.images?.[0] || 'placeholder.jpg'}">
                        <div class="rel-info">
                            <h4 class="rel-title">${post.title}</h4>
                            <p class="rel-price">৳ ${post.price || post.monthlyRent}</p>
                        </div>
                    </div>`;
            }
        });
    } catch (e) { console.error(e); }
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
}

// সাইডবার কন্ট্রোল
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

if (menuButton) {
    menuButton.addEventListener('click', () => {
        sidebar.classList.add('active');
        overlay.classList.add('active');
    });
}

overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
});

// বাটন ইভেন্ট
document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');
