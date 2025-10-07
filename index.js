// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const postLink = document.getElementById('post-link'); // সাইডবার প্রপার্টি লিঙ্ক
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const profileButton = document.getElementById('profileButton'); // ✅ নিশ্চিত করা হয়েছে
const navButtons = document.querySelectorAll('.nav-filters .nav-button');
const globalSearchInput = document.getElementById('globalSearchInput');
const propertyGrid = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar'); // সাইডবার লগইন লিঙ্ক

// নতুন যুক্ত সেকশনের উপাদান
const homeLinkSidebar = document.getElementById('home-link-sidebar');
const tipsLinkSidebar = document.getElementById('tips-link-sidebar');
const aboutLinkSidebar = document.getElementById('about-link-sidebar');
const contactLinkSidebar = document.getElementById('contact-link-sidebar');

const propertyGridContainer = document.getElementById('property-grid-container');
const aboutSection = document.getElementById('about-section');
const tipsSection = document.getElementById('tips-section');
const contactSection = document.getElementById('contact-section');


// --- ডামি ডেটা (কার্যকারিতা পরীক্ষার জন্য) ---
const dummyProperties = [
    {
        id: 'dummy1',
        category: 'বিক্রয়',
        type: 'বাড়ি',
        title: 'শান্তিনগরে আধুনিক ডিজাইনের বাড়ি',
        area: 'শান্তিনগর',
        district: 'ঢাকা',
        price: 35000000,
        imageUrls: ['https://via.placeholder.com/300x200?text=House+1']
    },
    {
        id: 'dummy2',
        category: 'ভাড়া',
        type: 'ফ্লাট',
        title: 'ধানমন্ডিতে ২ বেডরুমের ফ্লাট',
        area: 'ধানমন্ডি',
        district: 'ঢাকা',
        price: 25000,
        imageUrls: ['https://via.placeholder.com/300x200?text=Flat+A']
    },
    {
        id: 'dummy3',
        category: 'বিক্রয়',
        type: 'জমি',
        title: 'ফেনী হাইওয়ে সংলগ্ন জমি',
        area: 'ফেনী সদর',
        district: 'ফেনী',
        price: 12000000,
        imageUrls: ['https://via.placeholder.com/300x200?text=Land']
    },
    // আরও ডামি ডেটা যোগ করা যেতে পারে
];


// --- ফাংশন: প্রপার্টি কার্ড তৈরি করা ---
function createPropertyCard(property) {
    const card = document.createElement('div');
    card.classList.add('property-card');
    
    // মূল্যকে ফরম্যাট করা
    const formattedPrice = new Intl.NumberFormat('bn-BD', { 
        style: 'currency', 
        currency: 'BDT', 
        minimumFractionDigits: 0 
    }).format(property.price);

    card.innerHTML = `
        <img src="${property.imageUrls[0]}" alt="${property.title}" class="property-image">
        <div class="property-info">
            <span class="property-category">${property.category} - ${property.type}</span>
            <h4 class="property-title">${property.title}</h4>
            <p class="property-location"><i class="material-icons">location_on</i> ${property.area}, ${property.district}</p>
            <p class="property-price">${formattedPrice}</p>
            <a href="#" class="details-link">বিস্তারিত দেখুন</a>
        </div>
    `;
    return card;
}

// --- ফাংশন: প্রপার্টি লোড ও ডিসপ্লে করা ---
function fetchAndDisplayProperties(category, searchTerm) {
    // এই ফাংশনে ফায়ারস্টোর থেকে ডেটা আনার লজিক থাকবে, কিন্তু বর্তমানে ডামি ডেটা ব্যবহার করা হচ্ছে।

    let filteredProperties = dummyProperties.filter(p => p.category === category);
    
    // সার্চ টার্ম থাকলে ফিল্টার করা
    if (searchTerm) {
        const lowerCaseSearch = searchTerm.toLowerCase();
        filteredProperties = filteredProperties.filter(p =>
            p.title.toLowerCase().includes(lowerCaseSearch) ||
            p.area.toLowerCase().includes(lowerCaseSearch) ||
            p.district.toLowerCase().includes(lowerCaseSearch)
        );
    }
    
    propertyGrid.innerHTML = ''; // গ্রিড খালি করা
    
    if (filteredProperties.length === 0) {
        propertyGrid.innerHTML = '<p style="text-align: center; color: #7f8c8d; padding: 20px;">এই ক্যাটাগরিতে কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।</p>';
        return;
    }

    filteredProperties.forEach(property => {
        const card = createPropertyCard(property);
        propertyGrid.appendChild(card);
    });
}


// --- ফাংশন: UI ইভেন্ট লিসেনার সেটআপ করা ---
function setupUIEventListeners() {
    
    // সাইড মেনু খোলার/বন্ধ করার কার্যকারিতা
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

    // ফিল্টার বাটন লিসেনার
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.textContent.trim();
            
            // নতুন ক্যাটাগরি ফিল্টার করা
            fetchAndDisplayProperties(category, globalSearchInput.value);
        });
    });
    
    // গ্লোবাল সার্চ ইনপুট লিসেনার (Enter টিপলে বা ডিবাউন্সড ইনপুট)
    globalSearchInput?.addEventListener('keyup', (e) => {
        // বর্তমানে active ক্যাটাগরি খুঁজে নেওয়া
        const activeCategory = document.querySelector('.nav-filters .nav-button.active')?.textContent.trim() || 'বিক্রয়';
        
        // Enter চাপলে বা ৩ অক্ষরের বেশি টাইপ করলে সার্চ করা 
        if (e.key === 'Enter' || e.target.value.length > 2) {
            fetchAndDisplayProperties(activeCategory, e.target.value);
        } else if (e.target.value.length === 0) {
             // সার্চ খালি করলে আবার সব প্রপার্টি লোড করা
             fetchAndDisplayProperties(activeCategory, '');
        }
    });


    // সাইডবার লিঙ্ক লিসেনার (সেকশন দেখানোর জন্য)
    const toggleSection = (sectionElement, currentLink) => {
        // সব সেকশন লুকানো
        propertyGridContainer.style.display = 'none';
        aboutSection.style.display = 'none';
        tipsSection.style.display = 'none';
        contactSection.style.display = 'none';

        // বর্তমান সেকশন দেখানো
        sectionElement.style.display = 'block';

        // সাইডবার লুকানো
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
        
        // হোম লিঙ্কে ক্লিক হলে প্রপার্টি গ্রিড দেখানো
        if (currentLink === homeLinkSidebar) {
            propertyGridContainer.style.display = 'block';
            sectionElement.style.display = 'none'; // এটিকে শুধু 'home-section' হিসেবে ধরলে
        }
    };
    
    homeLinkSidebar?.addEventListener('click', (e) => {
        e.preventDefault();
        // সব লুকানো
        aboutSection.style.display = 'none';
        tipsSection.style.display = 'none';
        contactSection.style.display = 'none';
        // শুধু প্রপার্টি গ্রিড দেখানো
        propertyGridContainer.style.display = 'block';
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    aboutLinkSidebar?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSection(aboutSection, aboutLinkSidebar);
    });

    tipsLinkSidebar?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSection(tipsSection, tipsLinkSidebar);
    });

    contactLinkSidebar?.addEventListener('click', (e) => {
        e.preventDefault();
        toggleSection(contactSection, contactLinkSidebar);
    });
}


// --- ফাংশন: লগআউট হ্যান্ডেলার ---
const handleLogout = async () => {
    try {
        await auth.signOut();
        alert("সফলভাবে লগআউট করা হয়েছে! আপনাকে হোমপেজে নিয়ে যাওয়া হচ্ছে।");
        window.location.reload();
    } catch (error) {
        console.error("লগআউট ব্যর্থ হয়েছে:", error);
        alert("লগআউট ব্যর্থ হয়েছে।");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // সকল ইভেন্ট লিসেনার সেটআপ করা হলো
    setupUIEventListeners();
    
    // প্রাথমিক লোড: শুরুতে 'বিক্রয়' ক্যাটাগরি দেখাবে
    fetchAndDisplayProperties('বিক্রয়', '');
    document.getElementById('sellButton')?.classList.add('active'); 


    // Auth State Change Handler
    auth.onAuthStateChanged(user => {
        
        if (user) {
            // লগইন থাকলে
            if (postLink) postLink.style.display = 'flex'; 
            
            // ✅ সংশোধন: প্রোফাইল বাটন ডিসপ্লে স্টাইল ঠিক করা হয়েছে
            if (profileButton) profileButton.style.display = 'flex'; 
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                // লগআউট লিসেনার সেট করা
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            // লগইন না থাকলে
            if (postLink) postLink.style.display = 'none';
            
            // প্রোফাইল বাটন লুকানো
            if (profileButton) profileButton.style.display = 'none'; 
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });
});
