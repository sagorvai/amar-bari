// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// UI উপাদান
const authStatusMessage = document.getElementById('auth-status');
const profilePicDisplay = document.getElementById('profile-pic-display');
const profileNameDisplay = document.getElementById('profile-name-display');
const profileEmailDisplay = document.getElementById('profile-email-display');
const profileUpdateForm = document.getElementById('profile-update-form');
const profileNameInput = document.getElementById('profile-name');
const profilePhoneInput = document.getElementById('profile-phone');
const profileBioInput = document.getElementById('profile-bio');
const profilePicInput = document.getElementById('profile-pic-input');
const updateProfileBtn = document.getElementById('update-profile-btn');
const myPropertiesGrid = document.getElementById('my-properties-grid');
const noPropertiesMessage = document.getElementById('no-properties-message');
const passwordResetBtn = document.getElementById('password-reset-btn');

// সাইডবার লিঙ্ক উপাদান (UI আপডেটের জন্য index.js এর অনুরূপ)
const postLinkSidebar = document.getElementById('post-link');
const loginLinkSidebar = document.getElementById('login-link-sidebar');

// গ্লোবাল ভেরিয়েবল
let currentUser = null;
let profileDataRef = null;

// ===============================================
// ১. ইউজার অথেন্টিকেশন ও রিডাইরেকশন
// ===============================================

auth.onAuthStateChanged(user => {
    if (user) {
        // ইউজার লগইন আছে
        currentUser = user;
        profileDataRef = db.collection('userProfiles').doc(user.uid);
        
        // UI আপডেট: সাইডবার এবং প্রোফাইল হেডার
        if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
        if (loginLinkSidebar) {
            loginLinkSidebar.textContent = 'লগআউট';
            loginLinkSidebar.href = '#';
            loginLinkSidebar.onclick = handleLogout; // লগআউট হ্যান্ডেলার সেট করা
        }
        
        authStatusMessage.textContent = 'স্বাগতম, আপনার প্রোফাইল লোড করা হচ্ছে...';
        
        loadUserProfile(user.uid);
        loadUserProperties(user.uid);

    } else {
        // ইউজার লগইন নেই: লগইন পেইজে রিডাইরেক্ট করা হলো
        authStatusMessage.textContent = 'প্রোফাইল দেখার জন্য আপনাকে অবশ্যই লগইন করতে হবে।';
        authStatusMessage.style.color = '#e74c3c'; // লাল রঙে মেসেজ
        
        alert('প্রোফাইল দেখতে প্রথমে লগইন করুন।');
        window.location.href = 'auth.html';
    }
});

// লগআউট ফাংশন (auth.js এবং index.js এর অনুরূপ)
const handleLogout = async (e) => {
    e.preventDefault();
    try {
        await auth.signOut();
        alert('সফলভাবে লগআউট করা হয়েছে! আপনাকে হোমপেজে নিয়ে যাওয়া হচ্ছে।');
        window.location.href = 'index.html';
    } catch (error) {
        console.error("লগআউট ব্যর্থ হয়েছে:", error);
        alert("লগআউট ব্যর্থ হয়েছে।");
    }
};

// ===============================================
// ২. প্রোফাইল ডেটা লোড ও আপডেট
// ===============================================

// প্রোফাইল ডেটা Firestore থেকে লোড করা
async function loadUserProfile(uid) {
    if (!profileDataRef) return;
    
    try {
        const doc = await profileDataRef.get();
        const profile = doc.exists ? doc.data() : {};

        // হেডার ডিসপ্লে আপডেট
        profileNameDisplay.textContent = profile.name || currentUser.email.split('@')[0];
        profileEmailDisplay.textContent = currentUser.email;
        if (profile.photoURL) profilePicDisplay.src = profile.photoURL;

        // ফর্মে ডেটা পূরণ
        profileNameInput.value = profile.name || '';
        profilePhoneInput.value = profile.phone || '';
        profileBioInput.value = profile.bio || '';

        authStatusMessage.textContent = 'আপনার প্রোফাইল প্রস্তুত।';
        
    } catch (error) {
        console.error("প্রোফাইল লোড ব্যর্থ:", error);
        alert("প্রোফাইল ডেটা লোড করা যায়নি।");
    }
}

// প্রোফাইল আপডেট হ্যান্ডেলার
profileUpdateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser || !profileDataRef) return alert('লগইন নেই।');

    updateProfileBtn.disabled = true;
    updateProfileBtn.textContent = 'আপডেট করা হচ্ছে...';
    
    const newName = profileNameInput.value;
    const newPhone = profilePhoneInput.value;
    const newBio = profileBioInput.value;
    const profilePicFile = profilePicInput.files[0];
    let photoURL = profilePicDisplay.src; // বর্তমান URL ধরে রাখা

    try {
        // ১. ছবি আপলোড (যদি নতুন ছবি নির্বাচন করা হয়)
        if (profilePicFile) {
            const storageRef = storage.ref(`profile_pics/${currentUser.uid}/${profilePicFile.name}`);
            await storageRef.put(profilePicFile);
            photoURL = await storageRef.getDownloadURL();
            
            // Firebase Auth-এ ছবি আপডেট করা
            await currentUser.updateProfile({ photoURL: photoURL });
        }

        // ২. Firestore এবং Auth এ ডেটা আপডেট করা
        await profileDataRef.set({
            name: newName,
            phone: newPhone,
            bio: newBio,
            photoURL: photoURL,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }); // merge: true দিয়ে শুধুমাত্র এই ফিল্ডগুলো আপডেট করা হবে

        // ৩. Firebase Auth-এ নাম আপডেট করা
        await currentUser.updateProfile({ displayName: newName });
        
        // UI আপডেট
        profilePicDisplay.src = photoURL;
        profileNameDisplay.textContent = newName;
        alert('সফলভাবে প্রোফাইল আপডেট করা হয়েছে!');
        
    } catch (error) {
        console.error("প্রোফাইল আপডেট ব্যর্থ:", error);
        alert("প্রোফাইল আপডেট ব্যর্থ হয়েছে: " + error.message);
    } finally {
        updateProfileBtn.disabled = false;
        updateProfileBtn.textContent = 'প্রোফাইল আপডেট করুন';
    }
});

// পাসওয়ার্ড রিসেট
passwordResetBtn.addEventListener('click', async () => {
    if (!currentUser) return alert('লগইন নেই।');
    
    const email = currentUser.email;
    if (confirm(`আপনার ইমেইল (${email}) এ পাসওয়ার্ড রিসেট লিঙ্ক পাঠানো হবে। আপনি কি নিশ্চিত?`)) {
        try {
            await auth.sendPasswordResetEmail(email);
            alert('পাসওয়ার্ড রিসেট লিঙ্ক সফলভাবে আপনার ইমেইলে পাঠানো হয়েছে। দয়া করে আপনার ইনবক্স চেক করুন।');
        } catch (error) {
            console.error("পাসওয়ার্ড রিসেট ব্যর্থ:", error);
            alert("পাসওয়ার্ড রিসেট ইমেইল পাঠানো যায়নি: " + error.message);
        }
    }
});


// ===============================================
// ৩. আমার প্রপার্টিগুলো লোড ও ম্যানেজমেন্ট
// ===============================================

// ইউজার যে প্রপার্টিগুলো পোস্ট করেছেন, তা লোড করা
async function loadUserProperties(uid) {
    myPropertiesGrid.innerHTML = '';
    noPropertiesMessage.style.display = 'none';

    try {
        // 'properties' কালেকশনে 'userId' ফিল্টার করে কোয়েরি করা
        const snapshot = await db.collection('properties')
            .where('userId', '==', uid)
            .orderBy('postedAt', 'desc')
            .get();

        if (snapshot.empty) {
            noPropertiesMessage.style.display = 'block';
            return;
        }

        snapshot.forEach(doc => {
            const property = doc.data();
            const propertyId = doc.id;
            
            // প্রপার্টি কার্ড তৈরি করা
            const card = createPropertyCard(property, propertyId);
            myPropertiesGrid.appendChild(card);
        });

    } catch (error) {
        console.error("ইউজার প্রপার্টি লোড ব্যর্থ:", error);
        myPropertiesGrid.innerHTML = '<p style="color: red;">প্রপার্টি লোড করতে সমস্যা হয়েছে।</p>';
    }
}

// প্রপার্টি কার্ড তৈরি করার ফাংশন (index.js এর অনুরূপ + এডিট/ডিলিট বাটন)
function createPropertyCard(property, id) {
    const card = document.createElement('div');
    card.classList.add('property-card');
    
    // মূল্যকে ফরম্যাট করা
    const formattedPrice = new Intl.NumberFormat('bn-BD', { 
        style: 'currency', 
        currency: 'BDT', 
        minimumFractionDigits: 0 
    }).format(property.price);

    card.innerHTML = `
        <img src="${property.imageUrls ? property.imageUrls[0] : 'https://via.placeholder.com/300x200?text=AmarBari'}" alt="${property.title}" class="property-image">
        <div class="property-info">
            <span class="property-category">${property.category} - ${property.type}</span>
            <h4 class="property-title">${property.title}</h4>
            <p class="property-location"><i class="material-icons">location_on</i> ${property.area}, ${property.district}</p>
            <p class="property-price">${formattedPrice}</p>
            <div class="management-actions">
                <button class="edit-btn" data-id="${id}"><i class="material-icons">edit</i> এডিট</button>
                <button class="delete-btn" data-id="${id}"><i class="material-icons">delete</i> ডিলিট</button>
            </div>
        </div>
    `;

    // এডিট ও ডিলিট লিসেনার যুক্ত করা
    card.querySelector('.delete-btn').addEventListener('click', () => deleteProperty(id, property.imageUrls));
    card.querySelector('.edit-btn').addEventListener('click', () => {
        alert('এডিট ফিচারটি চালু করতে আপনাকে post.js এ কোড যোগ করতে হবে।');
        // window.location.href = `post.html?edit=${id}`; // এডিটিং পেইজে নিয়ে যাওয়ার জন্য
    });

    return card;
}

// প্রপার্টি ডিলিট করার ফাংশন
async function deleteProperty(propertyId, imageUrls) {
    if (!confirm('আপনি কি নিশ্চিত যে এই প্রপার্টিটি ডিলিট করতে চান? এই প্রক্রিয়াটি অপরিবর্তনীয়।')) {
        return;
    }

    try {
        // ১. Firestore থেকে ডকুমেন্ট ডিলিট করা
        await db.collection('properties').doc(propertyId).delete();
        
        // ২. Storage থেকে ছবিগুলো ডিলিট করা
        if (imageUrls && imageUrls.length > 0) {
            for (const url of imageUrls) {
                const imageRef = storage.refFromURL(url);
                try {
                    await imageRef.delete();
                } catch (e) {
                    console.warn(`ছবি ডিলিট ব্যর্থ: ${url}`, e);
                    // ছবি না থাকলে বা ডিলিট করতে না পারলে এড়িয়ে যাওয়া
                }
            }
        }
        
        alert('সফলভাবে প্রপার্টি ডিলিট করা হয়েছে!');
        // UI থেকে কার্ডটি সরিয়ে দেওয়া
        document.querySelector(`.delete-btn[data-id="${propertyId}"]`).closest('.property-card').remove();
        
    } catch (error) {
        console.error("ডিলিট ব্যর্থ:", error);
        alert("প্রপার্টি ডিলিট ব্যর্থ হয়েছে: " + error.message);
    }
}


// ===============================================
// ৪. ট্যাব কার্যকারিতা
// ===============================================
document.querySelectorAll('.tab-navigation .tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
        const targetTab = e.target.getAttribute('data-tab');

        // সব বাটন থেকে 'active' ক্লাস সরানো
        document.querySelectorAll('.tab-navigation .tab-button').forEach(btn => {
            btn.classList.remove('active');
        });

        // সব কন্টেন্ট থেকে 'active' ক্লাস সরানো
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // বর্তমান বাটনে 'active' ক্লাস যুক্ত করা
        e.target.classList.add('active');

        // টার্গেট কন্টেন্টে 'active' ক্লাস যুক্ত করা
        document.getElementById(targetTab).classList.add('active');
    });
});
