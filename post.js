// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    // আপনার কোডে submitBtn এভাবে সংজ্ঞায়িত ছিল:
    const submitBtn = document.querySelector('#property-form button[type="submit"]');


    // =====================================
    // ১. ডায়নামিক ইনপুট ফিল্ড তৈরি
    // =====================================
    
    if (postCategorySelect) {
        postCategorySelect.addEventListener('change', () => {
            const category = postCategorySelect.value;
            // ক্যাটাগরি পরিবর্তন হলে কন্টেইনার পরিষ্কার করা 
            dynamicFieldsContainer.innerHTML = '';
            if (category) {
                generateTypeDropdown(category);
            } else {
                dynamicFieldsContainer.innerHTML = '<p class="placeholder-text">উপরে ক্যাটাগরি নির্বাচন করুন।</p>';
            }
        });
    }

    // প্রপার্টির ধরন (Type) ড্রপডাউন তৈরি
    function generateTypeDropdown(category) {
        let options = [];

        if (category === 'বিক্রয়') {
            options = ['জমি', 'বাড়ি', 'ফ্লাট', 'দোকান'];
        } else if (category === 'ভাড়া') {
            options = ['বাড়ি', 'ফ্লাট', 'দোকান'];
        }

        const typeSelectHTML = `
            <div class="input-group">
                <label for="post-type">প্রপার্টির ধরন:</label>
                <select id="post-type" required>
                    <option value="">-- নির্বাচন করুন --</option>
                    ${options.map(option => `<option value="${option}">${option}</option>`).join('')}
                </select>
            </div>
            <div id="specific-fields-container"></div>
        `;
        dynamicFieldsContainer.innerHTML = typeSelectHTML;

        // প্রপার্টির ধরন নির্বাচনের পর নির্দিষ্ট ফিল্ড লোড
        const postTypeSelect = document.getElementById('post-type');
        if (postTypeSelect) {
            postTypeSelect.addEventListener('change', () => {
                generateSpecificFields(category, postTypeSelect.value);
            });
        }
    }

    // নির্দিষ্ট ফিল্ড (দাম, রুম, পরিমাপ) তৈরি
    function generateSpecificFields(category, type) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        specificFieldsContainer.innerHTML = '';

        let fieldsHTML = '';
        if (category === 'বিক্রয়') {
            fieldsHTML += `
                <div class="input-group">
                    <label for="price">বিক্রয় মূল্য:</label>
                    <input type="text" id="price" placeholder="যেমন: ১,৫০,০০,০০০ টাকা" required>
                </div>
            `;
        } else if (category === 'ভাড়া') {
            fieldsHTML += `
                <div class="input-group">
                    <label for="rent-amount">মাসিক ভাড়া:</label>
                    <input type="text" id="rent-amount" placeholder="যেমন: ২৫,০০০ টাকা/মাস" required>
                </div>
            `;
        }

        // বাড়ি বা ফ্লাটের জন্য রুম ও বাথরুম সংখ্যা
        if (type === 'বাড়ি' || type === 'ফ্লাট') {
            fieldsHTML += `
                <div class="input-inline">
                    <div class="input-group">
                        <label for="rooms">বেডরুম সংখ্যা:</label>
                        <input type="number" id="rooms" min="1" placeholder="যেমন: ৩" required>
                    </div>
                    <div class="input-group">
                        <label for="bathrooms">বাথরুম সংখ্যা:</label>
                        <input type="number" id="bathrooms" min="1" placeholder="যেমন: ২" required>
                    </div>
                </div>
            `;
        }
        
        // জমির জন্য পরিমাপ
        if (type === 'জমি') {
             fieldsHTML += `
                <div class="input-group">
                    <label for="land-area">জমির পরিমাপ:</label>
                    <input type="text" id="land-area" placeholder="যেমন: ৫ কাঠা বা ৩০ ডেসিমেল" required>
                </div>
            `;
        }

        specificFieldsContainer.innerHTML = fieldsHTML;
    }


    // =====================================
    // ২. ইমেজ আপলোড হ্যান্ডেলার
    // =====================================
    async function uploadImages(files) {
        const imageUrls = [];
        if (!auth.currentUser) throw new Error("লগইন করা নেই, ইমেজ আপলোড সম্ভব নয়।");
        
        for (const file of files) {
            const storageRef = storage.ref();
            const imageRef = storageRef.child(`properties/${auth.currentUser.uid}/${Date.now()}_${file.name}`);
            
            try {
                const snapshot = await imageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();
                imageUrls.push(downloadURL);
            } catch (error) {
                console.error("ইমেজ আপলোড করতে সমস্যা হয়েছে: ", error);
                throw new Error("ইমেজ আপলোড ব্যর্থ হয়েছে।");
            }
        }
        return imageUrls;
    }


    // =====================================
    // ৩. ফর্ম সাবমিট
    // =====================================
    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        if (!auth.currentUser) {
            alert('প্রপার্টি যোগ করার জন্য আপনাকে অবশ্যই লগইন করতে হবে!');
            window.location.href = 'auth.html';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'সাবমিট হচ্ছে...';
        
        try {
            const imageFiles = document.getElementById('image-upload').files;
            if (imageFiles.length === 0 || imageFiles.length > 5) {
                alert('অনুগ্রহ করে কমপক্ষে একটি এবং সর্বোচ্চ ৫টি ছবি আপলোড করুন।');
                return;
            }
            
            const imageUrls = await uploadImages(imageFiles);

            const category = postCategorySelect.value;
            const propertyType = document.getElementById('post-type')?.value;
            
            // ডেটা সংগ্রহের জন্য সকল ID নিশ্চিত করা হলো
            const propertyData = {
                userId: auth.currentUser.uid,
                category: category,
                type: propertyType,
                title: document.getElementById('property-title').value,
                description: document.getElementById('property-description').value,
                images: imageUrls,
                location: {
                    district: document.getElementById('location-district').value,
                    upazila: document.getElementById('location-upazila').value,
                },
                contact: document.getElementById('phone-number').value,
                mapLink: document.getElementById('google-map').value || null,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            };
            
            // ডায়নামিক ফিল্ড যুক্ত করা (আপনার কোড অনুযায়ী)
            if (category === 'বিক্রয়') {
                propertyData.price = document.getElementById('price')?.value;
            } else if (category === 'ভাড়া') {
                propertyData.rentAmount = document.getElementById('rent-amount')?.value;
            }
            
            if (propertyType === 'বাড়ি' || propertyType === 'ফ্লাট') {
                // Number() ব্যবহার করা হলো যাতে Firestore এ Number হিসেবে সেভ হয়
                propertyData.rooms = Number(document.getElementById('rooms')?.value); 
                propertyData.bathrooms = Number(document.getElementById('bathrooms')?.value);
            }
            
            if (propertyType === 'জমি') {
                propertyData.landArea = document.getElementById('land-area')?.value;
            }

            // Firestore এ ডেটা সংরক্ষণ
            await db.collection("properties").add(propertyData);

            alert("প্রপার্টি সফলভাবে আপলোড করা হয়েছে!");
            propertyForm.reset();
            dynamicFieldsContainer.innerHTML = '<p class="placeholder-text">উপরে ক্যাটাগরি নির্বাচন করুন।</p>'; 
            // window.location.href = 'index.html'; // চাইলে হোমে ফেরত পাঠানো যেতে পারে

        } catch (error) {
            console.error("ডেটা আপলোড করতে সমস্যা হয়েছে: ", error);
            alert("প্রপার্টি আপলোড ব্যর্থ হয়েছে: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'সাবমিট করুন';
        }
    });


    // =====================================
    // ৪. Auth State Handler (আপনার JS ফাইল থেকে নেওয়া)
    // =====================================
    auth.onAuthStateChanged(user => {
        const postLink = document.getElementById('post-link');
        const loginLink = document.getElementById('login-link');
        
        if (user) {
            if (postLink) postLink.style.display = 'inline-block';
            if (loginLink) {
                loginLink.textContent = 'লগআউট';
                loginLink.href = '#';
                
                loginLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await auth.signOut();
                    alert('সফলভাবে লগআউট করা হয়েছে!');
                    window.location.href = 'index.html';
                });
            }
        } else {
            if (postLink) postLink.style.display = 'none';
            if (loginLink) {
                loginLink.textContent = 'লগইন';
                loginLink.href = 'auth.html';
            }
        }
    });

});
