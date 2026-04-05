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

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;
    const doc = await db.collection('properties').doc(postId).get();
    if (doc.exists) {
        const data = doc.data();
        renderDetails(data);
        loadRelatedPosts(data);
    }
});

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    // ১. দামের সাথে ইউনিট ব্র্যাকেটে (যেমন: ২,৫০,০০০ (শতক))
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || ""; // post.js থেকে সংগৃহীত ইউনিট
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // ইমেজ গ্যালারি
    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));
    if (data.documents?.khotian) images.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) images.push(data.documents.sketch.url || data.documents.sketch);

    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';
    images.slice(0, 5).forEach(url => {
        const div = document.createElement('div');
        div.className = 'gal-item';
        div.innerHTML = `<img src="${url}" onclick="openLightbox('${url}')">`;
        gallery.appendChild(div);
    });

    const addRow = (tableId, label, value) => {
        if (!value || value === "") return;
        const table = document.getElementById(tableId);
        table.innerHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // প্রপার্টি তথ্য
    addRow('table-basic', "ক্যাটাগরি", data.category);
    addRow('table-basic', "টাইপ", data.type);
    addRow('table-basic', "বেডরুম", data.bedrooms || data.rooms);
    addRow('table-basic', "বাথরুম", data.bathrooms);
    addRow('table-basic', "ফ্লোর নম্বর", data.floorNo);
    addRow('table-basic', "জমির পরিমাণ", data.landArea);

    // মালিকানা (বিক্রয় হলে)
    if (data.category === 'বিক্রয়' && data.owner) {
        document.getElementById('section-owner').style.display = 'block';
        addRow('table-owner', "দাতার নাম", data.owner.donorName);
        addRow('table-owner', "দাগ ও ধরন", `${data.owner.dagNo} (${data.owner.dagNoType})`);
        addRow('table-owner', "মৌজা", data.owner.mouja);
    }

    // অবস্থান (থানা সহ)
    addRow('table-location', "জেলা", data.location?.district);
    addRow('table-location', "উপজেলা", data.location?.upazila);
    addRow('table-location', "থানা", data.location?.thana); // থানা যুক্ত করা হলো
    addRow('table-location', "ইউনিয়ন", data.location?.union);
    addRow('table-location', "গ্রাম/এলাকা", data.location?.village);
    addRow('table-location', "রাস্তা", data.location?.road);

    if (data.googleMap) {
        const m = document.getElementById('p-map');
        m.href = data.googleMap;
        m.style.display = 'flex';
    }

    addRow('table-contact', "প্রাথমিক ফোন", data.phoneNumber);
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
}

// সম্পর্কিত পোস্ট লজিক: গ্রাম > থানা > জেলা
async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');
    const seeMoreBox = document.getElementById('see-more-box');
    const btnSeeMore = document.getElementById('btn-see-more');

    try {
        // ১. প্রথমে একই ক্যাটাগরির সব পোস্ট নিব (ফিল্টার করার জন্য)
        const snapshot = await db.collection('properties')
            .where('category', '==', currentData.category)
            .limit(50) 
            .get();

        let allPosts = [];
        snapshot.forEach(doc => {
            if (doc.id !== postId) allPosts.push({ id: doc.id, ...doc.data() });
        });

        // ২. অগ্রাধিকার অনুযায়ী সাজানো (গ্রাম > থানা > জেলা)
        allPosts.sort((a, b) => {
            const aVillage = a.location?.village === currentData.location?.village ? 1 : 0;
            const bVillage = b.location?.village === currentData.location?.village ? 1 : 0;
            if (aVillage !== bVillage) return bVillage - aVillage;

            const aThana = a.location?.thana === currentData.location?.thana ? 1 : 0;
            const bThana = b.location?.thana === currentData.location?.thana ? 1 : 0;
            if (aThana !== bThana) return bThana - aThana;

            const aDist = a.location?.district === currentData.location?.district ? 1 : 0;
            const bDist = b.location?.district === currentData.location?.district ? 1 : 0;
            return bDist - aDist;
        });

        // ৩. প্রথম ১০টি দেখানো
        const displayPosts = allPosts.slice(0, 10);
        displayPosts.forEach(post => {
            const price = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            list.innerHTML += `
                <div class="rel-card" onclick="location.href='details.html?id=${post.id}'">
                    <img src="${post.images?.[0]?.url || post.images?.[0] || 'placeholder.jpg'}">
                    <div class="rel-info">
                        <h4 class="rel-title">${post.title}</h4>
                        <p class="rel-price">৳ ${price} (${post.priceUnit || ''})</p>
                        <p class="rel-loc">${post.location?.village}, ${post.location?.thana}, ${post.location?.district}</p>
                    </div>
                </div>`;
        });

        if (allPosts.length > 10) {
            seeMoreBox.style.display = 'block';
            btnSeeMore.onclick = () => {
                location.href = `all-posts.html?category=${currentData.category}`;
            };
        }
    } catch (e) { console.error(e); }
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
        }
