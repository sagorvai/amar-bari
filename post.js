// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');
    
    // Global array to hold main image files for smart preview
    let mainImageFiles = []; 
    let khatianFile = null;
    let sketchFile = null;

    // Helper to generate a standard input group
    const inputGroup = (id, label, type = 'text', required = true, placeholder = '', value = '', optional = false) => `
        <div class="input-group">
            <label for="${id}">${label}${optional ? ' (ঐচ্ছিক)' : ''}:</label>
            <input type="${type}" id="${id}" name="${id}" ${required && !optional ? 'required' : ''} placeholder="${placeholder}" value="${value}">
        </div>
    `;

    // Helper to generate a radio group (for Yes/No, Family/Bachelor)
    const radioGroup = (name, label, options, required = true) => `
        <div class="input-group">
            <label>${label}:</label>
            <div class="radio-group">
                ${options.map((opt, index) => `
                    <input type="radio" id="${name}-${opt.value}" name="${name}" value="${opt.value}" ${required ? 'required' : ''} ${index === 0 ? 'checked' : ''}>
                    <label for="${name}-${opt.value}">${opt.label}</label>
                `).join('')}
            </div>
        </div>
    `;

    // Helper to generate a select/dropdown
    const selectGroup = (id, label, options, required = true) => `
        <div class="input-group">
            <label for="${id}">${label}:</label>
            <select id="${id}" name="${id}" class="full-width-select" ${required ? 'required' : ''}>
                <option value="">-- নির্বাচন করুন --</option>
                ${options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
            </select>
        </div>
    `;

    // ------------------------------------
    // START: IMAGE PREVIEW & REMOVAL LOGIC (Smart Preview)
    // ------------------------------------
    
    // (এই অংশটি পূর্বের আপডেটের মতো হুবহু কাজ করবে, যা আপনার স্মার্ট প্রিভিউ এবং রিমুভ লজিক বজায় রাখবে)
    
    /**
     * রিমুভ বাটন সহ ছবি প্রিভিউ এবং ফাইল অ্যারে আপডেট করে।
     * @param {Array<File>} filesArray - ফাইল অবজেক্টের অ্যারে
     * @param {HTMLElement} container - যেখানে প্রিভিউ দেখানো হবে
     * @param {string} fileInputId - ফাইল ইনপুটের ID
     * @param {boolean} isMultiple - একাধিক ফাইল (true) নাকি একক ফাইল (false)
     */
    function renderImagePreviews(fileArray, container, fileInputId, isMultiple = true) {
        container.innerHTML = fileArray.length > 0 ? '' : '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>';
        
        fileArray.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item-container';
                previewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Property Image" class="preview-image">
                    <button type="button" class="remove-image-btn" data-index="${index}">&times;</button>
                `;
                container.appendChild(previewItem);
                
                // Add removal listener
                previewItem.querySelector('.remove-image-btn').addEventListener('click', () => {
                    if (isMultiple) {
                        mainImageFiles.splice(index, 1);
                        renderImagePreviews(mainImageFiles, container, fileInputId, true);
                    } else {
                        // Single file removal
                        if (fileInputId === 'latest-khatian-image') khatianFile = null;
                        if (fileInputId === 'property-sketch-image') sketchFile = null;
                        document.getElementById(fileInputId).value = ''; // Clear file input
                        renderImagePreviews([], container, fileInputId, false); // Clear preview
                    }
                });
            };
            reader.readAsDataURL(file);
        });
    }

    // Main Image Input Handler
    function handleMainImageInput(event) {
        const files = Array.from(event.target.files);
        
        // Clear previous selection if new files are added
        mainImageFiles = []; 
        
        if (files.length > 3) {
            alert('সর্বোচ্চ ৩টি ছবি আপলোড করা যাবে।');
            event.target.value = '';
            return;
        }

        mainImageFiles = files;
        renderImagePreviews(mainImageFiles, document.getElementById('main-images-preview-area'), 'property-images', true);
        event.target.value = ''; // Clear input for next selection (optional)
    }

    // Single Document Input Handler
    function handleDocumentInput(event, fileVarName, previewContainerId) {
        const file = event.target.files[0];
        if (!file) return;

        if (fileVarName === 'khatianFile') khatianFile = file;
        if (fileVarName === 'sketchFile') sketchFile = file;

        renderImagePreviews([file], document.getElementById(previewContainerId), event.target.id, false);
    }
    
    // ------------------------------------
    // END: IMAGE PREVIEW & REMOVAL LOGIC
    // ------------------------------------

    // Function to generate the secondary property type dropdown
    function generateTypeDropdown(category) {
        let options = [];

        if (category === 'বিক্রয়') {
            options = ['জমি', 'প্লট', 'বাড়ি', 'ফ্লাট', 'দোকান', 'অফিস'];
        } else if (category === 'ভাড়া') {
            options = ['বাড়ি', 'ফ্লাট', 'অফিস', 'দোকান'];
        }

        let typeSelectHTML = `
            <div class="form-section category-selection-section">
                <h3>প্রপার্টির ধরন</h3>
                ${selectGroup('post-type', 'প্রপার্টির ধরন নির্বাচন করুন', options)}
            </div>
            <div id="specific-fields-container"></div>
        `;
        dynamicFieldsContainer.innerHTML = typeSelectHTML;

        const postTypeSelect = document.getElementById('post-type');
        if (postTypeSelect) {
            postTypeSelect.addEventListener('change', (e) => generateSpecificFields(category, e.target.value));
        }
    }

    // Function to generate Sub-Address Fields (উপজেলা/সিটি কর্পোরেশন)
    function generateSubAddressFields(areaType) {
        const subAddressFieldsContainer = document.getElementById('sub-address-fields');
        let subFieldsHTML = '';
        
        if (areaType === 'উপজেলা') {
             subFieldsHTML = `
                ${inputGroup('upazila-name', 'উপজেলা')}
                ${inputGroup('thana-name', 'থানা')}
                ${inputGroup('union-name', 'ইউনিয়ন')}
                ${inputGroup('road-name', 'রোড')}
                ${inputGroup('village-name', 'গ্রাম')}
                ${inputGroup('ward-no', 'ওয়ার্ড নং', 'number', false, '', '', true)}
            `;
        } else if (areaType === 'সিটি কর্পোরেশন') {
             subFieldsHTML = `
                ${inputGroup('city-corp-name', 'সিটি কর্পোরেশন')}
                ${inputGroup('thana-name', 'থানা')}
                ${inputGroup('ward-no', 'ওয়ার্ড নং', 'number')}
                ${inputGroup('road-name', 'রোড')}
                ${inputGroup('village-name', 'গ্রাম')}
            `;
        }
        
        subAddressFieldsContainer.innerHTML = subFieldsHTML;
    }


    // Function to generate the core dynamic fields
    function generateSpecificFields(category, type) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        let fieldsHTML = '';
        const isSale = (category === 'বিক্রয়');
        
        if (!type) {
             specificFieldsContainer.innerHTML = '';
             return;
        }

        // --- সেকশন ১: প্রপার্টি বিবরণ (সকল টাইপের জন্য প্রযোজ্য) ---
        let descriptionHTML = `
            <div class="form-section property-images-section">
                <h3>প্রপার্টি ছবি</h3>
                <div class="input-group">
                    <input type="file" id="property-images" name="property-images" accept="image/*" multiple required style="display: none;">
                    <label for="property-images" class="submit-button" style="display: block; width: fit-content; margin-bottom: 10px; cursor: pointer;">ছবি নির্বাচন করুন (সর্বোচ্চ ৩টি)</label>
                    <div class="image-preview-area" id="main-images-preview-area">
                         <p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>
                    </div>
                </div>
                ${inputGroup('property-title', 'শিরোনাম')}
        `;
        
        // --- টাইপ-ভিত্তিক ফিল্ডসমূহ ---
        if (type === 'জমি' || type === 'প্লট') {
            // কমন: জমি ও প্লট
            descriptionHTML += `
                ${inputGroup('access-road-ft', 'চলাচলের রাস্তা (ফিট)', 'number')}
                ${selectGroup('land-type', 'জমির ধরন', ['আবাসিক', 'বিলান', 'বাস্ত', 'ভিটা', 'ডোবা', 'পুকুর'])}
            `;
            // প্লটের জন্য অতিরিক্ত:
            if (type === 'প্লট') {
                descriptionHTML += inputGroup('plot-no', 'প্লট নং', 'text', false, '', '', true); // ঐচ্ছিক
            }
        } else if (type === 'বাড়ি' || type === 'ফ্লাট' || type === 'অফিস') {
            // কমন: বাড়ি/ফ্লাট/অফিস
            if (type !== 'অফিস') {
                descriptionHTML += inputGroup('access-road-ft', 'চলাচলের রাস্তা', 'number');
            }
            descriptionHTML += radioGroup('parking', 'পার্কিং', [{label: 'হ্যাঁ', value: 'হ্যাঁ'}, {label: 'না', value: 'না'}]);
            
            if (type === 'বাড়ি' && isSale) { // বাড়ি বিক্রয়: তলা (ঐচ্ছিক)
                 descriptionHTML += inputGroup('floors', 'তলা', 'number', false, '', '', true);
            } else if (type === 'বাড়ি' && !isSale) { // বাড়ি ভাড়া: ফ্লোর নং (ঐচ্ছিক)
                 descriptionHTML += inputGroup('floor-no', 'ফ্লোর নং', 'number', false, '', '', true);
            } else if (type === 'ফ্লাট' || type === 'অফিস') { // ফ্লাট/অফিস: ফ্লোর নং
                 descriptionHTML += inputGroup('floor-no', 'ফ্লোর নং', 'number');
            }
            
            if (type === 'বাড়ি' || type === 'ফ্লাট') {
                 descriptionHTML += `
                    <div class="input-inline-group">
                        ${inputGroup('room-count', 'রুম সংখ্যা', 'number')}
                        ${inputGroup('bathroom-count', 'বাথরুম', 'number')}
                        ${inputGroup('kitchen-count', 'কিচেন', 'number')}
                    </div>
                 `;
            } else if (type === 'অফিস') {
                 descriptionHTML += `
                    <div class="input-inline-group">
                        ${inputGroup('room-count', 'রুম সংখ্যা', 'number')}
                        ${inputGroup('bathroom-count', 'বাথরুম', 'number')}
                    </div>
                 `;
            }
            
        } else if (type === 'দোকান') {
             descriptionHTML += inputGroup('shop-count', 'দোকান সংখ্যা', 'number');
        }

        // --- মালিকানা বিবরন (শুধুমাত্র বিক্রয়ের জন্য) ---
        if (isSale) {
            descriptionHTML += `
                </div> 
                <div class="form-section ownership-section">
                    <h3>মালিকানা বিবরন</h3>
                    ${inputGroup('owner-name', 'দাতার নাম')}
                    <div class="input-inline-group">
                        ${selectGroup('dag-type', 'দাগ নং (ধরন)', ['RS', 'BRS', 'নামজারি'])}
                        ${inputGroup('dag-no', 'দাগ নং (নম্বর)')}
                    </div>
                    ${inputGroup('mouja', 'মৌজা')}

                    <div class="input-group">
                        <label for="latest-khatian-image">সর্বশেষ খতিয়ানের ছবি (১টি):</label>
                        <input type="file" id="latest-khatian-image" name="latest-khatian-image" accept="image/*" required style="display: none;">
                        <label for="latest-khatian-image" class="submit-button" style="display: block; width: fit-content; margin-bottom: 10px; cursor: pointer;">খতিয়ানের ছবি আপলোড</label>
                        <div class="image-preview-area" id="latest-khatian-preview-area">
                             <p class="placeholder-text">এখানে খতিয়ানের ছবি দেখা যাবে।</p>
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label for="property-sketch-image">প্রপার্টি স্কেস বা হস্ত নকশা ছবি (১টি):</label>
                        <input type="file" id="property-sketch-image" name="property-sketch-image" accept="image/*" required style="display: none;">
                        <label for="property-sketch-image" class="submit-button" style="display: block; width: fit-content; margin-bottom: 10px; cursor: pointer;">স্কেচ আপলোড</label>
                        <div class="image-preview-area" id="property-sketch-preview-area">
                             <p class="placeholder-text">এখানে স্কেচ দেখা যাবে।</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
             descriptionHTML += `</div>`; // description section close for RENT
        }

        // --- পরিমাণ/দাম/ভাড়া ---
        let priceRentHTML = '<div class="form-section price-rent-section"><h3>পরিমাণ / দাম / ভাড়া</h3>';
        
        let quantityField = '';
        let priceLabel = isSale ? 'দাম' : 'ভাড়া';
        let priceUnitOptions = [];
        let quantityUnitOptions = [];
        
        // Unit Logic
        if (type === 'জমি' || type === 'প্লট') {
            quantityUnitOptions = ['শতক', 'একর'];
            priceUnitOptions = ['শতক', 'একর', 'মোট'];
        } else if (type === 'বাড়ি') {
            quantityUnitOptions = ['শতক', 'মোট'];
            priceUnitOptions = ['শতক', 'মোট'];
        } else if (type === 'ফ্লাট') { // পরিমাণ (স্কয়ার ফিট) - দাম (স্কয়ার ফিট/মোট)
            quantityField = `<input type="number" id="quantity-value" name="quantity-value" placeholder="পরিমাণ (স্কয়ার ফিট)" required>`;
            priceUnitOptions = ['স্কয়ার ফিট', 'মোট'];
        } else if (type === 'দোকান' || type === 'অফিস') {
            quantityUnitOptions = ['শতক', 'স্কয়ার ফিট'];
            priceUnitOptions = ['শতক', 'স্কয়ার ফিট', 'মোট'];
        }
        
        // Quantity Field HTML
        if (type !== 'ফ্লাট') {
            quantityField = `<input type="number" id="quantity-value" name="quantity-value" placeholder="পরিমাণ" required><select id="quantity-unit" name="quantity-unit" class="unit-select" required>${quantityUnitOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}</select>`;
        } else {
            // Flat: Quantity is only Square Feet (input only)
            quantityField = `<input type="number" id="quantity-value" name="quantity-value" placeholder="পরিমাণ (স্কয়ার ফিট)" required style="width: 100%;">`;
        }


        priceRentHTML += `
             <div class="input-group input-inline-unit">
                <label for="quantity-value">পরিমাণ:</label>
                ${quantityField}
            </div>
        `;

        // Price/Rent Field HTML
        priceRentHTML += `
            <div class="input-group input-inline-unit">
                <label for="price-rent-value">${priceLabel}:</label>
                <input type="number" id="price-rent-value" name="price-rent-value" placeholder="${priceLabel} এর পরিমাণ" required>
                ${selectGroup('price-rent-unit', 'ইউনিট', priceUnitOptions)}
            </div>
        `;
        
        // Rent Specific Fields
        if (!isSale) {
            priceRentHTML += `
                ${inputGroup('monthly-rent', 'মাসিক ভাড়া', 'number')}
                ${inputGroup('advance-amount', 'এডভান্স', 'number', false, 'এডভান্সের পরিমাণ')}
                ${type !== 'দোকান' ? radioGroup('rent-type', 'ভাড়ার ধরন', [{label: 'ফ্যামিলি', value: 'ফ্যামিলি'}, {label: 'ব্যাচেলর', value: 'ব্যাচেলর'}, {label: 'উভয়', value: 'উভয়'}]) : ''}
                ${inputGroup('entry-date', 'ওঠার তারিখ', 'date')}
            `;
        }
        
        priceRentHTML += '</div>';
        fieldsHTML += priceRentHTML;

        // --- ঠিকানা ও অবস্থান ---
        let addressHTML = `
            <div class="form-section address-section">
                <h3>ঠিকানা ও অবস্থান</h3>
                <div class="input-inline-group">
                    ${inputGroup('division', 'বিভাগ')}
                    ${inputGroup('district', 'জেলা')}
                </div>
                ${selectGroup('area-type-select', 'এলাকার ধরন', ['উপজেলা', 'সিটি কর্পোরেশন'])}
                
                <div id="sub-address-fields">
                    </div>
                
                <div class="input-group google-map-pinning">
                    <label for="map-location">Google ম্যাপ লোকেশন:</label>
                    <input type="text" id="map-location" placeholder="23.8103, 90.4125 (ম্যাপ থেকে পিন)" required>
                    <p class="small-text">সরাসরি ম্যাপ থেকে লোকেশন পিন করে এখানে অক্ষাংশ ও দ্রাঘিমাংশ দিন।</p>
                </div>
            </div>
        `;
        fieldsHTML += addressHTML;

        // --- যোগাযোগ --- (ফোন নম্বর এডিট করার অপশন সহ)
        let contactHTML = `
            <div class="form-section contact-section">
                <h3>যোগাযোগের তথ্য</h3>
                <div class="input-group">
                    <label for="primary-phone">ফোন নম্বর (প্রোফাইল থেকে অটো-এড):</label>
                    <input type="tel" id="primary-phone" value="" required> 
                    <p class="small-text">প্রোফাইলে থাকা নাম্বারটি অটো এড হয়ে যাবে, আপনি চাইলে ইডিট করতে পারবেন।</p>
                </div>
                ${inputGroup('secondary-phone', 'অতিরিক্ত ফোন নম্বর (ঐচ্ছিক)', 'tel', false, 'অন্য একটি নাম্বার')}
            </div>
        `;
        fieldsHTML += contactHTML;

        // --- বিস্তারিত ---
        fieldsHTML += `
            <div class="form-section description-final-group">
                <h3>বিস্তারিত</h3>
                <div class="input-group">
                    <label for="description">সম্পূর্ণ বিস্তারিত বিবরণ:</label>
                    <textarea id="description" rows="6" placeholder="আপনার প্রপার্টির বিস্তারিত তথ্য, সুবিধা এবং বিশেষত্ব লিখুন।" required></textarea>
                </div>
            </div>
        `;
        
        // সব ফিল্ড কনটেইনারে যুক্ত করা
        specificFieldsContainer.innerHTML = fieldsHTML;
        
        // ইভেন্ট লিসেনার যুক্ত করা
        document.getElementById('property-images').addEventListener('change', handleMainImageInput);
        if (isSale) {
            document.getElementById('latest-khatian-image').addEventListener('change', (e) => handleDocumentInput(e, 'khatianFile', 'latest-khatian-preview-area'));
            document.getElementById('property-sketch-image').addEventListener('change', (e) => handleDocumentInput(e, 'sketchFile', 'property-sketch-preview-area'));
        }

        const areaTypeSelect = document.getElementById('area-type-select');
        if(areaTypeSelect) {
             areaTypeSelect.addEventListener('change', (e) => generateSubAddressFields(e.target.value));
        }
        
    }


    // প্রাথমিক ক্যাটাগরি নির্বাচনের ইভেন্ট
    postCategorySelect.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        // রিসেট গ্লোবাল ফাইল স্টোরেজ
        mainImageFiles = [];
        khatianFile = null;
        sketchFile = null;
        
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
                return;
            }

            // 1. Validation for main images
            if (mainImageFiles.length === 0 || mainImageFiles.length > 3) {
                 alert("অনুগ্রহ করে কমপক্ষে একটি এবং সর্বোচ্চ ৩টি ছবি আপলোড করুন।");
                 return;
            }
            
            const category = document.getElementById('post-category').value;
            const type = document.getElementById('post-type')?.value;

            // 2. Validation for documents (Sale only)
            if (category === 'বিক্রয়') {
                if (!khatianFile || !sketchFile) {
                    alert('বিক্রয় ক্যাটাগরির জন্য সর্বশেষ খতিয়ানের ছবি এবং প্রপার্টি স্কেস বা হস্ত নকশা ছবি অবশ্যই আপলোড করতে হবে।');
                    return;
                }
            }


            // ডেটা সংগ্রহের জন্য একটি সহায়ক ফাংশন যা ইনপুট আইডি থেকে মান নেয়
            const getValue = (id) => document.getElementById(id)?.value;
            const getParsedValue = (id, type) => {
                const val = getValue(id);
                if (!val) return null;
                return type === 'number' ? parseFloat(val) : val;
            }
            const getRadioValue = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value;


            // মূল ডেটা অবজেক্ট
            const propertyData = {
                category,
                type,
                title: getValue('property-title'),
                description: getValue('description'),
                primaryPhone: getValue('primary-phone'), // Editable
                secondaryPhone: getValue('secondary-phone'),
                mapLocation: getValue('map-location'),
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                userId: user.uid,
                status: 'pending',
                
                // ঠিকানা ডেটা
                location: {
                    division: getValue('division'),
                    district: getValue('district'),
                    areaType: getValue('area-type-select'),
                    thana: getValue('thana-name'),
                    wordNo: getValue('ward-no'),
                    road: getValue('road-name'),
                    village: getValue('village-name'),
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
                propertyData.price = getParsedValue('price-rent-value', 'number');
                propertyData.priceUnit = getValue('price-rent-unit');
                propertyData.quantityValue = getParsedValue('quantity-value', 'number');
                propertyData.quantityUnit = getValue('quantity-unit');
                
                // Ownership Info
                propertyData.ownerName = getValue('owner-name');
                propertyData.dagType = getValue('dag-type');
                propertyData.dagNo = getValue('dag-no');
                propertyData.mouja = getValue('mouja');
                
                // Type Specific
                if (type === 'জমি' || type === 'প্লট') {
                    propertyData.accessRoadFt = getParsedValue('access-road-ft', 'number');
                    propertyData.landType = getValue('land-type');
                    if (type === 'প্লট') propertyData.plotNo = getValue('plot-no');
                } else if (type === 'বাড়ি' || type === 'ফ্লাট' || type === 'অফিস') {
                    propertyData.accessRoadFt = getParsedValue('access-road-ft', 'number');
                    propertyData.parking = getRadioValue('parking');
                    propertyData.roomCount = getParsedValue('room-count', 'number');
                    propertyData.bathroomCount = getParsedValue('bathroom-count', 'number');
                    propertyData.kitchenCount = getParsedValue('kitchen-count', 'number');
                    propertyData.floorNo = getParsedValue('floor-no', 'number'); // Flat/Office, House Rent
                    if (type === 'বাড়ি' && category === 'বিক্রয়') propertyData.floors = getParsedValue('floors', 'number'); // House Sale
                } else if (type === 'দোকান') {
                    propertyData.shopCount = getParsedValue('shop-count', 'number');
                }

            } else if (category === 'ভাড়া') {
                propertyData.monthlyRent = getParsedValue('monthly-rent', 'number');
                propertyData.advance = getParsedValue('advance-amount', 'number');
                propertyData.rentType = getRadioValue('rent-type');
                propertyData.entryDate = getValue('entry-date');
                propertyData.quantityValue = getParsedValue('quantity-value', 'number');
                propertyData.quantityUnit = getValue('quantity-unit');

                 if (type === 'বাড়ি' || type === 'ফ্লাট' || type === 'অফিস') {
                    propertyData.accessRoadFt = getParsedValue('access-road-ft', 'number');
                    propertyData.parking = getRadioValue('parking');
                    propertyData.roomCount = getParsedValue('room-count', 'number');
                    propertyData.bathroomCount = getParsedValue('bathroom-count', 'number');
                    propertyData.kitchenCount = getParsedValue('kitchen-count', 'number');
                    propertyData.floorNo = getParsedValue('floor-no', 'number'); 
                } else if (type === 'দোকান') {
                     propertyData.shopCount = getParsedValue('shop-count', 'number');
                }
            }
            
            // 3. ইমেজ এবং ডকুমেন্টস আপলোড
            const propertyId = db.collection('properties').doc().id;
            const storagePath = `properties/${propertyId}`;
            
            const uploadFile = async (file, path) => {
                const storageRef = storage.ref(path);
                const snapshot = await storageRef.put(file);
                return snapshot.ref.getDownloadURL();
            };

            const mainImagePromises = mainImageFiles.map((file, index) => 
                uploadFile(file, `${storagePath}/main_images/image_${index}`)
            );
            propertyData.mainImageURLs = await Promise.all(mainImagePromises);
            
            if (category === 'বিক্রয়') {
                propertyData.khatianURL = await uploadFile(khatianFile, `${storagePath}/documents/khatian`);
                propertyData.sketchURL = await uploadFile(sketchFile, `${storagePath}/documents/sketch`);
            }

            // 4. ডেটাবেসে সংরক্ষণ
            await db.collection("properties").doc(propertyId).set(propertyData);

            alert("প্রপার্টি সফলভাবে আপলোড করা হয়েছে!");
            propertyForm.reset();
            // UI ও ফাইল রিসেট করা
            mainImageFiles = []; khatianFile = null; sketchFile = null;
            document.getElementById('dynamic-fields-container').innerHTML = '<p class="placeholder-text">ক্যাটাগরি নির্বাচন করার পরে এখানে ফর্মের বাকি অংশ আসবে।</p>'; 
            
        } catch (error) {
            console.error("ডেটা আপলোড করতে সমস্যা হয়েছে: ", error);
            alert("প্রপার্টি আপলোড ব্যর্থ হয়েছে: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'পোস্ট করুন';
        }
    });

    // Auth state change handler for UI updates (লগইন স্ট্যাটাস চেক করে ফর্ম দেখাবে)
    auth.onAuthStateChanged(user => {
        const authWarningMessage = document.getElementById('auth-warning-message');
        const loginLinkSidebar = document.getElementById('login-link-sidebar');
        const propertyFormDisplay = document.getElementById('property-form');
        const primaryPhoneInput = document.getElementById('primary-phone');

        // লগআউট হ্যান্ডেলার
        const handleLogout = async () => {
            try {
                await auth.signOut();
                alert('সফলভাবে লগআউট করা হয়েছে!');
                window.location.reload();
            } catch (error) {
                console.error("লগআউট ব্যর্থ হয়েছে:", error);
                alert("লগআউট ব্যর্থ হয়েছে।");
            }
        };

        if (user) {
            if (propertyFormDisplay) propertyFormDisplay.style.display = 'block';
            if (authWarningMessage) authWarningMessage.style.display = 'none';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.innerHTML = '<i class="material-icons">lock_open</i> লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout;
            }
            
            // ফোন নম্বর লোড (ডামি)
            if (primaryPhoneInput) {
                // TODO: এখানে Firebase Auth বা Firestore থেকে আসল ফোন নম্বর লোড করতে হবে
                primaryPhoneInput.value = '01712345678'; 
            }

        } else {
            if (propertyFormDisplay) propertyFormDisplay.style.display = 'none';
            if (authWarningMessage) authWarningMessage.style.display = 'block';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.innerHTML = '<i class="material-icons">lock_open</i> লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
            if (primaryPhoneInput) primaryPhoneInput.value = '';
        }
    });
});
