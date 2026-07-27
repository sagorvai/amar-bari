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

// 🎯 ডাইনামিকভাবে targetId এবং targetType (company নাকি user) নির্ণয়
let targetId = sUrlParams.get('companyId') || sUrlParams.get('userId');
let targetType = sUrlParams.get('mode') || (sUrlParams.has('companyId') ? 'company' : 'user');

document.addEventListener('DOMContentLoaded', () => {
    if (!targetId) {
        alert("ভুল অথবা অনুপস্থিত আইডি!");
        window.history.back();
        return;
    }
    
    // প্রথমে প্রোফাইল ডাটা লোড হবে, সেটি সফল হলে প্রপার্টি লোড হবে
    loadSellerProfileData();
    setupInteractiveProfileRating();
});

// ১. বিক্রেতার ডাটা (কোম্পানি/পেজ অথবা ইউজার) ফায়ারবেস থেকে পড়া
async function loadSellerProfileData() {
    try {
        let docSnap = null;
        let isCompanyMode = (targetType === 'company');

        // প্রথম চেষ্টা: নির্দিষ্ট টাইপ অনুযায়ী ডাটা ফেচ করা
        if (isCompanyMode) {
            docSnap = await db.collection('companies').doc(targetId).get();
        } else {
            docSnap = await db.collection('users').doc(targetId).get();
        }

        // দ্বিতীয় চেষ্টা (ফালব্যাক): যদি ভুলবশত টাইপ মিসম্যাচ হয়, তবে অন্য কালেকশন চেক করবে
        if (!docSnap.exists) {
            if (isCompanyMode) {
                docSnap = await db.collection('users').doc(targetId).get();
                if (docSnap.exists) targetType = 'user'; // মোড ঠিক করে দেওয়া হলো
            } else {
                docSnap = await db.collection('companies').doc(targetId).get();
                if (docSnap.exists) targetType = 'company'; // মোড ঠিক করে দেওয়া হলো
            }
        }

        if (docSnap && docSnap.exists) {
            const sData = docSnap.data();

            // ১. নাম সেটআপ (কোম্পানি হলে companyName/name, ইউজার হলে fullName/name)
            const nameElem = document.getElementById('s-name');
            if (nameElem) {
                nameElem.textContent = sData.companyName || sData.name || sData.fullName || (targetType === 'company' ? "সম্মানিত পেজ/প্রতিষ্ঠান" : "সম্মানিত বিক্রেতা");
            }

            // ২. বায়ো/স্লোগান
            const bioElem = document.getElementById('s-bio');
            if (bioElem) {
                if (sData.bio && sData.bio.trim() !== "") {
                    bioElem.textContent = `"${sData.bio}"`;
                } else {
                    bioElem.textContent = "";
                }
            }

            // ৩. প্রোফাইল পিকচার / লোগো
            const avatarElem = document.getElementById('s-avatar');
            if (avatarElem) {
                const avatarUrl = sData.logo || sData.companyLogo || sData.profilePic;
                if (avatarUrl) {
                    avatarElem.src = avatarUrl;
                } else {
                    avatarElem.src = 'assets/images/default-avatar.png'; // ডিফল্ট ছবি
                }
            }

            // ৪. ইমেইল প্রদর্শন 
            const emailElem = document.getElementById('s-email');
            if (emailElem) {
                emailElem.textContent = sData.email || "ইমেইল সরবরাহ করা হয়নি";
            }

            // ৫. মেম্বার আইডি/কোম্পানি আইডি
            const uidElem = document.getElementById('s-uid-text');
            if (uidElem) {
                uidElem.textContent = `...${targetId.substring(0, 6)}`;
            }

            // ৬. পেশা / প্রতিষ্ঠান ধরণ
            const profElem = document.getElementById('s-profession');
            if (profElem) {
                if (targetType === 'company') {
                    profElem.textContent = "অফিসিয়াল পেজ/কোম্পানি";
                } else {
                    profElem.textContent = sData.profession || "যুক্ত করা নেই";
                }
            }

            // ৭. লোকেশন
            const locElem = document.getElementById('s-location');
            if (locElem) {
                locElem.textContent = sData.officeAddress || sData.location || "যুক্ত করা নেই";
            }

            // ৮. মোবাইল নম্বর
            const phoneElem = document.getElementById('s-phone');
            if (phoneElem) {
                let phoneNum = sData.phone || sData.phoneNumber || "";
                phoneElem.textContent = phoneNum ? phoneNum : "ফোন নম্বর সেট করা নেই";
            }

            // ৯. অফিস ঠিকানা (শর্তসাপেক্ষে প্রদর্শন)
            const officeElem = document.getElementById('s-office');
            const officeItemElem = document.getElementById('s-office-item');
            if (officeElem && officeItemElem) {
                if (sData.officeAddress && sData.officeAddress.trim() !== "") {
                    officeElem.textContent = sData.officeAddress;
                    officeItemElem.style.display = 'flex';
                } else {
                    officeItemElem.style.display = 'none';
                }
            }

            // ১০. ভেরিফাইড ব্যাজ
            const badgeElem = document.getElementById('badgeVerified');
            if (badgeElem) {
                if (sData.isVerified === true || sData.role === 'admin' || targetType === 'company') {
                    badgeElem.style.display = 'flex';
                } else {
                    badgeElem.style.display = 'none';
                }
            }

            // ১১. রেটিং প্রদর্শন
            displayCalculatedRating(sData.ratingCount || 0, sData.ratingSum || 0);

            // ১২. 🎯 প্রোফাইলের ধরণ নিশ্চিত হওয়ার পর প্রপার্টি লোড করা
            loadSellerProperties();

        } else {
            const nameElem = document.getElementById('s-name');
            if (nameElem) nameElem.textContent = "অজানা প্রোফাইল";
            document.getElementById('seller-listings').innerHTML = `<div class="no-post">এই বিক্রেতার কোনো তথ্য পাওয়া যায়নি।</div>`;
        }
    } catch (err) {
        console.error("প্রোফাইল ডাটা লোড করতে সমস্যা হয়েছে:", err);
    }
}

// ২. একটিভ লিস্টিং সমূহ প্রপার্টি কালেকশন থেকে নিয়ে আসা (কোম্পানি বা ইউজার অনুযায়ী)
async function loadSellerProperties() {
    const grid = document.getElementById('seller-listings');
    if (!grid) return;

    try {
        let query;
        if (targetType === 'company') {
            // পেজের জন্য companyId দিয়ে ফিল্টার
            query = db.collection('properties').where('companyId', '==', targetId);
        } else {
            // সাধারণ ইউজারের জন্য userId দিয়ে ফিল্টার
            query = db.collection('properties').where('userId', '==', targetId);
        }

        const snapshot = await query.get();
        grid.innerHTML = "";

        if (snapshot.empty) {
            grid.innerHTML = `<div class="no-post">এই ${targetType === 'company' ? 'পেজ' : 'ব্যবহারকারী'} এখনো কোনো প্রপার্টি পোস্ট করেননি।</div>`;
            return;
        }

        const topSellerBadge = document.getElementById('badgeTopSeller');
        if (snapshot.size >= 3 && topSellerBadge) {
            topSellerBadge.style.display = 'flex';
        }

        snapshot.forEach(doc => {
            const post = doc.data();
            let priceVal = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let unitVal = post.priceUnit || post.rentUnit || "";
            let thumbnail = (post.images && post.images[0]) ? (post.images[0].url || post.images[0]) : 'placeholder.jpg';
            
            // লোকেশন টেক্সট ফিক্স
            let village = post.location?.village || '';
            let thana = post.location?.thana || post.location?.upazila || '';
            let locationText = [village, thana].filter(Boolean).join(', ');

            grid.innerHTML += `
                <div class="post-card" onclick="location.href='details.html?id=${doc.id}'">
                    <span class="card-tag">${post.category || 'লিস্টিং'}</span>
                    <img src="${thumbnail}" alt="Property Image">
                    <div class="post-info">
                        <h4 class="post-title-text">${post.title || 'শিরোনামহীন প্রপার্টি'}</h4>
                        <div class="post-meta-loc">
                            <i class="material-icons">location_on</i>
                            <span>${locationText || 'অবস্থান নেই'}</span>
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

// ৩. রিয়েল-টাইম ফায়ারবেস ট্রানজেকশন রেটিং জোন (কোম্পানি এবং ইউজার উভয়ের জন্য)
function setupInteractiveProfileRating() {
    const starZone = document.getElementById('profileStarsZone');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    
    // লোকাল স্টোরেজ কী (যাতে ইউজার/কোম্পানি অনুযায়ী রেটিং সেভ থাকে)
    const localStoreKey = `has_rated_${targetType}_${targetId}`;

    let alreadyRatedValue = localStorage.getItem(localStoreKey);
    if (alreadyRatedValue) {
        highlightStars(stars, parseInt(alreadyRatedValue));
        const ratingHeader = document.getElementById('ratingHeader');
        if (ratingHeader) ratingHeader.textContent = "আপনি এই বিক্রেতাকে রেটিং দিয়েছেন";
    }

    stars.forEach(star => {
        star.addEventListener('click', async () => {
            if (localStorage.getItem(localStoreKey)) {
                alert("আপনি ইতিমধ্যে রেটিং দিয়েছেন!");
                return;
            }

            const chosenRating = parseInt(star.getAttribute('data-star'));
            const currentAuthUser = firebase.auth().currentUser;

            // নিজের অ্যাকাউন্টে নিজে রেটিং দেওয়া বন্ধ করা
            if (currentAuthUser && currentAuthUser.uid === targetId) {
                alert("আপনার নিজের প্রোফাইলে নিজে রেটিং দিতে পারবেন না!");
                return;
            }

            localStorage.setItem(localStoreKey, chosenRating);
            highlightStars(stars, chosenRating);

            // সঠিক কালেকশন নির্বাচন
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

// 🆕 লগইন করা ইউজারের প্রোফাইল পিকচার হেডারে দেখানোর লজিক
firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');

    if (user && headerProfileImg) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().profilePic) {
                headerProfileImg.src = userDoc.data().profilePic;
            } else if (user.photoURL) {
                headerProfileImg.src = user.photoURL;
            } else {
                headerProfileImg.src = 'assets/images/default-avatar.png';
            }
        } catch (error) {
            console.error("হেডার প্রোফাইল পিকচার লোড করতে ব্যর্থ:", error);
        }
    }
});
