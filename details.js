// Firebase Config আগের মতই...
const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;

    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            const data = doc.data();
            renderPropertyDetails(data);
        }
    } catch (e) { console.error(e); }
});

function renderPropertyDetails(data) {
    // শিরোনাম ও ডেসক্রিপশন
    document.getElementById('det-title').textContent = data.title;
    document.getElementById('det-desc').textContent = data.description;
    document.getElementById('det-price').textContent = `৳ ${data.price || data.rent || 'আলোচনা সাপেক্ষ'}`;

    // ১. গ্যালারি ও লাইটবক্স সেটআপ
    const imageGrid = document.getElementById('image-grid');
    const allImages = [...(data.images || [])];
    if(data.documents?.khotian) allImages.push(data.documents.khotian);
    if(data.documents?.sketch) allImages.push(data.documents.sketch);

    imageGrid.innerHTML = '';
    allImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = index === 0 ? 'main-img-box' : 'thumb-img-box';
        const url = img.url || img;
        div.innerHTML = `<img src="${url}" class="img-fit" onclick="openLightbox('${url}')">`;
        imageGrid.appendChild(div);
    });

    // ২. গুরুত্বপূর্ণ তথ্য টেবিল (Dynamic Fields পর্যবেক্ষণ করে)
    const table = document.getElementById('details-table');
    const fields = [
        ['ক্যাটাগরি', data.category],
        ['ধরণ', data.type],
        ['বেডরুম', data.bedrooms],
        ['বাথরুম', data.bathrooms],
        ['ফ্লোর নম্বর', data.floorLevel],
        ['জমির পরিমাণ', data.landArea ? `${data.landArea} ${data.landUnit}` : ''],
        ['জেলা', data.location?.district],
        ['উপজেলা', data.location?.upazila],
        ['ইউনিয়ন/ওয়ার্ড', data.location?.union || data.location?.wardNo],
        ['গ্রাম/রাস্তা', `${data.location?.village || ''} ${data.location?.road || ''}`]
    ];

    table.innerHTML = fields.map(([label, value]) => 
        value ? `<tr><td>${label}</td><td>${value}</td></tr>` : ''
    ).join('');

    // ৩. কল ও ম্যাপ লিঙ্ক
    document.getElementById('call-btn').href = `tel:${data.phoneNumber}`;
    
    const mapBtn = document.getElementById('google-map-link');
    if (data.googleMapLink) {
        mapBtn.href = data.googleMapLink;
        mapBtn.style.display = 'flex';
    } else {
        mapBtn.style.display = 'none';
    }

    // ৪. শেয়ার বাটন লজিক
    document.getElementById('share-btn').onclick = () => {
        if (navigator.share) {
            navigator.share({
                title: data.title,
                url: window.location.href
            });
        } else {
            alert("লিঙ্কটি কপি করুন: " + window.location.href);
        }
    };
}

// লাইটবক্স ফাংশন
function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
}
