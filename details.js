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

    // দাম ও ইউনিট
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = `${amount} ${unit}`;

    // স্লাইডার
    const slider = document.getElementById('p-slider');
    const countLabel = document.getElementById('slider-count');
    const images = data.images || [];
    
    if (images.length > 0) {
        slider.innerHTML = images.map((img, index) => 
            `<img src="${img.url}" style="${index === 0 ? '' : 'display:none'}" onclick="openLightbox('${img.url}')">`
        ).join('') + slider.innerHTML;
        countLabel.textContent = `1/${images.length}`;
    }

    // টেবিল ১: বেসিক তথ্য
    const basicTable = document.getElementById('table-basic');
    basicTable.innerHTML = `
        <tr><td>ক্যাটাগরি</td><td>${data.category}</td></tr>
        <tr><td>টাইপ</td><td>${data.type}</td></tr>
        <tr><td>বেডরুম</td><td>${data.bedrooms || 'নাই'}</td></tr>
        <tr><td>বাথরুম</td><td>${data.bathrooms || 'নাই'}</td></tr>
        <tr><td>আয়তন</td><td>${data.size || '-'} ${data.sizeUnit || ''}</td></tr>
    `;

    // টেবিল ২: মালিকানা তথ্য
    if (data.category === 'বিক্রয়') {
        document.getElementById('section-owner').style.display = 'block';
        const ownerTable = document.getElementById('table-owner');
        ownerTable.innerHTML = `
            <tr><td>মালিকানা</td><td>${data.ownershipType || '-'}</td></tr>
            <tr><td>মৌজা</td><td>${data.mouja || '-'}</td></tr>
            <tr><td>খতিয়ান নং</td><td>${data.khotianNo || '-'}</td></tr>
        `;

        // --- খতিয়ান যাচাই বাটন লজিক ---
        const verifyBtn = document.getElementById('btn-verify-khotian');
        const modal = document.getElementById('land-modal');
        const iframe = document.getElementById('land-iframe');
        const infoText = document.getElementById('modal-info-text');

        if (verifyBtn) {
            verifyBtn.onclick = () => {
                const upazilaOrThana = data.upazila || data.thana || '-';
                infoText.innerHTML = `
                    <span>বিভাগ: ${data.division || '-'}</span> | 
                    <span>জেলা: ${data.district || '-'}</span> | 
                    <span>${upazilaOrThana}</span> | 
                    <span>মৌজা: ${data.mouja || '-'}</span> | 
                    <span>খতিয়ান: ${data.khotianNo || '-'}</span>
                `;
                iframe.src = "https://dlrms.land.gov.bd/";
                modal.style.display = 'flex';
            };
        }

        document.getElementById('close-land-modal').onclick = () => {
            modal.style.display = 'none';
            iframe.src = "";
        };
    }

    // টেবিল ৩: অবস্থান
    const locTable = document.getElementById('table-location');
    locTable.innerHTML = `
        <tr><td>বিভাগ</td><td>${data.division}</td></tr>
        <tr><td>জেলা</td><td>${data.district}</td></tr>
        <tr><td>উপজেলা/থানা</td><td>${data.upazila || data.thana || '-'}</td></tr>
        <tr><td>এলাকা</td><td>${data.area}</td></tr>
    `;

    if (data.googleMap) {
        const mapBtn = document.getElementById('p-map');
        mapBtn.style.display = 'block';
        mapBtn.href = data.googleMap;
    }

    // টেবিল ৪: যোগাযোগ
    const contactTable = document.getElementById('table-contact');
    contactTable.innerHTML = `
        <tr><td>ফোন</td><td>${data.phone || '-'}</td></tr>
        <tr><td>নাম</td><td>${data.ownerName || '-'}</td></tr>
    `;
}

async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');
    const seeMoreBox = document.getElementById('see-more-box');
    try {
        const snapshot = await db.collection('properties')
            .where('category', '==', currentData.category)
            .limit(4)
            .get();
        
        let count = 0;
        snapshot.forEach(doc => {
            if (doc.id === postId) return;
            if (count >= 3) return;
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
                </div>
            `;
            count++;
        });
        if (snapshot.size > 1) seeMoreBox.style.display = 'block';
    } catch (e) { console.error(e); }
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
}

// সাইডবার ও অন্যান্য মেনু লজিক (হুবহু রাখা হয়েছে)
document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const closeMenu = document.getElementById('closeMenu');
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

    if (closeMenu) closeMenu.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');
});
