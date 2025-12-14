
// details.js

const db = firebase.firestore();
const auth = firebase.auth();
const detailsContainer = document.getElementById('property-details-container');
const errorMessageDiv = document.getElementById('error-message');

// --- Helper Functions (Reused from index.js) ---

// URL থেকে প্রপার্টি আইডি বের করার ফাংশন
function getPropertyIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// স্লাইড শো/গ্যালারি লজিক সেটআপ
function setupGalleryLogic() {
    document.querySelectorAll('.gallery-nav-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const gallery = e.target.closest('.property-gallery');
            const images = gallery.querySelectorAll('.main-image');
            const totalImages = images.length;
            
            if (totalImages <= 1) return;

            let currentIndex = Array.from(images).findIndex(img => img.classList.contains('active'));
            if (currentIndex === -1) currentIndex = 0; // যদি active না থাকে তবে প্রথমটা শুরু

            let nextIndex = currentIndex;
            
            if (e.target.classList.contains('next-btn')) {
                nextIndex = (currentIndex + 1) % totalImages;
            } else if (e.target.classList.contains('prev-btn')) {
                nextIndex = (currentIndex - 1 + totalImages) % totalImages;
            }
            
            images.forEach(img => img.classList.remove('active'));
            images[nextIndex].classList.add('active');
            
            // থাম্বনেইল আপডেট (যদি থাকে)
            const thumbnails = gallery.querySelectorAll('.thumbnail-item');
            thumbnails.forEach(thumb => thumb.classList.remove('active'));
            if (thumbnails.length > nextIndex) {
                 thumbnails[nextIndex].classList.add('active');
            }
        });
    });
    
    // থাম্বনেইল ক্লিক লজিক
    document.querySelectorAll('.thumbnail-item').forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            const gallery = thumb.closest('.property-gallery');
            const images = gallery.querySelectorAll('.main-image');
            images.forEach(img => img.classList.remove('active'));
            images[index].classList.add('active');
            
            document.querySelectorAll('.thumbnail-item').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
        });
    });
}


// --- ✅ মূল ডেটা রেন্ডারিং ফাংশন ---
function renderPropertyDetails(property, owner) {
    
    const category = property.category || 'বিক্রয়';
    const propertyType = property.propertyType || 'প্রপার্টি'; 
    const isLandOrPlot = propertyType === 'জমি' || propertyType === 'প্লট'; 
    
    // মূল্য নির্ধারণ
    const priceValue = property.price ? new Intl.NumberFormat('bn-BD', { minimumFractionDigits: 0 }).format(property.price) : 'আলোচনা সাপেক্ষে';
    const priceCurrency = property.price ? `৳ ${priceValue}` : 'আলোচনা সাপেক্ষে';
    const priceDisplay = category === 'ভাড়া' ? `${priceCurrency} <span class="unit">/মাস</span>` : priceCurrency;
    
    // লোকেশন
    const district = property.location?.district || property.location?.city || '';
    const thana = property.location?.thana || '';
    const village = property.location?.village || property.location?.area || ''; 
    const fullAddress = [village, thana, district].filter(Boolean).join(', ');
    
    // --- ১. ইমেজ গ্যালারি তৈরি ---
    const images = property.images || [];
    let mainImagesHTML = '';
    let thumbnailsHTML = '';
    
    if (images.length === 0) {
        images.push({ url: 'https://via.placeholder.com/900x600?text=No+Image' });
    }

    images.forEach((image, index) => {
        mainImagesHTML += `
            <div class="main-image ${index === 0 ? 'active' : ''}" style="background-image: url('${image.url}')"></div>
        `;
        thumbnailsHTML += `
            <div class="thumbnail-item ${index === 0 ? 'active' : ''}">
                <img src="${image.url}" alt="Thumbnail ${index + 1}">
            </div>
        `;
    });
    
    const galleryHTML = `
        <div class="property-gallery">
            <div class="gallery-main-view">
                ${mainImagesHTML}
                ${images.length > 1 ? `
                    <button class="gallery-nav-btn prev-btn">&#10094;</button>
                    <button class="gallery-nav-btn next-btn">&#10095;</button>
                ` : ''}
                <span class="category-tag">${propertyType} ${category}</span>
            </div>
            ${images.length > 1 ? `<div class="gallery-thumbnails">${thumbnailsHTML}</div>` : ''}
        </div>
    `;

    // --- ২. স্পেকস ও ডেটা গ্রিড তৈরি ---
    let specsGridHTML = '';
    
    if (category === 'বিক্রয়') {
        if (isLandOrPlot) {
             // জমি বিক্রয়ের ডেটা
            specsGridHTML += `
                <div class="info-item"><i class="material-icons">square_foot</i> <strong>জমির পরিমাপ:</strong> <span class="info-value">${property.landArea || '-'} ${property.sizeUnit || 'শতক'}</span></div>
                <div class="info-item"><i class="material-icons">landscape</i> <strong>জমির প্রকৃতি:</strong> <span class="info-value">${property.landType || 'অজানা'}</span></div>
            `;
        } else {
            // ফ্ল্যাট/বাড়ি বিক্রয়ের ডেটা
            specsGridHTML += `
                <div class="info-item"><i class="material-icons">king_bed</i> <strong>বেডরুম:</strong> <span class="info-value">${property.bedrooms || '-'}</span></div>
                <div class="info-item"><i class="material-icons">bathtub</i> <strong>বাথরুম:</strong> <span class="info-value">${property.bathrooms || '-'}</span></div>
                <div class="info-item"><i class="material-icons">square_foot</i> <strong>ফ্লোর এরিয়া:</strong> <span class="info-value">${property.sizeSqft || '-'} স্কয়ারফিট</span></div>
                <div class="info-item"><i class="material-icons">home_work</i> <strong>ইউনিট সংখ্যা:</strong> <span class="info-value">${property.units || '-'}</span></div>
            `;
        }
    } else if (category === 'ভাড়া') {
        // ভাড়ার ডেটা
         specsGridHTML += `
            <div class="info-item"><i class="material-icons">king_bed</i> <strong>বেডরুম:</strong> <span class="info-value">${property.bedrooms || '-'}</span></div>
            <div class="info-item"><i class="material-icons">bathtub</i> <strong>বাথরুম:</strong> <span class="info-value">${property.bathrooms || '-'}</span></div>
            <div class="info-item"><i class="material-icons">square_foot</i> <strong>ফ্লোর এরিয়া:</strong> <span class="info-value">${property.sizeSqft || '-'} স্কয়ারফিট</span></div>
            <div class="info-item"><i class="material-icons">event</i> <strong>কখন খালি হবে:</strong> <span class="info-value">${property.availableFrom || 'এখনই'}</span></div>
        `;
    }

    // --- ৩. ইউটিলিটি তালিকা ---
    const utilities = property.utilities || [];
    const utilitiesHTML = utilities.length > 0 ? utilities.map(util => `<li><i class="material-icons utility-icon">check_circle</i> ${util}</li>`).join('') : '<li class="no-utility">কোনো ইউটিলিটি তথ্য পাওয়া যায়নি।</li>';
    
    // --- ৪. মালিকের তথ্য ---
    const ownerProfileUrl = owner.profilePictureUrl || 'https://via.placeholder.com/100x100?text=Owner';
    const ownerHTML = `
        <div class="owner-details-card stylish-card">
            <h3 class="section-title"><i class="material-icons icon-styling">person</i> যোগাযোগ</h3>
            <div class="owner-info">
                <img src="${ownerProfileUrl}" alt="${owner.name}" class="owner-image">
                <div class="owner-text">
                    <h4>${owner.name || 'বিক্রেতা/এজেন্ট'}</h4>
                    <p>${owner.userType || 'ব্যক্তিগত বিক্রেতা'}</p>
                    <p class="location-meta"><i class="material-icons">location_on</i> ${district}</p>
                </div>
            </div>
            <div class="contact-actions">
                <button class="action-btn call-btn" onclick="window.location.href='tel:${owner.phone || ''}'" ${!owner.phone ? 'disabled' : ''}>
                    <i class="material-icons">call</i> ${owner.phone ? 'কল করুন' : 'যোগাযোগ নেই'}
                </button>
                <button class="action-btn message-btn" onclick="window.location.href='messages.html?uid=${property.postedBy}'">
                    <i class="material-icons">message</i> মেসেজ
                </button>
            </div>
        </div>
    `;

    // --- ৫. ডকুমেন্ট সেকশন (যদি থাকে) ---
    const documents = property.documents || [];
    let documentsHTML = '';
    if (documents.length > 0) {
        const docItems = documents.map(doc => `
            <div class="doc-item">
                <p>${doc.fileName || 'ডকুমেন্ট'}</p>
                <a href="${doc.url}" target="_blank" class="doc-image-wrapper">
                    <img src="${doc.url}" alt="${doc.fileName}" class="ownership-doc-image">
                </a>
            </div>
        `).join('');
        
        documentsHTML = `
            <div class="section-card stylish-card">
                <h3 class="section-title"><i class="material-icons icon-styling">description</i> মালিকানার ডকুমেন্ট</h3>
                <div class="doc-preview-area">${docItems}</div>
            </div>
        `;
    }

    // --- ৬. চূড়ান্ত কাঠামো একত্রিত করা ---
    detailsContainer.innerHTML = `
        <div class="detail-header">
            <h1 class="preview-title">${property.title || 'শিরোনামবিহীন'}</h1>
            <div class="header-meta">
                <span class="price-highlight">${priceDisplay}</span>
                <span class="location-meta"><i class="material-icons">location_on</i> ${fullAddress}</span>
                <span class="post-date"><i class="material-icons">access_time</i> ${property.createdAt?.toDate().toLocaleDateString('bn-BD') || 'অজানা তারিখ'}</span>
            </div>
        </div>

        <div class="detail-content-grid">
            <div class="primary-content">
                <div class="gallery-area stylish-card">
                    ${galleryHTML}
                </div>

                <div class="section-card stylish-card">
                    <h3 class="section-title"><i class="material-icons icon-styling">info</i> মূল তথ্য</h3>
                    <div class="info-grid">${specsGridHTML}</div>
                </div>

                <div class="section-card stylish-card">
                    <h3 class="section-title"><i class="material-icons icon-styling">list_alt</i> বিস্তারিত বিবরণ</h3>
                    <p class="description-text">${property.description || 'কোনো বিস্তারিত বিবরণ নেই।'}</p>
                </div>

                <div class="section-card stylish-card">
                    <h3 class="section-title"><i class="material-icons icon-styling">build</i> ইউটিলিটি ও সুযোগ-সুবিধা</h3>
                    <ul class="utility-list-detail">${utilitiesHTML}</ul>
                </div>
                
                ${documentsHTML} 
            </div>
            
            <div class="sidebar-content">
                ${ownerHTML}
                
                <div class="section-card stylish-card map-placeholder">
                    <h3 class="section-title"><i class="material-icons icon-styling">map</i> লোকেশন</h3>
                    <div id="map-container" style="height: 250px; background-color: #f0f0f0; border-radius: 8px;">
                        <p style="text-align: center; padding-top: 100px; color: #555;">ম্যাপ লোড এর ব্যবস্থা করা দরকার</p>
                    </div>
                    <p class="location-footer-text">${fullAddress}</p>
                </div>
            </div>
        </div>
    `;
    
    setupGalleryLogic(); // গ্যালারি লজিক শুরু করা
}


// --- ✅ প্রধান ফাংশন: ডেটা লোড ও ডিসপ্লে করা ---
async function loadPropertyData() {
    const propertyId = getPropertyIdFromUrl();
    
    if (!propertyId) {
        detailsContainer.style.display = 'none';
        errorMessageDiv.style.display = 'block';
        errorMessageDiv.innerHTML = '<h2 class="error-box">URL-এ কোনো প্রপার্টি ID পাওয়া যায়নি।</h2>';
        return;
    }

    try {
        // ১. প্রপার্টির ডেটা Fetch
        const propertySnapshot = await db.collection('properties').doc(propertyId).get();
        if (!propertySnapshot.exists) {
            detailsContainer.style.display = 'none';
            errorMessageDiv.style.display = 'block';
            errorMessageDiv.innerHTML = '<h2 class="error-box">দুঃখিত, এই প্রপার্টিটি খুঁজে পাওয়া যায়নি!</h2>';
            return;
        }
        const property = propertySnapshot.data();

        // ২. মালিক/এজেন্টের ডেটা Fetch
        const ownerId = property.postedBy;
        let owner = {};
        if (ownerId) {
            const ownerSnapshot = await db.collection('users').doc(ownerId).get();
            owner = ownerSnapshot.exists ? ownerSnapshot.data() : { name: 'অজানা ব্যবহারকারী', userType: 'ব্যবহারকারী', phone: null };
        } else {
            owner = { name: 'অজানা ব্যবহারকারী', userType: 'ব্যবহারকারী', phone: null };
        }
        
        // ৩. রেন্ডারিং
        renderPropertyDetails(property, owner);

    } catch (error) {
        console.error("প্রপার্টি লোড করতে ব্যর্থ:", error);
        detailsContainer.style.display = 'none';
        errorMessageDiv.style.display = 'block';
        errorMessageDiv.innerHTML = '<h2 class="error-box">দুঃখিত! ডেটা লোড করার সময় একটি সমস্যা হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।</h2>';
    }
}


// --- UI ইভেন্ট লিসেনার সেটআপ (header and sidebar) ---
document.addEventListener('DOMContentLoaded', () => {
    // হেডার এবং সাইডবার লজিক (index.js থেকে কপি)
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
    
    // মূল ডেটা লোড শুরু করা
    loadPropertyData();
});
