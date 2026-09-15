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
const targetUserId = sUrlParams.get('userId');
const targetCompanyId = sUrlParams.get('companyId');
const mode = sUrlParams.get('mode') || (targetCompanyId ? 'company' : 'user');

document.addEventListener('DOMContentLoaded', () => {
    if (!targetUserId && !targetCompanyId) {
        alert("ভুল আইডি বা প্রোফাইল নির্দেশ করা হয়েছে!");
        window.history.back();
        return;
    }

    if (mode === 'company') {
        loadCompanyProfileData();
        loadCompanyProperties();
        setupInteractiveProfileRating('company');
    } else {
        loadSellerProfileData();
        loadSellerProperties();
        setupInteractiveProfileRating('user');
    }
});

// =======================================================
// 🏢 ১. কোম্পানি/পেজ প্রোফাইল লোড ফাংশন (Fix Implemented)
// =======================================================
async function loadCompanyProfileData() {
    try {
        let doc = null;

        // ১. আগে সরাসরি targetCompanyId (যেমন: ownerUid/user.uid) দিয়ে খুঁজবে
        let docRef = await db.collection('companies').doc(targetCompanyId).get();

        if (docRef.exists) {
            doc = docRef;
        } else {
            // ২. যদি আইডি না মেলে (যেমন URL-এ comp_xxx এসেছে), তবে companyId ফিল্ড থেকে খুঁজবে
            const querySnap = await db.collection('companies')
                                      .where('companyId', '==', targetCompanyId)
                                      .limit(1)
                                      .get();
            if (!querySnap.empty) {
                doc = querySnap.docs[0];
            }
        }

        if (doc && doc.exists) {
            const cData = doc.data();

            // নাম (Firestore-এ আপনার ফিল্ড হলো 'name')
            document.getElementById('s-name').textContent = cData.name || cData.companyName || "অফিসিয়াল কোম্পানি";

            // ইমেইল
            document.getElementById('s-email').textContent = cData.email || "ইমেইল সরবরাহ করা হয়নি";

            // কোম্পানি আইডি
            const displayId = cData.companyId || doc.id;
            document.getElementById('s-uid-text').textContent = displayId.length > 10 ? `...${displayId.substring(0, 8)}` : displayId;

            // কোম্পানি বিবরণ/বায়ো (Firestore-এ আপনার ফিল্ড হলো 'bio')
            if (cData.bio || cData.description) {
                document.getElementById('s-bio').textContent = `"${cData.bio || cData.description}"`;
            } else {
                document.getElementById('s-bio').textContent = "";
            }

            // ধরন ও ঠিকানা
            document.getElementById('s-profession').textContent = cData.businessType || cData.category || "আবাসন কোম্পানি";
            
            // লোকেশন / অফিস অ্যাড্রেস
            let fullAddress = cData.officeAddress || cData.address || cData.location || "যুক্ত করা নেই";
            document.getElementById('s-location').textContent = fullAddress;

            // ফোন
            let phone = cData.phone || cData.phoneNumber || "";
            document.getElementById('s-phone').textContent = phone ? phone : "ফোন নম্বর সেট করা নেই";

            // অফিস ঠিকানা আলাদা ফিল্ড
            if (cData.officeAddress) {
                document.getElementById('s-office').textContent = cData.officeAddress;
                document.getElementById('s-office-item').style.display = 'flex';
            } else {
                document.getElementById('s-office-item').style.display = 'none';
            }

            // লোগো / প্রোফাইল পিকচার (Firestore-এ ফিল্ড হলো 'logo')
            const logo = cData.logo || cData.companyLogo || cData.profilePic;
            if (logo) {
                document.getElementById('s-avatar').src = logo;
            }

            // ভেরিফাইড ব্যাজ
            if (cData.isVerified === true) {
                document.getElementById('badgeVerified').style.display = 'flex';
            }

            displayCalculatedRating(cData.ratingCount || 0, cData.ratingSum || 0);

        } else {
            document.getElementById('s-name').textContent = "অজানা কোম্পানি পেজ";
            console.warn("কোম্পানি প্রোফাইল পাওয়া যায়নি targetCompanyId:", targetCompanyId);
        }
    } catch (err) {
        console.error("কোম্পানি ডেটা লোড এরর:", err);
    }
}

// =======================================================
// 👤 ২. সাধারণ ইউজার প্রোফাইল লোড ফাংশন
// =======================================================
function loadSellerProfileData() {
    db.collection('users').doc(targetUserId).get().then(doc => {
        if (doc.exists) {
            const uData = doc.data();

            document.getElementById('s-name').textContent = uData.fullName || uData.name || "সম্মানিত বিক্রেতা";
            document.getElementById('s-email').textContent = uData.email || "ইমেইল সরবরাহ করা হয়নি";
            document.getElementById('s-uid-text').textContent = `...${targetUserId.substring(0, 6)}`;

            document.getElementById('s-profession').textContent = uData.profession || "যুক্ত করা নেই";
            document.getElementById('s-location').textContent = uData.location || "যুক্ত করা নেই";

            let userPhone = uData.phoneNumber || uData.phone || "";
            document.getElementById('s-phone').textContent = userPhone ? userPhone : "ফোন নম্বর সেট করা নেই";

            if (uData.officeAddress && uData.officeAddress.trim() !== "") {
                document.getElementById('s-office').textContent = uData.officeAddress;
                document.getElementById('s-office-item').style.display = 'flex';
            } else {
                document.getElementById('s-office-item').style.display = 'none';
            }

            if (uData.bio && uData.bio.trim() !== "") {
                document.getElementById('s-bio').textContent = `"${uData.bio}"`;
            } else {
                document.getElementById('s-bio').textContent = "";
            }

            if (uData.profilePic) {
                document.getElementById('s-avatar').src = uData.profilePic;
            }

            if (uData.isVerified === true || uData.role === 'admin') {
                document.getElementById('badgeVerified').style.display = 'flex';
            }

            displayCalculatedRating(uData.ratingCount || 0, uData.ratingSum || 0);

        } else {
            document.getElementById('s-name').textContent = "অজানা ব্যবহারকারী";
        }
    }).catch(err => {
        console.error("ইউজার ডেটা লোড এরর:", err);
    });
}

// =======================================================
// 🏢 ৩. কোম্পানির লিস্টিং/প্রপার্টি লোড (Fix Implemented)
// =======================================================
async function loadCompanyProperties() {
    const grid = document.getElementById('seller-listings');
    if (!grid) return;

    try {
        // ১. companyId দিয়ে চেক করবে
        let snapshot = await db.collection('properties')
                                 .where('companyId', '==', targetCompanyId)
                                 .get();

        // ২. না পাওয়া গেলে ownerUid বা targetCompanyId দিয়ে আবার ফিল্টার করবে
        if (snapshot.empty) {
            snapshot = await db.collection('properties')
                                 .where('ownerUid', '==', targetCompanyId)
                                 .get();
        }

        renderPropertyList(snapshot, grid);
    } catch (error) {
        console.error("কোম্পানির পোস্ট তালিকা লোড করতে সমস্যা:", error);
        grid.innerHTML = `<div class="no-post">পোস্টগুলো লোড করা যাচ্ছে না।</div>`;
    }
}

// =======================================================
// 👤 ৪. ইউজারের লিস্টিং/প্রপার্টি লোড
// =======================================================
async function loadSellerProperties() {
    const grid = document.getElementById('seller-listings');
    if (!grid) return;

    try {
        let snapshot = await db.collection('properties')
                                 .where('userId', '==', targetUserId)
                                 .get();

        if (snapshot.empty) {
            snapshot = await db.collection('properties')
                                 .where('uid', '==', targetUserId)
                                 .get();
        }

        renderPropertyList(snapshot, grid);
    } catch (error) {
        console.error("ইউজারের পোস্ট তালিকা লোড করতে সমস্যা:", error);
        grid.innerHTML = `<div class="no-post">পোস্টগুলো লোড করা যাচ্ছে না।</div>`;
    }
}

// প্রপার্টি গ্রিড রেন্ডার করার কমন হেল্পার
function renderPropertyList(snapshot, grid) {
    grid.innerHTML = "";

    if (snapshot.empty) {
        grid.innerHTML = `<div class="no-post">এখানে এখনো কোনো প্রপার্টি পোস্ট করা হয়নি।</div>`;
        return;
    }

    if (snapshot.size >= 3) {
        const topSellerBadge = document.getElementById('badgeTopSeller');
        if (topSellerBadge) topSellerBadge.style.display = 'flex';
    }

    snapshot.forEach(doc => {
        const post = doc.data();
        let priceVal = post.category === 'বিক্রয়' ? post.price : (post.monthlyRent || post.price);
        let unitVal = post.priceUnit || post.rentUnit || "";
        let thumbnail = (post.images && post.images[0]) ? (post.images[0].url || post.images[0]) : 'https://via.placeholder.com/150?text=No+Image';
        let locationText = post.location ? `${post.location.village || ''}, ${post.location.thana || ''}` : 'ঠিকানা নেই';

        grid.innerHTML += `
            <div class="post-card" onclick="location.href='details.html?id=${doc.id}'">
                <span class="card-tag">${post.category || 'লিস্টিং'}</span>
                <img src="${thumbnail}" alt="Property Image">
                <div class="post-info">
                    <h4 class="post-title-text">${post.title || 'শিরোনামহীন প্রপার্টি'}</h4>
                    <div class="post-meta-loc">
                        <i class="material-icons">location_on</i>
                        <span>${locationText}</span>
                    </div>
                    <div class="post-price-box">
                        <p class="post-price-text">৳ ${priceVal || 'আলোচনা সাপেক্ষ'} ${unitVal}</p>
                        <i class="material-icons" style="font-size:16px; color:var(--primary)">arrow_forward</i>
                    </div>
                </div>
            </div>`;
    });
}

// =======================================================
// ⭐ ৫. রেটিং সিস্টেম
// =======================================================
function setupInteractiveProfileRating(targetType) {
    const starZone = document.getElementById('profileStarsZone');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    const targetId = targetType === 'company' ? targetCompanyId : targetUserId;
    const collectionName = targetType === 'company' ? 'companies' : 'users';
    const localStoreKey = `has_rated_${targetType}_${targetId}`;

    let alreadyRatedValue = localStorage.getItem(localStoreKey);
    if (alreadyRatedValue) {
        highlightStars(stars, parseInt(alreadyRatedValue));
        document.getElementById('ratingHeader').textContent = "আপনি ইতিমধ্যে রেটিং দিয়েছেন";
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
                alert("নিজের প্রোফাইলে নিজে রেটিং দিতে পারবেন না!");
                return;
            }

            localStorage.setItem(localStoreKey, chosenRating);
            highlightStars(stars, chosenRating);

            const docRef = db.collection(collectionName).doc(targetId);
            try {
                await db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(docRef);
                    if (!doc.exists) {
                        transaction.set(docRef, { ratingCount: 1, ratingSum: chosenRating }, { merge: true });
                        return;
                    }

                    let newCount = (doc.data().ratingCount || 0) + 1;
                    let newSum = (doc.data().ratingSum || 0) + chosenRating;

                    transaction.update(docRef, {
                        ratingCount: newCount,
                        ratingSum: newSum
                    });
                });

                alert("সফলভাবে রেটিং দেওয়া হয়েছে! ধন্যবাদ।");
                location.reload();

            } catch (err) {
                console.error("রেটিং আপডেট করতে সমস্যা:", err);
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

// =======================================================
// 🔄 হেডার প্রোফাইল পিকচার সিঙ্ক (অ্যাক্টিভ মোড অনুযায়ী)
// =======================================================
firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    if (!user || !headerProfileImg) return;

    // ১. লোকাল স্টোরেজ থেকে অ্যাক্টিভ মোড চেক করা
    const activeIdentityType = localStorage.getItem('activeIdentityType');

    if (activeIdentityType === 'company') {
        // 🏢 কোম্পানি/পেজ মোডে থাকলে কোম্পানির লোগো দেখাবে
        try {
            const compDoc = await db.collection('companies').doc(user.uid).get();
            if (compDoc.exists && compDoc.data().logo) {
                headerProfileImg.src = compDoc.data().logo;
                return; // কোম্পানির লোগো পেয়ে গেলে এখানেই শেষ
            }
        } catch (e) {
            console.error("হেডারে কোম্পানি লোগো লোড করতে সমস্যা:", e);
        }
    }

    // 👤 পার্সোনাল মোডে থাকলে বা কোম্পানির লোগো না পেলে ইউজারের ছবি দেখাবে
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists && userDoc.data().profilePic) {
            headerProfileImg.src = userDoc.data().profilePic;
        } else if (user.photoURL) {
            headerProfileImg.src = user.photoURL;
        } else {
            headerProfileImg.src = 'https://www.w3schools.com/howto/img_avatar.png';
        }
    } catch (error) {
        console.error("হেডার ইউজার ছবি লোড এরর:", error);
    }
});
