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

document.addEventListener('DOMContentLoaded', () => {
    if (!targetUserId) {
        alert("ভুল ব্যবহারকারী আইডি!");
        window.history.back();
        return;
    }
    loadSellerProfileData();
    loadSellerProperties();
    setupInteractiveProfileRating();
});

// ১. বিক্রেতার ডাটা ফায়ারবেস থেকে পড়া এবং স্ক্রিনে রিডাইরেক্ট করা
function loadSellerProfileData() {
    db.collection('users').doc(targetUserId).get().then(doc => {
        if (doc.exists) {
            const uData = doc.data();
            
            // নাম সেটআপ
            document.getElementById('s-name').textContent = uData.fullName || uData.name || "সম্মানিত বিক্রেতা";
            
            // 🎯 ইমেইল ফিক্স: ফায়ারস্টোর ডক ফাইল থেকে সরাসরি রিড (uData.email)
            document.getElementById('s-email').textContent = uData.email || "ইমেইল সরবরাহ করা হয়নি";
            
            // মেম্বার আইডি
            document.getElementById('s-uid-text').textContent = `...${targetUserId.substring(0,6)}`;
            
            // 🎯 নতুন ফেসবুক পরিচিতি ফিল্ডসমূহ ম্যাপিং
            document.getElementById('s-profession').textContent = uData.profession || "যুক্ত করা নেই";
            document.getElementById('s-location').textContent = uData.location || "যুক্ত করা নেই";
            
            // মোবাইল নম্বর ভ্যালিডেশন
            let userPhone = uData.phoneNumber || uData.phone || "";
            if (userPhone) {
                document.getElementById('s-phone').textContent = userPhone;
            } else {
                document.getElementById('s-phone').textContent = "ফোন নম্বর সেট করা নেই";
            }

            // অফিস ঠিকানা শর্তসাপেক্ষে প্রদর্শন
            if (uData.officeAddress && uData.officeAddress.trim() !== "") {
                document.getElementById('s-office').textContent = uData.officeAddress;
                document.getElementById('s-office-item').style.display = 'flex';
            } else {
                document.getElementById('s-office-item').style.display = 'none';
            }

            // 🎯 বায়ো নামের নিচে সেটআপ
            if (uData.bio && uData.bio.trim() !== "") {
                document.getElementById('s-bio').textContent = `"${uData.bio}"`;
            } else {
                document.getElementById('s-bio').textContent = "";
            }
            
            // প্রোফাইল পিকচার
            if (uData.profilePic) {
                document.getElementById('s-avatar').src = uData.profilePic;
            }

            // ভেরিফাইড ব্যাজ
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

// ২. একটিভ লিস্টিং সমুহ প্রপার্টি কালেকশন থেকে নিয়ে আসা
async function loadSellerProperties() {
    const grid = document.getElementById('seller-listings');
    if (!grid) return;

    try {
        const snapshot = await db.collection('properties')
                                 .where('userId', '==', targetUserId)
                                 .get();
        grid.innerHTML = "";

        if (snapshot.empty) {
            grid.innerHTML = `<div class="no-post">এই ব্যবহারকারী এখনো কোনো প্রপার্টি পোস্ট করেননি।</div>`;
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
        console.error("পোস্ট তালিকা লোড করতে সমস্যা হয়েছে:", error);
        grid.innerHTML = `<div class="no-post">পোস্টগুলো লোড করা যাচ্ছে না।</div>`;
    }
}

// ৩. রিয়েল-টাইম ফায়ারবেস ট্রানজেকশন রেটিং জোন
function setupInteractiveProfileRating() {
    const starZone = document.getElementById('profileStarsZone');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    const localStoreKey = `has_rated_user_${targetUserId}`;

    let alreadyRatedValue = localStorage.getItem(localStoreKey);
    if (alreadyRatedValue) {
        highlightStars(stars, parseInt(alreadyRatedValue));
        document.getElementById('ratingHeader').textContent = "আপনি এই পোস্টদাতাকে রেটিং দিয়েছেন";
    }

    stars.forEach(star => {
        star.addEventListener('click', async () => {
            if (localStorage.getItem(localStoreKey)) {
                alert("আপনি ইতিমধ্যে এই ব্যবহারকারীকে রেটিং দিয়েছেন!");
                return;
            }

            const chosenRating = parseInt(star.getAttribute('data-star'));
            const currentAuthUser = firebase.auth().currentUser;
            
            if (currentAuthUser && currentAuthUser.uid === targetUserId) {
                alert("আপনার নিজের প্রোফাইলে নিজে রেটিং দিতে পারবেন না!");
                return;
            }

            localStorage.setItem(localStoreKey, chosenRating);
            highlightStars(stars, chosenRating);

            const userRef = db.collection('users').doc(targetUserId);
            try {
                await db.runTransaction(async (transaction) => {
                    const sfDoc = await transaction.get(userRef);
                    if (!sfDoc.exists) {
                        transaction.set(userRef, { ratingCount: 1, ratingSum: chosenRating });
                        return;
                    }
                    
                    let newCount = (sfDoc.data().ratingCount || 0) + 1;
                    let newSum = (sfDoc.data().ratingSum || 0) + chosenRating;
                    
                    transaction.update(userRef, {
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
    if (count === 0) {
        label.textContent = "গড় রেটিং: ০.০ (০টি ভোট)";
        return;
    }
    let average = (sum / count).toFixed(1);
    label.textContent = `গড় রেটিং: ⭐ ${average} (${count}টি ভোট)`;
                                        }
