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

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('id');

    if (!propId) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const doc = await db.collection('properties').doc(propId).get();
        if (doc.exists) {
            renderPropertyData(doc.data(), propId);
        } else {
            alert("দুঃখিত, এই পোস্টটি খুঁজে পাওয়া যায়নি।");
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error("Error fetching details:", error);
    }
});

function renderPropertyData(data, id) {
    // লোডার লুকানো
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('details-content').style.display = 'block';

    // ১. বেসিক তথ্য সেট করা
    document.getElementById('display-title').textContent = data.title;
    document.getElementById('display-price').textContent = Number(data.price).toLocaleString('bn-BD');
    document.getElementById('display-location').querySelector('span').textContent = `${data.area || ''}, ${data.city || ''}`;
    document.getElementById('display-description').textContent = data.description;

    // ২. ইমেজ সেট করা
    const imgContainer = document.getElementById('main-image-view');
    if (data.images && data.images.length > 0) {
        imgContainer.innerHTML = `<img src="${data.images[0].url}" alt="Property Image">`;
    }

    // ৩. ডাইনামিক স্পেকস গ্রিড তৈরি (পোস্ট পেইজের সকল ডেটা)
    const specsContainer = document.getElementById('display-specs');
    specsContainer.innerHTML = ''; // ক্লিয়ার করা

    const fields = [
        { label: 'ক্যাটাগরি', value: data.category, icon: 'category' },
        { label: 'ধরণ', value: data.type, icon: 'apartment' },
        { label: 'বেডরুম', value: data.bedrooms, icon: 'bed' },
        { label: 'বাথরুম', value: data.bathrooms, icon: 'bathtub' },
        { label: 'আয়তন', value: data.size ? data.size + ' স্কয়ার ফিট' : null, icon: 'square_foot' },
        { label: 'ফ্লোর লেভেল', value: data.floorLevel, icon: 'layers' },
        { label: 'লিফট', value: data.lift, icon: 'elevator' },
        { label: 'জেনারেটর', value: data.generator, icon: 'bolt' }
    ];

    fields.forEach(field => {
        if (field.value && field.value !== "চিহ্নিত নেই") {
            specsContainer.innerHTML += `
                <div class="spec-item">
                    <i class="material-icons">${field.icon}</i>
                    <span>${field.label}</span>
                    <strong>${field.value}</strong>
                </div>`;
        }
    });

    // ৪. মালিকের তথ্য ও চ্যাট লজিক
    loadOwner(data.userId, data.createdAt);

    document.getElementById('chatNowBtn').onclick = () => {
        const currentUser = firebase.auth().currentUser;
        if (!currentUser) {
            alert("চ্যাট করতে অনুগ্রহ করে লগইন করুন।");
            window.location.href = 'auth.html';
            return;
        }
        if (currentUser.uid === data.userId) {
            alert("এটি আপনার নিজের পোস্ট।");
            return;
        }
        // messages.js এর startChat ফাংশন কল করা
        window.location.href = `messages.html?chatId=${currentUser.uid}_${data.userId}_${id}`;
    };
}

async function loadOwner(uid, timestamp) {
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            document.getElementById('display-owner-name').textContent = userData.fullName || "ব্যবহারকারী";
            if (userData.profilePic) {
                document.getElementById('display-owner-img').src = userData.profilePic;
            }
        }
        if (timestamp) {
            const date = timestamp.toDate().toLocaleDateString('bn-BD');
            document.getElementById('display-post-date').textContent = `পোস্ট করা হয়েছে: ${date}`;
        }
    } catch (e) { console.log(e); }
    }
