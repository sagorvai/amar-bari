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

        // ফর্মের স্টাইল ও গ্রুপিং-এর জন্য সুন্দর ক্লাস ব্যবহার করা হয়েছে
        typeSelectHTML = `
            <div class="form-section category-selection-section">
                <h3>প্রপার্টির ধরন</h3>
                <div class="input-group">
                    <label for="post-type">প্রপার্টির ধরন নির্বাচন করুন:</label>
                    <select id="post-type" required class="full-width-select">
                        <option value="">-- নির্বাচন করুন --</option>
                        ${options.map(option => `<option value="${option}">${option}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="specific-fields-container"></div>
        `;
        dynamicFieldsContainer.innerHTML = typeSelectHTML;

        const postTypeSelect = document.getElementById('post-type');
        if (postTypeSelect) {
            postTypeSelect.addEventListener('change', (e) => generateSpecificFields(category, e.target.value));
        }
    }

    // Function to generate specific input fields based on type (ডাইনামিক ফর্মের মূল লজিক)
    function generateSpecificFields(category, type) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        let fieldsHTML = '';
        
        if (!type) {
             specificFieldsContainer.innerHTML = '';
             return;
        }

        // --- সেকশন ১: প্রপার্টির বিবরণ (ছবি, শিরোনাম, রুম ইত্যাদি) ---
        let descriptionHTML = `
            <div class="form-section property-details-section">
                <h3>${type} ${category}ের বিবরণ</h3>

                <div class="input-group image-upload-group">
                    <label for="images">ছবি আপলোড (কমপক্ষে ১টি, সর্বোচ্চ ৩টি):</label>
                    <input type="file" id="images" accept="image/*" multiple required class="file-input-custom">
                    <div class="image-preview-area" id="image-preview-area">
                        <p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>
                    </div>
                </div>
                <div class="input-group">
                    <label for="property-title">শিরোনাম (যেমন: শান্ত পরিবেশে আধুনিক ফ্লাট):</label>
                    <input type="text" id="property-title" required>
                </div>
        `;
        
        // টাইপ-ভিত্তিক ফিল্ডসমূহ যুক্ত করা
        if (type === 'জমি') {
            descriptionHTML += `
                <div class="input-group input-inline-unit">
                    <label for="land-size">জমির পরিমাণ:</label>
                    <input type="number" id="land-size" placeholder="পরিমাণ" required>
                    <select id="land-size-unit" class="unit-select" required>
                        <option value="শতক">শতক</option>
                        <option value="একর">একর</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="road-width">চলাচলের রাস্তা (ফিট):</label>
                    <input type="number" id="road-width" required>
                </div>
                <div class="input-group">
                    <label for="rs-dag">RS দাগ নম্বর:</label>
                    <input type="text" id="rs-dag" required>
                </div>
                <div class="input-group">
                    <label for="mouja">মৌজা:</label>
                    <input type="text" id="mouja" required>
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
        } else if (type === 'বাড়ি' || type === 'ফ্লাট') {
             descriptionHTML += `
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="rooms">রুম সংখ্যা:</label>
                        <input type="number" id="rooms" required>
                    </div>
                    <div class="input-group">
                        <label for="bathrooms">বাথরুম সংখ্যা:</label>
                        <input type="number" id="bathrooms" required>
                    </div>
                    <div class="input-group">
                        <label for="kitchen">কিচেন সংখ্যা:</label>
                        <input type="number" id="kitchen" required>
                    </div>
                </div>
                <div class="input-group">
                    <label for="road-width">চলাচলের রাস্তা (ফিট):</label>
                    <input type="number" id="road-width" required>
                </div>
                <div class="input-group">
                    <label>পার্কিং সুবিধা:</label>
                    <div class="radio-group">
                        <input type="radio" id="parking-yes" name="parking" value="হ্যাঁ" required><label for="parking-yes">হ্যাঁ</label>
                        <input type="radio" id="parking-no" name="parking" value="না"><label for="parking-no">না</label>
                    </div>
                </div>
                
            `;
            // বাড়ি এবং ফ্লাটের জন্য আলাদা ফিল্ড
            if (type === 'বাড়ি') {
                 descriptionHTML += `
                    <div class="input-group">
                        <label for="land-area-house">জমির পরিমাণ:</label>
                        <input type="text" id="land-area-house" placeholder="যেমন: ৫ শতক" required>
                    </div>
                    <div class="input-group">
                        <label for="rs-dag">RS দাগ নম্বর:</label>
                        <input type="text" id="rs-dag" required>
                    </div>
                    <div class="input-group">
                        <label for="floors">তলা সংখ্যা (ঐচ্ছিক):</label>
                        <input type="number" id="floors">
                    </div>
                    <div class="input-group">
                        <label for="mouja">মৌজা:</label>
                        <input type="text" id="mouja" required>
                    </div>
                `;
            } else if (type === 'ফ্লাট') {
                 descriptionHTML += `
                    <div class="input-group">
                        <label for="area-sqft">পরিমাণ (স্কয়ার ফিট):</label>
                        <input type="number" id="area-sqft" required>
                    </div>
                    <div class="input-group">
                        <label for="floor-no">ফ্লোর নং:</label>
                        <input type="number" id="floor-no" required>
                    </div>
                    <div class="input-group">
                        <label for="mouja">মৌজা:</label>
                        <input type="text" id="mouja" required>
                    </div>
                `;
            }
            
            // ভাড়ার জন্য অতিরিক্ত ফিল্ড
            if (category === 'ভাড়া') {
                descriptionHTML += `
                    <div class="input-group">
                        <label for="rent-type">ভাড়ার ধরন:</label>
                        <select id="rent-type" required>
                            <option value="">-- নির্বাচন করুন --</option>
                            <option value="ফ্যামিলি">ফ্যামিলি</option>
                            <option value="ব্যাচেলর">ব্যাচেলর</option>
                        </select>
                    </div>
                `;
            }
            
        } else if (type === 'দোকান') {
             descriptionHTML += `
                <div class="input-group input-inline-unit">
                    <label for="shop-size">পরিমাণ:</label>
                    <input type="number" id="shop-size" placeholder="পরিমাণ" required>
                    <select id="shop-size-unit" class="unit-select" required>
                        <option value="শতক">শতক</option>
                        <option value="স্কয়ার ফিট">স্কয়ার ফিট</option>
                    </select>
                </div>
                <div class="input-group">
                    <label for="shop-count">দোকান সংখ্যা:</label>
                    <input type="number" id="shop-count" required>
                </div>
            `;
            // বিক্রয়ের জন্য RS দাগ ও মৌজা যুক্ত করা
            if (category === 'বিক্রয়') {
                descriptionHTML += `
                    <div class="input-group">
                        <label for="rs-dag">RS দাগ নম্বর:</label>
                        <input type="text" id="rs-dag" required>
                    </div>
                    <div class="input-group">
                        <label for="mouja">মৌজা:</label>
                        <input type="text" id="mouja" required>
                    </div>
                `;
            }
        }
        
        descriptionHTML += '</div>'; // property-details-section বন্ধ

        fieldsHTML += descriptionHTML;

        // --- সেকশন ২: দাম/ভাড়ার পর্ব ---
        let priceRentHTML = '<div class="form-section price-rent-section"><h3>দাম / ভাড়ার পর্ব</h3>';

        if (category === 'বিক্রয়') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="price">বিক্রয় মূল্য:</label>
                    <input type="number" id="price" placeholder="মোট দাম" required>
                    <select id="price-unit" class="unit-select" required>
                        <option value="মোট">মোট (টাকায়)</option>
            `;
            if (type === 'জমি') {
                priceRentHTML += `<option value="শতক">শতক প্রতি (টাকায়)</option>`;
            } else if (type === 'ফ্লাট' || type === 'দোকান') {
                 priceRentHTML += `<option value="স্কয়ার ফিট">স্কয়ার ফিট প্রতি (টাকায়)</option>`;
            }
            priceRentHTML += `
                    </select>
                </div>
            `;
        } else if (category === 'ভাড়া') {
            priceRentHTML += `
                <div class="input-group">
                    <label for="rent-amount">মাসিক ভাড়া (টাকায়):</label>
                    <input type="number" id="rent-amount" required>
                </div>
                <div class="input-group">
                    <label for="advance">এডভান্স / জামানত (ঐচ্ছিক):</label>
                    <input type="number" id="advance" placeholder="টাকায়">
                </div>
            `;
        }
        
        priceRentHTML += '</div>'; // price-rent-section বন্ধ
        fieldsHTML += priceRentHTML;

        // --- সেকশন ৩: ঠিকানা পর্ব ---
        let addressHTML = `
            <div class="form-section address-section">
                <h3>ঠিকানা ও অবস্থান</h3>
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="division">বিভাগ:</label>
                        <input type="text" id="division" required>
                    </div>
                    <div class="input-group">
                        <label for="district">জেলা:</label>
                        <input type="text" id="district" required>
                    </div>
                </div>
                
                <div class="input-group">
                    <label for="area-type-select">এলাকার ধরন:</label>
                    <select id="area-type-select" required>
                        <option value="">-- নির্বাচন করুন --</option>
                        <option value="উপজেলা">উপজেলা</option>
                        <option value="সিটি কর্পোরেশন">সিটি কর্পোরেশন</option>
                    </select>
                </div>
                
                <div id="sub-address-fields">
                    </div>
                
                <div class="input-group google-map-pinning">
                    <label for="google-map-pin">Google ম্যাপ লোকেশন:</label>
                    <p class="small-text">সরাসরি ম্যাপ থেকে লোকেশন পিন করুন (উন্নত ফিচার - আপাতত ঐচ্ছিক লিঙ্ক ব্যবহার করুন)</p>
                    <input type="url" id="google-map" placeholder="Google Maps থেকে লিঙ্ক পেস্ট করুন (ঐচ্ছিক)">
                </div>
            </div>
        `;
        fieldsHTML += addressHTML;

        // --- সেকশন ৪: যোগাযোগ পর্ব ---
        let contactHTML = `
            <div class="form-section contact-section">
                <h3>যোগাযোগের তথ্য</h3>
                <div class="input-group">
                    <label for="primary-phone">ফোন নম্বর (প্রোফাইল থেকে অটো-এড):</label>
                    <input type="tel" id="primary-phone" value="017xxxxxxxx" disabled>
                    <p class="small-text">বর্তমানে প্রোফাইল থেকে নাম্বার লোড হচ্ছে না। আপনাকে লগইন করে এটি লোড করতে হবে।</p>
                </div>
                <div class="input-group">
                    <label for="secondary-phone">অতিরিক্ত ফোন নম্বর (ঐচ্ছিক):</label>
                    <input type="tel" id="secondary-phone" placeholder="অন্য কোনো নম্বর থাকলে">
                </div>
            </div>
        `;
        fieldsHTML += contactHTML;

        // --- সেকশন ৫: বিস্তারিত ---
        fieldsHTML += `
            <div class="input-group description-final-group">
                <label for="description">সম্পূর্ণ বিস্তারিত বিবরণ:</label>
                <textarea id="description" rows="6" placeholder="আপনার প্রপার্টির বিস্তারিত তথ্য, সুবিধা এবং বিশেষত্ব লিখুন।" required></textarea>
            </div>
        `;
        
        // সব ফিল্ড কনটেইনারে যুক্ত করা
        specificFieldsContainer.innerHTML = fieldsHTML;
        
        // ডাইনামিক সাব-ফিল্ড হ্যান্ডেলিং
        const areaTypeSelect = document.getElementById('area-type-select');
        if(areaTypeSelect) {
             areaTypeSelect.addEventListener('change', (e) => generateSubAddressFields(e.target.value));
        }
        
        // Image Preview Handler
        const imageInput = document.getElementById('images');
        if (imageInput) {
            imageInput.addEventListener('change', handleImagePreview);
        }
    }
    
    // Function to generate Sub-Address Fields (উপজেলা/সিটি কর্পোরেশন)
    function generateSubAddressFields(areaType) {
        const subAddressFieldsContainer = document.getElementById('sub-address-fields');
        let subFieldsHTML = '';
        
        if (areaType === 'উপজেলা') {
             subFieldsHTML = `
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="upazila-name">উপজেলা:</label>
                        <input type="text" id="upazila-name" required>
                    </div>
                    <div class="input-group">
                        <label for="union-name">ইউনিয়ন:</label>
                        <input type="text" id="union-name" required>
                    </div>
                </div>
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="thana-name">থানা:</label>
                        <input type="text" id="thana-name" required>
                    </div>
                    <div class="input-group">
                        <label for="ward-no">ওয়ার্ড নং (ঐচ্ছিক):</label>
                        <input type="number" id="ward-no">
                    </div>
                </div>
                <div class="input-group">
                    <label for="village-name">গ্রাম/মহল্লা:</label>
                    <input type="text" id="village-name" required>
                </div>
                <div class="input-group">
                    <label for="road-name">রোড/ব্লক (ঐচ্ছিক):</label>
                    <input type="text" id="road-name">
                </div>
            `;
        } else if (areaType === 'সিটি কর্পোরেশন') {
             subFieldsHTML = `
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="city-corp-name">সিটি কর্পোরেশন:</label>
                        <input type="text" id="city-corp-name" required>
                    </div>
                    <div class="input-group">
                        <label for="thana-name">থানা:</label>
                        <input type="text" id="thana-name" required>
                    </div>
                </div>
                <div class="input-group">
                    <label for="ward-no">ওয়ার্ড নং:</label>
                    <input type="number" id="ward-no" required>
                </div>
                <div class="input-group">
                    <label for="village-name">মহল্লা/এলাকা:</label>
                    <input type="text" id="village-name" required>
                </div>
                <div class="input-group">
                    <label for="road-name">রোড/ব্লক (ঐচ্ছিক):</label>
                    <input type="text" id="road-name">
                </div>
            `;
        } else {
            subFieldsHTML = '';
        }
        
        subAddressFieldsContainer.innerHTML = subFieldsHTML;
    }

    // Function to handle Image Preview
    function handleImagePreview(event) {
        const previewArea = document.getElementById('image-preview-area');
        previewArea.innerHTML = '';
        const files = event.target.files;
        
        if (files.length > 3) {
            alert("আপনি সর্বোচ্চ ৩টি ছবি আপলোড করতে পারবেন।");
            event.target.value = ''; // Clear selection
            previewArea.innerHTML = '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>';
            return;
        }

        if (files.length === 0) {
            previewArea.innerHTML = '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>';
            return;
        }

        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-image';
                    previewArea.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        }
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

            const imageFiles = document.getElementById('images')?.files;

            if (!imageFiles || imageFiles.length === 0) {
                 alert("অনুগ্রহ করে কমপক্ষে একটি ছবি আপলোড করুন।");
                 submitBtn.disabled = false;
                 submitBtn.textContent = 'সাবমিট করুন';
                 return;
            }
            if (imageFiles.length > 3) {
                 alert("আপনি সর্বোচ্চ ৩টি ছবি আপলোড করতে পারবেন।");
                 submitBtn.disabled = false;
                 submitBtn.textContent = 'সাবমিট করুন';
                 return;
            }


            // ডেটা সংগ্রহ (আপডেট করা ডাইনামিক ফিল্ড অনুযায়ী)
            const category = document.getElementById('post-category').value;
            const type = document.getElementById('post-type')?.value;
            const phoneNumberStatic = document.getElementById('phone-number')?.value;
            const googleMapStatic = document.getElementById('google-map')?.value;

            // ডেটা সংগ্রহের জন্য একটি সহায়ক ফাংশন যা ইনপুট আইডি থেকে মান নেয়
            const getValue = (id) => document.getElementById(id)?.value;

            // মূল ডেটা অবজেক্ট
            const propertyData = {
                category,
                type,
                title: getValue('property-title'),
                description: getValue('description'),
                phoneNumber: getValue('primary-phone') || phoneNumberStatic, // প্রোফাইল নাম্বার না পেলে স্ট্যাটিকটা নিবে
                secondaryPhone: getValue('secondary-phone'),
                googleMap: googleMapStatic,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user.uid,
                status: 'pending',

                // ঠিকানা ডেটা
                location: {
                    division: getValue('division'),
                    district: getValue('district'),
                    areaType: getValue('area-type-select'),
                    village: getValue('village-name'),
                    road: getValue('road-name'),
                    thana: getValue('thana-name'),
                    wardNo: getValue('ward-no'),
                }
            };
            
            // ঠিকানা উপ-ফিল্ড যুক্ত করা
            if (propertyData.location.areaType === 'উপজেলা') {
                propertyData.location.upazila = getValue('upazila-name');
                propertyData.location.union = getValue('union-name');
            } else if (propertyData.location.areaType === 'সিটি কর্পোরেশন') {
                propertyData.location.cityCorporation = getValue('city-corp-name');
            }


            // অতিরিক্ত ক্যাটাগরি/টাইপ-ভিত্তিক ফিল্ড যোগ করা
            if (category === 'বিক্রয়') {
                propertyData.price = getValue('price');
                propertyData.priceUnit = getValue('price-unit');
                
                if (type === 'জমি') {
                    propertyData.landSize = getValue('land-size');
                    propertyData.landSizeUnit = getValue('land-size-unit');
                    propertyData.roadWidth = getValue('road-width');
                    propertyData.rsDag = getValue('rs-dag');
                    propertyData.mouja = getValue('mouja');
                    propertyData.landType = getValue('land-type');
                } else if (type === 'বাড়ি' || type === 'ফ্লাট') {
                    propertyData.rooms = getValue('rooms');
                    propertyData.bathrooms = getValue('bathrooms');
                    propertyData.kitchen = getValue('kitchen');
                    propertyData.roadWidth = getValue('road-width');
                    propertyData.parking = document.querySelector('input[name="parking"]:checked')?.value;
                    
                    if (type === 'বাড়ি') {
                        propertyData.landArea = getValue('land-area-house');
                        propertyData.rsDag = getValue('rs-dag');
                        propertyData.floors = getValue('floors');
                        propertyData.mouja = getValue('mouja');
                    } else if (type === 'ফ্লাট') {
                        propertyData.areaSqft = getValue('area-sqft');
                        propertyData.floorNo = getValue('floor-no');
                        propertyData.mouja = getValue('mouja');
                    }
                } else if (type === 'দোকান') {
                    propertyData.shopSize = getValue('shop-size');
                    propertyData.shopSizeUnit = getValue('shop-size-unit');
                    propertyData.shopCount = getValue('shop-count');
                    propertyData.rsDag = getValue('rs-dag');
                    propertyData.mouja = getValue('mouja');
                }
            } else if (category === 'ভাড়া') {
                propertyData.rentAmount = getValue('rent-amount');
                propertyData.advance = getValue('advance') || null;

                if (type === 'বাড়ি' || type === 'ফ্লাট') {
                    propertyData.roadWidth = getValue('road-width');
                    propertyData.parking = document.querySelector('input[name="parking"]:checked')?.value;
                    propertyData.floorNo = getValue('floor-no'); 
                    propertyData.rooms = getValue('rooms');
                    propertyData.bathrooms = getValue('bathrooms');
                    propertyData.kitchen = getValue('kitchen');
                    propertyData.rentType = getValue('rent-type');
                    
                    if (type === 'বাড়ি') {
                        propertyData.floors = getValue('floors'); // ঐচ্ছিক তলা সংখ্যা
                    }
                } else if (type === 'দোকান') {
                     propertyData.shopSize = getValue('shop-size');
                     propertyData.shopSizeUnit = getValue('shop-size-unit');
                     propertyData.shopCount = getValue('shop-count');
                }
            }
            
            // ইমেজ আপলোড
            const imageUrls = [];
            for (const file of imageFiles) {
                const storageRef = storage.ref(`property_images/${Date.now()}_${file.name}`);
                const snapshot = await storageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();
                imageUrls.push(downloadURL);
            }
            propertyData.images = imageUrls;


            await db.collection("properties").add(propertyData);

            alert("প্রপার্টি সফলভাবে আপলোড করা হয়েছে!");
            propertyForm.reset();
            dynamicFieldsContainer.innerHTML = '<p class="placeholder-text">ক্যাটাগরি নির্বাচন করার পরে এখানে ফর্মের বাকি অংশ আসবে।</p>'; 
            document.getElementById('image-preview-area').innerHTML = '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>';


        } catch (error) {
            console.error("ডেটা আপলোড করতে সমস্যা হয়েছে: ", error);
            alert("প্রপার্টি আপলোড ব্যর্থ হয়েছে: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'সাবমিট করুন';
        }
    });

    // Auth state change handler for UI updates (লগইন স্ট্যাটাস চেক করে ফর্ম দেখাবে)
    auth.onAuthStateChanged(user => {
        const authWarningMessage = document.getElementById('auth-warning-message');
        const postLinkSidebar = document.getElementById('post-link');
        const loginLinkSidebar = document.getElementById('login-link-sidebar');
        const propertyFormDisplay = document.getElementById('property-form');
        
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
            // লগইন থাকলে ফর্ম দেখাও
            if (propertyFormDisplay) propertyFormDisplay.style.display = 'block';
            if (authWarningMessage) authWarningMessage.style.display = 'none';
            
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout;
            }
            
            // TODO: প্রোফাইল থেকে ফোন নম্বর লোড করার লজিক এখানে যুক্ত করতে হবে (যেমন: user.phoneNumber)
            // আপাতত একটি ডামি নম্বর রাখা হলো
             const primaryPhoneInput = document.getElementById('primary-phone');
             if (primaryPhoneInput) primaryPhoneInput.value = '01712345678'; // প্রোফাইল নাম্বার
             const staticPhoneInput = document.getElementById('phone-number');
             if (staticPhoneInput) staticPhoneInput.value = '01712345678'; // স্ট্যাটিক ইনপুটও পূরণ করা হলো

        } else {
            // লগইন না থাকলে ফর্ম লুকিয়ে ওয়ার্নিং দেখাও
            if (propertyFormDisplay) propertyFormDisplay.style.display = 'none';
            if (authWarningMessage) authWarningMessage.style.display = 'block';
            
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
        }
    });
});
