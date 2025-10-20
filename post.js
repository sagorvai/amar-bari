// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');

    // Function to generate and display the main property type dropdown based on category
    function generateTypeDropdown(category) {
        let typeSelectHTML = '';
        let options = [];

        if (category === 'বিক্রয়') {
            options = ['জমি', 'বাড়ি', 'ফ্লাট', 'দোকান'];
        } else if (category === 'ভাড়া') {
            options = ['বাড়ি', 'ফ্লাট', 'দোকান'];
        }

        typeSelectHTML = `
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

        const postTypeSelect = document.getElementById('post-type');
        if (postTypeSelect) {
            postTypeSelect.addEventListener('change', (e) => generateSpecificFields(category, e.target.value));
        }
    }

    // Function to generate specific input fields based on type
    function generateSpecificFields(category, type) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        let fieldsHTML = '';
        
        // সাধারণ ফিল্ডসমূহ (সকল প্রকার প্রপার্টির জন্য)
        fieldsHTML += `
            <div class="input-group">
                <label for="property-title">পোস্টের শিরোনাম:</label>
                <input type="text" id="property-title" required>
            </div>
            <div class="input-group">
                <label for="description">সম্পূর্ণ বিবরণ:</label>
                <textarea id="description" rows="4" required></textarea>
            </div>
            <div class="input-group">
                <label for="district">জেলা:</label>
                <input type="text" id="district" required>
            </div>
            <div class="input-group">
                <label for="upazila">উপজেলা/এলাকা:</label>
                <input type="text" id="upazila" required>
            </div>
        `;

        // স্পেসিফিক ফিল্ডসমূহ (ধরন ও ক্যাটাগরি অনুযায়ী)
        if (category === 'বিক্রয়') {
            fieldsHTML += `
                <div class="input-group">
                    <label for="price">বিক্রয় মূল্য (টাকায়):</label>
                    <input type="number" id="price" required>
                </div>
            `;
            if (type === 'জমি') {
                fieldsHTML += `
                    <div class="input-group">
                        <label for="land-size">জমির পরিমাণ (শতাংশ/কাঠা):</label>
                        <input type="text" id="land-size" required>
                    </div>
                `;
            } else if (type === 'বাড়ি' || type === 'ফ্লাট') {
                fieldsHTML += `
                    <div class="input-inline">
                        <div class="input-group">
                            <label for="rooms">রুম সংখ্যা:</label>
                            <input type="number" id="rooms" required>
                        </div>
                        <div class="input-group">
                            <label for="bathrooms">বাথরুম সংখ্যা:</label>
                            <input type="number" id="bathrooms" required>
                        </div>
                    </div>
                `;
            }
        } else if (category === 'ভাড়া') {
            fieldsHTML += `
                <div class="input-group">
                    <label for="rent-amount">ভাড়ার পরিমাণ (মাসিক টাকায়):</label>
                    <input type="number" id="rent-amount" required>
                </div>
            `;
            if (type === 'বাড়ি' || type === 'ফ্লাট') {
                fieldsHTML += `
                    <div class="input-inline">
                        <div class="input-group">
                            <label for="rooms">রুম সংখ্যা:</label>
                            <input type="number" id="rooms" required>
                        </div>
                        <div class="input-group">
                            <label for="bathrooms">বাথরুম সংখ্যা:</label>
                            <input type="number" id="bathrooms" required>
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="advance">অগ্রিম/ডিপোজিট (ঐচ্ছিক):</label>
                        <input type="number" id="advance">
                    </div>
                `;
            }
        }
        
        // ইমেজ ইনপুট
        fieldsHTML += `
            <div class="input-group">
                <label for="images">ছবি আপলোড (কমপক্ষে ১টি):</label>
                <input type="file" id="images" accept="image/*" multiple required>
            </div>
        `;

        specificFieldsContainer.innerHTML = fieldsHTML;
    }

    // প্রাথমিক ক্যাটাগরি নির্বাচনের ইভেন্ট
    postCategorySelect.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        if (selectedCategory) {
            generateTypeDropdown(selectedCategory);
        } else {
            dynamicFieldsContainer.innerHTML = '<p class="placeholder-text">ক্যাটাগরি নির্বাচন করার পরে এখানে ফর্মের বাকি অংশ আসবে।</p>';
        }
    });

    // ফর্ম সাবমিট হ্যান্ডেল
    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'আপলোড হচ্ছে...';

        try {
            const user = auth.currentUser;
            if (!user) {
                alert("পোস্ট করার আগে আপনাকে লগইন করতে হবে!");
                submitBtn.disabled = false;
                submitBtn.textContent = 'সাবমিট করুন';
                return;
            }

            const category = document.getElementById('post-category').value;
            const type = document.getElementById('post-type')?.value;
            const title = document.getElementById('property-title')?.value;
            const description = document.getElementById('description')?.value;
            const district = document.getElementById('district')?.value;
            const upazila = document.getElementById('upazila')?.value;
            const phoneNumber = document.getElementById('phone-number')?.value; // ✅ এখন এই স্ট্যাটিক ইনপুট থেকে ডেটা নিবে
            const googleMap = document.getElementById('google-map')?.value;
            const imageFiles = document.getElementById('images')?.files;

            if (!imageFiles || imageFiles.length === 0) {
                 alert("অনুগ্রহ করে কমপক্ষে একটি ছবি আপলোড করুন।");
                 submitBtn.disabled = false;
                 submitBtn.textContent = 'সাবমিট করুন';
                 return;
            }

            const imageUrls = [];
            for (const file of imageFiles) {
                const storageRef = storage.ref(`property_images/${Date.now()}_${file.name}`);
                const snapshot = await storageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();
                imageUrls.push(downloadURL);
            }

            const propertyData = {
                category,
                type,
                title,
                description,
                images: imageUrls,
                phoneNumber,
                googleMap,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                location: {
                    district,
                    upazila,
                },
                userId: user.uid,
                status: 'pending' // পরে মডারেটর দ্বারা যাচাই করা যেতে পারে
            };

            // অতিরিক্ত ফিল্ড যোগ করা
            if (category === 'বিক্রয়') {
                propertyData.price = document.getElementById('price')?.value;
                if (type === 'জমি') {
                    propertyData.landSize = document.getElementById('land-size')?.value;
                } else if (type === 'বাড়ি' || type === 'ফ্লাট') {
                    propertyData.rooms = document.getElementById('rooms')?.value;
                    propertyData.bathrooms = document.getElementById('bathrooms')?.value;
                }
            } else if (category === 'ভাড়া') {
                propertyData.rentAmount = document.getElementById('rent-amount')?.value;
                propertyData.advance = document.getElementById('advance')?.value || null;
                if (type === 'বাড়ি' || type === 'ফ্লাট') {
                    propertyData.rooms = document.getElementById('rooms')?.value;
                    propertyData.bathrooms = document.getElementById('bathrooms')?.value;
                }
            }


            await db.collection("properties").add(propertyData);

            alert("প্রপার্টি সফলভাবে আপলোড করা হয়েছে!");
            propertyForm.reset();
            dynamicFieldsContainer.innerHTML = '<p class="placeholder-text">ক্যাটাগরি নির্বাচন করার পরে এখানে ফর্মের বাকি অংশ আসবে।</p>'; 

        } catch (error) {
            console.error("ডেটা আপলোড করতে সমস্যা হয়েছে: ", error);
            alert("প্রপার্টি আপলোড ব্যর্থ হয়েছে: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'সাবমিট করুন';
        }
    });

    // Auth state change handler for UI updates
    auth.onAuthStateChanged(user => {
        // নতুন সাইডবার লিঙ্ক উপাদানগুলো
        const postLinkSidebar = document.getElementById('post-link');
        const loginLinkSidebar = document.getElementById('login-link-sidebar');
        
        // লগআউট হ্যান্ডেলার (auth.js এর মত)
        const handleLogout = async () => {
            try {
                await auth.signOut();
                alert('সফলভাবে লগআউট করা হয়েছে!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error("লগআউট ব্যর্থ হয়েছে:", error);
                alert("লগআউট ব্যর্থ হয়েছে।");
            }
        };

        if (user) {
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout;
            }
        } else {
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
        }
    });
});
