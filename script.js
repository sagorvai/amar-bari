document.addEventListener('DOMContentLoaded', () => {
    // UI উপাদানগুলো নির্বাচন করা
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const navButtons = document.querySelectorAll('.sub-header .nav-button');
    const globalSearchInput = document.getElementById('globalSearchInput');
    const searchIconButton = document.getElementById('searchIconButton'); 
    const propertyGrid = document.querySelector('.property-grid');
    
    // ডামি ডেটা (কার্যকারিতা পরীক্ষার জন্য)
    const dummyProperties = [
        { id: 'dummy1', category: 'বিক্রয়', type: 'বাড়ি', title: 'শান্তিনগরে আধুনিক ডিজাইনের বাড়ি', images: ['https://via.placeholder.com/350x250?text=House+for+Sale'], price: '৳ ১,৫০,০০,০০০', location: { upazila: 'মতিঝিল', district: 'ঢাকা' }, rooms: 3, bathrooms: 2 },
        { id: 'dummy2', category: 'ভাড়া', type: 'ফ্লাট', title: 'গুলশানে ২ রুমের ফ্লাট ভাড়া', images: ['https://via.placeholder.com/350x250?text=Flat+for+Rent'], rentAmount: '৳ ২৫,০০০/মাস', location: { upazila: 'গুলশান', district: 'ঢাকা' }, rooms: 2, bathrooms: 1 },
        { id: 'dummy3', category: 'বিক্রয়', type: 'জমি', title: 'খুলনায় বাণিজ্যিক প্লট', images: ['https://via.placeholder.com/350x250?text=Land+for+Sale'], price: '৳ ৫০,০০,০০০ /শতক', location: { upazila: 'সোনাডাঙ্গা', district: 'খুলনা' }, rooms: null, bathrooms: null },
        { id: 'dummy4', category: 'ভাড়া', type: 'দোকান', title: 'ধানমন্ডিতে ভালো লোকেশনের দোকান', images: ['https://via.placeholder.com/350x250?text=Shop+for+Rent'], rentAmount: '৳ ১২,০০০/মাস', location: { upazila: 'ধানমন্ডি', district: 'ঢাকা' }, rooms: null, bathrooms: null }
    ];

    
    // ===================================
    // ১. প্রপার্টি ডিসপ্লে ফাংশন
    // ===================================
    function displayProperties(properties) {
        if (!propertyGrid) return;
        propertyGrid.innerHTML = '';

        if (properties.length === 0) {
            propertyGrid.innerHTML = '<p class="placeholder-text" style="text-align:center; padding: 50px 0; color: #999;">এই ফিল্টারে কোনো প্রপার্টি পাওয়া যায়নি।</p>';
            return;
        }

        properties.forEach(property => {
            const card = document.createElement('div');
            card.classList.add('property-card');

            const imageUrl = property.images && property.images.length > 0
                ? property.images[0]
                : 'https://via.placeholder.com/350x250?text=No+Image';
                
            const roomInfo = property.rooms ? `<span><i class="material-icons">bed</i> ${property.rooms} বেড</span>` : '';
            const bathroomInfo = property.bathrooms ? `<span><i class="material-icons">bathtub</i> ${property.bathrooms} বাথ</span>` : '';
            
            const priceDisplay = property.price || property.rentAmount || 'দাম জানতে যোগাযোগ করুন';
            const tag = property.category === 'বিক্রয়' ? 'বিক্রয়ের জন্য' : 'ভাড়ার জন্য';
            const tagClass = property.category === 'ভাড়া' ? 'rent-tag' : '';


            card.innerHTML = `
                <div class="property-image-container">
                    <img src="${imageUrl}" alt="${property.title}" class="property-image">
                    <span class="property-tag ${tagClass}">${tag}</span>
                </div>
                <div class="property-card-content">
                    <h4>${property.title}</h4>
                    <p class="location">
                        <i class="material-icons">location_on</i>
                        ${property.location?.upazila || ''}, ${property.location?.district || ''}
                    </p>
                    <p class="price">${priceDisplay}</p>
                    <div class="property-info">
                        ${roomInfo}
                        ${bathroomInfo}
                    </div>
                </div>
            `;
            
            propertyGrid.appendChild(card);
        });
    }

    
    // ===================================
    // ২. ফিল্টার এবং সার্চ ফাংশন
    // ===================================
    function fetchAndDisplayProperties(category = 'বিক্রয়', searchTerm = '') {
        
        if (category === 'ম্যাপ') {
            if(propertyGrid) {
                propertyGrid.innerHTML = '<p class="placeholder-text" style="text-align:center; padding: 50px 0; color: #999;">ম্যাপ ভিউ লোড হচ্ছে... (কার্যকরী ম্যাপের জন্য আরো কোড প্রয়োজন)</p>';
            }
            return;
        }
        
        // ১. ডেটা ফিল্টারিং (ডামি ডেটা ব্যবহার করে)
        const searchLower = searchTerm.toLowerCase();
        let filteredProperties = dummyProperties.filter(property => {
            
            // ক্যাটাগরি ফিল্টার
            const categoryMatch = property.category === category;

            // সার্চ টার্ম ফিল্টার (টাইটেল বা অবস্থান দিয়ে অনুসন্ধান)
            const titleMatch = property.title.toLowerCase().includes(searchLower);
            const locationMatch = `${property.location?.upazila || ''} ${property.location?.district || ''}`.toLowerCase().includes(searchLower);

            return categoryMatch && (titleMatch || locationMatch);
        });
        
        // ২. ডেটা ডিসপ্লে
        displayProperties(filteredProperties);
    }

    const performSearch = () => {
        // সক্রিয় ক্যাটাগরি খুঁজে বের করা
        const activeCategoryButton = document.querySelector('.sub-header .nav-button.active');
        let currentCategory = 'বিক্রয়'; 
        
        if (activeCategoryButton) {
            if (activeCategoryButton.id === 'rentButton') {
                currentCategory = 'ভাড়া';
            } else if (activeCategoryButton.id === 'mapButton') {
                currentCategory = 'ম্যাপ';
            }
        }

        const searchTerm = globalSearchInput ? globalSearchInput.value.trim() : '';
        fetchAndDisplayProperties(currentCategory, searchTerm);
    };


    // ===================================
    // ৩. ইভেন্ট লিসেনার সেটআপ
    // ===================================

    // মোবাইল সাইডবার টগল
    if (menuButton && sidebar && overlay) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // ফিল্টার বাটন ক্লিক হ্যান্ডেলিং
    if (navButtons.length > 0) {
        navButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                // অ্যাকটিভ ক্লাস পরিবর্তন
                navButtons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');

                // ফিল্টার করে ডেটা লোড
                performSearch(); 
            });
        });
    }
    
    // সার্চ বাটন/ইনপুট হ্যান্ডেলিং
    if (searchIconButton) {
        searchIconButton.addEventListener('click', performSearch);
    }
    if (globalSearchInput) {
        // এন্টার চাপলেও সার্চ হবে
        globalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                performSearch();
            }
        });
    }
    
    // পেজ লোড হওয়ার পর ডিফল্ট ক্যাটাগরি লোড করা
    fetchAndDisplayProperties('বিক্রয়', ''); 
});
