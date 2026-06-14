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
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    
    // UI Elements
    const displayNameEl = document.getElementById('display-name');
    const userBioEl = document.getElementById('user-bio');
    const userEmailEl = document.getElementById('user-email');
    const userPhoneEl = document.getElementById('user-phone');
    const userProfessionEl = document.getElementById('user-profession');
    const userLocationEl = document.getElementById('user-location');
    const userOfficeEl = document.getElementById('user-office');
    const introOfficeItem = document.getElementById('intro-office-item');
    const userAvatar = document.getElementById('user-avatar');
    const headerAvatar = document.getElementById('profileImage'); // 📱 হেডারের ছোট ছবি ফিক্স
    
    const propertiesList = document.getElementById('my-properties-list');
    const totalPostsEl = document.getElementById('total-posts-count');
    const myRatingScoreEl = document.getElementById('my-rating-score');
    const savedPostsCountEl = document.getElementById('saved-posts-count');

    // মডাল এলিমেন্টস
    const editModal = document.getElementById('editProfileModal');
    const editProfileShowBtn = document.getElementById('edit-profile-show-btn');
    const editProfileCloseBtn = document.getElementById('edit-profile-close-btn');
    const editProfileForm = document.getElementById('edit-profile-form');

    // ☰ সাইডবার ও হেডার নেভিগেশন হ্যান্ডলার
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (menuButton && sidebar && overlay) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // হেডার বাটন লিংক ফিক্স
    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('direct-post-btn')?.addEventListener('click', () => location.href = 'post.html');

    // এডিট মডাল ওপেন/ক্লোজ লজিক
    if (editProfileShowBtn) {
        editProfileShowBtn.onclick = () => { editModal.style.display = 'block'; };
    }
    if (editProfileCloseBtn) {
        editProfileCloseBtn.onclick = () => { editModal.style.display = 'none'; };
    }
    window.onclick = (e) => {
        if (e.target === editModal) { editModal.style.display = 'none'; }
    };

    // ১. ফায়ারবেস অথেনটিকেশন ও ডাটা লোড
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            if (userEmailEl) userEmailEl.textContent = user.email;
            try {
                await loadUserProfile(user);
                await loadUserProperties(user.uid);
                await loadSavedPostsCount(user.uid);
            } catch (err) {
                console.error("ডাটা লোড করতে সমস্যা হয়েছে:", err);
            }
        } else {
            window.location.href = 'auth.html';
        }
    });

    // ২. ইউজারের প্রোফাইল ডাটা লোড ফাংশন
    async function loadUserProfile(user) {
        const doc = await db.collection('users').doc(user.uid).get();
        if (doc.exists) {
            const data = doc.data();
            if (displayNameEl) displayNameEl.textContent = data.fullName || data.name || "আমার প্রোফাইল";
            if (userBioEl) userBioEl.textContent = data.bio || "আপনার সম্পর্কে কিছু লিখুন...";
            if (userProfessionEl) userProfessionEl.textContent = data.profession || "যুক্ত করা নেই";
            if (userPhoneEl) userPhoneEl.textContent = data.phoneNumber || data.phone || "ফোন সেট করা নেই";
            if (userLocationEl) userLocationEl.textContent = data.location || "যুক্ত করা নেই";
            
            if (data.officeAddress) {
                if (userOfficeEl) userOfficeEl.textContent = data.officeAddress;
                if (introOfficeItem) introOfficeItem.style.display = "flex";
            } else {
                if (introOfficeItem) introOfficeItem.style.display = "none";
            }
            
            // ছবি সেট করা
            const pPic = data.profilePic || data.avatarUrl || "https://www.w3schools.com/howto/img_avatar.png";
            if (userAvatar) userAvatar.src = pPic;
            if (headerAvatar) headerAvatar.src = pPic;
            if (document.getElementById('edit-avatar-preview')) {
                document.getElementById('edit-avatar-preview').src = pPic;
            }

            // রেটিং সেট করা
            if (data.ratingCount && data.ratingCount > 0) {
                let avg = ((data.ratingSum || 0) / data.ratingCount).toFixed(1);
                if (myRatingScoreEl) myRatingScoreEl.textContent = `⭐ ${avg}`;
            } else {
                if (myRatingScoreEl) myRatingScoreEl.textContent = `⭐ ০.০`;
            }

            // মডাল ইনপুট ফিল্ড প্রিপপ্যুলেশন
            if (document.getElementById('edit-full-name')) document.getElementById('edit-full-name').value = data.fullName || data.name || "";
            if (document.getElementById('edit-bio')) document.getElementById('edit-bio').value = data.bio || "";
            if (document.getElementById('edit-profession')) document.getElementById('edit-profession').value = data.profession || "";
            if (document.getElementById('edit-phone-number')) document.getElementById('edit-phone-number').value = data.phoneNumber || "";
            if (document.getElementById('edit-location')) document.getElementById('edit-location').value = data.location || "";
            if (document.getElementById('edit-office')) document.getElementById('edit-office').value = data.officeAddress || "";
        }
    }

    // ৩. ইউজারের নিজস্ব প্রপার্টি পোস্ট লোড ফাংশন
    async function loadUserProperties(userId) {
        let snapshot = await db.collection('properties').where('userId', '==', userId).get();
        if (propertiesList) propertiesList.innerHTML = '';
        if (totalPostsEl) totalPostsEl.textContent = snapshot.size;
        
        if (snapshot.empty) {
            if (document.getElementById('empty-posts-message')) {
                document.getElementById('empty-posts-message').style.display = 'block';
            }
            return;
        } else {
            if (document.getElementById('empty-posts-message')) {
                document.getElementById('empty-posts-message').style.display = 'none';
            }
        }

        snapshot.forEach(doc => {
            const p = doc.data();
            const card = document.createElement('div');
            card.className = 'property-card';
            card.style.cursor = 'pointer';
            card.style.background = 'white';
            card.style.borderRadius = '8px';
            card.style.overflow = 'hidden';
            card.style.border = '1px solid #e4e6eb';
            
            card.onclick = () => showPropertyDetails(doc.id, p);
            
            let imgUrl = (p.images && p.images.length > 0) ? (p.images[0].url || p.images[0]) : 'https://via.placeholder.com/150';
            
            card.innerHTML = `
                <img src="${imgUrl}" style="width:100%; height:100px; object-fit:cover;">
                <div style="padding:8px; text-align:left;">
                    <h6 style="margin:0 0 4px 0; font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; color:#1c1e21;">${p.title || 'শিরোনামহীন'}</h6>
                    <p style="margin:0; font-size:12px; color:var(--primary); font-weight:bold;">৳ ${p.price || p.rent || 'আলোচনা সাপেক্ষ'}</p>
                </div>
            `;
            propertiesList.appendChild(card);
        });
    }

    // ৪. বুকমার্ক/সেভড পোস্ট কাউন্ট লোড ফাংশن
    async function loadSavedPostsCount(userId) {
        let snapshot = await db.collection('saved_posts').where('userId', '==', userId).get();
        if (savedPostsCountEl) savedPostsCountEl.textContent = snapshot.size;
    }

    // ৫. প্রোফাইল এডিট ফর্ম সাবমিট ও ইমেজ আপলোড লজিক
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return;

            const updateBtn = document.getElementById('update-profile-btn');
            if (updateBtn) {
                updateBtn.disabled = true;
                updateBtn.textContent = "সেভ হচ্ছে...";
            }

            const fullName = document.getElementById('edit-full-name').value;
            const bio = document.getElementById('edit-bio').value;
            const profession = document.getElementById('edit-profession').value;
            const phoneNumber = document.getElementById('edit-phone-number').value;
            const locationName = document.getElementById('edit-location').value;
            const officeAddress = document.getElementById('edit-office').value;
            const fileInput = document.getElementById('edit-profile-picture');

            let profilePicUrl = userAvatar.src;

            try {
                if (fileInput && fileInput.files.length > 0) {
                    const file = fileInput.files[0];
                    const storageRef = storage.ref(`profile_pics/${user.uid}/${Date.now()}_${file.name}`);
                    const uploadTask = await storageRef.put(file);
                    profilePicUrl = await uploadTask.ref.getDownloadURL();
                }

                await db.collection('users').doc(user.uid).set({
                    fullName: fullName,
                    bio: bio,
                    profession: profession,
                    phoneNumber: phoneNumber,
                    location: locationName,
                    officeAddress: officeAddress,
                    profilePic: profilePicUrl,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                alert("প্রোফাইল সফলভাবে আপডেট হয়েছে!");
                editModal.style.display = 'none';
                await loadUserProfile(user);

            } catch (error) {
                console.error("আপডেট ব্যর্থ:", error);
                alert("দুঃখিত, তথ্য সেভ করা যায়নি। আবার চেষ্টা করুন।");
            } finally {
                if (updateBtn) {
                    updateBtn.disabled = false;
                    updateBtn.textContent = "পরিবর্তন সেভ করুন";
                }
            }
        });
    }

    // এডিট মোডে লাইভ ছবি প্রিভিউ লজিক
    const fileInputPic = document.getElementById('edit-profile-picture');
    if (fileInputPic) {
        fileInputPic.onchange = function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewImg = document.getElementById('edit-avatar-preview');
                    if (previewImg) previewImg.src = e.target.result;
                };
                reader.readAsDataURL(this.files[0]);
            }
        };
    }
});

// ৬. মডাল এ প্রপার্টি ডিটেইলস দেখানো এবং ডিলিট করার গ্লোবাল ফাংশন
function showPropertyDetails(id, data) {
    const modal = document.getElementById('propertyModal');
    const contentInner = document.getElementById('modal-content-inner');
    if (!modal || !contentInner) return;
    
    let imageUrl = 'https://via.placeholder.com/150?text=No+Image';
    if (data.images && data.images.length > 0) {
        imageUrl = data.images[0].url || data.images[0];
    }
    
    contentInner.innerHTML = `
        <img src="${imageUrl}" style="width:100%; border-radius:8px; margin-bottom:12px; height:160px; object-fit:cover;">
        <h2 style="font-size:16px; margin:0 0 8px 0; color:#1c1e21; font-weight:bold;">${data.title || 'শিরোনামহীন'}</h2>
        <p style="font-size:13px; color:#555; margin:0 0 6px 0;"><strong>বিবরণ:</strong> ${data.description || 'নেই'}</p>
        <p style="font-size:14px; color:#2ecc71; font-weight:bold; margin:0;"><strong>মূল্য/ভাড়া:</strong> ৳ ${data.price || data.rent || 'আলোচনা সাপেক্ষ'}</p>
    `;

    const deleteBtn = document.getElementById('modal-delete-btn');
    if (deleteBtn) {
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            if (confirm("আপনি কি নিশ্চিতভাবে এই পোস্টটি মুছে ফেলতে চান?")) {
                deletePost(id);
            }
        };
    }
    modal.style.display = 'block';
}

// ৭. পোস্ট ডিলিট করার ব্যাকএন্ড ফাংশন
async function deletePost(id) {
    try {
        await db.collection('properties').doc(id).delete();
        alert("পোস্টটি সফলভাবে মুছে ফেলা হয়েছে।");
        document.getElementById('propertyModal').style.display = 'none';
        // কারেন্ট ইউজারের লিস্টিং রিলোড করা
        const user = auth.currentUser;
        if (user) {
            location.reload(); // পেজটি রিফ্রেশ দিয়ে ডাটা সিঙ্ক করা
        }
    } catch (error) {
        console.error("মুছে ফেলতে ত্রুটি:", error);
        alert("পোস্টটি মোছা সম্ভব হয়নি। আবার চেষ্টা করুন।");
    }
}

// মডাল বন্ধ করার গ্লোবাল ফাংশন
function closePropertyModal() {
    const modal = document.getElementById('propertyModal');
    if (modal) modal.style.display = 'none';
            }
