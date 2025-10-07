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
    const logoutBtn = document.getElementById('logout-btn');


    // --- ১. অথেন্টিকেশন স্টেট এবং ইউজার প্রোফাইল লোড করা ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // ইউজার লগইন আছে
            loadUserProfile(user);
            fetchUserProperties(user.uid); // ব্যবহারকারীর পোস্ট লোড করুন
        } else {
            // ইউজার লগইন নেই, লগইন পেজে পাঠান
            window.location.href = 'auth.html';
        }
        
        // হেডার UI আপডেট করুন (যদি প্রয়োজন হয়)
        const postLink = document.getElementById('post-link');
        if (postLink) postLink.style.display = user ? 'flex' : 'none';
    });

    // প্রোফাইল তথ্য লোড করার ফাংশন
    function loadUserProfile(user) {
        // ফায়ারস্টোর থেকে প্রোফাইল তথ্য লোড করুন
        db.collection('users').doc(user.uid).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                displayNameEl.textContent = data.fullName || user.email;
                userEmailEl.textContent = user.email;
                userPhoneEl.textContent = data.phoneNumber || '(নেই)';
                
                // ফর্ম পূরণ করুন
                editFullNameInput.value = data.fullName || '';
                editPhoneNumberInput.value = data.phoneNumber || '';
                editAddressInput.value = data.address || '';

                if (data.profilePictureUrl) {
                    userAvatar.src = data.profilePictureUrl;
                }
            } else {
                displayNameEl.textContent = 'নতুন ব্যবহারকারী';
                userEmailEl.textContent = user.email;
            }
        }).catch(error => {
            console.error("প্রোফাইল লোড ব্যর্থ:", error);
        });
    }


    // --- ২. ব্যবহারকারীর পোস্ট লোড করা ---
    async function fetchUserProperties(userId) {
        propertiesList.innerHTML = '<p class="loading-message">পোস্ট লোড হচ্ছে...</p>';
        emptyMessage.style.display = 'none';

        try {
            // 'ownerId' ফিল্ড দিয়ে প্রপার্টি ফিল্টার করা
            const snapshot = await db.collection('properties')
                .where('ownerId', '==', userId)
                .orderBy('timestamp', 'desc')
                .get();

            propertiesList.innerHTML = ''; // লোডিং মেসেজ সরান
            
            if (snapshot.empty) {
                emptyMessage.style.display = 'block';
                propertiesList.style.display = 'none';
                return;
            }
            
            propertiesList.style.display = 'grid'; // গ্রিড মোড সেট করা
            
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
                <p class="price">${property.price}</p>
                <p class="location"><i class="material-icons">location_on</i> ${property.location}</p>
                <div class="details">
                    <span><i class="material-icons">king_bed</i> ${property.rooms} বেড</span>
                    <span><i class="material-icons">bathtub</i> ${property.baths} বাথ</span>
                    <span><i class="material-icons">square_foot</i> ${property.size}</span>
                </div>
            </div>
        `;
        return card;
    }


    // --- ৩. প্রোফাইল এডিট ফর্ম দৃশ্যমান/লুকানো ---
    editProfileShowBtn.addEventListener('click', () => {
        editProfileSection.style.display = 'block';
        editProfileShowBtn.style.display = 'none'; // সম্পাদনা বাটন লুকানো
    });
    
    editProfileHideBtn.addEventListener('click', () => {
        editProfileSection.style.display = 'none';
        editProfileShowBtn.style.display = 'inline-block'; // সম্পাদনা বাটন দেখানো
    });


    // --- ৪. প্রোফাইল এডিট হ্যান্ডেলার ---
    editProfileForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        // ... (আপনার আপডেট প্রোফাইল লজিক এখানে যুক্ত করুন)
        alert("প্রোফাইল আপডেট লজিক এখনও লেখা হয়নি।");
    });


    // --- ৫. লগআউট হ্যান্ডেলার ---
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

    // --- ৬. সাইডবার কার্যকারিতা ---
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
