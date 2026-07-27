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
// ইউজার আইডি বা পেজ আইডি ডায়নামিক্যালি পড়া
const targetUserId = sUrlParams.get('userId') || sUrlParams.get('pageId') || sUrlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    if (!targetUserId) {
        alert("ভুল প্রোফাইল বা পেজ আইডি!");
        window.history.back();
        return;
    }
    loadDynamicProfileData();
    loadSellerProperties();
    setupInteractiveProfileRating();
});

// ১. ফায়ারবেস থেকে ইউজার বা পেজের ডাটা অটোমেটিক্যালি ডিটেক্ট ও লোড করা
async function loadDynamicProfileData() {
    try {
        // প্রথমে 'users' কালেকশনে সার্চ করবে
        let userDoc = await db.collection('users').doc(targetUserId).get();

        if (userDoc.exists) {
            let uData = userDoc.data();
            
            // যদি টাইপ 'page' হয় অথবা 'pages' কালেকশনে থাকে
            if (uData.type === 'page' || uData.isPage === true) {
                renderPageUI(uData);
            } else {
                renderUserUI(uData);
            }
        } else {
            // ইউজার কালেকশনে না থাকলে 'pages' কালেকশনে সার্চ করবে
            let pageDoc = await db.collection('pages').doc(targetUserId).get();
            if (pageDoc.exists) {
                renderPageUI(pageDoc.data());
            } else {
                document.getElementById('s-name').textContent = "অজানা প্রোফাইল বা পেজ";
            }
        }
    } catch (err) {
        console.error("প্রোফাইল ডাটা লোড করতে সমস্যা:", err);
    }
}

// 👤 ইউজার মোড রেন্ডার
function renderUserUI(uData) {
    document.getElementById('s-name').textContent = uData.fullName || uData.name || "সম্মানিত বিক্রেতা";
    document.getElementById('s-email').textContent = uData.email || "ইমেইল সরবরাহ করা হয়নি";
    document.getElementById('s-uid-text').textContent = `...${targetUserId.substring(0, 6)}`;
    
    document.getElementById('label-profession').textContent = "পেশা:";
    document.getElementById('icon-profession').textContent = "work";
    document.getElementById('s-profession').textContent = uData.profession || "যুক্ত করা নেই";

    document.getElementById('label-location').textContent = "বসবাস করেন:";
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
    if (uData.coverPic) {
        document.getElementById('s-cover').style.backgroundImage = `url('${uData.coverPic}')`;
    }

    if (uData.isVerified === true || uData.role === 'admin') {
        document.getElementById('badgeVerified').style.display = 'flex';
    }

    displayCalculatedRating(uData.ratingCount || 0, uData.ratingSum || 0);
}

// 🚩 পেজ মোড রেন্ডার
function renderPageUI(pData) {
    document.getElementById('s-name').textContent = pData.pageName || pData.title || pData.name || "অফিসিয়াল পেজ";
    document.getElementById('s-email').textContent = pData.email || "ইমেইল নেই";
    
    // পেজ মোডে মেম্বার আইডির পরিবর্তে পেজ আইডি দেখানো
    document.getElementById('label-uid').textContent = "পেজ আইডি:";
    document.getElementById('s-uid-text').textContent = `...${targetUserId.substring(0, 6)}`;

    // ক্যাটাগরি এবং অবস্থান
    document.getElementById('label-profession').textContent = "ক্যাটাগরি:";
    document.getElementById('icon-profession').textContent = "category";
    document.getElementById('s-profession').textContent = pData.category || "বিজনেস পেজ";

    document.getElementById('label-location').textContent = "ঠিকানা:";
    document.getElementById('s-location').textContent = pData.address || pData.location || "যুক্ত করা নেই";

    let phone = pData.phone || pData.phoneNumber || "";
    document.getElementById('s-phone').textContent = phone ? phone : "ফোন নম্বর নেই";

    if (pData.website) {
        document.getElementById('s-website').textContent = pData.website;
        document.getElementById('item-website').style.display = 'flex';
    }

    if (pData.description || pData.bio) {
        document.getElementById('s-bio').textContent = `"${pData.description || pData.bio}"`;
    }

    if (pData.logo || pData.profilePic) {
        document.getElementById('s-avatar').src = pData.logo || pData.profilePic;
    }

    if (pData.coverPic || pData.banner) {
        document.getElementById('s-cover').style.backgroundImage = `url('${pData.coverPic || pData.banner}')`;
    }

    // পেজ ব্যাজ
    document.getElementById('badgePage').style.display = 'flex';
    if (pData.isVerified === true) {
        document.getElementById('badgeVerified').style.display = 'flex';
    }

    document.getElementById('posts-title').textContent = "এই পেজের এক্টিভ প্রপার্টি সমূহ:";
    displayCalculatedRating(pData.ratingCount || 0, pData.ratingSum || 0);
}

// ২. একটিভ লিস্টিং সমুহ লোড করা
async function loadSellerProperties() {
    const grid = document.getElementById('seller-listings');
    if (!grid) return;

    try {
        // প্রপার্টি 'userId' অথবা 'pageId' মিলিয়ে সার্চ করবে
        let snapshot = await db.collection('properties')
                                 .where('userId', '==', targetUserId)
                                 .get();

        if (snapshot.empty) {
            snapshot = await db.collection('properties')
                               .where('pageId', '==', targetUserId)
                               .get();
        }

        grid.innerHTML = "";

        if (snapshot.empty) {
            grid.innerHTML = `<div class="no-post">এখানে কোনো প্রপার্টি পোস্ট পাওয়া যায়নি।</div>`;
            return;
        }

        if (snapshot.size >= 3) {
            document.getElementById('badgeTopSeller').style.display = 'flex';
        }

        snapshot.forEach(doc => {
            const post = doc.data();
            let priceVal = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let unitVal = post.priceUnit || post.rentUnit || "";
            let thumbnail = (post.images && post.images[0]) ? (post.images[0].url || post.images[0]) : 'placeholder.jpg';
            let locationText = `${post.location?.village || ''}, ${post.location?.thana || ''}`;

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
        console.error("পোস্ট তালিকা লোড করতে সমস্যা হয়েছে:", error);
        grid.innerHTML = `<div class="no-post">পোস্টগুলো লোড করা যাচ্ছে না।</div>`;
    }
}

// ৩. রিয়েল-টাইম ফায়ারবেস রেটিং সিস্টেম
function setupInteractiveProfileRating() {
    const starZone = document.getElementById('profileStarsZone');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    const localStoreKey = `has_rated_${targetUserId}`;

    let alreadyRatedValue = localStorage.getItem(localStoreKey);
    if (alreadyRatedValue) {
        highlightStars(stars, parseInt(alreadyRatedValue));
        document.getElementById('ratingHeader').textContent = "আপনি রেটিং দিয়েছেন";
    }

    stars.forEach(star => {
        star.addEventListener('click', async () => {
            if (localStorage.getItem(localStoreKey)) {
                alert("আপনি ইতিমধ্যে রেটিং দিয়েছেন!");
                return;
            }

            const chosenRating = parseInt(star.getAttribute('data-star'));
            const currentAuthUser = firebase.auth().currentUser;
            
            if (currentAuthUser && currentAuthUser.uid === targetUserId) {
                alert("আপনার নিজের প্রোফাইলে রেটিং দিতে পারবেন না!");
                return;
            }

            localStorage.setItem(localStoreKey, chosenRating);
            highlightStars(stars, chosenRating);

            // 'users' না পেলে 'pages' ডকুমেন্টে আপডেট করবে
            let docRef = db.collection('users').doc(targetUserId);
            let docSnap = await docRef.get();
            if (!docSnap.exists) {
                docRef = db.collection('pages').doc(targetUserId);
            }

            try {
                await db.runTransaction(async (transaction) => {
                    const sfDoc = await transaction.get(docRef);
                    if (!sfDoc.exists) {
                        transaction.set(docRef, { ratingCount: 1, ratingSum: chosenRating });
                        return;
                    }
                    
                    let newCount = (sfDoc.data().ratingCount || 0) + 1;
                    let newSum = (sfDoc.data().ratingSum || 0) + chosenRating;
                    
                    transaction.update(docRef, {
                        ratingCount: newCount,
                        ratingSum: newSum
                    });
                });

                alert("সফলভাবে রেটিং দেওয়া হয়েছে! ধন্যবাদ।");
                location.reload();

            } catch (err) {
                console.error("রেটিং আপডেট ব্যর্থ:", err);
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

// হেডার প্রোফাইল ছবি সিঙ্ক
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
