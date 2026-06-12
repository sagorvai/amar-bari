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

document.addEventListener('DOMContentLoaded', function() {
    
    // URL থেকে Seller ID খুঁজে বের করা
    const urlParams = new URLSearchParams(window.location.search);
    const sellerId = urlParams.get('id');

    if (!sellerId) {
        alert("সেলার আইডি পাওয়া যায়নি!");
        window.location.href = 'index.html';
        return;
    }

    // UI Elements
    const loadingView = document.getElementById('loading-view');
    const mainProfileView = document.getElementById('main-profile-view');
    
    const sellerNameEl = document.getElementById('seller-name');
    const sellerBioEl = document.getElementById('seller-bio');
    const sellerEmailEl = document.getElementById('seller-email');
    const sellerPhoneEl = document.getElementById('seller-phone');
    const sellerProfessionEl = document.getElementById('seller-profession');
    const sellerLocationEl = document.getElementById('seller-location');
    const sellerOfficeEl = document.getElementById('seller-office');
    const introOfficeItem = document.getElementById('intro-office-item');
    const sellerAvatar = document.getElementById('seller-avatar');
    
    const chatBtn = document.getElementById('chat-btn');
    const callBtn = document.getElementById('call-btn');
    
    const propertiesList = document.getElementById('seller-properties-list');
    const totalPostsEl = document.getElementById('total-posts-count');
    const ratingScoreEl = document.getElementById('seller-rating-score');

    // ১. ফায়ারস্টোর থেকে সেলারের মূল ডাটা লোড করা
    async function loadSellerData() {
        try {
            const doc = await db.collection('users').doc(sellerId).get();
            if (!doc.exists) {
                loadingView.innerHTML = "<p>দুঃখিত, এই সেলারের কোনো অ্যাকাউন্ট খুঁজে পাওয়া যায়নি।</p>";
                return;
            }

            const data = doc.data();

            // নাম এবং বায়ো সেটআপ
            sellerNameEl.textContent = data.fullName || data.name || "আমাদের সেলার";
            sellerBioEl.textContent = data.bio || "নিয়মিত এবং বিশ্বস্ত প্রপার্টি ডিলার।";

            // ফেসবুক স্টাইল পরিচিতি ফিল্ডসমূহ
            sellerProfessionEl.textContent = data.profession || "যুক্ত করা নেই";
            sellerLocationEl.textContent = data.location || "যুক্ত করা নেই";
            sellerEmailEl.textContent = data.email || "গোপন রাখা হয়েছে";
            
            let phoneNum = data.phoneNumber || data.phone || "";
            if (phoneNum) {
                sellerPhoneEl.textContent = phoneNum;
                callBtn.href = `tel:${phoneNum}`; // সরাসরি কলে যুক্ত করা
            } else {
                sellerPhoneEl.textContent = "ফোন সেট করা নেই";
                callBtn.style.display = "none";
            }

            // ঐচ্ছিক অফিস অ্যাড্রেস ম্যানেজমেন্ট
            if (data.officeAddress && data.officeAddress.trim() !== "") {
                sellerOfficeEl.textContent = data.officeAddress;
                introOfficeItem.style.display = "flex";
            } else {
                introOfficeItem.style.display = "none";
            }

            // সেলার প্রোফাইল ইমেজ সেটআপ
            if (data.profilePic || data.avatarUrl) {
                sellerAvatar.src = data.profilePic || data.avatarUrl;
            }

            // রেটিং স্কোর ক্যালকুলেট
            if (data.ratingCount && data.ratingCount > 0) {
                let avg = ((data.ratingSum || 0) / data.ratingCount).toFixed(1);
                ratingScoreEl.textContent = `⭐ ${avg}`;
            }

            // চ্যাট বাটন লিংকআপ (আপনার কাস্টম চ্যাট পেজের রুটিং অনুযায়ী)
            if (chatBtn) {
                chatBtn.href = `chat.html?sellerId=${sellerId}`;
            }

            // ডাটা লোড কমপ্লিট হলে মেইন ভিউ শো করা
            loadingView.style.display = 'none';
            mainProfileView.style.display = 'block';

            // এই সেলারের সব প্রপার্টি লিস্টিং লোড করা
            loadSellerProperties(sellerId);

        } catch (error) {
            console.error("Error fetching seller data:", error);
            loadingView.innerHTML = "<p>প্রোফাইল লোড করার সময় সার্ভার ত্রুটি ঘটেছে।</p>";
        }
    }

    // ২. নির্দিষ্ট সেলারের সমস্ত লাইভ প্রপার্টি বিজ্ঞাপন ফেচ করা
    async function loadSellerProperties(uid) {
        try {
            let snapshot = await db.collection('properties').where('userId', '==', uid).get();
            if (snapshot.empty) {
                snapshot = await db.collection('properties').where('uid', '==', uid).get();
            }

            propertiesList.innerHTML = '';
            totalPostsEl.textContent = snapshot.size;

            if (snapshot.empty) {
                document.getElementById('empty-posts-message').style.display = 'block';
                return;
            }

            snapshot.forEach(doc => {
                const p = doc.data();
                const card = document.createElement('a');
                card.className = 'property-card';
                card.href = `details.html?id=${doc.id}`; // প্রপার্টি ডিটেইলস পেজ লিংক
                
                let imageUrl = 'https://via.placeholder.com/150?text=No+Image';
                if (p.images && p.images.length > 0) {
                    imageUrl = p.images[0].url || p.images[0];
                } else if (p.image) {
                    imageUrl = p.image;
                }

                let displayPrice = p.price || p.rent || p.monthlyRent || p.amount || '০';

                card.innerHTML = `
                    <img src="${imageUrl}" style="width:100%; height:105px; object-fit:cover;">
                    <div style="padding:8px;">
                        <h4 style="margin:0 0 4px 0; font-size:12px; height:32px; overflow:hidden; color:var(--dark); font-weight:600; text-decoration:none;">${p.title || 'শিরোনামহীন'}</h4>
                        <p style="color:var(--success); font-weight:bold; margin:0; font-size:12px;">৳ ${displayPrice}</p>
                    </div>
                `;
                propertiesList.appendChild(card);
            });
        } catch (e) { 
            console.error("Error loading seller properties:", e);
        }
    }

    // এক্সেকিউশন শুরু
    loadSellerData();
});
