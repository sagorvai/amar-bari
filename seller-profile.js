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

// ইউআরএল থেকে বিক্রেতার userId সংগ্রহ করা
const sUrlParams = new URLSearchParams(window.location.search);
const targetUserId = sUrlParams.get('userId');

document.addEventListener('DOMContentLoaded', () => {
    if (!targetUserId) {
        alert("ভুল ব্যবহারকারী আইডি!");
        window.history.back();
        return;
    }
    loadSellerProfileData();
    loadSellerProperties();
});

// ১. বিক্রেতার প্রোফাইল ইনফো (নাম, ছবি ও বায়ো) লোড করা
function loadSellerProfileData() {
    db.collection('users').doc(targetUserId).get().then(doc => {
        if (doc.exists) {
            const uData = doc.data();
            document.getElementById('s-name').textContent = uData.fullName || uData.name || "সম্মানিত বিক্রেতা";
            document.getElementById('s-email').textContent = uData.email || "ইমেইল গোপন রাখা হয়েছে";
            
            // যদি প্রোফাইলে বায়ো বা বিবরণ থাকে
            if (uData.bio && uData.bio.trim() !== "") {
                document.getElementById('s-bio').textContent = uData.bio;
            }
            // প্রোফাইল পিকচার সেট করা
            if (uData.profilePic) {
                document.getElementById('s-avatar').src = uData.profilePic;
            }
        } else {
            document.getElementById('s-name').textContent = "অজানা ব্যবহারকারী";
        }
    }).catch(err => {
        console.error("ইউজার ডেটা লোড এরর:", err);
    });
}

// ২. এই বিক্রেতার করা সকল প্রপার্টি পোস্ট ফায়ারবেস থেকে ফিল্টার করে আনা
async function loadSellerProperties() {
    const grid = document.getElementById('seller-listings');
    if (!grid) return;

    try {
        // properties কালেকশন থেকে ঐ নির্দিষ্ট userId এর সব ডাটা খোঁজা
        const snapshot = await db.collection('properties')
                                 .where('userId', '==', targetUserId)
                                 .get();
        
        grid.innerHTML = "";

        if (snapshot.empty) {
            grid.innerHTML = `<div class="no-post">এই ব্যবহারকারী এখনো কোনো প্রপার্টি পোস্ট করেননি।</div>`;
            return;
        }

        snapshot.forEach(doc => {
            const post = doc.data();
            let priceVal = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let unitVal = post.priceUnit || post.rentUnit || "";
            let thumbnail = (post.images && post.images[0]) ? (post.images[0].url || post.images[0]) : 'placeholder.jpg';

            grid.innerHTML += `
                <div class="post-card" onclick="location.href='details.html?id=${doc.id}'">
                    <img src="${thumbnail}" alt="Property Image">
                    <div class="post-info">
                        <h4 class="post-title-text">${post.title || 'শিরোনামহীন প্রপার্টি'}</h4>
                        <p class="post-price-text">৳ ${priceVal || 'আলোচনা সাপেক্ষ'} (${unitVal})</p>
                    </div>
                </div>`;
        });

    } catch (error) {
        console.error("পোস্ট তালিকা লোড করতে সমস্যা হয়েছে:", error);
        grid.innerHTML = `<div class="no-post">পোস্টগুলো লোড করা যাচ্ছে না। আবার চেষ্টা করুন।</div>`;
    }
    }
