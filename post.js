// post.js - Revised for direct Firebase Storage upload, dynamic form fix, and profile loading fix

// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// --- REMOVED: fileToBase64 and dataURLtoBlob functions (Base64 dependency removed) ---


// Utility Function: Uploads file directly to Firebase Storage for staging
// staging/user_id/timestamp_filename
const uploadStagedImage = async (file, index, userId, docType = 'main') => {
    // Determine the storage path based on document type
    const baseDir = docType === 'main' ? 'staging/images' : `staging/documents/${docType}`;
    const filePath = `${baseDir}/${userId}/${Date.now()}_${index}_${file.name}`;
    const imageRef = storage.ref().child(filePath);
    
    // Upload the file
    const snapshot = await imageRef.put(file);
    // Get the download URL which will be used for preview
    const downloadURL = await snapshot.ref.getDownloadURL();
    
    return {
        fileName: file.name,
        fileMimeType: file.type,
        storagePath: filePath, // Storing path for potential later cleanup/move (optional)
        url: downloadURL // The Firebase URL
    };
};

document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');

    // --- NEW/FIXED: Function to load and pre-fill data from session storage for editing ---
    function loadStagedData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');
        
        if (!stagedDataString) return; 

        try {
            const stagedData = JSON.parse(stagedDataString);
            const stagedMetadata = stagedMetadataString ? JSON.parse(stagedMetadataString) : {};

            // Set simple fields
            document.getElementById('lister-type').value = stagedData.listerType || '';
            document.getElementById('post-category').value = stagedData.category || '';

            // Trigger dynamic field generation
            if (stagedData.category) {
                // FIXED: ensure dynamic fields are generated correctly on load
                generateTypeDropdown(stagedData.category);
                
                // Set a timeout to allow the dynamic fields to render before setting values
                setTimeout(() => {
                    const postTypeSelect = document.getElementById('post-type');
                    if (postTypeSelect && stagedData.type) {
                        postTypeSelect.value = stagedData.type;
                        // stagedMetadata পাস করা হলো
                        generateSpecificFields(stagedData.category, stagedData.type, stagedData, stagedMetadata); 
                    }
                }, 100); 
            }
            
            // Show a message
            // alert('আপনার সংরক্ষিত তথ্য এডিটের জন্য লোড করা হয়েছে।'); // Commented out to reduce popups

        } catch (error) {
            console.error('Error loading staged data:', error);
            sessionStorage.removeItem('stagedPropertyData');
            sessionStorage.removeItem('stagedImageMetadata');
        }
    }


    // FIXED: Function to generate and display the main property type dropdown based on category (Dynamic Form Logic)
    function generateTypeDropdown(category) {
        let typeSelectHTML = '';
        let options = [];

        if (category === 'বিক্রয়') {
            options = ['জমি', 'প্লট', 'বাড়ি', 'ফ্লাট', 'দোকান', 'অফিস']; 
        } else if (category === 'ভাড়া') {
            options = ['বাড়ি', 'ফ্লাট', 'অফিস', 'দোকান']; 
        }

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
    
    // Function to generate specific input fields based on type (PRE-FILL LOGIC ADDED HERE)
    function generateSpecificFields(category, type, stagedData = null, stagedMetadata = null) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        let fieldsHTML = '';
        
        if (!type) {
             specificFieldsContainer.innerHTML = '';
             return;
        }

        let categoryDescriptionText = category === 'ভাড়া' ? 'ভাড়ার বিবরণ' : `${category}ের বিবরণ`;

        // --- সেকশন ১: প্রপার্টির বিবরণ (ছবি, শিরোনাম, রুম ইত্যাদি) ---
        let descriptionHTML = `
            <div class="form-section property-details-section">
                <h3>${type} ${categoryDescriptionText}</h3>

                <div class="input-group image-upload-group">
                    <label for="images">প্রপার্টি ছবি (সর্বোচ্চ ৩টি):</label>
                    <input type="file" id="images" accept="image/*" multiple required class="file-input-custom">
                    <div class="image-preview-area" id="image-preview-area">
                        <p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>
                    </div>
                </div>
                <div class="input-group">
                    <label for="property-title">শিরোনাম:</label>
                    <input type="text" id="property-title" required value="${stagedData?.title || ''}">
                </div>
        `;
        
        // NEW ADDITION: Property Age, Facing and Utilities for built properties
        if (type !== 'জমি' && type !== 'প্লট') {
            // 1. Property Age & Facing
            descriptionHTML += `
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="property-age">প্রপার্টির বয়স (বছর):</label>
                        <input type="number" id="property-age" placeholder="0 (নতুন) বা বয়স" min="0" required value="${stagedData?.propertyAge || ''}">
                    </div>
                    <div class="input-group">
                        <label for="facing">প্রপার্টির দিক:</label>
                        <select id="facing">
                            <option value="">-- নির্বাচন করুন (ঐচ্ছিক) --</option>
                            <option value="উত্তর" ${stagedData?.facing === 'উত্তর' ? 'selected' : ''}>উত্তর</option>
                            <option value="দক্ষিণ" ${stagedData?.facing === 'দক্ষিণ' ? 'selected' : ''}>দক্ষিণ</option>
                            <option value="পূর্ব" ${stagedData?.facing === 'পূর্ব' ? 'selected' : ''}>পূর্ব</option>
                            <option value="পশ্চিম" ${stagedData?.facing === 'পশ্চিম' ? 'selected' : ''}>পশ্চিম</option>
                            <option value="উত্তর-পূর্ব" ${stagedData?.facing === 'উত্তর-পূর্ব' ? 'selected' : ''}>উত্তর-পূর্ব</option>
                            <option value="উত্তর-পশ্চিম" ${stagedData?.facing === 'উত্তর-পশ্চিম' ? 'selected' : ''}>উত্তর-পশ্চিম</option>
                            <option value="দক্ষিণ-পূর্ব" ${stagedData?.facing === 'দক্ষিণ-পূর্ব' ? 'selected' : ''}>দক্ষিণ-পূর্ব</option>
                            <option value="দক্ষিণ-পশ্চিম" ${stagedData?.facing === 'দক্ষিণ-পশ্চিম' ? 'selected' : ''}>দক্ষিণ-পশ্চিম</option>
                        </select>
                    </div>
                </div>
            `;
            
            // 2. Utilities/Amenities (PARKING MERGED HERE)
            
            // Logic for pre-filling parking if it was saved as a separate 'parking' field (for edit compatibility)
            const parkingUtilityValue = 'পার্কিং সুবিধা';
            let parkingChecked = stagedData?.utilities?.includes(parkingUtilityValue) ? 'checked' : '';
            if (!parkingChecked && stagedData?.parking === 'হ্যাঁ') {
                parkingChecked = 'checked'; // Compatibility check for old separate field
            }
            
            descriptionHTML += `
                <div class="input-group">
                    <label>অন্যান্য সুবিধা:</label>
                    <div class="radio-group utility-checkbox-group" style="display: flex; flex-wrap: wrap; gap: 15px;">
                        ${(type === 'ফ্লাট' || type === 'অফিস' || type === 'বাড়ি') ? `<label><input type="checkbox" name="utility" value="লিফট" id="utility-lift" ${stagedData?.utilities?.includes('লিফট') ? 'checked' : ''}> লিফট</label>` : ''}
                        
                        ${(type === 'ফ্লাট' || type === 'অফিস' || type === 'বাড়ি') ? `<label><input type="checkbox" name="utility" value="${parkingUtilityValue}" id="utility-parking" ${parkingChecked}> ${parkingUtilityValue}</label>` : ''}

                        <label><input type="checkbox" name="utility" value="গ্যাস সংযোগ" id="utility-gas" ${stagedData?.utilities?.includes('গ্যাস সংযোগ') ? 'checked' : ''}> গ্যাস সংযোগ</label>
                        <label><input type="checkbox" name="utility" value="জেনারেটর" id="utility-generator" ${stagedData?.utilities?.includes('জেনারেটর') ? 'checked' : ''}> জেনারেটর/পাওয়ার ব্যাকআপ</label>
                        <label><input type="checkbox" name="utility" value="ওয়াসা পানি" id="utility-wasa" ${stagedData?.utilities?.includes('ওয়াসা পানি') ? 'checked' : ''}> ওয়াসা পানি</label>
                    </div>
                    <p class="small-text">প্রযোজ্য সুবিধাগুলো নির্বাচন করুন।</p>
                </div>
            `;
        }

        
        // টাইপ-ভিত্তিক ফিল্ডসমূহ যুক্ত করা
        if (type === 'জমি' || type === 'প্লট') {
            descriptionHTML += `
                <div class="input-group">
                    <label for="road-width">চলাচলের রাস্তা (ফিট):</label>
                    <input type="number" id="road-width" required value="${stagedData?.roadWidth || ''}">
                </div>
                <div class="input-group">
                    <label for="land-type">জমির ধরন:</label>
                    <select id="land-type" required>
                        <option value="">-- নির্বাচন করুন --</option>
                        <option value="আবাসিক" ${stagedData?.landType === 'আবাসিক' ? 'selected' : ''}>আবাসিক</option>
                        <option value="বিলান" ${stagedData?.landType === 'বিলান' ? 'selected' : ''}>বিলান</option>
                        <option value="বাস্ত" ${stagedData?.landType === 'বাস্ত' ? 'selected' : ''}>বাস্ত</option>
                        <option value="ভিটা" ${stagedData?.landType === 'ভিটা' ? 'selected' : ''}>ভিটা</option>
                        <option value="ডোবা" ${stagedData?.landType === 'ডোবা' ? 'selected' : ''}>ডোবা</option>
                        <option value="পুকুর" ${stagedData?.landType === 'পুকুর' ? 'selected' : ''}>পুকুর</option>
                    </select>
                </div>
            `;
            if (type === 'প্লট') {
                 descriptionHTML += `
                    <div class="input-group">
                        <label for="plot-no">প্লট নং (ঐচ্ছিক):</label>
                        <input type="text" id="plot-no" value="${stagedData?.plotNo || ''}">
                    </div>
                 `;
            }
        } else if (type === 'বাড়ি' || type === 'ফ্লাট' || type === 'অফিস' || type === 'দোকান') {
            
            if (type === 'বাড়ি' || type === 'ফ্লাট') {
                descriptionHTML += `
                    <div class="input-group">
                        <label for="road-width">চলাচলের রাস্তা (ফিট):</label>
                        <input type="number" id="road-width" required value="${stagedData?.roadWidth || ''}">
                    </div>
                `;
            }
            
            if (type === 'বাড়ি') {
                 descriptionHTML += `
                    <div class="input-group">
                        <label for="floors">তলা সংখ্যা (ঐচ্ছিক):</label>
                        <input type="number" id="floors" value="${stagedData?.floors || ''}">
                    </div>
                 `;
            } else if (type === 'ফ্লাট' || type === 'অফিস') {
                descriptionHTML += `
                    <div class="input-group">
                        <label for="floor-no">ফ্লোর নং:</label>
                        <input type="number" id="floor-no" required value="${stagedData?.floorNo || ''}">
                    </div>
                `;
            }

            if (type !== 'দোকান') {
                descriptionHTML += `
                    <div class="input-inline-group">
                        <div class="input-group">
                            <label for="rooms">রুম সংখ্যা:</label>
                            <input type="number" id="rooms" required value="${stagedData?.rooms || ''}">
                        </div>
                        <div class="input-group">
                            <label for="bathrooms">বাথরুম সংখ্যা:</label>
                            <input type="number" id="bathrooms" required value="${stagedData?.bathrooms || ''}">
                        </div>
                        ${(type === 'বাড়ি' || type === 'ফ্লাট') ? 
                        `<div class="input-group">
                            <label for="kitchen">কিচেন সংখ্যা:</label>
                            <input type="number" id="kitchen" required value="${stagedData?.kitchen || ''}">
                        </div>` : ''}
                    </div>
                `;
            }

            
            // ভাড়ার জন্য অতিরিক্ত ফিল্ড
            if (category === 'ভাড়া') {
                if (type === 'বাড়ি' || type === 'ফ্লাট') {
                    descriptionHTML += `
                        <div class="input-group">
                            <label for="rent-type">ভাড়ার ধরন:</label>
                            <select id="rent-type" required>
                                <option value="">-- নির্বাচন করুন --</option>
                                <option value="ফ্যামিলি" ${stagedData?.rentType === 'ফ্যামিলি' ? 'selected' : ''}>ফ্যামিলি</option>
                                <option value="ব্যাচেলর" ${stagedData?.rentType === 'ব্যাচেলর' ? 'selected' : ''}>ব্যাচেলর</option>
                                <option value="সকল" ${stagedData?.rentType === 'সকল' ? 'selected' : ''}>সকল</option>
                            </select>
                        </div>
                    `;
                }
                
                descriptionHTML += `
                    <div class="input-group">
                        <label for="move-in-date">ওঠার তারিখ:</label>
                        <input type="date" id="move-in-date" required value="${stagedData?.moveInDate || ''}">
                    </div>
                `;
            }
            
        } else if (type === 'দোকান') {
             descriptionHTML += `
                <div class="input-group">
                    <label for="shop-count">দোকান সংখ্যা:</label>
                    <input type="number" id="shop-count" required value="${stagedData?.shopCount || ''}">
                </div>
            `;
            if (category === 'ভাড়া') {
                 descriptionHTML += `
                    <div class="input-group">
                        <label for="move-in-date">ওঠার তারিখ:</label>
                        <input type="date" id="move-in-date" required value="${stagedData?.moveInDate || ''}">
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
                        <input type="text" id="donor-name" required value="${stagedData?.owner?.donorName || ''}">
                    </div>
                    <div class="input-inline-group">
                        <div class="input-group" style="flex: 1;">
                            <label for="dag-no-type-select">দাগ নং (ধরন):</label>
                            <select id="dag-no-type-select" required>
                                <option value="">-- নির্বাচন করুন --</option>
                                <option value="RS" ${stagedData?.owner?.dagNoType === 'RS' ? 'selected' : ''}>RS</option>
                                <option value="BRS" ${stagedData?.owner?.dagNoType === 'BRS' ? 'selected' : ''}>BRS</option>
                                <option value="নামজারি" ${stagedData?.owner?.dagNoType === 'নামজারি' ? 'selected' : ''}>নামজারি</option>
                            </select>
                        </div>
                        <div class="input-group" style="flex: 2;">
                            <label for="dag-no-input">দাগ নং (লিখুন):</label>
                            <input type="text" id="dag-no-input" placeholder="দাগ নম্বর" required value="${stagedData?.owner?.dagNo || ''}">
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="mouja-owner">মৌজা:</label>
                        <input type="text" id="mouja-owner" required value="${stagedData?.owner?.mouja || ''}">
                    </div>
                    <div class="input-group image-upload-group">
                        <label for="khotian-image">সর্বশেষ খতিয়ানের ছবি (১টি):</label>
                        <input type="file" id="khotian-image" accept="image/*" required class="file-input-custom">
                        <div class="image-preview-area" id="khotian-preview-area">
                            <p class="placeholder-text">এখানে খতিয়ানের ছবি দেখা যাবে।</p>
                        </div>
                    </div>
                    <div class="input-group image-upload-group">
                        <label for="sketch-image">প্রপার্টি স্কেস বা হস্ত নকশা ছবি (১টি):</label>
                        <input type="file" id="sketch-image" accept="image/*" required class="file-input-custom">
                        <div class="image-preview-area" id="sketch-preview-area">
                            <p class="placeholder-text">এখানে স্কেসের ছবি দেখা যাবে।</p>
                        </div>
                    </div>
                </div>
            `;
            fieldsHTML += ownershipHTML;
        }

        // --- সেকশন ৩: পরিমাণ/দাম/ভাড়া ---
        let priceRentHTML = '<div class="form-section price-rent-section"><h3>পরিমাণ ও দাম </h3>';
        
        // পরিমাণের ফিল্ড
        if (type === 'জমি' || type === 'প্লট') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="land-area">পরিমাণ:</label>
                    <input type="number" id="land-area" placeholder="পরিমাণ" required value="${stagedData?.landArea || ''}">
                    <select id="land-area-unit" class="unit-select" required>
                        <option value="শতক" ${stagedData?.landAreaUnit === 'শতক' ? 'selected' : ''}>শতক</option>
                        <option value="একর" ${stagedData?.landAreaUnit === 'একর' ? 'selected' : ''}>একর</option>
                    </select>
                </div>
            `;
        } else if (type === 'বাড়ি') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="house-area">পরিমাণ (জমির):</label>
                    <input type="number" id="house-area" placeholder="পরিমাণ" required value="${stagedData?.houseArea || ''}">
                    <select id="house-area-unit" class="unit-select" required>
                        <option value="শতক" ${stagedData?.houseAreaUnit === 'শতক' ? 'selected' : ''}>শতক</option>
                        <option value="মোট" ${stagedData?.houseAreaUnit === 'মোট' ? 'selected' : ''}>মোট (স্কয়ার ফিট)</option>
                    </select>
                </div>
            `;
        } else if (type === 'ফ্লাট') {
            priceRentHTML += `
                <div class="input-group">
                    <label for="flat-area-sqft">পরিমাণ (স্কয়ার ফিট):</label>
                    <input type="number" id="flat-area-sqft" required value="${stagedData?.areaSqft || ''}">
                </div>
            `;
        } else if (type === 'দোকান' || type === 'অফিস') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="commercial-area">পরিমাণ:</label>
                    <input type="number" id="commercial-area" placeholder="পরিমাণ" required value="${stagedData?.commercialArea || ''}">
                    <select id="commercial-area-unit" class="unit-select" required>
                        <option value="শতক" ${stagedData?.commercialAreaUnit === 'শতক' ? 'selected' : ''}>শতক</option>
                        <option value="স্কয়ার ফিট" ${stagedData?.commercialAreaUnit === 'স্কয়ার ফিট' ? 'selected' : ''}>স্কয়ার ফিট</option>
                    </select>
                </div>
            `;
        }
        
        // দাম/ভাড়ার ফিল্ড
        if (category === 'বিক্রয়') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="price">দাম:</label>
                    <input type="number" id="price" placeholder="মোট দাম" required value="${stagedData?.price || ''}">
                    <select id="price-unit" class="unit-select" required>
                        <option value="মোট" ${stagedData?.priceUnit === 'মোট' ? 'selected' : ''}>মোট (টাকায়)</option>
            `;
            if (type === 'জমি' || type === 'প্লট' || type === 'বাড়ি') {
                priceRentHTML += `<option value="শতক" ${stagedData?.priceUnit === 'শতক' ? 'selected' : ''}>শতক প্রতি (টাকায়)</option>`;
            }
            if (type === 'ফ্লাট' || type === 'দোকান' || type === 'অফিস') {
                 priceRentHTML += `<option value="স্কয়ার ফিট" ${stagedData?.priceUnit === 'স্কয়ার ফিট' ? 'selected' : ''}>স্কয়ার ফিট প্রতি (টাকায়)</option>`;
            }
            priceRentHTML += `
                    </select>
                </div>
            `;
        } else if (category === 'ভাড়া') {
            priceRentHTML += `
                <div class="input-group">
                    <label for="monthly-rent">মাসিক ভাড়া (টাকায়):</label>
                    <input type="number" id="monthly-rent" required value="${stagedData?.monthlyRent || ''}">
                </div>
                <div class="input-group">
                    <label for="advance">এডভান্স / জামানত (টাকায়):</label>
                    <input type="number" id="advance" placeholder="টাকায়" required value="${stagedData?.advance || ''}">
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
                        <input type="text" id="division" required value="${stagedData?.location?.division || ''}">
                    </div>
                    <div class="input-group">
                        <label for="district">জেলা:</label>
                        <input type="text" id="district" required value="${stagedData?.location?.district || ''}">
                    </div>
                </div>
                <div class="input-group">
                    <label for="area-type-select">এলাকার ধরন:</label>
                    <select id="area-type-select" required>
                        <option value="">-- নির্বাচন করুন --</option>
                        <option value="উপজেলা" ${stagedData?.location?.areaType === 'উপজেলা' ? 'selected' : ''}>উপজেলা</option>
                        <option value="সিটি কর্পোরেশন" ${stagedData?.location?.areaType === 'সিটি কর্পোরেশন' ? 'selected' : ''}>সিটি কর্পোরেশন</option>
                    </select>
                </div>
                <div id="sub-address-fields">
                </div>
                <div class="input-group google-map-pinning">
                    <label for="google-map">Google ম্যাপ লোকেশন (পিন করুন):</label>
                    <input type="text" id="google-map-pin" placeholder="ম্যাপ থেকে পিন করার অপশন থাকবে" value="${stagedData?.googleMap || ''}">
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
                    <input type="tel" id="primary-phone" placeholder="ফোন নম্বর" required disabled>
                    <p class="small-text">লগইন করার পরে স্বয়ংক্রিয়ভাবে পূরণ হবে।</p>
                </div>
                <div class="input-group">
                    <label for="secondary-phone">অতিরিক্ত ফোন নম্বর (ঐচ্ছিক):</label>
                    <input type="tel" id="secondary-phone" placeholder="অতিরিক্ত ফোন নম্বর" value="${stagedData?.secondaryPhone || ''}">
                </div>
                <div class="input-group">
                    <label for="description">প্রপার্টির বিস্তারিত বর্ণনা (ঐচ্ছিক):</label>
                    <textarea id="description" rows="5" placeholder="আপনার প্রপার্টি সম্পর্কে বিস্তারিত লিখুন...">${stagedData?.description || ''}</textarea>
                </div>
            </div>
        `;
        fieldsHTML += contactHTML;

        specificFieldsContainer.innerHTML = fieldsHTML;


        // Load initial sub-address fields if data exists
        if (stagedData?.location?.areaType) {
            generateSubAddressFields(stagedData.location.areaType, stagedData);
        }

        // Listener for dynamic address fields
        const areaTypeSelect = document.getElementById('area-type-select');
        if (areaTypeSelect) {
            areaTypeSelect.addEventListener('change', (e) => generateSubAddressFields(e.target.value));
        }

        // --- NEW Image Preview and Upload Handler Logic ---

        // NEW: Function to display image from URL (Firebase Staging URL)
        function handleImagePreviewDisplayFromURL(url, fileName, previewArea, isStaged = false) {
            const previewWrapper = document.createElement('div');
            previewWrapper.className = 'image-preview-wrapper';
            previewWrapper.dataset.filename = fileName;
            previewWrapper.dataset.url = url; // Store URL for removal/validation

            const img = document.createElement('img');
            img.src = url;
            img.className = 'preview-image';

            const removeButton = document.createElement('button');
            removeButton.className = 'remove-image-btn';
            removeButton.innerHTML = '&times;';
            removeButton.style.backgroundColor = 'red';
            removeButton.style.color = 'white';

            removeButton.addEventListener('click', (e) => {
                e.preventDefault();
                // Find index to remove from session data
                const targetInput = previewArea.closest('.input-group').querySelector('input[type="file"]');
                const fileType = targetInput.id === 'images' ? 'images' : targetInput.id.replace('-image', '');

                let stagedMetadata = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
                
                if (fileType === 'images') {
                    // Filter out the image by URL/filename
                    stagedMetadata.images = (stagedMetadata.images || []).filter(meta => meta.url !== url);
                } else {
                    // For single-image documents, just remove the metadata
                    delete stagedMetadata[fileType];
                    // Also clear the file input (optional but good practice)
                    targetInput.value = ''; 
                }
                
                // Update session storage
                sessionStorage.setItem('stagedImageMetadata', JSON.stringify(stagedMetadata));
                
                // Remove the visual element
                previewWrapper.remove();

                // If it's the main image area and becomes empty, show placeholder
                if (fileType === 'images' && previewArea.children.length === 0) {
                    previewArea.innerHTML = '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>';
                } else if (fileType !== 'images') {
                    // For single images, restore placeholder text
                    previewArea.innerHTML = '<p class="placeholder-text">এখানে ছবি দেখা যাবে।</p>';
                }
            });

            previewWrapper.appendChild(img);
            previewWrapper.appendChild(removeButton);

            if (previewArea.querySelector('.placeholder-text')) {
                 previewArea.innerHTML = ''; // Remove placeholder if present
            }
            previewArea.appendChild(previewWrapper);
        }


        // Reusable function to handle file input change and upload
        async function handleImageUploadAndPreview(event, previewAreaId, maxFiles, docType = 'main') {
            const previewArea = document.getElementById(previewAreaId);
            const files = event.target.files;
            
            if (files.length === 0) {
                 // If no files selected (e.g. cancelled file dialog), do nothing if there's staged data
                 return;
            }

            if (files.length > maxFiles) {
                alert(`আপনি সর্বোচ্চ ${maxFiles}টি ছবি আপলোড করতে পারবেন।`);
                event.target.value = ''; // Clear input
                // If main image area, restore placeholder only if nothing is staged
                if (docType === 'main' && (JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}').images || []).length === 0) {
                    previewArea.innerHTML = '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>';
                }
                return;
            }
            
            // Clear existing previews for single uploads (khotian, sketch) or for new main image uploads
            if (maxFiles === 1 || docType === 'main') { 
                previewArea.innerHTML = ''; 
                // Only show placeholder temporarily while uploading
                previewArea.innerHTML = '<p class="placeholder-text uploading-text">ছবি আপলোড হচ্ছে... অপেক্ষা করুন</p>';
            }
            
            submitBtn.disabled = true; // Disable submit while uploading
            const user = auth.currentUser;
            const userId = user ? user.uid : 'anonymous';
            
            let stagedMetadata = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
            let imagesToStore = stagedMetadata.images || [];


            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                if (file.type.startsWith('image/')) {
                    
                    try {
                        if (docType === 'main') {
                            submitBtn.textContent = `ছবি আপলোড হচ্ছে... (${imagesToStore.length + i + 1}/${imagesToStore.length + files.length})`;
                        } else {
                            submitBtn.textContent = `ডকুমেন্ট আপলোড হচ্ছে...`;
                        }
                        
                        // 1. Upload to Firebase Storage
                        const uploadedMetadata = await uploadStagedImage(file, i, userId, docType);
                        
                        // 2. Store metadata (URL) in session storage
                        const newMetadata = {
                            id: Date.now() + '_' + i,
                            order: docType === 'main' ? (imagesToStore.length + i) : 0, // Set order for main images
                            fileName: uploadedMetadata.fileName,
                            storagePath: uploadedMetadata.storagePath,
                            url: uploadedMetadata.url, // Firebase URL
                        };

                        if (docType === 'main') {
                            imagesToStore.push(newMetadata);
                        } else {
                            stagedMetadata[docType] = newMetadata; // Store as a single object for khotian/sketch
                        }
                        
                        // 3. Display preview from URL
                        if (docType === 'main' || maxFiles === 1) { // Only display the currently uploaded files
                            handleImagePreviewDisplayFromURL(newMetadata.url, newMetadata.fileName, previewArea);
                        }
                        
                    } catch (error) {
                        console.error(`ছবি/ডকুমেন্ট আপলোডে সমস্যা (${file.name}):`, error);
                        alert(`ছবি/ডকুমেন্ট আপলোড ব্যর্থ হয়েছে: ${file.name}. দয়া করে আবার চেষ্টা করুন।`);
                        // Clear input and staged data for safety on failure
                        event.target.value = '';
                        if (docType === 'main') {
                             imagesToStore = stagedMetadata.images || []; // Keep previously staged images
                        } else {
                            delete stagedMetadata[docType];
                        }
                        break; 
                    }
                }
            }
            
            // Update session storage after loop (only update stagedMetadata if changes were made)
            if (docType === 'main') {
                stagedMetadata.images = imagesToStore;
            }
            sessionStorage.setItem('stagedImageMetadata', JSON.stringify(stagedMetadata));


            submitBtn.disabled = false;
            submitBtn.textContent = 'প্রিভিউ দেখুন ও পোস্ট করুন'; 
            
            // Re-render main images if a failure occurred mid-upload
            if (docType === 'main' && previewArea.querySelector('.uploading-text')) {
                previewArea.innerHTML = '';
                if (imagesToStore.length > 0) {
                     imagesToStore.forEach(meta => handleImagePreviewDisplayFromURL(meta.url, meta.fileName, previewArea));
                } else {
                    previewArea.innerHTML = '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>';
                }
            }
        }
        
        // --- Pre-fill Image Preview Logic (Now using URL) ---
        if (stagedMetadata) {
            
            const imagePreviewArea = document.getElementById('image-preview-area');
            const stagedImages = stagedMetadata.images || [];
            
            // Main Images
            if (imagePreviewArea && stagedImages.length > 0) {
                imagePreviewArea.innerHTML = '';
                stagedImages.forEach(meta => {
                    handleImagePreviewDisplayFromURL(meta.url, meta.fileName, imagePreviewArea, true);
                });
            }
            
            // Khotian Image
            if (stagedMetadata.khotian) {
                 handleImagePreviewDisplayFromURL(stagedMetadata.khotian.url, stagedMetadata.khotian.fileName, document.getElementById('khotian-preview-area'), true);
            }
            // Sketch Image
            if (stagedMetadata.sketch) {
                handleImagePreviewDisplayFromURL(stagedMetadata.sketch.url, stagedMetadata.sketch.fileName, document.getElementById('sketch-preview-area'), true);
            }
        }
        // --- END Pre-fill Image Preview Logic ---


        // Event listeners for uploads
        const imageInput = document.getElementById('images');
        if (imageInput) {
            // New Image upload handler
            imageInput.addEventListener('change', (e) => handleImageUploadAndPreview(e, 'image-preview-area', 3, 'main'));
        }

        if (category === 'বিক্রয়') {
            const khotianImageInput = document.getElementById('khotian-image');
            if (khotianImageInput) {
                khotianImageInput.addEventListener('change', (e) => handleImageUploadAndPreview(e, 'khotian-preview-area', 1, 'khotian'));
            }
            const sketchImageInput = document.getElementById('sketch-image');
            if (sketchImageInput) {
                sketchImageInput.addEventListener('change', (e) => handleImageUploadAndPreview(e, 'sketch-preview-area', 1, 'sketch'));
            }
        }
    } 

    // Function to generate Sub-Address Fields
    function generateSubAddressFields(areaType, stagedData = null) {
        const subAddressFieldsContainer = document.getElementById('sub-address-fields');
        let subFieldsHTML = '';
        if (areaType === 'উপজেলা') {
            subFieldsHTML = `
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="upazila-name">উপজেলা:</label>
                        <input type="text" id="upazila-name" required value="${stagedData?.location?.upazila || ''}">
                    </div>
                    <div class="input-group">
                        <label for="union-name">ইউনিয়ন:</label>
                        <input type="text" id="union-name" required value="${stagedData?.location?.union || ''}">
                    </div>
                </div>
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="village-name">গ্রাম/মহল্লা:</label>
                        <input type="text" id="village-name" required value="${stagedData?.location?.village || ''}">
                    </div>
                    <div class="input-group">
                        <label for="road-name">রাস্তা/রোড:</label>
                        <input type="text" id="road-name" required value="${stagedData?.location?.road || ''}">
                    </div>
                </div>
            `;
        } else if (areaType === 'সিটি কর্পোরেশন') {
            subFieldsHTML = `
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="thana-name">থানা:</label>
                        <input type="text" id="thana-name" required value="${stagedData?.location?.thana || ''}">
                    </div>
                    <div class="input-group">
                        <label for="ward-no">ওয়ার্ড নং:</label>
                        <input type="text" id="ward-no" required value="${stagedData?.location?.wardNo || ''}">
                    </div>
                </div>
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="village-name">গ্রাম/মহল্লা:</label>
                        <input type="text" id="village-name" required value="${stagedData?.location?.village || ''}">
                    </div>
                    <div class="input-group">
                        <label for="road-name">রাস্তা/রোড:</label>
                        <input type="text" id="road-name" required value="${stagedData?.location?.road || ''}">
                    </div>
                </div>
            `;
        }
        subAddressFieldsContainer.innerHTML = subFieldsHTML;
    }


    // FIXED: Event listener for category change (to trigger dynamic fields)
    if (postCategorySelect) {
        postCategorySelect.addEventListener('change', (e) => {
            const selectedCategory = e.target.value;
            if (selectedCategory) {
                // Trigger the type dropdown generation
                generateTypeDropdown(selectedCategory);
            } else {
                dynamicFieldsContainer.innerHTML = '';
            }
        });
    }

    // --- ফর্ম সাবমিশন লজিক (ডেটা সংগ্রহ এবং প্রিভিউতে পাঠানো) ---
    propertyForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'ডেটা প্রক্রিয়াকরণ হচ্ছে...';

        try {
            const user = auth.currentUser;
            if (!user) {
                alert("পোস্ট করার আগে আপনাকে লগইন করতে হবে!");
                submitBtn.disabled = false;
                submitBtn.textContent = 'প্রিভিউ দেখুন ও পোস্ট করুন';
                return;
            }

            // check if required image files are staged
            const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');
            const stagedMetadata = stagedMetadataString ? JSON.parse(stagedMetadataString) : {};
            const mainImages = stagedMetadata.images || [];
            
            if (mainImages.length === 0) {
                 alert("অনুগ্রহ করে কমপক্ষে একটি ছবি আপলোড করুন।");
                 submitBtn.disabled = false;
                 submitBtn.textContent = 'প্রিভিউ দেখুন ও পোস্ট করুন';
                 return;
            }
            
            // Check required documents for sale property
            const category = document.getElementById('post-category')?.value;
            if (category === 'বিক্রয়') {
                if (!stagedMetadata.khotian) {
                    alert("বিক্রয়ের জন্য সর্বশেষ খতিয়ানের ছবি আপলোড করা আবশ্যক।");
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'প্রিভিউ দেখুন ও পোস্ট করুন';
                    return;
                }
                if (!stagedMetadata.sketch) {
                    alert("বিক্রয়ের জন্য প্রপার্টি স্কেস/হস্ত নকশার ছবি আপলোড করা আবশ্যক।");
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'প্রিভিউ দেখুন ও পোস্ট করুন';
                    return;
                }
            }


            // ডেটা সংগ্রহের জন্য একটি সহায়ক ফাংশন যা ইনপুট আইডি থেকে মান নেয়
            const getValue = (id) => document.getElementById(id)?.value;
            const getUtilityValues = () => {
                const checked = document.querySelectorAll('input[name="utility"]:checked');
                return Array.from(checked).map(c => c.value);
            };

            // ডেটা সংগ্রহ
            const type = getValue('post-type');
            const googleMapStatic = getValue('google-map-pin');

            // মূল ডেটা অবজেক্ট
            const propertyData = {
                category,
                type,
                title: getValue('property-title'),
                description: getValue('description'),
                phoneNumber: getValue('primary-phone'),
                secondaryPhone: getValue('secondary-phone'),
                googleMap: googleMapStatic,
                userId: user.uid,
                status: 'pending', // Will be set to 'published' in preview.js
                listerType: getValue('lister-type'),

                // ঠিকানা ডেটা
                location: {
                    division: getValue('division'),
                    district: getValue('district'),
                    areaType: getValue('area-type-select'),
                    // Dynamic fields based on area type
                    upazila: getValue('upazila-name'),
                    union: getValue('union-name'),
                    thana: getValue('thana-name'),
                    wardNo: getValue('ward-no'),
                    village: getValue('village-name'),
                    road: getValue('road-name'),
                },
                
                // NEW: Built Property Details
                propertyAge: type !== 'জমি' && type !== 'প্লট' ? getValue('property-age') : undefined,
                facing: type !== 'জমি' && type !== 'প্লট' ? getValue('facing') : undefined,
                utilities: type !== 'জমি' && type !== 'প্লট' ? getUtilityValues() : undefined, // NEW: Utility values
            };

            // টাইপ এবং ক্যাটাগরি-ভিত্তিক ডেটা যোগ
            if (category === 'বিক্রয়') {
                propertyData.price = getValue('price');
                propertyData.priceUnit = getValue('price-unit');

                // মালিকানা বিবরণ
                propertyData.owner = {
                    donorName: getValue('donor-name'),
                    dagNoType: getValue('dag-no-type-select'),
                    dagNo: getValue('dag-no-input'),
                    mouja: getValue('mouja-owner'),
                };
            }

            // প্রপার্টি টাইপ অনুসারে পরিমাণ, রুম ইত্যাদি
            if (type === 'জমি' || type === 'প্লট') {
                propertyData.landArea = getValue('land-area');
                propertyData.landAreaUnit = getValue('land-area-unit');
                propertyData.roadWidth = getValue('road-width');
                propertyData.landType = getValue('land-type');
                if (type === 'প্লট') {
                    propertyData.plotNo = getValue('plot-no');
                }
            } else if (type !== 'জমি' && type !== 'প্লট') {
                // বাড়ি/ফ্লাট/অফিস/দোকান
                
                if (type === 'বাড়ি') {
                    propertyData.floors = getValue('floors');
                    propertyData.houseArea = getValue('house-area');
                    propertyData.houseAreaUnit = getValue('house-area-unit');
                    propertyData.roadWidth = getValue('road-width');
                } else if (type === 'ফ্লাট') {
                    propertyData.rooms = getValue('rooms');
                    propertyData.bathrooms = getValue('bathrooms');
                    propertyData.kitchen = getValue('kitchen');
                    propertyData.roadWidth = getValue('road-width');
                    propertyData.areaSqft = getValue('flat-area-sqft');
                    propertyData.floorNo = getValue('floor-no');
                } else if (type === 'অফিস') {
                    propertyData.rooms = getValue('rooms');
                    propertyData.bathrooms = getValue('bathrooms');
                    propertyData.floorNo = getValue('floor-no');
                }

                if (type === 'অফিস' || type === 'দোকান') {
                    propertyData.commercialArea = getValue('commercial-area');
                    propertyData.commercialAreaUnit = getValue('commercial-area-unit');
                }

                if (type === 'দোকান') {
                    propertyData.commercialArea = getValue('commercial-area');
                    propertyData.commercialAreaUnit = getValue('commercial-area-unit');
                    propertyData.shopCount = getValue('shop-count');
                }
            
                // ভাড়ার জন্য
                if (category === 'ভাড়া') {
                    propertyData.monthlyRent = getValue('monthly-rent');
                    propertyData.advance = getValue('advance');
                    propertyData.moveInDate = getValue('move-in-date');
                    if (type === 'বাড়ি' || type === 'ফ্লাট') {
                         propertyData.rentType = getValue('rent-type');
                    }
                }
            }
            
            // ডেটা এবং ইমেজ মেটাডেটা সেশন স্টোরেজে সংরক্ষণ
            sessionStorage.setItem('stagedPropertyData', JSON.stringify(propertyData));
            // Image metadata is already in session storage (stagedImageMetadata)

            // প্রিভিউ পেজে রিডাইরেক্ট
            window.location.href = 'preview.html';

        } catch (error) {
            console.error("ডেটা সংরক্ষণে সমস্যা:", error);
            alert("ফর্ম ডেটা সংরক্ষণে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
            submitBtn.disabled = false;
            submitBtn.textContent = 'প্রিভিউ দেখুন ও পোস্ট করুন';
        }
    });

    // --- FIXED/UPDATED: Auth State Change Logic for UI updates and Profile Image/Phone ---
    
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    const profileImageWrapper = document.getElementById('profileImageWrapper');
    const headerProfileImage = document.getElementById('profileImage'); // Assuming this is the image tag ID
    const defaultProfileIcon = document.getElementById('defaultProfileIcon'); // Assuming this is the icon ID
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');
    
    if (typeof auth !== 'undefined' && auth.onAuthStateChanged) {
        auth.onAuthStateChanged(user => {
            const authWarningMessage = document.getElementById('auth-warning-message');
            const propertyFormDisplay = document.getElementById('property-form');
            const primaryPhoneInput = document.getElementById('primary-phone');

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
                // FIXED: Fetch user data from Firestore to get profile image URL and phone number
                db.collection('users').doc(user.uid).get().then(doc => {
                    const userData = doc.data();

                    if (propertyFormDisplay) propertyFormDisplay.style.display = 'block';
                    if (authWarningMessage) authWarningMessage.style.display = 'none';
                    if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
                    
                    if (loginLinkSidebar) {
                        loginLinkSidebar.textContent = 'লগআউট';
                        loginLinkSidebar.href = '#';
                        loginLinkSidebar.onclick = handleLogout;
                    }
                    
                    if (primaryPhoneInput && userData?.phoneNumber) {
                        primaryPhoneInput.value = userData.phoneNumber; 
                        primaryPhoneInput.disabled = true; 
                    } else if (primaryPhoneInput && user.phoneNumber) {
                        primaryPhoneInput.value = user.phoneNumber;
                        primaryPhoneInput.disabled = true; 
                    }

                    // FIXED: Header UI update - use Firestore profile image if available
                    if (headerProfileImage && defaultProfileIcon) {
                        const profileURL = userData?.profileImageURL || user.photoURL;
                        if (profileURL) {
                            headerProfileImage.src = profileURL; 
                            headerProfileImage.style.display = 'block';
                            defaultProfileIcon.style.display = 'none';
                        } else {
                            headerProfileImage.style.display = 'none';
                            defaultProfileIcon.style.display = 'block';
                        }
                    }
                    if (profileImageWrapper) profileImageWrapper.style.display = 'flex';
                    
                    // NEW: Load staged data on successful auth
                    loadStagedData(); 

                }).catch(error => {
                    console.error("Failed to fetch user data for profile image:", error);
                    // Default to showing profile wrapper if fetch fails
                    if (profileImageWrapper) profileImageWrapper.style.display = 'flex';
                    loadStagedData(); 
                });
                
            } else {
                if (propertyFormDisplay) propertyFormDisplay.style.display = 'none';
                if (authWarningMessage) authWarningMessage.style.display = 'block';
                if (postLinkSidebar) postLinkSidebar.style.display = 'none';
                
                if (loginLinkSidebar) {
                    loginLinkSidebar.textContent = 'লগইন';
                    loginLinkSidebar.href = 'auth.html';
                    loginLinkSidebar.onclick = null;
                }
                
                // Reset/Hide Header UI
                if (headerProfileImage && defaultProfileIcon) {
                    headerProfileImage.style.display = 'none';
                    defaultProfileIcon.style.display = 'block';
                }
                if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 
            }
        });
    }

    // --- হেডার আইকন কার্যকারিতা ---

    // নোটিফিকেশন আইকন রিডাইরেক্ট
    if (notificationButton) {
        notificationButton.addEventListener('click', () => {
             window.location.href = 'notifications.html'; 
        });
    }

    // পোস্ট আইকন রিডাইরেক্ট
    if (headerPostButton) {
        headerPostButton.addEventListener('click', () => {
            window.location.href = 'post.html'; 
        });
    }

    // ম্যাসেজ আইকন রিডাইরেক্ট
    if (messageButton) {
        messageButton.addEventListener('click', () => {
             window.location.href = 'messages.html';
        });
    }
    
    // প্রোফাইল ইমেজ রিডাইরেক্ট
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }
});
