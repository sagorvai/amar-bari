// Firebase কনফিগারেশন (আপনার index.html থেকে কপি করুন)
const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b351"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (!propertyId) {
        alert("প্রপার্টি আইডি পাওয়া যায়নি!");
        window.location.href = 'index.html';
        return;
    }

    try {
        const doc = await db.collection('properties').doc(propertyId).get();
        if (!doc.exists) {
            alert("প্রপার্টিটি খুঁজে পাওয়া যায়নি!");
            return;
        }

        const data = doc.data();
        renderDetails(data, propertyId);
    } catch (error) {
        console.error("ডেটা লোড করতে সমস্যা:", error);
    }
});

function renderDetails(data, id) {
    document.getElementById('details-loader').style.display = 'none';
    document.getElementById('property-details').style.display = 'block';

    // শিরোনাম সেট করা
    document.getElementById('prop-title').textContent = data.title || "শিরোনামহীন প্রপার্টি";

    // ছবি প্রদর্শন (৫টি ছবি থাকলে সব দেখাবে)
    const gallery = document.getElementById('image-gallery');
    if (data.images && data.images.length > 0) {
        data.images.forEach(imgObj => {
            const img = document.createElement('img');
            img.src = imgObj.url;
            img.alt = "Property Image";
            img.onclick = () => window.open(img.src, '_blank');
            gallery.appendChild(img);
        });
    }

    // ডাইনামিক ফিল্ড প্রদর্শন
    const infoGrid = document.getElementById('dynamic-info');
    
    // যে ফিল্ডগুলো আমরা দেখাতে চাই
    const fieldsToShow = {
        'category': 'ক্যাটাগরি',
        'subCategory': 'ধরন',
        'price': 'মূল্য',
        'location': 'ঠিকানা',
        'area': 'আয়তন',
        'beds': 'বেডরুম',
        'baths': 'বাথরুম',
        'description': 'বিবরণ'
    };

    for (const [key, label] of Object.entries(fieldsToShow)) {
        if (data[key]) {
            const item = document.createElement('div');
            item.className = 'info-item';
            item.innerHTML = `
                <span class="info-label">${label}</span>
                <span class="info-value">${data[key]}</span>
            `;
            infoGrid.appendChild(item);
        }
    }

    // চ্যাট বাটন লজিক (আপনার messages.js এর সাথে সামঞ্জস্যপূর্ণ)
    document.getElementById('chat-start-btn').onclick = () => {
        if (typeof startChat === "function") {
            startChat(id, data.userId, data.title);
        } else {
            // যদি messages.js এখানে লোড না থাকে
            window.location.href = `messages.html?chatId=${id}`;
        }
    };
        }
