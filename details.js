// ধরে নেওয়া হচ্ছে db, auth, storage ভ্যারিয়েবলগুলো details.html এ গ্লোবালি সংজ্ঞায়িত আছে।

document.addEventListener('DOMContentLoaded', function() {
    const propertyContent = document.getElementById('propertyContent');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorMessageElement = document.getElementById('errorMessage');
    const pageTitle = document.getElementById('pageTitle');
    
    // URL থেকে প্রপার্টির ID বের করা
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (!propertyId) {
        showError('প্রপার্টির আইডি পাওয়া যায়নি।');
        return;
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
            showError(`ডেটা লোড করতে সমস্যা হয়েছে: ${error.message}`);
        } finally {
            loadingState.style.display = 'none';
        }
    }
    
    // --- ত্রুটি দেখানোর ফাংশন ---
    function showError(message) {
        loadingState.style.display = 'none';
        propertyContent.style.display = 'none';
        errorMessageElement.textContent = message;
        errorState.style.display = 'block';
        pageTitle.textContent = 'ত্রুটি - আমার বাড়ি.কম';
    }

    // --- ডেটা রেন্ডার করার ফাংশন ---
    function renderPropertyDetails(data) {
        // পেজের শিরোনাম সেট করা
        pageTitle.textContent = `${data.title} - আমার বাড়ি.কম`;

        // অবস্থান স্ট্রিং তৈরি করা
        const locationString = `${data.location.thana}, ${data.location.district}, ${data.location.division}`;

        // দাম/ভাড়ার ডিসপ্লে তৈরি করা
        let priceDisplay = '';
        if (data.category === 'বিক্রয়') {
            priceDisplay = `৳ ${data.price.toLocaleString('bn-BD')} ${data.priceUnit === 'মোট' ? 'মোট দাম' : data.priceUnit === 'শতক' ? '/ শতক' : '/ স্কয়ার ফিট'}`;
        } else if (data.category === 'ভাড়া') {
            priceDisplay = `৳ ${data.monthlyRent.toLocaleString('bn-BD')} / মাস`;
        }

        // ছবি গ্যালারি তৈরি করা (যদি 'imageUrls' নামে একটি অ্যারে ডেটাতে থাকে)
        const imageGalleryHTML = data.imageUrls && data.imageUrls.length > 0
            ? data.imageUrls.map(url => `<img src="${url}" alt="${data.title} ছবি">`).join('')
            : '<p>কোনো ছবি পাওয়া যায়নি।</p>';
            
        
        // --- বিবরণ এবং সুবিধা গ্রিড তৈরি ---
        let infoGridHTML = '';
        
        // ১. প্রপার্টির আকার ও প্রকার
        if (data.areaSqft) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">square_foot</i> ক্ষেত্রফল: <b>${data.areaSqft} স্কয়ার ফিট</b></div>`;
        } else if (data.landArea) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">crop_landscape</i> ক্ষেত্রফল: <b>${data.landArea} ${data.landAreaUnit}</b></div>`;
        }
        
        if (data.rooms) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">bed</i> রুম সংখ্যা: <b>${data.rooms}</b></div>`;
        }
        if (data.bathrooms) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">bathtub</i> বাথরুম: <b>${data.bathrooms}</b></div>`;
        }
        if (data.kitchen) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">kitchen</i> কিচেন: <b>${data.kitchen}</b></div>`;
        }
        if (data.floorNo) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">layers</i> ফ্লোর নং: <b>${data.floorNo}</b></div>`;
        }
        
        // ২. অতিরিক্ত তথ্য
        if (data.listerType) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">person</i> পোস্টকারী: <b>${data.listerType}</b></div>`;
        }
        if (data.propertyAge) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">date_range</i> প্রপার্টির বয়স: <b>${data.propertyAge === '0' ? 'নতুন' : data.propertyAge + ' বছর'}</b></div>`;
        }
        if (data.facing) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">explore</i> দিক: <b>${data.facing}</b></div>`;
        }
        if (data.roadWidth) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">straighten</i> রাস্তার প্রস্থ: <b>${data.roadWidth} ফিট</b></div>`;
        }
        if (data.rentType) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">group</i> ভাড়ার ধরন: <b>${data.rentType}</b></div>`;
        }
        if (data.moveInDate) {
            infoGridHTML += `<div class="info-item"><i class="material-icons">event</i> ওঠার তারিখ: <b>${data.moveInDate}</b></div>`;
        }
        
        // ৩. অন্যান্য সুবিধা (Utilities)
        let utilitiesHTML = '';
        if (data.utilities && data.utilities.length > 0) {
            utilitiesHTML = `
                <div class="details-section">
                    <h3><i class="material-icons">stars</i> অন্যান্য সুবিধা</h3>
                    <div class="info-grid">
                        ${data.utilities.map(u => `<div class="info-item"><i class="material-icons">check_circle</i> <b>${u}</b></div>`).join('')}
                    </div>
                </div>
            `;
        }


        // সম্পূর্ণ HTML তৈরি করা
        const fullHTML = `
            <div class="details-header">
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
                    ${infoGridHTML}
                </div>
            </div>
            
            ${utilitiesHTML}

            <div class="details-section description-section">
                <h3><i class="material-icons">description</i> বিস্তারিত বিবরণ</h3>
                <p class="description-text">${data.description}</p>
            </div>
            
            ${data.category === 'বিক্রয়' && data.owner ? `
                <div class="details-section ownership-section">
                    <h3><i class="material-icons">gavel</i> মালিকানা তথ্য (সারসংক্ষেপ)</h3>
                    <div class="info-grid">
                         <div class="info-item"><i class="material-icons">bookmark</i> মৌজা: <b>${data.owner.mouja}</b></div>
                         <div class="info-item"><i class="material-icons">grading</i> দাগ নং (ধরন): <b>${data.owner.dagNoType || 'N/A'}</b></div>
                         </div>
                </div>
            ` : ''}

            <div class="lister-contact-box">
                <h4>যোগাযোগ করুন</h4>
                <p>পোস্টকারী ধরন: <b>${data.listerType}</b></p>
                <a href="tel:${data.phoneNumber}" class="contact-button">
                    <i class="material-icons" style="font-size: 1.1em; vertical-align: middle; margin-right: 5px;">call</i>
                    ফোন করুন: ${data.phoneNumber}
                </a>
                ${data.secondaryPhone ? `<p style="margin-top: 5px;">(অতিরিক্ত: ${data.secondaryPhone})</p>` : ''}
            </div>
            
            <div class="details-section google-map-section" style="text-align: center;">
                 <h3><i class="material-icons">map</i> অবস্থান</h3>
                 <p>Google Map লোকেশন: <a href="${data.googleMap}" target="_blank">${data.googleMap}</a></p>
                 <p class="small-text">(এইখানে Google Maps Embed কোড ব্যবহার করে ম্যাপ দেখানো যেতে পারে)</p>
            </div>
        `;
        
        propertyContent.innerHTML = fullHTML;
        propertyContent.style.display = 'block';
    }
    
    // পেজ লোড হওয়ার পরে ডেটা ফেচ শুরু করা
    fetchPropertyData(propertyId);
});
