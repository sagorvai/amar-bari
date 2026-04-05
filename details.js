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
            renderDetails(doc.data());
        }
    } catch (e) { console.error(e); }
});

function renderDetails(data) {
    // শিরোনাম ও ডেসক্রিপশন
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";
    document.getElementById('p-price').textContent = data.price ? `৳ ${data.price}` : (data.monthlyRent ? `৳ ${data.monthlyRent}` : "আলোচনা সাপেক্ষ");

    // গ্যালারি ইমেজ
    let allImages = [];
    if (data.images) data.images.forEach(img => allImages.push(img.url || img));
    if (data.documents?.khotian) allImages.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) allImages.push(data.documents.sketch.url || data.documents.sketch);

    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';
    allImages.slice(0, 5).forEach((url, idx) => {
        const div = document.createElement('div');
        div.className = 'gal-item';
        div.innerHTML = `<img src="${url}" onclick="openLightbox('${url}')">`;
        gallery.appendChild(div);
    });

    // ফাংশন: টেবিল রো তৈরি
    const createRow = (label, value) => {
        if (!value || value === "undefined") return "";
        return `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // ১. 👉 প্রপার্টির মূল তথ্য
    const basicTable = document.getElementById('table-basic');
    basicTable.innerHTML = 
        createRow("ক্যাটাগরি", data.category) +
        createRow("টাইপ", data.type) +
        createRow("মূল্য/ভাড়া", data.price || data.monthlyRent) +
        createRow("বেডরুম", data.bedrooms || data.rooms) +
        createRow("বাথরুম", data.bathrooms) +
        createRow("ফ্লোর নম্বর", data.floorNo || data.floorLevel) +
        createRow("জমির পরিমাণ", data.landArea ? `${data.landArea} ${data.landUnit || ''}` : null);

    // ২. 👉 মালিকানা তথ্য (বিক্রয় হলে)
    if (data.category === 'বিক্রয়' && data.owner) {
        document.getElementById('section-owner').style.display = 'block';
        const ownerTable = document.getElementById('table-owner');
        ownerTable.innerHTML = 
            createRow("দাতার নাম", data.owner.donorName) +
            createRow("দাগ নং ও ধরন", `${data.owner.dagNo || ''} (${data.owner.dagNoType || ''})`) +
            createRow("মৌজা", data.owner.mouja);
    }

    // ৩. 👉 অবস্থান
    const locTable = document.getElementById('table-location');
    locTable.innerHTML = 
        createRow("জেলা", data.location?.district) +
        createRow("উপজেলা", data.location?.upazila) +
        createRow("থানা", data.location?.thana) +
        createRow("ইউনিয়ন", data.location?.union) +
        createRow("ওয়ার্ড", data.location?.wardNo) +
        createRow("গ্রাম/এলাকা", data.location?.village) +
        createRow("রাস্তা", data.location?.road);

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
        }
    };
}

function openLightbox(url) {
    const lb = document.getElementById('lightbox');
    document.getElementById('lb-img').src = url;
    lb.style.display = 'flex';
}
