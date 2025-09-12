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
            options = ['জমি', 'বাড়ি', 'ফ্ল্যাট', 'দোকান', 'কমার্শিয়াল'];
        } else if (category === 'ভাড়া') {
            options = ['বাড়ি', 'ফ্ল্যাট', 'অফিস', 'দোকান'];
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
            postTypeSelect.addEventListener('change', function() {
                generateSpecificFields(category, this.value);
            });
        }
    }

    // Function to generate specific fields based on property type
    function generateSpecificFields(category, postType) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        let fieldsHTML = '';

        // Common fields for all types
        fieldsHTML += `
            <div class="input-group">
                <label for="property-title">প্রপার্টির শিরোনাম:</label>
                <input type="text" id="property-title" placeholder="যেমন: ধানমন্ডি ১০ এ সুন্দর ফ্ল্যাট" required>
            </div>
            <div class="input-group">
                <label for="property-description">বিস্তারিত বিবরণ:</label>
                <textarea id="property-description" rows="5" required></textarea>
            </div>
            <div class="input-group">
                <label for="property-images">ছবি আপলোড করুন:</label>
                <input type="file" id="property-images" accept="image/*" multiple required>
            </div>
            <div class="input-group">
                <label for="price">মূল্য:</label>
                <input type="number" id="price" placeholder="প্রপার্টির মূল্য লিখুন" required>
            </div>
            <div class="input-group">
                <label for="area-sq-ft">জমির পরিমাণ/আয়তন (বর্গফুট):</label>
                <input type="number" id="area-sq-ft" required>
            </div>
            <div class="input-group input-inline">
                <div>
                    <label for="mouza">মৌজা:</label>
                    <input type="text" id="mouza" required>
                </div>
                <div>
                    <label for="thana">থানা:</label>
                    <input type="text" id="thana" required>
                </div>
            </div>
            <div class="input-group input-inline">
                <div>
                    <label for="upazila">উপজেলা:</label>
                    <input type="text" id="upazila" required>
                </div>
                <div>
                    <label for="upazila-type">উপজেলা ধরণ:</label>
                    <input type="text" id="upazila-type" required>
                </div>
                <div>
                    <label for="district">জেলা:</label>
                    <input type="text" id="district" required>
                </div>
            </div>
        `;

        // Specific fields based on category and type
        if (category === 'বিক্রয়') {
            // No extra fields for sale
        } else if (category === 'ভাড়া') {
            fieldsHTML += `
                <div class="input-group">
                    <label for="rent-amount">ভাড়ার পরিমাণ:</label>
                    <input type="number" id="rent-amount" placeholder="মাসিক ভাড়ার পরিমাণ" required>
                </div>
                <div class="input-group">
                    <label for="advance-amount">অ্যাডভান্সের পরিমাণ:</label>
                    <input type="number" id="advance-amount" placeholder="অ্যাডভান্সের পরিমাণ" required>
                </div>
            `;
            if (postType === 'বাড়ি' || postType === 'ফ্ল্যাট' || postType === 'অফিস') {
                fieldsHTML += `
                    <div class="input-group">
                        <label for="size-sq-ft">আয়তন (বর্গফুট):</label>
                        <input type="number" id="size-sq-ft" required>
                    </div>
                `;
            }
            if (postType === 'বাড়ি' || postType === 'ফ্ল্যাট') {
                fieldsHTML += `
                    <div class="input-group input-inline">
                        <div>
                            <label for="floors">ফ্লোর:</label>
                            <input type="number" id="floors" placeholder="ফ্লোরের সংখ্যা">
                        </div>
                        <div>
                            <label for="rooms">রুম:</label>
                            <input type="number" id="rooms" placeholder="রুমের সংখ্যা">
                        </div>
                        <div>
                            <label for="bathrooms">বাথরুম:</label>
                            <input type="number" id="bathrooms" placeholder="বাথরুমের সংখ্যা">
                        </div>
                        <div>
                            <label for="kitchens">রান্নাঘর:</label>
                            <input type="number" id="kitchens" placeholder="রান্নাঘরের সংখ্যা">
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="rental-type">ভাড়ার ধরণ:</label>
                        <select id="rental-type">
                            <option value="সম্পূর্ণ বাড়ি">সম্পূর্ণ বাড়ি</option>
                            <option value="ফ্ল্যাট">ফ্ল্যাট</option>
                            <option value="সাবলেট">সাবলেট</option>
                        </select>
                    </div>
                `;
            }
        }
        specificFieldsContainer.innerHTML = fieldsHTML;
    }

    // Event listener for category change
    postCategorySelect.addEventListener('change', function() {
        generateTypeDropdown(this.value);
    });
    
    // Handle form submission
    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'সাবমিট হচ্ছে...';

        try {
            const propertyImages = document.getElementById('property-images').files;
            if (propertyImages.length === 0) {
                alert("অনুগ্রহ করে অন্তত একটি ছবি আপলোড করুন।");
                submitBtn.disabled = false;
                submitBtn.textContent = 'সাবমিট করুন';
                return;
            }

            // Upload images to Firebase Storage
            const imageUrls = [];
            for (const image of propertyImages) {
                const storageRef = storage.ref(`property_images/${Date.now()}_${image.name}`);
                const snapshot = await storageRef.put(image);
                const imageUrl = await snapshot.ref.getDownloadURL();
                imageUrls.push(imageUrl);
            }

            // Collect all form data
            const postCategory = document.getElementById('post-category').value;
            const postType = document.getElementById('post-type')?.value;
            const title = document.getElementById('property-title')?.value;
            const description = document.getElementById('property-description')?.value;
            const phoneNumber = document.getElementById('phone-number')?.value;
            const googleMapLink = document.getElementById('google-map')?.value;
            const price = document.getElementById('price')?.value;
            const areaSqFt = document.getElementById('area-sq-ft')?.value;

            // Prepare dynamic data object
            let dynamicData = {};
            if (postType === 'বাড়ি' || postType === 'ফ্ল্যাট') {
                dynamicData = {
                    floors: document.getElementById('floors')?.value,
                    rooms: document.getElementById('rooms')?.value,
                    bathrooms: document.getElementById('bathrooms')?.value,
                    kitchens: document.getElementById('kitchens')?.value,
                    rentalType: document.getElementById('rental-type')?.value,
                };
            }
            if (postCategory === 'ভাড়া') {
                dynamicData.rentAmount = document.getElementById('rent-amount')?.value;
                dynamicData.advanceAmount = document.getElementById('advance-amount')?.value;
            }

            // Final property data object
            const propertyData = {
                category: postCategory,
                type: postType,
                title: title,
                images: imageUrls,
                description: description,
                price: price,
                size: areaSqFt,
                phoneNumber: phoneNumber,
                googleMapLink: googleMapLink,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                ...dynamicData,
                location: {
                    mouza: document.getElementById('mouza')?.value,
                    thana: document.getElementById('thana')?.value,
                    upazila: document.getElementById('upazila')?.value,
                    upazilaType: document.getElementById('upazila-type')?.value,
                    district: document.getElementById('district')?.value,
                }
            };

            await db.collection("properties").add(propertyData);

            alert("প্রপার্টি সফলভাবে আপলোড করা হয়েছে!");
            propertyForm.reset();
            dynamicFieldsContainer.innerHTML = ''; // Clear dynamic fields after submission

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
