// Firebase Configuration
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
    if (!postId) {
        alert("পোস্ট আইডি পাওয়া যায়নি!");
        return;
    }

    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            renderDetails(doc.data());
        } else {
            document.getElementById('p-title').textContent = "দুঃখিত! পোস্টটি পাওয়া যায়নি।";
        }
    } catch (e) { console.error("Error fetching data:", e); }
});

function renderDetails(data) {
    // শিরোনাম ও মূল্য
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";
    
    let priceText = "আলোচনা সাপেক্ষ";
    if (data.category === 'বিক্রয়' && data.price) priceText = `৳ ${data.price} (মোট)`;
    if (data.category === 'ভাড়া' && data.monthlyRent) priceText = `৳ ${data.monthlyRent} (মাসিক)`;
    document.getElementById('p-price').textContent = priceText;

    // ইমেজ গ্যালারি (৫টি ছবি)
    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));
    if (data.documents?.khotian) images.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) images.push(data.documents.sketch.url || data.documents.sketch);

    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';
    images.slice(0, 5).forEach((url) => {
        const div = document.createElement('div');
        div.className = 'gal-item';
        div.innerHTML = `<img src="${url}" onclick="openLightbox('${url}')">`;
        gallery.appendChild(div);
    });

    // সাহায্যকারী ফাংশন: টেবিল রো তৈরি
    const addRow = (label, value) => {
        if (!value || value === "undefined" || value === "") return "";
        return `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // --- ১. 🏠 প্রপার্টির তথ্য সেকশন ---
    const basicTable = document.getElementById('table-basic');
    basicTable.innerHTML = 
        addRow("ক্যাটাগরি", data.category) +
        addRow("টাইপ", data.type) +
        addRow("বেডরুম", data.bedrooms || data.rooms) +
        addRow("বাথরুম", data.bathrooms) +
        addRow("কিচেন", data.kitchen) +
        addRow("ফ্লোর নম্বর", data.floorNo || data.floorLevel) +
        addRow("রাস্তা (ফিট)", data.roadWidth ? `${data.roadWidth} ফিট` : "") +
        addRow("ফেসিং", data.facing) +
        addRow("সুবিধাসমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities) +
        addRow("জমির পরিমাণ", data.landArea ? `${data.landArea} ${data.landUnit || data.landAreaUnit || ''}` : "");

    // --- ২. 📑 মালিকানা তথ্য সেকশন (শুধুমাত্র বিক্রয় হলে) ---
    if (data.category === 'বিক্রয়' && data.owner) {
        document.getElementById('section-ownership').style.display = 'block';
        const ownTable = document.getElementById('table-ownership');
        ownTable.innerHTML = 
            addRow("দাতার নাম", data.owner.donorName) +
            addRow("দাগ নং", data.owner.dagNo) +
            addRow("দাগ ধরন", data.owner.dagNoType) +
            addRow("মৌজা", data.owner.mouja);
    }

    // --- ৩. 📍 অবস্থান সেকশন ---
    const locTable = document.getElementById('table-location');
    locTable.innerHTML = 
        addRow("বিভাগ", data.location?.division) +
        addRow("জেলা", data.location?.district) +
        addRow("উপজেলা", data.location?.upazila) +
        addRow("থানা", data.location?.thana) +
        addRow("ইউনিয়ন", data.location?.union) +
        addRow("ওয়ার্ড নম্বর", data.location?.wardNo) +
        addRow("গ্রাম/এলাকা", data.location?.village) +
        addRow("রাস্তা", data.location?.road);

    // গুগল ম্যাপ লিঙ্ক
    if (data.googleMap) {
        const mapBtn = document.getElementById('p-map');
        mapBtn.href = data.googleMap;
        mapBtn.style.display = 'flex';
    }

    // --- ৪. 📞 যোগাযোগ সেকশন ---
    const contactTable = document.getElementById('table-contact');
    contactTable.innerHTML = 
        addRow("প্রাথমিক ফোন", data.phoneNumber) +
        addRow("অতিরিক্ত ফোন", data.secondaryPhone);

    // শেয়ার ও কল লজিক
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
    document.getElementById('p-share').onclick = () => {
        if (navigator.share) {
            navigator.share({ title: data.title, url: window.location.href });
        } else {
            alert("লিঙ্কটি কপি করুন: " + window.location.href);
        }
    };
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
               }
