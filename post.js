// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Utility Function: File to Base64 (for staging)
const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
});

// Utility Function: Base64 Data URL to Blob (for preview display)
const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], {type:mime});
}


document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');

    // --- NEW: Function to load and pre-fill data from session storage for editing ---
    function loadStagedData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');
        
        if (!stagedDataString || !stagedMetadataString) return;

        try {
            const stagedData = JSON.parse(stagedDataString);
            const stagedMetadata = JSON.parse(stagedMetadataString);

            // Set simple fields
            document.getElementById('lister-type').value = stagedData.listerType || '';
            document.getElementById('post-category').value = stagedData.category || '';

            // Trigger dynamic field generation
            if (stagedData.category) {
                generateTypeDropdown(stagedData.category);
                
                // Set a timeout to allow the dynamic fields to render before setting values
                setTimeout(() => {
                    const postTypeSelect = document.getElementById('post-type');
                    if (postTypeSelect && stagedData.type) {
                        postTypeSelect.value = stagedData.type;
                        generateSpecificFields(stagedData.category, stagedData.type, stagedData, stagedMetadata);
                    }
                }, 100); 
            }
            
            // Show a message
            alert('আপনার সংরক্ষিত তথ্য এডিটের জন্য লোড করা হয়েছে।');

        } catch (error) {
            console.error('Error loading staged data:', error);
            sessionStorage.removeItem('stagedPropertyData');
            sessionStorage.removeItem('stagedImageMetadata');
        }
    }


    // Function to generate and display the main property type dropdown based on category
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
            
            // 2. Utilities/Amenities
            descriptionHTML += `
                <div class="input-group">
                    <label>অন্যান্য সুবিধা:</label>
                    <div class="radio-group utility-checkbox-group" style="display: flex; flex-wrap: wrap; gap: 15px;">
                        ${(type === 'ফ্লাট' || type === 'অফিস' || type === 'বাড়ি') ? `<label><input type="checkbox" name="utility" value="লিফট" id="utility-lift" ${stagedData?.utilities?.includes('লিফট') ? 'checked' : ''}> লিফট</label>` : ''}
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
        } else if (type === 'বাড়ি' || type === 'ফ্লাট' || type === 'অফিস') {
            const parkingYesChecked = stagedData?.parking === 'হ্যাঁ' ? 'checked' : '';
            const parkingNoChecked = stagedData?.parking === 'না' ? 'checked' : '';
             descriptionHTML += `
                <div class="input-group">
                    <label>পার্কিং সুবিধা:</label>
                    <div class="radio-group">
                        <input type="radio" id="parking-yes" name="parking" value="হ্যাঁ" ${parkingYesChecked} required><label for="parking-yes">হ্যাঁ</label>
                        <input type="radio" id="parking-no" name="parking" value="না" ${parkingNoChecked}><label for="parking-no">না</label>
                    </div>
                </div>
            `;
            
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
                    <input type="tel" id="primary-phone" value="${stagedData?.phoneNumber || '017xxxxxxxx'}" required>
                    <p class="small-text">প্রোফাইল থেকে নাম্বার লোড হবে, চাইলে আপনি ইডিট করতে পারবেন।</p>
                </div>
                <div class="input-group">
                    <label for="secondary-phone">অতিরিক্ত ফোন নম্বর (ঐচ্ছিক):</label>
                    <input type="tel" id="secondary-phone" placeholder="অন্য কোনো নম্বর থাকলে" value="${stagedData?.secondaryPhone || ''}">
                </div>
            </div>
        `;
        fieldsHTML += contactHTML;

        // --- সেকশন ৬: বিস্তারিত ---
        fieldsHTML += `
            <div class="input-group description-final-group">
                <label for="description">সম্পূর্ণ বিস্তারিত বিবরণ:</label>
                <textarea id="description" rows="6" placeholder="আপনার প্রপার্টির বিস্তারিত তথ্য, সুবিধা এবং বিশেষত্ব লিখুন।" required>${stagedData?.description || ''}</textarea>
            </div>
        `;
        
        // সব ফিল্ড কনটেইনারে যুক্ত করা
        specificFieldsContainer.innerHTML = fieldsHTML;
        
        // ডাইনামিক সাব-ফিল্ড হ্যান্ডেলিং
        const areaTypeSelect = document.getElementById('area-type-select');
        if(areaTypeSelect) {
             areaTypeSelect.addEventListener('change', (e) => generateSubAddressFields(e.target.value));
             // Load sub-address fields if data is staged
             if (stagedData?.location?.areaType) {
                generateSubAddressFields(stagedData.location.areaType, stagedData);
             }
        }
        
        // --- NEW: Pre-fill Image Preview Logic ---
        if (stagedData && stagedMetadata) {
            const tempDt = new DataTransfer();
            
            // Main Images
            const imagesInput = document.getElementById('images');
            stagedData.base64Images?.forEach((base64, index) => {
                const metadata = stagedMetadata.images[index];
                const blob = dataURLtoBlob(base64);
                const file = new File([blob], metadata.name, {type: metadata.type});
                tempDt.items.add(file);
                // Also show preview
                handleImagePreviewFromBase64(base64, metadata.name, 'image-preview-area', 3);
            });
            if (imagesInput) imagesInput.files = tempDt.files;

            // Khotian Image
            if (stagedData.owner?.khotianBase64 && stagedMetadata.khotian) {
                handleImagePreviewFromBase64(stagedData.owner.khotianBase64, stagedMetadata.khotian.name, 'khotian-preview-area', 1);
            }
            
            // Sketch Image
            if (stagedData.owner?.sketchBase64 && stagedMetadata.sketch) {
                handleImagePreviewFromBase64(stagedData.owner.sketchBase64, stagedMetadata.sketch.name, 'sketch-preview-area', 1);
            }
        }
        // --- END Pre-fill Image Preview Logic ---


        // Image Preview Handler and Cross Button Logic
        const imageInput = document.getElementById('images');
        if (imageInput) {
            imageInput.addEventListener('change', (e) => handleImagePreview(e, 'image-preview-area', 3));
        }
        
        // মালিকানা বিবরণের ছবি প্রিভিউ
        if (category === 'বিক্রয়') {
            const khotianImageInput = document.getElementById('khotian-image');
            if (khotianImageInput) {
                khotianImageInput.addEventListener('change', (e) => handleImagePreview(e, 'khotian-preview-area', 1));
            }
            const sketchImageInput = document.getElementById('sketch-image');
            if (sketchImageInput) {
                sketchImageInput.addEventListener('change', (e) => handleImagePreview(e, 'sketch-preview-area', 1));
            }
        }
    }
    
    // Function to generate Sub-Address Fields (MODIFIED to accept stagedData)
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
                        <label for="thana-name">থানা:</label>
                        <input type="text" id="thana-name" required value="${stagedData?.location?.thana || ''}">
                    </div>
                    <div class="input-group">
                        <label for="ward-no">ওয়ার্ড নং (ঐচ্ছিক):</label>
                        <input type="number" id="ward-no" value="${stagedData?.location?.wardNo || ''}">
                    </div>
                </div>
                <div class="input-group">
                    <label for="village-name">গ্রাম:</label>
                    <input type="text" id="village-name" required value="${stagedData?.location?.village || ''}">
                </div>
                <div class="input-group">
                    <label for="road-name">রোড:</label>
                    <input type="text" id="road-name" required value="${stagedData?.location?.road || ''}">
                </div>
            `;
        } else if (areaType === 'সিটি কর্পোরেশন') {
             subFieldsHTML = `
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="city-corp-name">সিটি কর্পোরেশন:</label>
                        <input type="text" id="city-corp-name" required value="${stagedData?.location?.cityCorporation || ''}">
                    </div>
                    <div class="input-group">
                        <label for="thana-name">থানা:</label>
                        <input type="text" id="thana-name" required value="${stagedData?.location?.thana || ''}">
                    </div>
                </div>
                <div class="input-group">
                    <label for="ward-no">ওয়ার্ড নং:</label>
                    <input type="number" id="ward-no" required value="${stagedData?.location?.wardNo || ''}">
                </div>
                <div class="input-group">
                    <label for="village-name">গ্রাম:</label>
                    <input type="text" id="village-name" required value="${stagedData?.location?.village || ''}">
                </div>
                <div class="input-group">
                    <label for="road-name">রোড:</label>
                    <input type="text" id="road-name" required value="${stagedData?.location?.road || ''}">
                </div>
            `;
        } else {
            subFieldsHTML = '';
        }
        
        subAddressFieldsContainer.innerHTML = subFieldsHTML;
    }

    // Function to handle Image Preview (From File Object)
    function handleImagePreview(event, previewAreaId, maxFiles = 3) {
        // ... (Existing implementation remains the same, but remove Base64 pre-fill logic)
        const previewArea = document.getElementById(previewAreaId);
        
        // Clear preview area if it's not a multi-file append
        if (maxFiles === 1) {
            previewArea.innerHTML = '';
        } else if (previewArea.children.length === 0 || maxFiles > 1) {
            previewArea.innerHTML = ''; 
        }

        const files = event.target.files;
        
        if (files.length > maxFiles) {
            alert(`আপনি সর্বোচ্চ ${maxFiles}টি ছবি আপলোড করতে পারবেন।`);
            event.target.value = ''; 
            previewArea.innerHTML = '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>';
            return;
        }

        if (files.length === 0 && maxFiles > 1) {
            previewArea.innerHTML = '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>';
            return;
        }

        const currentFilesArray = Array.from(files); 

        for (const file of currentFilesArray) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    handleImagePreviewDisplay(e.target.result, file.name, previewArea, event.target, maxFiles);
                };
                reader.readAsDataURL(file);
            }
        }
    }
    
    // NEW: Function to display Base64 image in preview (for editing)
    function handleImagePreviewFromBase64(base64Data, fileName, previewAreaId, maxFiles) {
        const previewArea = document.getElementById(previewAreaId);
        // We use the Base64 data as the source URL
        handleImagePreviewDisplay(base64Data, fileName, previewArea, null, maxFiles, true);
    }
    
    // Reusable function to render the preview image and button
    function handleImagePreviewDisplay(src, fileName, previewArea, inputElement = null, maxFiles = 3, isStaged = false) {
        const previewWrapper = document.createElement('div');
        previewWrapper.className = 'image-preview-wrapper';
        previewWrapper.dataset.filename = fileName; 

        const img = document.createElement('img');
        img.src = src;
        img.className = 'preview-image';
        
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-image-btn';
        removeButton.innerHTML = '&times;'; 
        removeButton.style.backgroundColor = 'red';
        removeButton.style.color = 'white';
        
        // রিমুভ লজিক
        removeButton.addEventListener('click', (e) => {
            e.preventDefault(); 
            
            // For staged data, we just remove the visual, the user must re-upload to confirm removal.
            if (isStaged) {
                previewWrapper.remove();
                if (previewArea.children.length === 0) {
                     previewArea.innerHTML = `<p class="placeholder-text">এখানে ${maxFiles === 1 ? 'খতিয়ানের ছবি' : 'আপলোড করা ছবিগুলো'} দেখা যাবে।</p>`;
                }
                return;
            }

            // For newly selected files
            if (!inputElement) return;

            const dt = new DataTransfer();
            const currentInputFiles = Array.from(inputElement.files);
            
            const fileIndexToRemove = currentInputFiles.findIndex(f => 
                f.name === fileName 
            );
            
            if (fileIndexToRemove !== -1) {
                currentInputFiles.splice(fileIndexToRemove, 1);
                currentInputFiles.forEach(f => dt.items.add(f));
                inputElement.files = dt.files; 
                
                previewWrapper.remove(); 
                
                if (dt.files.length === 0) {
                    previewArea.innerHTML = `<p class="placeholder-text">এখানে ${maxFiles === 1 ? 'খতিয়ানের ছবি' : 'আপলোড করা ছবিগুলো'} দেখা যাবে।</p>`;
                }
            }
        });
        
        previewWrapper.appendChild(img);
        previewWrapper.appendChild(removeButton);
        
        if (maxFiles === 1) {
            previewArea.innerHTML = '';
        }
        previewArea.appendChild(previewWrapper);
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

    // --- MODIFIED FORM SUBMIT: STAGE DATA IN SESSION STORAGE ---
    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'ডেটা প্রক্রিয়াকরণ হচ্ছে...';

        try {
            const user = auth.currentUser;
            if (!user) {
                alert("পোস্ট করার আগে আপনাকে লগইন করতে হবে!");
                submitBtn.disabled = false;
                submitBtn.textContent = 'পোস্ট করুন';
                return;
            }

            const imageInput = document.getElementById('images');
            const imageFiles = imageInput?.files;
            const khotianFile = document.getElementById('khotian-image')?.files?.[0];
            const sketchFile = document.getElementById('sketch-image')?.files?.[0];


            if (!imageFiles || imageFiles.length === 0) {
                 alert("অনুগ্রহ করে কমপক্ষে একটি ছবি আপলোড করুন।");
                 submitBtn.disabled = false;
                 submitBtn.textContent = 'পোস্ট করুন';
                 return;
            }

            // ডেটা সংগ্রহের জন্য একটি সহায়ক ফাংশন যা ইনপুট আইডি থেকে মান নেয়
            const getValue = (id) => document.getElementById(id)?.value;
            const getUtilityValues = () => {
                const checked = document.querySelectorAll('input[name="utility"]:checked');
                return Array.from(checked).map(c => c.value);
            };
            
            // ডেটা সংগ্রহ
            const category = getValue('post-category');
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
                status: 'pending',
                
                listerType: getValue('lister-type'), 

                // ঠিকানা ডেটা
                location: {
                    division: getValue('division'),
                    district: getValue('district'),
                    areaType: getValue('area-type-select'),
                    village: getValue('village-name'),
                    road: getValue('road-name'),
                    thana: getValue('thana-name'),
                    wardNo: getValue('ward-no'),
                },
                
                // NEW: Built Property Details
                propertyAge: type !== 'জমি' && type !== 'প্লট' ? getValue('property-age') : undefined,
                facing: type !== 'জমি' && type !== 'প্লট' ? getValue('facing') : undefined,
                utilities: type !== 'জমি' && type !== 'প্লট' ? getUtilityValues() : undefined
            };

            // ... (Add all other specific propertyData fields from original post.js logic) ...
            // ঠিকানা উপ-ফিল্ড যুক্ত করা
            if (propertyData.location.areaType === 'উপজেলা') {
                propertyData.location.upazila = getValue('upazila-name');
                propertyData.location.union = getValue('union-name');
            } else if (propertyData.location.areaType === 'সিটি কর্পোরেশন') {
                propertyData.location.cityCorporation = getValue('city-corp-name');
            }
            
            // অতিরিক্ত ক্যাটাগরি/টাইপ-ভিত্তিক ফিল্ড যোগ করা (বিক্রয়)
            if (category === 'বিক্রয়') {
                propertyData.price = getValue('price');
                propertyData.priceUnit = getValue('price-unit');
                
                propertyData.owner = {
                    donorName: getValue('donor-name'),
                    dagNoType: getValue('dag-no-type-select'),
                    dagNo: getValue('dag-no-input'), 
                    mouja: getValue('mouja-owner')
                };

                if (type === 'জমি' || type === 'প্লট') {
                    propertyData.landArea = getValue('land-area');
                    propertyData.landAreaUnit = getValue('land-area-unit');
                    propertyData.roadWidth = getValue('road-width');
                    propertyData.landType = getValue('land-type');
                    if (type === 'প্লট') propertyData.plotNo = getValue('plot-no');
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
                    } else if (type === 'অফিস') {
                        propertyData.rooms = getValue('rooms');
                        propertyData.bathrooms = getValue('bathrooms');
                        propertyData.floorNo = getValue('floor-no');
                    }
                    if (type === 'অফিস' || type === 'দোকান') {
                         propertyData.commercialArea = getValue('commercial-area');
                         propertyData.commercialAreaUnit = getValue('commercial-area-unit');
                    }
                } else if (type === 'দোকান') {
                    propertyData.commercialArea = getValue('commercial-area');
                    propertyData.commercialAreaUnit = getValue('commercial-area-unit');
                    propertyData.shopCount = getValue('shop-count');
                }
            } 
            
            // ভাড়ার জন্য
            else if (category === 'ভাড়া') {
                propertyData.monthlyRent = getValue('monthly-rent');
                propertyData.advance = getValue('advance');
                propertyData.moveInDate = getValue('move-in-date');
                
                 if (type === 'বাড়ি' || type === 'ফ্লাট' || type === 'অফিস') {
                    propertyData.parking = document.querySelector('input[name="parking"]:checked')?.value;
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
                } 
                if (type === 'অফিস' || type === 'দোকান') {
                    propertyData.commercialArea = getValue('commercial-area');
                    propertyData.commercialAreaUnit = getValue('commercial-area-unit');
                }
                if (type === 'দোকান') {
                    propertyData.shopCount = getValue('shop-count');
                }
            }
            
            // --- NEW: Convert all files to Base64 strings for staging ---
            const base64Images = [];
            const imageMetadata = {
                 images: Array.from(imageFiles).map(f => ({name: f.name, type: f.type})),
                 khotian: khotianFile ? {name: khotianFile.name, type: khotianFile.type} : null,
                 sketch: sketchFile ? {name: sketchFile.name, type: sketchFile.type} : null
            };
            
            // Main Images
            for (const file of imageFiles) {
                base64Images.push(await fileToBase64(file));
            }
            propertyData.base64Images = base64Images;
            
            // Ownership documents
            if (category === 'বিক্রয়') {
                if (khotianFile) {
                    propertyData.owner.khotianBase64 = await fileToBase64(khotianFile);
                }
                if (sketchFile) {
                    propertyData.owner.sketchBase64 = await fileToBase64(sketchFile);
                }
            }
            
            // 2. Save the complete property data and metadata to Session Storage
            sessionStorage.setItem('stagedPropertyData', JSON.stringify(propertyData));
            sessionStorage.setItem('stagedImageMetadata', JSON.stringify(imageMetadata));

            // 3. Redirect to the preview page
            alert("ডেটা সংরক্ষণ করা হয়েছে। প্রিভিউ পেজে নিয়ে যাওয়া হচ্ছে...");
            window.location.href = 'preview.html'; 
            
            
        } catch (error) {
            console.error("ডেটা প্রক্রিয়া করতে সমস্যা হয়েছে: ", error);
            alert("ডেটা প্রক্রিয়াকরণ ব্যর্থ হয়েছে: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'প্রিভিউ দেখুন'; // Change button text to reflect staging
        }
    });

    // Auth state change handler for UI updates (পূর্বের লজিক)
    auth.onAuthStateChanged(user => {
        // ... (Existing Auth logic remains the same) ...
        const authWarningMessage = document.getElementById('auth-warning-message');
        const postLinkSidebar = document.getElementById('post-link-sidebar-menu'); 
        const loginLinkSidebar = document.getElementById('login-link-sidebar');
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
            if (propertyFormDisplay) propertyFormDisplay.style.display = 'block';
            if (authWarningMessage) authWarningMessage.style.display = 'none';
            
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout;
            }
            
             if (primaryPhoneInput) {
                primaryPhoneInput.value = '01712345678'; 
                primaryPhoneInput.disabled = false; 
             }
             
             // NEW: Load staged data on successful auth
             loadStagedData();

        } else {
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
    
    // Set the initial submit button text
    if (submitBtn) {
         submitBtn.textContent = 'এগিয়ে যান';
    }
});

// header_logic.js

// Firebase SDKs (আপনার মূল HTML ফাইলে লোড করা থাকতে হবে)
// const db = firebase.firestore(); 
// const auth = firebase.auth();
// ধরে নেওয়া হচ্ছে db এবং auth ভ্যারিয়েবলগুলো বিশ্বব্যাপী (globally) সংজ্ঞায়িত আছে।

// --- ফাংশন ১: হেডার প্রোফাইল লোড করার জন্য ---
function loadHeaderProfile(user) {
    const headerProfileImage = document.getElementById('profileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');

    // db এর গ্লোবাল অ্যাক্সেস ধরে নেওয়া হয়েছে
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.profilePictureUrl && headerProfileImage && defaultProfileIcon) {
                headerProfileImage.src = data.profilePictureUrl;
                headerProfileImage.style.display = 'block';
                defaultProfileIcon.style.display = 'none';
            }
        }
    }).catch(error => {
        console.error("Header profile load failed:", error);
    });
}

// --- ফাংশন ২: লগআউট হ্যান্ডেলার ---
const handleLogout = async (e) => {
    e.preventDefault();
    try {
        // auth এর গ্লোবাল অ্যাক্সেস ধরে নেওয়া হয়েছে
        await auth.signOut(); 
        alert('সফলভাবে লগআউট করা হয়েছে!');
        window.location.href = 'index.html'; 
    } catch (error) {
        console.error("লগআউট ব্যর্থ হয়েছে:", error);
        alert("লগআউট ব্যর্থ হয়েছে।");
    }
};


document.addEventListener('DOMContentLoaded', function() {
    
    // --- হেডার UI উপাদানগুলো ---
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    const profileImageWrapper = document.getElementById('profileImageWrapper'); 
    const headerProfileImage = document.getElementById('profileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');


    // --- অথেন্টিকেশন স্টেট চেঞ্জ লজিক (হেডার/সাইডবার UI আপডেট) ---
    // ধরে নেওয়া হচ্ছে auth ভ্যারিয়েবল গ্লোবালি সংজ্ঞায়িত আছে।
    if (typeof auth !== 'undefined' && auth.onAuthStateChanged) {
        auth.onAuthStateChanged(user => {
            if (user) {
                // লগইন অবস্থায়: প্রোফাইল ইমেজ লোড এবং সঠিক সাইডবার লিঙ্ক দেখানো
                loadHeaderProfile(user); 
                if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 

                // সাইডবার লিঙ্ক আপডেট
                if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
                if (loginLinkSidebar) {
                    loginLinkSidebar.textContent = 'লগআউট';
                    loginLinkSidebar.href = '#'; 
                    loginLinkSidebar.onclick = handleLogout; 
                }
            } else {
                // লগআউট অবস্থায়: ডিফল্ট আইকন দেখানো এবং সাইডবার লিঙ্ক আপডেট
                if (headerProfileImage && defaultProfileIcon) {
                    headerProfileImage.style.display = 'none';
                    defaultProfileIcon.style.display = 'block';
                }
                if (profileImageWrapper) profileImageWrapper.style.display = 'flex';
                
                // সাইডবার লিঙ্ক আপডেট
                if (postLinkSidebar) postLinkSidebar.style.display = 'none';
                if (loginLinkSidebar) {
                    loginLinkSidebar.textContent = 'লগইন';
                    loginLinkSidebar.href = 'auth.html';
                    loginLinkSidebar.onclick = null;
                }
            }
        });
    }

    // --- হেডার আইকন কার্যকারিতা ---
    
    // মেনু বাটন এবং সাইডবার টগল
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

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

// --- সাইডবার কার্যকারিতা ---
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    
});
