const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    if (!id) { window.location.href = 'index.html'; return; }

    try {
        const doc = await db.collection('properties').doc(id).get();
        if (doc.exists) {
            const data = doc.data();
            renderProperty(data, id);
        } else {
            alert("পোস্টটি খুঁজে পাওয়া যায়নি!");
        }
    } catch (error) {
        console.error("Error fetching data:", error);
    }
});

function renderProperty(data, id) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('main-view').style.display = 'block';

    // ১. টেক্সট ডেটা সেট করা
    document.getElementById('v-title').textContent = data.title;
    document.getElementById('v-price').textContent = `৳ ${Number(data.price).toLocaleString('bn-BD')} ${data.category === 'ভাড়া' ? '/ মাস' : ''}`;
    document.getElementById('v-location').innerHTML += data.location || data.district;
    document.getElementById('v-desc').textContent = data.description;

    // ২. ইমেজ গ্যালারি হ্যান্ডলিং
    const activeImg = document.getElementById('active-image');
    const thumbBox = document.getElementById('thumb-container');
    
    if (data.images && data.images.length > 0) {
        activeImg.src = data.images[0].url;
        data.images.forEach((img, i) => {
            const thumb = document.createElement('img');
            thumb.src = img.url;
            if (i === 0) thumb.className = 'active';
            thumb.onclick = () => {
                activeImg.src = img.url;
                document.querySelectorAll('.thumb-list img').forEach(el => el.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbBox.appendChild(thumb);
        });
    }

    // ৩. ডাইনামিক ফিচার গ্রিড (Post.js ফিল্ড অনুযায়ী)
    const featuresGrid = document.getElementById('v-features');
    const fieldMap = {
        category: { n: 'ক্যাটাগরি', i: 'sell' },
        subCategory: { n: 'টাইপ', i: 'apartment' },
        beds: { n: 'বেডরুম', i: 'bed' },
        baths: { n: 'বাথরুম', i: 'shower' },
        area: { n: 'আয়তন', i: 'straighten' },
        floorLevel: { n: 'ফ্লোর', i: 'layers' },
        facing: { n: 'দিক', i: 'explore' },
        completionStatus: { n: 'অবস্থা', i: 'verified' }
    };

    Object.keys(fieldMap).forEach(key => {
        if (data[key]) {
            featuresGrid.innerHTML += `
                <div class="info-item">
                    <i class="material-icons">${fieldMap[key].i}</i>
                    <div>
                        <span class="info-label">${fieldMap[key].n}</span>
                        <span class="info-data">${data[key]}</span>
                    </div>
                </div>`;
        }
    });

    // ৪. চ্যাট বাটন লজিক (messages.js এর সাথে সিঙ্ক করা)
    document.getElementById('startChat').onclick = () => {
        window.location.href = `messages.html?chatId=${id}`;
    };
        }
