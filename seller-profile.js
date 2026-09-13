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
// 🏢 ১. কোম্পানি/পেজ প্রোফাইল লোড (ডিটেইলস পেইজের লজিক অনুযায়ী)
// =======================================================
async function loadCompanyProfileData() {
    try {
        if (!targetCompanyId) return;

        // ডিটেইলস পেইজের মতো প্রথমে ডকুমেন্ট ID দিয়ে চেক, না পাওয়া গেলে ফিল্ড কোয়েরি
        const compRef = db.collection('companies').doc(targetCompanyId);
        
        compRef.onSnapshot(async (doc) => {
            if (doc.exists) {
                renderCompanyProfileDetails(doc.data(), doc.id);
            } else {
                // companyId, id, অথবা ownerUid দিয়ে সার্চ
                try {
                    let snap = await db.collection('companies').where('companyId', '==', targetCompanyId).limit(1).get();
                    if (snap.empty) {
                        snap = await db.collection('companies').where('id', '==', targetCompanyId).limit(1).get();
                    }
                    if (snap.empty) {
                        snap = await db.collection('companies').where('ownerUid', '==', targetCompanyId).limit(1).get();
                    }

                    if (!snap.empty) {
                        renderCompanyProfileDetails(snap.docs[0].data(), snap.docs[0].id);
                    } else {
                        console.warn("কোম্পানি প্রোফাইল ডাটা পাওয়া যায়নি:", targetCompanyId);
                    }
                } catch (e) {
                    console.error("কোম্পানি কোয়েরি ত্রুটি:", e);
                }
            }
        });

    } catch (err) {
        console.error("কোম্পানি ডেটা লোড এরর:", err);
    }
}

// 🏢 কোম্পানির তথ্য ও নাম রেন্ডার
function renderCompanyProfileDetails(cData, docId) {
    if (!cData) return;

    // ডিটেইলস পেইজে পোস্ট তৈরির সময় ব্যবহৃত সব ধরনের নেমিং ফিল্ড চেক
    const companyName = cData.companyName || cData.name || cData.title || cData.authorName || cData.postedByName || "অফিসিয়াল কোম্পানি";
    
    const nameElem = document.getElementById('s-name');
    if (nameElem) nameElem.textContent = companyName;

    const emailElem = document.getElementById('s-email');
    if (emailElem) emailElem.textContent = cData.email || cData.companyEmail || "ইমেইল সরবরাহ করা হয়নি";

    const displayId = cData.companyId || docId;
    const uidElem = document.getElementById('s-uid-text');
    if (uidElem) {
        uidElem.textContent = displayId.length > 10 ? `...${displayId.substring(0, 8)}` : displayId;
    }

    const bioElem = document.getElementById('s-bio');
    if (bioElem) {
        bioElem.textContent = (cData.bio || cData.description || cData.about) ? `"${cData.bio || cData.description || cData.about}"` : "";
    }

    const profElem = document.getElementById('s-profession');
    if (profElem) {
        profElem.textContent = cData.businessType || cData.category || cData.profession || "আবাসন কোম্পানি";
    }

    const locElem = document.getElementById('s-location');
    if (locElem) {
        locElem.textContent = cData.officeAddress || cData.address || cData.location || "যুক্ত করা নেই";
    }

    const phoneElem = document.getElementById('s-phone');
    if (phoneElem) {
        phoneElem.textContent = cData.phone || cData.phoneNumber || cData.contact || "ফোন নম্বর সেট করা নেই";
    }

    const logo = cData.logo || cData.companyLogo || cData.profilePic || cData.photoURL;
    const avatarElem = document.getElementById('s-avatar');
    if (logo && avatarElem) {
        avatarElem.src = logo;
    }

    const badgeVerified = document.getElementById('badgeVerified');
    if (badgeVerified) {
        badgeVerified.style.display = (cData.isVerified === true) ? 'flex' : 'none';
    }

    // রেটিং আপডেট
    displayCalculatedRating(cData.ratingCount || 0, cData.ratingSum || 0);
}

// =======================================================
// 👤 ২. ইউজার প্রোফাইল লোড
// =======================================================
function loadSellerProfileData() {
    if (!targetUserId) return;

    db.collection('users').doc(targetUserId).onSnapshot(doc => {
        if (doc.exists) {
            const uData = doc.data();

            const userName = uData.fullName || uData.name || uData.displayName || uData.authorName || "সম্মানিত বিক্রেতা";
            
            document.getElementById('s-name').textContent = userName;
            document.getElementById('s-email').textContent = uData.email || "ইমেইল সরবরাহ করা হয়নি";
            document.getElementById('s-uid-text').textContent = `...${targetUserId.substring(0, 6)}`;
            document.getElementById('s-profession').textContent = uData.profession || "যুক্ত করা নেই";
            document.getElementById('s-location').textContent = uData.location || uData.address || "যুক্ত করা নেই";
            document.getElementById('s-phone').textContent = uData.phoneNumber || uData.phone || "ফোন নম্বর সেট করা নেই";

            if (uData.bio && uData.bio.trim() !== "") {
                document.getElementById('s-bio').textContent = `"${uData.bio}"`;
            }
            if (uData.profilePic || uData.photoURL) {
                document.getElementById('s-avatar').src = uData.profilePic || uData.photoURL;
            }
            if (uData.isVerified === true || uData.role === 'admin') {
                document.getElementById('badgeVerified').style.display = 'flex';
            }

            displayCalculatedRating(uData.ratingCount || 0, uData.ratingSum || 0);
        }
    }, err => console.error("ইউজার ডেটা লোড এরর:", err));
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
// =======================================================
// ⭐ ১. রেটিং হিসাব ও স্টার ডিসপ্লে ফাংশন
// =======================================================
function displayCalculatedRating(count, sum) {
    const avgRatingElem = document.getElementById('avgRatingText');
    const totalCountElem = document.getElementById('totalRatingCount');
    const starDisplayZone = document.getElementById('sellerStarsDisplay');

    if (!count || count === 0) {
        if (avgRatingElem) avgRatingElem.textContent = "0.0";
        if (totalCountElem) totalCountElem.textContent = "(0 টি রেটিং)";
        if (starDisplayZone) renderStarIcons(starDisplayZone, 0);
        return;
    }

    const average = (sum / count).toFixed(1);
    if (avgRatingElem) avgRatingElem.textContent = average;
    if (totalCountElem) totalCountElem.textContent = `(${count} টি রেটিং)`;
    if (starDisplayZone) renderStarIcons(starDisplayZone, Math.round(average));
}

function renderStarIcons(container, score) {
    let starsHtml = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= score) {
            starsHtml += `<i class="material-icons" style="color:#ffc107;">star</i>`;
        } else {
            starsHtml += `<i class="material-icons" style="color:#e0e0e0;">star_outline</i>`;
        }
    }
    container.innerHTML = starsHtml;
}

// =======================================================
// ⭐ ২. রেটিং বাটনে ক্লিক ও ফায়ারস্টোর আপডেট (Transaction)
// =======================================================
function setupInteractiveProfileRating(targetType) {
    const starZone = document.getElementById('profileStarsZone');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    const targetId = targetType === 'company' ? targetCompanyId : targetUserId;
    const collectionName = targetType === 'company' ? 'companies' : 'users';
    const localStoreKey = `has_rated_${targetType}_${targetId}`;

    // যদি ইউজার আগে রেটিং দিয়ে থাকে
    let alreadyRatedValue = localStorage.getItem(localStoreKey);
    if (alreadyRatedValue) {
        highlightStars(stars, parseInt(alreadyRatedValue));
        const ratingHeader = document.getElementById('ratingHeader');
        if (ratingHeader) ratingHeader.textContent = "আপনি রেটিং দিয়েছেন";
    }

    stars.forEach(star => {
        star.addEventListener('click', async () => {
            const currentAuthUser = firebase.auth().currentUser;

            // ১. লগইন ভ্যালিডেশন
            if (!currentAuthUser) {
                alert("রেটিং দিতে আপনাকে প্রথমে লগইন করতে হবে!");
                return;
            }

            // ২. নিজের প্রোফাইল চেক
            if (currentAuthUser.uid === targetId) {
                alert("আপনি নিজের প্রোফাইলে নিজে রেটিং দিতে পারবেন না!");
                return;
            }

            // ৩. ডুप्लिकেট রেটিং চেক
            if (localStorage.getItem(localStoreKey)) {
                alert("আপনি ইতিমধ্যে এই প্রোফাইলে রেটিং দিয়েছেন!");
                return;
            }

            const chosenRating = parseInt(star.getAttribute('data-star'));

            // স্টার হাইলাইট আপডেট
            highlightStars(stars, chosenRating);

            const docRef = db.collection(collectionName).doc(targetId);

            try {
                await db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(docRef);

                    if (!doc.exists) {
                        transaction.set(docRef, { ratingCount: 1, ratingSum: chosenRating }, { merge: true });
                    } else {
                        const data = doc.data();
                        const currentCount = data.ratingCount || 0;
                        const currentSum = data.ratingSum || 0;

                        transaction.update(docRef, {
                            ratingCount: currentCount + 1,
                            ratingSum: currentSum + chosenRating
                        });
                    }
                });

                // সফল হলে লোকালস্টোরেজে সেভ করুন
                localStorage.setItem(localStoreKey, chosenRating);
                alert("ধন্যবাদ! আপনার রেটিং সফলভাবে জমা হয়েছে।");

            } catch (err) {
                console.error("রেটিং আপডেট করতে সমস্যা হয়েছে:", err);
                alert("রেটিং জমা দিতে সমস্যা হয়েছে। অনুগ্রহ করে ফায়ারস্টোর রুলস বা কানেকশন চেক করুন।");
            }
        });
    });
}

function highlightStars(starsList, count) {
    starsList.forEach((star, index) => {
        if (index < count) {
            star.style.color = '#ffc107';
        } else {
            star.style.color = '#ccc';
        }
    });
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
