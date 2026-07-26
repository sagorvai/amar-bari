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
// URL থেকে userId, companyId, ownerId বা id যেকোনো একটি রিসিভ করবে
const targetProfileId = sUrlParams.get('userId') || sUrlParams.get('companyId') || sUrlParams.get('ownerId') || sUrlParams.get('id');

document.addEventListener('DOMContentLoaded', () => {
    setupHeaderAndSidebar();

    if (!targetProfileId) {
        alert("আইডি পাওয়া যায়নি!");
        window.history.back();
        return;
    }
    loadProfileDetails();
    loadProfileProperties();
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

// ১. কোম্পানি / ইউজার / পেজ যেকোনো কালেকশন থেকে ডাটা লোড
async function loadProfileDetails() {
    try {
        let profileData = null;
        let isCompany = false;

        // Step 1: Check 'companies' collection first
        let companyDoc = await db.collection('companies').doc(targetProfileId).get();
        if (companyDoc.exists) {
            profileData = companyDoc.data();
            isCompany = true;
        } else {
            // Step 2: Check 'users' collection
            let userDoc = await db.collection('users').doc(targetProfileId).get();
            if (userDoc.exists) {
                profileData = userDoc.data();
            } else {
                // Step 3: Check 'pages' collection
                let pageDoc = await db.collection('pages').doc(targetProfileId).get();
                if (pageDoc.exists) {
                    profileData = pageDoc.data();
                    isCompany = true;
                }
            }
        }

        if (profileData) {
            const displayName = profileData.companyName || profileData.pageName || profileData.fullName || profileData.name || "পোস্টদাতা";
            document.getElementById('s-name').textContent = displayName;
            document.getElementById('s-email').textContent = profileData.email || "ইমেইল সরবরাহ করা হয়নি";
            document.getElementById('s-uid-text').textContent = `...${targetProfileId.substring(0, 6)}`;
            document.getElementById('s-profession').textContent = isCompany ? "কোম্পানি / প্রতিষ্ঠান" : (profileData.profession || "যুক্ত করা নেই");
            document.getElementById('s-location').textContent = profileData.address || profileData.location || "যুক্ত করা নেই";

            let phone = profileData.phoneNumber || profileData.phone || profileData.secondaryPhone || "";
            document.getElementById('s-phone').textContent = phone ? phone : "ফোন নম্বর সেট করা নেই";

            if (profileData.officeAddress && profileData.officeAddress.trim() !== "") {
                document.getElementById('s-office').textContent = profileData.officeAddress;
                document.getElementById('s-office-item').style.display = 'flex';
            } else {
                document.getElementById('s-office-item').style.display = 'none';
            }

            let bioText = profileData.description || profileData.bio || "";
            document.getElementById('s-bio').textContent = bioText ? `"${bioText}"` : "";

            let avatarUrl = profileData.logo || profileData.profilePic || profileData.image || "https://www.w3schools.com/howto/img_avatar.png";
            document.getElementById('s-avatar').src = avatarUrl;

            if (profileData.isVerified === true || profileData.role === 'admin' || isCompany) {
                document.getElementById('badgeVerified').style.display = 'flex';
            }

            displayCalculatedRating(profileData.ratingCount || 0, profileData.ratingSum || 0);
        } else {
            document.getElementById('s-name').textContent = "অজানা প্রোফাইল";
        }
    } catch (err) {
        console.error("প্রোফাইল লোড এরর:", err);
    }
}

// ২. কোম্পানি/ইউজারের সমস্ত একটিভ প্রপার্টি লোড
async function loadProfileProperties() {
    const grid = document.getElementById('seller-listings');
    if (!grid) return;

    try {
        grid.innerHTML = "";
        
        // কোম্পানি আইডি অথবা ইউজার আইডি—সব ধরনের ফিল্ডে চেক করা হবে
        let queries = [
            db.collection('properties').where('companyId', '==', targetProfileId).get(),
            db.collection('properties').where('ownerId', '==', targetProfileId).get(),
            db.collection('properties').where('userId', '==', targetProfileId).get(),
            db.collection('properties').where('authorId', '==', targetProfileId).get()
        ];

        const results = await Promise.all(queries);
        
        // ডুপ্লিকেট ডকুমেন্ট রিমুভ করতে Map ব্যবহার করা হলো
        const postsMap = new Map();
        results.forEach(snapshot => {
            snapshot.forEach(doc => {
                postsMap.set(doc.id, { id: doc.id, ...doc.data() });
            });
        });

        if (postsMap.size === 0) {
            grid.innerHTML = `<div class="no-post">এই বিক্রেতার কোনো একটিভ প্রপার্টি নেই।</div>`;
            return;
        }

        if (postsMap.size >= 3) {
            document.getElementById('badgeTopSeller').style.display = 'flex';
        }

        postsMap.forEach(post => {
            let priceVal = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let unitVal = post.priceUnit || post.rentUnit || "";
            let thumbnail = (post.images && post.images[0]) ? (post.images[0].url || post.images[0]) : 'placeholder.jpg';
            let locationText = `${post.location?.village || post.location?.upazila || ''}, ${post.location?.thana || post.location?.district || ''}`;

            grid.innerHTML += `
                <div class="post-card" onclick="location.href='details.html?id=${post.id}'">
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
        console.error("পোস্টগুলো লোড করতে সমস্যা:", error);
        grid.innerHTML = `<div class="no-post">পোস্ট লোড করা যাচ্ছে না।</div>`;
    }
}

// ৩. ইন্টারঅ্যাক্টিভ রেটিং সিস্টেম
function setupInteractiveProfileRating() {
    const starZone = document.getElementById('profileStarsZone');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    const localStoreKey = `has_rated_user_${targetProfileId}`;

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

            // ট্রানজেকশন চালিয়ে রেটিং সেভ করা
            try {
                let targetCol = 'users';
                let docSnap = await db.collection('companies').doc(targetProfileId).get();
                if (docSnap.exists) {
                    targetCol = 'companies';
                }

                const profileRef = db.collection(targetCol).doc(targetProfileId);
                await db.runTransaction(async (transaction) => {
                    const sfDoc = await transaction.get(profileRef);
                    if (sfDoc.exists) {
                        let newCount = (sfDoc.data().ratingCount || 0) + 1;
                        let newSum = (sfDoc.data().ratingSum || 0) + chosenRating;
                        transaction.update(profileRef, { ratingCount: newCount, ratingSum: newSum });
                    }
                });
                alert("রেটিং দেওয়ার জন্য ধন্যবাদ!");
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
    if (count === 0) {
        label.textContent = "গড় রেটিং: ০.০ (০টি ভোট)";
        return;
    }
    let average = (sum / count).toFixed(1);
    label.textContent = `গড় রেটিং: ⭐ ${average} (${count}টি ভোট)`;
}
