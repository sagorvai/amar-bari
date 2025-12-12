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

// --- প্রোফাইল ইমেজ লোড করার ফাংশন ---
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
// --- প্রোফাইল ইমেজ লোড করার ফাংশন শেষ ---

// --- ⭐ নতুন ফাংশন: স্লাইডার নেভিগেশন লজিক ⭐ ---
function setupSliderLogic() {
    // প্রপার্টি গ্রিড লোড হওয়ার পরে এই লজিকটি রান করা হয়
    document.querySelectorAll('.slider-nav-btn').forEach(button => {
        // e.preventDefault() এবং e.stopPropagation() ব্যবহার করা হলো যাতে কার্ডে ক্লিক ইভেন্ট না হয়
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
            slides.forEach(slide => slide.style.display = 'none'); // সব স্লাইড লুকিয়ে ফেলুন
            slides[currentIndex].style.display = 'block'; // বর্তমান স্লাইডটি দেখান
            slider.dataset.currentIndex = currentIndex; // ইনডেক্স আপডেট করুন
        });
    });
}
// --- স্লাইডার নেভিগেশন লজিক শেষ ---


// --- ✅ আপডেট: প্রপার্টি কার্ডের HTML তৈরি করার ফাংশন (ডাইনামিক কন্টেন্ট ও স্লাইডার সহ) ---
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
    
    // পরিমাপ (Size/Amount)
    const sizeSqft = property.sizeSqft || property.landArea || '-'; 
    // যদি জমি হয়, তবে sizeUnit পরিবর্তন হতে পারে (যেমন কাঠা/বিঘা)
    const sizeUnit = property.sizeUnit || 'স্কয়ার ফিট'; 
    const displaySize = sizeSqft !== '-' ? `${sizeSqft} ${sizeUnit}` : '-';
    
    // --- ডাইনামিক প্রাইস/ডিটেইলস লজিক ---
    const priceValue = property.price ? new Intl.NumberFormat('bn-BD', { minimumFractionDigits: 0 }).format(property.price) : 'আলোচনা সাপেক্ষে';
    let priceDetailsHTML = '';
    
    if (category === 'বিক্রয়') {
        // বিক্রয়ের জন্য: শিরোনাম, লোকেশন, প্রপার্টি ধরন, পরিমান, দাম
        priceDetailsHTML = `<div class="property-price sale-price">৳ ${priceValue}</div>`;
    } else if (category === 'ভাড়া') {
        // ভাড়ার জন্য: শিরোনাম, লোকেশন, প্রপার্টি ধরন, পরিমান, ভাড়া
        priceDetailsHTML = `<div class="property-price rent-price">৳ ${priceValue} <span class="unit">/মাস</span></div>`;
    } else {
        priceDetailsHTML = `<div class="property-price">৳ ${priceValue}</div>`;
    }

    // --- স্লাইডার HTML জেনারেশন ---
    const images = property.images || [];
    const sliderItemsHTML = images.map((imageMeta, index) => {
        const imageUrl = imageMeta.url; 
        // প্রথম স্লাইডটি দেখানোর জন্য display: block ব্যবহার করা হয়েছে।
        return `<div class="slider-item" style="background-image: url('${imageUrl}'); ${index === 0 ? 'display: block;' : 'display: none;'}"></div>`;
    }).join('');

    // একাধিক ছবি থাকলে নেভিগেশন বাটন দেখানো হবে
    const sliderNavigationHTML = images.length > 1 ? `
        <button class="slider-nav-btn prev-btn" data-id="${propertyId}">&#10094;</button>
        <button class="slider-nav-btn next-btn" data-id="${propertyId}">&#10095;</button>
    ` : '';
    
    // ডিটেইলস পেইজে রিডাইরেক্ট করা 
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
                    <span title="প্রপার্টির ধরন"><i class="material-icons">home</i> ${propertyType}</span> 
                    <span title="পরিমাপ"><i class="material-icons">square_foot</i> ${displaySize}</span> 
                </div>
                ${priceDetailsHTML}
            </div>
        </a>
    `;
}

// --- ✅ আপডেট: প্রপার্টি লোড ও ডিসপ্লে করার ফাংশন ---
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
        
        // ⭐ নতুন সংযোজন: প্রপার্টি লোড হওয়ার পর স্লাইডার লজিক সেটআপ করা ⭐
        setupSliderLogic();

    } catch (error) {
        console.error("প্রপার্টি লোড করতে ব্যর্থ:", error);
        propertyG.innerHTML = `<p class="error-message">দুঃখিত! প্রপার্টি লোড করার সময় একটি সমস্যা হয়েছে। অনুগ্রহ করে পরে আবার চেষ্টা করুন।</p>`;
    }
}


// লগআউট হ্যান্ডেলার (পরিবর্তন হয়নি)
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

// আইকন কাউন্টার আপডেট করার ডামি ফাংশন (পরিবর্তন হয়নি)
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

// ইভেন্ট লিসেনার সেটআপ (পরিবর্তন হয়নি)
function setupUIEventListeners() {
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
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.dataset.category;
            fetchAndDisplayProperties(category, globalSearchInput.value);
        });
    });

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
    setupUIEventListeners();
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    auth.onAuthStateChanged(user => {
        
        if (user) {
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
