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

    // ক্যাটাগরি নির্বাচনের উপর ভিত্তি করে বিক্রয় বা ভাড়া ড্রপডাউন দেখাবে
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

    // বিক্রয় ড্রপডাউন থেকে নির্বাচনের উপর ভিত্তি করে ইনপুট ফিল্ড তৈরি
    sellTypeSelect.addEventListener('change', function() {
        const selectedType = sellTypeSelect.value;
        dynamicFieldsContainer.innerHTML = '';

        if (selectedType === 'জমি') {
            dynamicFieldsContainer.innerHTML = `
                <h3>জমি বিক্রয়ের বিবরণ</h3>
                <div class="input-group">
                    <label>ছবি (সর্বোচ্চ ৩টি):</label>
                    <input type="file" id="image-upload" accept="image/*" multiple required>
                </div>
                <div class="input-group">
                    <label for="title">শিরোনাম:</label>
                    <input type="text" id="title" required>
                </div>
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
        } else if (selectedType === 'বাড়ি') {
            dynamicFieldsContainer.innerHTML = `
                <h3>বাড়ি বিক্রয়ের বিবরণ</h3>
                <div class="input-group">
                    <label>ছবি (সর্বোচ্চ ৩টি):</label>
                    <input type="file" id="image-upload" accept="image/*" multiple required>
                </div>
                <div class="input-group">
                    <label for="title">শিরোনাম:</label>
                    <input type="text" id="title" required>
                </div>
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
        } else if (selectedType === 'ফ্ল্যাট') {
            dynamicFieldsContainer.innerHTML = `
                <h3>ফ্ল্যাট বিক্রয়ের বিবরণ</h3>
                <div class="input-group">
                    <label>ছবি (সর্বোচ্চ ৩টি):</label>
                    <input type="file" id="image-upload" accept="image/*" multiple required>
                </div>
                <div class="input-group">
                    <label for="title">শিরোনাম:</label>
                    <input type="text" id="title" required>
                </div>
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
        } else if (selectedType === 'দোকান') {
            dynamicFieldsContainer.innerHTML = `
                <h3>দোকান বিক্রয়ের বিবরণ</h3>
                <div class="input-group">
                    <label>ছবি (সর্বোচ্চ ৩টি):</label>
                    <input type="file" id="image-upload" accept="image/*" multiple required>
                </div>
                <div class="input-group">
                    <label for="title">শিরোনাম:</label>
                    <input type="text" id="title" required>
                </div>
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
        }
    });

    // ভাড়া ড্রপডাউন থেকে নির্বাচনের উপর ভিত্তি করে ইনপুট ফিল্ড তৈরি
    rentTypeSelect.addEventListener('change', function() {
        const selectedType = rentTypeSelect.value;
        dynamicFieldsContainer.innerHTML = '';

        if (selectedType === 'বাড়ি' || selectedType === 'ফ্ল্যাট') {
            dynamicFieldsContainer.innerHTML = `
                <h3>বাড়ি/ফ্ল্যাট ভাড়ার বিবরণ</h3>
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
        } else if (selectedType === 'দোকান') {
            dynamicFieldsContainer.innerHTML = `
                <h3>দোকান ভাড়ার বিবরণ</h3>
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
        }
    });

    // ফর্ম সাবমিট হলে ডেটা Firebase-এ সংরক্ষণ করবে
    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // ফর্মের ধরন ও ডেটা সংগ্রহ
        const postCategory = postCategorySelect.value;
        const postType = postCategory === 'বিক্রয়' ? sellTypeSelect.value : rentTypeSelect.value;
        const title = document.getElementById('title').value;
        const location = document.getElementById('upazila').value + ', ' + document.getElementById('district').value;
        const imageFile = document.getElementById('image-upload').files[0];
        const description = document.getElementById('description').value;
        const phoneNumber = document.getElementById('phone-number').value;
        const googleMapLink = document.getElementById('google-map').value;

        // ছবির ডেটা Firebase Storage-এ আপলোড
        const storageRef = storage.ref();
        const imageRef = storageRef.child(`images/${Date.now()}-${imageFile.name}`);
        await imageRef.put(imageFile);
        const imageUrl = await imageRef.getDownloadURL();

        // ডেটাবেজে সংরক্ষণের জন্য প্রপার্টি অবজেক্ট
        let propertyData = {
            category: postCategory,
            type: postType,
            title: title,
            location: location,
            image: imageUrl,
            description: description,
            phoneNumber: phoneNumber,
            googleMapLink: googleMapLink,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // নির্দিষ্ট প্রপার্টির প্রকারভেদে অতিরিক্ত ডেটা যুক্ত করা
        if (postCategory === 'বিক্রয়') {
            if (postType === 'জমি') {
                propertyData.area = document.getElementById('area-quantity').value + ' ' + document.getElementById('area-unit').value;
                propertyData.price = document.getElementById('price-quantity').value + ' ' + document.getElementById('price-unit').value;
                propertyData.rsDag = document.getElementById('rs-dag').value;
                propertyData.landType = document.getElementById('land-type').value;
                propertyData.mouza = document.getElementById('mouza').value;
                propertyData.thana = document.getElementById('thana').value;
                propertyData.upazila = document.getElementById('upazila').value;
                propertyData.upazilaType = document.getElementById('upazila-type').value;
                propertyData.district = document.getElementById('district').value;
            } else if (postType === 'বাড়ি') {
                propertyData.landArea = document.getElementById('land-area').value;
                propertyData.price = document.getElementById('price').value;
                propertyData.rsDag = document.getElementById('rs-dag').value;
                propertyData.floors = document.getElementById('floors').value;
                propertyData.rooms = document.getElementById('rooms').value;
                propertyData.bathrooms = document.getElementById('bathrooms').value;
                propertyData.kitchens = document.getElementById('kitchens').value;
                propertyData.mouza = document.getElementById('mouza').value;
                propertyData.thana = document.getElementById('thana').value;
                propertyData.upazila = document.getElementById('upazila').value;
                propertyData.upazilaType = document.getElementById('upazila-type').value;
                propertyData.district = document.getElementById('district').value;
            }
            // ... অন্যান্য বিক্রয় প্রকারের জন্য একই রকম ডেটা যুক্ত হবে
        } else if (postCategory === 'ভাড়া') {
            if (postType === 'বাড়ি' || postType === 'ফ্ল্যাট') {
                propertyData.rentAmount = document.getElementById('rent-amount').value;
                propertyData.advanceAmount = document.getElementById('advance-amount').value;
                propertyData.floors = document.getElementById('floors').value;
                propertyData.rooms = document.getElementById('rooms').value;
                propertyData.bathrooms = document.getElementById('bathrooms').value;
                propertyData.kitchens = document.getElementById('kitchens').value;
                propertyData.rentalType = document.getElementById('rental-type').value;
                propertyData.village = document.getElementById('village').value;
                propertyData.wardNo = document.getElementById('ward-no').value;
                propertyData.thana = document.getElementById('thana').value;
                propertyData.upazila = document.getElementById('upazila').value;
                propertyData.upazilaType = document.getElementById('upazila-type').value;
                propertyData.district = document.getElementById('district').value;
            }
            // ... অন্যান্য ভাড়া প্রকারের জন্য একই রকম ডেটা যুক্ত হবে
        }

        // Firestore-এ ডেটা সংরক্ষণ
        db.collection("properties").add(propertyData)
            .then(() => {
                alert("প্রপার্টি সফলভাবে আপলোড করা হয়েছে!");
                propertyForm.reset(); // ফর্ম রিসেট
            })
            .catch((error) => {
                console.error("ডেটা আপলোড করতে সমস্যা হয়েছে: ", error);
                alert("প্রপার্টি আপলোড ব্যর্থ হয়েছে।");
            });
    });
});