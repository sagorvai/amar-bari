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

// ⚡ ম্যাজিক ফাংশন: ক্যানভাস (Canvas API) দিয়ে প্রোফাইল/লোগো ছবি কম্প্রেস করা
const compressImage = (file, maxWidth = 500, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) return resolve(file);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) return reject(new Error('ইমেজ কম্প্রেস করতে সমস্যা হয়েছে।'));
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

// গ্লোবাল স্টেট
let currentUserData = null;
let companyData = null;
let isCompanyMode = false;

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
    
    // Modals
    const editModal = document.getElementById('editProfileModal');
    const showEditBtn = document.getElementById('edit-profile-show-btn');
    const closeEditBtn = document.getElementById('edit-profile-close-btn');
    const editForm = document.getElementById('edit-profile-form');
    const avatarPreview = document.getElementById('edit-avatar-preview');
    const fileInput = document.getElementById('edit-profile-picture');

    // Company Modal Elements
    const companyModal = document.getElementById('createCompanyModal');
    const closeCompanyBtn = document.getElementById('close-company-modal-btn');
    const companyForm = document.getElementById('create-company-form');
    const companyLogoInput = document.getElementById('company-logo-file');
    const companyLogoPreview = document.getElementById('company-logo-preview');

    // ১. অথেনটিকেশন চেক ও ডাটা লোড
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            if(userEmailEl) userEmailEl.textContent = user.email;
            
            if (headerProfileImg) {
                if (user.photoURL) headerProfileImg.src = user.photoURL;
                else headerProfileImg.src = 'https://www.w3schools.com/howto/img_avatar.png';
            }

            try {
                await loadUserProfile(user);
            } catch (err) {
                console.error("Profile load error:", err);
            }
            
            try {
                await loadSavedProperties(user.uid);
            } catch (err) {
                console.error("Saved properties load error:", err);
            }
            
        } else {
            window.location.href = 'auth.html';
        }
    });

    // ২. প্রোফাইল ডাটাবেজ ও কোম্পানি ডাটা লোড করা
    async function loadUserProfile(user) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                currentUserData = doc.data();
                currentUserData.uid = user.uid;
                
                // চেক করব ইউজার কোনো কোম্পানি পেজ তৈরি করেছে কিনা
                const compDoc = await db.collection('companies').doc(user.uid).get();
                if (compDoc.exists) {
                    companyData = compDoc.data();
                }

                // ভিউ রেন্ডার করা (পার্সোনাল নাকি কোম্পানি)
                renderProfileView();
            }
        } catch (e) { 
            console.error("Firestore fetch error:", e);
        }
    }

    // 🏢 ৩. ভিউ রেন্ডার লজিক (সুইচ অনুসারে ইন্টারফেস পরিবর্তন)
    window.renderProfileView = function() {
        renderCompanyWidget();

        if (isCompanyMode && companyData) {
            // --- কোম্পানি পেজ অ্যাক্টিভ ---
            if(displayNameEl) displayNameEl.textContent = companyData.name;
            if(userBioEl) userBioEl.textContent = companyData.bio || "আবাসন ও ডেভেলপার প্রতিষ্ঠান";
            if(userAvatar) userAvatar.src = companyData.logo || 'https://via.placeholder.com/150';
            
            if(userProfessionEl) userProfessionEl.textContent = "আবাসন কোম্পানি";
            if(userPhoneEl) userPhoneEl.textContent = companyData.phone || "ফোন সেট করা নেই";
            if(userLocationEl) userLocationEl.textContent = companyData.officeAddress || "যুক্ত করা নেই";
            
            if (companyData.officeAddress) {
                if(userOfficeEl) userOfficeEl.textContent = companyData.officeAddress;
                if(introOfficeItem) introOfficeItem.style.display = "flex";
            }

            if(document.getElementById('my-posts-tab-btn')) {
                document.getElementById('my-posts-tab-btn').textContent = "কোম্পানির পোস্ট সমূহ";
            }

            // কোম্পানির পোস্ট লোড
            loadCompanyProperties(companyData.companyId);

        } else {
            // --- পার্সোনাল প্রোফাইল অ্যাক্টিভ ---
            if(displayNameEl) displayNameEl.textContent = currentUserData.fullName || currentUserData.name || "ইউজার প্রোফাইল";
            if(userBioEl) userBioEl.textContent = currentUserData.bio || "আপনার সম্পর্কে কিছু বলুন...";
            if(userProfessionEl) userProfessionEl.textContent = currentUserData.profession || "যুক্ত করা নেই";
            if(userPhoneEl) userPhoneEl.textContent = currentUserData.phoneNumber || currentUserData.phone || "ফোন সেট করা নেই";
            if(userLocationEl) userLocationEl.textContent = currentUserData.location || "যুক্ত করা নেই";
            
            if (currentUserData.officeAddress && currentUserData.officeAddress.trim() !== "") {
                if(userOfficeEl) userOfficeEl.textContent = currentUserData.officeAddress;
                if(introOfficeItem) introOfficeItem.style.display = "flex";
            } else {
                if(introOfficeItem) introOfficeItem.style.display = "none";
            }
            
            if(currentUserData.profilePic || currentUserData.avatarUrl) {
                let pPic = currentUserData.profilePic || currentUserData.avatarUrl;
                if(userAvatar) userAvatar.src = pPic;
                if(avatarPreview) avatarPreview.src = pPic;
            }

            if (currentUserData.ratingCount && currentUserData.ratingCount > 0 && myRatingScoreEl) {
                let avg = ((currentUserData.ratingSum || 0) / currentUserData.ratingCount).toFixed(1);
                myRatingScoreEl.textContent = `⭐ ${avg}`;
            }

            if(document.getElementById('my-posts-tab-btn')) {
                document.getElementById('my-posts-tab-btn').textContent = "আমার পোস্ট সমূহ";
            }

            // পার্সোনাল পোস্ট লোড
            loadUserProperties(currentUserData.uid);
            
            // এডিট ফর্ম ফিল
            if(document.getElementById('edit-full-name')) document.getElementById('edit-full-name').value = currentUserData.fullName || currentUserData.name || "";
            if(document.getElementById('edit-bio')) document.getElementById('edit-bio').value = currentUserData.bio || "";
            if(document.getElementById('edit-profession')) document.getElementById('edit-profession').value = currentUserData.profession || "";
            if(document.getElementById('edit-phone-number')) document.getElementById('edit-phone-number').value = currentUserData.phoneNumber || currentUserData.phone || "";
            if(document.getElementById('edit-location')) document.getElementById('edit-location').value = currentUserData.location || "";
            if(document.getElementById('edit-office')) document.getElementById('edit-office').value = currentUserData.officeAddress || "";
        }
    }

    // 🏢 ৪. কোম্পানি সুইচ কার্ড রেন্ডার (পরিচিতির উপরে)
    function renderCompanyWidget() {
        const widgetEl = document.getElementById('company-widget-content');
        if (!widgetEl) return;

        if (companyData) {
            if (!isCompanyMode) {
                // পার্সোনালে আছে -> কোম্পানি পেজে সুইচ করার অপশন
                widgetEl.innerHTML = `
                    <div class="company-item-box" onclick="switchMode(true)">
                        <div class="company-left">
                            <img src="${companyData.logo || 'https://via.placeholder.com/50'}" class="company-logo-img">
                            <div>
                                <div class="company-title">${companyData.name} <span class="badge-company">কোম্পানি</span></div>
                                <small style="color: var(--gray); font-size:12px;">ক্লিক করে কোম্পানি পেজে সুইচ করুন</small>
                            </div>
                        </div>
                        <i class="material-icons" style="color: var(--gray);">arrow_forward_ios</i>
                    </div>
                `;
            } else {
                // কোম্পানি মোডে আছে -> পার্সোনালে ফেরত যাওয়ার অপশন
                widgetEl.innerHTML = `
                    <button class="btn-switch-back" onclick="switchMode(false)">
                        <i class="material-icons">published_with_changes</i> পার্সোনাল প্রোফাইলে সুইচ করুন (${currentUserData ? (currentUserData.fullName || currentUserData.name) : 'ইউজার'})
                    </button>
                `;
            }
        } else {
            // পেজ নেই -> তৈরি করার বাটন
            widgetEl.innerHTML = `
                <button class="btn-create-company" onclick="openCompanyModal()">
                    <i class="material-icons">add_business</i> আবাসন ও ডেভেলপার পেজ তৈরি করুন
                </button>
            `;
        }
    }

    window.switchMode = function(toCompany) {
        isCompanyMode = toCompany;
        renderProfileView();
    };

    window.openCompanyModal = function() {
        if (companyModal) companyModal.style.display = 'block';
    };

    if (closeCompanyBtn) closeCompanyBtn.onclick = () => companyModal.style.display = 'none';

    if (companyLogoInput) {
        companyLogoInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file && companyLogoPreview) {
                const reader = new FileReader();
                reader.onload = (e) => companyLogoPreview.src = e.target.result;
                reader.readAsDataURL(file);
            }
        });
    }

    // 🏢 ৫. নতুন কোম্পানি পেজ সেভ করা
    if (companyForm) {
        companyForm.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('save-company-btn');
            const user = auth.currentUser;
            if (!user) return;

            const name = document.getElementById('comp-name').value;
            const bio = document.getElementById('comp-bio').value;
            const office = document.getElementById('comp-office').value;
            const phone = document.getElementById('comp-phone').value;
            const logoFile = companyLogoInput.files[0];

            if (btn) {
                btn.disabled = true;
                btn.textContent = "পেজ তৈরি হচ্ছে...";
            }

            try {
                let logoUrl = 'https://via.placeholder.com/150?text=Company+Logo';

                if (logoFile) {
                    const compressedLogo = await compressImage(logoFile, 400, 0.8);
                    const fileName = `comp_logo_${user.uid}_${Date.now()}`;
                    const storageRef = storage.ref(`company_logos/${user.uid}/${fileName}`);
                    const snapshot = await storageRef.put(compressedLogo);
                    logoUrl = await snapshot.ref.getDownloadURL();
                }

                const newCompData = {
                    companyId: "comp_" + user.uid,
                    ownerUid: user.uid,
                    name: name,
                    bio: bio,
                    officeAddress: office,
                    phone: phone,
                    logo: logoUrl,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                await db.collection('companies').doc(user.uid).set(newCompData);
                companyData = newCompData;
                
                alert("আপনার আবাসন কোম্পানি পেজটি সফলভাবে তৈরি হয়েছে!");
                if (companyModal) companyModal.style.display = 'none';
                
                // কোম্পানি মোডে সুইচ করা
                switchMode(true);

            } catch (err) {
                console.error("Company creation error:", err);
                alert("কোম্পানি পেজ তৈরি করতে সমস্যা হয়েছে: " + err.message);
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = "আবার চেষ্টা করুন";
                }
            }
        };
    }

    const directPostBtn = document.getElementById('direct-post-btn');
    if (directPostBtn) {
        directPostBtn.onclick = () => { window.location.href = 'post.html'; };
    }
    
    // ৬. পার্সোনাল প্রপার্টি লোড
    async function loadUserProperties(userId) {
        if(!propertiesList) return;
        propertiesList.innerHTML = '<p style="text-align:center; width:100%;">খোঁজা হচ্ছে...</p>';
        try {
            let snapshot = await db.collection('properties')
                .where('userId', '==', userId)
                .where('companyId', '==', null)
                .get();

            if (snapshot.empty) {
                snapshot = await db.collection('properties')
                    .where('uid', '==', userId)
                    .where('companyId', '==', null)
                    .get();
            }

            renderPropertiesGrid(snapshot);
        } catch (e) { 
            console.error("Properties list fetch error:", e);
        }
    }

    // 🏢 ৭. কোম্পানির প্রপার্টি লোড
    async function loadCompanyProperties(companyId) {
        if(!propertiesList) return;
        propertiesList.innerHTML = '<p style="text-align:center; width:100%;">কোম্পানির পোস্ট খোঁজা হচ্ছে...</p>';
        try {
            let snapshot = await db.collection('properties')
                .where('companyId', '==', companyId)
                .get();

            renderPropertiesGrid(snapshot);
        } catch (e) {
            console.error("Company properties fetch error:", e);
        }
    }

    // কমন গ্রিড রেন্ডারার
    function renderPropertiesGrid(snapshot) {
        propertiesList.innerHTML = '';
        if(totalPostsEl) totalPostsEl.textContent = snapshot.size;

        if (snapshot.empty) {
            if(document.getElementById('empty-posts-message')) document.getElementById('empty-posts-message').style.display = 'block';
            return;
        } else {
            if(document.getElementById('empty-posts-message')) document.getElementById('empty-posts-message').style.display = 'none';
        }

        snapshot.forEach(doc => {
            const p = doc.data();
            const card = document.createElement('div');
            card.className = 'property-card';
            card.style.cursor = "pointer";
            
            card.onclick = () => {
                window.location.href = `details.html?id=${doc.id}`;
            };
            
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

    // ৮. প্রোফাইল এডিট সাবমিট লজিক
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
                btn.textContent = "ছবি সাইজ অপ্টিমাইজ ও আপডেট হচ্ছে...";
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
                    const compressedFile = await compressImage(file, 500, 0.7);
                    const fileName = `avatar_${user.uid}_${Date.now()}`;
                    const storageRef = storage.ref(`profile_pics/${user.uid}/${fileName}`);
                    const snapshot = await storageRef.put(compressedFile);
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

// ৯. বুকমার্ক প্রপার্টি লোড করা
async function loadSavedProperties(userId) {
    const savedListEl = document.getElementById('saved-posts');
    const savedCountEl = document.getElementById('saved-posts-count');
    if (!savedListEl) return;

    savedListEl.innerHTML = '<p style="text-align:center; padding:20px;">বুকমার্ক খোঁজা হচ্ছে...</p>';

    try {
        const savedSnapshot = await db.collection('saves').where('userId', '==', userId).get();
        if(savedCountEl) savedCountEl.textContent = savedSnapshot.size;

        if (savedSnapshot.empty) {
            savedListEl.innerHTML = '<p style="text-align:center; padding: 30px; color: var(--gray);">বুকমার্ক তালিকায় কোনো আইটেম নেই।</p>';
            return;
        }

        savedListEl.innerHTML = '<div id="saved-properties-grid" class="property-grid"></div>';
        const savedGrid = document.getElementById('saved-properties-grid');

        for (const saveDoc of savedSnapshot.docs) {
            const saveData = saveDoc.data();
            const postId = saveData.postId;

            if (!postId) continue;

            const postDoc = await db.collection('properties').doc(postId).get();
            if (postDoc.exists) {
                const p = postDoc.data();
                const card = document.createElement('div');
                card.className = 'property-card';
                card.style.cursor = "pointer";
                card.onclick = () => {
                    window.location.href = `details.html?id=${postDoc.id}`;
                };

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
                savedGrid.appendChild(card);
            }
        }
    } catch (error) {
        console.error("Saved properties error:", error);
        savedListEl.innerHTML = '<p style="text-align:center; color:red; padding:20px;">বুকমার্ক লোড করতে সমস্যা হয়েছে।</p>';
    }
                }
