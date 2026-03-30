// ১. তোমার প্রজেক্টের সঠিক কনফিগারেশন (auth.html থেকে নেওয়া)
const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};

// ফায়ারবেস ইনিশিয়ালাইজ (যদি আগে না হয়ে থাকে)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

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

    // ২. ইউজার লগইন আছে কি না চেক করা
    auth.onAuthStateChanged(user => {
        if (user) {
            console.log("Logged in user:", user.uid);
            loadUserProfile(user);
            loadUserProperties(user.uid);
        } else {
            console.log("No user logged in, redirecting...");
            window.location.href = 'auth.html';
        }
    });

    // ৩. প্রোফাইল ডেটা লোড (Users Collection থেকে)
    async function loadUserProfile(user) {
        userEmailEl.textContent = user.email;
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                displayNameEl.textContent = data.fullName || "ইউজার নাম নেই";
                if (data.profilePic) userAvatar.src = data.profilePic;
            } else {
                displayNameEl.textContent = "নতুন ইউজার";
            }
        } catch (error) {
            console.error("Error loading profile:", error);
        }
    }

    // ৪. ইউজারের নিজস্ব প্রপার্টিগুলো লোড করা
    async function loadUserProperties(userId) {
        propertiesList.innerHTML = '<p style="padding:20px;">আপনার পোস্টগুলো খোঁজা হচ্ছে...</p>';
        
        try {
            // Firestore Query: যেখানে userId বর্তমান ইউজারের সমান
            const snapshot = await db.collection('properties')
                .where('userId', '==', userId)
                .get();
            
            propertiesList.innerHTML = ''; // Loading টেক্সট মুছে ফেলা
            totalPostsEl.textContent = snapshot.size;

            if (snapshot.empty) {
                document.getElementById('empty-posts-message').style.display = 'block';
                return;
            }

            snapshot.forEach(doc => {
                const p = doc.data();
                // ইমেজ হ্যান্ডলিং: যদি images অ্যারে থাকে তবে প্রথমটি দেখাবে
                const firstImg = (p.images && p.images.length > 0) ? p.images[0].url : 'placeholder.jpg';
                
                const card = document.createElement('div');
                card.className = 'property-card'; // তোমার style.css এর ক্লাস
                card.innerHTML = `
                    <img src="${firstImg}" alt="Property" style="width:100%; height:180px; object-fit:cover; border-radius:8px;">
                    <div class="property-info" style="padding:10px;">
                        <h4 style="margin:5px 0;">${p.title || 'শিরোনামহীন'}</h4>
                        <p class="price" style="color:#2ecc71; font-weight:bold;">৳ ${p.price || p.rent || 'আলোচনা সাপেক্ষ'}</p>
                        <div style="margin-top:10px; display:flex; gap:10px;">
                            <button onclick="deletePost('${doc.id}')" style="background:#e74c3c; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer;">ডিলিট</button>
                        </div>
                    </div>
                `;
                propertiesList.appendChild(card);
            });
        } catch (error) {
            console.error("Error loading properties:", error);
            propertiesList.innerHTML = '<p style="color:red;">ডেটা লোড করতে সমস্যা হয়েছে। কনসোলে এরর দেখুন।</p>';
        }
    }
});

// ডিলিট ফাংশন
async function deletePost(id) {
    if(confirm('আপনি কি নিশ্চিত যে এই পোস্টটি ডিলিট করতে চান?')) {
        try {
            await firebase.firestore().collection('properties').doc(id).delete();
            alert('পোস্টটি সফলভাবে ডিলিট হয়েছে।');
            location.reload();
        } catch (e) {
            alert('ডিলিট করা সম্ভব হয়নি।');
        }
    }
        }
