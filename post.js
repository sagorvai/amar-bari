// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');

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
                const selectedType = postTypeSelect.value;
                generateSpecificFields(category, selectedType);
            });
        }
    }

    // Function to generate the specific fields based on category and type
    function generateSpecificFields(category, type) {
        let fieldsHTML = '';

        // All properties need these fields
        fieldsHTML += `
            <div class="input-group">
                <label>ছবি (সর্বোচ্চ ৩টি):</label>
                <input type="file" id="image-upload" accept="image/*" multiple required>
            </div>
            <div class="input-group">
                <label for="title">শিরোনাম:</label>
                <input type="text" id="title" required>
            </div>
        `;

        // Fields specific to "বিক্রয়" category
        if (category === 'বিক্রয়') {
            if (type === 'জমি') {
                fieldsHTML += `
                    <div class="input-group input-inline">
                        <div>
                            <label for="area-quantity">জমির পরিমাণ:</label>
                            <input type="number" id="area-quantity" required>
                        </div>
                        <div>
                            <label for="area-unit">ইউনিট:</label>
                            <select id="area-unit">
                                <option value="শতক">শতক</option>
                                <option value="একর">একর</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="price">দাম:</label>
                        <input type="text" id="price" placeholder="যেমন: ১.৫ কোটি" required>
                    </div>
                    <div class="input-group">
                        <label for="rs-dag">RS দাগ নম্বর:</label>
                        <input type="text" id="rs-dag">
                    </div>
                    <div class="input-group">
                        <label for="land-type">জমির ধরন:</label>
                        <select id="land-type">
                            <option value="">-- নির্বাচন করুন --</option>
                            <option value="আবাসিক">আবাসিক</option>
                            <option value="বিলান">বিলান</option>
                            <option value="বাস্ত">বাস্ত</option>
                            <option value="ভিটা">ভিটা</option>
                            <option value="ডোবা">ডোবা</option>
                            <option value="পুকুর">পুকুর</option>
                        </select>
                    </div>
                `;
            } else if (type === 'বাড়ি') {
                fieldsHTML += `
                    <div class="input-group">
                        <label for="land-area">জমির পরিমাণ:</label>
                        <input type="text" id="land-area" placeholder="যেমন: ৫ শতক" required>
                    </div>
                    <div class="input-group">
                        <label for="price">দাম:</label>
                        <input type="text" id="price" placeholder="যেমন: ১.৫ কোটি" required>
                    </div>
                    <div class="input-group">
                        <label for="rs-dag">RS দাগ নম্বর:</label>
                        <input type="text" id="rs-dag">
                    </div>
                    <div class="input-group">
                        <label for="floors">তলা (ঐচ্ছিক):</label>
                        <input type="number" id="floors">
                    </div>
                    <div class="input-group">
                        <label for="rooms">রুম সংখ্যা:</label>
                        <input type="number" id="rooms">
                    </div>
                    <div class="input-group">
                        <label for="bathrooms">বাথরুম:</label>
                        <input type="number" id="bathrooms">
                    </div>
                    <div class="input-group">
                        <label for="kitchens">কিচেন:</label>
                        <input type="number" id="kitchens">
                    </div>
                `;
            } else if (type === 'ফ্ল্যাট') {
                fieldsHTML += `
                    <div class="input-group">
                        <label for="size-sq-ft">আয়তন (স্কয়ার ফিট):</label>
                        <input type="number" id="size-sq-ft" required>
                    </div>
                    <div class="input-group">
                        <label for="price-flat">দাম:</label>
                        <input type="text" id="price-flat" placeholder="যেমন: ৫০ লাখ" required>
                    </div>
                    <div class="input-group">
                        <label for="floor-no">ফ্লোর নং:</label>
                        <input type="number" id="floor-no">
                    </div>
                    <div class="input-group">
                        <label for="rooms">রুম:</label>
                        <input type="number" id="rooms">
                    </div>
                    <div class="input-group">
                        <label for="bathrooms">বাথরুম:</label>
                        <input type="number" id="bathrooms">
                    </div>
                    <div class="input-group">
                        <label for="kitchens">কিচেন:</label>
                        <input type="number" id="kitchens">
                    </div>
                `;
            } else if (type === 'দোকান' || type === 'কমার্শিয়াল') {
                fieldsHTML += `
                    <div class="input-group">
                        <label for="size-sq-ft">আয়তন (স্কয়ার ফিট):</label>
                        <input type="number" id="size-sq-ft" required>
                    </div>
                    <div class="input-group">
                        <label for="store-count">দোকান সংখ্যা:</label>
                        <input type="number" id="store-count">
                    </div>
                    <div class="input-group">
                        <label for="price-store">দাম:</label>
                        <input type="text" id="price-store" placeholder="যেমন: ২০ লাখ" required>
                    </div>
                    <div class="input-group">
                        <label for="rs-dag">RS দাগ নম্বর:</label>
                        <input type="text" id="rs-dag">
                    </div>
                `;
            }
        } 
        
        // Fields specific to "ভাড়া" category
        else if (category === 'ভাড়া') {
            fieldsHTML += `
                <div class="input-group">
                    <label for="rent-amount">ভাড়া:</label>
                    <input type="number" id="rent-amount" required>
                </div>
                <div class="input-group">
                    <label for="advance-amount">এডভান্স:</label>
                    <input type="number" id="advance-amount">
                </div>
            `;
            if (type === 'বাড়ি' || type === 'ফ্ল্যাট') {
                fieldsHTML += `
                    <div class="input-group">
                        <label for="size-sq-ft">আয়তন (বর্গফুট):</label>
                        <input type="number" id="size-sq-ft" required>
                    </div>
                    <div class="input-group">
                        <label for="floors">তলা:</label>
                        <input type="number" id="floors">
                    </div>
                    <div class="input-group">
                        <label for="rooms">রুম সংখ্যা:</label>
                        <input type="number" id="rooms">
                    </div>
                    <div class="input-group">
                        <label for="bathrooms">বাথরুম:</label>
                        <input type="number" id="bathrooms">
                    </div>
                    <div class="input-group">
                        <label for="kitchens">কিচেন:</label>
                        <input type="number" id="kitchens">
                    </div>
                    <div class="input-group">
                        <label for="rental-type">ভাড়ার ধরন:</label>
                        <select id="rental-type">
                            <option value="ফ্যামিলি">ফ্যামিলি</option>
                            <option value="ব্যাচেলর">ব্যাচেলর</option>
                        </select>
                    </div>
                `;
            } else if (type === 'অফিস' || type === 'দোকান') {
                fieldsHTML += `
                    <div class="input-group">
                        <label for="size-sq-ft">আয়তন (বর্গফুট):</label>
                        <input type="number" id="size-sq-ft" required>
                    </div>
                `;
            }
        }
        
        // Location & Description fields (common for all types)
        fieldsHTML += `
            <div class="input-group">
                <label for="description">বিবরণ:</label>
                <textarea id="description" rows="5" placeholder="সম্পূর্ণ বর্ণনা লিখুন"></textarea>
            </div>
            <div class="input-group">
                <label for="mouza">মৌজা:</label>
                <input type="text" id="mouza">
            </div>
            <div class="input-group">
                <label for="village">গ্রাম:</label>
                <input type="text" id="village">
            </div>
            <div class="input-group">
                <label for="ward-no">ওয়ার্ড নম্বর:</label>
                <input type="text" id="ward-no">
            </div>
            <div class="input-group">
                <label for="thana">থানা:</label>
                <input type="text" id="thana">
            </div>
            <div class="input-group input-inline">
                <div>
                    <label for="district">জেলা:</label>
                    <input type="text" id="district" required>
                </div>
                <div>
                    <label for="upazila">উপজেলা:</label>
                    <input type="text" id="upazila" required>
                </div>
            </div>
            <div class="input-group">
                <label for="upazila-type">উপজেলা ধরণ:</label>
                <select id="upazila-type">
                    <option value="উপজেলা">উপজেলা</option>
                    <option value="সিটি কর্পোরেশন">সিটি কর্পোরেশন</option>
                </select>
            </div>
        `;
        
        // Update the specific fields container, replacing old content
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        if (specificFieldsContainer) {
            specificFieldsContainer.innerHTML = fieldsHTML;
        }
    }

    // Main logic for category selection
    postCategorySelect.addEventListener('change', function() {
        const selectedCategory = postCategorySelect.value;
        if (selectedCategory) {
            generateTypeDropdown(selectedCategory);
        } else {
            dynamicFieldsContainer.innerHTML = '';
        }
    });

    // Form submission handler
    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const user = auth.currentUser;
        if (!user) {
            alert("প্রপার্টি যোগ করতে আপনাকে অবশ্যই লগইন করতে হবে।");
            window.location.href = 'auth.html';
            return;
        }

        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'সাবমিট হচ্ছে...';

        try {
            const postCategory = postCategorySelect.value;
            const postType = document.getElementById('post-type')?.value;
            const title = document.getElementById('title')?.value;
            const description = document.getElementById('description')?.value || '';
            const phoneNumber = document.getElementById('phone-number')?.value;
            const googleMapLink = document.getElementById('google-map')?.value || '';
            const images = document.getElementById('image-upload')?.files;
            
            // Image Upload to Firebase Storage
            const imageUrls = [];
            if (images && images.length > 0) {
                for (const imageFile of images) {
                    const storageRef = storage.ref();
                    const imageRef = storageRef.child(`images/${Date.now()}-${imageFile.name}`);
                    await imageRef.put(imageFile);
                    const imageUrl = await imageRef.getDownloadURL();
                    imageUrls.push(imageUrl);
                }
            }
            
            const propertyData = {
                category: postCategory,
                type: postType,
                title: title,
                images: imageUrls,
                phoneNumber: phoneNumber,
                googleMapLink: googleMapLink,
                description: description,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userUid: user.uid,
                location: {
                    district: document.getElementById('district')?.value,
                    upazila: document.getElementById('upazila')?.value,
                    upazilaType: document.getElementById('upazila-type')?.value || '',
                    mouza: document.getElementById('mouza')?.value || '',
                    village: document.getElementById('village')?.value || '',
                    wardNo: document.getElementById('ward-no')?.value || '',
                    thana: document.getElementById('thana')?.value || '',
                }
            };

            // Add fields based on type
            if (postCategory === 'বিক্রয়') {
                if (postType === 'জমি') {
                    propertyData.size = `${document.getElementById('area-quantity')?.value} ${document.getElementById('area-unit')?.value}`;
                    propertyData.price = document.getElementById('price')?.value;
                    propertyData.landType = document.getElementById('land-type')?.value;
                    propertyData.rsDag = document.getElementById('rs-dag')?.value;
                } else if (postType === 'বাড়ি') {
                    propertyData.landArea = document.getElementById('land-area')?.value;
                    propertyData.price = document.getElementById('price')?.value;
                    propertyData.rsDag = document.getElementById('rs-dag')?.value;
                    propertyData.floors = document.getElementById('floors')?.value;
                    propertyData.rooms = document.getElementById('rooms')?.value;
                    propertyData.bathrooms = document.getElementById('bathrooms')?.value;
                    propertyData.kitchens = document.getElementById('kitchens')?.value;
                } else if (postType === 'ফ্ল্যাট') {
                    propertyData.size = document.getElementById('size-sq-ft')?.value;
                    propertyData.price = document.getElementById('price-flat')?.value;
                    propertyData.floorNo = document.getElementById('floor-no')?.value;
                    propertyData.rooms = document.getElementById('rooms')?.value;
                    propertyData.bathrooms = document.getElementById('bathrooms')?.value;
                    propertyData.kitchens = document.getElementById('kitchens')?.value;
                } else if (postType === 'দোকান' || postType === 'কমার্শিয়াল') {
                    propertyData.size = document.getElementById('size-sq-ft')?.value;
                    propertyData.storeCount = document.getElementById('store-count')?.value;
                    propertyData.price = document.getElementById('price-store')?.value;
                    propertyData.rsDag = document.getElementById('rs-dag')?.value;
                }
            } else if (postCategory === 'ভাড়া') {
                propertyData.rentAmount = document.getElementById('rent-amount')?.value;
                propertyData.advanceAmount = document.getElementById('advance-amount')?.value;
                if (postType === 'বাড়ি' || postType === 'ফ্ল্যাট') {
                    propertyData.size = document.getElementById('size-sq-ft')?.value;
                    propertyData.floors = document.getElementById('floors')?.value;
                    propertyData.rooms = document.getElementById('rooms')?.value;
                    propertyData.bathrooms = document.getElementById('bathrooms')?.value;
                    propertyData.kitchens = document.getElementById('kitchens')?.value;
                    propertyData.rentalType = document.getElementById('rental-type')?.value;
                } else if (postType === 'অফিস' || postType === 'দোকান') {
                    propertyData.size = document.getElementById('size-sq-ft')?.value;
                }
            }
            
            await db.collection("properties").add(propertyData);

            alert("প্রপার্টি সফলভাবে আপলোড করা হয়েছে!");
            propertyForm.reset();
            dynamicFieldsContainer.innerHTML = ''; // Clear fields after submission

        } catch (error) {
            console.error("ডেটা আপলোড করতে সমস্যা হয়েছে: ", error);
            alert("প্রপার্টি আপলোড ব্যর্থ হয়েছে: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'সাবমিট করুন';
        }
    });

    // Check auth state for UI updates
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
            if (window.location.pathname.endsWith('post.html')) {
                alert("প্রপার্টি যোগ করতে আপনাকে অবশ্যই লগইন করতে হবে।");
                window.location.href = 'auth.html';
            }
        }
    });
});
