const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', async () => {
    // হেডার ও সাইডবার লজিক (আপনার index.js থেকে নেওয়া)
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    // ১. প্রপার্টি আইডি সংগ্রহ
    const params = new URLSearchParams(window.location.search);
    const propId = params.get('id');

    if (!propId) { window.location.href = 'index.html'; return; }

    try {
        const doc = await db.collection('properties').doc(propId).get();
        if (!doc.exists) { alert("পোস্টটি পাওয়া যায়নি"); return; }

        const data = doc.data();

        // ২. টাইটেল, দাম ও ছবি সেট করা
        document.getElementById('det-title').innerText = data.title;
        document.getElementById('det-price').innerText = data.price;
        document.getElementById('det-location').innerText = data.location;
        document.getElementById('det-desc').innerText = data.description;
        document.getElementById('det-call').href = `tel:${data.ownerPhone}`;

        if (data.images && data.images.length > 0) {
            const mainImg = document.getElementById('main-display-img');
            const thumbList = document.getElementById('thumb-list');
            mainImg.src = data.images[0].url;

            data.images.forEach(img => {
                const thumb = document.createElement('img');
                thumb.src = img.url;
                thumb.style = "width:70px; height:50px; object-fit:cover; border-radius:5px; cursor:pointer;";
                thumb.onclick = () => mainImg.src = img.url;
                thumbList.appendChild(thumb);
            });
        }

        // ৩. ডাইনামিক ফিল্ড লজিক (আপনার post.js এর ফিল্ড অনুযায়ী)
        const grid = document.getElementById('dynamic-data-container');
        
        // সব সম্ভাব্য ফিল্ডের একটি বাংলা ম্যাপ
        const fieldMap = {
            'category': 'ক্যাটাগরি',
            'propertyType': 'ধরণ',
            'size': 'আয়তন',
            'sizeUnit': 'ইউনিট',
            'bed': 'বেডরুম',
            'bath': 'বাথরুম',
            'floorLevel': 'ফ্লোর',
            'roadSize': 'রাস্তার আকার',
            'propertyFacing': 'দিক',
            'completionStatus': 'অবস্থা',
            'ownerName': 'মালিকের নাম'
        };

        // ডেটাতে থাকা সকল কী (Key) লুপ করে দেখানো
        Object.keys(data).forEach(key => {
            if (fieldMap[key] && data[key] && data[key] !== "") {
                const div = document.createElement('div');
                div.innerHTML = `<strong style="color:#7f8c8d;">${fieldMap[key]}:</strong> <span style="color:#2c3e50;">${data[key]}</span>`;
                grid.appendChild(div);
            }
        });

        document.getElementById('loading').style.display = 'none';
        document.getElementById('details-view').style.display = 'block';

    } catch (error) {
        console.error("Error:", error);
    }
});

// প্রোফাইল ইমেজ হ্যান্ডলিং (আপনার index.js থেকে)
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().profilePicture) {
                document.getElementById('profileImage').src = doc.data().profilePicture;
                document.getElementById('profileImage').style.display = 'block';
                document.getElementById('defaultProfileIcon').style.display = 'none';
            }
        });
    }
});
