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

// URL থেকে প্যারামিটার ধরা
const sUrlParams = new URLSearchParams(window.location.search);
const targetCompanyId = sUrlParams.get('companyId');
const targetUserId = sUrlParams.get('userId');
const targetIdParam = sUrlParams.get('id'); // যদি ভুল করে শুধু ?id= পাস করা হয়

const targetId = targetCompanyId || targetUserId || targetIdParam;

console.log("👉 URL targetId:", targetId);
console.log("👉 URL companyId:", targetCompanyId);

document.addEventListener('DOMContentLoaded', () => {
    if (!targetId) {
        alert("URL-এ কোনো আইডি পাওয়া যায়নি! URL চেক করুন।");
        return;
    }
    loadProfileSmartly(targetId);
    loadSellerProperties(targetId);
});

async function loadProfileSmartly(id) {
    try {
        console.log("🔍 [Step 1] Companies কালেকশনে Doc ID দিয়ে খোঁজা হচ্ছে:", id);
        let docSnap = await db.collection('companies').doc(id).get();

        // ১. যদি সরাসরি Doc ID দিয়ে না পাওয়া যায়, তবে companyId ফিল্ড ধরে সার্চ করবে
        if (!docSnap.exists) {
            console.log("⚠️ Doc ID দিয়ে পাওয়া যায়নি। 'companyId' ফিল্ড দিয়ে সার্চ করা হচ্ছে...");
            const qSnap = await db.collection('companies').where('companyId', '==', id).get();
            if (!qSnap.empty) {
                docSnap = qSnap.docs[0];
            }
        }

        // ২. যদি তাও না পাওয়া যায়, তবে ownerUid ফিল্ড ধরে চেষ্টা করবে
        if (!docSnap.exists) {
            console.log("⚠️ companyId দিয়েও পাওয়া যায়নি। 'ownerUid' ফিল্ড দিয়ে সার্চ করা হচ্ছে...");
            const qSnap2 = await db.collection('companies').where('ownerUid', '==', id).get();
            if (!qSnap2.empty) {
                docSnap = qSnap2.docs[0];
            }
        }

        // 🏢 কোম্পানি ডাটা পাওয়া গেলে রেন্ডার করবে
        if (docSnap.exists) {
            const data = docSnap.data();
            console.log("✅ কোম্পানির ডাটা পাওয়া গেছে:", data);

            renderDataToUI({
                name: data.name || data.companyName || "কোম্পানির নাম নেই",
                accountType: "অফিসিয়াল কোম্পানি পেজ",
                bio: data.bio || data.description || "কোনো বিবরণ নেই",
                avatar: data.logo || data.profilePic || data.companyLogo,
                profession: "কোম্পানি / এজেন্সি",
                location: data.officeAddress || data.address || data.location || "ঠিকানা দেওয়া নেই",
                phone: data.phone || data.phoneNumber || "ফোন নম্বর নেই",
                email: data.email || "ইমেইল নেই",
                uid: docSnap.id,
                office: data.officeAddress || ""
            });
            return;
        }

        // 👤 কোম্পানিতে না পেলে Users কালেকশনে খুঁজবে
        console.log("🔍 [Step 2] Companies-এ পাওয়া যায়নি। Users কালেকশনে খোঁজা হচ্ছে:", id);
        const userSnap = await db.collection('users').doc(id).get();
        
        if (userSnap.exists) {
            const uData = userSnap.data();
            console.log("✅ ইউজার ডাটা পাওয়া গেছে:", uData);

            renderDataToUI({
                name: uData.fullName || uData.name || "সম্মানিত ইউজার",
                accountType: "ব্যক্তিগত অ্যাকাউন্ট",
                bio: uData.bio || "কোনো বায়ো নেই",
                avatar: uData.profilePic,
                profession: uData.profession || "যুক্ত করা নেই",
                location: uData.location || "যুক্ত করা নেই",
                phone: uData.phoneNumber || uData.phone || "গোপন রাখা হয়েছে",
                email: uData.email || "ইমেইল নেই",
                uid: userSnap.id,
                office: uData.officeAddress || ""
            });
        } else {
            console.error("❌ ফায়ারবেসের কোথাও এই আইডির কোনো ডাটা নেই!");
            document.getElementById('s-name').textContent = "ডেটা পাওয়া যায়নি";
        }

    } catch (error) {
        console.error("💥 ডাটা লোড করার সময় Error হয়েছে:", error);
    }
}

// UI-তে ডাটা বসানোর হেলপার ফাংশন
function renderDataToUI(info) {
    document.getElementById('s-name').textContent = info.name;
    document.getElementById('s-account-type').textContent = info.accountType;
    document.getElementById('s-bio').textContent = `"${info.bio}"`;
    if (info.avatar) document.getElementById('s-avatar').src = info.avatar;
    
    document.getElementById('s-profession').textContent = info.profession;
    document.getElementById('s-location').textContent = info.location;
    document.getElementById('s-phone').textContent = info.phone;
    document.getElementById('s-email').textContent = info.email;
    document.getElementById('s-uid-text').textContent = info.uid;

    if (info.office) {
        document.getElementById('s-office').textContent = info.office;
        document.getElementById('s-office-item').style.display = 'flex';
    }
}

// প্রপার্টি লিস্ট লোডার
async function loadSellerProperties(id) {
    const grid = document.getElementById('seller-listings');
    if (!grid) return;

    try {
        let snapshot = await db.collection('properties').where('companyId', '==', id).get();
        if (snapshot.empty) {
            snapshot = await db.collection('properties').where('userId', '==', id).get();
        }
        if (snapshot.empty) {
            snapshot = await db.collection('properties').where('ownerUid', '==', id).get();
        }

        grid.innerHTML = "";
        if (snapshot.empty) {
            grid.innerHTML = `<div class="no-post">এই বিজ্ঞাপনদাতার কোনো পোস্ট পাওয়া যায়নি।</div>`;
            return;
        }

        snapshot.forEach(doc => {
            const post = doc.data();
            let priceVal = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let thumbnail = (post.images && post.images[0]) ? (post.images[0].url || post.images[0]) : 'placeholder.jpg';

            grid.innerHTML += `
                <div class="post-card" onclick="location.href='details.html?id=${doc.id}'">
                    <span class="card-tag">${post.category || 'লিস্টিং'}</span>
                    <img src="${thumbnail}" alt="Property Image">
                    <div class="post-info">
                        <h4 class="post-title-text">${post.title || 'শিরোনামহীন প্রপার্টি'}</h4>
                        <div class="post-price-box">
                            <p class="post-price-text">৳ ${priceVal || 'আলোচনা সাপেক্ষ'}</p>
                        </div>
                    </div>
                </div>`;
        });
    } catch (e) {
        console.error("পোস্ট লোড এরর:", e);
    }
}
