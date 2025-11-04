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

    // প্রোফাইল এডিট ফর্ম এবং বাটন
    const editProfileSection = document.getElementById('edit-profile-section');
    const editProfileShowBtn = document.getElementById('edit-profile-show-btn');
    const editProfileHideBtn = document.getElementById('edit-profile-hide-btn');
    const editProfileForm = document.getElementById('edit-profile-form');
    const editFullNameInput = document.getElementById('edit-full-name');
    const editPhoneNumberInput = document.getElementById('edit-phone-number');
    const editAddressInput = document.getElementById('edit-address');
    const editProfilePictureInput = document.getElementById('edit-profile-picture');
    const updateProfileBtn = document.getElementById('update-profile-btn');
    
    // --- ১. অথেন্টিকেশন স্টেট এবং ইউজার প্রোফাইল লোড করা ---
    auth.onAuthStateChanged(user => {
        // হেডার UI আপডেট করুন
        const loginLinkSidebar = document.getElementById('login-link-sidebar');
        
        if (user) {
            // ইউজার লগইন আছে
            loadUserProfile(user);
            fetchUserProperties(user.uid); 
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout; 
            }
        } else {
            // ইউজার লগইন নেই, লগইন পেজে পাঠান
            window.location.href = 'auth.html';
        }
    });

    // প্রোফাইল তথ্য লোড করার ফাংশন
    function loadUserProfile(user) {
        // ফায়ারস্টোর থেকে প্রোফাইল তথ্য লোড করুন
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                displayNameEl.textContent = data.fullName || user.email;
                // userPhoneEl.textContent আপডেট করার জন্য HTML এ <span class="data-placeholder"> যোগ করা হয়েছে
                const phoneSpan = userPhoneEl.querySelector('.data-placeholder');
                if (phoneSpan) {
                     phoneSpan.textContent = data.phoneNumber || 'যোগ করা হয়নি';
                }

                userEmailEl.textContent = user.email;
                
                // ফর্ম পূরণ করুন
                editFullNameInput.value = data.fullName || '';
                editPhoneNumberInput.value = data.phoneNumber || '';
                editAddressInput.value = data.address || '';

                if (data.profilePictureUrl) {
                    userAvatar.src = data.profilePictureUrl;
                    // ✅ index.js এর জন্য হেডার প্রোফাইল ইমেজ সেট করা
                    const headerProfileImage = document.getElementById('profileImage');
                    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
                    if (headerProfileImage && defaultProfileIcon) {
                        headerProfileImage.src = data.profilePictureUrl;
                        headerProfileImage.style.display = 'block';
                        defaultProfileIcon.style.display = 'none';
                    }
                }
            } else {
                displayNameEl.textContent = 'নতুন ব্যবহারকারী';
                userEmailEl.textContent = user.email;
            }
        }).catch(error => {
            console.error("প্রোফাইল লোড ব্যর্থ:", error);
        });
    }

    // লগআউট হ্যান্ডেলার
    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            alert('সফলভাবে লগআউট করা হয়েছে!');
            window.location.href = 'index.html';
        } catch (error) {
            console.error("লগআউট ব্যর্থ হয়েছে:", error);
            alert("লগআউট ব্যর্থ হয়েছে।");
        }
    };


    // --- ২. ব্যবহারকারীর পোস্ট লোড করা ---
    async function fetchUserProperties(userId) {
        propertiesList.innerHTML = '<p class="loading-message">পোস্ট লোড হচ্ছে...</p>';
        emptyMessage.style.display = 'none';

        try {
            // 'ownerId' ফিল্ড দিয়ে প্রপার্টি ফিল্টার করা
            const snapshot = await db.collection('properties')
                .where('userId', '==', userId) 
                .orderBy('timestamp', 'desc')
                .get();

            propertiesList.innerHTML = ''; 
            
            if (snapshot.empty) {
                emptyMessage.style.display = 'block';
                propertiesList.style.display = 'none';
                return;
            }
            
            propertiesList.style.display = 'grid'; 
            
            snapshot.forEach(doc => {
                const property = { id: doc.id, ...doc.data() };
                const card = createPropertyCard(property);
                propertiesList.appendChild(card);
            });

        } catch (error) {
            console.error("ব্যবহারকারীর পোস্ট লোড ব্যর্থ:", error);
            propertiesList.innerHTML = '<p class="no-results-message" style="color: #e74c3c;">পোস্ট লোড করার সময় সমস্যা হয়েছে।</p>';
        }
    }

    // প্রপার্টি কার্ড তৈরির ফাংশন (index.js থেকে নেওয়া)
    function createPropertyCard(property) {
        const card = document.createElement('a');
        card.href = 'property-details.html?id=' + property.id; 
        card.classList.add('property-card');
        
        card.innerHTML = `
            <div class="property-image" style="background-image: url('${property.images[0] || 'https://via.placeholder.com/400x300?text=ছবি+নেই'}');"></div>
            <div class="property-info">
                <div class="category-tag ${property.category === 'বিক্রয়' ? 'sell' : 'rent'}">${property.category}</div>
                <h3>${property.title}</h3>
                <p class="price">${property.price || property.rentAmount || 'দাম/ভাড়া উল্লেখ নেই'}</p>
                <p class="location"><i class="material-icons">location_on</i> ${property.location.upazila || property.location.district || 'অজানা এলাকা'}</p>
                <div class="details">
                    ${property.rooms ? `<span><i class="material-icons">king_bed</i> ${property.rooms} বেড</span>` : ''}
                    ${property.bathrooms ? `<span><i class="material-icons">bathtub</i> ${property.bathrooms} বাথ</span>` : ''}
                    ${property.landSize ? `<span><i class="material-icons">square_foot</i> ${property.landSize}</span>` : ''}
                </div>
            </div>
        `;
        return card;
    }


    // --- ৩. প্রোফাইল এডিট ফর্ম দৃশ্যমান/লুকানো ---
    editProfileShowBtn.addEventListener('click', () => {
        editProfileSection.style.display = 'block';
        editProfileShowBtn.style.display = 'none'; 
    });
    
    editProfileHideBtn.addEventListener('click', () => {
        editProfileSection.style.display = 'none';
        editProfileShowBtn.style.display = 'inline-block'; 
    });


    // --- ৪. প্রোফাইল এডিট হ্যান্ডেলার (সম্পূর্ণ লজিক যুক্ত করা হলো) ---
    editProfileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const user = auth.currentUser;
        if (!user) {
            alert("অনুগ্রহ করে লগইন করুন।");
            return;
        }

        updateProfileBtn.disabled = true;
        updateProfileBtn.textContent = 'আপডেট হচ্ছে...';

        try {
            const fullName = editFullNameInput.value.trim();
            const phoneNumber = editPhoneNumberInput.value.trim();
            const address = editAddressInput.value.trim();
            const profilePictureFile = editProfilePictureInput.files[0];
            let profilePictureUrl = userAvatar.src; 

            // ১. প্রোফাইল ছবি আপলোড
            if (profilePictureFile) {
                const storageRef = storage.ref(`profile_pictures/${user.uid}/${profilePictureFile.name}`);
                const snapshot = await storageRef.put(profilePictureFile);
                profilePictureUrl = await snapshot.ref.getDownloadURL();
            }

            // ২. ফায়ারস্টোর (Firestore) এ ইউজার ডেটা আপডেট
            const userData = {
                fullName: fullName,
                phoneNumber: phoneNumber,
                address: address,
                profilePictureUrl: profilePictureUrl
            };

            // merge: true ব্যবহার করা হয়েছে যাতে শুধুমাত্র পরিবর্তিত ফিল্ডগুলো আপডেট হয়
            await db.collection('users').doc(user.uid).set(userData, { merge: true });

            // ৩. Firebase Auth প্রোফাইল আপডেট (যদি নাম পরিবর্তন হয়)
            if (user.displayName !== fullName && fullName) {
                await user.updateProfile({ displayName: fullName });
            }

            // ৪. UI আপডেট
            displayNameEl.textContent = fullName || user.email;
            const phoneSpan = userPhoneEl.querySelector('.data-placeholder');
            if (phoneSpan) {
                phoneSpan.textContent = phoneNumber || 'যোগ করা হয়নি';
            }
            userAvatar.src = profilePictureUrl;
            
            // ✅ হেডার প্রোফাইল ইমেজ আপডেট
            const headerProfileImage = document.getElementById('profileImage');
            const defaultProfileIcon = document.getElementById('defaultProfileIcon');
            if (headerProfileImage && defaultProfileIcon) {
                headerProfileImage.src = profilePictureUrl;
                headerProfileImage.style.display = 'block';
                defaultProfileIcon.style.display = 'none';
            }
            
            // ৫. ফর্ম লুকানো
            editProfileSection.style.display = 'none';
            editProfileShowBtn.style.display = 'inline-block';

            alert("প্রোফাইল সফলভাবে আপডেট করা হয়েছে!");
            
        } catch (error) {
            console.error("প্রোফাইল আপডেট ব্যর্থ:", error);
            alert("প্রোফাইল আপডেট ব্যর্থ হয়েছে: " + error.message);
        } finally {
            updateProfileBtn.disabled = false;
            updateProfileBtn.textContent = 'আপডেট সংরক্ষণ করুন';
        }
    });


    // --- ৫. প্রোফাইল বাটন কার্যকারিতা (হেডার আইকন) - সরিয়ে দেওয়া হয়েছে

    // --- ৬. সাইডবার কার্যকারিতা - সরিয়ে দেওয়া হয়েছে
    
});
