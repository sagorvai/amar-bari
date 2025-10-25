// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const documentImagesContainer = document.getElementById('document-images-container');
    const latestKhatianInput = document.getElementById('latest-khatian-image');
    const propertySketchInput = document.getElementById('property-sketch-image');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');
    const mainImagesInput = document.getElementById('property-images');
    const mainImagesPreviewContainer = document.getElementById('main-images-preview-container');

    // ** Image Handling Logic (Smart Preview & Removal) **
    let mainImageFiles = []; // Array to hold the main File objects
    let khatianFile = null;
    let sketchFile = null;

    /**
     * স্মার্ট ইমেজ প্রিভিউ এবং রিমুভাল লজিক
     * @param {Array|File} filesArray - ফাইল অবজেক্টের অ্যারে (main images) অথবা একক ফাইল অবজেক্ট (documents)
     * @param {HTMLElement} container - যেখানে প্রিভিউ দেখানো হবে
     * @param {boolean} isMultiple - এটি একাধিক ফাইল (true) নাকি একক ফাইল (false)
     */
    function renderImagePreviews(filesArray, container, isMultiple = true) {
        container.innerHTML = '';
        container.style.display = 'flex'; // Default to flex for both single/multiple, style handles the rest

        if (filesArray.length === 0 && isMultiple) {
            container.style.display = 'flex';
            return;
        }

        if (isMultiple) {
            filesArray.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewItem = document.createElement('div');
                    previewItem.className = 'image-preview-item';
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="Property Image">
                        <button type="button" class="remove-image-btn" data-index="${index}">&times;</button>
                    `;
                    container.appendChild(previewItem);
                    
                    // Add removal listener
                    previewItem.querySelector('.remove-image-btn').addEventListener('click', () => {
                        mainImageFiles.splice(index, 1);
                        // Re-render to update indices and view
                        renderImagePreviews(mainImageFiles, mainImagesPreviewContainer, true);
                    });
                };
                reader.readAsDataURL(file);
            });
        } else {
            // Single image preview (for documents)
            if (filesArray) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    container.innerHTML = `
                        <img src="${e.target.result}" alt="Document Image">
                        <button type="button" class="remove-image-btn single-remove-btn">&times;</button>
                    `;
                    container.style.display = 'block';
                    
                    // Add removal listener for single file
                    container.querySelector('.single-remove-btn').addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (container.id === 'latest-khatian-image-preview') {
                            khatianFile = null;
                            latestKhatianInput.value = '';
                        } else if (container.id === 'property-sketch-image-preview') {
                            sketchFile = null;
                            propertySketchInput.value = '';
                        }
                        container.innerHTML = '';
                        container.style.display = 'block';
                    });
                };
                reader.readAsDataURL(filesArray);
            } else {
                container.innerHTML = '';
                container.style.display = 'block';
            }
        }
    }

    mainImagesInput.addEventListener('change', function(event) {
        const files = Array.from(event.target.files);
        const newFilesCount = files.length;

        if (mainImageFiles.length + newFilesCount > 3) {
            alert('সর্বোচ্চ ৩টি ছবি আপলোড করা যাবে।');
            event.target.value = ''; // Clear the input
            return;
        }

        mainImageFiles = mainImageFiles.concat(files);
        
        renderImagePreviews(mainImageFiles, mainImagesPreviewContainer, true);
        event.target.value = ''; // Clear input for next selection
    });
    
    latestKhatianInput.addEventListener('change', function(event) {
        khatianFile = event.target.files[0];
        renderImagePreviews(khatianFile, document.getElementById('latest-khatian-image-preview'), false);
    });

    propertySketchInput.addEventListener('change', function(event) {
        sketchFile = event.target.files[0];
        renderImagePreviews(sketchFile, document.getElementById('property-sketch-image-preview'), false);
    });

    // ** Dynamic Form Generation Functions **

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
                <div class="input-group">
                    <label for="post-type">প্রপার্টির ধরন নির্বাচন করুন:</label>
                    <select id="post-type" required class="full-width-select">
                        <option value="">-- নির্বাচন করুন --</option>
                        ${options.map(option => `<option value="${option}">${option}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="specific-fields-container">
                </div>
        `;

        dynamicFieldsContainer.innerHTML = typeSelectHTML;

        // Add listener for the new type dropdown
        document.getElementById('post-type').addEventListener('change', function() {
            const type = this.value;
            if (type) {
                generateSpecificFields(category, type);
            } else {
                document.getElementById('specific-fields-container').innerHTML = '';
                documentImagesContainer.style.display = 'none'; // Hide document uploads if no type selected
            }
        });
    }

    function generateOwnershipSection() {
        return `
            <div class="form-section ownership-section">
                <h3>মালিকানা বিবরন</h3>
                <div class="input-group">
                    <label for="owner-name">দাতার নাম:</label>
                    <input type="text" id="owner-name" name="owner-name" required>
                </div>
                <div class="input-group inline-group" style="display: flex; justify-content: space-between;">
                    <div style="width: 30%;">
                        <label for="dag-type">দাগ নং (ধরন):</label>
                        <select id="dag-type" name="dag-type" required class="full-width-select">
                            <option value="">দাগের ধরন</option>
                            <option value="RS">RS</option>
                            <option value="BRS">BRS</option>
                            <option value="নামজারি">নামজারি</option>
                        </select>
                    </div>
                    <div style="width: 65%;">
                        <label for="dag-no">দাগ নং (নম্বর):</label>
                        <input type="text" id="dag-no" name="dag-no" placeholder="দাগ নম্বর" required>
                    </div>
                </div>
                <div class="input-group">
                    <label for="mouja">মৌজা:</label>
                    <input type="text" id="mouja" name="mouja" required>
                </div>
                <p class="input-hint">সর্বশেষ খতিয়ানের ছবি ও প্রপার্টি স্কেস বা হস্ত নকশা ছবি প্রধান ছবি আপলোড সেকশনের নীচে আপলোড করুন।</p>
            </div>
        `;
    }

    function generatePriceSection(type, isSale) {
        let quantityField = '';
        let priceUnitOptions = '';
        const priceLabel = isSale ? 'দাম' : 'ভাড়া';
        
        // Define units based on property type and category
        if (isSale) {
            if (type === 'জমি' || type === 'প্লট') {
                quantityField = `<input type="number" id="quantity-value" name="quantity-value" placeholder="পরিমাণ" required style="width: 48%;"><select id="quantity-unit" name="quantity-unit" required style="width: 48%;"><option value="শতক">শতক</option><option value="একর">একর</option></select>`;
                priceUnitOptions = `<option value="শতক">শতক</option><option value="একর">একর</option><option value="মোট">মোট</option>`;
            } else if (type === 'বাড়ি') {
                quantityField = `<input type="number" id="quantity-value" name="quantity-value" placeholder="পরিমাণ" required style="width: 48%;"><select id="quantity-unit" name="quantity-unit" required style="width: 48%;"><option value="শতক">শতক</option><option value="মোট">মোট</option></select>`;
                priceUnitOptions = `<option value="শতক">শতক</option><option value="মোট">মোট</option>`;
            } else if (type === 'ফ্লাট') {
                quantityField = `<input type="number" id="quantity-value" name="quantity-value" placeholder="পরিমাণ (স্কয়ার ফিট)" required>`;
                priceUnitOptions = `<option value="স্কয়ার ফিট">স্কয়ার ফিট</option><option value="মোট">মোট</option>`;
            } else if (type === 'দোকান' || type === 'অফিস') {
                quantityField = `<input type="number" id="quantity-value" name="quantity-value" placeholder="পরিমাণ" required style="width: 48%;"><select id="quantity-unit" name="quantity-unit" required style="width: 48%;"><option value="শতক">শতক</option><option value="স্কয়ার ফিট">স্কয়ার ফিট</option></select>`;
                priceUnitOptions = `<option value="শতক">শতক</option><option value="স্কয়ার ফিট">স্কয়ার ফিট</option><option value="মোট">মোট</option>`;
            }
        } else { // RENT
            quantityField = `<input type="number" id="quantity-value" name="quantity-value" placeholder="পরিমাণ" required style="width: 48%;"><select id="quantity-unit" name="quantity-unit" required style="width: 48%;"><option value="শতক">শতক</option><option value="স্কয়ার ফিট">স্কয়ার ফিট</option></select>`;
            priceUnitOptions = `<option value="শতক">শতক</option><option value="স্কয়ার ফিট">স্কয়ার ফিট</option><option value="মোট">মোট</option>`;
        }


        let html = `
            <div class="form-section price-section">
                <h3>পরিমাণ ও ${priceLabel}</h3>
                <div class="input-group inline-group" style="display: flex; justify-content: space-between;">
                    <label for="quantity-value" style="width: 100%;">পরিমাণ (মান ও ইউনিট):</label>
                    ${quantityField}
                </div>
                <div class="input-group inline-group" style="display: flex; justify-content: space-between;">
                    <label for="price-value" style="width: 100%;">${priceLabel} (মান ও ইউনিট):</label>
                    <input type="number" id="price-value" name="price-value" placeholder="${priceLabel} এর পরিমাণ" required style="width: 48%;">
                    <select id="price-unit" name="price-unit" required style="width: 48%;">
                        <option value="">-- ইউনিট --</option>
                        ${priceUnitOptions}
                    </select>
                </div>
        `;
        
        if (!isSale) {
            html += `
                <div class="input-group">
                    <label for="monthly-rent">মাসিক ভাড়া:</label>
                    <input type="number" id="monthly-rent" name="monthly-rent" required>
                </div>
                <div class="input-group">
                    <label for="advance-amount">এডভান্স (ঐচ্ছিক):</label>
                    <input type="number" id="advance-amount" name="advance-amount" placeholder="এডভান্সের পরিমাণ">
                </div>
            `;
        }
        
        html += `</div>`;
        return html;
    }


    function generateAddressSection() {
        return `
            <div class="form-section address-section">
                <h3>ঠিকানা ও অবস্থান</h3>
                <div class="input-group">
                    <label for="division">বিভাগ:</label>
                    <input type="text" id="division" name="division" required placeholder="বিভাগ">
                </div>
                <div class="input-group">
                    <label for="district">জেলা:</label>
                    <input type="text" id="district" name="district" required placeholder="জেলা">
                </div>
                <div class="input-group">
                    <label for="area-type">এলাকার ধরন:</label>
                    <select id="area-type" name="area-type" required class="full-width-select">
                        <option value="">-- নির্বাচন করুন --</option>
                        <option value="উপজেলা">উপজেলা</option>
                        <option value="সিটি কর্পোরেশন">সিটি কর্পোরেশন">সিটি কর্পোরেশন</option>
                    </select>
                </div>
                <div id="sub-address-fields">
                    </div>
            </div>
        `;
    }

    function generateSubAddressFields(areaType) {
        let fieldsHTML = '';

        if (areaType === 'উপজেলা') {
            fieldsHTML = `
                <div class="input-group">
                    <label for="upazila-name">উপজেলা:</label>
                    <input type="text" id="upazila-name" name="upazila-name" required>
                </div>
                <div class="input-group">
                    <label for="thana-name">থানা:</label>
                    <input type="text" id="thana-name" name="thana-name" required>
                </div>
                <div class="input-group">
                    <label for="union-name">ইউনিয়ন:</label>
                    <input type="text" id="union-name" name="union-name" required>
                </div>
                <div class="input-group">
                    <label for="word-no">ওয়ার্ড নং (ঐচ্ছিক):</label>
                    <input type="text" id="word-no" name="word-no">
                </div>
                <div class="input-group">
                    <label for="road-name">রোড:</label>
                    <input type="text" id="road-name" name="road-name" required>
                </div>
                <div class="input-group">
                    <label for="village-name">গ্রাম:</label>
                    <input type="text" id="village-name" name="village-name" required>
                </div>
            `;
        } else if (areaType === 'সিটি কর্পোরেশন') {
            fieldsHTML = `
                <div class="input-group">
                    <label for="city-corporation-name">সিটি কর্পোরেশন:</label>
                    <input type="text" id="city-corporation-name" name="city-corporation-name" required>
                </div>
                <div class="input-group">
                    <label for="thana-name">থানা:</label>
                    <input type="text" id="thana-name" name="thana-name" required>
                </div>
                <div class="input-group">
                    <label for="word-no">ওয়ার্ড নং:</label>
                    <input type="text" id="word-no" name="word-no" required>
                </div>
                <div class="input-group">
                    <label for="road-name">রোড:</label>
                    <input type="text" id="road-name" name="road-name" required>
                </div>
                <div class="input-group">
                    <label for="village-name">গ্রাম:</label>
                    <input type="text" id="village-name" name="village-name" required>
                </div>
            `;
        }

        document.getElementById('sub-address-fields').innerHTML = fieldsHTML;
    }


    function generateSpecificFields(category, type) {
        const isSale = (category === 'বিক্রয়');
        let fieldsHTML = '';

        // Function to set document upload requirements
        function setDocumentRequirements(isRequired) {
            documentImagesContainer.style.display = isRequired ? 'block' : 'none';
            // Note: The 'required' attribute on file inputs is tricky to manage with custom buttons. 
            // We rely on the JS submission logic for final validation (see propertyForm.addEventListener).
        }

        // --- Common Field Definitions ---
        const titleField = `<div class="input-group"><label for="property-title">শিরোনাম:</label><input type="text" id="property-title" name="property-title" required placeholder="যেমন: ধানমন্ডিতে চমৎকার জমি বিক্রয়"></div>`;
        const roadField = `<div class="input-group"><label for="access-road-ft">চলাচলের রাস্তা (ফিট):</label><input type="number" id="access-road-ft" name="access-road-ft" required></div>`;
        const parkingField = `<div class="input-group"><label for="has-parking">পার্কিং:</label><select id="has-parking" name="has-parking" required class="full-width-select"><option value="হ্যাঁ">হ্যাঁ</option><option value="না">না</option></select></div>`;
        const floorsField = `<div class="input-group"><label for="floor-no">তলা / ফ্লোর নং (ঐচ্ছিক):</label><input type="text" id="floor-no" name="floor-no" placeholder="যেমন: জি+৪ / ৫ম তলা"></div>`;
        const roomsField = `<div class="input-group"><label for="room-count">রুম সংখ্যা:</label><input type="number" id="room-count" name="room-count" required></div>`;
        const bathroomsField = `<div class="input-group"><label for="bathroom-count">বাথরুম:</label><input type="number" id="bathroom-count" name="bathroom-count" required></div>`;
        const kitchenField = `<div class="input-group"><label for="kitchen-count">কিচেন:</label><input type="number" id="kitchen-count" name="kitchen-count" required></div>`;
        const shopCountField = `<div class="input-group"><label for="shop-count">দোকান সংখ্যা:</label><input type="number" id="shop-count" name="shop-count" required></div>`;
        const propertyTypeField = `<div class="input-group"><label for="land-type">জমির ধরন:</label><select id="land-type" name="land-type" required class="full-width-select"><option value="">-- নির্বাচন করুন --</option><option value="আবাসিক">আবাসিক</option><option value="বিলান">বিলান</option><option value="বাস্ত">বাস্ত</option><option value="ভিটা">ভিটা</option><option value="ডোবা">ডোবা</option><option value="পুকুর">পুকুর</option></select></div>`;
        const plotNoField = `<div class="input-group"><label for="plot-no">প্লট নং (ঐচ্ছিক):</label><input type="text" id="plot-no" name="plot-no" placeholder="প্লট নম্বর"></div>`;
        const rentTypeField = `<div class="input-group"><label for="rent-type">ভাড়ার ধরন:</label><select id="rent-type" name="rent-type" required class="full-width-select"><option value="ফ্যামিলি">ফ্যামিলি</option><option value="ব্যাচেলর">ব্যাচেলর</option><option value="উভয়">উভয়</option></select></div>`;
        const entryDateField = `<div class="input-group"><label for="entry-date">ওঠার তারিখ:</label><input type="date" id="entry-date" name="entry-date" required></div>`;


        // --- SALE CATEGORY (বিক্রয়) ---
        if (category === 'বিক্রয়') {
            setDocumentRequirements(true); 

            if (type === 'জমি') {
                fieldsHTML = `
                    <div class="form-section property-details-section">
                        <h3>জমির বিবরন</h3>
                        ${titleField}
                        ${roadField}
                        ${propertyTypeField}
                    </div>
                    ${generateOwnershipSection()}
                    ${generatePriceSection(type, true)}
                    ${generateAddressSection()}
                `;
            } else if (type === 'প্লট') {
                fieldsHTML = `
                    <div class="form-section property-details-section">
                        <h3>প্লট বিবরন</h3>
                        ${titleField}
                        ${roadField}
                        ${propertyTypeField}
                        ${plotNoField}
                    </div>
                    ${generateOwnershipSection()}
                    ${generatePriceSection(type, true)}
                    ${generateAddressSection()}
                `;
            } else if (type === 'বাড়ি') {
                fieldsHTML = `
                    <div class="form-section property-details-section">
                        <h3>বাড়ির বিবরন</h3>
                        ${titleField}
                        ${roadField}
                        ${parkingField}
                        ${floorsField}
                        ${roomsField}
                        ${bathroomsField}
                        ${kitchenField}
                    </div>
                    ${generateOwnershipSection()}
                    ${generatePriceSection(type, true)}
                    ${generateAddressSection()}
                `;
            } else if (type === 'ফ্লাট') {
                fieldsHTML = `
                    <div class="form-section property-details-section">
                        <h3>ফ্লাট বিবরন</h3>
                        ${titleField}
                        ${roadField}
                        ${parkingField}
                        ${floorsField}
                        ${roomsField}
                        ${bathroomsField}
                        ${kitchenField}
                    </div>
                    ${generateOwnershipSection()}
                    ${generatePriceSection(type, true)}
                    ${generateAddressSection()}
                `;
            } else if (type === 'দোকান') {
                fieldsHTML = `
                    <div class="form-section property-details-section">
                        <h3>দোকান বিবরন</h3>
                        ${titleField}
                        ${shopCountField}
                    </div>
                    ${generateOwnershipSection()}
                    ${generatePriceSection(type, true)}
                    ${generateAddressSection()}
                `;
            } else if (type === 'অফিস') {
                fieldsHTML = `
                    <div class="form-section property-details-section">
                        <h3>অফিস বিবরন</h3>
                        ${titleField}
                        ${parkingField}
                        ${floorsField}
                        ${roomsField}
                        ${bathroomsField}
                    </div>
                    ${generateOwnershipSection()}
                    ${generatePriceSection(type, true)}
                    ${generateAddressSection()}
                `;
            }
        } 
        
        // --- RENT CATEGORY (ভাড়া) ---
        else if (category === 'ভাড়া') {
            setDocumentRequirements(false); 

            if (type === 'বাড়ি') {
                fieldsHTML = `
                    <div class="form-section property-details-section">
                        <h3>বাড়ির বিবরন</h3>
                        ${titleField}
                        ${roadField}
                        ${parkingField}
                        ${floorsField}
                        ${roomsField}
                        ${bathroomsField}
                        ${kitchenField}
                        ${rentTypeField}
                        ${entryDateField}
                    </div>
                    ${generatePriceSection(type, false)}
                    ${generateAddressSection()}
                `;
            } else if (type === 'ফ্লাট') {
                fieldsHTML = `
                    <div class="form-section property-details-section">
                        <h3>ফ্লাট বিবরন</h3>
                        ${titleField}
                        ${roadField}
                        ${parkingField}
                        ${floorsField}
                        ${roomsField}
                        ${bathroomsField}
                        ${kitchenField}
                        ${rentTypeField}
                        ${entryDateField}
                    </div>
                    ${generatePriceSection(type, false)}
                    ${generateAddressSection()}
                `;
            } else if (type === 'অফিস') {
                fieldsHTML = `
                    <div class="form-section property-details-section">
                        <h3>অফিস বিবরন</h3>
                        ${titleField}
                        ${parkingField}
                        ${floorsField}
                        ${roomsField}
                        ${bathroomsField}
                        ${entryDateField}
                    </div>
                    ${generatePriceSection(type, false)}
                    ${generateAddressSection()}
                `;
            } else if (type === 'দোকান') {
                fieldsHTML = `
                    <div class="form-section property-details-section">
                        <h3>দোকান বিবরন</h3>
                        ${titleField}
                        ${shopCountField}
                        ${entryDateField}
                    </div>
                    ${generatePriceSection(type, false)}
                    ${generateAddressSection()}
                `;
            }
        }

        document.getElementById('specific-fields-container').innerHTML = fieldsHTML;
        
        // Add listeners for dynamic address fields
        const areaTypeSelect = document.getElementById('area-type');
        if (areaTypeSelect) {
            areaTypeSelect.addEventListener('change', function() {
                generateSubAddressFields(this.value);
            });
        }
    }

    // Initial Category Dropdown Listener
    postCategorySelect.addEventListener('change', function() {
        const category = this.value;
        if (category) {
            generateTypeDropdown(category);
        } else {
            dynamicFieldsContainer.innerHTML = '';
            documentImagesContainer.style.display = 'none'; // Hide document uploads if no category selected
        }
    });


    // ** Form Submission and Firebase Logic **
    
    // Helper function for uploading a single file to Firebase Storage
    async function uploadFile(file, filePath) {
        if (!file) return null;
        
        const storageRef = storage.ref();
        const fileRef = storageRef.child(filePath + '/' + file.name);
        
        try {
            const snapshot = await fileRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            return downloadURL;
        } catch (error) {
            console.error("Error uploading file:", error);
            alert("ফাইল আপলোড করতে সমস্যা হয়েছে: " + error.message);
            throw error;
        }
    }

    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        // 1. Validation: Check if main images are uploaded
        if (mainImageFiles.length === 0) {
            alert('অনুগ্রহ করে কমপক্ষে একটি প্রপার্টি ছবি আপলোড করুন।');
            return;
        }

        const category = document.getElementById('post-category').value;
        const type = document.getElementById('post-type').value;

        // 2. Validation: Check document uploads for 'বিক্রয়'
        if (category === 'বিক্রয়') {
            if (!khatianFile || !sketchFile) {
                alert('বিক্রয় ক্যাটাগরির জন্য সর্বশেষ খতিয়ানের ছবি এবং প্রপার্টি স্কেস বা হস্ত নকশা ছবি অবশ্যই আপলোড করতে হবে।');
                return;
            }
        }
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'পোস্ট হচ্ছে... অপেক্ষা করুন';

        try {
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            const propertyId = db.collection('properties').doc().id;
            const storagePath = `properties/${propertyId}`;
            
            // 3. Upload Images
            const mainImageUploadPromises = mainImageFiles.map((file, index) => 
                uploadFile(file, `${storagePath}/main_images/image_${index}`)
            );
            const mainImageURLs = await Promise.all(mainImageUploadPromises);

            let khatianURL = null;
            let sketchURL = null;

            if (category === 'বিক্রয়') {
                khatianURL = await uploadFile(khatianFile, `${storagePath}/documents/khatian`);
                sketchURL = await uploadFile(sketchFile, `${storagePath}/documents/sketch`);
            }

            // 4. Collect Form Data
            const formData = {
                id: propertyId,
                category: category,
                type: type,
                title: document.getElementById('property-title')?.value || '',
                accessRoadFt: document.getElementById('access-road-ft')?.value || '',
                // Land/Plot
                landType: document.getElementById('land-type')?.value || null,
                plotNo: document.getElementById('plot-no')?.value || null,
                // House/Flat/Office
                hasParking: document.getElementById('has-parking')?.value || null,
                floorNo: document.getElementById('floor-no')?.value || null,
                roomCount: parseInt(document.getElementById('room-count')?.value) || 0,
                bathroomCount: parseInt(document.getElementById('bathroom-count')?.value) || 0,
                kitchenCount: parseInt(document.getElementById('kitchen-count')?.value) || null,
                // Shop
                shopCount: parseInt(document.getElementById('shop-count')?.value) || null,

                // Ownership (Sale only)
                ownerName: document.getElementById('owner-name')?.value || null,
                dagType: document.getElementById('dag-type')?.value || null,
                dagNo: document.getElementById('dag-no')?.value || null,
                mouja: document.getElementById('mouja')?.value || null,

                // Rent specific
                rentType: document.getElementById('rent-type')?.value || null,
                entryDate: document.getElementById('entry-date')?.value || null,
                monthlyRent: parseFloat(document.getElementById('monthly-rent')?.value) || null,
                advanceAmount: parseFloat(document.getElementById('advance-amount')?.value) || null,

                // Price/Quantity
                quantityValue: parseFloat(document.getElementById('quantity-value')?.value) || 0,
                quantityUnit: document.getElementById('quantity-unit')?.value || '',
                priceValue: parseFloat(document.getElementById('price-value')?.value) || 0,
                priceUnit: document.getElementById('price-unit')?.value || '',


                // Address
                division: document.getElementById('division')?.value || '',
                district: document.getElementById('district')?.value || '',
                areaType: document.getElementById('area-type')?.value || '',
                // Sub Address Fields
                upazilaName: document.getElementById('upazila-name')?.value || null,
                cityCorporationName: document.getElementById('city-corporation-name')?.value || null,
                thanaName: document.getElementById('thana-name')?.value || '',
                unionName: document.getElementById('union-name')?.value || null,
                wordNo: document.getElementById('word-no')?.value || null,
                roadName: document.getElementById('road-name')?.value || '',
                villageName: document.getElementById('village-name')?.value || '',
                
                // Location & Details
                mapLocation: document.getElementById('map-location').value,
                primaryPhone: document.getElementById('primary-phone').value,
                additionalPhone: document.getElementById('additional-phone')?.value || null,
                details: document.getElementById('property-details').value,

                // Image URLs
                mainImageURLs: mainImageURLs,
                khatianURL: khatianURL,
                sketchURL: sketchURL,
                
                // Metadata
                postedBy: auth.currentUser ? auth.currentUser.uid : 'anonymous',
                postedAt: timestamp,
                status: 'pending',
            };

            // 5. Save to Firestore
            await db.collection('properties').doc(propertyId).set(formData);

            alert('আপনার প্রপার্টিটি সফলভাবে পোস্ট করা হয়েছে! অনুমোদনের জন্য অপেক্ষা করুন।');
            propertyForm.reset();
            // Reset image states and UI
            mainImageFiles = [];
            khatianFile = null;
            sketchFile = null;
            mainImagesPreviewContainer.innerHTML = '';
            document.getElementById('latest-khatian-image-preview').innerHTML = '';
            document.getElementById('property-sketch-image-preview').innerHTML = '';
            documentImagesContainer.style.display = 'none';
            document.getElementById('specific-fields-container').innerHTML = '';
            document.getElementById('dynamic-fields-container').innerHTML = '';
            postCategorySelect.value = '';

        } catch (error) {
            console.error("পোস্ট করার সময় ত্রুটি:", error);
            alert("প্রপার্টি পোস্ট করতে সমস্যা হয়েছে: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'পোস্ট করুন';
        }
    });

    // ** Auth State Listener (Kept from original) **

    const propertyFormDisplay = document.getElementById('post-form-container');
    const authWarningMessage = document.getElementById('auth-warning-message');
    const postLinkSidebar = document.getElementById('postLinkSidebar');
    const loginLinkSidebar = document.getElementById('loginLinkSidebar');

    function handleLogout() {
        auth.signOut().then(() => {
            alert('সফলভাবে লগআউট করা হয়েছে।');
            window.location.reload(); // Reload to update UI
        }).catch((error) => {
            console.error("লগআউট ত্রুটি:", error);
        });
    }
    
    auth.onAuthStateChanged((user) => {
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
