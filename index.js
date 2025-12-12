// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements (Previous setup remains)
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// ... (কাউন্টার এবং অন্যান্য উপাদানগুলি অপরিবর্তিত) ...

const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');
const globalSearchInput = document.getElementById('globalSearchInput');

// --- প্রোফাইল ইমেজ লোড করার ফাংশন (অপরিবর্তিত) ---
async function loadProfilePicture(user) { /* ... */ }

// --- স্লাইডার নেভিগেশন লজিক (অপরিবর্তিত) ---
function setupSliderLogic() { 
    // ... (আপনার দেওয়া স্লাইডার লজিক) ...
    document.querySelectorAll('.slider-nav-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation(); 

            const card = e.target.closest('.property-card');
            const slider = card.querySelector('.image-slider');
            const slides = slider.querySelectorAll('.slider-item');
            const totalSlides = parseInt(slider.dataset.totalSlides);
            let currentIndex = parseInt(slider.dataset.currentIndex);
            
            // পরবর্তী স্লাইডে যাওয়া
            if (e.target.classList.contains('next-btn')) {
                currentIndex = (currentIndex + 1) % totalSlides;
            } 
            // পূর্ববর্তী স্লাইডে যাওয়া
            else if (e.target.classList.contains('prev-btn')) {
                currentIndex = (currentIndex - 1 + totalSlides) % totalSlides;
            }
            
            // UI আপডেট
            slides.forEach(slide => slide.style.display = 'none');
            slides[currentIndex].style.display = 'block';
            slider.dataset.currentIndex = currentIndex; 
        });
    });
}
// --- স্লাইডার নেভিগেশন লজিক শেষ ---


// --- ✅ আপডেট: প্রপার্টি কার্ডের HTML তৈরি করার ফাংশন (ডাইনামিক কন্টেন্ট) ---
function createPropertyCardHTML(property) {
    const propertyId = property.id;
    const title = property.title || 'শিরোনামবিহীন প্রপার্টি';
    
    // লোকেশনের তথ্য সংগ্রহ ও একত্রিত করা
    const district = property.location?.district || 'অজানা জেলা';
    const thana = property.location?.thana || 'অজানা থানা';
    const village = property.location?.village || property.location?.area || 'অজানা গ্রাম/এলাকা'; 
    const fullLocation = `${village}, ${thana}, ${district}`;

    const category = property.category || 'বিক্রয়';
    const propertyType = property.propertyType || 'প্রপার্টি'; // প্রপার্টির ধরন
    
    const sizeSqft = property.sizeSqft || property.landArea || '-'; 
    const sizeUnit = property.sizeUnit || 'স্কয়ার ফিট'; 
    const displaySize = sizeSqft !== '-' ? `${sizeSqft} ${sizeUnit}` : '-';
    
    const bedrooms = property.bedrooms || '-';
    const bathrooms = property.bathrooms || '-';
    
    // --- ডাইনামিক প্রাইস/ডিটেইলস লজিক ---
    const priceValue = property.price ? new Intl.NumberFormat('bn-BD', { minimumFractionDigits: 0 }).format(property.price) : 'আলোচনা সাপেক্ষে';
    let priceDetailsHTML = '';
    let specsHTML = ''; // নতুন স্পেকস (Specs) কন্টেইনার
    
    if (category === 'বিক্রয়') {
        // বিক্রয়ের জন্য: মূল্য (৳), ধরন, পরিমান (Size), বেডরুম
        priceDetailsHTML = `<div class="property-price sale-price">৳ ${priceValue}</div>`;
        specsHTML = `
            <span title="প্রপার্টির ধরন"><i class="material-icons">home</i> ${propertyType}</span>
            <span title="পরিমাপ"><i class="material-icons">square_foot</i> ${displaySize}</span>
            <span title="বেডরুম"><i class="material-icons">king_bed</i> ${bedrooms}</span> 
        `;
    } else if (category === 'ভাড়া') {
        // ভাড়ার জন্য: মূল্য (৳ /মাস), ধরন, বেডরুম, বাথরুম
        priceDetailsHTML = `<div class="property-price rent-price">৳ ${priceValue} <span class="unit">/মাস</span></div>`;
         specsHTML = `
            <span title="প্রপার্টির ধরন"><i class="material-icons">home</i> ${propertyType}</span>
            <span title="বেডরুম"><i class="material-icons">king_bed</i> ${bedrooms}</span>
            <span title="বাথরুম"><i class="material-icons">bathtub</i> ${bathrooms}</span>
        `;
    } else {
         priceDetailsHTML = `<div class="property-price">৳ ${priceValue}</div>`;
         specsHTML = `<span title="প্রপার্টির ধরন"><i class="material-icons">home</i> ${propertyType}</span>`;
    }

    // --- স্লাইডার HTML জেনারেশন (অপরিবর্তিত) ---
    const images = property.images || [];
    const sliderItemsHTML = images.map((imageMeta, index) => {
        const imageUrl = imageMeta.url; 
        return `<div class="slider-item" style="background-image: url('${imageUrl}'); ${index === 0 ? 'display: block;' : 'display: none;'}"></div>`;
    }).join('');

    const sliderNavigationHTML = images.length > 1 ? `
        <button class="slider-nav-btn prev-btn" data-id="${propertyId}">&#10094;</button>
        <button class="slider-nav-btn next-btn" data-id="${propertyId}">&#10095;</button>
    ` : '';
    
    const detailLink = `details.html?id=${propertyId}`; 

    return `
        <a href="${detailLink}" class="property-card" data-id="${propertyId}">
            <div class="property-image-container slider-container">
                <div class="image-slider" data-current-index="0" data-total-slides="${images.length}">
                    ${sliderItemsHTML}
                </div>
                ${sliderNavigationHTML}
                <span class="property-category">${category}</span>
            </div>
            <div class="property-details">
                <h3 class="property-title">${title}</h3>
                <p class="property-location">
                    <i class="material-icons location-icon">location_on</i> ${fullLocation}
                </p>
                <div class="property-specs">
                    ${specsHTML} </div>
                ${priceDetailsHTML}
            </div>
        </a>
    `;
}

// --- fetchAndDisplayProperties ফাংশন (অপরিবর্তিত) ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    
    propertyG.innerHTML = '<p class=\"loading-message\">প্রপার্টি লোড হচ্ছে...</p>';
    
    // ... (map ভিউ লজিক) ...
    
    // ফায়ারবেস কোয়েরি
    let query = db.collection('properties')
                  .where('category', '==', category)
                  .where('status', '==', 'published') 
                  .orderBy('createdAt', 'desc');
    
    try {
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            propertyG.innerHTML = `<p class="no-results-message">এই ক্যাটাগরিতে (<b>${category}</b>) কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।</p>`;
            return;
        }
        
        let propertiesHTML = '';
        const sTerm = searchTerm.trim().toLowerCase();
        let foundCount = 0;
        
        snapshot.forEach(doc => {
            const propertyData = {
                id: doc.id,
                ...doc.data()
            };
            
            // সার্চ ফিল্টার
            const titleMatch = propertyData.title && propertyData.title.toLowerCase().includes(sTerm);
            const cityMatch = propertyData.location?.city && propertyData.location.city.toLowerCase().includes(sTerm);
            const areaMatch = propertyData.location?.area && propertyData.location.area.toLowerCase().includes(sTerm);
            
            if (sTerm === '' || titleMatch || cityMatch || areaMatch) {
                propertiesHTML += createPropertyCardHTML(propertyData);
                foundCount++;
            }
        });
        
        propertyG.innerHTML = propertiesHTML;
        
        if (foundCount === 0) {
             propertyG.innerHTML = `<p class="no-results-message">আপনার খোঁজা (<b>${searchTerm}</b>) সাথে মেলানো কোনো প্রপার্টি এই ক্যাটাগরিতে (<b>${category}</b>) খুঁজে পাওয়া যায়নি।</p>`;
        }
        
        // প্রপার্টি লোড হওয়ার পর স্লাইডার লজিক সেটআপ করা
        setupSliderLogic();

    } catch (error) {
        console.error("প্রপার্টি লোড করতে ব্যর্থ:", error);
        propertyG.innerHTML = `<p class="error-message">দুঃখিত! প্রপার্টি লোড করার সময় একটি সমস্যা হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।</p>`;
    }
}

// ... (handleLogout, updateIconCounts, setupUIEventListeners, DOMContentLoaded লজিকগুলি অপরিবর্তিত) ...
