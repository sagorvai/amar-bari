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
// URL থেকে companyId, ownerId বা id রিসিভ করবে
const targetCompanyId = urlParams.get('companyId') || urlParams.get('ownerId') || urlParams.get('id') || urlParams.get('userId');

document.addEventListener('DOMContentLoaded', () => {
    if (!targetCompanyId) {
        alert("কোম্পানি আইডি পাওয়া যায়নি!");
        window.history.back();
        return;
    }
    loadCompanyProfileData();
    loadCompanyProperties();
});

// ১. 'companies' কালেকশন থেকে তথ্যাদি ফেচ করা
async function loadCompanyProfileData() {
    try {
        const docSnap = await db.collection('companies').doc(targetCompanyId).get();

        if (docSnap.exists) {
            const data = docSnap.data();
            document.getElementById('c-name').textContent = data.companyName || data.name || "কোম্পানি প্রোফাইল";
            document.getElementById('c-email').textContent = data.email || "ইমেইল নেই";
            document.getElementById('c-phone').textContent = data.phoneNumber || data.phone || "ফোন নাম্বার নেই";
            document.getElementById('c-location').textContent = data.address || data.location || "ঠিকানা দেওয়া নেই";
            document.getElementById('c-bio').textContent = data.description ? `"${data.description}"` : "";

            if (data.logo || data.image) {
                document.getElementById('c-avatar').src = data.logo || data.image;
            }

            if (data.isVerified !== false) {
                document.getElementById('badgeVerified').style.display = 'flex';
            }
        } else {
            document.getElementById('c-name').textContent = "কোম্পানিটি পাওয়া যায়নি";
        }
    } catch (err) {
        console.error("কোম্পানি প্রোফাইল লোড এরর:", err);
    }
}

// ২. 'properties' কালেকশন থেকে ঐ কোম্পানির পোস্টগুলো আনা
async function loadCompanyProperties() {
    const grid = document.getElementById('company-listings');
    if (!grid) return;

    try {
        grid.innerHTML = "";
        
        // স্ক্রিনশট অনুযায়ী companyId এবং ownerId দুটি দিয়েই ফিল্টার
        let snap1 = await db.collection('properties').where('companyId', '==', targetCompanyId).get();
        let snap2 = await db.collection('properties').where('ownerId', '==', targetCompanyId).get();

        const postsMap = new Map();
        snap1.forEach(doc => postsMap.set(doc.id, { id: doc.id, ...doc.data() }));
        snap2.forEach(doc => postsMap.set(doc.id, { id: doc.id, ...doc.data() }));

        if (postsMap.size === 0) {
            grid.innerHTML = `<div class="no-post">এই কোম্পানির কোনো একটিভ প্রপার্টি নেই।</div>`;
            return;
        }

        postsMap.forEach(post => {
            let priceVal = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let unitVal = post.priceUnit || post.rentUnit || "";
            let thumbnail = (post.images && post.images[0]) ? (post.images[0].url || post.images[0]) : 'placeholder.jpg';
            let locationText = `${post.location?.village || post.location?.upazila || ''}, ${post.location?.thana || post.location?.district || ''}`;

            grid.innerHTML += `
                <div class="post-card" onclick="location.href='details.html?id=${post.id}'">
                    <img src="${thumbnail}" alt="Property Image">
                    <div class="post-info">
                        <h4 class="post-title-text">${post.title || 'শিরোনামহীন প্রপার্টি'}</h4>
                        <div style="font-size:12px; color:#666;">
                            <i class="material-icons" style="font-size:12px;">location_on</i> ${locationText}
                        </div>
                        <div style="font-weight:bold; color:#008069; margin-top:5px;">
                            ৳ ${priceVal || 'আলোচনা সাপেক্ষ'} ${unitVal}
                        </div>
                    </div>
                </div>`;
        });

    } catch (error) {
        console.error("প্রপার্টি লোড এরর:", error);
        grid.innerHTML = `<div class="no-post">পোস্ট লোড করা যাচ্ছে না।</div>`;
    }
              }
