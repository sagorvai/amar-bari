// details.js
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
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', async () => {
    setupUI(); // হেডার ও সাইডবার লজিক

    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('id');

    if (!propId) { window.location.href = 'index.html'; return; }

    try {
        const doc = await db.collection('properties').doc(propId).get();
        if (doc.exists) {
            displayProperty(doc.data(), propId);
        } else {
            alert("পোস্টটি পাওয়া যায়নি!");
            window.location.href = 'index.html';
        }
    } catch (e) { console.error(e); }
});

function displayProperty(data, id) {
    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('details-view').style.display = 'block';

    // ১. ইমেজ এবং বেসিক টেক্সট
    const imgHolder = document.getElementById('image-holder');
    if (data.images && data.images.length > 0) {
        imgHolder.innerHTML = `<img src="${data.images[0].url}" alt="Property">`;
    }

    document.getElementById('p-title').textContent = data.title;
    document.getElementById('p-price').textContent = Number(data.price).toLocaleString('bn-BD');
    document.getElementById('p-loc').querySelector('span').textContent = `${data.area}, ${data.city}`;
    document.getElementById('p-desc').textContent = data.description;

    // ২. ডাইনামিক ফিল্ড গ্রিড (post.js এর ডেটা অনুযায়ী)
    const grid = document.getElementById('dynamic-info-grid');
    grid.innerHTML = '';

    const specs = [
        { label: 'ক্যাটাগরি', val: data.category, icon: 'category' },
        { label: 'ধরণ', val: data.type, icon: 'apartment' },
        { label: 'বেডরুম', val: data.bedrooms, icon: 'bed' },
        { label: 'বাথরুম', val: data.bathrooms, icon: 'bathtub' },
        { label: 'আয়তন', val: data.size ? data.size + ' স্কয়ার ফিট' : null, icon: 'square_foot' },
        { label: 'ফ্লোর নম্বর', val: data.floorLevel, icon: 'layers' },
        { label: 'লিফট', val: data.lift, icon: 'elevator' },
        { label: 'জেনারেটর', val: data.generator, icon: 'bolt' }
    ];

    specs.forEach(s => {
        if (s.val && s.val !== "চিহ্নিত নেই") {
            grid.innerHTML += `
                <div class="info-item">
                    <i class="material-icons">${s.icon}</i>
                    <span>${s.label}</span>
                    <strong>${s.val}</strong>
                </div>`;
        }
    });

    // ৩. মালিকের তথ্য ও চ্যাট
    loadOwner(data.userId, data.createdAt);

    document.getElementById('chatNowBtn').onclick = () => {
        const user = auth.currentUser;
        if (!user) { alert("চ্যাট করতে লগইন করুন"); window.location.href='auth.html'; return; }
        if (user.uid === data.userId) { alert("এটি আপনার নিজের পোস্ট"); return; }
        window.location.href = `messages.html?chatId=${user.uid}_${data.userId}_${id}`;
    };
}

// সাইটের সাধারণ UI লজিক (Header, Sidebar, Profile Pic)
function setupUI() {
    const menuBtn = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    menuBtn.onclick = () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); };
    overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            document.getElementById('profileImageWrapper').style.display = 'flex';
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().profilePic) {
                const img = document.getElementById('profileImage');
                img.src = userDoc.data().profilePic;
                img.style.display = 'block';
                document.getElementById('defaultProfileIcon').style.display = 'none';
            }
        }
    });
}

async function loadOwner(uid, time) {
    const snap = await db.collection('users').doc(uid).get();
    if (snap.exists) {
        document.getElementById('o-name').textContent = snap.data().fullName || "ব্যবহারকারী";
        if (snap.data().profilePic) document.getElementById('o-img').src = snap.data().profilePic;
    }
    if (time) {
        document.getElementById('p-date').textContent = "পোস্ট তারিখ: " + time.toDate().toLocaleDateString('bn-BD');
    }
                }
