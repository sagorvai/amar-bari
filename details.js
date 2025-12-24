const db = firebase.firestore();
const auth = firebase.auth();

// আপনার Firebase Config (index.html থেকে কপি করা)
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
    const propId = params.get('id');

    if (!propId) { window.location.href = 'index.html'; return; }

    try {
        const doc = await db.collection('properties').doc(propId).get();
        if (doc.exists) {
            renderProperty(doc.data(), propId);
        } else {
            alert('পোস্টটি পাওয়া যায়নি');
        }
    } catch (e) { console.error(e); }
});

function renderProperty(data, id) {
    document.getElementById('loader').style.display = 'none';
    document.getElementById('content-area').style.display = 'block';

    // ১. টেক্সট ডেটা সেট
    document.getElementById('view-title').textContent = data.title;
    document.getElementById('view-location').innerHTML += data.location || data.district;
    document.getElementById('view-price').textContent = `৳ ${data.price} ${data.category === 'ভাড়া' ? '/ মাস' : ''}`;
    document.getElementById('view-description').textContent = data.description;

    // ২. ইমেজ গ্যালারি লজিক
    const mainImg = document.getElementById('main-view');
    const thumbList = document.getElementById('thumb-list');
    
    if (data.images && data.images.length > 0) {
        mainImg.src = data.images[0].url;
        data.images.forEach((img, index) => {
            const tImg = document.createElement('img');
            tImg.src = img.url;
            if(index === 0) tImg.className = 'active';
            tImg.onclick = () => {
                mainImg.src = img.url;
                document.querySelectorAll('.thumb-scroll img').forEach(i => i.classList.remove('active'));
                tImg.classList.add('active');
            };
            thumbList.appendChild(tImg);
        });
    }

    // ৩. ডাইনামিক ফিল্ড গ্রিড (Post.js এর ফিল্ড অনুযায়ী)
    const grid = document.getElementById('info-grid');
    const fieldConfig = {
        'category': { label: 'ক্যাটাগরি', icon: 'category' },
        'subCategory': { label: 'প্রপার্টি টাইপ', icon: 'home' },
        'beds': { label: 'বেডরুম', icon: 'bed' },
        'baths': { label: 'বাথরুম', icon: 'shower' },
        'area': { label: 'আয়তন', icon: 'straighten' },
        'floorLevel': { label: 'তলা', icon: 'layers' },
        'facing': { label: 'দিক', icon: 'explore' },
        'completionStatus': { label: 'অবস্থা', icon: 'check_circle' }
    };

    Object.keys(fieldConfig).forEach(key => {
        if (data[key]) {
            const box = document.createElement('div');
            box.className = 'info-box';
            box.innerHTML = `
                <i class="material-icons">${fieldConfig[key].icon}</i>
                <div>
                    <span class="info-label">${fieldConfig[key].label}</span>
                    <span class="info-value">${data[key]}</span>
                </div>
            `;
            grid.appendChild(box);
        }
    });

    // ৪. চ্যাট বাটন লজিক
    document.getElementById('contact-btn').onclick = () => {
        window.location.href = `messages.html?chatId=${id}`;
    };
    }
