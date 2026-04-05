// Firebase Config (আগের মতোই ঠিক আছে)
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

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;

    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            const data = doc.data();
            renderDetails(data);
            // সম্পর্কিত পোস্ট লোড করা (একই টাইপ ও ক্যাটাগরির)
            loadRelatedPosts(data.category, data.type);
        }
    } catch (e) { console.error(e); }
});

function renderDetails(data) {
    // শিরোনাম ও বর্ণনা
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";
    
    // ১. দামের সাথে ইউনিট ম্যাপিং (২,৫০,০০০ (মোট), ২,৫০,০০০ (শতক) ইত্যাদি)
    let priceText = "আলোচনা সাপেক্ষ";
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceType || ""; // post.js এ এটি 'priceType' নামে সেভ হচ্ছে
    
    if (amount) {
        priceText = `৳ ${amount} (${unit})`;
    }
    document.getElementById('p-price').textContent = priceText;

    // ২. গ্যালারি ইমেজ (৫টি ছবি)
    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));
    if (data.documents?.khotian) images.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) images.push(data.documents.sketch.url || data.documents.sketch);

    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';
    images.slice(0, 5).forEach((url) => {
        const div = document.createElement('div');
        div.className = 'gal-item';
        div.innerHTML = `<img src="${url}" onclick="openLightbox('${url}')">`;
        gallery.appendChild(div);
    });

    // ৩. অ্যাকশন বাটন লজিক (কল, মেসেজ, সেভ, শেয়ার)
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
    
    // মেসেজ বাটন (ইউজার লগইন থাকলে মেসেজে যাবে, না থাকলে এলার্ট)
    document.getElementById('p-message').onclick = (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if(user){
            if(user.uid === data.userId){
                alert("এটি আপনার নিজের পোস্ট!");
                return;
            }
            // মেসেজিং পেজে নিয়ে যাবে (receiverId ও ref postId সহ)
            window.location.href = `messages.html?to=${data.userId}&ref=${postId}`;
        } else {
            alert("মেসেজ করতে অনুগ্রহ করে লগইন করুন।");
            window.location.href = 'auth.html'; // বা লগইন পেজে
        }
    };

    // সেভ বাটন
    document.getElementById('p-save').onclick = () => {
        alert("ফিচারটি প্রক্রীয়াধীন। শীঘ্রই আপনার সেভ করা পোস্টে এটি যুক্ত হবে।");
        // ভবিষ্যতের জন্য: db.collection('saved_posts').doc(user.uid).collection('posts').doc(postId).set({...})
    };

    // শেয়ার বাটন
    document.getElementById('p-share').onclick = () => {
        if (navigator.share) {
            navigator.share({ title: data.title, url: window.location.href });
        } else {
            alert("লিঙ্কটি কপি করুন: " + window.location.href);
        }
    };

    // ৪. সেকশন ভিত্তিক ডাটা টেবিল (আগের মতই ঠিক আছে)
    const addRow = (label, value) => {
        if (!value || value === "undefined" || value === "") return "";
        return `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // --- 🏠 প্রপার্টির তথ্য ---
    const basicTable = document.getElementById('table-basic');
    basicTable.innerHTML = 
        addRow("ক্যাটাগরি", data.category) +
        addRow("টাইপ", data.type) +
        addRow("বেডরুম", data.bedrooms || data.rooms) +
        addRow("বাথরুম", data.bathrooms) +
        addRow("কিচেন", data.kitchen) +
        addRow("ফ্লোর নম্বর", data.floorNo || data.floorLevel) +
        addRow("রাস্তা (ফিট)", data.roadWidth ? `${data.roadWidth} ফিট` : "") +
        addRow("ফেসিং", data.facing) +
        addRow("সুবিধাসমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities) +
        addRow("জমির পরিমাণ", data.landArea ? `${data.landArea} ${data.landUnit || data.landAreaUnit || ''}` : "");

    // --- 📑 মালিকানা তথ্য ---
    if (data.category === 'বিক্রয়' && data.owner) {
        document.getElementById('section-ownership').style.display = 'block';
        const ownTable = document.getElementById('table-ownership');
        ownTable.innerHTML = 
            addRow("দাতার নাম", data.owner.donorName) +
            addRow("দাগ নং", data.owner.dagNo) +
            addRow("দাগ ধরন", data.owner.dagNoType) +
            addRow("মৌজা", data.owner.mouja);
    }

    // --- 📍 অবস্থান ---
    const locTable = document.getElementById('table-location');
    locTable.innerHTML = 
        addRow("বিভাগ", data.location?.division) +
        addRow("জেলা", data.location?.district) +
        addRow("উপজেলা", data.location?.upazila) +
        addRow("থানা", data.location?.thana) +
        addRow("ইউনিয়ন", data.location?.union) +
        addRow("ওয়ার্ড নম্বর", data.location?.wardNo) +
        addRow("গ্রাম/এলাকা", data.location?.village) +
        addRow("রাস্তা", data.location?.road);

    // ম্যাপ
    if (data.googleMap) {
        const mapBtn = document.getElementById('p-map');
        mapBtn.href = data.googleMap;
        mapBtn.style.display = 'flex';
    }

    // --- 📞 যোগাযোগ ---
    const contactTable = document.getElementById('table-contact');
    contactTable.innerHTML = 
        addRow("প্রাথমিক ফোন", data.phoneNumber) +
        addRow("অতিরিক্ত ফোন", data.secondaryPhone);
}

// সম্পর্কিত পোস্ট লোড ফাংশন (ছবি, শিরোনাম, দাম, অবস্থান সহ)
async function loadRelatedPosts(category, type) {
    const list = document.getElementById('related-list');
    try {
        // একই ক্যাটাগরি ও টাইপের ৪টি পোস্ট খোঁজা
        const snapshot = await db.collection('properties')
            .where('category', '==', category)
            .where('type', '==', type)
            .limit(5) // বর্তমান পোস্ট সহ
            .get();
        
        list.innerHTML = '';
        let count = 0;

        snapshot.forEach(doc => {
            if (doc.id === postId || count >= 4) return; // বর্তমান পোস্ট এবং লিমিট বাদ দেওয়া
            const d = doc.data();
            
            // সম্পর্কিত পোস্টের দামের ইউনিট ম্যাপিং
            let relPrice = "আলোচনা সাপেক্ষ";
            let relAmount = d.category === 'বিক্রয়' ? d.price : d.monthlyRent;
            if(relAmount) relPrice = `৳ ${relAmount} (${d.priceType || ''})`;

            // কার্ড তৈরির HTML
            list.innerHTML += `
                <div class="rel-card" onclick="location.href='details.html?id=${doc.id}'">
                    <img src="${d.images?.[0]?.url || d.images?.[0] || 'placeholder.jpg'}">
                    <div class="rel-info">
                        <h4 class="rel-title">${d.title || 'শিরোনামহীন'}</h4>
                        <p class="rel-price">${relPrice}</p>
                        <p class="rel-loc">
                            <i class="material-icons" style="font-size:14px;">place</i>
                            ${d.location?.village || ''}, ${d.location?.thana || ''}, ${d.location?.district || ''}
                        </td>
                    </div>
                </div>
            `;
            count++;
        });

        if (list.innerHTML === '') {
            list.innerHTML = '<p style="color:var(--gray); font-size:14px;">কোনো সম্পর্কিত পোস্ট পাওয়া যায়নি।</p>';
        }
    } catch (e) { console.log("Error loading related posts:", e); }
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
                            }
