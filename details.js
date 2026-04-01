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

// URL থেকে Post ID নেওয়া (যেমন: details.html?id=ABC123)
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) {
        alert("পোস্ট আইডি পাওয়া যায়নি!");
        window.location.href = 'index.html';
        return;
    }

    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            const data = doc.data();
            renderDetails(data);
            loadRelatedPosts(data.category, data.type);
        } else {
            alert("পোস্টটি খুঁজে পাওয়া যায়নি!");
        }
    } catch (e) { console.error(e); }
});

function renderDetails(data) {
    document.getElementById('det-title').textContent = data.title;
    document.getElementById('det-desc').textContent = data.description;

    // গ্যালারি রেন্ডারিং (৫টি ছবি)
    const gallery = document.getElementById('det-gallery');
    const allImages = [...(data.images || []), ...(data.documents ? [data.documents.khotian, data.documents.sketch].filter(Boolean) : [])];
    
    gallery.innerHTML = '';
    allImages.slice(0, 5).forEach((img, index) => {
        const imgTag = document.createElement('img');
        imgTag.src = img.url || img;
        imgTag.className = index === 0 ? 'main-img' : 'sub-img';
        imgTag.onclick = () => window.open(imgTag.src, '_blank');
        gallery.appendChild(imgTag);
    });

    // প্রিভিউ স্টাইলে তথ্য প্রদর্শন
    const infoGrid = document.getElementById('det-info');
    infoGrid.innerHTML = `
        <div class="info-section">
            <h3>🏠 মূল তথ্য</h3>
            <p><strong>ক্যাটাগরি:</strong> ${data.category}</p>
            <p><strong>টাইপ:</strong> ${data.type}</p>
            <p><strong>দাম:</strong> ৳ ${data.price || data.rent || 'আলোচনা সাপেক্ষ'}</p>
        </div>
        <div class="info-section">
            <h3>📍 অবস্থান</h3>
            <p><strong>জেলা:</strong> ${data.location?.district}</p>
            <p><strong>উপজেলা:</strong> ${data.location?.upazila}</p>
            <p><strong>এলাকা:</strong> ${data.location?.village || 'প্রযোজ্য নয়'}</p>
        </div>
    `;

    // যোগাযোগ লজিক
    document.getElementById('call-link').href = `tel:${data.phoneNumber}`;
    document.getElementById('msg-link').onclick = () => {
        // মেসেজ সিস্টেমে নিয়ে যাবে (senderId ও receiverId সহ)
        window.location.href = `messages.html?to=${data.userId}&ref=${postId}`;
    };
}

// রিলেটিভ পোস্ট লোড (একই ক্যাটাগরির ৩টি পোস্ট)
async function loadRelatedPosts(category, type) {
    const grid = document.getElementById('related-grid');
    const snapshot = await db.collection('properties')
        .where('category', '==', category)
        .limit(4)
        .get();

    grid.innerHTML = '';
    snapshot.forEach(doc => {
        if (doc.id === postId) return; // বর্তমান পোস্ট বাদ দিয়ে
        const p = doc.data();
        grid.innerHTML += `
            <div class="property-card" onclick="location.href='details.html?id=${doc.id}'">
                <img src="${p.images?.[0]?.url || 'placeholder.jpg'}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
                <h4>${p.title}</h4>
                <p>৳ ${p.price || p.rent}</p>
            </div>
        `;
    });
                }
