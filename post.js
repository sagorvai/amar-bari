// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');

    // UI elements for header
    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.getElementById('side-menu');
    const profileLink = document.getElementById('profile-link');
    const postLink = document.getElementById('post-link');
    const logoutLink = document.getElementById('logout-link');

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
            postTypeSelect.addEventListener('change', function() {
                generateSpecificFields(category, this.value);
            });
        }
    }

    // Function to generate specific fields based on property type
    function generateSpecificFields(category, postType) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        let fieldsHTML = `
            <div class="input-group">
                <label for="property-images">ছবি আপলোড করুন (সর্বোচ্চ ৩টি):</label>
                <input type="file" id="property-images" accept="image/*" multiple required>
            </div>
            <div class="input-group">
                <label for="property-title">প্রপার্টির শিরোনাম:</label>
                <input type="text" id="property-title" placeholder="যেমন: ধানমন্ডি ১০ এ সুন্দর ফ্ল্যাট" required>
            </div>
        `;

        // Generate fields based on category and type
        if (category === 'বিক্রয়') {
            if (postType === 'জমি') {
                fieldsHTML += `
                    <div class="input-group input-inline">
                        <div>
                            <label for="land-area">পরিমাণ:</label>
                            <input type="number" id="land-area" required>
                        </div>
                        <div>
                            <label for="land-unit">ইউনিট:</label>
                            <select id="land-unit" required>
                                <option value="শতক">শতক</option>
                                <option value="একর">একর</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-group input-inline">
                        <div>
                            <label for="land-price">দাম:</label>
                            <input type="number" id="land-price" required>
                        </div>
                        <div>
                            <label for="price-unit">ইউনিট:</label>
                            <select id="price-unit" required>
                                <option value="শতক">শতক</option>
                                <option value="একর">একর</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="rs-dag-number">RS দাগ নম্বর:</label>
                        <input type="text" id="rs-dag-number" required>
                    </div>
                    <div class="input-group">
                        <label for="land-type">জমির ধরন:</label>
                        <select id="land-type" required>
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
            } else if (postType === 'বাড়ি') {
                 fieldsHTML += `
                    <div class="input-group">
                        <label for="land-area-house">জমির পরিমাণ:</label>
                        <input type="text" id="land-area-house" required>
                    </div>
                    <div class="input-group">
                        <label for="price">দাম:</label>
                        <input type="number" id="price" required>
                    </div>
                    <div class="input-group">
                        <label for="rs-dag-number-house">RS দাগ নম্বর:</label>
                        <input type="text" id="rs-dag-number-house" required>
                    </div>
                    <div class="input-group">
                        <label for="floors-sell">তলা (ঐচ্ছিক):</label>
                        <input type="number" id="floors-sell">
                    </div>
                    <div class="input-group">
                        <label for="rooms-sell">রুম সংখ্যা:</label>
                        <input type="number" id="rooms-sell">
                    </div>
                    <div class="input-group">
                        <label for="bathrooms-sell">বাথরুম:</label>
                        <input type="number" id="bathrooms-sell">
                    </div>
                    <div class="input-group">
                        <label for="kitchens-sell">কিচেন:</label>
                        <input type="number" id="kitchens-sell">
                    </div>
                `;
            } else if (postType === 'ফ্লাট') {
                fieldsHTML += `
                    <div class="input-group">
                        <label for="flat-area-sqft">পরিমাণ (স্কয়ার ফিট):</label>
                        <input type="number" id="flat-area-sqft" required>
                    </div>
                    <div class="input-group">
                        <label for="price">দাম:</label>
                        <input type="number" id="price" required>
                    </div>
                    <div class="input-group">
                        <label for="price-type">দাম:</label>
                        <select id="price-type" required>
                            <option value="per-sqft">প্রতি স্কয়ার ফিট</option>
                            <option value="total">মোট</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label for="floor-no">ফ্লোর নং:</label>
                        <input type="text" id="floor-no">
                    </div>
                    <div class="input-group">
                        <label for="rooms-flat">রুম:</label>
                        <input type="number" id="rooms-flat">
                    </div>
                    <div class="input-group">
                        <label for="bathrooms-flat">বাথরুম:</label>
                        <input type="number" id="bathrooms-flat">
                    </div>
                    <div class="input-group">
                        <label for="kitchens-flat">কিচেন:</label>
                        <input type="number" id="kitchens-flat">
                    </div>
                `;
            } else if (postType === 'দোকান') {
                 fieldsHTML += `
                    <div class="input-group">
                        <label for="shop-area">পরিমাণ:</label>
                        <input type="text" id="shop-area" required>
                    </div>
                    <div class="input-group">
                        <label for="shop-count">দোকান সংখ্যা:</label>
                        <input type="number" id="shop-count" required>
                    </div>
                    <div class="input-group">
                        <label for="price">দাম:</label>
                        <input type="number" id="price" required>
                    </div>
                    <div class="input-group">
                        <label for="rs-dag-number-shop">RS দাগ নম্বর:</label>
                        <input type="text" id="rs-dag-number-shop" required>
                    </div>
                `;
            }

            // Location fields for 'বিক্রয়'
            fieldsHTML += `
                <div class="input-group">
                    <label for="mouza">মৌজা:</label>
                    <input type="text" id="mouza" required>
                </div>
                <div class="input-group">
                    <label for="thana">থানা:</label>
                    <input type="text" id="thana" required>
                </div>
                <div class="input-group">
                    <label for="upazila">উপজেলা:</label>
                    <input type="text" id="upazila" required>
                </div>
                <div class="input-group">
                    <label for="upazila-type">উপজেলা ধরণ:</label>
                    <select id="upazila-type" required>
                        <option value="উপজেলা">উপজেলা</option>
                        <option value="সিটি কর্পোরেশন">সিটি কর্পোরেশন</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="district">জেলা:</label>
                    <input type="text" id="district" required>
                </div>
            `;
        } else if (category === 'ভাড়া') {
            fieldsHTML += `
                <div class="input-group">
                    <label for="rent-amount">ভাড়া:</label>
                    <input type="number" id="rent-amount" placeholder="মাসিক ভাড়ার পরিমাণ" required>
                </div>
                <div class="input-group">
                    <label for="advance-amount">অ্যাডভান্স:</label>
                    <input type="number" id="advance-amount" placeholder="অ্যাডভান্সের পরিমাণ" required>
                </div>
            `;

            if (postType === 'বাড়ি' || postType === 'ফ্লাট') {
                fieldsHTML += `
                    <div class="input-group">
                        <label for="floors-rent">তলা:</label>
                        <input type="number" id="floors-rent">
                    </div>
                    <div class="input-group">
                        <label for="rooms-rent">রুম:</label>
                        <input type="number" id="rooms-rent">
                    </div>
                    <div class="input-group">
                        <label for="bathrooms-rent">বাথরুম:</label>
                        <input type="number" id="bathrooms-rent">
                    </div>
                    <div class="input-group">
                        <label for="kitchens-rent">কিচেন:</label>
                        <input type="number" id="kitchens-rent">
                    </div>
                    <div class="input-group">
                        <label for="rental-type">ভাড়ার ধরণ:</label>
                        <select id="rental-type" required>
                            <option value="ফ্যামিলি">ফ্যামিলি</option>
                            <option value="ব্যাচেলর">ব্যাচেলর</option>
                        </select>
                    </div>
                `;
            }
            
            // Location fields for 'ভাড়া'
            fieldsHTML += `
                <div class="input-group">
                    <label for="village">গ্রাম:</label>
                    <input type="text" id="village" required>
                </div>
                <div class="input-group">
                    <label for="ward-number">ওয়ার্ড নম্বর:</label>
                    <input type="text" id="ward-number" required>
                </div>
                <div class="input-group">
                    <label for="thana">থানা:</label>
                    <input type="text" id="thana" required>
                </div>
                <div class="input-group">
                    <label for="upazila">উপজেলা:</label>
                    <input type="text" id="upazila" required>
                </div>
                <div class="input-group">
                    <label for="upazila-type">উপজেলা ধরণ:</label>
                    <select id="upazila-type" required>
                        <option value="উপজেলা">উপজেলা</option>
                        <option value="সিটি কর্পোরেশন">সিটি কর্পোরেশন</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="district">জেলা:</label>
                    <input type="text" id="district" required>
                </div>
            `;
        }
        
        fieldsHTML += `
            <div class="input-group">
                <label for="property-description">বিস্তারিত বিবরণ:</label>
                <textarea id="property-description" rows="5" required></textarea>
            </div>
        `;

        specificFieldsContainer.innerHTML = fieldsHTML;
    }

    // Event listener for category change
    if (postCategorySelect) {
        postCategorySelect.addEventListener('change', function() {
            generateTypeDropdown(this.value);
        });
    }

    // Handle form submission
    if (propertyForm) {
        propertyForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                alert("এই কার্যক্রমের জন্য আপনাকে অবশ্যই লগইন করতে হবে।");
                window.location.href = 'auth.html';
                return;
            }

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

                const imageUrls = [];
                for (const image of propertyImages) {
                    const storageRef = storage.ref(`property_images/${Date.now()}_${image.name}`);
                    const snapshot = await storageRef.put(image);
                    const imageUrl = await snapshot.ref.getDownloadURL();
                    imageUrls.push(imageUrl);
                }

                const postCategory = document.getElementById('post-category').value;
                const postType = document.getElementById('post-type')?.value;
                const title = document.getElementById('property-title')?.value;
                const description = document.getElementById('property-description')?.value;
                const phoneNumber = document.getElementById('phone-number')?.value;
                const googleMapLink = document.getElementById('google-map')?.value;
                
                let propertyData = {
                    category: postCategory,
                    type: postType,
                    title: title,
                    images: imageUrls,
                    description: description,
                    phoneNumber: phoneNumber,
                    googleMapLink: googleMapLink,
                    uid: user.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                };

                // Collect dynamic data based on type
                if (postCategory === 'বিক্রয়') {
                    propertyData.location = {
                        mouza: document.getElementById('mouza')?.value,
                        thana: document.getElementById('thana')?.value,
                        upazila: document.getElementById('upazila')?.value,
                        upazilaType: document.getElementById('upazila-type')?.value,
                        district: document.getElementById('district')?.value,
                    };
                    if (postType === 'জমি') {
                        propertyData.area = {
                            value: document.getElementById('land-area')?.value,
                            unit: document.getElementById('land-unit')?.value
                        };
                        propertyData.price = {
                            value: document.getElementById('land-price')?.value,
                            unit: document.getElementById('price-unit')?.value
                        };
                        propertyData.rsDagNumber = document.getElementById('rs-dag-number')?.value;
                        propertyData.landType = document.getElementById('land-type')?.value;
                    } else if (postType === 'বাড়ি') {
                        propertyData.landArea = document.getElementById('land-area-house')?.value;
                        propertyData.price = document.getElementById('price')?.value;
                        propertyData.rsDagNumber = document.getElementById('rs-dag-number-house')?.value;
                        propertyData.floors = document.getElementById('floors-sell')?.value;
                        propertyData.rooms = document.getElementById('rooms-sell')?.value;
                        propertyData.bathrooms = document.getElementById('bathrooms-sell')?.value;
                        propertyData.kitchens = document.getElementById('kitchens-sell')?.value;
                    } else if (postType === 'ফ্লাট') {
                        propertyData.areaSqFt = document.getElementById('flat-area-sqft')?.value;
                        propertyData.price = document.getElementById('price')?.value;
                        propertyData.priceType = document.getElementById('price-type')?.value;
                        propertyData.floorNo = document.getElementById('floor-no')?.value;
                        propertyData.rooms = document.getElementById('rooms-flat')?.value;
                        propertyData.bathrooms = document.getElementById('bathrooms-flat')?.value;
                        propertyData.kitchens = document.getElementById('kitchens-flat')?.value;
                    } else if (postType === 'দোকান') {
                        propertyData.shopArea = document.getElementById('shop-area')?.value;
                        propertyData.shopCount = document.getElementById('shop-count')?.value;
                        propertyData.price = document.getElementById('price')?.value;
                        propertyData.rsDagNumber = document.getElementById('rs-dag-number-shop')?.value;
                    }
                } else if (postCategory === 'ভাড়া') {
                    propertyData.rentAmount = document.getElementById('rent-amount')?.value;
                    propertyData.advanceAmount = document.getElementById('advance-amount')?.value;
                    propertyData.location = {
                        village: document.getElementById('village')?.value,
                        wardNumber: document.getElementById('ward-number')?.value,
                        thana: document.getElementById('thana')?.value,
                        upazila: document.getElementById('upazila')?.value,
                        upazilaType: document.getElementById('upazila-type')?.value,
                        district: document.getElementById('district')?.value,
                    };

                    if (postType === 'বাড়ি' || postType === 'ফ্লাট') {
                        propertyData.floors = document.getElementById('floors-rent')?.value;
                        propertyData.rooms = document.getElementById('rooms-rent')?.value;
                        propertyData.bathrooms = document.getElementById('bathrooms-rent')?.value;
                        propertyData.kitchens = document.getElementById('kitchens-rent')?.value;
                        propertyData.rentalType = document.getElementById('rental-type')?.value;
                    }
                }

                await db.collection("properties").add(propertyData);

                alert("প্রপার্টি সফলভাবে আপলোড করা হয়েছে!");
                propertyForm.reset();
                dynamicFieldsContainer.innerHTML = ''; 

            } catch (error) {
                console.error("ডেটা আপলোড করতে সমস্যা হয়েছে: ", error);
                alert("প্রপার্টি আপলোড ব্যর্থ হয়েছে: " + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'সাবমিট করুন';
            }
        });
    }

    // Menu toggle
    if (menuToggle && sideMenu) {
        menuToggle.addEventListener('click', () => {
            sideMenu.classList.toggle('open');
        });
    }

    auth.onAuthStateChanged(user => {
        if (user) {
            if (profileLink) {
                profileLink.href = '#';
            }
            if (logoutLink) {
                logoutLink.style.display = 'block';
                logoutLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await auth.signOut();
                    alert('সফলভাবে লগআউট করা হয়েছে!');
                    window.location.href = 'index.html';
                });
            }
        } else {
            if (profileLink) {
                profileLink.href = 'auth.html';
            }
            if (logoutLink) logoutLink.style.display = 'none';
        }
    });

});
