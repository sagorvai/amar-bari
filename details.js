document.addEventListener('DOMContentLoaded', function() {
    const propertyData = JSON.parse(sessionStorage.getItem('stagedPropertyData'));
    const imageMetadata = JSON.parse(sessionStorage.getItem('stagedImageMetadata'));

    if (!propertyData) {
        alert("কোনো ডেটা পাওয়া যায়নি!");
        window.location.href = 'post.html';
        return;
    }

    // ১. ইমেজ গ্যালারি রেন্ডার
    const mainImg = document.getElementById('main-display-img');
    const sideContainer = document.getElementById('side-images-container');
    
    if (imageMetadata && imageMetadata.images && imageMetadata.images.length > 0) {
        mainImg.src = imageMetadata.images[0].url;
        
        imageMetadata.images.slice(1, 3).forEach(img => {
            const imgTag = document.createElement('img');
            imgTag.src = img.url;
            sideContainer.appendChild(imgTag);
        });
    }

    // ২. টাইটেল, প্রাইস এবং লোকেশন
    document.getElementById('view-title').textContent = propertyData.title;
    document.getElementById('view-description').textContent = propertyData.description || 'কোনো বর্ণনা দেওয়া হয়নি।';
    
    const location = propertyData.location;
    const locationText = `${location.village || ''}, ${location.upazila || location.thana || ''}, ${location.district}, ${location.division}`;
    document.getElementById('view-location').innerHTML = `<i class="material-icons" style="font-size:16px; vertical-align:middle;">place</i> ${locationText}`;

    const pricePrefix = propertyData.category === 'ভাড়া' ? 'মাসিক ভাড়া: ' : 'দাম: ';
    const priceVal = propertyData.category === 'ভাড়া' ? propertyData.monthlyRent : propertyData.price;
    document.getElementById('view-price').textContent = `৳ ${priceVal} (${propertyData.priceUnit || 'মোট'})`;

    // ৩. ইনফরমেশন গ্রিড (Dynamic Icons)
    const infoGrid = document.getElementById('info-grid');
    const addInfo = (icon, label, value) => {
        if (value) {
            infoGrid.innerHTML += `
                <div class="info-item">
                    <i class="material-icons">${icon}</i>
                    <span><strong>${label}:</strong> ${value}</span>
                </div>`;
        }
    };

    addInfo('category', 'ক্যাটাগরি', propertyData.category);
    addInfo('home', 'টাইপ', propertyData.type);
    addInfo('square_foot', 'আয়তন', propertyData.landArea || propertyData.areaSqft || propertyData.houseArea);
    addInfo('king_bed', 'রুম', propertyData.rooms);
    addInfo('bathtub', 'বাথরুম', propertyData.bathrooms);
    addInfo('layers', 'তলা', propertyData.floorNo || propertyData.floors);
    addInfo('directions', 'দিক', propertyData.facing);
    addInfo('event', 'নির্মাণ কাল', propertyData.propertyAge ? `${propertyData.propertyAge} বছর` : 'নতুন');

    // ৪. ইউটিলিটি/সুবিধাসমূহ
    const utilityContainer = document.getElementById('utility-container');
    if (propertyData.utilities && propertyData.utilities.length > 0) {
        propertyData.utilities.forEach(u => {
            utilityContainer.innerHTML += `<span class="utility-tag">✓ ${u}</span>`;
        });
    } else {
        document.getElementById('utility-section').style.display = 'none';
    }

    // ৫. কন্টাক্ট ইনফো
    document.getElementById('view-phone').textContent = propertyData.phoneNumber;
    document.getElementById('call-link').href = `tel:${propertyData.phoneNumber}`;
    if (propertyData.secondaryPhone) {
        document.getElementById('view-secondary-phone').textContent = `বিকল্প নম্বর: ${propertyData.secondaryPhone}`;
    }
});
