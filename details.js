const db = firebase.firestore();
const auth = firebase.auth();

// আপনার প্রোজেক্টের Firebase কনফিগারেশন
const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b351"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const propertyId = params.get('id');

    if (!propertyId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const doc = await db.collection('properties').doc(propertyId).get();
        if (doc.exists) {
            renderDetails(doc.data(), propertyId);
        } else {
            alert('প্রপার্টিটি পাওয়া যায়নি!');
        }
    } catch (err) {
        console.error("ডেটা লোড এরর:", err);
    }
});

function renderDetails(data, id) {
    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('main-content-area').style.display = 'block';

    // ১. বেসিক তথ্য সেট করা
    document.getElementById('view-title').textContent = data.title;
    document.getElementById('view-price').textContent = `৳ ${Number(data.price).toLocaleString('bn-BD')} ${data.category === 'ভাড়া' ? '/ মাস' : ''}`;
    document.getElementById('view-location').innerHTML += data.location || data.district;
    document.getElementById('view-desc').textContent = data.description;

    // ২. স্মার্ট ইমেজ গ্যালারি (৫টি ছবি হ্যান্ডলিং)
    const displayFrame = document.getElementById('display-frame');
    const thumbGallery = document.getElementById('thumb-gallery');
    
    if (data.images && data.images.length > 0) {
        displayFrame.src = data.images[0].url;
        data.images.forEach((img, index) => {
            const thumb = document.createElement('img');
            thumb.src = img.url;
            if (index === 0) thumb.classList.add('active');
            
            thumb.onclick = () => {
                displayFrame.src = img.url;
                document.querySelectorAll('.gallery-nav img').forEach(i => i.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbGallery.appendChild(thumb);
        });
    }

    // ৩. ডাইনামিক স্পেসিফিকেশন (post.js এর ইনপুট ফিল্ড অনুযায়ী)
    const specGrid = document.getElementById('spec-grid');
    const config = {
        category: { label: 'ধরণ', icon: 'category' },
        subCategory: { label: 'টাইপ', icon: 'home' },
        beds: { label: 'বেডরুম', icon: 'bed' },
        baths: { label: 'বাথরুম', icon: 'shower' },
        area: { label: 'আয়তন', icon: 'straighten' },
        floorLevel: { label: 'তলা', icon: 'layers' },
        facing: { label: 'দিক', icon: 'explore' },
        completionStatus: { label: 'অবস্থা', icon: 'verified' }
    };

    Object.keys(config).forEach(key => {
        if (data[key]) {
            const item = document.createElement('div');
            item.className = 'spec-item';
            item.innerHTML = `
                <i class="material-icons">${config[key].icon}</i>
                <div>
                    <span class="spec-label">${config[key].label}</span>
                    <span class="spec-value">${data[key]}</span>
                </div>
            `;
            specGrid.appendChild(item);
        }
    });

    // ৪. চ্যাট বাটন লজিক (messages.js এর সাথে ইন্টিগ্রেশন)
    document.getElementById('btn-start-chat').onclick = () => {
        window.location.href = `messages.html?chatId=${id}`;
    };
}
