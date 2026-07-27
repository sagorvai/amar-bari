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

const sUrlParams = new URLSearchParams(window.location.search);

// 🎯 ১. সব ধরণের সম্ভাব্য URL Parameter রিসিভ করার লজিক
let targetId = sUrlParams.get('companyId') || 
               sUrlParams.get('userId') || 
               sUrlParams.get('sellerId') || 
               sUrlParams.get('id');

let targetType = sUrlParams.get('mode') || 
                 (sUrlParams.has('companyId') ? 'company' : 'user');

document.addEventListener('DOMContentLoaded', () => {
    console.log("রিসিভড টার্গেট আইডি:", targetId);
    console.log("রিসিভড টাইপ:", targetType);

    if (!targetId || targetId === "null" || targetId === "undefined") {
        alert("প্রোফাইল আইডি পাওয়া যায়নি! পূর্বের পেজে ফিরে যান।");
        return;
    }
    
    loadSellerProfileData();
    setupInteractiveProfileRating();
});

// ২. প্রোফাইল ডাটা লোড করার অটো-ডিটেকশন লজিক
async function loadSellerProfileData() {
    try {
        let docSnap = null;
        let detectedType = targetType;

        // প্রথমে কোম্পানির পেজে চেষ্টা করবে
        if (detectedType === 'company') {
            docSnap = await db.collection('companies').doc(targetId).get();
            if (!docSnap.exists) {
                // না পেলে ইউজারদের লিস্টে খুঁজবে
                docSnap = await db.collection('users').doc(targetId).get();
                if (docSnap.exists) detectedType = 'user';
            }
        } else {
            // প্রথমে ইউজার পেজে চেষ্টা করবে
            docSnap = await db.collection('users').doc(targetId).get();
            if (!docSnap.exists) {
                // না পেলে কোম্পানিতে খুঁজবে
                docSnap = await db.collection('companies').doc(targetId).get();
                if (docSnap.exists) detectedType = 'company';
            }
        }

        targetType = detectedType; // টাইপ আপডেট করে দেওয়া হলো

        if (docSnap && docSnap.exists) {
            const sData = docSnap.data();

            // নাম সেট করা
            const nameElem = document.getElementById('s-name');
            if (nameElem) {
                nameElem.textContent = sData.companyName || sData.fullName || sData.name || (targetType === 'company' ? "অফিসিয়াল কোম্পানি" : "সম্মানিত বিক্রেতা");
            }

            // বায়ো / স্লোগান
            const bioElem = document.getElementById('s-bio');
            if (bioElem) {
                bioElem.textContent = sData.bio || sData.description || (targetType === 'company' ? "একটি ভেরিফাইড প্রতিষ্ঠান" : "আমার বাড়ি প্ল্যাটফর্মের নিবন্ধিত ব্যবহারকারী");
            }

            // প্রোফাইল ছবি / লোগো
            const avatarElem = document.getElementById('s-avatar');
            if (avatarElem) {
                const avatarUrl = sData.logo || sData.companyLogo || sData.profilePic;
                if (avatarUrl) avatarElem.src = avatarUrl;
            }

            // ইমেইল
            const emailElem = document.getElementById('s-email');
            if (emailElem) {
                emailElem.textContent = sData.email || "গোপন রাখা হয়েছে";
            }

            // আইডি নম্বর প্রদর্শন
            const uidElem = document.getElementById('s-uid-text');
            if (uidElem) {
                uidElem.textContent = targetId;
            }

            // পেশা / প্রতিষ্ঠান টাইপ
            const profElem = document.getElementById('s-profession');
            if (profElem) {
                profElem.textContent = targetType === 'company' ? "অফিসিয়াল কোম্পানি পেজ" : (sData.profession || "সাধারণ বিক্রেতা");
            }

            // ঠিকানা
            const locElem = document.getElementById('s-location');
            if (locElem) {
                locElem.textContent = sData.officeAddress || sData.location || sData.address || "ঠিকানা দেওয়া হয়নি";
            }

            // মোবাইল নম্বর
            const phoneElem = document.getElementById('s-phone');
            if (phoneElem) {
                let phoneNum = sData.phone || sData.phoneNumber || "";
                phoneElem.textContent = phoneNum ? phoneNum : "গোপন রাখা হয়েছে";
            }

            // ভেরিফাইড ব্যাজ
            const badgeElem = document.getElementById('badgeVerified');
            if (badgeElem) {
                if (sData.isVerified === true || targetType === 'company') {
                    badgeElem.style.display = 'flex';
                }
            }

            // রেটিং প্রদর্শন
            displayCalculatedRating(sData.ratingCount || 0, sData.ratingSum || 0);

            // প্রপার্টি লোড করা
            loadSellerProperties();

        } else {
            console.error("ফায়ারস্টোরে এই আইডির কোনো ডাটা নেই:", targetId);
            document.getElementById('s-name').textContent = "প্রোফাইল পাওয়া যায়নি";
            document.getElementById('seller-listings').innerHTML = `<div class="no-post">এই বিক্রেতার ডাটা ফায়ারবেসে পাওয়া যায়নি।</div>`;
        }
    } catch (err) {
        console.error("প্রোফাইল ফেচ এরর:", err);
    }
}

// ৩. পোস্ট/প্রপার্টি লোড লজিক (কোম্পানি এবং ইউজার উভয় ফিল্ড চেক করবে)
async function loadSellerProperties() {
    const grid = document.getElementById('seller-listings');
    if (!grid) return;

    try {
        let snapshot;
        
        if (targetType === 'company') {
            snapshot = await db.collection('properties').where('companyId', '==', targetId).get();
            // ব্যাকআপ চেক: যদি companyId দিয়ে না পায়
            if (snapshot.empty) {
                snapshot = await db.collection('properties').where('userId', '==', targetId).get();
            }
        } else {
            snapshot = await db.collection('properties').where('userId', '==', targetId).get();
            // ব্যাকআপ চেক: যদি userId দিয়ে না পায়
            if (snapshot.empty) {
                snapshot = await db.collection('properties').where('createdByUid', '==', targetId).get();
            }
        }

        grid.innerHTML = "";

        if (snapshot.empty) {
            grid.innerHTML = `<div class="no-post">এই বিক্রেতার বর্তমানে কোনো একটিভ প্রপার্টি নেই।</div>`;
            return;
        }

        snapshot.forEach(doc => {
            const post = doc.data();
            let priceVal = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let unitVal = post.priceUnit || post.rentUnit || "";
            let thumbnail = (post.images && post.images[0]) ? (post.images[0].url || post.images[0]) : 'placeholder.jpg';
            
            let village = post.location?.village || '';
            let thana = post.location?.thana || post.location?.upazila || '';
            let locationText = [village, thana].filter(Boolean).join(', ');

            grid.innerHTML += `
                <div class="post-card" onclick="location.href='details.html?id=${doc.id}'" style="cursor:pointer;">
                    <span class="card-tag">${post.category || 'প্রপার্টি'}</span>
                    <img src="${thumbnail}" alt="Property Image" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
                    <div class="post-info" style="padding:10px 0;">
                        <h4 class="post-title-text" style="margin:5px 0;">${post.title || 'প্রপার্টি'}</h4>
                        <div class="post-meta-loc" style="font-size:12px; color:#666;">
                            <span>📍 ${locationText || 'অবস্থান নেই'}</span>
                        </div>
                        <div class="post-price-box" style="margin-top:5px; font-weight:bold; color:#007bff;">
                            <p class="post-price-text">৳ ${priceVal || 'আলোচনা সাপেক্ষ'} ${unitVal}</p>
                        </div>
                    </div>
                </div>`;
        });

    } catch (error) {
        console.error("পোস্ট লোড সমস্যা:", error);
        grid.innerHTML = `<div class="no-post">প্রপার্টি লোড করতে ব্যর্থ হয়েছে।</div>`;
    }
}

// ৪. রেটিং সেটিং
function setupInteractiveProfileRating() {
    const starZone = document.getElementById('profileStarsZone');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    const localStoreKey = `has_rated_${targetId}`;

    let alreadyRatedValue = localStorage.getItem(localStoreKey);
    if (alreadyRatedValue) {
        highlightStars(stars, parseInt(alreadyRatedValue));
    }

    stars.forEach(star => {
        star.addEventListener('click', async () => {
            if (localStorage.getItem(localStoreKey)) {
                alert("আপনি ইতিমধ্যে রেটিং দিয়েছেন!");
                return;
            }

            const chosenRating = parseInt(star.getAttribute('data-star'));
            const currentAuthUser = firebase.auth().currentUser;

            if (currentAuthUser && currentAuthUser.uid === targetId) {
                alert("নিজের প্রোফাইলে নিজে রেটিং দেওয়া যাবে না!");
                return;
            }

            localStorage.setItem(localStoreKey, chosenRating);
            highlightStars(stars, chosenRating);

            const collectionName = (targetType === 'company') ? 'companies' : 'users';
            const targetRef = db.collection(collectionName).doc(targetId);

            try {
                await db.runTransaction(async (transaction) => {
                    const sfDoc = await transaction.get(targetRef);
                    if (!sfDoc.exists) {
                        transaction.set(targetRef, { ratingCount: 1, ratingSum: chosenRating }, { merge: true });
                        return;
                    }
                    let newCount = (sfDoc.data().ratingCount || 0) + 1;
                    let newSum = (sfDoc.data().ratingSum || 0) + chosenRating;
                    transaction.update(targetRef, { ratingCount: newCount, ratingSum: newSum });
                });

                alert("রেটিং জমা হয়েছে! ধন্যবাদ।");
                location.reload();
            } catch (err) {
                console.error("রেটিং আপডেট এরর:", err);
            }
        });
    });
}

function highlightStars(stars, value) {
    stars.forEach(s => {
        const sVal = parseInt(s.getAttribute('data-star'));
        if (sVal <= value) {
            s.textContent = 'star';
            s.classList.add('active');
        } else {
            s.textContent = 'star_border';
            s.classList.remove('active');
        }
    });
}

function displayCalculatedRating(count, sum) {
    const label = document.getElementById('ratingStatsLabel');
    if (!label) return;

    if (count === 0) {
        label.textContent = "গড় রেটিং: ০.০ (০টি ভোট)";
        return;
    }
    let average = (sum / count).toFixed(1);
    label.textContent = `গড় রেটিং: ⭐ ${average} (${count}টি ভোট)`;
                    }
