// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();

document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const sellFieldsContainer = document.getElementById('sell-fields');
    const rentFieldsContainer = document.getElementById('rent-fields');
    const sellTypeSelect = document.getElementById('sell-type');
    const rentTypeSelect = document.getElementById('rent-type');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');

    // Show/hide fields based on category selection
    postCategorySelect.addEventListener('change', function() {
        const selectedCategory = postCategorySelect.value;
        sellFieldsContainer.classList.add('hidden-field');
        rentFieldsContainer.classList.add('hidden-field');
        dynamicFieldsContainer.innerHTML = '';

        if (selectedCategory === 'বিক্রয়') {
            sellFieldsContainer.classList.remove('hidden-field');
        } else if (selectedCategory === 'ভাড়া') {
            rentFieldsContainer.classList.remove('hidden-field');
        }
    });

    // Show/hide dynamic fields based on sell type selection
    sellTypeSelect.addEventListener('change', function() {
        const selectedType = sellTypeSelect.value;
        dynamicFieldsContainer.innerHTML = '';
        if (!selectedType) return;

        let fieldsHTML = `
            <div class="input-group">
                <label>ছবি (সর্বোচ্চ ৩টি):</label>
                <input type="file" id="image-upload" accept="image/*" multiple required>
            </div>
            <div class="input-group">
                <label for="title">শিরোনাম:</label>
                <input type="text" id="title" required>
            </div>
        `;

        if (selectedType === 'জমি') {
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
                <div class="input-group input-inline">
                    <div>
                        <label for="price-quantity">দাম:</label>
                        <input type="number" id="price-quantity" required>
                    </div>
                    <div>
                        <label for="price-unit">ইউনিট:</label>
                        <select id="price-unit">
                            <option value="মোট">মোট</option>
                            <option value="শতক">শতক</option>
                            <option value="একর">একর</option>
                        </select>
                    </div>
                </div>
                <div class="input-group">
                    <label for="rs-dag">আরএস দাগ নম্বর:</label>
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
        } else if (selectedType === 'বাড়ি') {
            fieldsHTML += `
                <div class="input-group">
                    <label for="land-area">জমির পরিমাণ:</label>
                    <input type="number" id="land-area">
                </div>
                <div class="input-group">
                    <label for="price">দাম:</label>
                    <input type="number" id="price" required>
                </div>
                <div class="input-group">
                    <label for="rs-dag">আরএস দাগ নম্বর:</label>
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
        } else if (selectedType === 'ফ্ল্যাট') {
            fieldsHTML += `
                <div class="input-group input-inline">
                    <div>
                        <label for="area-sq-ft">পরিমাণ (বর্গফুট):</label>
                        <input type="number" id="area-sq-ft">
                    </div>
                </div>
                <div class="input-group input-inline">
                    <div>
                        <label for="price-quantity">দাম:</label>
                        <input type="number" id="price-quantity" required>
                    </div>
                    <div>
                        <label for="price-unit">ইউনিট:</label>
                        <select id="price-unit">
                            <option value="মোট">মোট</option>
                            <option value="স্কয়ার ফিট">স্কয়ার ফিট</option>
                        </select>
                    </div>
                </div>
                <div class="input-group">
                    <label for="floor-no">ফ্লোর নং:</label>
                    <input type="number" id="floor-no">
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
        } else if (selectedType === 'দোকান') {
            fieldsHTML += `
                <div class="input-group">
                    <label for="area-sq-ft">পরিমাণ (বর্গফুট):</label>
                    <input type="number" id="area-sq-ft">
                </div>
                <div class="input-group">
                    <label for="store-count">দোকান সংখ্যা:</label>
                    <input type="number" id="store-count">
                </div>
                <div class="input-group">
                    <label for="price">দাম:</label>
                    <input type="number" id="price" required>
                </div>
                <div class="input-group">
                    <label for="rs-dag">আরএস দাগ নম্বর:</label>
                    <input type="text" id="rs-dag">
                </div>
            `;
        }

        fieldsHTML += `
            <div class="input-group">
                <label for="mouza">মৌজা:</label>
                <input type="text" id="mouza">
            </div>
            <div class="input-group">
                <label for="thana">থানা:</label>
                <input type="text" id="thana">
            </div>
            <div class="input-group input-inline">
                <div>
                    <label for="upazila">উপজেলা:</label>
                    <input type="text" id="upazila" required>
                </div>
                <div>
                    <label for="upazila-type">ধরণ:</label>
                    <select id="upazila-type">
                        <option value="উপজেলা">উপজেলা</option>
                        <option value="সিটি কর্পোরেশন">সিটি কর্পোরেশন</option>
                    </select>
                </div>
            </div>
            <div class="input-group">
                <label for="district">জেলা:</label>
                <input type="text" id="district" required>
            </div>
            <div class="input-group">
                <label for="description">বিবরণ:</label>
                <textarea id="description" rows="5"></textarea>
            </div>
        `;

        dynamicFieldsContainer.innerHTML = fieldsHTML;
    });

    // Show/hide dynamic fields based on rent type selection
    rentTypeSelect.addEventListener('change', function() {
        const selectedType = rentTypeSelect.value;
        dynamicFieldsContainer.innerHTML = '';
        if (!selectedType) return;

        let fieldsHTML = `
            <div class="input-group">
                <label>ছবি (সর্বোচ্চ ৩টি):</label>
                <input type="file" id="image-upload" accept="image/*" multiple required>
            </div>
            <div class="input-group">
                <label for="title">শিরোনাম:</label>
                <input type="text" id="title" required>
            </div>
            <div class="input-group">
                <label for="rent-amount">ভাড়া (টাকা):</label>
                <input type="number" id="rent-amount" required>
            </div>
            <div class="input-group">
                <label for="advance-amount">এডভান্স (টাকা):</label>
                <input type="number" id="advance-amount">
            </div>
        `;

        if (selectedType === 'বাড়ি' || selectedType === 'ফ্ল্যাট') {
            fieldsHTML += `
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
        }

        fieldsHTML += `
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
                    <label for="upazila">উপজেলা:</label>
                    <input type="text" id="upazila" required>
                </div>
                <div>
                    <label for="upazila-type">ধরণ:</label>
                    <select id="upazila-type">
                        <option value="উপজেলা">উপজেলা</option>
                        <option value="সিটি কর্পোরেশন">সিটি কর্পোরেশন</option>
                    </select>
                </div>
            </div>
            <div class="input-group">
                <label for="district">জেলা:</label>
                <input type="text" id="district" required>
            </div>
            <div class="input-group">
                <label for="description">বিবরণ:</label>
                <textarea id="description" rows="5"></textarea>
            </div>
        `;

        dynamicFieldsContainer.innerHTML = fieldsHTML;
    });

    // Form submission handler
    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Show loading state or disable button
        const submitBtn = document.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'সাবমিট হচ্ছে...';

        try {
            const postCategory = postCategorySelect.value;
            const postType = postCategory === 'বিক্রয়' ? sellTypeSelect.value : rentTypeSelect.value;
            const title = document.getElementById('title').value;
            const description = document.getElementById('description').value;
            const phoneNumber = document.getElementById('phone-number').value;
            const googleMapLink = document.getElementById('google-map').value;
            const images = document.getElementById('image-upload').files;

            // Upload multiple images to Firebase Storage
            const imageUrls = [];
            for (const imageFile of images) {
                const storageRef = storage.ref();
                const imageRef = storageRef.child(`images/${Date.now()}-${imageFile.name}`);
                await imageRef.put(imageFile);
                const imageUrl = await imageRef.getDownloadURL();
                imageUrls.push(imageUrl);
            }

            // Create property data object
            let propertyData = {
                category: postCategory,
                type: postType,
                title: title,
                images: imageUrls,
                description: description,
                phoneNumber: phoneNumber,
                googleMapLink: googleMapLink,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Collect dynamic data based on selected category and type
            if (postCategory === 'বিক্রয়') {
                if (postType === 'জমি') {
                    propertyData.area = document.getElementById('area-quantity').value + ' ' + document.getElementById('area-unit').value;
                    propertyData.price = document.getElementById('price-quantity').value + ' ' + document.getElementById('price-unit').value;
                    propertyData.rsDag = document.getElementById('rs-dag').value;
                    propertyData.landType = document.getElementById('land-type').value;
                } else if (postType === 'বাড়ি') {
                    propertyData.landArea = document.getElementById('land-area').value;
                    propertyData.price = document.getElementById('price').value;
                    propertyData.rsDag = document.getElementById('rs-dag').value;
                    propertyData.floors = document.getElementById('floors').value;
                    propertyData.rooms = document.getElementById('rooms').value;
                    propertyData.bathrooms = document.getElementById('bathrooms').value;
                    propertyData.kitchens = document.getElementById('kitchens').value;
                } else if (postType === 'ফ্ল্যাট') {
                    propertyData.area = document.getElementById('area-sq-ft').value + ' sq ft';
                    propertyData.price = document.getElementById('price-quantity').value + ' ' + document.getElementById('price-unit').value;
                    propertyData.floorNo = document.getElementById('floor-no').value;
                    propertyData.rooms = document.getElementById('rooms').value;
                    propertyData.bathrooms = document.getElementById('bathrooms').value;
                    propertyData.kitchens = document.getElementById('kitchens').value;
                } else if (postType === 'দোকান') {
                    propertyData.area = document.getElementById('area-sq-ft').value + ' sq ft';
                    propertyData.storeCount = document.getElementById('store-count').value;
                    propertyData.price = document.getElementById('price').value;
                    propertyData.rsDag = document.getElementById('rs-dag').value;
                }
            } else if (postCategory === 'ভাড়া') {
                propertyData.rentAmount = document.getElementById('rent-amount').value;
                propertyData.advanceAmount = document.getElementById('advance-amount').value;
                if (postType === 'বাড়ি' || postType === 'ফ্ল্যাট') {
                    propertyData.floors = document.getElementById('floors').value;
                    propertyData.rooms = document.getElementById('rooms').value;
                    propertyData.bathrooms = document.getElementById('bathrooms').value;
                    propertyData.kitchens = document.getElementById('kitchens').value;
                    propertyData.rentalType = document.getElementById('rental-type').value;
                }
            }
            
            // Location details are always collected
            propertyData.mouza = document.getElementById('mouza').value;
            propertyData.thana = document.getElementById('thana').value;
            propertyData.upazila = document.getElementById('upazila').value;
            propertyData.upazilaType = document.getElementById('upazila-type').value;
            propertyData.district = document.getElementById('district').value;
            propertyData.village = document.getElementById('village')?.value || '';
            propertyData.wardNo = document.getElementById('ward-no')?.value || '';

            // Add data to Firestore
            await db.collection("properties").add(propertyData);

            alert("প্রপার্টি সফলভাবে আপলোড করা হয়েছে!");
            propertyForm.reset();
        } catch (error) {
            console.error("ডেটা আপলোড করতে সমস্যা হয়েছে: ", error);
            alert("প্রপার্টি আপলোড ব্যর্থ হয়েছে।");
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'সাবমিট করুন';
        }
    });
});
