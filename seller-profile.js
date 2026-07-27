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

// URL Parameter থেকে ID ও Mode রিসিভ করা
const urlParams = new URLSearchParams(window.location.search);
const companyId = urlParams.get('companyId');
const userId = urlParams.get('userId');
const mode = urlParams.get('mode'); // 'company' অথবা 'user'

document.addEventListener('DOMContentLoaded', async () => {
    if (companyId || mode === 'company') {
        const targetCompanyId = companyId || userId;
        await loadCompanyProfile(targetCompanyId);
        await loadSellerProperties('company', targetCompanyId);
    } else if (userId) {
        await loadUserProfile(userId);
        await loadSellerProperties('user', userId);
    } else {
        console.error("কোনো সেলার ID পাওয়া যায়নি!");
        alert("সেলার প্রোফাইলের আইডি পাওয়া যায়নি।");
    }
});

/**
 * 🏢 ১. কোম্পানি/পেজ প্রোফাইল লোডার (Companies Collection)
 */
async function loadCompanyProfile(cId) {
    try {
        const doc = await db.collection('companies').doc(cId).get();
        if (doc.exists) {
            const data = doc.data();
            
            // প্রোফাইল ফটো/লোগো
            const logo = data.logo || data.companyLogo || data.profilePic || 'assets/images/default-company.png';
            setElementSrc('seller-avatar', logo);

            // নাম ও বায়ো/বিবরণ
            setElementText('seller-name', data.companyName || data.name || "অফিসিয়াল পেজ");
            setElementText('seller-bio', data.description || data.about || "অফিসিয়াল রিয়েল এস্টেট এজেন্ট/কোম্পানি");
            setElementText('seller-type', "কোম্পানি/এজেন্সি");

            // যোগাযোগ ও ঠিকানা
            setElementText('seller-phone', data.phone || data.phoneNumber || "উপলব্ধ নেই");
            setElementText('seller-email', data.email || "উপলব্ধ নেই");
            setElementText('seller-address', data.address || `${data.district || ''} ${data.thana || ''}`);
            
            // ব্যাজ/ভেরিফাইড স্ট্যাটাস
            if (data.isVerified) {
                showVerifiedBadge(true);
            }
        } else {
            // যদি ফায়ারস্টোরে কোম্পানি ডকুমেন্ট না থাকে
            setElementText('seller-name', "কোম্পানি পেজ");
        }
    } catch (error) {
        console.error("কোম্পানি প্রোফাইল লোড করতে এরর:", error);
    }
}

/**
 * 👤 ২. সাধারণ ইউজার প্রোফাইল লোডার (Users Collection)
 */
async function loadUserProfile(uId) {
    try {
        const doc = await db.collection('users').doc(uId).get();
        if (doc.exists) {
            const data = doc.data();

            // প্রোফাইল পিকচার
            const avatar = data.profilePic || data.photoURL || 'assets/images/default-avatar.png';
            setElementSrc('seller-avatar', avatar);

            // নাম ও বায়ো
            setElementText('seller-name', data.fullName || data.name || "সম্মানিত বিক্রেতা");
            setElementText('seller-bio', data.bio || "আমার বাড়ি প্ল্যাটফর্মের নিবন্ধিত ইউজার");
            setElementText('seller-type', "ব্যক্তিগত বিক্রেতা");

            // যোগাযোগ
            setElementText('seller-phone', data.phone || data.phoneNumber || "উপলব্ধ নেই");
            setElementText('seller-email', data.email || "উপলব্ধ নেই");
            setElementText('seller-address', data.address || `${data.district || ''}`);
        } else {
            setElementText('seller-name', "ইউজার প্রোফাইল");
        }
    } catch (error) {
        console.error("ইউজার প্রোফাইল লোড করতে এরর:", error);
    }
}

/**
 * 🏠 ৩. সেলারের পোস্টকৃত সকল প্রপার্টি লোডার
 */
async function loadSellerProperties(type, targetId) {
    const listContainer = document.getElementById('seller-properties-list');
    const totalCountText = document.getElementById('total-properties-count');
    if (!listContainer) return;

    try {
        let query;
        if (type === 'company') {
            // কোম্পানির প্রপার্টি সার্চ (কোম্পানি সম্পর্কিত ফিল্ডসমূহ)
            query = db.collection('properties').where('companyId', '==', targetId);
        } else {
            // ইউজারের প্রপার্টি সার্চ (ইউজার আইডি ফিল্ডসমূহ)
            query = db.collection('properties').where('userId', '==', targetId);
        }

        const snapshot = await query.get();
        
        // ফালব্যাক চেক (যদি authorId বা ownerId দিয়ে ফিল্টার করার প্রয়োজন পড়ে)
        let posts = [];
        snapshot.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));

        if (posts.length === 0) {
            // দ্বিতীয় ফিল্ড চেক (বিকল্প ফিল্ড নাম থাকলে)
            const fieldName = type === 'company' ? 'ownerId' : 'createdByUid';
            const fallbackSnap = await db.collection('properties').where(fieldName, '==', targetId).get();
            fallbackSnap.forEach(doc => posts.push({ id: doc.id, ...doc.data() }));
        }

        // মোট প্রপার্টি সংখ্যা আপডেট
        if (totalCountText) totalCountText.textContent = `${posts.length} টি বিজ্ঞাপন`;

        if (posts.length === 0) {
            listContainer.innerHTML = `<div class="no-data"><p>এই বিক্রেতার বর্তমানে কোনো সক্রিয় বিজ্ঞাপন নেই।</p></div>`;
            return;
        }

        // রেন্ডার করা
        listContainer.innerHTML = "";
        posts.forEach(post => {
            let pAmt = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let pUnit = post.priceUnit || post.rentUnit || "";
            let imgUrl = post.images?.[0]?.url || post.images?.[0] || 'assets/images/placeholder.jpg';

            listContainer.innerHTML += `
                <div class="property-card" onclick="location.href='details.html?id=${post.id}'">
                    <div class="card-img">
                        <img src="${imgUrl}" alt="${post.title || 'Property'}">
                        <span class="badge-${post.category === 'বিক্রয়' ? 'sale' : 'rent'}">${post.category || 'বিজ্ঞাপন'}</span>
                    </div>
                    <div class="card-details">
                        <h3 class="card-title">${post.title || 'শিরোনাম নেই'}</h3>
                        <p class="card-price">৳ ${pAmt || 'আলোচনা সাপেক্ষ'} <small>${pUnit}</small></p>
                        <p class="card-location"><i class="material-icons">location_on</i> ${post.location?.village || ''}, ${post.location?.thana || post.location?.upazila || ''}</p>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("প্রপার্টি তালিকা লোড করতে ত্রুটি:", error);
        listContainer.innerHTML = `<p>বিজ্ঞাপনগুলো লোড করা সম্ভব হয়নি।</p>`;
    }
}

// 🛠️ হেল্পার ফাংশনসমূহ
function setElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function setElementSrc(id, src) {
    const el = document.getElementById(id);
    if (el) el.src = src;
}

function showVerifiedBadge(show) {
    const badge = document.getElementById('verified-badge');
    if (badge) badge.style.display = show ? 'inline-block' : 'none';
                }
