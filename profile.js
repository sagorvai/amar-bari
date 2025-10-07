// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    
    // --- UI উপাদানগুলো ---
    const userAvatar = document.getElementById('user-avatar');
    const displayNameEl = document.getElementById('display-name');
    const userEmailEl = document.getElementById('user-email');
    const userPhoneEl = document.getElementById('user-phone');
    const propertiesList = document.getElementById('my-properties-list');
    const emptyMessage = document.getElementById('empty-properties-message');

    // ট্যাব নেভিগেশন
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content-item');

    // প্রোফাইল এডিট ফর্ম
    const editProfileForm = document.getElementById('edit-profile-form');
    const editFullNameInput = document.getElementById('edit-full-name');
    const editPhoneNumberInput = document.getElementById('edit-phone-number');
    const editAddressInput = document.getElementById('edit-address');
    const editProfilePictureInput = document.getElementById('edit-profile-picture');
    const updateProfileBtn = document.getElementById('update-profile-btn');

    // নিরাপত্তা
    const sendResetEmailBtn = document.getElementById('send-reset-email-btn');
    const logoutBtn = document.getElementById('logout-btn');


    // --- ১. অথেন্টিকেশন স্টেট এবং ইউজার প্রোফাইল লোড করা ---
    auth.onAuthStateChanged(async user => {
        if (!user) {
            // যদি ইউজার লগইন না করে থাকেন, তবে লগইন পেজে রিডাইরেক্ট করা
            alert('প্রোফাইল দেখতে আপনাকে লগইন করতে হবে।');
            window.location.href = 'auth.html';
            return;
        }

        const userRef = db.collection('users').doc(user.uid);
        let userData = {};

        // ফায়ারস্টোর থেকে অতিরিক্ত প্রোফাইল ডেটা লোড করা
        try {
            const doc = await userRef.get();
            if (doc.exists) {
                userData = doc.data();
            }
        } catch (error) {
            console.error("ফায়ারস্টোর থেকে ডেটা লোড ব্যর্থ:", error);
        }

        // প্রোফাইল হেডার আপডেট করা
        const userDisplayName = user.displayName || userData.fullName || 'নামবিহীন ব্যবহারকারী';
        const userPhotoURL = user.photoURL || userData.photoURL || 'images/default-avatar.png';
        const userPhone = userData.phoneNumber || 'যুক্ত করা হয়নি';
        const userAddress = userData.address || '';

        displayNameEl.textContent = userDisplayName;
        userEmailEl.textContent = `ইমেইল: ${user.email}`;
        userPhoneEl.textContent = `ফোন: ${userPhone}`;
        userAvatar.src = userPhotoURL;

        // প্রোফাইল এডিট ফর্ম প্রিলোড করা
        editFullNameInput.value = userDisplayName === 'নামবিহীন ব্যবহারকারী' ? '' : userDisplayName;
        editPhoneNumberInput.value = userData.phoneNumber || '';
        editAddressInput.value = userData.address || '';
        
        // লগইন/লগআউট স্ট্যাটাস আপডেট (অন্যান্য JS ফাইলের মতো)
        const loginLinkSidebar = document.getElementById('login-link-sidebar'); 
        const postLinkSidebar = document.getElementById('post-link');
        const profileButton = document.getElementById('profileButton');

        if (user) {
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (profileButton) profileButton.style.display = 'inline-block';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout;
            }
        } else {
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            if (profileButton) profileButton.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
        }
        
        // প্রপার্টিজ লোড করা
        fetchMyProperties(user.uid);

    });

    // --- ২. ট্যাব সুইচিং লজিক ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');

            // সব বাটন এবং কন্টেন্ট থেকে active ক্লাস সরানো
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // ক্লিক করা বাটন এবং সংশ্লিষ্ট কন্টেন্টে active ক্লাস যুক্ত করা
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });


    // --- ৩. আমার প্রপার্টিজ ট্যাব লজিক ---
    async function fetchMyProperties(uid) {
        propertiesList.innerHTML = ''; // তালিকা পরিষ্কার করা
        
        try {
            const snapshot = await db.collection('properties').where('uid', '==', uid).get();
            
            if (snapshot.empty) {
                emptyMessage.style.display = 'block';
                return;
            }

            emptyMessage.style.display = 'none';

            snapshot.forEach(doc => {
                const prop = doc.data();
                const propertyId = doc.id;

                const propertyCard = document.createElement('div');
                propertyCard.className = 'property-card';
                propertyCard.innerHTML = `
                    <div class="property-card-details">
                        <h4>${prop.title} (${prop.category === 'বিক্রয়' ? 'বিক্রয়ের জন্য' : 'ভাড়ার জন্য'})</h4>
                        <p>মূল্য: ${prop.price} টাকা | ধরন: ${prop.type} | স্ট্যাটাস: ${prop.status || 'প্রকাশিত'}</p>
                    </div>
                    <div class="property-card-actions">
                        <button class="edit-btn" data-id="${propertyId}">এডিট</button>
                        <button class="delete-btn" data-id="${propertyId}">মুছে ফেলুন</button>
                    </div>
                `;
                propertiesList.appendChild(propertyCard);
            });
            
            // এডিট এবং ডিলিট বাটন লিসেনার সেট করা
            propertiesList.querySelectorAll('.edit-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    // এডিট করার জন্য post.html-এ রিডাইরেক্ট করা হবে প্রপার্টি আইডি সহ
                    window.location.href = `post.html?edit=${id}`; 
                });
            });

            propertiesList.querySelectorAll('.delete-btn').forEach(button => {
                button.addEventListener('click', (e) => {
                    const id = e.target.getAttribute('data-id');
                    handlePropertyDelete(id);
                });
            });

        } catch (error) {
            console.error("আমার প্রপার্টিজ লোড ব্যর্থ:", error);
            propertiesList.innerHTML = '<p style="color: red;">প্রপার্টি লোড করার সময় একটি সমস্যা হয়েছে।</p>';
        }
    }

    async function handlePropertyDelete(id) {
        if (!confirm('আপনি কি নিশ্চিত যে আপনি এই প্রপার্টিটি স্থায়ীভাবে মুছে ফেলতে চান?')) {
            return;
        }

        try {
            await db.collection('properties').doc(id).delete();
            alert('প্রপার্টি সফলভাবে মুছে ফেলা হয়েছে!');
            // তালিকা পুনরায় লোড করা
            fetchMyProperties(auth.currentUser.uid); 
        } catch (error) {
            console.error("প্রপার্টি ডিলিট ব্যর্থ:", error);
            alert('প্রপার্টি ডিলিট করার সময় একটি সমস্যা হয়েছে।');
        }
    }


    // --- ৪. প্রোফাইল এডিট ট্যাব লজিক ---
    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        updateProfileBtn.textContent = 'আপডেট হচ্ছে...';
        updateProfileBtn.disabled = true;

        const fullName = editFullNameInput.value;
        const phoneNumber = editPhoneNumberInput.value;
        const address = editAddressInput.value;
        const file = editProfilePictureInput.files[0];
        let photoURL = user.photoURL;
        
        try {
            // ১. প্রোফাইল ছবি আপলোড (যদি নতুন ছবি দেওয়া হয়)
            if (file) {
                const storageRef = storage.ref(`avatars/${user.uid}/${file.name}`);
                const snapshot = await storageRef.put(file);
                photoURL = await snapshot.ref.getDownloadURL();
            }

            // ২. Firebase Auth প্রোফাইল আপডেট (displayName and photoURL)
            await user.updateProfile({
                displayName: fullName,
                photoURL: photoURL
            });

            // ৩. Firestore-এ অতিরিক্ত তথ্য সেভ করা
            await db.collection('users').doc(user.uid).set({
                fullName: fullName,
                phoneNumber: phoneNumber,
                address: address,
                photoURL: photoURL // নিশ্চিত করা যে Firestore এবং Auth এ একই URL আছে
            }, { merge: true });

            alert('প্রোফাইল সফলভাবে আপডেট করা হয়েছে!');
            // পেজ রিলোড করা অথবা শুধুমাত্র হেডার আপডেট করা
            window.location.reload(); 

        } catch (error) {
            console.error("প্রোফাইল আপডেট ব্যর্থ:", error);
            alert('প্রোফাইল আপডেট ব্যর্থ হয়েছে: ' + error.message);
        } finally {
            updateProfileBtn.textContent = 'আপডেট করুন';
            updateProfileBtn.disabled = false;
        }
    });

    // --- ৫. পাসওয়ার্ড/নিরাপত্তা ট্যাব লজিক ---
    
    // পাসওয়ার্ড রিসেট ইমেইল ফাংশন
    sendResetEmailBtn.addEventListener('click', async () => {
        const user = auth.currentUser;
        if (!user) {
            alert('অনুগ্রহ করে প্রথমে লগইন করুন।');
            return;
        }
        
        sendResetEmailBtn.textContent = 'ইমেইল পাঠানো হচ্ছে...';
        sendResetEmailBtn.disabled = true;
        
        try {
            await auth.sendPasswordResetEmail(user.email);
            alert(`পাসওয়ার্ড রিসেট লিঙ্কটি ${user.email} ঠিকানায় পাঠানো হয়েছে। আপনার ইনবক্স চেক করুন।`);
        } catch (error) {
            console.error("রিসেট ইমেইল ব্যর্থ:", error);
            alert('পাসওয়ার্ড রিসেট ইমেইল পাঠানো ব্যর্থ হয়েছে: ' + error.message);
        } finally {
            sendResetEmailBtn.textContent = 'পাসওয়ার্ড রিসেট ইমেইল পাঠান';
            sendResetEmailBtn.disabled = false;
        }
    });


    // লগআউট হ্যান্ডেলার (auth.js এবং index.js থেকে নেওয়া)
    const handleLogout = async () => {
        try {
            await auth.signOut();
            alert('সফলভাবে লগআউট করা হয়েছে!');
            // লগআউট এর পর হোমপেজে রিডাইরেক্ট
            window.location.href = 'index.html'; 
        } catch (error) {
            console.error("লগআউট ব্যর্থ হয়েছে:", error);
            alert("লগআউট ব্যর্থ হয়েছে।");
        }
    };
    
    // লগআউট বাটন লিসেনার
    logoutBtn.addEventListener('click', handleLogout);

    // --- ৬. সাইডবার কার্যকারিতা (অন্যান্য পেজ থেকে) ---
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

});
