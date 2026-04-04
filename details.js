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
    if (!postId) {
        document.body.innerHTML = "<h3 style='text-align:center; margin-top:50px;'>পোস্ট খুঁজে পাওয়া যায়নি!</h3>";
        return;
    }

    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            const data = doc.data();
            renderDetails(data);
            loadRelatedPosts(data.category);
        } else {
            alert("এই পোস্টটি এখন আর উপলব্ধ নেই।");
        }
    } catch (e) { console.error("Error:", e); }
});

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "শিরোনামহীন";
    document.getElementById('p-price').textContent = data.price || data.rent ? `৳ ${data.price || data.rent}` : "আলোচনা সাপেক্ষ";
    document.getElementById('p-desc').textContent = data.description || "";

    // গ্যালারি ইমেজ প্রসেসিং
    allImages = [];
    if (data.images) data.images.forEach(img => allImages.push(img.url || img));
    if (data.documents?.khotian) allImages.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) allImages.push(data.documents.sketch.url || data.documents.sketch);

    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';
    allImages.slice(0, 5).forEach((url, idx) => {
        const div = document.createElement('div');
        div.className = 'gal-item';
        div.innerHTML = `<img src="${url}" onclick="openLightbox(${idx})">`;
        gallery.appendChild(div);
    });

    // তথ্য টেবিল (post.js এর ভেরিয়েবল অনুযায়ী)
    const infoTable = document.getElementById('p-info-table');
    const specs = [
        ["ক্যাটাগরি", data.category],
        ["ধরণ", data.type],
        ["বেডরুম", data.bedrooms],
        ["বাথরুম", data.bathrooms],
        ["ফ্লোর", data.floorLevel],
        ["জমির পরিমাণ", data.landArea ? `${data.landArea} ${data.landUnit || ''}` : null],
        ["জেলা", data.location?.district],
        ["উপজেলা", data.location?.upazila],
        ["ইউনিয়ন/ওয়ার্ড", data.location?.union || data.location?.wardNo],
        ["গ্রাম/রাস্তা", data.location?.village || data.location?.road]
    ];

    infoTable.innerHTML = specs
        .filter(s => s[1]) // শুধু ডাটা থাকলে দেখাবে
        .map(s => `<tr><td>${s[0]}</td><td>${s[1]}</td></tr>`)
        .join('');

    // কন্টাক্ট ও ম্যাপ লিঙ্ক
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
    if (data.googleMapLink) {
        const mapBtn = document.getElementById('p-map');
        mapBtn.href = data.googleMapLink;
        mapBtn.style.display = 'flex';
    }

    // শেয়ার বাটন
    document.getElementById('p-share').onclick = () => {
        if (navigator.share) {
            navigator.share({ title: data.title, url: window.location.href });
        } else {
            alert("লিঙ্কটি কপি করুন: " + window.location.href);
        }
    };
}

// লাইটবক্স স্লাইডার লজিক
function openLightbox(index) {
    currentIndex = index;
    document.getElementById('lb-img').src = allImages[currentIndex];
    document.getElementById('lightbox').style.display = 'flex';
}

function closeLightbox() {
    document.getElementById('lightbox').style.display = 'none';
}

function changeImg(step, event) {
    event.stopPropagation();
    currentIndex += step;
    if (currentIndex >= allImages.length) currentIndex = 0;
    if (currentIndex < 0) currentIndex = allImages.length - 1;
    document.getElementById('lb-img').src = allImages[currentIndex];
}

// সম্পর্কিত পোস্ট লোড
async function loadRelatedPosts(cat) {
    const list = document.getElementById('related-list');
    try {
        const snap = await db.collection('properties').where('category', '==', cat).limit(4).get();
        list.innerHTML = '';
        snap.forEach(doc => {
            if (doc.id === postId) return;
            const d = doc.data();
            list.innerHTML += `
                <div class="rel-card" onclick="location.href='details.html?id=${doc.id}'">
                    <img src="${d.images?.[0]?.url || d.images?.[0] || 'placeholder.jpg'}">
                    <div>
                        <h4 style="margin:0">${d.title}</h4>
                        <p style="color:var(--primary); margin:4px 0;">৳ ${d.price || d.rent || '---'}</p>
                    </div>
                </div>
            `;
        });
    } catch (e) { console.log(e); }
}

function savePost() {
    alert("সেভ ফিচারটি প্রক্রিয়াধীন। লগইন করে চেষ্টা করুন।");
                                           }
