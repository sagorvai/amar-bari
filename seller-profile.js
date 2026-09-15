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
// 🏢 ১. কোম্পানি/পেজ প্রোফাইল লোড (3-Step Smart Fallback)
// =======================================================
async function loadCompanyProfileData() {
    try {
        if (!targetCompanyId) return;

        // STEP 1: সরাসরি Document ID দিয়ে চেক
        const docRef = db.collection('companies').doc(targetCompanyId);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            renderCompanyProfileDetails(docSnap.data(), docSnap.id);
            // Real-time updates
            docRef.onSnapshot(s => { if(s.exists) renderCompanyProfileDetails(s.data(), s.id); });
        } else {
            // STEP 2: Query দিয়ে খোঁজা (companyId, id, ownerUid, uid)
            fetchCompanyByQuery(targetCompanyId);
        }

    } catch (err) {
        console.error("কোম্পানি ডেটা লোড এরর:", err);
        fetchCompanyByQuery(targetCompanyId);
    }
}

// 🏢 কোম্পানি কোয়েরি ব্যাকআপ হেল্পার
async function fetchCompanyByQuery(cId) {
    try {
        let snap = await db.collection('companies').where('companyId', '==', cId).limit(1).get();
        if (snap.empty) snap = await db.collection('companies').where('id', '==', cId).limit(1).get();
        if (snap.empty) snap = await db.collection('companies').where('ownerUid', '==', cId).limit(1).get();
        if (snap.empty) snap = await db.collection('companies').where('uid', '==', cId).limit(1).get();

        if (!snap.empty) {
            const foundDoc = snap.docs[0];
            renderCompanyProfileDetails(foundDoc.data(), foundDoc.id);
        } else {
            // STEP 3: কোম্পানিতে না পাওয়া গেলে প্রপার্টি পোস্ট থেকে ডাটা উদ্ধার করা (যাতে নাম/ছবি অন্তত শো করে)
            fetchCompanyFromPropertyPost(cId);
        }
    } catch (e) {
        console.error("কোম্পানি কোয়েরি ত্রুটি:", e);
        fetchCompanyFromPropertyPost(cId);
    }
}

// 🏢 ব্যাকআপ step 3: প্রপার্টি পোস্ট থেকে তথ্য উদ্ধার
async function fetchCompanyFromPropertyPost(cId) {
    try {
        let pSnap = await db.collection('properties').where('companyId', '==', cId).limit(1).get();
        if (pSnap.empty) pSnap = await db.collection('properties').where('ownerUid', '==', cId).limit(1).get();
        if (pSnap.empty) pSnap = await db.collection('properties').where('userId', '==', cId).limit(1).get();

        if (!pSnap.empty) {
            const postData = pSnap.docs[0].data();
            
            // প্রপার্টি পোস্টে থাকা তথ্য দিয়ে প্রোফাইল সাজানো
            const fallbackCompanyData = {
                companyName: postData.postedByName || postData.authorName || postData.companyName || "অফিসিয়াল কোম্পানি",
                logo: postData.postedByAvatar || postData.companyLogo || postData.logo,
                phone: postData.phoneNumber || postData.phone,
                email: postData.email,
                officeAddress: postData.location?.district ? `${postData.location.thana || ''}, ${postData.location.district}` : null,
                businessType: postData.type || "আবাসন প্রতিষ্ঠান",
                companyId: cId
            };

            renderCompanyProfileDetails(fallbackCompanyData, cId);
        } else {
            document.getElementById('s-name').textContent = "অজানা কোম্পানি পেজ";
        }
    } catch (err) {
        console.error("প্রপার্টি পোস্ট থেকে কোম্পানি ডাটা আনবে ব্যর্থ:", err);
    }
}

// 🏢 কোম্পানির তথ্য রেন্ডার করার ফাইনাল হেল্পার
function renderCompanyProfileDetails(cData, docId) {
    if (!cData) return;

    // ১. নাম ফিল্টার
    const companyName = cData.companyName || cData.name || cData.fullName || cData.title || cData.postedByName || cData.authorName || "কোম্পানি পেজ";
    const nameElem = document.getElementById('s-name');
    if (nameElem) nameElem.textContent = companyName;

    // ২. ইমেইল
    const emailElem = document.getElementById('s-email');
    if (emailElem) emailElem.textContent = cData.email || cData.companyEmail || "ইমেইল সরবরাহ করা হয়নি";

    // ৩. আইডি টেক্সট
    const displayId = cData.companyId || docId || targetCompanyId;
    const uidElem = document.getElementById('s-uid-text');
    if (uidElem) {
        uidElem.textContent = displayId.length > 10 ? `...${displayId.substring(0, 8)}` : displayId;
    }

    // ৪. বায়ো
    const bioElem = document.getElementById('s-bio');
    if (bioElem) {
        const bioText = cData.bio || cData.description || cData.about || "";
        bioElem.textContent = bioText.trim() !== "" ? `"${bioText}"` : "";
    }

    // ৫. ক্যাটাগরি/টাইপ
    const profElem = document.getElementById('s-profession');
    if (profElem) {
        profElem.textContent = cData.businessType || cData.category || cData.profession || "আবাসন কোম্পানি";
    }

    // ৬. ঠিকানা ও লোকেশন
    const locElem = document.getElementById('s-location');
    if (locElem) {
        locElem.textContent = cData.officeAddress || cData.address || cData.location || "যুক্ত করা নেই";
    }

    // ৭. ফোন নম্বর
    const phoneElem = document.getElementById('s-phone');
    if (phoneElem) {
        phoneElem.textContent = cData.phone || cData.phoneNumber || cData.contact || "ফোন নম্বর সেট করা নেই";
    }

    // ৮. অফিস তথ্য প্রদর্শনী
    const officeElem = document.getElementById('s-office');
    const officeItemElem = document.getElementById('s-office-item');
    if (officeElem && officeItemElem) {
        const officeAddr = cData.officeAddress || cData.address;
        if (officeAddr && officeAddr.trim() !== "") {
            officeElem.textContent = officeAddr;
            officeItemElem.style.display = 'flex';
        } else {
            officeItemElem.style.display = 'none';
        }
    }

    // ৯. লোগো / অবতার
    const logo = cData.logo || cData.companyLogo || cData.profilePic || cData.photoURL || cData.postedByAvatar;
    const avatarElem = document.getElementById('s-avatar');
    if (logo && avatarElem) {
        avatarElem.src = logo;
    }

    // ১০. ভেরিফাইড ব্যাজ
    const badgeVerified = document.getElementById('badgeVerified');
    if (badgeVerified) {
        badgeVerified.style.display = (cData.isVerified === true) ? 'flex' : 'none';
    }

    // ১১. রেটিং লাইভ রেন্ডার
    displayCalculatedRating(cData.ratingCount || 0, cData.ratingSum || 0);
}

// =======================================================
// 👤 ২. সাধারণ ইউজার প্রোফাইল লোড
// =======================================================
function loadSellerProfileData() {
    if (!targetUserId) return;

    db.collection('users').doc(targetUserId).onSnapshot(doc => {
        if (doc.exists) {
            const uData = doc.data();

            const userName = uData.fullName || uData.name || uData.displayName || uData.authorName || uData.postedByName || "সম্মানিত বিক্রেতা";
            
            document.getElementById('s-name').textContent = userName;
            document.getElementById('s-email').textContent = uData.email || "ইমেইল সরবরাহ করা হয়নি";
            document.getElementById('s-uid-text').textContent = `...${targetUserId.substring(0, 6)}`;

            document.getElementById('s-profession').textContent = uData.profession || "যুক্ত করা নেই";
            document.getElementById('s-location').textContent = uData.location || uData.address || "যুক্ত করা নেই";

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

            const avatar = uData.profilePic || uData.photoURL || uData.postedByAvatar;
            if (avatar) {
                document.getElementById('s-avatar').src = avatar;
            }

            if (uData.isVerified === true || uData.role === 'admin') {
                document.getElementById('badgeVerified').style.display = 'flex';
            }

            displayCalculatedRating(uData.ratingCount || 0, uData.ratingSum || 0);

        } else {
            document.getElementById('s-name').textContent = "অজানা ব্যবহারকারী";
        }
    }, err => {
        console.error("ইউজার ডেটা লোড এরর:", err);
    });
}

// =======================================================
// 🏢 ৩. কোম্পানির লিস্টিং/প্রপার্টি লোড
// =======================================================
async function loadCompanyProperties() {
    const grid = document.getElementById('seller-listings');
    if (!grid) return;

    try {
        let snapshot = await db.collection('properties')
                                 .where('companyId', '==', targetCompanyId)
                                 .get();

        if (snapshot.empty) {
            snapshot = await db.collection('properties')
                                 .where('ownerUid', '==', targetCompanyId)
                                 .get();
        }

        if (snapshot.empty) {
            snapshot = await db.collection('properties')
                                 .where('userId', '==', targetCompanyId)
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

        if (snapshot.empty) {
            snapshot = await db.collection('properties')
                                 .where('createdByUid', '==', targetUserId)
                                 .get();
        }

        renderPropertyList(snapshot, grid);
    } catch (error) {
        console.error("ইউজারের পোস্ট তালিকা লোড করতে সমস্যা:", error);
        grid.innerHTML = `<div class="no-post">পোস্টগুলো লোড করা যাচ্ছে না।</div>`;
    }
}

// প্রপার্টি গ্রিড রেন্ডার করার হেল্পার
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
        let locationText = post.location ? `${post.location.village || ''}, ${post.location.thana || post.location.upazila || ''}` : 'ঠিকানা নেই';

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
        const ratingHeader = document.getElementById('ratingHeader');
        if (ratingHeader) ratingHeader.textContent = "আপনি ইতিমধ্যে রেটিং দিয়েছেন";
    }

    stars.forEach(star => {
        star.addEventListener('click', async () => {
            const currentAuthUser = firebase.auth().currentUser;

            if (!currentAuthUser) {
                alert("রেটিং দিতে আপনাকে প্রথমে লগইন করতে হবে!");
                return;
            }

            if (currentAuthUser.uid === targetId) {
                alert("নিজের প্রোফাইলে নিজে রেটিং দিতে পারবেন না!");
                return;
            }

            if (localStorage.getItem(localStoreKey)) {
                alert("আপনি ইতিমধ্যে এই প্রোফাইলে রেটিং দিয়েছেন!");
                return;
            }

            const chosenRating = parseInt(star.getAttribute('data-star'));
            highlightStars(stars, chosenRating);

            const docRef = db.collection(collectionName).doc(targetId);

            try {
                await db.runTransaction(async (transaction) => {
                    const doc = await transaction.get(docRef);

                    if (!doc.exists) {
                        transaction.set(docRef, { ratingCount: 1, ratingSum: chosenRating }, { merge: true });
                    } else {
                        const existingData = doc.data();
                        const currentCount = existingData.ratingCount || 0;
                        const currentSum = existingData.ratingSum || 0;

                        transaction.update(docRef, {
                            ratingCount: currentCount + 1,
                            ratingSum: chosenRating + currentSum
                        });
                    }
                });

                localStorage.setItem(localStoreKey, chosenRating);
                alert("সফলভাবে রেটিং দেওয়া হয়েছে! ধন্যবাদ।");

            } catch (err) {
                console.error("রেটিং আপডেট করতে সমস্যা:", err);
                alert("রেটিং জমা দিতে সমস্যা হয়েছে।");
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
// 🔄 হেডার প্রোফাইল পিকচার সিঙ্ক
// =======================================================
firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    if (!user || !headerProfileImg) return;

    const activeIdentityType = localStorage.getItem('activeIdentityType');

    if (activeIdentityType === 'company') {
        try {
            const compDoc = await db.collection('companies').doc(user.uid).get();
            if (compDoc.exists && compDoc.data().logo) {
                headerProfileImg.src = compDoc.data().logo;
                return;
            }
        } catch (e) {
            console.error("হেডারে কোম্পানি লোগো লোড করতে সমস্যা:", e);
        }
    }

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
