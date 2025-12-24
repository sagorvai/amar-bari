// Firebase কনফিগারেশন
const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b351"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('id');

    if (!propId) { window.location.href = 'index.html'; return; }

    try {
        const doc = await db.collection('properties').doc(propId).get();
        if (doc.exists) {
            renderView(doc.data(), propId);
        } else {
            alert("দুঃখিত, এই পোস্টটি আর নেই।");
        }
    } catch (err) {
        console.error(err);
    }
});

function renderView(data, id) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('details-view').style.display = 'block';

    // ১. টেক্সট ডেটা ম্যাপিং
    document.getElementById('p-title').innerText = data.title;
    document.getElementById('p-price').innerText = `৳ ${Number(data.price).toLocaleString('bn-BD')} ${data.category === 'ভাড়া' ? '/ মাস' : ''}`;
    document.getElementById('p-location').innerHTML += data.location || data.district;
    document.getElementById('p-description').innerText = data.description;

    // ২. অ্যাডভান্সড ইমেজ গ্যালারি
    const mainImg = document.getElementById('main-img-display');
    const thumbContainer = document.getElementById('thumbnail-list');
    
    if (data.images && data.images.length > 0) {
        mainImg.src = data.images[0].url;
        data.images.forEach((imgObj, idx) => {
            const tImg = document.createElement('img');
            tImg.src = imgObj.url;
            if (idx === 0) tImg.classList.add('active');
            
            tImg.onclick = () => {
                mainImg.src = imgObj.url;
                document.querySelectorAll('.thumb-nav img').forEach(i => i.classList.remove('active'));
                tImg.classList.add('active');
            };
            thumbContainer.appendChild(tImg);
        });
    }

    // ৩. ডাইনামিক ফিচার গ্রিড (post.js এর ইনপুট ফিল্ডের ওপর ভিত্তি করে)
    const specs = document.getElementById('specs-container');
    const fieldMapping = {
        category: { n: 'ক্যাটাগরি', i: 'sell' },
        subCategory: { n: 'প্রপার্টি টাইপ', i: 'apartment' },
        beds: { n: 'বেডরুম', i: 'bed' },
        baths: { n: 'বাথরুম', i: 'bathtub' },
        area: { n: 'আয়তন', i: 'square_foot' },
        floorLevel: { n: 'তলা', i: 'stairs' },
        facing: { n: 'দিক', i: 'explore' },
        completionStatus: { n: 'অবস্থা', i: 'new_releases' }
    };

    Object.keys(fieldMapping).forEach(key => {
        if (data[key] && data[key] !== "") {
            specs.innerHTML += `
                <div class="spec-card">
                    <i class="material-icons">${fieldMapping[key].i}</i>
                    <div>
                        <span class="spec-label">${fieldMapping[key].n}</span>
                        <span class="spec-data">${data[key]}</span>
                    </div>
                </div>`;
        }
    });

    // ৪. সরাসরি চ্যাট ইন্টিগ্রেশন
    document.getElementById('chatNowBtn').onclick = () => {
        window.location.href = `messages.html?chatId=${id}`;
    };
        }
