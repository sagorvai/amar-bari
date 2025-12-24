const db = firebase.firestore();
const auth = firebase.auth();

// Firebase Init (আপনার কনফিগারেশন)
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
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (!propertyId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const doc = await db.collection('properties').doc(propertyId).get();
        if (doc.exists) {
            const data = doc.data();
            displayDetails(data, propertyId);
        }
    } catch (error) {
        console.error("Error:", error);
    }
});

function displayDetails(data, id) {
    // ১. টেক্সট ডেটা
    document.getElementById('prop-title').innerText = data.title;
    document.getElementById('prop-price').innerText = Number(data.price).toLocaleString('bn-BD');
    document.getElementById('prop-location').innerHTML += data.location || data.district;
    document.getElementById('prop-desc').innerText = data.description;

    // ২. ইমেজ গ্যালারি (৫টি ছবি হ্যান্ডলিং)
    const activeImg = document.getElementById('active-image');
    const thumbRow = document.getElementById('image-thumbnails');
    
    if (data.images && data.images.length > 0) {
        activeImg.src = data.images[0].url;
        data.images.forEach((img, i) => {
            const thumb = document.createElement('img');
            thumb.src = img.url;
            thumb.className = i === 0 ? 'thumb active' : 'thumb';
            thumb.onclick = () => {
                activeImg.src = img.url;
                document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbRow.appendChild(thumb);
        });
    }

    // ৩. ডাইনামিক ফিচার গ্রিড (Post.js লজিক অনুসরণ করে)
    const grid = document.getElementById('features-grid');
    const config = {
        category: { n: 'ধরণ', i: 'category' },
        beds: { n: 'বেডরুম', i: 'bed' },
        baths: { n: 'বাথরুম', i: 'shower' },
        area: { n: 'আয়তন', i: 'square_foot' },
        floorLevel: { n: 'তলা', i: 'layers' },
        facing: { n: 'দিক', i: 'explore' }
    };

    Object.keys(config).forEach(key => {
        if (data[key]) {
            grid.innerHTML += `
                <div class="f-item">
                    <i class="material-icons">${config[key].i}</i>
                    <div>
                        <small>${config[key].n}</small>
                        <p>${data[key]}</p>
                    </div>
                </div>`;
        }
    });

    // ৪. চ্যাট বাটন
    document.getElementById('startChatBtn').onclick = () => {
        window.location.href = `messages.html?chatId=${id}`;
    };
            }
