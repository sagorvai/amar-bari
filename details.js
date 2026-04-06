const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

// প্রোফাইল পিকচার ফিক্স
auth.onAuthStateChanged(user => {
    if (user) {
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists && doc.data().profileImage) {
                const img = document.getElementById('profileImage');
                img.src = doc.data().profileImage;
                img.style.display = 'block';
                document.getElementById('defaultProfileIcon').style.display = 'none';
            }
        });
    }
});

document.addEventListener('DOMContentLoaded', async () => {
    // মেনু কন্ট্রোল
    const menuBtn = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    menuBtn.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
    overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };

    if (!postId) return;
    const doc = await db.collection('properties').doc(postId).get();
    if (doc.exists) renderDetails(doc.data());
});

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";
    
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // ইমেজ গ্যালারি
    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';
    let images = data.images || [];
    images.slice(0, 5).forEach(img => {
        const url = img.url || img;
        gallery.innerHTML += `<div class="gal-item"><img src="${url}" onclick="openLightbox('${url}')"></div>`;
    });

    const addRow = (tableId, label, value) => {
        if (!value) return;
        const table = document.getElementById(tableId);
        table.innerHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    const basicT = 'table-basic';
    document.getElementById(basicT).innerHTML = ""; 

    addRow(basicT, "ক্যাটাগরি", data.category);
    addRow(basicT, "টাইপ", data.type);

    // --- নতুন শর্তানুযায়ী তথ্য যুক্ত করা ---
    
    // ক্যাটাগরি: বিক্রয়
    if (data.category === 'বিক্রয়') {
        if (data.type === 'প্লট') addRow(basicT, "প্লট নং", data.plotNo);
        if (data.type === 'বাড়ি') {
            addRow(basicT, "তলা সংখ্যা", data.totalFloors);
            addRow(basicT, "রুম সংখ্যা", data.bedrooms || data.rooms);
            addRow(basicT, "বাথরুম সংখ্যা", data.bathrooms);
            addRow(basicT, "কিচেন সংখ্যা", data.kitchen);
        }
    }

    // ক্যাটাগরি: ভাড়া
    if (data.category === 'ভাড়া') {
        if (data.type === 'বাড়ি') {
            addRow(basicT, "তলা সংখ্যা", data.totalFloors);
            addRow(basicT, "রুম", data.bedrooms || data.rooms);
            addRow(basicT, "বাথরুম", data.bathrooms);
            addRow(basicT, "কিচেন", data.kitchen);
        }
        // বাড়ি, ফ্ল্যাট, অফিস, দোকান - সবার জন্যই ওঠার তারিখ ও এডভ্যান্স
        addRow(basicT, "ওঠার তারিখ", data.availableDate);
        addRow(basicT, "এডভ্যান্স টাকা", data.advanceAmount ? `৳ ${data.advanceAmount}` : "");
    }

    // সাধারণ তথ্য
    addRow(basicT, "রাস্তা", data.roadWidth ? `${data.roadWidth} ফিট` : "");
    addRow(basicT, "সুবিধা সমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);

    // অবস্থান[cite: 2]
    const locT = 'table-location';
    document.getElementById(locT).innerHTML = "";
    addRow(locT, "জেলা", data.location?.district);
    addRow(locT, "উপজেলা", data.location?.upazila);
    addRow(locT, "গ্রাম/এলাকা", data.location?.village);

    // যোগাযোগ
    const conT = 'table-contact';
    document.getElementById(conT).innerHTML = "";
    addRow(conT, "ফোন", data.phoneNumber);
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
        }
