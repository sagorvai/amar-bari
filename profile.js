const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    
    // UI Elements
    const userAvatar = document.getElementById('user-avatar');
    const displayNameEl = document.getElementById('display-name');
    const userEmailEl = document.getElementById('user-email');
    const propertiesList = document.getElementById('my-properties-list');
    const totalPostsEl = document.getElementById('total-posts-count');
    
    const editSection = document.getElementById('edit-profile-section');
    const showEditBtn = document.getElementById('edit-profile-show-btn');
    const hideEditBtn = document.getElementById('edit-profile-hide-btn');

    // ১. ইউজার স্টেট চেক
    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserProfile(user);
            loadUserProperties(user.uid);
        } else {
            window.location.href = 'auth.html';
        }
    });

    // ২. প্রোফাইল ডেটা লোড
    async function loadUserProfile(user) {
        userEmailEl.textContent = user.email;
        const doc = await db.collection('users').doc(user.uid).get();
        
        if (doc.exists) {
            const data = doc.data();
            displayNameEl.textContent = data.fullName || "ইউজার নাম নেই";
            if (data.profilePic) userAvatar.src = data.profilePic;
            if (data.isVerified) {
                document.getElementById('verification-status').textContent = "Verified ✅";
                document.getElementById('verification-status').style.color = "#2ecc71";
            }
        } else {
            displayNameEl.textContent = "নতুন ইউজার";
        }
    }

    // ৩. ইউজারের প্রপার্টি লোড ও কাউন্ট
    async function loadUserProperties(userId) {
        propertiesList.innerHTML = '<p>লোড হচ্ছে...</p>';
        
        try {
            const snapshot = await db.collection('properties')
                .where('userId', '==', userId)
                .get();
            
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
                card.innerHTML = `
                    <img src="${p.images[0]?.url || 'placeholder.jpg'}" alt="Property">
                    <div class="property-info">
                        <h4>${p.title}</h4>
                        <p class="price">৳ ${p.price || p.rent}</p>
                        <span class="status-tag">${p.status || 'Active'}</span>
                        <div style="margin-top:10px; display:flex; gap:5px;">
                            <button onclick="editPost('${doc.id}')" class="edit-btn">এডিট</button>
                            <button onclick="deletePost('${doc.id}')" class="delete-btn">ডিলিট</button>
                        </div>
                    </div>
                `;
                propertiesList.appendChild(card);
            });
        } catch (error) {
            console.error("Error loading properties:", error);
        }
    }

    // ৪. প্রোফাইল আপডেট লজিক
    document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        const newName = document.getElementById('edit-full-name').value;
        const file = document.getElementById('edit-profile-picture').files[0];
        
        let updateData = { fullName: newName };

        if (file) {
            const ref = storage.ref(`profile_pics/${user.uid}`);
            await ref.put(file);
            updateData.profilePic = await ref.getDownloadURL();
        }

        await db.collection('users').doc(user.uid).set(updateData, { merge: true });
        alert('প্রোফাইল আপডেট হয়েছে!');
        location.reload();
    });

    // এডিট সেকশন কন্ট্রোল
    showEditBtn.onclick = () => editSection.style.display = 'block';
    hideEditBtn.onclick = () => editSection.style.display = 'none';
});

// গ্লোবাল ফাংশন (এডিট/ডিলিট এর জন্য)
async function deletePost(id) {
    if(confirm('আপনি কি নিশ্চিত যে এই পোস্টটি ডিলিট করতে চান?')) {
        await firebase.firestore().collection('properties').doc(id).delete();
        location.reload();
    }
        }
