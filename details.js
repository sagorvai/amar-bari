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
    // ১. সাইডবার ও ইউজার স্টেট লজিক (Header Fix)
    initGlobalUI();

    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('id');

    if (!propId) { window.location.href = 'index.html'; return; }

    try {
        const doc = await db.collection('properties').doc(propId).get();
        if (doc.exists) {
            renderFullProperty(doc.data(), propId);
        } else {
            alert("দুঃখিত, এই বিজ্ঞাপনটি এখন আর পাওয়া যাচ্ছে না।");
            window.location.href = 'index.html';
        }
    } catch (err) { console.error("Error:", err); }
});

function renderFullProperty(data, id) {
    document.getElementById('loading-box').style.display = 'none';
    document.getElementById('main-details').style.display = 'block';

    // টেক্সট ফিল্ডগুলো পূরণ করা
    document.getElementById('p-title').textContent = data.title;
    document.getElementById('p-price').textContent = Number(data.price).toLocaleString('bn-BD');
    document.getElementById('p-location').querySelector('span').textContent = `${data.area}, ${data.city}`;
    document.getElementById('p-desc').textContent = data.description;

    // ইমেজ রেন্ডারিং
    const imgBox = document.getElementById('p-image-container');
    if (data.images && data.images.length > 0) {
        imgBox.innerHTML = `<img src="${data.images[0].url}" alt="Property Image">`;
    }

    // ডাইনামিক ফিল্ড গ্রিড (পোস্ট পেইজ অনুযায়ী)
    const grid = document.getElementById('specs-grid');
    grid.innerHTML = '';

    const allSpecs = [
        { label: 'ক্যাটাগরি', val: data.category, icon: 'category' },
        { label: 'প্রপার্টির ধরন', val: data.type, icon: 'apartment' },
        { label: 'বেডরুম', val: data.bedrooms, icon: 'bed' },
        { label: 'বাথরুম', val: data.bathrooms, icon: 'bathtub' },
        { label: 'আয়তন', val: data.size ? data.size + ' স্কয়ার ফিট' : null, icon: 'square_foot' },
        { label: 'ফ্লোর লেভেল', val: data.floorLevel, icon: 'layers' },
        { label: 'লিফট', val: data.lift, icon: 'elevator' },
        { label: 'জেনারেটর', val: data.generator, icon: 'bolt' },
        { label: 'সার্ভিস চার্জ', val: data.serviceCharge, icon: 'payments' }
    ];

    allSpecs.forEach(spec => {
        if (spec.val && spec.val !== "চিহ্নিত নেই") {
            grid.innerHTML += `
                <div class="spec-tile">
                    <i class="material-icons">${spec.icon}</i>
                    <div>
                        <span>${spec.label}</span>
                        <strong>${spec.val}</strong>
                    </div>
                </div>`;
        }
    });

    // মালিকের প্রোফাইল ও তারিখ
    fetchOwner(data.userId, data.createdAt);

    // চ্যাট বাটন লজিক
    document.getElementById('chatNowBtn').onclick = () => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            alert("চ্যাট করতে অনুগ্রহ করে লগইন করুন।");
            window.location.href = 'auth.html';
            return;
        }
        if (currentUser.uid === data.userId) {
            alert("এটি আপনার নিজের পোস্ট।");
            return;
        }
        window.location.href = `messages.html?chatId=${currentUser.uid}_${data.userId}_${id}`;
    };
}

async function fetchOwner(uid, time) {
    const userSnap = await db.collection('users').doc(uid).get();
    if (userSnap.exists) {
        const u = userSnap.data();
        document.getElementById('owner-name').textContent = u.fullName || "ব্যবহারকারী";
        if (u.profilePic) document.getElementById('owner-photo').src = u.profilePic;
    }
    if (time) {
        document.getElementById('post-date').textContent = "পোস্ট করা হয়েছে: " + time.toDate().toLocaleDateString('bn-BD');
    }
}

// হেডার এবং সাইডবার ফাংশনালিটি (Global UI Fix)
function initGlobalUI() {
    const menuBtn = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    menuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            document.getElementById('profileImageWrapper').style.display = 'flex';
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().profilePic) {
                const pImg = document.getElementById('profileImage');
                pImg.src = userDoc.data().profilePic;
                pImg.style.display = 'block';
                document.getElementById('defaultProfileIcon').style.display = 'none';
            }
            // লগইন স্ট্যাটাস অনুযায়ী সাইডবার পরিবর্তন
            const loginLink = document.getElementById('login-link-sidebar');
            loginLink.innerHTML = '<i class="material-icons">logout</i> লগআউট';
            loginLink.onclick = () => auth.signOut().then(() => location.reload());
        }
    });
    }
