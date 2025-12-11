// index.js

// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth(); 

// HTML উপাদানগুলো নির্বাচন
const propertyListContainer = document.getElementById('property-list');
const categoryButtons = document.getElementById('category-buttons');
const loadingMessage = document.getElementById('loading-message');
const noPostsMessage = document.getElementById('no-posts-message');

/**
 * একটি একক প্রপার্টি পোস্টের জন্য HTML কার্ড তৈরি করে।
 * @param {object} property - একটি প্রপার্টির ডেটা (Firestore ডকুমেন্ট)।
 * @returns {string} - প্রপার্টি কার্ডের HTML স্ট্রিং।
 */
const createPropertyCard = (property) => {
    // পোস্টের প্রথম ছবিটি ব্যবহার করা হচ্ছে, যদি থাকে
    const imageUrl = property.images && property.images.length > 0 
        ? property.images[0].url 
        : 'placeholder.jpg'; // যদি কোনো ছবি না থাকে

    // মূল্যকে সঠিকভাবে ফরম্যাট করা
    const formattedPrice = new Intl.NumberFormat('bn-BD', {
        style: 'currency',
        currency: 'BDT',
        minimumFractionDigits: 0
    }).format(property.price);
    
    // ক্যাটাগরি বাটন টেক্সট
    let categoryText;
    if (property.postCategory === 'buy') {
        categoryText = 'বিক্রয়ের জন্য';
    } else if (property.postCategory === 'rent') {
        categoryText = 'ভাড়ার জন্য';
    } else {
        categoryText = 'অন্যান্য';
    }

    return `
        <div class="property-card" data-id="${property.id}" onclick="window.location.href='property-details.html?id=${property.id}'">
            <div class="card-image" style="background-image: url('${imageUrl}');">
                <span class="card-tag ${property.postCategory}">${categoryText}</span>
            </div>
            <div class="card-content">
                <h3 class="card-title">${property.title || 'শিরোনাম নেই'}</h3>
                <p class="card-price">${formattedPrice}</p>
                <div class="card-details">
                    <p><span class="material-icons">location_on</span> ${property.location || 'অবস্থান নেই'}</p>
                    <p><span class="material-icons">bed</span> ${property.bedrooms || '?'}</p>
                    <p><span class="material-icons">bathtub</span> ${property.bathrooms || '?'}</p>
                </div>
            </div>
        </div>
    `;
};


/**
 * Firestore থেকে প্রকাশিত পোস্টগুলো লোড করে এবং প্রদর্শিত করে।
 * @param {string} category - ফিল্টার করার জন্য ক্যাটাগরি ('all', 'buy', 'rent')।
 */
const loadProperties = async (category = 'all') => {
    propertyListContainer.innerHTML = '';
    loadingMessage.style.display = 'block';
    noPostsMessage.style.display = 'none';

    try {
        let query = db.collection('properties')
                        .where('status', '==', 'published') // শুধুমাত্র প্রকাশিত পোস্ট
                        .orderBy('createdAt', 'desc'); // নতুন পোস্ট প্রথমে

        // ক্যাটাগরি ফিল্টার প্রয়োগ
        if (category !== 'all') {
            query = query.where('postCategory', '==', category);
        }

        const snapshot = await query.get();
        loadingMessage.style.display = 'none';
        
        if (snapshot.empty) {
            noPostsMessage.style.display = 'block';
            return;
        }

        let propertiesHtml = '';
        snapshot.forEach(doc => {
            const propertyData = doc.data();
            propertiesHtml += createPropertyCard({ id: doc.id, ...propertyData });
        });

        propertyListContainer.innerHTML = propertiesHtml;

    } catch (error) {
        console.error("পোস্ট লোড করতে ব্যর্থ হয়েছে:", error);
        loadingMessage.style.display = 'none';
        propertyListContainer.innerHTML = '<p class="error-message">পোস্ট লোড করার সময় একটি সমস্যা হয়েছে।</p>';
    }
};


/**
 * ক্যাটাগরি বাটনগুলোতে ক্লিক হ্যান্ডলার যুক্ত করে।
 */
const setupCategoryFilters = () => {
    categoryButtons.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('category-btn')) {
            // সমস্ত বাটন থেকে 'active' ক্লাসটি সরিয়ে দাও
            document.querySelectorAll('.category-btn').forEach(btn => btn.classList.remove('active'));
            
            // ক্লিক করা বাটনে 'active' ক্লাসটি যোগ করো
            target.classList.add('active');

            // ডেটা-ক্যাটাগরি অ্যাট্রিবিউট থেকে ক্যাটাগরি নাও
            const category = target.getAttribute('data-category');
            
            // নতুন ক্যাটাগরি অনুসারে পোস্ট লোড করো
            loadProperties(category);
        }
    });
};


/**
 * ব্যবহারকারীর লগইন স্ট্যাটাস পরীক্ষা করে হেডার/সাইডবারের UI আপডেট করে।
 * post.js থেকে নেওয়া লজিকের সাথে সামঞ্জস্যপূর্ণ।
 */
const updateUIForAuthStatus = (user) => {
    const headerProfileImage = document.getElementById('headerProfileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
    const headerLoginLink = document.getElementById('header-login-link');
    const headerProfileLink = document.getElementById('header-profile-link');
    const loginLinkSidebar = document.getElementById('loginLinkSidebar');
    const profileLinkSidebar = document.getElementById('profileLinkSidebar');
    const logoutLinkSidebar = document.getElementById('logoutLinkSidebar');
    
    // লগইন থাকলে
    if (user) {
        // হেডার
        if (headerLoginLink) headerLoginLink.style.display = 'none';
        if (headerProfileLink) headerProfileLink.style.display = 'inline'; // প্রোফাইল লিঙ্ক দেখাও
        
        // সাইডবার
        if (loginLinkSidebar) loginLinkSidebar.style.display = 'none';
        if (profileLinkSidebar) profileLinkSidebar.style.display = 'block'; 
        if (logoutLinkSidebar) logoutLinkSidebar.style.display = 'block'; 

        // প্রোফাইল ছবি
        if (user.photoURL && headerProfileImage) {
            headerProfileImage.src = user.photoURL;
            headerProfileImage.style.display = 'block';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'none';
        } else {
            if (headerProfileImage) headerProfileImage.style.display = 'none';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
        }

    } else {
        // লগইন না থাকলে
        
        // হেডার
        if (headerLoginLink) headerLoginLink.style.display = 'inline';
        if (headerProfileLink) headerProfileLink.style.display = 'none'; // প্রোফাইল লিঙ্ক লুকিয়ে রাখো
        
        // সাইডবার
        if (loginLinkSidebar) {
            loginLinkSidebar.textContent = 'লগইন';
            loginLinkSidebar.href = 'auth.html';
            loginLinkSidebar.style.display = 'block';
        }
        if (profileLinkSidebar) profileLinkSidebar.style.display = 'none'; 
        if (logoutLinkSidebar) logoutLinkSidebar.style.display = 'none'; 

        // প্রোফাইল ছবি
        if (headerProfileImage) headerProfileImage.style.display = 'none';
        if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
    }
    
    // সাইডবার লগআউট লজিক যোগ করা
    if (logoutLinkSidebar) {
        logoutLinkSidebar.onclick = async (e) => {
            e.preventDefault();
            try {
                await auth.signOut();
                alert("সফলভাবে লগআউট করা হয়েছে!");
                window.location.reload(); // পেজটি রিলোড করা
            } catch (error) {
                console.error("লগআউট ব্যর্থ:", error);
                alert("লগআউট করতে সমস্যা হয়েছে।");
            }
        };
    }
};

// ডকুমেন্ট লোড হওয়ার পর প্রধান লজিক
document.addEventListener('DOMContentLoaded', function() {
    
    // Auth স্ট্যাটাস পরিবর্তন পর্যবেক্ষণ করা
    auth.onAuthStateChanged(user => {
        updateUIForAuthStatus(user);
    });
    
    // ক্যাটাগরি ফিল্টার সেটআপ করা
    setupCategoryFilters();

    // ডিফল্টভাবে সকল পোস্ট লোড করা
    loadProperties('all');
});
