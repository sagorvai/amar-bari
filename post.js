// post.js - Revised for direct Firebase Storage upload, dynamic form fix, and profile loading fix
// Integrated with Client-side Canvas Compression and Facebook-style Live Progress UI

// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// 💡 ১. ক্যানভাস (Canvas API) দিয়ে ক্লায়েন্ট-সাইডেই ছবি কম্প্রেস করার ফাংশন
const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // রেজোলিউশন ঠিক রেখে সাইজ বড় হলে স্কেল ডাউন করা
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // jpeg ফরম্যাটে কোয়ালিটি কমিয়ে ব্লব (Blob) তৈরি করা
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error('ইমেজ কম্প্রেশন ব্যর্থ হয়েছে'));
                    }
                }, 'image/jpeg', quality);
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

// 💡 ২. ফেসবুকের মতো প্রিভিউ বক্স এবং প্রোগ্রেস ওভারলে তৈরি করার ফাংশন
function createUploadPreviewBox(previewArea, fileId, initialFile) {
    // কোনো ডিফল্ট প্লেসহোল্ডার লেখা থাকলে তা মুছে ফেলা
    const placeholder = previewArea.querySelector('.placeholder-text');
    if (placeholder) placeholder.remove();

    const wrapper = document.createElement('div');
    wrapper.className = 'image-preview-wrapper';
    wrapper.id = `box-${fileId}`;

    const img = document.createElement('img');
    img.className = 'preview-image';
    img.src = URL.createObjectURL(initialFile); // আপলোড শেষ হওয়ার আগেই লোকাল প্রিভিউ দেখাবে

    const overlay = document.createElement('div');
    overlay.className = 'upload-overlay';
    overlay.innerHTML = `<div class="spinner-loader"></div><span class="pct-text">০%</span>`;

    wrapper.appendChild(img);
    wrapper.appendChild(overlay);
    previewArea.appendChild(wrapper);
}

document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');
    
    const messageButton = document.getElementById('messageButton');
    const profileImageWrapper = document.getElementById('profileImageWrapper');

    // Function to load and pre-fill data from session storage for editing
    function loadStagedData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');
        
        if (!stagedDataString) return; 

        try {
            const stagedData = JSON.parse(stagedDataString);
            const stagedMetadata = stagedMetadataString ? JSON.parse(stagedMetadataString) : {};

            document.getElementById('lister-type').value = stagedData.listerType || '';
            document.getElementById('post-category').value = stagedData.category || '';

            if (stagedData.category) {
                generateTypeDropdown(stagedData.category);
                
                setTimeout(() => {
                    const postTypeSelect = document.getElementById('post-type');
                    if (postTypeSelect && stagedData.type) {
                        postTypeSelect.value = stagedData.type;
                        generateSpecificFields(stagedData.category, stagedData.type, stagedData, stagedMetadata); 
                    }
                }, 100); 
            }
        } catch (error) {
            console.error('Error loading staged data:', error);
            sessionStorage.removeItem('stagedPropertyData');
            sessionStorage.removeItem('stagedImageMetadata');
        }
    }

    // Function to generate and display the main property type dropdown
    function generateTypeDropdown(category) {
        let options = [];
        if (category === 'বিক্রয়') {
            options = ['জমি', 'প্লট', 'বাড়ি', 'ফ্লাট', 'দোকান', 'অফিস']; 
        } else if (category === 'ভাড়া') {
            options = ['বাড়ি', 'ফ্লাট', 'অফিস', 'দোকান']; 
        }

        const typeSelectHTML = `
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
    
    // Function to generate specific input fields based on type
    function generateSpecificFields(category, type, stagedData = null, stagedMetadata = null) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        let fieldsHTML = '';
        
        if (!type) {
             specificFieldsContainer.innerHTML = '';
             return;
        }

        let categoryDescriptionText = category === 'ভাড়া' ? 'ভাড়ার বিবরণ' : `${category}ের বিবরণ`;

        let descriptionHTML = `
            <div class="form-section property-details-section">
                <h3>${type} ${categoryDescriptionText}</h3>
                
                <div class="input-group">
                    <label>প্রপার্টি ছবি (সর্বোচ্চ ৩টি):</label>
                    <div class="custom-upload-box" onclick="document.getElementById('images').click()">
                        <i class="material-icons upload-icon-cloud">cloud_upload</i>
                        <div class="upload-text-main">একটি ফাইল আপলোড করুন</div>
                        <div class="upload-text-sub">এখানে ফাইল ড্রাগ করুন অথবা নিচের বাটনে চাপুন</div>
                        <div class="upload-btn-fake">Choose File</div>
                    </div>
                    <input type="file" id="images" accept="image/*" multiple required style="display: none;">
                    <div class="image-preview-area" id="image-preview-area"></div>
                </div>

                <div class="input-group">
                    <label for="property-title">শিরোনাম:</label>
                    <input type="text" id="property-title" required value="${stagedData?.title || ''}">
                </div>
        `;
        
        if (type !== 'জমি' && type !== 'প্লট') {
            const parkingUtilityValue = 'পার্কিং সুবিধা';
            let parkingChecked = stagedData?.utilities?.includes(parkingUtilityValue) ? 'checked' : '';
            if (!parkingChecked && stagedData?.parking === 'হ্যাঁ') {
                parkingChecked = 'checked';
            }
            
            descriptionHTML += `
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="facing">প্রপার্টির দিক:</label>
                        <select id="facing">
                            <option value="">-- নির্বাচন করুন (ঐচ্ছিক) --</option>
                            <option value="উত্তর" ${stagedData?.facing === 'উত্তর' ? 'selected' : ''}>উত্তর</option>
                            <option value="দক্ষিণ" ${stagedData?.facing === 'দক্ষিণ' ? 'selected' : ''}>দক্ষিণ</option>
                            <option value="পূর্ব" ${stagedData?.facing === 'পূর্ব' ? 'selected' : ''}>পূর্ব</option>
                            <option value="पश्चिम" ${stagedData?.facing === 'পশ্চিম' ? 'selected' : ''}>পশ্চিম</option>
                        </select>
                    </div>
                </div>
                <div class="input-group">
                    <label>অন্যান্য সুবিধা:</label>
                    <div class="radio-group utility-checkbox-group" style="display: flex; flex-wrap: wrap; gap: 15px;">
                        ${(type === 'ফ্লাট' || type === 'অফিস' || type === 'বাড়ি') ? `<label><input type="checkbox" name="utility" value="লিফট" ${stagedData?.utilities?.includes('লিফট') ? 'checked' : ''}> লিফট</label>` : ''}
                        ${(type === 'ফ্লাট' || type === 'অফিস' || type === 'বাড়ি') ? `<label><input type="checkbox" name="utility" value="${parkingUtilityValue}" ${parkingChecked}> ${parkingUtilityValue}</label>` : ''}
                        <label><input type="checkbox" name="utility" value="সিকিউরিটি গার্ড" ${stagedData?.utilities?.includes('সিকিউরিটি গার্ড') ? 'checked' : ''}> সিকিউরিটি গার্ড</label>
                        <label><input type="checkbox" name="utility" value="গ্যাস সংযোগ" ${stagedData?.utilities?.includes('গ্যাস সংযোগ') ? 'checked' : ''}> গ্যাস সংযোগ</label>
                    </div>
                </div>
            `;
        }

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
                        <option value="ভিটা" ${stagedData?.landType === 'ভিটা' ? 'selected' : ''}>ভিটা</option>
                    </select>
                </div>
            `;
            if (type === 'প্লট') {
                 descriptionHTML += `<div class="input-group"><label for="plot-no">প্লট নং (ঐচ্ছিক):</label><input type="text" id="plot-no" value="${stagedData?.plotNo || ''}"></div>`;
            }
        } else {
            if (type === 'বাড়ি' || type === 'ফ্লাট') {
                descriptionHTML += `
                    <div class="input-group">
                        <label for="property-age">প্রপার্টির বয়স (বছর):</label>
                        <input type="number" id="property-age" min="0" required value="${stagedData?.propertyAge || ''}">
                    </div>
                    <div class="input-group">
                        <label for="road-width">চলাচলের রাস্তা (ফিট):</label>
                        <input type="number" id="road-width" required value="${stagedData?.roadWidth || ''}">
                    </div>
                    <div class="input-group"><label for="dining">ডাইনিং:</label><input type="number" id="dining" required value="${stagedData?.dining || ''}"></div>
                    <div class="input-group"><label for="balcony">বেলকনি:</label><input type="number" id="balcony" required value="${stagedData?.balcony || ''}"></div>
                `;
            }

            if (type === 'বাড়ি') {
                 descriptionHTML += `<div class="input-group"><label for="floors">তলা সংখ্যা (ঐচ্ছিক):</label><input type="number" id="floors" value="${stagedData?.floors || ''}"></div>`;
            } else if (type === 'ফ্লাট' || type === 'অফিস') {
                descriptionHTML += `<div class="input-group"><label for="floor-no">ف্লোর নং:</label><input type="number" id="floor-no" required value="${stagedData?.floorNo || ''}"></div>`;
            }

            if (type !== 'দোকান') {
                descriptionHTML += `
                    <div class="input-inline-group">
                        <div class="input-group"><label for="rooms">রুম সংখ্যা:</label><input type="number" id="rooms" required value="${stagedData?.rooms || ''}"></div>
                        <div class="input-group"><label for="bathrooms">বাথরুম সংখ্যা:</label><input type="number" id="bathrooms" required value="${stagedData?.bathrooms || ''}"></div>
                        ${(type === 'বাড়ি' || type === 'ফ্লাট') ? `<div class="input-group"><label for="kitchen">কিচেন সংখ্যা:</label><input type="number" id="kitchen" required value="${stagedData?.kitchen || ''}"></div>` : ''}
                    </div>
                `;
            }

            if (category === 'ভাড়া') {
                if (type === 'বাড়ি' || type === 'ফ্লাট') {
                    descriptionHTML += `
                        <div class="input-group">
                            <label for="rent-type">ভাড়ার ধরন:</label>
                            <select id="rent-type" required>
                                <option value="">-- নির্বাচন করুন --</option>
                                <option value="ফ্যামিলি" ${stagedData?.rentType === 'ফ্যামিলি' ? 'selected' : ''}>ফ্যামিলি</option>
                                <option value="সকল" ${stagedData?.rentType === 'সকল' ? 'selected' : ''}>সকল</option>
                            </select>
                        </div>
                    `;
                }
                descriptionHTML += `<div class="input-group"><label for="move-in-date">ওঠার তারিখ:</label><input type="date" id="move-in-date" required value="${stagedData?.moveInDate || ''}"></div>`;
            }
        }
        
        descriptionHTML += '</div>';
        fieldsHTML += descriptionHTML;
        
        if (category === 'বিক্রয়') {
            let ownershipHTML = `
                <div class="form-section ownership-section">
                    <h3>মালিকানা বিবরণ</h3>
                    <div class="input-group"><label for="donor-name">দাতার নাম:</label><input type="text" id="donor-name" required value="${stagedData?.owner?.donorName || ''}"></div>
                    <div class="input-inline-group">
                        <div class="input-group" style="flex: 1;">
                            <label for="khotian-no-type-select">খতিয়ান (ধরন):</label>
                            <select id="khotian-no-type-select" required>
                                <option value="">-- নির্বাচন করুন --</option>
                                <option value="RS" ${stagedData?.owner?.khotianNoType === 'RS' ? 'selected' : ''}>RS</option>
                                <option value="BRS" ${stagedData?.owner?.khotianNoType === 'BRS' ? 'selected' : ''}>BRS</option>
                            </select>
                        </div>
                        <div class="input-group" style="flex: 2;">
                            <label for="khotian-no-input">খতিয়ান নং:</label>
                            <input type="text" id="khotian-no-input" required value="${stagedData?.owner?.khotianNo || ''}">
                        </div>
                    </div>
                    
                    <div class="input-group">
                        <label>সর্বশেষ খতিয়ানের ছবি (১টি):</label>
                        <div class="custom-upload-box" onclick="document.getElementById('khotian-image').click()">
                            <i class="material-icons upload-icon-cloud">description</i>
                            <div class="upload-text-main">খতিয়ানের ফাইল সিলেক্ট করুন</div>
                            <div class="upload-btn-fake">Choose File</div>
                        </div>
                        <input type="file" id="khotian-image" accept="image/*" required style="display: none;">
                        <div class="image-preview-area" id="khotian-preview-area"></div>
                    </div>

                    <div class="input-group">
                        <label>প্রপার্টি স্কেস বা হস্ত নকশা ছবি (১টি):</label>
                        <div class="custom-upload-box" onclick="document.getElementById('sketch-image').click()">
                            <i class="material-icons upload-icon-cloud">map</i>
                            <div class="upload-text-main">স্কেস/নকশার ফাইল সিলেক্ট করুন</div>
                            <div class="upload-btn-fake">Choose File</div>
                        </div>
                        <input type="file" id="sketch-image" accept="image/*" required style="display: none;">
                        <div class="image-preview-area" id="sketch-preview-area"></div>
                    </div>
                </div>
            `;
            fieldsHTML += ownershipHTML;
        }

        let priceRentHTML = '<div class="form-section price-rent-section"><h3>পরিমাণ ও দাম </h3>';
        if (type === 'জমি' || type === 'প্লট') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="land-area">পরিমাণ:</label>
                    <input type="number" id="land-area" required value="${stagedData?.landArea || ''}">
                    <select id="land-area-unit" class="unit-select" required>
                        <option value="শতক" ${stagedData?.landAreaUnit === 'শতক' ? 'selected' : ''}>শতক</option>
                    </select>
                </div>
            `;
        }

        if (category === 'বিক্রয়') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="price">দাম:</label>
                    <input type="number" id="price" required value="${stagedData?.price || ''}">
                    <select id="price-unit" class="unit-select" required>
                        <option value="মোট" ${stagedData?.priceUnit === 'মোট' ? 'selected' : ''}>মোট (টাকায়)</option>
                    </select>
                </div>
            `;
        } else if (category === 'ভাড়া') {
            // 🛠️ [ফিক্সড] </select> ট্যাগ সঠিকভাবে ক্লোজ করা হলো
            priceRentHTML += `
                <div class="input-group">
                    <label for="monthly-rent">মাসিক ভাড়া (টাকায়):</label>
                    <input type="number" id="monthly-rent" required value="${stagedData?.monthlyRent || ''}">
                    <select id="price-unit" class="unit-select" required>
                        <option value="মাসিক" ${stagedData?.priceUnit === 'মাসিক' ? 'selected' : ''}>মাসিক (টাকায়)</option>
                    </select>
                </div>
                <div class="input-group advance-group">
                    <label for="advance">এডভান্স / জামানত </label>
                    <input type="number" id="advance" required value="${stagedData?.advance || ''}">
                </div>
            `;
        }
        
        priceRentHTML += '</div>';
        fieldsHTML += priceRentHTML;

        let addressHTML = `
            <div class="form-section address-section">
                <h3>ঠিকানা ও অবস্থান</h3>
                <div class="input-inline-group">
                    <div class="input-group"><label for="division">বিভাগ:</label><input type="text" id="division" required value="${stagedData?.location?.division || ''}"></div>
                    <div class="input-group"><label for="district">জেলা:</label><input type="text" id="district" required value="${stagedData?.location?.district || ''}"></div>
                </div>
                <div class="input-group">
                    <label for="area-type-select">এলাকার ধরন:</label>
                    <select id="area-type-select" required>
                        <option value="">-- নির্বাচন করুন --</option>
                        <option value="উপজেলা" ${stagedData?.location?.areaType === 'উপজেলা' ? 'selected' : ''}>উপজেলা</option>
                        <option value="সিটি কর্পোরেশন" ${stagedData?.location?.areaType === 'সিটি কর্পোরেশন' ? 'selected' : ''}>সিটি কর্পোরেশন</option>
                    </select>
                </div>
                <div id="sub-address-fields"></div>
                <div class="form-group">
                    <label for="googleMap">Google ম্যাপ লোকেশন (পিন করুন):</label>
                    <input type="hidden" id="lat"><input type="hidden" id="lng">
                    <div id="map-container" style="height: 300px; width: 100%; margin-top: 10px; border-radius: 8px; border: 1px solid #ddd; z-index: 1;"></div>
                </div>
            </div>
        `;
        fieldsHTML += addressHTML;
        
        let contactHTML = `
            <div class="form-section contact-section">
                <h3>যোগাযোগের তথ্য</h3>
                <div class="input-group"><label for="primary-phone">ফোন নম্বর:</label><input type="tel" id="primary-phone" value="${stagedData?.primaryPhone || ''}"></div>
                <div class="input-group"><label for="description">বিস্তারিত বর্ণনা:</label><textarea id="description" rows="5">${stagedData?.description || ''}</textarea></div>
            </div>
        `;
        fieldsHTML += contactHTML;
        specificFieldsContainer.innerHTML = fieldsHTML;

        // Leaflet Map Initializer
        setTimeout(() => {
            const mapElement = document.getElementById('map-container');
            if (mapElement) {
                var map = L.map('map-container').setView([23.8103, 90.4125], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(map);

                var marker;
                map.on('click', function(e) {
                    const lat = e.latlng.lat;
                    const lng = e.latlng.lng;
                    if (marker) map.removeLayer(marker);
                    marker = L.marker([lat, lng]).addTo(map);
                    document.getElementById('lat').value = lat;
                    document.getElementById('lng').value = lng;
                });
            }
        }, 100);
        
        if (stagedData?.location?.areaType) {
            generateSubAddressFields(stagedData.location.areaType, stagedData);
        }

        const areaTypeSelect = document.getElementById('area-type-select');
        if (areaTypeSelect) {
            areaTypeSelect.addEventListener('change', (e) => generateSubAddressFields(e.target.value));
        }

        // রি-লোডের পর বা এডিট মোডে সেশনে সেভ থাকা ডাটা স্ক্রিনে রেন্ডার করা
        if (stagedMetadata) {
            const imgArea = document.getElementById('image-preview-area');
            if (imgArea && (stagedMetadata.images || []).length > 0) {
                stagedMetadata.images.forEach(meta => renderExistingPreview(imgArea, meta.id, meta.url, 'main'));
            }
            const khotianArea = document.getElementById('khotian-preview-area');
            if (khotianArea && stagedMetadata.khotian) {
                renderExistingPreview(khotianArea, stagedMetadata.khotian.id, stagedMetadata.khotian.url, 'khotian');
            }
            const sketchArea = document.getElementById('sketch-preview-area');
            if (sketchArea && stagedMetadata.sketch) {
                renderExistingPreview(sketchArea, stagedMetadata.sketch.id, stagedMetadata.sketch.url, 'sketch');
            }
        }

        // ইনপুট লিসেনার বাইন্ডিং
        document.getElementById('images')?.addEventListener('change', (e) => handleImageUploadAndPreview(e, 'image-preview-area', 3, 'main'));
        document.getElementById('khotian-image')?.addEventListener('change', (e) => handleImageUploadAndPreview(e, 'khotian-preview-area', 1, 'khotian'));
        document.getElementById('sketch-image')?.addEventListener('change', (e) => handleImageUploadAndPreview(e, 'sketch-preview-area', 1, 'sketch'));
    } 

    // সেশনে আগে থেকে থাকা ডাটা স্ক্রিনে রেন্ডার করার হেল্পার ফাংশন
    function renderExistingPreview(previewArea, fileId, url, docType) {
        if (previewArea.querySelector('.placeholder-text')) previewArea.innerHTML = '';
        
        const wrapper = document.createElement('div');
        wrapper.className = 'image-preview-wrapper';
        wrapper.id = `box-${fileId}`;
        wrapper.dataset.url = url;

        const img = document.createElement('img');
        img.className = 'preview-image';
        img.src = url;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = (e) => {
            e.preventDefault();
            let currentMeta = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
            if (docType === 'main') {
                currentMeta.images = (currentMeta.images || []).filter(m => m.id !== fileId);
            } else {
                delete currentMeta[docType];
            }
            sessionStorage.setItem('stagedImageMetadata', JSON.stringify(currentMeta));
            wrapper.remove();
        };

        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        previewArea.appendChild(wrapper);
    }

    // 🛠️ ৩. মূল আপলোড প্রসেসিং ফাংশন (কম্প্রেশন এবং লাইভ পার্সেন্টেজ লুপসহ ফিক্সড)
    async function handleImageUploadAndPreview(event, previewAreaId, maxFiles, docType = 'main') {
        const previewArea = document.getElementById(previewAreaId);
        const files = event.target.files;
        
        if (files.length === 0) return;

        let stagedMetadata = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
        let imagesToStore = stagedMetadata.images || [];

        if (docType === 'main' && (imagesToStore.length + files.length) > maxFiles) {
            alert(`আপনি সর্বোচ্চ ${maxFiles}টি ছবি আপলোড করতে পারবেন।`);
            event.target.value = '';
            return;
        }

        if (maxFiles === 1) {
            previewArea.innerHTML = '';
        }

        submitBtn.disabled = true;
        const user = auth.currentUser;
        const userId = user ? user.uid : 'anonymous';

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) {
                alert('শুধুমাত্র ছবি ফাইল আপলোড করা সম্ভব!');
                continue;
            }

            const uniqueFileId = Date.now() + '_' + i;
            
            // ইনস্ট্যান্ট ফেসবুকের মতো ব্লার বক্স এবং স্পিনার দেখানো
            createUploadPreviewBox(previewArea, uniqueFileId, file);

            try {
                // ক্যানভাস কম্প্রেশন এক্সিকিউট করা
                let processedFile = file;
                try {
                    processedFile = await compressImage(file);
                } catch (err) {
                    console.warn("কম্প্রেস করা যায়নি, মূল ফাইলটি আপলোড হচ্ছে।", err);
                }

                const baseDir = docType === 'main' ? 'staging/images' : `staging/documents/${docType}`;
                const filePath = `${baseDir}/${userId}/${uniqueFileId}_${file.name}`;
                const imageRef = storage.ref().child(filePath);

                const uploadTask = imageRef.put(processedFile);

                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', 
                        (snapshot) => {
                            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                            const box = document.getElementById(`box-${uniqueFileId}`);
                            if (box) {
                                const pctText = box.querySelector('.pct-text');
                                if (pctText) pctText.textContent = `${progress}%`;
                            }
                        }, 
                        (error) => reject(error), 
                        async () => {
                            const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                            const box = document.getElementById(`box-${uniqueFileId}`);
                            
                            if (box) {
                                const overlay = box.querySelector('.upload-overlay');
                                if (overlay) overlay.remove();

                                box.dataset.url = downloadURL;

                                const removeBtn = document.createElement('button');
                                removeBtn.className = 'remove-image-btn';
                                removeBtn.innerHTML = '&times;';
                                removeBtn.onclick = (e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    let currentMeta = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
                                    if (docType === 'main') {
                                        currentMeta.images = (currentMeta.images || []).filter(m => m.id !== uniqueFileId);
                                    } else {
                                        delete currentMeta[docType];
                                    }
                                    sessionStorage.setItem('stagedImageMetadata', JSON.stringify(currentMeta));
                                    box.remove();
                                };
                                box.appendChild(removeBtn);
                            }

                            const newMetadata = {
                                id: uniqueFileId,
                                fileName: file.name,
                                storagePath: filePath,
                                url: downloadURL
                            };

                            if (docType === 'main') {
                                imagesToStore.push(newMetadata);
                                stagedMetadata.images = imagesToStore;
                            } else {
                                stagedMetadata[docType] = newMetadata;
                            }
                            sessionStorage.setItem('stagedImageMetadata', JSON.stringify(stagedMetadata));
                            
                            resolve();
                        }
                    );
                });

            } catch (error) {
                console.error("ফাইল আপলোডে সমস্যা:", error);
                alert(`ফাইল আপলোড ব্যর্থ হয়েছে: ${file.name}`);
                const badBox = document.getElementById(`box-${uniqueFileId}`);
                if (badBox) badBox.remove();
            }
        }

        event.target.value = ''; 
        submitBtn.disabled = false;
        submitBtn.textContent = 'প্রিভিউ দেখুন ও পোস্ট করুন';
    }

    function generateSubAddressFields(areaType, stagedData = null) {
        const subAddressFieldsContainer = document.getElementById('sub-address-fields');
        let subFieldsHTML = '';
        if (areaType === 'উপজেলা') {
            subFieldsHTML = `
                <div class="input-inline-group">
                    <div class="input-group"><label for="upazila-name">উপজেলা:</label><input type="text" id="upazila-name" required value="${stagedData?.location?.upazila || ''}"></div>
                    <div class="input-group"><label for="thana-name">থানা:</label><input type="text" id="thana-name" required value="${stagedData?.location?.thana || ''}"></div>
                </div>
            `;
        } else if (areaType === 'সিটি কর্পোরেশন') {
            subFieldsHTML = `
                <div class="input-inline-group">
                    <div class="input-group"><label for="thana-name">থানা:</label><input type="text" id="thana-name" required value="${stagedData?.location?.thana || ''}"></div>
                    <div class="input-group"><label for="ward-no">ওয়ার্ড নং:</label><input type="text" id="ward-no" required value="${stagedData?.location?.wardNo || ''}"></div>
                </div>
            `;
        }
        subAddressFieldsContainer.innerHTML = subFieldsHTML;
    }

    if (postCategorySelect) {
        postCategorySelect.addEventListener('change', (e) => {
            if (e.target.value) generateTypeDropdown(e.target.value);
            else dynamicFieldsContainer.innerHTML = '';
        });
    }

    // Form Submission Logic
    propertyForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'ডেটা প্রক্রিয়াকরণ হচ্ছে...';

        try {
            const user = auth.currentUser;
            if (!user) {
                alert("পোস্ট করার আগে লগইন করুন!");
                submitBtn.disabled = false;
                return;
            }

            const getValue = (id) => document.getElementById(id)?.value || '';
            const category = getValue('post-category');
            const type = getValue('post-type');

            // প্রপার্টির সাধারণ ডেটাবেস ভ্যালু ম্যাপ করা
            const propertyData = {
                category,
                type,
                title: getValue('property-title'),
                description: getValue('description'),
                phoneNumber: getValue('primary-phone'),
                userId: user.uid,
                status: 'pending',
                listerType: getValue('lister-type'),
                roadWidth: getValue('road-width'),
                facing: getValue('facing'),
                location: {
                    division: getValue('division'),
                    district: getValue('district'),
                    areaType: getValue('area-type-select'),
                    thana: getValue('thana-name') || '',
                    upazila: getValue('upazila-name') || '',
                    wardNo: getValue('ward-no') || '',
                    lat: parseFloat(getValue('lat')) || null,
                    lng: parseFloat(getValue('lng')) || null
                }
            };

            // 💡 [ফিক্সড] মালিকানা বিবরণীর ডেটা (owner) সঠিকভাবে অবজেক্টে পুশ করা হলো
            if (category === 'বিক্রয়') {
                propertyData.owner = {
                    donorName: getValue('donor-name'),
                    khotianNoType: getValue('khotian-no-type-select'),
                    khotianNo: getValue('khotian-no-input')
                };
            }

            // টাইপ অনুযায়ী স্পেসিফিক ফিল্ড ম্যাপ করা
            if (type === 'জমি' || type === 'প্লট') {
                propertyData.landArea = getValue('land-area');
                propertyData.landAreaUnit = getValue('land-area-unit');
                propertyData.landType = getValue('land-type');
                if (type === 'প্লট') propertyData.plotNo = getValue('plot-no');
            } else {
                propertyData.propertyAge = getValue('property-age');
                propertyData.dining = getValue('dining');
                propertyData.balcony = getValue('balcony');
                if (type === 'বাড়ি') propertyData.floors = getValue('floors');
                if (type === 'ফ্লাট' || type === 'অফিস') propertyData.floorNo = getValue('floor-no');
                if (type !== 'দোকান') {
                    propertyData.rooms = getValue('rooms');
                    propertyData.bathrooms = getValue('bathrooms');
                    if (type === 'বাড়ি' || type === 'ফ্লাট') propertyData.kitchen = getValue('kitchen');
                }
                if (category === 'ভাড়া') {
                    if (type === 'বাড়ি' || type === 'ফ্লাট') propertyData.rentType = getValue('rent-type');
                    propertyData.moveInDate = getValue('move-in-date');
                }
            }

            // দাম বা মাসিক ভাড়া ম্যাপ করা
            if (category === 'বিক্রয়') {
                propertyData.price = getValue('price');
                propertyData.priceUnit = getValue('price-unit');
            } else if (category === 'ভাড়া') {
                propertyData.monthlyRent = getValue('monthly-rent');
                propertyData.priceUnit = getValue('price-unit');
                propertyData.advance = getValue('advance');
            }

            // অন্যান্য সু্যোগ-সুবিধা (Utilities Array) কালেক্ট করা
            const checkboxes = document.querySelectorAll('input[name="utility"]:checked');
            const utilities = [];
            checkboxes.forEach((checkbox) => {
                utilities.push(checkbox.value);
            });
            propertyData.utilities = utilities;

            sessionStorage.setItem('stagedPropertyData', JSON.stringify(propertyData));
            window.location.href = 'preview.html';
        } catch (error) {
            console.error("ফর্ম সাবমিশনে ট্রাবল:", error);
            submitBtn.disabled = false;
            submitBtn.textContent = 'প্রিভিউ দেখুন ও পোস্ট করুন';
        }
    });

    // Auth State Observer - Centralized Code for Profiles and UI Updates
    if (typeof auth !== 'undefined' && auth.onAuthStateChanged) {
        auth.onAuthStateChanged(user => {
            const authWarningMessage = document.getElementById('auth-warning-message');
            const propertyFormDisplay = document.getElementById('property-form');
            const primaryPhoneInput = document.getElementById('primary-phone');
            const headerProfileImg = document.querySelector('#profileImageWrapper img');

            if (user) {
                if (propertyFormDisplay) propertyFormDisplay.style.display = 'block';
                if (authWarningMessage) authWarningMessage.style.display = 'none';

                db.collection('users').doc(user.uid).get().then(doc => {
                    const userData = doc.data();
                    if (primaryPhoneInput && userData?.phoneNumber) {
                        primaryPhoneInput.value = userData.phoneNumber;
                        primaryPhoneInput.disabled = true;
                    }
                    if (headerProfileImg) {
                        headerProfileImg.src = userData?.profilePic || user.photoURL || 'assets/images/default-avatar.png';
                    }
                    loadStagedData();
                }).catch(() => loadStagedData());
            } else {
                if (propertyFormDisplay) propertyFormDisplay.style.display = 'none';
                if (authWarningMessage) authWarningMessage.style.display = 'block';
                if (headerProfileImg) headerProfileImg.src = 'assets/images/default-avatar.png';
            }
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

// 🆕 লগইন করা ইউজারের প্রোফাইল পিকচার হেডারে দেখানোর গ্লোবাল লজিক
firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    
    if (user && headerProfileImg) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().profilePic) {
                headerProfileImg.src = userDoc.data().profilePic;
            } else if (user.photoURL) {
                headerProfileImg.src = user.photoURL;
            } else {
                headerProfileImg.src = 'assets/images/default-avatar.png';
            }
        } catch (error) {
            console.error("হেডার প্রোফাইল ইমেজ লোড করতে সমস্যা:", error);
        }
    }
});
