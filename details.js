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

// URL থেকে ID সংগ্রহ
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) {
        document.body.innerHTML = "<h2 style='text-align:center;margin-top:50px;'>দুঃখিত, কোনো পোস্ট পাওয়া যায়নি!</h2>";
        return;
    }

    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            const data = doc.data();
            renderUI(data);
            loadRelated(data.category);
        } else {
            alert("পোস্টটি মুছে ফেলা হয়েছে বা খুঁজে পাওয়া যাচ্ছে না।");
        }
    } catch (error) {
        console.error("Error:", error);
    }
});

function renderUI(data) {
    // ১. টেক্সট ডাটা
    document.getElementById('p-title').textContent = data.title || "শিরোনাম নেই";
    document.getElementById('p-desc').textContent = data.description || "কোনো বিবরণ দেওয়া হয়নি।";
    
    // ২. গ্যালারি (৫টি ছবি)
    const gallery = document.getElementById('p-gallery');
    let images = [];
    if (data.images) images = data.images.map(img => img.url || img);
    if (data.documents?.khotian) images.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) images.push(data.documents.sketch.url || data.documents.sketch);

    gallery.innerHTML = '';
    images.slice(0, 5).forEach((url, index) => {
        const div = document.createElement('div');
        div.className = 'gal-item';
        div.innerHTML = `<img src="${url}" onclick="openLightbox('${url}', event)">`;
        gallery.appendChild(div);
    });

    // ৩. ইনফো টেবিল (তোমার পোস্ট পেজের সব ইউনিট পর্যবেক্ষণ করে)
    const infoTable = document.getElementById('p-info-table');
    const specs = [
        ["ক্যাটাগরি", data.category],
        ["টাইপ", data.type],
        ["মূল্য", data.price || data.rent ? `৳ ${data.price || data.rent}` : "আলোচনা সাপেক্ষ"],
        ["বেডরুম", data.bedrooms],
        ["বাথরুম", data.bathrooms],
        ["ফ্লোর", data.floorLevel],
        ["জমির পরিমাণ", data.landArea ? `${data.landArea} ${data.landUnit || ''}` : null],
        ["জেলা", data.location?.district],
        ["উপজেলা", data.location?.upazila],
        ["ইউনিয়ন/ওয়ার্ড", data.location?.union || data.location?.wardNo],
        ["গ্রাম/রাস্তা", data.location?.village || data.location?.road]
    ];

    infoTable.innerHTML = specs
        .filter(s => s[1]) // শুধু যেগুলোর ডাটা আছে সেগুলো দেখাবে
        .map(s => `<tr><td>${s[0]}</td><td>${s[1]}</td></tr>`)
        .join('');

    // ৪. কন্টাক্ট ও ম্যাপ
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
    
    if (data.googleMapLink) {
        const mapBtn = document.getElementById('p-map');
        mapBtn.href = data.googleMapLink;
        mapBtn.style.display = 'flex';
    }

    // ৫. শেয়ার
    document.getElementById('p-share').onclick = () => {
        if (navigator.share) {
            navigator.share({ title: data.title, url: window.location.href });
        } else {
            alert("লিঙ্কটি কপি করুন: " + window.location.href);
        }
    };
}

// লাইটবক্স ফাংশন
function openLightbox(url, e) {
    e.stopPropagation();
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
}

// সম্পর্কিত পোস্ট (একই ক্যাটাগরির)
async function loadRelated(cat) {
    const list = document.getElementById('related-list');
    const snap = await db.collection('properties').where('category', '==', cat).limit(3).get();
    
    list.innerHTML = '';
    snap.forEach(doc => {
        if (doc.id === postId) return;
        const d = doc.data();
        list.innerHTML += `
            <div class="related-card" onclick="location.href='details.html?id=${doc.id}'">
                <img src="${d.images?.[0]?.url || d.images?.[0] || 'placeholder.jpg'}">
                <div>
                    <h4 style="margin:0">${d.title}</h4>
                    <p style="color:var(--primary);margin:5px 0">৳ ${d.price || d.rent || '---'}</p>
                </div>
            </div>
        `;
    });
}
