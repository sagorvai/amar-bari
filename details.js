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

// হেডার প্রোফাইল পিকচার লোড করার লজিক
auth.onAuthStateChanged(user => {
    const profileImg = document.getElementById('headerProfileImage');
    const defaultIcon = document.getElementById('defaultProfileIcon');
    if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().profileImage) {
                profileImg.src = doc.data().profileImage;
                profileImg.style.display = 'block';
                defaultIcon.style.display = 'none';
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;
    const doc = await db.collection('properties').doc(postId).get();
    if (doc.exists) {
        const data = doc.data();
        renderDetails(data);
        loadRelatedPosts(data);
    }
    setupHeader();
});

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    // দাম ও ইউনিট
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // গ্যালারি
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

    // --- প্রপার্টির তথ্য (মিসিং ডেটা ম্যাপিং সহ) ---
    const basicT = 'table-basic';
    document.getElementById(basicT).innerHTML = ""; 

    addRow(basicT, "ক্যাটাগরি", data.category);
    addRow(basicT, "টাইপ", data.type);

    // ১. বিক্রয় ক্যাটাগরির প্লট এর জন্য প্লট নং
    if (data.category === 'বিক্রয়' && data.type === 'প্লট') {
        addRow(basicT, "প্লট নং", data.plotNo);
    }

    // ২. বিক্রয় ও ভাড়া - বাড়ির জন্য তলা, রুম, বাথরুম, কিচেন
    if (data.type === 'বাড়ি') {
        addRow(basicT, "তলা সংখ্যা", data.floorNo || data.totalFloors);
        addRow(basicT, "রুম সংখ্যা", data.bedrooms || data.rooms);
        addRow(basicT, "বাথরুম সংখ্যা", data.bathrooms);
        addRow(basicT, "কিচেন সংখ্যা", data.kitchen);
    }

    // ৩. ভাড়ার ক্ষেত্রে ওঠার তারিখ ও এডভ্যান্স (বাড়ি, ফ্ল্যাট, অফিস, দোকান)
    if (data.category === 'ভাড়া') {
        addRow(basicT, "ভাড়ার ধরন", data.rentType);
        addRow(basicT, "ওঠার তারিখ", data.availableDate);
        addRow(basicT, "অগ্রিম টাকা", data.advanceAmount ? `৳ ${data.advanceAmount}` : "");
    }

    // ৪. অন্যান্য সাধারণ তথ্য
    addRow(basicT, "রাস্তা", data.roadWidth ? `${data.roadWidth} ফিট` : "");
    addRow(basicT, "ফেসিং", data.facing);
    if (data.utilities) addRow(basicT, "সুবিধা সমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);

    // ৫. পরিমাণের সাথে ইউনিট (শতক/ফিট ইত্যাদি)
    let area = data.landArea || data.houseArea || data.areaSqft || data.commercialArea;
    let areaUnit = data.landAreaUnit || data.houseAreaUnit || data.commercialAreaUnit || "";
    addRow(basicT, "পরিমাণ", area ? `${area} (${areaUnit})` : "");

    // --- মালিকানা তথ্য ---
    if (data.category === 'বিক্রয়' && data.owner) {
        document.getElementById('section-owner').style.display = 'block';
        const ownT = 'table-owner';
        document.getElementById(ownT).innerHTML = "";
        addRow(ownT, "দাতার নাম", data.owner.donorName);
        addRow(ownT, "দাগ নং", data.owner.dagNo ? `${data.owner.dagNo} (${data.owner.dagNoType || ''})` : "");
        addRow(ownT, "মৌজা", data.owner.mouja);
    }

    // --- অবস্থান ---
    const locT = 'table-location';
    document.getElementById(locT).innerHTML = "";
    addRow(locT, "জেলা", data.location?.district);
    addRow(locT, "উপজেলা", data.location?.upazila);
    addRow(locT, "থানা", data.location?.thana);
    addRow(locT, "গ্রাম/এলাকা", data.location?.village);
    addRow(locT, "রাস্তা", data.location?.road);

    if (data.googleMap) {
        document.getElementById('p-map').href = data.googleMap;
        document.getElementById('p-map').style.display = 'flex';
    }

    // --- যোগাযোগ ---
    const conT = 'table-contact';
    document.getElementById(conT).innerHTML = "";
    addRow(conT, "ফোন", data.phoneNumber);
    addRow(conT, "অতিরিক্ত ফোন", data.secondaryPhone);
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
}

// সম্পর্কিত পোস্ট সর্টিং ও লোডিং
async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');
    try {
        const snapshot = await db.collection('properties').where('category', '==', currentData.category).limit(15).get();
        let allPosts = [];
        snapshot.forEach(doc => { if (doc.id !== postId) allPosts.push({ id: doc.id, ...doc.data() }); });

        // সর্টিং: গ্রাম > থানা
        allPosts.sort((a, b) => {
            const aVillage = (a.location?.village === currentData.location?.village) ? 1 : 0;
            const bVillage = (b.location?.village === currentData.location?.village) ? 1 : 0;
            return bVillage - aVillage;
        });

        const displayPosts = allPosts.slice(0, 10);
        list.innerHTML = "";
        displayPosts.forEach(post => {
            let pAmt = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            list.innerHTML += `
                <div class="rel-card" onclick="location.href='details.html?id=${post.id}'">
                    <img src="${post.images?.[0]?.url || post.images?.[0] || 'placeholder.jpg'}">
                    <div class="rel-info">
                        <h4 class="rel-title">${post.title}</h4>
                        <p class="rel-price">৳ ${pAmt}</p>
                        <p class="rel-loc">${post.location?.village || ''}, ${post.location?.thana || ''}</p>
                    </div>
                </div>`;
        });
        if (allPosts.length > 10) document.getElementById('see-more-box').style.display = 'block';
    } catch (e) { console.log(e); }
}

function setupHeader() {
    const menuBtn = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const closeBtn = document.getElementById('closeMenu');

    if(menuBtn) menuBtn.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
    if(closeBtn) closeBtn.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };
    if(overlay) overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };

    document.getElementById('notificationButton').onclick = () => location.href = 'notifications.html';
    document.getElementById('headerPostButton').onclick = () => location.href = 'post.html';
    document.getElementById('messageButton').onclick = () => location.href = 'messages.html';
    document.getElementById('profileImageWrapper').onclick = () => location.href = 'profile.html';
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
            }
