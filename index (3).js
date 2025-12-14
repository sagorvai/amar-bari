// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

// ✅ নেভিগেশন ও প্রোফাইল উপাদান
const notificationButton = document.getElementById('notificationButton'); 
const messageButton = document.getElementById('messageButton');
const headerPostButton = document.getElementById('headerPostButton'); 
const profileImageWrapper = document.getElementById('profileImageWrapper'); 
const profileImage = document.getElementById('profileImage'); 
const defaultProfileIcon = document.getElementById('defaultProfileIcon'); 

// ✅ কাউন্টার উপাদান
const notificationCount = document.getElementById('notification-count');
const messageCount = document.getElementById('message-count');
const postCount = document.getElementById('post-count'); 

const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');
const globalSearchInput = document.getElementById('globalSearchInput');

// --- ⭐ FIX: প্রোফাইল ইমেজ লোড করার ফাংশন যোগ করা হলো ⭐ ---
async function loadProfilePicture(user) {
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
// --- FIX: প্রোফাইল ইমেজ লোড করার ফাংশন শেষ ---

// --- ⭐ স্লাইডার নেভিগেশন লজিক (পুনঃস্থাপন) ⭐ ---
function setupSliderLogic() {
    document.querySelectorAll('.slider-nav-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault(); 
            e.stopPropagation(); 

            const card = e.target.closest('.property-card');
            const slider = card.querySelector('.image-slider');
            const slides = slider.querySelectorAll('.slider-item');
            const totalSlides = parseInt(slider.dataset.totalSlides);
            
            if (totalSlides <= 1) return;

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


// --- ✅ আপডেট: প্রপার্টি কার্ডের HTML তৈরি করার ফাংশন (কাস্টমাইজড ডাইনামিক ডেটা সহ) ---
function createPropertyCardHTML(property) {
    const propertyId = property.id;
    const title = property.title || 'শিরোনামবিহীন প্রপার্টি';
    
    // লোকেশনের তথ্য সংগ্রহ ও একত্রিত করা
    const district = property.location?.district || property.location?.city || 'অজানা জেলা';
    const area = property.location?.area || property.location?.village || 'অজানা এলাকা'; 
    const fullLocation = `${area}, ${district}`;

    const category = property.category || 'বিক্রয়'; // 'বিক্রয়' বা 'ভাড়া'
    const propertyType = property.propertyType || 'প্রপার্টি'; // যেমন: 'ফ্ল্যাট', 'বাড়ি', 'জমি', 'প্লট'
    
    const priceValue = property.price ? new Intl.NumberFormat('bn-BD', { minimumFractionDigits: 0 }).format(property.price) : 'আলোচনা সাপেক্ষে';
    const priceCurrency = property.price ? `৳ ${priceValue}` : 'আলোচনা সাপেক্ষে';
    
    // 1. ডাইনামিক ক্যাটাগরি ট্যাগ (ছবির উপরে)
    const dynamicCategoryTag = `${propertyType} ${category}`;
    
    // 2. ডাইনামিক পরিমাপ ও স্পেকস লজিক
    let specsHTML = '';
    
    // জমি/প্লট কিনা তা চেক করা হলো: যদি propertyType 'জমি' বা 'প্লট' হয়
    const isLandOrPlot = propertyType === 'জমি' || propertyType === 'প্লট'; 

    if (category === 'বিক্রয়') {
        // --- 🔥 বিক্রয়ের জন্য স্পেকস 🔥 ---
        
        if (isLandOrPlot) {
            // জমির জন্য: পরিমাপ (শতক/কাঠা) ও জমির প্রকৃতি (বিলান/আবাসিক)
            const landArea = property.landArea || property.sizeSqft || '-'; 
            const sizeUnit = property.sizeUnit || 'শতক'; 
            const displaySize = landArea !== '-' ? `${landArea} ${sizeUnit}` : '-';
            const landType = property.landType || '-'; 
            
            specsHTML = `
                <span title="জমির পরিমাপ"><i class="material-icons">square_foot</i> ${displaySize}</span>
                <span title="জমির প্রকৃতি"><i class="material-icons">landscape</i> ${landType}</span>
                <span title="প্রপার্টির ধরন"><i class="material-icons">category</i> ${propertyType}</span>
            `;
        } else {
            // অন্যান্য বিক্রয়ের জন্য: ফ্লোর এরিয়া, বেডরুম, বাথরুম
            const sizeSqft = property.sizeSqft || '-';
            const displaySqft = sizeSqft !== '-' ? `${sizeSqft} স্কয়ারফিট` : '-';
            const bedrooms = property.bedrooms || '-';
            const bathrooms = property.bathrooms || '-';

            specsHTML = `
                <span title="ফ্লোর এরিয়া"><i class="material-icons">square_foot</i> ${displaySqft}</span>
                <span title="বেডরুম"><i class="material-icons">king_bed</i> ${bedrooms}</span>
                <span title="বাথরুম"><i class="material-icons">bathtub</i> ${bathrooms}</span>
            `;
        }

        // মূল্য প্রদর্শন (বিক্রয়)
        priceHTML = `<div class="property-price sale-price">${priceCurrency}</div>`;

    } else if (category === 'ভাড়া') {
        // --- 🔥 ভাড়ার জন্য স্পেকস 🔥 ---

        // ভাড়ার জন্য: ফ্লোর এরিয়া, বেডরুম, বাথরুম (জমির ক্ষেত্রে সাধারণত ভাড়া কম হয়, তাই ফ্লোর এরিয়াকে অগ্রাধিকার দেওয়া হলো)
        const sizeSqft = property.sizeSqft || '-';
        const displaySqft = sizeSqft !== '-' ? `${sizeSqft} স্কয়ারফিট` : '-';
        const bedrooms = property.bedrooms || '-';
        const bathrooms = property.bathrooms || '-';
        
        specsHTML = `
            <span title="বেডরুম"><i class="material-icons">king_bed</i> ${bedrooms}</span>
            <span title="বাথরুম"><i class="material-icons">bathtub</i> ${bathrooms}</span>
            <span title="ফ্লোর এরিয়া"><i class="material-icons">square_foot</i> ${displaySqft}</span>
        `;
        
        // মূল্য প্রদর্শন (ভাড়া)
        priceHTML = `<div class="property-price rent-price">${priceCurrency} <span class="unit">/মাস</span></div>`;
    }
    
    // 4. স্লাইডার HTML জেনারেশন (একাধিক ছবি থাকলে)
    const images = property.images || [];
    const sliderItemsHTML = images.map((imageMeta, index) => {
        const imageUrl = imageMeta.url || 'https://via.placeholder.com/300x200?text=No+Image'; 
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
                    ${sliderItemsHTML || `<div class="slider-item" style="background-image: url('https://via.placeholder.com/300x200?text=No+Image'); display: block;"></div>`}
                </div>
                ${sliderNavigationHTML}
                <span class="property-category">${dynamicCategoryTag}</span>
            </div>
            <div class="property-details">
                <h3 class="property-title">${title}</h3>
                <p class="property-location">
                    <i class="material-icons location-icon">location_on</i> ${fullLocation}
                </p>
                <div class="property-specs">
                    ${specsHTML}
                </div>
                ${priceHTML}
            </div>
        </a>
    `;
}
// --- প্রপার্টি কার্ডের HTML তৈরি করার ফাংশন শেষ ---


// --- fetchAndDisplayProperties ফাংশন (setupSliderLogic কল সহ) ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    
    propertyG.innerHTML = '<p class=\"loading-message\">প্রপার্টি লোড হচ্ছে...</p>';
    
    // 'map' ক্যাটাগরি হ্যান্ডেলিং
    const isMapView = category === 'map';
    const propertyGridContainer = document.getElementById('property-grid-container');
    const mapSection = document.getElementById('map-section');
    
    if (isMapView) {
        propertyGridContainer.style.display = 'none';
        mapSection.style.display = 'block';
        propertyG.innerHTML = ''; 
        return;
    } else {
        propertyGridContainer.style.display = 'block';
        mapSection.style.display = 'none';
    }

    // ফায়ারবেস কোয়েরি
    let query = db.collection('properties').where('category', '==', category).orderBy('createdAt', 'desc');
    
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
            
            // সাধারণ সার্চ ফিল্টার
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
// --- fetchAndDisplayProperties ফাংশন শেষ ---


// লগআউট হ্যান্ডেলার
const handleLogout = async (e) => {
    e.preventDefault();
    try {
        await auth.signOut();
        alert('সফলভাবে লগআউট করা হয়েছে!');
        window.location.href = 'index.html'; 
    } catch (error) {
        console.error("লগআউট ব্যর্থ হয়েছে:", error);
        alert("লগআউট ব্যর্থ হয়েছে।");
    }
};

// আইকন কাউন্টার আপডেট করার ডামি ফাংশন 
function updateIconCounts() {
    if (notificationCount) {
        notificationCount.style.display = 'none';
    }
    if (messageCount) {
        messageCount.style.display = 'none';
    }
    if (postCount) {
        postCount.style.display = 'none';
    }
}

// ইভেন্ট লিসেনার সেটআপ
function setupUIEventListeners() {
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
    
    // নেভিগেশন আইকন রিডাইরেক্ট
    if (notificationButton) {
        notificationButton.addEventListener('click', () => {
             window.location.href = 'notifications.html'; 
        });
    }

    if (headerPostButton) {
        headerPostButton.addEventListener('click', () => {
            window.location.href = 'post.html'; 
        });
    }

    if (messageButton) {
        messageButton.addEventListener('click', () => {
             window.location.href = 'messages.html';
        });
    }
    
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }
    
    // প্রপার্টি ক্যাটাগরি ফিল্টার
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.dataset.category;
            fetchAndDisplayProperties(category, globalSearchInput.value);
        });
    });

    // গ্লোবাল সার্চ ইনপুট ইভেন্ট
    if (globalSearchInput) {
        globalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const activeCategory = document.querySelector('.nav-filters .nav-button.active').dataset.category;
                fetchAndDisplayProperties(activeCategory, globalSearchInput.value);
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // সকল ইভেন্ট লিসেনার সেটআপ করা হলো
    setupUIEventListeners();
    
    // প্রাথমিক লোড: ডিফল্টভাবে 'বিক্রয়' ক্যাটাগরি দেখাবে
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    // Auth State Change Handler 
    auth.onAuthStateChanged(user => {
        
        if (user) {
            // লগইন থাকলে
            loadProfilePicture(user); 
            updateIconCounts(); 
            
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            // লগইন না থাকলে
            profileImage.style.display = 'none';
            defaultProfileIcon.style.display = 'block';
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 

            notificationCount.style.display = 'none';
            messageCount.style.display = 'none';
            postCount.style.display = 'none';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });

});
