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
// userId, pageId বা companyId যেকোনোটি পেতে পারে
const targetUserId = sUrlParams.get('userId') || sUrlParams.get('pageId') || sUrlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    setupHeaderAndSidebar();

    if (!targetUserId) {
        alert("ভুল প্রোফাইল বা আইডি পাওয়া যায়নি!");
        window.history.back();
        return;
    }
    loadSellerOrPageProfileData();
    loadSellerOrPageProperties();
    setupInteractiveProfileRating();
});

function setupHeaderAndSidebar() {
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    const profileImageWrapper = document.getElementById('profileImageWrapper');

    if (menuButton && sidebar && overlay) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    if (notificationButton) notificationButton.addEventListener('click', () => { window.location.href = 'notifications.html'; });
    if (headerPostButton) headerPostButton.addEventListener('click', () => { window.location.href = 'post.html'; });
    if (messageButton) messageButton.addEventListener('click', () => { window.location.href = 'messages.html'; });
    if (profileImageWrapper) profileImageWrapper.addEventListener('click', () => { window.location.href = 'profile.html'; });
}

// ১. প্রথমে users কালেকশন, না পেলে pages/companies কালেকশন খুঁজবে
async function loadSellerOrPageProfileData() {
    try {
        // Step A: Check 'users' collection
        let userDoc = await db.collection('users').doc(targetUserId).get();
        let uData = null;

        if (userDoc.exists) {
            uData = userDoc.data();
        } else {
            // Step B: Check 'pages' collection if not in users
            let pageDoc = await db.collection('pages').doc(targetUserId).get();
            if (pageDoc.exists) {
                uData = pageDoc.data();
            } else {
                // Step C: Check 'companies' collection as backup
                let companyDoc = await db.collection('companies').doc(targetUserId).get();
                if (companyDoc.exists) {
                    uData = companyDoc.data();
                }
            }
        }

        if (uData) {
            document.getElementById('s-name').textContent = uData.pageName || uData.companyName || uData.fullName || uData.name || "পোস্টদাতা";
            document.getElementById('s-email').textContent = uData.email || "ইমেইল সরবরাহ করা হয়নি";
            document.getElementById('s-uid-text').textContent = `...${targetUserId.substring(0,6)}`;
            document.getElementById('s-profession').textContent = uData.category || uData.profession || "পেজ/কোম্পানি";
            document.getElementById('s-location').textContent = uData.address || uData.location || "যুক্ত করা নেই";
            
            let userPhone = uData.phoneNumber || uData.phone || "";
            document.getElementById('s-phone').textContent = userPhone ? userPhone : "ফোন নম্বর সেট করা নেই";

            if (uData.officeAddress && uData.officeAddress.trim() !== "") {
                document.getElementById('s-office').textContent = uData.officeAddress;
                document.getElementById('s-office-item').style.display = 'flex';
            } else {
                document.getElementById('s-office-item').style.display = 'none';
            }

            if (uData.bio || uData.description) {
                document.getElementById('s-bio').textContent = `"${uData.bio || uData.description}"`;
            } else {
                document.getElementById('s-bio').textContent = "";
            }
            
            let avatarImg = uData.logo || uData.profilePic || uData.image || "https://www.w3schools.com/howto/img_avatar.png";
            document.getElementById('s-avatar').src = avatarImg;

            if (uData.isVerified === true || uData.role === 'admin' || uData.isPage) {
                document.getElementById('badgeVerified').style.display = 'flex';
            }

            displayCalculatedRating(uData.ratingCount || 0, uData.ratingSum || 0);
        } else {
            document.getElementById('s-name').textContent = "অজানা বিক্রেতা/পেজ";
        }
    } catch (err) {
        console.error("ডেটা লোড করতে সমস্যা:", err);
    }
}

// ২. userId, pageId বা companyId যেকোনোটি দিয়ে পোস্ট লোড করবে
async function loadSellerOrPageProperties() {
    const grid = document.getElementById('seller-listings');
    if (!grid) return;

    try {
        grid.innerHTML = "";
        let snapshot = await db.collection('properties').where('userId', '==', targetUserId).get();

        // userId তে না পেলে pageId দিয়ে খুঁজবে
        if (snapshot.empty) {
            snapshot = await db.collection('properties').where('pageId', '==', targetUserId).get();
        }

        // pageId তেও না পেলে companyId দিয়ে খুঁজবে
        if (snapshot.empty) {
            snapshot = await db.collection('properties').where('companyId', '==', targetUserId).get();
        }

        if (snapshot.empty) {
            grid.innerHTML = `<div class="no-post">এই পেজ/বিক্রেতার কোনো একটিভ প্রপার্টি নেই।</div>`;
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
        console.error("পোস্ট লোড করতে সমস্যা হয়েছে:", error);
        grid.innerHTML = `<div class="no-post">পোস্টগুলো লোড করা যাচ্ছে না।</div>`;
    }
}

// ৩. রেটিং লজিক
function setupInteractiveProfileRating() {
    const starZone = document.getElementById('profileStarsZone');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    const localStoreKey = `has_rated_user_${targetUserId}`;

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
            localStorage.setItem(localStoreKey, chosenRating);
            highlightStars(stars, chosenRating);

            // ডিফল্টভাবে users এ আপডেট করার চেষ্টা করবে
            const userRef = db.collection('users').doc(targetUserId);
            try {
                await db.runTransaction(async (transaction) => {
                    const sfDoc = await transaction.get(userRef);
                    if (sfDoc.exists) {
                        let newCount = (sfDoc.data().ratingCount || 0) + 1;
                        let newSum = (sfDoc.data().ratingSum || 0) + chosenRating;
                        transaction.update(userRef, { ratingCount: newCount, ratingSum: newSum });
                    }
                });
                alert("রেটিং দেওয়ার জন্য ধন্যবাদ!");
                location.reload();
            } catch (err) {
                console.error("রেটিং ট্রানজেকশন ভুল:", err);
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
