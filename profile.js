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
    const headerProfilePic = document.getElementById('profileImage');
    const propertiesList = document.getElementById('my-properties-list');
    const savedPropertiesList = document.getElementById('saved-properties-list');
    const totalPostsEl = document.getElementById('total-posts-count');
    const savedPostsCountEl = document.getElementById('saved-posts-count');
    const myRatingScoreEl = document.getElementById('my-rating-score');
    
    // Sidebar Elements
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const sidebarLogout = document.getElementById('sidebar-logout');

    // Edit Modal Elements
    const editModal = document.getElementById('editProfileModal');
    const showEditBtn = document.getElementById('edit-profile-show-btn');
    const closeEditBtn = document.getElementById('edit-profile-close-btn');
    const editForm = document.getElementById('edit-profile-form');
    const avatarPreview = document.getElementById('edit-avatar-preview');
    const fileInput = document.getElementById('edit-profile-picture');

    // ১. সাইডবার ওপেন/ক্লোজ টগল লজিক
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

    if (sidebarLogout) {
        sidebarLogout.addEventListener('click', () => {
            if(confirm('আপনি কি লগআউট করতে চান?')) {
                auth.signOut().then(() => { window.location.href = 'auth.html'; });
            }
        });
    }

    // ২. মডালের বাইরের ব্যাকগ্রাউন্ডে ক্লিক করলে ক্লোজ হওয়ার ফাংশন
    window.onclick = function(event) {
        if (event.target === editModal) {
            editModal.style.display = 'none';
        }
        const propModal = document.getElementById('propertyModal');
        if (event.target === propModal) {
            propModal.style.display = 'none';
        }
    }

    // ৩. ফায়ারবেস অথেনটিকেশন স্টেট মনিটর
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            if (userEmailEl) userEmailEl.textContent = user.email;
            
            // প্রোফাইল ডেটা লোড
            try {
                await loadUserProfile(user);
            } catch (err) {
                console.error("Profile load error:", err);
            }
            
            // ইউজারের নিজের লিস্টিং লোড
            try {
                await loadUserProperties(user.uid);
            } catch (err) {
                console.error("Properties load error:", err);
            }

            // ইউজারের বুকমার্ক করা পোস্ট লোড
            try {
                await loadSavedProperties(user.uid);
            } catch (err) {
                console.error("Saved properties load error:", err);
            }
            
        } else {
            window.location.href = 'auth.html';
        }
    });

    // ৪. ফায়ারস্টোর থেকে ডেটা রিড ও রেন্ডারিং
    async function loadUserProfile(user) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                
                displayNameEl.textContent = data.fullName || data.name || "ইউজার প্রোফাইল";
                userBioEl.textContent = data.bio || "আপনার সম্পর্কে কিছু বলুন...";
                userProfessionEl.textContent = data.profession || "যুক্ত করা নেই";
                userPhoneEl.textContent = data.phoneNumber || data.phone || "ফোন সেট করা নেই";
                userLocationEl.textContent = data.location || "যুক্ত করা নেই";
                
                if (data.officeAddress && data.officeAddress.trim() !== "") {
                    userOfficeEl.textContent = data.officeAddress;
                    introOfficeItem.style.display = "flex";
                } else {
                    introOfficeItem.style.display = "none";
                }
                
                // প্রোফাইল পিকচার সিঙ্ক (বড় এবং হেডারের ছোট ছবি)
                if(data.profilePic || data.avatarUrl) {
                    let pPic = data.profilePic || data.avatarUrl;
                    if(userAvatar) userAvatar.src = pPic;
                    if(avatarPreview) avatarPreview.src = pPic;
                    if(headerProfilePic) headerProfilePic.src = pPic;
                }

                if (data.ratingCount && data.ratingCount > 0) {
                    let avg = ((data.ratingSum || 0) / data.ratingCount).toFixed(1);
                    myRatingScoreEl.textContent = `⭐ ${avg}`;
                }
                
                // মডাল প্রি-পপুলেট ভ্যালু
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
    
    // ৫. নিজস্ব প্রপার্টি লোড করার ফাংশন
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
            } else {
                document.getElementById('empty-posts-message').style.display = 'none';
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

                let displayPrice = p.price || p.rent || p.monthlyRent || p.amount || 'আলোচনা সাপেক্ষ';

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

    // ৬. বুকমার্ক প্রপার্টি লোড করার সম্পূর্ণ কোড (ডাইনামিক)
    async function loadSavedProperties(userId) {
        if (!savedPropertiesList) return;
        savedPropertiesList.innerHTML = '<p style="text-align:center; width:100%;">বুকমার্ক খোঁজা হচ্ছে...</p>';
        try {
            const favSnapshot = await db.collection('users').doc(userId).collection('bookmarks').get();
            
            savedPropertiesList.innerHTML = '';
            savedPostsCountEl.textContent = favSnapshot.size;

            if (favSnapshot.empty) {
                document.getElementById('empty-saved-message').style.display = 'block';
                return;
            } else {
                document.getElementById('empty-saved-message').style.display = 'none';
            }

            favSnapshot.forEach(async (favDoc) => {
                const propId = favDoc.id;
                const propDoc = await db.collection('properties').doc(propId).get();
                
                if (propDoc.exists) {
                    const p = propDoc.data();
                    const card = document.createElement('div');
                    card.className = 'property-card';
                    card.style.cursor = "pointer";
                    card.onclick = () => showPropertyDetails(propDoc.id, p, true); // True দিয়ে বুকমার্ক বোঝানো হয়েছে
                    
                    let imageUrl = 'https://via.placeholder.com/150?text=No+Image';
                    if (p.images && p.images.length > 0) {
                        imageUrl = p.images[0].url || p.images[0];
                    }

                    let displayPrice = p.price || p.rent || p.monthlyRent || 'আলোচনা সাপেক্ষ';

                    card.innerHTML = `
                        <img src="${imageUrl}" style="width:100%; height:105px; object-fit:cover;">
                        <div style="padding:8px;">
                            <h4 style="margin:0 0 4px 0; font-size:12px; height:32px; overflow:hidden; color:var(--dark); font-weight:600;">${p.title || 'শিরোনামহীন'}</h4>
                            <p style="color:var(--primary); font-weight:bold; margin:0; font-size:12px;">৳ ${displayPrice}</p>
                        </div>
                    `;
                    savedPropertiesList.appendChild(card);
                }
            });
        } catch (error) {
            console.error("Error loading bookmarks: ", error);
        }
    }

    // মডাল কন্ট্রোল ইভেন্ট সমূহ
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

    // ৭. প্রোফাইল এডিট সাবমিট ও রিয়েল-টাইম আপডেট (নো রিফ্রেশ ইউজার এক্সপেরিয়েন্স)
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
                alert('আপনার তথ্য সফলভাবে আপডেট হয়েছে!');
                
                // রিয়েল টাইম ডম আপডেট (রিলোড ছাড়া)
                displayNameEl.textContent = newName;
                userBioEl.textContent = newBio || "আপনার সম্পর্কে কিছু বলুন...";
                userProfessionEl.textContent = newProfession || "যুক্ত করা নেই";
                userPhoneEl.textContent = newPhone;
                userLocationEl.textContent = newLocation || "যুক্ত করা নেই";
                
                if (newOffice && newOffice.trim() !== "") {
                    userOfficeEl.textContent = newOffice;
                    introOfficeItem.style.display = "flex";
                } else {
                    introOfficeItem.style.display = "none";
                }

                if (updateData.profilePic) {
                    userAvatar.src = updateData.profilePic;
                    headerProfilePic.src = updateData.profilePic;
                }

                editModal.style.display = 'none';
                btn.disabled = false;
                btn.textContent = "পরিবর্তন সেভ করুন";
                
            } catch (error) {
                console.error("Update profile error:", error);
                alert('সমস্যা হয়েছে: ' + error.message);
                btn.disabled = false;
                btn.textContent = "আবার চেষ্টা করুন";
            }
        };
    }
});

// ৮. প্রপার্টি ডিটেইলস মডাল ওপেন
function showPropertyDetails(id, data, isBookmark = false) {
    const modal = document.getElementById('propertyModal');
    const contentInner = document.getElementById('modal-content-inner');
    const deleteBtn = document.getElementById('modal-delete-btn');
    
    let imageUrl = 'https://via.placeholder.com/150?text=No+Image';
    if (data.images && data.images.length > 0) {
        imageUrl = data.images[0].url || data.images[0];
    }
    
    contentInner.innerHTML = `
        <img src="${imageUrl}" style="width:100%; border-radius:8px; margin-bottom:12px; height:160px; object-fit:cover;">
        <h2 style="font-size:16px; margin:0 0 8px 0; color:var(--dark); font-weight:bold;">${data.title || 'শিরোনামহীন'}</h2>
        <p style="font-size:13px; color:#555; margin:0 0 6px 0;"><strong>বিবরণ:</strong> ${data.description || 'নেই'}</p>
        <p style="font-size:14px; color:var(--success); font-weight:bold; margin:0;"><strong>মূল্য/ভাড়া:</strong> ৳ ${data.price || data.rent || data.monthlyRent || 'আলোচনা সাপেক্ষ'}</p>
    `;

    // ইউজার যদি বুকমার্ক করা কোনো পোস্টে ক্লিক করে তাহলে রিমুভ বুকমার্ক লজিক কাজ করবে
    if(isBookmark) {
        deleteBtn.textContent = "বুকমার্ক সরান";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            removeBookmark(id);
        };
    } else {
        deleteBtn.textContent = "মুছে ফেলুন";
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deletePost(id);
        };
    }
    
    modal.style.display = 'block';
}

function closePropertyModal() {
    document.getElementById('propertyModal').style.display = 'none';
}

// ৯. নিজের পোস্ট চিরতরে ডিলিট করার সুরক্ষিত কুয়েরি
async function deletePost(id) {
    if(confirm('বিজ্ঞাপনটি চিরতরে মুছে ফেলতে চান?')) {
        try {
            await db.collection('properties').doc(id).delete();
            alert('বিজ্ঞাপনটি সফলভাবে মুছে ফেলা হয়েছে।');
            location.reload();
        } catch (err) {
            alert('সমস্যা হয়েছে: ' + err.message);
        }
    }
}

// ১০. সাব-কালেকশন থেকে বুকমার্ক রিমুভ করার ফাংশন
async function removeBookmark(id) {
    const user = auth.currentUser;
    if(confirm('বুকমার্ক তালিকা থেকে এটি সরাতে চান?')) {
        try {
            await db.collection('users').doc(user.uid).collection('bookmarks').doc(id).delete();
            alert('বুকমার্ক সফলভাবে সরানো হয়েছে।');
            location.reload();
        } catch (err) {
            alert('সমস্যা হয়েছে: ' + err.message);
        }
    }
                    }
