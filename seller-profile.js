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
const targetCompanyId = sUrlParams.get('companyId');
const targetUserId = sUrlParams.get('userId');
const targetMode = sUrlParams.get('mode'); 

const targetId = targetCompanyId || targetUserId;
const isCompanyMode = targetMode === 'company' || !!targetCompanyId;

document.addEventListener('DOMContentLoaded', () => {
    if (!targetId) {
        alert("ভুল অথবা অনুপস্থিত ব্যবহারকারী/কোম্পানি আইডি!");
        window.history.back();
        return;
    }

    loadSellerProfileData();
    loadSellerProperties();
    setupInteractiveProfileRating();
});

// ১. বিক্রেতার (কোম্পানি বা ইউজার) ডাটা ফায়ারবেস থেকে পড়া এবং স্ক্রিনে দেখানো
async function loadSellerProfileData() {
    const badgeVerified = document.getElementById('badgeVerified');

    // প্রথমে কোম্পানি কালেকশনে চেক করব
    try {
        let compDoc = await db.collection('companies').doc(targetId).get();

        // যদি সরাসরি আইডি না পাওয়া যায়, তবে companyId ফিল্ড ধরেও খোঁজা হবে
        if (!compDoc.exists && !isCompanyMode) {
            const compQuery = await db.collection('companies').where('companyId', '==', targetId).limit(1).get();
            if (!compQuery.empty) {
                compDoc = compQuery.docs[0];
            }
        }

        if (compDoc.exists) {
            const cData = compDoc.data();

            // কোম্পানি নাম (ডেটাবেসের 'name' বা 'companyName')
            document.getElementById('s-name').textContent = cData.name || cData.companyName || "অফিসিয়াল কোম্পানি";
            document.getElementById('s-account-type').textContent = "কোম্পানি / এজেন্সি পেজ";
            
            // বায়ো (ডেটাবেসের 'bio' বা 'description')
            const bioText = cData.bio || cData.description || cData.about;
            document.getElementById('s-bio').textContent = bioText ? `"${bioText}"` : "এই কোম্পানির কোনো বিবরণ যোগ করা হয়নি।";

            // লোগো / প্রোফাইল ছবি
            const logo = cData.logo || cData.companyLogo || cData.profilePic;
            if (logo) {
                document.getElementById('s-avatar').src = logo;
            }

            // টাইপ / ক্যাটাগরি
            document.getElementById('s-profession').textContent = cData.businessType || cData.category || "রিয়েল এস্টেট কোম্পানি";

            // ঠিকানা
            const locationText = cData.officeAddress || cData.address || cData.location || "ঠিকানা দেওয়া নেই";
            document.getElementById('s-location').textContent = locationText;
            
            // ইমেইল
            document.getElementById('s-email').textContent = cData.email || "ইমেইল সরবরাহ করা হয়নি";
            
            // ফোন নম্বর
            document.getElementById('s-phone').textContent = cData.phone || cData.phoneNumber || "ফোন নম্বর সেট করা নেই";

            // আইডি
            document.getElementById('s-uid-text').textContent = targetId;

            // অফিস ঠিকানা (পৃথক থাকলে)
            if (cData.officeAddress && cData.officeAddress.trim() !== "") {
                document.getElementById('s-office').textContent = cData.officeAddress;
                document.getElementById('s-office-item').style.display = 'flex';
            } else {
                document.getElementById('s-office-item').style.display = 'none';
            }

            // ভেরিফাইড ব্যাজ
            if (cData.isVerified === true || cData.status === 'verified') {
                if (badgeVerified) badgeVerified.style.display = 'flex';
            }

            displayCalculatedRating(cData.ratingCount || 0, cData.ratingSum || 0);
            return; // কোম্পানি ডাটা পেয়ে গেলে এখানেই শেষ
        }
    } catch (err) {
        console.error("কোম্পানি ডেটা লোড এরর:", err);
    }

    // কোম্পানি কালেকশনে না পেলে সাধারণ ইউজার কালেকশনে ট্রাই করবে
    loadUserProfileFallback(targetId);
}

// সাধারণ ইউজার লোডার
function loadUserProfileFallback(uId) {
    const badgeVerified = document.getElementById('badgeVerified');
    db.collection('users').doc(uId).get().then(doc => {
        if (doc.exists) {
            const uData = doc.data();

            document.getElementById('s-name').textContent = uData.fullName || uData.name || "সম্মানিত বিক্রেতা";
            document.getElementById('s-account-type').textContent = "ব্যক্তিগত অ্যাকাউন্ট";
            document.getElementById('s-email').textContent = uData.email || "ইমেইল সরবরাহ করা হয়নি";
            document.getElementById('s-uid-text').textContent = uId;

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
                document.getElementById('s-bio').textContent = "এই ইউজারের কোনো বিবরণ বা বায়ো পাওয়া যায়নি।";
            }

            if (uData.profilePic) {
                document.getElementById('s-avatar').src = uData.profilePic;
            }

            if (uData.isVerified === true || uData.role === 'admin') {
                if (badgeVerified) badgeVerified.style.display = 'flex';
            }

            displayCalculatedRating(uData.ratingCount || 0, uData.ratingSum || 0);

        } else {
            document.getElementById('s-name').textContent = "অজানা ব্যবহারকারী";
        }
    }).catch(err => {
        console.error("ইউজার ডেটা লোড এরর:", err);
    });
}

// ২. একটিভ লিস্টিং সমূহ লোড করা
async function loadSellerProperties() {
    const grid = document.getElementById('seller-listings');
    const badgeTopSeller = document.getElementById('badgeTopSeller');
    if (!grid) return;

    try {
        let snapshot = await db.collection('properties')
                               .where('companyId', '==', targetId)
                               .get();

        if (snapshot.empty) {
            snapshot = await db.collection('properties')
                               .where('userId', '==', targetId)
                               .get();
        }

        if (snapshot.empty) {
            snapshot = await db.collection('properties')
                               .where('ownerUid', '==', targetId)
                               .get();
        }

        grid.innerHTML = "";

        if (snapshot.empty) {
            grid.innerHTML = `<div class="no-post">এই বিজ্ঞাপনদাতার বর্তমানে কোনো প্রপার্টি পোস্ট নেই।</div>`;
            return;
        }

        if (snapshot.size >= 3 && badgeTopSeller) {
            badgeTopSeller.style.display = 'flex';
        }

        snapshot.forEach(doc => {
            const post = doc.data();
            let priceVal = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let unitVal = post.priceUnit || post.rentUnit || "";
            let thumbnail = (post.images && post.images[0]) ? (post.images[0].url || post.images[0]) : 'placeholder.jpg';
            let locationText = `${post.location?.village || ''}, ${post.location?.thana || post.location?.upazila || ''}`;

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

    } catch (error) {
        console.error("পোস্ট তালিকা লোড করতে সমস্যা হয়েছে:", error);
        grid.innerHTML = `<div class="no-post">পোস্টগুলো লোড করা যাচ্ছে না।</div>`;
    }
}

// ৩. রেটিং লজিক
function setupInteractiveProfileRating() {
    const starZone = document.getElementById('profileStarsZone');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    const localStoreKey = `has_rated_target_${targetId}`;

    let alreadyRatedValue = localStorage.getItem(localStoreKey);
    if (alreadyRatedValue) {
        highlightStars(stars, parseInt(alreadyRatedValue));
        document.getElementById('ratingHeader').textContent = "আপনি ইতোমধ্যে রেটিং দিয়েছেন";
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

            // কোম্পানি বা ইউজারে ট্রানজেকশন চালানো
            const targetRef = db.collection('companies').doc(targetId);

            try {
                await db.runTransaction(async (transaction) => {
                    const sfDoc = await transaction.get(targetRef);
                    if (!sfDoc.exists) {
                        const userRef = db.collection('users').doc(targetId);
                        transaction.set(userRef, { ratingCount: 1, ratingSum: chosenRating }, { merge: true });
                        return;
                    }
                    
                    let newCount = (sfDoc.data().ratingCount || 0) + 1;
                    let newSum = (sfDoc.data().ratingSum || 0) + chosenRating;
                    
                    transaction.update(targetRef, {
                        ratingCount: newCount,
                        ratingSum: newSum
                    });
                });

                alert("সফলভাবে রেটিং দেওয়া হয়েছে! ধন্যবাদ।");
                location.reload();

            } catch (err) {
                console.error("রেটিং ট্রানজেকশন ব্যর্থ:", err);
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
