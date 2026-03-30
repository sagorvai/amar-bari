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
    const userEmailEl = document.getElementById('user-email');
    const userAvatar = document.getElementById('user-avatar');
    const propertiesList = document.getElementById('my-properties-list');
    const totalPostsEl = document.getElementById('total-posts-count');
    
    // Edit Modal Elements
    const editModal = document.getElementById('editProfileModal');
    const showEditBtn = document.getElementById('edit-profile-show-btn');
    const closeEditBtn = document.getElementById('edit-profile-close-btn');
    const editForm = document.getElementById('edit-profile-form');
    const avatarPreview = document.getElementById('edit-avatar-preview');
    const fileInput = document.getElementById('edit-profile-picture');

    // ১. ইউজার চেক ও ডেটা লোড
    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserProfile(user);
            loadUserProperties(user.uid);
        } else {
            window.location.href = 'auth.html';
        }
    });

    // ২. প্রোফাইল ডেটা লোড করা
    async function loadUserProfile(user) {
        userEmailEl.textContent = user.email;
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                const fullName = data.fullName || "ইউজার নাম নেই";
                const photoUrl = data.profilePic || 'default-avatar.png';
                
                displayNameEl.textContent = fullName;
                userAvatar.src = photoUrl;
                
                // পপ-আপ ফর্মে আগের তথ্য সেট করা
                document.getElementById('edit-full-name').value = data.fullName || "";
                document.getElementById('edit-phone-number').value = data.phone || "";
                avatarPreview.src = photoUrl; // পপ-আপের ভেতরে প্রিভিউ
            }
        } catch (e) { console.error("Error loading profile:", e); }
    }

    // ৩. প্রপার্টি লিস্ট লোড করা
    async function loadUserProperties(userId) {
        propertiesList.innerHTML = '<p>লোড হচ্ছে...</p>';
        try {
            const snapshot = await db.collection('properties').where('userId', '==', userId).get();
            propertiesList.innerHTML = '';
            totalPostsEl.textContent = snapshot.size;

            if (snapshot.empty) {
                document.getElementById('empty-posts-message').style.display = 'block';
                return;
            }

            snapshot.forEach(doc => {
                const p = doc.data();
                const firstImg = (p.images && p.images.length > 0) ? p.images[0].url : 'placeholder.jpg';
                
                const card = document.createElement('div');
                card.className = 'property-card';
                card.style.cursor = "pointer";
                card.onclick = () => showPropertyDetails(doc.id, p);
                
                card.innerHTML = `
                    <img src="${firstImg}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
                    <h4 style="margin:10px 0 5px 0;">${p.title || 'শিরোনামহীন'}</h4>
                    <p style="color:#2ecc71; font-weight:bold;">৳ ${p.price || p.rent || 'আলোচনা সাপেক্ষ'}</p>
                `;
                propertiesList.appendChild(card);
            });
        } catch (e) { console.error(e); }
    }

    // ৪. প্রোফাইল এডিট পপ-আপ কন্ট্রোল (FIXED)
    if (showEditBtn) showEditBtn.onclick = () => editModal.style.display = 'block';
    if (closeEditBtn) closeEditBtn.onclick = () => editModal.style.display = 'none';
    
    // পপ-আপের বাইরে ক্লিক করলে বন্ধ হবে
    window.onclick = (event) => {
        if (event.target == editModal) {
            editModal.style.display = 'none';
        }
    }

    // ৫. ছবি নির্বাচনের সাথে সাথে প্রিভিউ দেখানো
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (file) {
            // ফাইলের সাইজ চেক (Max 2MB)
            if (file.size > 2 * 1024 * 1024) {
                alert("ছবি ২ এমবি-র কম হতে হবে।");
                this.value = ""; return;
            }
            const reader = new FileReader();
            reader.onload = function(e) {
                avatarPreview.src = e.target.result;
            }
            reader.readAsDataURL(file);
        }
    });

    // ৬. প্রোফাইল আপডেট লজিক (IMAGE FIX WITH PATH)
    editForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('update-profile-btn');
        const user = auth.currentUser;
        const newName = document.getElementById('edit-full-name').value;
        const phone = document.getElementById('edit-phone-number').value;
        const file = fileInput.files[0];
        
        btn.disabled = true;
        btn.textContent = "আপডেট হচ্ছে...";
        
        try {
            let updateData = { 
                fullName: newName, 
                phone: phone,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp() 
            };

            // যদি নতুন ছবি নির্বাচন করা হয়
            if (file) {
                // ফাইলের নাম ইউনিক করার জন্য টাইমস্ট্যাম্প যোগ করা
                const fileExt = file.name.split('.').pop();
                const fileName = `profile_${user.uid}_${Date.now()}.${fileExt}`;
                const storageRef = storage.ref().child(`profile_pics/${user.uid}/${fileName}`);
                
                // ১. স্টোরেজে ছবি আপলোড (path সহ)
                const task = await storageRef.put(file);
                // ২. ছবির ডাউনলোড ইউআরএল নেওয়া
                const downloadURL = await task.ref.getDownloadURL();
                // ৩. ডাটাবেসে ইউআরএল সেভ করা
                updateData.profilePic = downloadURL;
            }

            // ৪. Firestore-এ ডেটা সেভ করা
            await db.collection('users').doc(user.uid).set(updateData, { merge: true });
            
            alert('প্রোফাইল সফলভাবে আপডেট হয়েছে!');
            editModal.style.display = 'none'; // পপ-আপ বন্ধ করা
            location.reload(); // পেজ রিলোড করে নতুন তথ্য দেখানো
            
        } catch (error) {
            console.error("Update error:", error);
            alert('আপডেট করা সম্ভব হয়নি। এরর: ' + error.message);
            btn.disabled = false;
            btn.textContent = "আপডেট সংরক্ষণ করুন";
        }
    };
});

// প্রপার্টি পপ-আপ ফাংশনসমূহ (অপরিবর্তিত)
function showPropertyDetails(id, data) {
    const modal = document.getElementById('propertyModal');
    const contentInner = document.getElementById('modal-content-inner');
    
    contentInner.innerHTML = `
        <img src="${(data.images && data.images[0]) ? data.images[0].url : ''}" style="width:100%; border-radius:8px; margin-bottom:15px; height:200px; object-fit:cover;">
        <h2>${data.title}</h2>
        <p><strong>বিবরণ:</strong> ${data.description || 'নেই'}</p>
        <p><strong>দাম:</strong> ৳ ${data.price || data.rent || 'আলোচনা সাপেক্ষ'}</p>
        <p><strong>অবস্থান:</strong> ${data.location?.district || ''}, ${data.location?.upazila || ''}</p>
    `;

    document.getElementById('modal-delete-btn').onclick = (e) => {
        e.stopPropagation();
        deletePost(id);
    };
    document.getElementById('modal-upgrade-btn').onclick = () => alert('আপগ্রেড ফিচারটি শীঘ্রই আসছে!');
    
    modal.style.display = 'block';
}

function closePropertyModal() {
    document.getElementById('propertyModal').style.display = 'none';
}

async function deletePost(id) {
    if(confirm('পোস্টটি মুছে ফেলতে চান?')) {
        try {
            await db.collection('properties').doc(id).delete();
            location.reload();
        } catch(e) { alert('ডিলিট সম্ভব হয়নি।'); }
    }
                          }
