// Firebase Config (As per your project)
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

let allImages = [];
let currentIndex = 0;

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;

    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            renderDetails(doc.data());
        } else {
            alert("পোস্টটি পাওয়া যায়নি!");
        }
    } catch (e) { console.error(e); }
});

function renderDetails(data) {
    // ১. বেসিক তথ্য (শিরোনাম ও ডেসক্রিপশন)
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "কোন বর্ণনা দেওয়া হয়নি।";
    
    // দাম নির্ধারণ (বিক্রয় বনাম ভাড়া)
    if (data.category === 'বিক্রয়') {
        document.getElementById('p-price').textContent = data.price ? `৳ ${data.price} (মোট দাম)` : "আলোচনা সাপেক্ষ";
    } else {
        document.getElementById('p-price').textContent = data.monthlyRent ? `৳ ${data.monthlyRent} (মাসিক ভাড়া)` : "ভাড়া আলোচনা সাপেক্ষ";
    }

    // ২. ইমেজ গ্যালারি প্রোসেসিং (Main + Documents)
    allImages = [];
    if (data.images) data.images.forEach(img => allImages.push(img.url || img));
    if (data.documents?.khotian) allImages.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) allImages.push(data.documents.sketch.url || data.documents.sketch);

    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';
    allImages.slice(0, 5).forEach((url, idx) => {
        const div = document.createElement('div');
        div.className = 'gal-item';
        div.innerHTML = `<img src="${url}" onclick="openLightbox(${idx}, event)">`;
        gallery.appendChild(div);
    });

    // ৩. প্রপার্টি তথ্য টেবিল (সিরিয়াল অনুযায়ী)
    const infoTable = document.getElementById('p-info-table');
    let specs = [];

    // --- গ্রুপ ১: প্রপার্টির মূল তথ্য ---
    specs.push(["ক্যাটাগরি", data.category]);
    specs.push(["টাইপ", data.type]);
    specs.push(["রুম সংখ্যা", data.rooms]);
    specs.push(["বাথরুম সংখ্যা", data.bathrooms]);
    specs.push(["কিচেন সংখ্যা", data.kitchen]);
    specs.push(["ফ্লোর নং", data.floorNo || data.floorLevel]);
    specs.push(["প্রপার্টির বয়স", data.propertyAge ? `${data.propertyAge} বছর` : null]);
    specs.push(["ফেসিং", data.facing]);
    specs.push(["রাস্তা (ফিট)", data.roadWidth ? `${data.roadWidth} ফিট` : null]);
    
    if (data.utilities && Array.isArray(data.utilities)) {
        specs.push(["সুবিধাসমূহ", data.utilities.join(', ')]);
    }

    // জমি সংক্রান্ত
    specs.push(["জমির ধরন", data.landType]);
    specs.push(["প্লট নং", data.plotNo]);
    
    // পরিমাপ (বিভিন্ন ইউনিটের জন্য)
    let area = data.landArea || data.houseArea || data.areaSqft || data.commercialArea;
    let unit = data.landAreaUnit || data.houseAreaUnit || data.commercialAreaUnit || "স্কয়ার ফিট";
    if (area) specs.push(["পরিমাণ", `${area} ${unit}`]);

    // --- গ্রুপ ২: অবস্থান (📍 ঠিকানা) ---
    if (data.location) {
        specs.push(["বিভাগ", data.location.division]);
        specs.push(["জেলা", data.location.district]);
        specs.push(["উপজেলা/থানা", data.location.upazila || data.location.thana]);
        specs.push(["ইউনিয়ন/ওয়ার্ড", data.location.union || data.location.wardNo]);
        specs.push(["গ্রাম/এলাকা", data.location.village]);
        specs.push(["রাস্তা", data.location.road]);
    }

    // --- গ্রুপ ৩: মালিকানা তথ্য (📑 বিক্রয় হলে) ---
    if (data.category === 'বিক্রয়' && data.owner) {
        specs.push(["দাতার নাম", data.owner.donorName]);
        specs.push(["দাগ নং", data.owner.dagNo]);
        specs.push(["দাগ ধরন", data.owner.dagNoType]);
        specs.push(["মৌজা", data.owner.mouja]);
    }

    // --- গ্রুপ ৪: যোগাযোগ ---
    specs.push(["ফোন নম্বর", data.phoneNumber]);
    if (data.secondaryPhone) specs.push(["অতিরিক্ত ফোন", data.secondaryPhone]);

    // টেবিল রেন্ডার (শুধু যেগুলোতে ডাটা আছে)
    infoTable.innerHTML = specs
        .filter(s => s[1] && s[1] !== "" && s[1] !== "undefined")
        .map(s => `<tr><td>${s[0]}</td><td>${s[1]}</td></tr>`)
        .join('');

    // কল ও ম্যাপ বাটন
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
    if (data.googleMap) {
        const mapBtn = document.getElementById('p-map');
        mapBtn.href = data.googleMap;
        mapBtn.style.display = 'flex';
    }

    // শেয়ার বাটন
    document.getElementById('p-share').onclick = () => {
        if (navigator.share) {
            navigator.share({ title: data.title, url: window.location.href });
        } else {
            alert("লিঙ্ক কপি করুন: " + window.location.href);
        }
    };
}

// লাইটবক্স ফাংশন
function openLightbox(idx, e) {
    e.stopPropagation();
    currentIndex = idx;
    const lbImg = document.getElementById('lb-img');
    lbImg.src = allImages[currentIndex];
    document.getElementById('lightbox').style.display = 'flex';
}

function changeImg(step, e) {
    e.stopPropagation();
    currentIndex += step;
    if (currentIndex >= allImages.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = allImages.length - 1;
    document.getElementById('lb-img').src = allImages[currentIndex];
}
