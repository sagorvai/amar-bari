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
            options = ['জমি', 'প্লট', 'বাড়ি', 'ফ্লাট', 'দোকান', 'অফিস'];
        } else if (category === 'ভাড়া') {
            options = ['বাড়ি', 'ফ্লাট', 'অফিস', 'দোকান'];
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
                    <label for="images">প্রপার্টি ছবি (সর্বোচ্চ ৩টি):</label>
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
        if (type === 'জমি' || type === 'প্লট') {
            descriptionHTML += `
                <div class="input-group">
                    <label for="road-width">চলাচলের রাস্তা (ফিট):</label>
                    <input type="number" id="road-width" required>
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
            if (type === 'প্লট') {
                 descriptionHTML += `
                    <div class="input-group">
                        <label for="plot-no">প্লট নং (ঐচ্ছিক):</label>
                        <input type="text" id="plot-no">
                    </div>
                 `;
            }
        } else if (type === 'বাড়ি' || type === 'ফ্লাট' || type === 'অফিস') {
             descriptionHTML += `
                <div class="input-group">
                    <label>পার্কিং সুবিধা:</label>
                    <div class="radio-group">
                        <input type="radio" id="parking-yes" name="parking" value="হ্যাঁ" required><label for="parking-yes">হ্যাঁ</label>
                        <input type="radio" id="parking-no" name="parking" value="না"><label for="parking-no">না</label>
                    </div>
                </div>
            `;
            
            if (type === 'বাড়ি' || type === 'ফ্লাট') {
                descriptionHTML += `
                    <div class="input-group">
                        <label for="road-width">চলাচলের রাস্তা (ফিট):</label>
                        <input type="number" id="road-width" required>
                    </div>
                    <div class="input-inline-group">
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
            
            if (type === 'বাড়ি') {
                 descriptionHTML += `
                    <div class="input-group">
                        <label for="kitchen">কিচেন সংখ্যা:</label>
                        <input type="number" id="kitchen" required>
                    </div>
                    <div class="input-group">
                        <label for="floors">তলা সংখ্যা (ঐচ্ছিক):</label>
                        <input type="number" id="floors">
                    </div>
                 `;
            } else if (type === 'ফ্লাট' || type === 'অফিস') {
                descriptionHTML += `
                    <div class="input-group">
                        <label for="floor-no">ফ্লোর নং:</label>
                        <input type="number" id="floor-no" required>
                    </div>
                `;
                if (type === 'ফ্লাট') {
                    descriptionHTML += `
                        <div class="input-group">
                            <label for="kitchen">কিচেন সংখ্যা:</label>
                            <input type="number" id="kitchen" required>
                        </div>
                    `;
                } else if (type === 'অফিস') {
                    descriptionHTML += `
                        <div class="input-group">
                            <label for="rooms">রুম সংখ্যা:</label>
                            <input type="number" id="rooms" required>
                        </div>
                        <div class="input-group">
                            <label for="bathrooms">বাথরুম সংখ্যা:</label>
                            <input type="number" id="bathrooms" required>
                        </div>
                    `;
                }
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
                            <option value="উভয়">উভয়</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label for="move-in-date">ওঠার তারিখ:</label>
                        <input type="date" id="move-in-date" required>
                    </div>
                `;
            }
            
        } else if (type === 'দোকান') {
             descriptionHTML += `
                <div class="input-group">
                    <label for="shop-count">দোকান সংখ্যা:</label>
                    <input type="number" id="shop-count" required>
                </div>
            `;
            // ভাড়ার জন্য ওঠার তারিখ
            if (category === 'ভাড়া') {
                 descriptionHTML += `
                    <div class="input-group">
                        <label for="move-in-date">ওঠার তারিখ:</label>
                        <input type="date" id="move-in-date" required>
                    </div>
                 `;
            }
        }
        
        descriptionHTML += '</div>'; // property-details-section বন্ধ
        fieldsHTML += descriptionHTML;
        
        // --- সেকশন ২: মালিকানা বিবরণ (শুধুমাত্র বিক্রয়ের জন্য) ---
        if (category === 'বিক্রয়') {
            let ownershipHTML = `
                <div class="form-section ownership-section">
                    <h3>মালিকানা বিবরণ</h3>
                    <div class="input-group">
                        <label for="donor-name">দাতার নাম:</label>
                        <input type="text" id="donor-name" required>
                    </div>
                    <div class="input-group">
                        <label for="dag-no-select">দাগ নং:</label>
                        <select id="dag-no-select" required>
                            <option value="">-- নির্বাচন করুন --</option>
                            <option value="RS">RS</option>
                            <option value="BRS">BRS</option>
                            <option value="নামজারি">নামজারি</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label for="mouja">মৌজা:</label>
                        <input type="text" id="mouja" required>
                    </div>
                    <div class="input-group">
                        <label for="khotian-image">সর্বশেষ খতিয়ানের ছবি (১টি):</label>
                        <input type="file" id="khotian-image" accept="image/*" required class="file-input-custom">
                        <div class="image-preview-area" id="khotian-preview-area"></div>
                    </div>
                    <div class="input-group">
                        <label for="sketch-image">প্রপার্টি স্কেস বা হস্ত নকশা ছবি (১টি):</label>
                        <input type="file" id="sketch-image" accept="image/*" required class="file-input-custom">
                        <div class="image-preview-area" id="sketch-preview-area"></div>
                    </div>
                </div>
            `;
            fieldsHTML += ownershipHTML;
        }

        // --- সেকশন ৩: পরিমাণ/দাম/ভাড়ার পর্ব ---
        let priceRentHTML = '<div class="form-section price-rent-section"><h3>পরিমাণ ও দাম / ভাড়া</h3>';
        
        // পরিমাণের ফিল্ড
        if (type === 'জমি' || type === 'প্লট') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="land-area">পরিমাণ:</label>
                    <input type="number" id="land-area" placeholder="পরিমাণ" required>
                    <select id="land-area-unit" class="unit-select" required>
                        <option value="শতক">শতক</option>
                        <option value="একর">একর</option>
                    </select>
                </div>
            `;
        } else if (type === 'বাড়ি') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="house-area">পরিমাণ:</label>
                    <input type="number" id="house-area" placeholder="পরিমাণ" required>
                    <select id="house-area-unit" class="unit-select" required>
                        <option value="শতক">শতক</option>
                        <option value="মোট">মোট (স্কয়ার ফিট)</option>
                    </select>
                </div>
            `;
        } else if (type === 'ফ্লাট') {
            priceRentHTML += `
                <div class="input-group">
                    <label for="flat-area-sqft">পরিমাণ (স্কয়ার ফিট):</label>
                    <input type="number" id="flat-area-sqft" required>
                </div>
            `;
        } else if (type === 'দোকান' || type === 'অফিস') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="commercial-area">পরিমাণ:</label>
                    <input type="number" id="commercial-area" placeholder="পরিমাণ" required>
                    <select id="commercial-area-unit" class="unit-select" required>
                        <option value="শতক">শতক</option>
                        <option value="স্কয়ার ফিট">স্কয়ার ফিট</option>
                    </select>
                </div>
            `;
        }
        
        // দাম/ভাড়ার ফিল্ড
        if (category === 'বিক্রয়') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="price">দাম:</label>
                    <input type="number" id="price" placeholder="মোট দাম" required>
                    <select id="price-unit" class="unit-select" required>
                        <option value="মোট">মোট (টাকায়)</option>
            `;
            if (type === 'জমি' || type === 'প্লট' || type === 'বাড়ি') {
                priceRentHTML += `<option value="শতক">শতক প্রতি (টাকায়)</option>`;
            }
            if (type === 'ফ্লাট' || type === 'দোকান' || type === 'অফিস') {
                 priceRentHTML += `<option value="স্কয়ার ফিট">স্কয়ার ফিট প্রতি (টাকায়)</option>`;
            }
            priceRentHTML += `
                    </select>
                </div>
            `;
        } else if (category === 'ভাড়া') {
            priceRentHTML += `
                <div class="input-group">
                    <label for="monthly-rent">মাসিক ভাড়া (টাকায়):</label>
                    <input type="number" id="monthly-rent" required>
                </div>
                <div class="input-group">
                    <label for="advance">এডভান্স / জামানত (টাকায়):</label>
                    <input type="number" id="advance" placeholder="টাকায়" required>
                </div>
            `;
        }
        
        priceRentHTML += '</div>'; // price-rent-section বন্ধ
        fieldsHTML += priceRentHTML;

        // --- সেকশন ৪: ঠিকানা পর্ব ---
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
                    <label for="google-map">Google ম্যাপ লোকেশন (পিন করুন):</label>
                    <input type="text" id="google-map-pin" placeholder="ম্যাপ থেকে পিন করার অপশন থাকবে">
                    <p class="small-text">বর্তমানে টেক্সট ইনপুট হিসেবে রাখা হলো।</p>
                </div>
            </div>
        `;
        fieldsHTML += addressHTML;

        // --- সেকশন ৫: যোগাযোগ পর্ব ---
        let contactHTML = `
            <div class="form-section contact-section">
                <h3>যোগাযোগের তথ্য</h3>
                <div class="input-group">
                    <label for="primary-phone">ফোন নম্বর (প্রোফাইল থেকে অটো-এড):</label>
                    <input type="tel" id="primary-phone" value="017xxxxxxxx" required>
                    <p class="small-text">প্রোফাইলে থাকা নাম্বারটি অটো এড হয়ে যাবে, চাইলে আপনি ইডিট করতে পারবেন।</p>
                </div>
                <div class="input-group">
                    <label for="secondary-phone">অতিরিক্ত ফোন নম্বর (ঐচ্ছিক):</label>
                    <input type="tel" id="secondary-phone" placeholder="অন্য কোনো নম্বর থাকলে">
                </div>
            </div>
        `;
        fieldsHTML += contactHTML;

        // --- সেকশন ৬: বিস্তারিত ---
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
            imageInput.addEventListener('change', (e) => handleImagePreview(e, 'image-preview-area'));
        }
        
        // মালিকানা বিবরণের ছবি প্রিভিউ
        const khotianImageInput = document.getElementById('khotian-image');
        if (khotianImageInput) {
            khotianImageInput.addEventListener('change', (e) => handleImagePreview(e, 'khotian-preview-area', 1));
        }
        const sketchImageInput = document.getElementById('sketch-image');
        if (sketchImageInput) {
            sketchImageInput.addEventListener('change', (e) => handleImagePreview(e, 'sketch-preview-area', 1));
        }
    }
    
    // Function to generate Sub-Address Fields (উপজেলা/সিটি কর্পোরেশন)
    function generateSubAddressFields(areaType) {
        const subAddressFieldsContainer = document.getElementById('sub-address-fields');
        let subFieldsHTML = '';
        
        if (areaType === 'উপজেলা') {
             subFieldsHTML = `
                <div class="input-group">
                    <label for="upazila-name">উপজেলা:</label>
                    <input type="text" id="upazila-name" required>
                </div>
                <div class="input-group">
                    <label for="union-name">ইউনিয়ন:</label>
                    <input type="text" id="union-name" required>
                </div>
                <div class="input-group">
                    <label for="thana-name">থানা:</label>
                    <input type="text" id="thana-name" required>
                </div>
                <div class="input-group">
                    <label for="ward-no">ওয়ার্ড নং (ঐচ্ছিক):</label>
                    <input type="number" id="ward-no">
                </div>
                <div class="input-group">
                    <label for="village-name">গ্রাম:</label>
                    <input type="text" id="village-name" required>
                </div>
                <div class="input-group">
                    <label for="road-name">রোড:</label>
                    <input type="text" id="road-name" required>
                </div>
            `;
        } else if (areaType === 'সিটি কর্পোরেশন') {
             subFieldsHTML = `
                <div class="input-group">
                    <label for="city-corp-name">সিটি কর্পোরেশন:</label>
                    <input type="text" id="city-corp-name" required>
                </div>
                <div class="input-group">
                    <label for="thana-name">থানা:</label>
                    <input type="text" id="thana-name" required>
                </div>
                <div class="input-group">
                    <label for="ward-no">ওয়ার্ড নং:</label>
                    <input type="number" id="ward-no" required>
                </div>
                <div class="input-group">
                    <label for="village-name">গ্রাম:</label>
                    <input type="text" id="village-name" required>
                </div>
                <div class="input-group">
                    <label for="road-name">রোড:</label>
                    <input type="text" id="road-name" required>
                </div>
            `;
        } else {
            subFieldsHTML = '';
        }
        
        subAddressFieldsContainer.innerHTML = subFieldsHTML;
    }

    // Function to handle Image Preview (SMART IMAGE PREVIEW)
    function handleImagePreview(event, previewAreaId, maxFiles = 3) {
        const previewArea = document.getElementById(previewAreaId);
        previewArea.innerHTML = ''; // Clear previous previews
        const files = event.target.files;
        
        if (files.length > maxFiles) {
            alert(`আপনি সর্বোচ্চ ${maxFiles}টি ছবি আপলোড করতে পারবেন।`);
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
                    const previewWrapper = document.createElement('div');
                    previewWrapper.className = 'image-preview-wrapper';
                    
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    img.className = 'preview-image';
                    
                    const removeButton = document.createElement('button');
                    removeButton.className = 'remove-image-btn';
                    removeButton.innerHTML = '&times;'; // HTML entity for multiplication sign (cross)
                    removeButton.style.backgroundColor = 'red';
                    removeButton.style.color = 'white';
                    
                    // রিমুভ লজিক
                    removeButton.addEventListener('click', () => {
                        const dt = new DataTransfer();
                        const currentFiles = Array.from(event.target.files);
                        const fileIndex = currentFiles.findIndex(f => f.name === file.name && f.size === file.size);
                        
                        if (fileIndex !== -1) {
                            currentFiles.splice(fileIndex, 1);
                            currentFiles.forEach(f => dt.items.add(f));
                            event.target.files = dt.files;
                            previewWrapper.remove();
                            if (dt.files.length === 0) {
                                previewArea.innerHTML = '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>';
                            }
                        }
                    });
                    
                    previewWrapper.appendChild(img);
                    previewWrapper.appendChild(removeButton);
                    previewArea.appendChild(previewWrapper);
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
            const khotianFile = document.getElementById('khotian-image')?.files?.[0];
            const sketchFile = document.getElementById('sketch-image')?.files?.[0];

            if (!imageFiles || imageFiles.length === 0) {
                 alert("অনুগ্রহ করে কমপক্ষে একটি প্রপার্টি ছবি আপলোড করুন।");
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

            // ডেটা সংগ্রহের জন্য একটি সহায়ক ফাংশন যা ইনপুট আইডি থেকে মান নেয়
            const getValue = (id) => document.getElementById(id)?.value;

            // মূল ডেটা অবজেক্ট
            const propertyData = {
                category,
                type,
                title: getValue('property-title'),
                description: getValue('description'),
                primaryPhone: getValue('primary-phone'),
                secondaryPhone: getValue('secondary-phone'),
                googleMapPin: getValue('google-map-pin'),
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


            // --- অতিরিক্ত ক্যাটাগরি/টাইপ-ভিত্তিক ফিল্ড যোগ করা ---
            
            // বিক্রয়ের জন্য
            if (category === 'বিক্রয়') {
                propertyData.price = getValue('price');
                propertyData.priceUnit = getValue('price-unit');
                
                // মালিকানা বিবরণ
                propertyData.owner = {
                    donorName: getValue('donor-name'),
                    dagNoType: getValue('dag-no-select'),
                    mouja: getValue('mouja')
                };
                
                // প্রপার্টি টাইপ অনুসারে
                if (type === 'জমি' || type === 'প্লট') {
                    propertyData.landArea = getValue('land-area');
                    propertyData.landAreaUnit = getValue('land-area-unit');
                    propertyData.roadWidth = getValue('road-width');
                    propertyData.landType = getValue('land-type');
                    if (type === 'প্লট') {
                        propertyData.plotNo = getValue('plot-no');
                    }
                } else if (type === 'বাড়ি' || type === 'ফ্লাট' || type === 'অফিস') {
                    propertyData.parking = document.querySelector('input[name="parking"]:checked')?.value;
                    
                    if (type === 'বাড়ি') {
                        propertyData.rooms = getValue('rooms');
                        propertyData.bathrooms = getValue('bathrooms');
                        propertyData.kitchen = getValue('kitchen');
                        propertyData.roadWidth = getValue('road-width');
                        propertyData.floors = getValue('floors');
                        propertyData.houseArea = getValue('house-area');
                        propertyData.houseAreaUnit = getValue('house-area-unit');
                    } else if (type === 'ফ্লাট') {
                        propertyData.rooms = getValue('rooms');
                        propertyData.bathrooms = getValue('bathrooms');
                        propertyData.kitchen = getValue('kitchen');
                        propertyData.roadWidth = getValue('road-width');
                        propertyData.areaSqft = getValue('flat-area-sqft');
                        propertyData.floorNo = getValue('floor-no');
                    } else if (type === 'দোকান' || type === 'অফিস') {
                        propertyData.commercialArea = getValue('commercial-area');
                        propertyData.commercialAreaUnit = getValue('commercial-area-unit');
                        
                        if (type === 'দোকান') {
                             propertyData.shopCount = getValue('shop-count');
                        } else if (type === 'অফিস') {
                            propertyData.rooms = getValue('rooms');
                            propertyData.bathrooms = getValue('bathrooms');
                            propertyData.floorNo = getValue('floor-no');
                        }
                    }
                } else if (type === 'দোকান' || type === 'অফিস') {
                    propertyData.commercialArea = getValue('commercial-area');
                    propertyData.commercialAreaUnit = getValue('commercial-area-unit');
                    
                    if (type === 'দোকান') {
                         propertyData.shopCount = getValue('shop-count');
                    }
                }
            } 
            
            // ভাড়ার জন্য
            else if (category === 'ভাড়া') {
                propertyData.monthlyRent = getValue('monthly-rent');
                propertyData.advance = getValue('advance');
                propertyData.moveInDate = getValue('move-in-date');
                
                 if (type === 'বাড়ি' || type === 'ফ্লাট' || type === 'অফিস') {
                    propertyData.parking = document.querySelector('input[name="parking"]:checked')?.value;
                    propertyData.commercialArea = getValue('commercial-area');
                    propertyData.commercialAreaUnit = getValue('commercial-area-unit');
                    
                    if (type === 'বাড়ি' || type === 'ফ্লাট') {
                         propertyData.roadWidth = getValue('road-width');
                         propertyData.rooms = getValue('rooms');
                         propertyData.bathrooms = getValue('bathrooms');
                         propertyData.kitchen = getValue('kitchen');
                         propertyData.rentType = getValue('rent-type');
                         
                         if (type === 'বাড়ি') {
                             propertyData.floors = getValue('floors');
                             propertyData.houseArea = getValue('house-area');
                             propertyData.houseAreaUnit = getValue('house-area-unit');
                         } else if (type === 'ফ্লাট') {
                             propertyData.floorNo = getValue('floor-no');
                             propertyData.areaSqft = getValue('flat-area-sqft');
                         }
                    } else if (type === 'অফিস') {
                        propertyData.floorNo = getValue('floor-no');
                        propertyData.rooms = getValue('rooms');
                        propertyData.bathrooms = getValue('bathrooms');
                    }
                } else if (type === 'দোকান') {
                    propertyData.commercialArea = getValue('commercial-area');
                    propertyData.commercialAreaUnit = getValue('commercial-area-unit');
                    propertyData.shopCount = getValue('shop-count');
                }
            }
            
            // --- ফাইল আপলোড এবং URL সংগ্রহ ---
            
            const uploadFile = async (file, path) => {
                const storageRef = storage.ref(`${path}/${Date.now()}_${file.name}`);
                const snapshot = await storageRef.put(file);
                return await snapshot.ref.getDownloadURL();
            };

            // ১. প্রপার্টি ছবি (১-৩টি)
            const imageUrls = [];
            for (const file of imageFiles) {
                const downloadURL = await uploadFile(file, 'property_images');
                imageUrls.push(downloadURL);
            }
            propertyData.images = imageUrls;
            
            // ২. মালিকানা বিবরণের ছবি (যদি বিক্রয়ের জন্য হয়)
            if (category === 'বিক্রয়') {
                if (khotianFile) {
                    propertyData.owner.khotianImageUrl = await uploadFile(khotianFile, 'ownership_docs/khotian');
                }
                if (sketchFile) {
                    propertyData.owner.sketchImageUrl = await uploadFile(sketchFile, 'ownership_docs/sketch');
                }
            }


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
        const postLinkSidebar = document.getElementById('post-link-sidebar-menu');
        const loginLinkSidebar = document.getElementById('login-link-sidebar');
        const propertyFormDisplay = document.getElementById('property-form');
        const primaryPhoneInput = document.getElementById('primary-phone');
        
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
             if (primaryPhoneInput) {
                primaryPhoneInput.value = '01712345678'; // ডামি প্রোফাইল নাম্বার
                primaryPhoneInput.disabled = false; // ব্যবহারকারী চাইলে ইডিট করতে পারবে
             }
             

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
            if (primaryPhoneInput) {
                primaryPhoneInput.value = '';
                primaryPhoneInput.disabled = true;
            }
        }
    });
});
