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
    }
});

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-title-top').textContent = data.title || "বিস্তারিত";
    document.getElementById('p-desc').textContent = data.description || "";

    let amount = data.category === 'বিক্রয়' ? (data.price || "০") : (data.monthlyRent || "০");
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = `${amount} ${unit}`;

    // স্লাইডার লোড
    const slider = document.getElementById('p-slider');
    const countLabel = document.getElementById('slider-count');
    const images = data.images || [];
    if (images.length > 0) {
        slider.innerHTML = images.map((img, i) => `<img src="${img.url}" style="${i===0?'':'display:none'}" onclick="openLightbox('${img.url}')">`).join('') + slider.innerHTML;
        countLabel.textContent = `1/${images.length}`;
    }

    // টেবিল ১: বেসিক
    document.getElementById('table-basic').innerHTML = `
        <tr><td>ক্যাটাগরি</td><td>${data.category || '-'}</td></tr>
        <tr><td>টাইপ</td><td>${data.type || '-'}</td></tr>
        <tr><td>বেডরুম</td><td>${data.bedrooms || 'নাই'}</td></tr>
        <tr><td>বাথরুম</td><td>${data.bathrooms || 'নাই'}</td></tr>
    `;

    // মালিকানা তথ্য ও বাটন কার্যকারিতা
    if (data.category === 'বিক্রয়') {
        document.getElementById('section-owner').style.display = 'block';
        document.getElementById('table-owner').innerHTML = `
            <tr><td>মালিকানা</td><td>${data.ownershipType || '-'}</td></tr>
            <tr><td>মৌজা</td><td>${data.mouja || '-'}</td></tr>
            <tr><td>খতিয়ান নং</td><td>${data.khotianNo || '-'}</td></tr>
        `;

        // বাটন ও মডাল কন্ট্রোল
        const verifyBtn = document.getElementById('btn-verify-khotian');
        const landModal = document.getElementById('land-modal');
        const landIframe = document.getElementById('land-iframe');
        const landInfo = document.getElementById('land-info-text');

        if (verifyBtn) {
            verifyBtn.onclick = () => {
                // হেডারে সকল প্রয়োজনীয় ডাটা লোড করা
                const divi = data.division || '-';
                const dist = data.district || '-';
                const upa = data.upazila || data.thana || '-';
                const mou = data.mouja || '-';
                const kho = data.khotianNo || '-';
                const kType = data.khotianType || '-'; // খতিয়ানের ধরন

                landInfo.innerHTML = `
                    <b>বিভাগ:</b> ${divi} | <b>জেলা:</b> ${dist} | <b>উপজেলা/থানা:</b> ${upa}<br>
                    <b>মৌজা:</b> ${mou} | <b>খতিয়ান নং:</b> ${kho} | <b>ধরন:</b> ${kType}
                `;

                // সরকারি সাইট রান করা
                landIframe.src = "https://www.maps.google.com/";
                landModal.style.display = 'flex';
            };
        }

        document.getElementById('close-land-modal').onclick = () => {
            landModal.style.display = 'none';
            landIframe.src = ""; // রিসেট
        };
    }

    // অবস্থান
    document.getElementById('table-location').innerHTML = `
        <tr><td>জেলা</td><td>${data.district || '-'}</td></tr>
        <tr><td>এলাকা</td><td>${data.area || '-'}</td></tr>
    `;

    if (data.googleMap) {
        const pMap = document.getElementById('p-map');
        pMap.style.display = 'block';
        pMap.href = data.googleMap;
    }

    // যোগাযোগ
    document.getElementById('table-contact').innerHTML = `
        <tr><td>ফোন</td><td>${data.phone || '-'}</td></tr>
    `;
}

// সম্পর্কিত পোস্ট (অরিজিনাল)
async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');
    try {
        const snap = await db.collection('properties').where('category', '==', currentData.category).limit(4).get();
        let count = 0;
        snap.forEach(doc => {
            if (doc.id === postId || count >= 3) return;
            const d = doc.data();
            const img = (d.images && d.images[0]) ? d.images[0].url : 'https://via.placeholder.com/150';
            const price = d.category === 'বিক্রয়' ? d.price : d.monthlyRent;
            list.innerHTML += `
                <div class="related-card" onclick="location.href='details.html?id=${doc.id}'">
                    <img src="${img}">
                    <div class="related-info">
                        <div class="related-title">${d.title}</div>
                        <div class="related-price">${price} ${d.priceUnit || d.rentUnit || ""}</div>
                    </div>
                </div>`;
            count++;
        });
        if (snap.size > 1) document.getElementById('see-more-box').style.display = 'block';
    } catch (e) { console.error(e); }
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
        }
