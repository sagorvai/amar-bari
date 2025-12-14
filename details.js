// ধরে নেওয়া হচ্ছে db, auth, storage ভ্যারিয়েবলগুলো details.html এ গ্লোবালি সংজ্ঞায়িত আছে।

document.addEventListener('DOMContentLoaded', function() {
    const propertyContent = document.getElementById('propertyContent');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorMessageElement = document.getElementById('errorMessage');
    const pageTitle = document.getElementById('pageTitle');
    const backButton = document.getElementById('backButton');
    const shareButton = document.getElementById('shareButton');
    
    // URL থেকে প্রপার্টির ID বের করা
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (!propertyId) {
        showError('প্রপার্টির আইডি পাওয়া যায়নি।');
        return;
    }
    
    // --- ব্যাক বাটন লজিক ---
    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }

    // --- শেয়ার বাটন লজিক ---
    if (shareButton) {
        shareButton.addEventListener('click', async () => {
            const shareData = {
                title: pageTitle.textContent,
                text: 'আমার বাড়ি.কম-এ এই প্রপার্টিটি দেখুন!',
                url: window.location.href,
            };

            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                    console.log('Post shared successfully');
                } else {
                    // Fallback for browsers that don't support navigator.share
                    navigator.clipboard.writeText(shareData.url);
                    alert('লিঙ্ক কপি করা হয়েছে! আপনি এখন ম্যানুয়ালি শেয়ার করতে পারবেন।');
                }
            } catch (err) {
                console.error('Share failed:', err);
                alert('শেয়ার করা সম্ভব হয়নি।');
            }
        });
    }


    // --- ত্রুটি দেখানোর ফাংশন ---
    function showError(message) {
        loadingState.style.display = 'none';
        propertyContent.style.display = 'none';
        errorMessageElement.textContent = message;
        errorState.style.display = 'block';
        pageTitle.textContent = 'ত্রুটি - আমার বাড়ি.কম';
    }

    // --- Utility: মানকে বাংলা সংখ্যায় রূপান্তর করা ---
    function toBengaliNumber(number) {
        if (number === null || number === undefined || number === '') return 'N/A';
        return number.toLocaleString('bn-BD');
    }

    // --- Utility: কাস্টম আইটেম ডিসপ্লে রেন্ডারার ---
    function renderInfoItem(icon, label, value) {
        if (value === undefined || value === null || value === '' || value === 'N/A') return '';
        
        let displayValue = value;
        if (typeof value === 'number' && !isNaN(value)) {
             displayValue = toBengaliNumber(value);
        } else if (typeof value === 'string' && /^\d+$/.test(value)) {
             // যদি string হিসেবে সংখ্যা থাকে
             displayValue = toBengaliNumber(parseInt(value));
        }

        return `
            <div class="info-item">
                <i class="material-icons">${icon}</i>
                <span class="label">${label}:</span> <b>${displayValue}</b>
            </div>
        `;
    }

    // --- ডেটা রেন্ডার করার ফাংশন ---
    function renderPropertyDetails(data) {
        // পেজের শিরোনাম সেট করা
        pageTitle.textContent = `${data.title} - আমার বাড়ি.কম`;

        // অবস্থান স্ট্রিং তৈরি করা (যেসব ফিল্ড পাওয়া যায়)
        const locationParts = [];
        if (data.location?.village) locationParts.push(data.location.village);
        if (data.location?.thana) locationParts.push(data.location.thana);
        if (data.location?.district) locationParts.push(data.location.district);

        const locationString = locationParts.length > 0 ? locationParts.join(', ') : 'ঠিকানা পাওয়া যায়নি';
        
        const propertyTypeDisplay = data.type || 'প্রপার্টি';
        const isSell = data.category === 'বিক্রয়';
        const isLandPlot = data.type === 'জমি' || data.type === 'প্লট';


        // --- দাম/ভাড়ার ডিসপ্লে তৈরি করা ---
        let priceDisplay = '৳ N/A';
        let priceUnitDisplay = '';
        let priceValue = 0;
        
        if (isSell) {
            priceValue = data.price;
            if (data.priceUnit === 'মোট') {
                 priceUnitDisplay = 'মোট দাম';
            } else if (data.priceUnit === 'শতক') {
                 priceUnitDisplay = '/ শতক';
            } else if (data.priceUnit === 'স্কয়ার ফিট') {
                 priceUnitDisplay = '/ স্কয়ার ফিট';
            }
            
            if (priceValue) {
                priceDisplay = `৳ ${toBengaliNumber(priceValue)} ${priceUnitDisplay}`;
            }
            
        } else { // ভাড়া
            priceValue = data.monthlyRent;
            priceUnitDisplay = '/ মাস';
            if (priceValue) {
                priceDisplay = `৳ ${toBengaliNumber(priceValue)} / মাস`;
            }
        }


        // --- ছবি গ্যালারি তৈরি করা ---
        const imageUrls = data.imageUrls || [];
        const imageGalleryHTML = imageUrls.length > 0
            ? imageUrls.map(url => `<img src="${url}" alt="${data.title} ছবি">`).join('')
            : `<p class="no-image-found">কোনো ছবি পাওয়া যায়নি।</p>`;


        // --- মূল তথ্য গ্রিড তৈরি ---
        let infoGridHTML = '';
        
        // 1. ক্ষেত্রফল (ডাইনামিক)
        if (data.areaSqft) {
            infoGridHTML += renderInfoItem('square_foot', 'ক্ষেত্রফল', `${data.areaSqft} স্কয়ার ফিট`);
        } else if (data.landArea && data.landAreaUnit) {
            infoGridHTML += renderInfoItem('crop_landscape', 'জমির পরিমাণ', `${data.landArea} ${data.landAreaUnit}`);
        } else if (data.commercialArea && data.commercialAreaUnit) {
            infoGridHTML += renderInfoItem('store', 'ক্ষেত্রফল', `${data.commercialArea} ${data.commercialAreaUnit}`);
        } else if (data.houseArea && data.houseAreaUnit) {
            infoGridHTML += renderInfoItem('crop_landscape', 'জমির পরিমাণ', `${data.houseArea} ${data.houseAreaUnit}`);
        }

        // 2. পোস্টকারী
        infoGridHTML += renderInfoItem('person', 'পোস্টকারী', data.listerType);

        // 3. রুম/বাথরুম/কিচেন (যদি থাকে)
        infoGridHTML += renderInfoItem('bed', 'রুম সংখ্যা', data.rooms);
        infoGridHTML += renderInfoItem('bathtub', 'বাথরুম', data.bathrooms);
        infoGridHTML += renderInfoItem('kitchen', 'কিচেন', data.kitchen);
        infoGridHTML += renderInfoItem('store', 'দোকান সংখ্যা', data.shopCount);
        
        // 4. রাস্তার প্রস্থ
        infoGridHTML += renderInfoItem('straighten', 'রাস্তার প্রস্থ', data.roadWidth ? `${data.roadWidth} ফিট` : undefined);
        
        // 5. অন্যান্য তথ্য
        infoGridHTML += renderInfoItem('layers', 'ফ্লোর নং', data.floorNo);
        infoGridHTML += renderInfoItem('date_range', 'প্রপার্টির বয়স', data.propertyAge === '0' ? 'নতুন' : data.propertyAge ? `${data.propertyAge} বছর` : undefined);
        infoGridHTML += renderInfoItem('explore', 'দিক', data.facing);
        infoGridHTML += renderInfoItem('group', 'ভাড়ার ধরন', data.rentType);
        infoGridHTML += renderInfoItem('event', 'ওঠার তারিখ', data.moveInDate);
        infoGridHTML += renderInfoItem('business', 'জমির ধরন', data.landType);
        
        
        // --- অন্যান্য সুবিধা (Utilities) ---
        let utilitiesHTML = '';
        if (data.utilities && data.utilities.length > 0) {
            utilitiesHTML = `
                <div class="details-section">
                    <h3><i class="material-icons">stars</i> অন্যান্য সুবিধা</h3>
                    <div class="info-grid">
                        ${data.utilities.map(u => renderInfoItem('check_circle', u, 'আছে')).join('')}
                    </div>
                </div>
            `;
        }

        // --- সম্পূর্ণ HTML তৈরি করা ---
        const fullHTML = `
            <div class="details-header">
                <p class="location">${data.type} (${data.category})</p>
                <h1>${data.title}</h1>
                <p class="location"><i class="material-icons" style="font-size: 1em; margin-right: 3px;">location_on</i> ${locationString}</p>
                <div class="price-tag">${priceDisplay}</div>
            </div>

            <div class="details-section image-gallery-section">
                <h3><i class="material-icons">photo_library</i> ছবি গ্যালারি</h3>
                <div class="image-gallery">
                    ${imageGalleryHTML}
                </div>
            </div>

            <div class="details-section main-info-section">
                <h3><i class="material-icons">info</i> মূল তথ্য</h3>
                <div class="info-grid">
                    ${infoGridHTML || '<p style="padding-left: 5px;">কোনো অতিরিক্ত তথ্য পাওয়া যায়নি।</p>'}
                </div>
            </div>
            
            ${utilitiesHTML}

            <div class="details-section description-section">
                <h3><i class="material-icons">description</i> বিস্তারিত বিবরণ</h3>
                <p class="description-text">${data.description || 'বিস্তারিত বিবরণ যোগ করা হয়নি।'}</p>
            </div>
            
            ${isSell && data.owner ? `
                <div class="details-section ownership-section">
                    <h3><i class="material-icons">gavel</i> মালিকানা তথ্য (সারসংক্ষেপ)</h3>
                    <div class="info-grid">
                         ${renderInfoItem('bookmark', 'মৌজা', data.owner.mouja)}
                         ${renderInfoItem('grading', 'দাগ নং (ধরন)', data.owner.dagNoType)}
                         ${renderInfoItem('border_color', 'দাগ নং', data.owner.dagNo)}
                         ${renderInfoItem('person_outline', 'দাতার নাম', data.owner.donorName)}
                    </div>
                    <p style="font-size: 0.8em; color: #999; margin-top: 15px; padding-left: 5px;">*নিরাপত্তা জনিত কারণে শুধুমাত্র মৌলিক মালিকানা তথ্য দেখানো হলো।</p>
                </div>
            ` : ''}

            <div class="lister-contact-box">
                <h4>যোগাযোগ করুন</h4>
                <p>পোস্টকারী ধরন: <b>${data.listerType || 'N/A'}</b></p>
                ${data.phoneNumber ? `
                    <a href="tel:${data.phoneNumber}" class="contact-button">
                        <i class="material-icons" style="font-size: 1.1em; vertical-align: middle; margin-right: 5px;">call</i>
                        ফোন করুন
                    </a>
                    <p style="font-size: 0.9em; margin-top: 5px;">${data.secondaryPhone ? `(অতিরিক্ত: ${data.secondaryPhone})` : ''}</p>
                ` : '<p style="color: red;">যোগাযোগের নম্বর দেওয়া হয়নি।</p>'}
            </div>
            
            <div class="details-section google-map-section">
                 <h3><i class="material-icons">map</i> অবস্থান</h3>
                 ${data.googleMap ? `
                    <p>Google Map লোকেশন: <a href="${data.googleMap}" target="_blank">${data.googleMap}</a></p>
                    <p class="small-text">(এইখানে Google Maps Embed কোড ব্যবহার করে ম্যাপ দেখানো যেতে পারে)</p>
                 ` : '<p style="color: #999;">Google ম্যাপ লোকেশন পিন করা হয়নি।</p>'}
            </div>
        `;
        
        propertyContent.innerHTML = fullHTML;
        propertyContent.style.display = 'block';
    }
    
    // --- প্রপার্টি ডেটা ফেচ করার ফাংশন ---
    async function fetchPropertyData(id) {
        try {
            loadingState.style.display = 'block';
            propertyContent.style.display = 'none';
            errorState.style.display = 'none';
            
            // Firestore থেকে ডেটা ফেচ করা
            const doc = await db.collection('properties').doc(id).get();

            if (!doc.exists) {
                showError('দুঃখিত, এই প্রপার্টির কোনো তথ্য পাওয়া যায়নি।');
                return;
            }

            const data = doc.data();
            renderPropertyDetails(data);
            
        } catch (error) {
            console.error("Error fetching property data: ", error);
            showError(`ডেটা লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আইডি সঠিক কিনা যাচাই করুন।`);
        } finally {
            loadingState.style.display = 'none';
        }
    }
    
    // পেজ লোড হওয়ার পরে ডেটা ফেচ শুরু করা
    fetchPropertyData(propertyId);
});
