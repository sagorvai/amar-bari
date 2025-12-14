// details.js

const db = firebase.firestore();
const auth = firebase.auth();
const container = document.getElementById('property-details-container');
const backButton = document.getElementById('backButton');
const pageTitle = document.getElementById('page-title');

// ইউটিলিটি ফাংশন: বাংলা সংখ্যা ফরম্যাটিং
function formatNumberBn(number) {
    if (number === null || number === undefined || isNaN(number)) return 'N/A';
    return new Intl.NumberFormat('bn-BD', { minimumFractionDigits: 0 }).format(number);
}

// ইউটিলিটি ফাংশন: বর্তমান URL থেকে প্রপার্টি ID নেওয়া
function getPropertyIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// --- ১. ডেটা লোড এবং রেন্ডারিং ---
async function loadPropertyDetails() {
    const propertyId = getPropertyIdFromUrl();

    if (!propertyId) {
        container.innerHTML = '<p class="error-message">❌ কোনো প্রপার্টি আইডি পাওয়া যায়নি।</p>';
        return;
    }

    try {
        const docRef = db.collection('properties').doc(propertyId);
        const doc = await docRef.get();

        if (doc.exists) {
            const property = doc.data();
            property.id = doc.id; // ID যোগ করা
            renderPropertyDetails(property);
        } else {
            container.innerHTML = '<p class="error-message">😢 এই আইডি সহ কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।</p>';
        }

    } catch (error) {
        console.error("Error loading property:", error);
        container.innerHTML = '<p class="error-message">⚠️ ডেটা লোড করতে সমস্যা হয়েছে।</p>';
    }
}


// --- ২. ডাইনামিক HTML তৈরি করা ---
function renderPropertyDetails(property) {
    pageTitle.textContent = property.title || 'প্রপার্টির বিবরণ';
    
    // মূল্য/ভাড়ার জন্য ডাইনামিক লজিক
    let priceHTML = '';
    let advanceInfo = '';

    if (property.category === 'বিক্রয়' && property.price) {
        const formattedPrice = formatNumberBn(property.price);
        priceHTML = `<h2 class="price-tag">৳ ${formattedPrice}</h2>`;
    } else if (property.category === 'ভাড়া' && property.monthlyRent) {
        const formattedRent = formatNumberBn(property.monthlyRent);
        priceHTML = `<h2 class="price-tag">৳ ${formattedRent} / মাস</h2>`;
        if (property.advance) {
             advanceInfo = `<p style="font-size: 1.1em; color: #555;">জামানত: ৳ ${formatNumberBn(property.advance)}</p>`;
        }
    } else {
        priceHTML = `<h2 class="price-tag">আলোচনা সাপেক্ষে</h2>`;
    }
    
    // লোকেশন তথ্য
    const fullLocation = `${property.location?.area || ''}, ${property.location?.district || ''}`;

    // ইমেজ গ্যালারি তৈরি
    const imageUrls = property.imageUrls || [];
    const sliderItemsHTML = imageUrls.map((url, index) => `
        <img class="gallery-image ${index === 0 ? 'active' : ''}" 
             src="${url}" 
             alt="${property.title || 'Property Image'}" 
             data-index="${index}">
    `).join('');
    
    const sliderNavigationHTML = imageUrls.length > 1 ? `
        <div class="slider-nav">
            <button class="slider-btn prev-btn">&#10094;</button>
            <button class="slider-btn next-btn">&#10095;</button>
        </div>
    ` : '';
    
    // স্পেসিফিকেশনস (ডাইনামিক ফিল্ড) তৈরি
    let specsHTML = '';
    const specs = [];
    
    const isLandOrPlot = property.type === 'জমি' || property.type === 'প্লট';
    const isBuiltProperty = property.type !== 'জমি' && property.type !== 'প্লট';
    
    // --- ক্ষেত্রফল/পরিমাণ ---
    if (isLandOrPlot) {
        const area = property.landArea ? `${formatNumberBn(property.landArea)} ${property.landAreaUnit || 'শতক'}` : 'N/A';
        specs.push({ icon: 'square_foot', label: 'জমির পরিমাপ', value: area });
        if (property.landType) {
             specs.push({ icon: 'nature', label: 'জমির ধরন', value: property.landType });
        }
        if (property.roadWidth) {
             specs.push({ icon: 'timeline', label: 'রাস্তার প্রশস্ততা', value: `${formatNumberBn(property.roadWidth)} ফুট` });
        }
    } else {
        // ফ্লাট, বাড়ি, অফিস, দোকান এর জন্য
        if (property.areaSqft) {
            specs.push({ icon: 'zoom_out_map', label: 'ক্ষেত্রফল', value: `${formatNumberBn(property.areaSqft)} বর্গফুট` });
        } else if (property.commercialArea) {
             specs.push({ icon: 'zoom_out_map', label: 'ক্ষেত্রফল', value: `${formatNumberBn(property.commercialArea)} ${property.commercialAreaUnit || 'বর্গফুট'}` });
        }
    }
    
    // --- রুম ও ফ্লোর ---
    if (property.rooms) {
        specs.push({ icon: 'hotel', label: 'রুম সংখ্যা', value: formatNumberBn(property.rooms) });
    }
    if (property.bathrooms) {
        specs.push({ icon: 'bathtub', label: 'বাথরুম', value: formatNumberBn(property.bathrooms) });
    }
    if (property.kitchen && (property.type === 'বাড়ি' || property.type === 'ফ্লাট')) {
        specs.push({ icon: 'kitchen', label: 'কিচেন', value: formatNumberBn(property.kitchen) });
    }
    if (property.type === 'বাড়ি' && property.floors) {
        specs.push({ icon: 'layers', label: 'তলা সংখ্যা', value: formatNumberBn(property.floors) });
    }
    if ((property.type === 'ফ্লাট' || property.type === 'অফিস') && property.floorNo) {
        specs.push({ icon: 'layers', label: 'ফ্লোর নং', value: formatNumberBn(property.floorNo) });
    }
    
    // --- অন্যান্য ---
    if (isBuiltProperty) {
         if (property.propertyAge) {
             specs.push({ icon: 'calendar_today', label: 'বয়স', value: property.propertyAge === '0' ? 'নতুন' : `${formatNumberBn(property.propertyAge)} বছর` });
         }
         if (property.facing) {
             specs.push({ icon: 'explore', label: 'দিক', value: property.facing });
         }
    }
    
    
    // HTML তৈরি
    specsHTML = specs.map(spec => `
        <div class="spec-item">
            <i class="material-icons">${spec.icon}</i> 
            <span>${spec.label}: <strong>${spec.value}</strong></span>
        </div>
    `).join('');
    
    
    // ইউটিলিটি ফিচারস
    let utilitiesHTML = '';
    if (property.utilities && property.utilities.length > 0) {
        const utilityList = property.utilities.map(u => `<li>${u}</li>`).join('');
        utilitiesHTML = `
            <div class="description-section">
                <h3>সুবিধাসমূহ</h3>
                <ul class="utility-list">${utilityList}</ul>
            </div>
        `;
    }
    
    
    // লিস্টার তথ্য
    const listerHTML = `
        <div class="lister-section">
            <div class="lister-info">
                <h3>যোগাযোগের তথ্য</h3>
                <p>পোস্টকারী: <strong>${property.listerType || 'ব্যক্তি'}</strong></p>
                <a href="tel:${property.phoneNumber}" class="contact-button">
                    <i class="material-icons">phone</i> 
                    কল করুন: ${property.phoneNumber || 'N/A'}
                </a>
            </div>
        </div>
    `;

    // গুগল ম্যাপ এম্বেড
    const mapHTML = property.googleMapStatic ? `
        <div class="map-section">
            <h3>অবস্থান (মানচিত্রে)</h3>
            <iframe id="google-map-embed" 
                src="https://maps.google.com/maps?q=${property.googleMapStatic}&z=15&output=embed" 
                allowfullscreen="" loading="lazy">
            </iframe>
        </div>
    ` : `<p style="color: #999; margin-top: 20px;">মানচিত্রের অবস্থান দেওয়া হয়নি।</p>`;

    
    // সকল HTML একসাথে করা
    container.innerHTML = `
        <div class="action-buttons">
            <button class="share-button" id="shareButton">
                <i class="material-icons">share</i> পোস্টটি শেয়ার করুন
            </button>
        </div>

        <div class="property-card-wrapper">
            <div class="image-gallery" data-current-index="0" data-total-slides="${imageUrls.length}" id="imageGallery">
                ${sliderItemsHTML}
                ${sliderNavigationHTML}
            </div>
            
            <div class="details-content">
                
                <div class="title-section">
                    <h1 class="property-title">${property.title || 'শিরোনামবিহীন প্রপার্টি'}</h1>
                    <p class="property-location">
                        <i class="material-icons">location_on</i> ${fullLocation}
                    </p>
                </div>

                ${priceHTML}
                ${advanceInfo}
                
                <div class="content-grid">
                    
                    <div class="left-column">
                        <div class="description-section">
                            <h3>প্রপার্টির বিস্তারিত বিবরণ</h3>
                            <p>${property.description || 'এই প্রপার্টির বিস্তারিত বিবরণ দেওয়া হয়নি।'}</p>
                        </div>
                        
                        ${utilitiesHTML}

                        ${property.category === 'ভাড়া' && property.rentType ? 
                           `<div class="description-section">
                               <h3>ভাড়ার প্রকারভেদ</h3>
                               <p>ভাড়ার ধরন: <strong>${property.rentType}</strong></p>
                               <p>ওঠার তারিখ: <strong>${property.moveInDate || 'যেকোনো সময়'}</strong></p>
                           </div>` : ''}

                    </div>
                    
                    <div class="right-column">
                        <div class="specifications-section">
                            <h3>স্পেসিফিকেশনস</h3>
                            <div class="specs-grid">
                                ${specsHTML || '<p style="grid-column: span 2; color: #999;">কোনো অতিরিক্ত স্পেকস পাওয়া যায়নি।</p>'}
                            </div>
                        </div>
                        ${listerHTML}
                    </div>
                </div>
                
                ${mapHTML}

            </div>
        </div>
    `;

    // ইভেন্ট লিসেনার সেটআপ করা
    setupDetailsEventListeners(property.title, fullLocation);
    setupSliderLogic();
}

// --- ৩. ইভেন্ট লিসেনার ও কার্যকারিতা ---
function setupDetailsEventListeners(title, location) {
    
    // ক. ব্যাক বাটন
    if (backButton) {
        backButton.addEventListener('click', () => {
            window.history.back(); // আগের পেইজে ফিরে যাবে
        });
    }

    // খ. শেয়ার বাটন
    const shareButton = document.getElementById('shareButton');
    if (shareButton) {
        shareButton.addEventListener('click', () => {
            if (navigator.share) {
                // ওয়েব শেয়ার API ব্যবহার করা
                navigator.share({
                    title: title || 'আমার বাড়ি.কম প্রপার্টি',
                    text: `${title} - ${location}. এই প্রপার্টিটি দেখুন:`,
                    url: window.location.href,
                }).catch((error) => console.log('Error sharing', error));
            } else {
                // ফলব্যাক: যদি ওয়েব শেয়ার API সমর্থিত না হয়
                navigator.clipboard.writeText(window.location.href);
                alert('শেয়ার করার জন্য লিংকটি কপি করা হয়েছে।');
            }
        });
    }
}

// গ. ইমেজ স্লাইডার লজিক
function setupSliderLogic() {
    const gallery = document.getElementById('imageGallery');
    if (!gallery) return;

    const images = gallery.querySelectorAll('.gallery-image');
    const totalImages = parseInt(gallery.dataset.totalSlides);
    
    if (totalImages <= 1) {
        // একাধিক ছবি না থাকলে নেভিগেশন বাটন সরিয়ে দেওয়া
        const nav = gallery.querySelector('.slider-nav');
        if (nav) nav.style.display = 'none';
        return;
    }

    let currentIndex = parseInt(gallery.dataset.currentIndex) || 0;

    const updateSlider = (newIndex) => {
        images[currentIndex].classList.remove('active');
        currentIndex = (newIndex + totalImages) % totalImages;
        images[currentIndex].classList.add('active');
        gallery.dataset.currentIndex = currentIndex;
    };

    gallery.addEventListener('click', (e) => {
        if (e.target.classList.contains('next-btn')) {
            updateSlider(currentIndex + 1);
        } else if (e.target.classList.contains('prev-btn')) {
            updateSlider(currentIndex - 1);
        }
    });
}

// ঘ. অথেন্টিকেশন স্টেট হ্যান্ডলার (হেডার আইকন আপডেটের জন্য index.js থেকে কপি করা যেতে পারে)
// এই অংশটি index (3).js থেকে প্রোফাইল ইমেজ লোড করার ফাংশন সহ যোগ করে দিন।

// --- Firebase Auth State Change Handler (index (3).js থেকে নেওয়া) ---
async function loadProfilePicture(user) {
    const profileImage = document.getElementById('profileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
    if (profileImage && defaultProfileIcon) {
        try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) {
                const data = doc.data();
                if (data.profilePictureUrl) {
                    profileImage.src = data.profilePictureUrl;
                    profileImage.style.display = 'block';
                    defaultProfileIcon.style.display = 'none';
                } else {
                    profileImage.style.display = 'none';
                    defaultProfileIcon.style.display = 'block';
                }
            }
        } catch (error) {
            console.error("Profile picture load failed:", error);
            profileImage.style.display = 'none';
            defaultProfileIcon.style.display = 'block';
        }
    }
}
// ---

document.addEventListener('DOMContentLoaded', function() {
    // পোস্টের বিবরণ লোড করা
    loadPropertyDetails(); 
    
    // Auth State Change Handler 
    auth.onAuthStateChanged(user => {
        const profileImageWrapper = document.getElementById('profileImageWrapper');
        const loginLinkSidebar = document.getElementById('login-link-sidebar'); // যদিও সাইডবার নেই, এই লজিকটি রেখে দেওয়া হলো

        if (user) {
            loadProfilePicture(user); 
            // যদি এখানে অন্য আইকনের কাউন্ট আপডেট করার ফাংশন থাকে, তা যোগ করা যেতে পারে
        } else {
            const profileImage = document.getElementById('profileImage');
            const defaultProfileIcon = document.getElementById('defaultProfileIcon');

            if (profileImage) profileImage.style.display = 'none';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
        }
    });
    
    // হেডার আইকন রিডাইরেক্ট লজিক (post.js থেকে নেওয়া)
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    const profileImageWrapper = document.getElementById('profileImageWrapper');
    
    if (notificationButton) notificationButton.addEventListener('click', () => { window.location.href = 'notifications.html'; });
    if (headerPostButton) headerPostButton.addEventListener('click', () => { window.location.href = 'post.html'; });
    if (messageButton) messageButton.addEventListener('click', () => { window.location.href = 'messages.html'; });
    if (profileImageWrapper) profileImageWrapper.addEventListener('click', () => { window.location.href = 'profile.html'; });

});
