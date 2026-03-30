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
    const displayNameEl = document.getElementById('display-name');
    const userEmailEl = document.getElementById('user-email');
    const userAvatar = document.getElementById('user-avatar');
    const propertiesList = document.getElementById('my-properties-list');
    const totalPostsEl = document.getElementById('total-posts-count');
    
    const editSection = document.getElementById('edit-profile-section');
    const showEditBtn = document.getElementById('edit-profile-show-btn');
    const hideEditBtn = document.getElementById('edit-profile-hide-btn');

    // ১. ইউজার চেক
    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserProfile(user);
            loadUserProperties(user.uid);
        } else {
            window.location.href = 'auth.html';
        }
    });

    // ২. প্রোফাইল ডেটা লোড (পিকচার ফিক্স সহ)
    async function loadUserProfile(user) {
        userEmailEl.textContent = user.email;
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                displayNameEl.textContent = data.fullName || "ইউজার নাম নেই";
                // যদি ডাটাবেসে ছবি থাকে তবে তা দেখাবে, নাহলে ডিফল্ট ছবি
                if (data.profilePic) {
                    userAvatar.src = data.profilePic;
                } else {
                    userAvatar.src = 'default-avatar.png'; // তোমার প্রজেক্টের ডিফল্ট ছবির পাথ
                }
                
                // এডিট ফর্মে আগের নাম বসিয়ে রাখা
                document.getElementById('edit-full-name').value = data.fullName || "";
            }
        } catch (e) { console.error("Error loading profile:", e); }
    }

    // ৩. প্রপার্টি লিস্ট লোড
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
                const card = document.createElement('div');
                card.className = 'property-card';
                card.style.cursor = "pointer";
                card.onclick = () => showPropertyDetails(doc.id, p);
                
                card.innerHTML = `
                    <img src="${(p.images && p.images[0]) ? p.images[0].url : 'placeholder.jpg'}" style="width:100%; height:150px; object-fit:cover; border-radius:8px;">
                    <h4 style="margin:10px 0 5px 0;">${p.title || 'শিরোনামহীন'}</h4>
                    <p style="color:#2ecc71; font-weight:bold;">৳ ${p.price || p.rent || '০'}</p>
                `;
                propertiesList.appendChild(card);
            });
        } catch (e) { console.error(e); }
    }

    // ৪. এডিট বাটন কার্যকারিতা (FIXED)
    if (showEditBtn) {
        showEditBtn.onclick = () => {
            editSection.style.display = 'block';
            window.scrollTo({ top: editSection.offsetTop - 100, behavior: 'smooth' });
        };
    }

    if (hideEditBtn) {
        hideEditBtn.onclick = () => {
            editSection.style.display = 'none';
        };
    }

    // ৫. প্রোফাইল আপডেট লজিক
    document.getElementById('edit-profile-form').onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('update-profile-btn');
        const user = auth.currentUser;
        const newName = document.getElementById('edit-full-name').value;
        const file = document.getElementById('edit-profile-picture').files[0];
        
        btn.disabled = true;
        btn.textContent = "আপডেট হচ্ছে...";
        
        try {
            let updateData = { fullName: newName, lastUpdated: firebase.firestore.FieldValue.serverTimestamp() };

            if (file) {
                const ref = storage.ref(`profile_pics/${user.uid}`);
                await ref.put(file);
                updateData.profilePic = await ref.getDownloadURL();
            }

            await db.collection('users').doc(user.uid).set(updateData, { merge: true });
            alert('প্রোফাইল সফলভাবে আপডেট হয়েছে!');
            location.reload();
        } catch (error) {
            console.error("Update error:", error);
            alert('আপডেট করা সম্ভব হয়নি।');
            btn.disabled = false;
            btn.textContent = "আপডেট সংরক্ষণ করুন";
        }
    };
});

// পপ-আপ ফাংশনসমূহ (অপরিবর্তিত)
function showPropertyDetails(id, data) {
    const modal = document.getElementById('propertyModal');
    const content = document.getElementById('modal-content');
    
    content.innerHTML = `
        <img src="${(data.images && data.images[0]) ? data.images[0].url : ''}" style="width:100%; border-radius:8px; margin-bottom:15px;">
        <h2>${data.title}</h2>
        <p><strong>বিবরণ:</strong> ${data.description || 'নেই'}</p>
        <p><strong>ক্যাটাগরি:</strong> ${data.category} (${data.type})</p>
        <p><strong>দাম:</strong> ৳ ${data.price || data.rent}</p>
        <p><strong>অবস্থান:</strong> ${data.location?.district || ''}, ${data.location?.upazila || ''}</p>
    `;

    document.getElementById('modal-delete-btn').onclick = (e) => {
        e.stopPropagation();
        deletePost(id);
    };
    document.getElementById('modal-upgrade-btn').onclick = () => alert('আপগ্রেড ফিচারটি শীঘ্রই আসছে!');
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('propertyModal').style.display = 'none';
}

async function deletePost(id) {
    if(confirm('পোস্টটি মুছে ফেলতে চান?')) {
        await db.collection('properties').doc(id).delete();
        location.reload();
    }
    }
