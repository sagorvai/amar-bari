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
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    
    // Edit Modal Elements
    const editModal = document.getElementById('editProfileModal');
    const showEditBtn = document.getElementById('edit-profile-show-btn');
    const closeEditBtn = document.getElementById('edit-profile-close-btn');
    const editForm = document.getElementById('edit-profile-form');
    const avatarPreview = document.getElementById('edit-avatar-preview');
    const fileInput = document.getElementById('edit-profile-picture');

    // ১. ফায়ারবেস অথেনটিকেশন চেক ও হেডার ইমেজ লোড (একীভূত করা হয়েছে)
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            if(userEmailEl) userEmailEl.textContent = user.email;
            
            // হেডার পিকচার লোড লজিক
            if (headerProfileImg) {
                if (user.photoURL) headerProfileImg.src = user.photoURL;
                else headerProfileImg.src = 'https://www.w3schools.com/howto/img_avatar.png';
            }

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

    // ২. ফায়ারস্টোর থেকে ডাটা রিড ও রেন্ডারিং
    async function loadUserProfile(user) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                
                if(displayNameEl) displayNameEl.textContent = data.fullName || data.name || "ইউজার প্রোফাইল";
                if(userBioEl) userBioEl.textContent = data.bio || "আপনার সম্পর্কে কিছু বলুন...";
                if(userProfessionEl) userProfessionEl.textContent = data.profession || "যুক্ত করা নেই";
                if(userPhoneEl) userPhoneEl.textContent = data.phoneNumber || data.phone || "ফোন সেট করা নেই";
                if(userLocationEl) userLocationEl.textContent = data.location || "যুক্ত করা নেই";
                
                if (data.officeAddress && data.officeAddress.trim() !== "") {
                    if(userOfficeEl) userOfficeEl.textContent = data.officeAddress;
                    if(introOfficeItem) introOfficeItem.style.display = "flex";
                } else {
                    if(introOfficeItem) introOfficeItem.style.display = "none";
                }
                
                if(data.profilePic || data.avatarUrl) {
                    let pPic = data.profilePic || data.avatarUrl;
                    if(userAvatar) userAvatar.src = pPic;
                    if(avatarPreview) avatarPreview.src = pPic;
                    if(headerProfileImg) headerProfileImg.src = pPic; // ডাটাবেজের ছবি হেডারে সেট
                }

                if (data.ratingCount && data.ratingCount > 0 && myRatingScoreEl) {
                    let avg = ((data.ratingSum || 0) / data.ratingCount).toFixed(1);
                    myRatingScoreEl.textContent = `⭐ ${avg}`;
                }
                
                if(document.getElementById('edit-full-name')) document.getElementById('edit-full-name').value = data.fullName || data.name || "";
                if(document.getElementById('edit-bio')) document.getElementById('edit-bio').value = data.bio || "";
                if(document.getElementById('edit-profession')) document.getElementById('edit-profession').value = data.profession || "";
                if(document.getElementById('edit-phone-number')) document.getElementById('edit-phone-number').value = data.phoneNumber || data.phone || "";
                if(document.getElementById('edit-location')) document.getElementById('edit-location').value = data.location || "";
                if(document.getElementById('edit-office')) document.getElementById('edit-office').value = data.officeAddress || "";
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
        if(!propertiesList) return;
        propertiesList.innerHTML = '<p style="text-align:center; width:100%;">খোঁজা হচ্ছে...</p>';
        try {
            let snapshot = await db.collection('properties').where('userId', '==', userId).get();
            if (snapshot.empty) {
                snapshot = await db.collection('properties').where('uid', '==', userId).get();
            }

            propertiesList.innerHTML = '';
            if(totalPostsEl) totalPostsEl.textContent = snapshot.size;

            if (snapshot.empty) {
                if(document.getElementById('empty-posts-message')) document.getElementById('empty-posts-message').style.display = 'block';
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

    // মিসিং ফাংশনটি ডিফাইন করা হলো
    window.showPropertyDetails = function(docId, propertyData) {
        const modalInner = document.getElementById('modal-content-inner');
        if(modalInner) {
            modalInner.innerHTML = `
                <h3 style="margin-top:0;">${propertyData.title || 'শিরোনামহীন'}</h3>
                <p><b>মূল্য:</b> ৳ ${propertyData.price || propertyData.rent || '০'}</p>
                <p><b>অবস্থান:</b> ${propertyData.location || 'দেওয়া নেই'}</p>
            `;
        }
        const pModal = document.getElementById('propertyModal');
        if(pModal) pModal.style.display = 'block';
    }

    if (showEditBtn && editModal) showEditBtn.onclick = () => editModal.style.display = 'block';
    if (closeEditBtn && editModal) closeEditBtn.onclick = () => editModal.style.display = 'none';
    
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file && avatarPreview) {
                const reader = new FileReader();
                reader.onload = (e) => avatarPreview.src = e.target.result;
                reader.readAsDataURL(file);
            }
        });
    }

    // ৪. প্রোফাইল এডিট সাবমিট লজিক
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
            
            if(btn) {
                btn.disabled = true;
                btn.textContent = "আপডেট হচ্ছে...";
            }
            
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
                if(editModal) editModal.style.display = 'none';
                location.reload();
                
            } catch (error) {
                console.error("Update profile error:", error);
                alert('সমস্যা হয়েছে: ' + error.message);
                if(btn) {
                    btn.disabled = false;
                    btn.textContent = "আবার চেষ্টা করুন";
                }
            }
        };
    }
});
