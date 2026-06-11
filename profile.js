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
    
    // UI Elements[cite: 12]
    const displayNameEl = document.getElementById('display-name');[cite: 12]
    const userEmailEl = document.getElementById('user-email');[cite: 12]
    const userPhoneEl = document.getElementById('user-phone');
    const userAvatar = document.getElementById('user-avatar');[cite: 12]
    const propertiesList = document.getElementById('my-properties-list');[cite: 12]
    const totalPostsEl = document.getElementById('total-posts-count');[cite: 12]
    const myRatingScoreEl = document.getElementById('my-rating-score');
    
    // Edit Modal Elements[cite: 12]
    const editModal = document.getElementById('editProfileModal');[cite: 12]
    const showEditBtn = document.getElementById('edit-profile-show-btn');[cite: 12]
    const closeEditBtn = document.getElementById('edit-profile-close-btn');[cite: 12]
    const editForm = document.getElementById('edit-profile-form');[cite: 12]
    const avatarPreview = document.getElementById('edit-avatar-preview');[cite: 12]
    const fileInput = document.getElementById('edit-profile-picture');[cite: 12]

    // ১. ইউজার স্টেট চেক ও লাইফসাইকেল ট্র্যাকিং[cite: 12]
    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserProfile(user);
            loadUserProperties(user.uid);[cite: 12]
        } else {
            window.location.href = 'auth.html';[cite: 12]
        }
    });

    // ২. প্রোফাইল ডেটা রিড ও রেন্ডারিং[cite: 12]
    async function loadUserProfile(user) {
        userEmailEl.textContent = user.email;[cite: 12]
        try {
            const doc = await db.collection('users').doc(user.uid).get();[cite: 12]
            if (doc.exists) {
                const data = doc.data();[cite: 12]
                displayNameEl.textContent = data.fullName || "ইউজার নাম নেই";[cite: 12]
                if(data.profilePic) {
                    userAvatar.src = data.profilePic;[cite: 12]
                    avatarPreview.src = data.profilePic;[cite: 12]
                }
                
                if (data.phoneNumber) {
                    userPhoneEl.textContent = data.phoneNumber;
                }

                // রেটিং স্কোর ম্যানেজমেন্ট
                if (data.ratingCount && data.ratingCount > 0) {
                    let avg = (data.ratingSum / data.ratingCount).toFixed(1);
                    myRatingScoreEl.textContent = `⭐ ${avg}`;
                } else {
                    myRatingScoreEl.textContent = `⭐ ০.০`;
                }
                
                // এডিট ইনপুট ফিল্ড পপুলেশন[cite: 12]
                document.getElementById('edit-full-name').value = data.fullName || "";[cite: 12]
                document.getElementById('edit-phone-number').value = data.phoneNumber || "";
            }
        } catch (e) { console.error("Error loading profile:", e); }[cite: 12]
    }

    // 🎯 নতুন ডিরেক্ট বাটন ক্লিক ইভেন্ট হ্যান্ডলার
    const directPostBtn = document.getElementById('direct-post-btn');
    if (directPostBtn) {
        directPostBtn.onclick = () => { window.location.href = 'post.html'; };
    }
    
    // ৩. ইউজারের নিজস্ব প্রপার্টি পোস্ট লোড করা[cite: 12]
    async function loadUserProperties(userId) {[cite: 12]
        propertiesList.innerHTML = '<p style="text-align:center; width:100%;">লোড হচ্ছে...</p>';[cite: 12]
        try {
            const snapshot = await db.collection('properties').where('userId', '==', userId).get();[cite: 12]
            propertiesList.innerHTML = '';[cite: 12]
            totalPostsEl.textContent = snapshot.size;[cite: 12]

            if (snapshot.empty) {
                document.getElementById('empty-posts-message').style.display = 'block';[cite: 12]
                return;
            }

            snapshot.forEach(doc => {[cite: 12]
                const p = doc.data();[cite: 12]
                const card = document.createElement('div');[cite: 12]
                card.className = 'property-card';[cite: 12]
                card.style.cursor = "pointer";[cite: 12]
                card.onclick = () => showPropertyDetails(doc.id, p);[cite: 12]
                
                let imageUrl = 'placeholder.jpg';
                if (p.images && p.images.length > 0) {
                    imageUrl = p.images[0].url || p.images[0];
                }

                card.innerHTML = `
                    <img src="${imageUrl}" style="width:100%; height:110px; object-fit:cover;">
                    <div style="padding:8px;">
                        <h4 style="margin:0 0 4px 0; font-size:12px; height:32px; overflow:hidden; color:var(--dark);">${p.title || 'শিরোনামহীন'}</h4>
                        <p style="color:var(--success); font-weight:bold; margin:0; font-size:12px;">৳ ${p.price || p.rent || '০'}</p>
                    </div>
                `;[cite: 12]
                propertiesList.appendChild(card);[cite: 12]
            });
        } catch (e) { console.error("Error properties loading:", e); }[cite: 12]
    }

    // মডাল টগলস[cite: 12]
    if (showEditBtn) showEditBtn.onclick = () => editModal.style.display = 'block';[cite: 12]
    if (closeEditBtn) closeEditBtn.onclick = () => editModal.style.display = 'none';[cite: 12]
    
    // লোকাল ফাইল রিডার ইমেজ প্রিভিউ[cite: 12]
    if (fileInput) {
        fileInput.addEventListener('change', function() {[cite: 12]
            const file = this.files[0];[cite: 12]
            if (file) {
                const reader = new FileReader();[cite: 12]
                reader.onload = (e) => avatarPreview.src = e.target.result;[cite: 12]
                reader.readAsDataURL(file);[cite: 12]
            }
        });
    }

    // ৪. প্রোফাইল ইনফো ক্লাউড ফায়ারস্টোরে আপডেট করা[cite: 12]
    if (editForm) {
        editForm.onsubmit = async (e) => {[cite: 12]
            e.preventDefault();[cite: 12]
            const btn = document.getElementById('update-profile-btn');[cite: 12]
            const user = auth.currentUser;[cite: 12]
            const newName = document.getElementById('edit-full-name').value;[cite: 12]
            const newPhone = document.getElementById('edit-phone-number').value;
            const file = fileInput.files[0];[cite: 12]
            
            btn.disabled = true;[cite: 12]
            btn.textContent = "আপডেট হচ্ছে...";[cite: 12]
            
            try {
                let updateData = { 
                    fullName: newName, 
                    phoneNumber: newPhone,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()[cite: 12]
                };

                if (file) {[cite: 12]
                    const fileName = `avatar_${user.uid}_${Date.now()}`;[cite: 12]
                    const storageRef = storage.ref(`profile_pics/${user.uid}/${fileName}`);[cite: 12]
                    const snapshot = await storageRef.put(file);[cite: 12]
                    const downloadURL = await snapshot.ref.getDownloadURL();[cite: 12]
                    updateData.profilePic = downloadURL;[cite: 12]
                }

                await db.collection('users').doc(user.uid).set(updateData, { merge: true });[cite: 12]
                alert('আপনার ড্যাশবোর্ড সফলভাবে আপডেট হয়েছে!');[cite: 12]
                editModal.style.display = 'none';[cite: 12]
                location.reload();[cite: 12]
                
            } catch (error) {
                console.error("Error updating profile:", error);[cite: 12]
                alert('সমস্যা হয়েছে: ' + error.message);[cite: 12]
                btn.disabled = false;[cite: 12]
                btn.textContent = "আবার চেষ্টা করুন";[cite: 12]
            }
        };
    }
});

// পপ-আপ ডিটেইল উইন্ডো[cite: 12]
function showPropertyDetails(id, data) {
    const modal = document.getElementById('propertyModal');[cite: 12]
    const contentInner = document.getElementById('modal-content-inner');[cite: 12]
    
    let imageUrl = 'placeholder.jpg';
    if (data.images && data.images.length > 0) {
        imageUrl = data.images[0].url || data.images[0];
    }
    
    contentInner.innerHTML = `
        <img src="${imageUrl}" style="width:100%; border-radius:12px; margin-bottom:15px; height:180px; object-fit:cover;">
        <h2 style="font-size:18px; margin:0 0 10px 0; color:var(--dark);">${data.title}</h2>
        <p style="font-size:14px; color:#555;"><strong>বিবরণ:</strong> ${data.description || 'নেই'}</p>
        <p style="font-size:14px; color:var(--success); font-weight:bold;"><strong>মূল্য/ভাড়া:</strong> ৳ ${data.price || data.rent || 'আলোচনা সাপেক্ষ'}</p>
    `;[cite: 12]

    document.getElementById('modal-delete-btn').onclick = (e) => {[cite: 12]
        e.stopPropagation();[cite: 12]
        deletePost(id);[cite: 12]
    };
    modal.style.display = 'block';[cite: 12]
}

function closePropertyModal() {
    document.getElementById('propertyModal').style.display = 'none';[cite: 12]
}

async function deletePost(id) {
    if(confirm('বিজ্ঞাপনটি চিরতরে মুছে ফেলতে চান?')) {[cite: 12]
        await db.collection('properties').doc(id).delete();[cite: 12]
        location.reload();[cite: 12]
    }
        }
