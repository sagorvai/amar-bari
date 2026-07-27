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

// 🎯 URL থেকে ডায়নামিক আইডি রিড করা
const sUrlParams = new URLSearchParams(window.location.search);
const targetCompanyId = sUrlParams.get('companyId');
const targetUserId = sUrlParams.get('userId');
const targetGeneralId = sUrlParams.get('id');

// যে আইডিটি প্যারামিটারে পাওয়া যাবে সেটিই টার্গেট আইডি
const targetId = targetCompanyId || targetUserId || targetGeneralId;

document.addEventListener('DOMContentLoaded', () => {
    if (!targetId) {
        alert("কোনো বিক্রেতা বা কোম্পানি আইডি পাওয়া যায়নি!");
        window.history.back();
        return;
    }

    // নির্দিষ্ট আইডির জন্য প্রোফাইল এবং পোস্ট লোড
    fetchDynamicProfileData(targetId);
    fetchDynamicSellerProperties(targetId);
    setupInteractiveProfileRating(targetId);
});

// ১. নির্দিষ্ট আইডির সেলার/কোম্পানি প্রোফাইল লোড
async function fetchDynamicProfileData(id) {
    const badgeVerified = document.getElementById('badgeVerified');
    
    try {
        // প্রথমে Companies কালেকশনে খোঁজ করা
        let compSnap = await db.collection('companies').doc(id).get();

        if (!compSnap.exists) {
            // যদি Doc ID না মিলে, তবে 'companyId' ফিল্ড দিয়ে সার্চ
            const q = await db.collection('companies').where('companyId', '==', id).limit(1).get();
            if (!q.empty) compSnap = q.docs[0];
        }

        if (compSnap.exists) {
            const cData = compSnap.data();
            
            document.getElementById('s-name').textContent = cData.name || cData.companyName || "কোম্পানি পেজ";
            document.getElementById('s-account-type').textContent = "অফিসিয়াল কোম্পানি / এজেন্সি";
            document.getElementById('s-bio').textContent = cData.bio || cData.description ? `"${cData.bio || cData.description}"` : "এই কোম্পানির কোনো বিবরণ যোগ করা হয়নি।";
            
            if (cData.logo || cData.profilePic) {
                document.getElementById('s-avatar').src = cData.logo || cData.profilePic;
            }

            document.getElementById('s-profession').textContent = cData.businessType || cData.category || "রিয়েল এস্টেট কোম্পানি";
            document.getElementById('s-location').textContent = cData.officeAddress || cData.address || cData.location || "ঠিকানা যুক্ত করা নেই";
            document.getElementById('s-phone').textContent = cData.phone || cData.phoneNumber || "ফোন নম্বর নেই";
            document.getElementById('s-email').textContent = cData.email || "ইমেইল নেই";
            document.getElementById('s-uid-text').textContent = compSnap.id;

            if (cData.officeAddress && cData.officeAddress.trim() !== "") {
                document.getElementById('s-office').textContent = cData.officeAddress;
                document.getElementById('s-office-item').style.display = 'flex';
            } else {
                document.getElementById('s-office-item').style.display = 'none';
            }

            if (cData.isVerified === true || cData.status === 'verified') {
                if (badgeVerified) badgeVerified.style.display = 'flex';
            }

            displayCalculatedRating(cData.ratingCount || 0, cData.ratingSum || 0);
            return;
        }

        // কোম্পানিতে না পাওয়া গেলে Users কালেকশনে খোঁজা
        const userSnap = await db.collection('users').doc(id).get();
        if (userSnap.exists) {
            const uData = userSnap.data();

            document.getElementById('s-name').textContent = uData.fullName || uData.name || "সম্মানিত বিক্রেতা";
            document.getElementById('s-account-type').textContent = "ব্যক্তিগত অ্যাকাউন্ট";
            document.getElementById('s-bio').textContent = uData.bio ? `"${uData.bio}"` : "এই ইউজারের কোনো বিবরণ পাওয়া যায়নি।";
            
            if (uData.profilePic) {
                document.getElementById('s-avatar').src = uData.profilePic;
            }

            document.getElementById('s-profession').textContent = uData.profession || "ব্যক্তিগত অ্যাকাউন্ট";
            document.getElementById('s-location').textContent = uData.location || "ঠিকানা দেওয়া নেই";
            document.getElementById('s-phone').textContent = uData.phoneNumber || uData.phone || "গোপন রাখা হয়েছে";
            document.getElementById('s-email').textContent = uData.email || "ইমেইল নেই";
            document.getElementById('s-uid-text').textContent = userSnap.id;

            if (uData.officeAddress && uData.officeAddress.trim() !== "") {
                document.getElementById('s-office').textContent = uData.officeAddress;
                document.getElementById('s-office-item').style.display = 'flex';
            } else {
                document.getElementById('s-office-item').style.display = 'none';
            }

            if (uData.isVerified === true || uData.role === 'admin') {
                if (badgeVerified) badgeVerified.style.display = 'flex';
            }

            displayCalculatedRating(uData.ratingCount || 0, uData.ratingSum || 0);
        } else {
            document.getElementById('s-name').textContent = "অজানা ব্যবহারকারী";
        }

    } catch (err) {
        console.error("প্রোফাইল লোড এরর:", err);
    }
}

// ২. কেবল সেই নির্দিষ্ট সেলারের পোস্টসমূহ লোড করা (Filter with ID)
async function fetchDynamicSellerProperties(id) {
    const grid = document.getElementById('seller-listings');
    const badgeTopSeller = document.getElementById('badgeTopSeller');
    if (!grid) return;

    try {
        // ১. প্রথমে কোম্পানি আইডি দিয়ে ফিল্টার
        let snapshot = await db.collection('properties').where('companyId', '==', id).get();

        // ২. না পেলে ইউজার আইডি দিয়ে ফিল্টার
        if (snapshot.empty) {
            snapshot = await db.collection('properties').where('userId', '==', id).get();
        }

        // ৩. তাও না পেলে ওনার আইডি দিয়ে ফিল্টার
        if (snapshot.empty) {
            snapshot = await db.collection('properties').where('ownerUid', '==', id).get();
        }

        grid.innerHTML = "";

        // কোনো পোস্ট না থাকলে নোটিফিকেশন দেখাবে
        if (snapshot.empty) {
            grid.innerHTML = `<div class="no-post" style="grid-column: 1/-1;">এই বিজ্ঞাপনদাতার বর্তমানে কোনো একটিভ পোস্ট নেই।</div>`;
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
            let locationText = `${post.location?.village || ''} ${post.location?.thana || post.location?.upazila || ''}`;

            grid.innerHTML += `
                <div class="post-card" onclick="location.href='details.html?id=${doc.id}'">
                    <span class="card-tag">${post.category || 'লিস্টিং'}</span>
                    <img src="${thumbnail}" alt="Property Image">
                    <div class="post-info">
                        <h4 class="post-title-text">${post.title || 'শিরোনামহীন প্রপার্টি'}</h4>
                        <div class="post-meta-loc">
                            <i class="material-icons">location_on</i>
                            <span>${locationText || 'বাংলাদেশ'}</span>
                        </div>
                        <div class="post-price-box">
                            <p class="post-price-text">৳ ${priceVal || 'আলোচনা সাপেক্ষ'} ${unitVal}</p>
                            <i class="material-icons" style="font-size:16px; color:var(--primary)">arrow_forward</i>
                        </div>
                    </div>
                </div>`;
        });

    } catch (error) {
        console.error("প্রপার্টি পোস্ট ফিল্টার করতে সমস্যা হয়েছে:", error);
        grid.innerHTML = `<div class="no-post" style="grid-column: 1/-1;">পোস্টগুলো লোড করা যাচ্ছে না।</div>`;
    }
}

// ৩. রেটিং সিস্টেম
function setupInteractiveProfileRating(id) {
    const starZone = document.getElementById('profileStarsZone');
    if (!starZone) return;

    const stars = starZone.querySelectorAll('i');
    const localStoreKey = `has_rated_target_${id}`;

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
            
            if (currentAuthUser && currentAuthUser.uid === id) {
                alert("নিজের প্রোফাইলে নিজে রেটিং দিতে পারবেন না!");
                return;
            }

            localStorage.setItem(localStoreKey, chosenRating);
            highlightStars(stars, chosenRating);

            let targetRef = db.collection('companies').doc(id);

            try {
                await db.runTransaction(async (transaction) => {
                    let sfDoc = await transaction.get(targetRef);
                    if (!sfDoc.exists) {
                        targetRef = db.collection('users').doc(id);
                        sfDoc = await transaction.get(targetRef);
                    }
                    
                    if (!sfDoc.exists) return;

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
