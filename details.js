// Firebase Configuration (আপনার আগের কনফিগারেশন বজায় রাখা হয়েছে)
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
    // ১. প্রোফাইল পিকচার ফিক্সিং লজিক
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

    // ২. ডেটা লোডিং
    if (!postId) {
        alert("প্রপার্টি আইডি পাওয়া যায়নি!");
        return;
    }

    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            const data = doc.data();
            renderDetails(data);
            loadRelatedPosts(data.category);
        } else {
            document.body.innerHTML = "<h2 style='text-align:center; margin-top:100px;'>দুঃখিত, পোস্টটি পাওয়া যায়নি।</h2>";
        }
    } catch (error) {
        console.error("Error fetching document:", error);
    }
});

function renderDetails(data) {
    // টাইটেল ও প্রাইস
    document.getElementById('p-title').textContent = data.title || "শিরোনাম নেই";
    document.getElementById('p-desc').textContent = data.description || "কোনো বর্ণনা দেওয়া হয়নি।";

    let finalPrice = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || "";
    document.getElementById('p-price').textContent = finalPrice ? `৳ ${finalPrice} ${unit}` : "আলোচনা সাপেক্ষ";

    // ইমেজ গ্যালারি
    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';
    const images = data.images || [];
    images.slice(0, 5).forEach((img, index) => {
        const url = typeof img === 'string' ? img : img.url;
        const div = document.createElement('div');
        div.className = 'gal-item';
        div.innerHTML = `<img src="${url}" onclick="openLightbox('${url}')" alt="Property Image">`;
        gallery.appendChild(div);
    });

    // টেবিল রো জেনারেটর (তথ্য থাকলে তবেই দেখাবে)
    const addRow = (tableId, label, value) => {
        if (value && value !== "" && value !== "undefined" && value !== null) {
            const table = document.getElementById(tableId);
            const row = `<tr><td>${label}</td><td>${value}</td></tr>`;
            table.innerHTML += row;
        }
    };

    // --- ১. প্রপার্টির মূল তথ্য (Basic Info) ---
    const basicT = 'table-basic';
    document.getElementById(basicT).innerHTML = ""; 
    
    addRow(basicT, "ক্যাটাগরি", data.category);
    addRow(basicT, "টাইপ", data.type);

    // বিক্রয় এর ক্ষেত্রে শর্তাধীন তথ্য
    if (data.category === 'বিক্রয়') {
        if (data.type === 'প্লট') {
            addRow(basicT, "প্লট নং", data.plotNo);
        } else if (data.type === 'বাড়ি') {
            addRow(basicT, "তালা সংখ্যা", data.totalFloors);
            addRow(basicT, "রুম সংখ্যা", data.bedrooms || data.rooms);
            addRow(basicT, "বাথরুম সংখ্যা", data.bathrooms);
            addRow(basicT, "কিচেন সংখ্যা", data.kitchen);
        }
    }

    // ভাড়া এর ক্ষেত্রে শর্তাধীন তথ্য
    if (data.category === 'ভাড়া') {
        if (data.type === 'বাড়ি') {
            addRow(basicT, "তালা সংখ্যা", data.totalFloors);
            addRow(basicT, "রুম", data.bedrooms || data.rooms);
            addRow(basicT, "বাথরুম", data.bathrooms);
            addRow(basicT, "কিচেন", data.kitchen);
            addRow(basicT, "ওঠার তারিখ", data.availableDate);
            addRow(basicT, "এডভান্স টাকা", data.advanceAmount ? `৳ ${data.advanceAmount}` : "");
        } else if (['ফ্লাট', 'অফিস', 'দোকান'].includes(data.type)) {
            addRow(basicT, "ওঠার তারিখ", data.availableDate);
            addRow(basicT, "এডভ্যান্স টাকা", data.advanceAmount ? `৳ ${data.advanceAmount}` : "");
        }
    }

    // আগের কমন তথ্যগুলো (নিশ্চিত করা হয়েছে এগুলো থাকবে)
    let areaValue = data.landArea || data.houseArea || data.areaSqft;
    let areaUnit = data.landAreaUnit || data.houseAreaUnit || "";
    addRow(basicT, "আয়তন/পরিমাণ", areaValue ? `${areaValue} ${areaUnit}` : "");
    addRow(basicT, "ফেসিং (মুখ)", data.facing);
    addRow(basicT, "ফ্লোর লেভেল", data.floorLevel);
    
    if (data.utilities) {
        const utils = Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities;
        addRow(basicT, "সুবিধা সমূহ", utils);
    }

    // --- ২. মালিকানা তথ্য (বিক্রয়ের জন্য) ---
    if (data.category === 'বিক্রয়' && data.owner) {
        document.getElementById('section-owner').style.display = 'block';
        const ownT = 'table-owner';
        document.getElementById(ownT).innerHTML = "";
        addRow(ownT, "দাতার নাম", data.owner.donorName);
        addRow(ownT, "দাগ নং", data.owner.dagNo);
        addRow(ownT, "দাগের ধরন", data.owner.dagNoType);
        addRow(ownT, "খতিয়ান নং", data.owner.khotianNo);
        addRow(ownT, "মৌজা", data.owner.mouja);
    }

    // --- ৩. অবস্থান তথ্য ---
    const locT = 'table-location';
    document.getElementById(locT).innerHTML = "";
    if (data.location) {
        addRow(locT, "বিভাগ", data.location.division);
        addRow(locT, "জেলা", data.location.district);
        addRow(locT, "থানা/উপজেলা", data.location.thana);
        addRow(locT, "গ্রাম/এলাকা", data.location.village);
    }

    if (data.googleMap) {
        const mapBtn = document.getElementById('p-map');
        mapBtn.href = data.googleMap;
        mapBtn.style.display = 'flex';
    }

    // --- ৪. যোগাযোগ তথ্য ---
    const conT = 'table-contact';
    document.getElementById(conT).innerHTML = "";
    addRow(conT, "যোগাযোগকারী", data.contactPerson || "মালিক");
    addRow(conT, "ফোন নাম্বার", data.phoneNumber);
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
}

// সম্পর্কিত পোস্ট লোড করা
async function loadRelatedPosts(category) {
    const list = document.getElementById('related-list');
    try {
        const snap = await db.collection('properties')
            .where('category', '==', category)
            .limit(4)
            .get();

        list.innerHTML = "";
        snap.forEach(doc => {
            if (doc.id !== postId) {
                const p = doc.data();
                const imgUrl = p.images?.[0]?.url || p.images?.[0] || 'placeholder.jpg';
                list.innerHTML += `
                    <div class="rel-card" onclick="location.href='details.html?id=${doc.id}'">
                        <img src="${imgUrl}">
                        <div class="rel-info">
                            <h4 class="rel-title">${p.title}</h4>
                            <p class="rel-price">৳ ${p.price || p.monthlyRent}</p>
                        </div>
                    </div>`;
            }
        });
    } catch (e) { console.log(e); }
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
}

// সাইডবার লজিক
const menuBtn = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

menuBtn.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };

document.getElementById('profileImageWrapper').onclick = () => location.href = 'profile.html';
