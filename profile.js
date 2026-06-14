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
    const propertiesList = document.getElementById('my-properties-list');
    const totalPostsEl = document.getElementById('total-posts-count');
    const myRatingScoreEl = document.getElementById('my-rating-score');
    
    // Edit Modal Elements
    const editModal = document.getElementById('editProfileModal');
    const showEditBtn = document.getElementById('edit-profile-show-btn');
    const closeEditBtn = document.getElementById('edit-profile-close-btn');
    const editForm = document.getElementById('edit-profile-form');
    const avatarPreview = document.getElementById('edit-avatar-preview');
    const fileInput = document.getElementById('edit-profile-picture');
........
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    const profileImageWrapper = document.getElementById('profileImageWrapper');
    const headerProfileImage = document.getElementById('profileImage'); // Assuming this is the image tag ID
    const defaultProfileIcon = document.getElementById('defaultProfileIcon'); // Assuming this is the icon ID
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');
    
    
    // ১. ফায়ারবেস অথেনটিকেশন চেক
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            userEmailEl.textContent = user.email;
            
            // প্রোফাইল ডেটা লোড
            try {
                await loadUserProfile(user);
            } catch (err) {
                console.error("Profile load error:", err);
            }
            
            // লিস্টিং লোড
            try {
                await loadUserProperties(user.uid);
            } catch (err) {
                console.error("Properties load error:", err);
            }
            
        } else {
            window.location.href = 'auth.html';
        }
    });

    // ২. ফায়ারস্টোর থেকে ফেসবুক স্টাইল ডাটা রিড ও রেন্ডারিং
    async function loadUserProfile(user) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                
                // নাম ও বায়ো সেটআপ
                displayNameEl.textContent = data.fullName || data.name || "ইউজার প্রোফাইল";
                userBioEl.textContent = data.bio || "আপনার সম্পর্কে কিছু বলুন...";
                
                // ফেসবুক স্টাইল পরিচিতি লিস্ট রেন্ডারিং
                userProfessionEl.textContent = data.profession || "যুক্ত করা নেই";
                userPhoneEl.textContent = data.phoneNumber || data.phone || "ফোন সেট করা নেই";
                userLocationEl.textContent = data.location || "যুক্ত করা নেই";
                
                // ঐচ্ছিক অফিস অ্যাড্রেস চেক
                if (data.officeAddress && data.officeAddress.trim() !== "") {
                    userOfficeEl.textContent = data.officeAddress;
                    introOfficeItem.style.display = "flex";
                } else {
                    introOfficeItem.style.display = "none";
                }
                
                // প্রোফাইল পিকচার ফিক্স
                if(data.profilePic || data.avatarUrl) {
                    let pPic = data.profilePic || data.avatarUrl;
                    userAvatar.src = pPic;
                    avatarPreview.src = pPic;
                }

                // রেটিং স্কোর
                if (data.ratingCount && data.ratingCount > 0) {
                    let avg = ((data.ratingSum || 0) / data.ratingCount).toFixed(1);
                    myRatingScoreEl.textContent = `⭐ ${avg}`;
                }
                
                // মডাল এডিট ফিল্ড ভ্যালু প্রিপপ্যুলেশন
                document.getElementById('edit-full-name').value = data.fullName || data.name || "";
                document.getElementById('edit-bio').value = data.bio || "";
                document.getElementById('edit-profession').value = data.profession || "";
                document.getElementById('edit-phone-number').value = data.phoneNumber || data.phone || "";
                document.getElementById('edit-location').value = data.location || "";
                document.getElementById('edit-office').value = data.officeAddress || "";
            }
        } catch (e) { 
            console.error("Firestore fetch error:", e);
        }
    }

    const directPostBtn = document.getElementById('direct-post-btn');
    if (directPostBtn) {
        directPostBtn.onclick = () => { window.location.href = 'post.html'; };
    }
    
    // ৩. ইউজারের নিজস্ব প্রপার্টি কুয়েরি ফাংশন
    async function loadUserProperties(userId) {
        propertiesList.innerHTML = '<p style="text-align:center; width:100%;">খোঁজা হচ্ছে...</p>';
        try {
            let snapshot = await db.collection('properties').where('userId', '==', userId).get();
            if (snapshot.empty) {
                snapshot = await db.collection('properties').where('uid', '==', userId).get();
            }

            propertiesList.innerHTML = '';
            totalPostsEl.textContent = snapshot.size;

            if (snapshot.empty) {
                document.getElementById('empty-posts-message').style.display = 'block';
                return;
            }

            snapshot.forEach(doc => {
                const p = doc.data();
                const card = document.createElement('div');
                card.className = 'property-card';
                card.style.cursor = "pointer";
                card.onclick = () => showPropertyDetails(doc.id, p);
                
                let imageUrl = 'https://via.placeholder.com/150?text=No+Image';
                if (p.images && p.images.length > 0) {
                    imageUrl = p.images[0].url || p.images[0];
                } else if (p.image) {
                    imageUrl = p.image;
                }

                let displayPrice = p.price || p.rent || p.monthlyRent || p.amount || '০';

                card.innerHTML = `
                    <img src="${imageUrl}" style="width:100%; height:105px; object-fit:cover;">
                    <div style="padding:8px;">
                        <h4 style="margin:0 0 4px 0; font-size:12px; height:32px; overflow:hidden; color:var(--dark); font-weight:600;">${p.title || 'শিরোনামহীন'}</h4>
                        <p style="color:var(--success); font-weight:bold; margin:0; font-size:12px;">৳ ${displayPrice}</p>
                    </div>
                `;
                propertiesList.appendChild(card);
            });
        } catch (e) { 
            console.error("Properties list fetch error:", e);
        }
    }

    // মডাল কন্ট্রোল
    if (showEditBtn) showEditBtn.onclick = () => editModal.style.display = 'block';
    if (closeEditBtn) closeEditBtn.onclick = () => editModal.style.display = 'none';
    
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => avatarPreview.src = e.target.result;
                reader.readAsDataURL(file);
            }
        });
    }

    // ৪. প্রোফাইল এডিট সাবমিট ও বায়ো সেভ লজিক
    if (editForm) {
        editForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('update-profile-btn');
            const user = auth.currentUser;
            
            const newName = document.getElementById('edit-full-name').value;
            const newBio = document.getElementById('edit-bio').value;
            const newProfession = document.getElementById('edit-profession').value;
            const newPhone = document.getElementById('edit-phone-number').value;
            const newLocation = document.getElementById('edit-location').value;
            const newOffice = document.getElementById('edit-office').value;
            const file = fileInput.files[0];
            
            btn.disabled = true;
            btn.textContent = "আপডেট হচ্ছে...";
            
            try {
                let updateData = { 
                    fullName: newName, 
                    bio: newBio,
                    profession: newProfession,
                    phoneNumber: newPhone,
                    location: newLocation,
                    officeAddress: newOffice,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                };

                if (file) {
                    const fileName = `avatar_${user.uid}_${Date.now()}`;
                    const storageRef = storage.ref(`profile_pics/${user.uid}/${fileName}`);
                    const snapshot = await storageRef.put(file);
                    const downloadURL = await snapshot.ref.getDownloadURL();
                    updateData.profilePic = downloadURL;
                }

                await db.collection('users').doc(user.uid).set(updateData, { merge: true });
                alert('আপনার তথ্য সফলভাবে আপডেট হয়েছে!');
                editModal.style.display = 'none';
                location.reload();
                
            } catch (error) {
                console.error("Update profile error:", error);
                alert('সমস্যা হয়েছে: ' + error.message);
                btn.disabled = false;
                btn.textContent = "আবার চেষ্টা করুন";
            }
        };
    }
});


    // 🆕 লগইন করা ইউজারের প্রোফাইল পিকচার হেডারে দেখানোর লজিক
firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    
    if (user && headerProfileImg) {
        try {
            // ফায়ারবেস 'users' কালেকশন থেকে ইউজারের ডাটা আনা হচ্ছে
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().profilePic) {
                // ডাটাবেজে প্রোফাইল পিকচার থাকলে সেটি হেডারে সেট হবে
                headerProfileImg.src = userDoc.data().profilePic;
            } else if (user.photoURL) {
                // গুগল লগইন করা থাকলে গুগল প্রোফাইল পিকচার সেট হবে
                headerProfileImg.src = user.photoURL;
            } else {
                // কোনো ছবি না থাকলে একটি ডিফল্ট অ্যাভাটার সেট হবে
                headerProfileImg.src = 'assets/images/default-avatar.png'; // আপনার প্রজেক্টের ডিফল্ট ছবির পাথ দিন
            }
        } catch (error) {
            console.error("হেডার প্রোফাইল পিকচার লোড করতে ব্যর্থ:", error);
        }
    }
});
