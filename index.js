// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const postLink = document.getElementById('post-link'); // সাইডবার প্রপার্টি লিঙ্ক
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const profileButton = document.getElementById('profileButton');
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

// ----------------------------------------------------
// ✅ নতুন সংযোজন: প্রোফাইল বাটন ক্লিক হ্যান্ডেলার
// ----------------------------------------------------
if (profileButton) {
    profileButton.addEventListener('click', () => {
        // ক্লিক করলে প্রোফাইল পেজে নিয়ে যাবে
        window.location.href = 'profile.html';
    });
}
// ----------------------------------------------------


// --- ডামি ডেটা (কার্যকারিতা পরীক্ষার জন্য) ---
const dummyProperties = [
    {
        id: 'dummy1',
        category: 'বিক্রয়',
        type: 'বাড়ি',
        title: 'শান্তিনগরে আধুনিক ডিজাইনের বাড়ি',
        location: 'ঢাকা, শান্তিনগর',
        price: '৳ 2,50,00,000',
        size: '2500 বর্গফুট',
        rooms: 5,
        baths: 4,
        images: ['https://via.placeholder.com/400x300?text=বাড়ি+১'],
        isDummy: true
    },
    {
        id: 'dummy2',
        category: 'ভাড়া',
        type: 'ফ্লাট',
        title: 'গুলশানে 3 বেডরুমের ফ্লাট',
        location: 'ঢাকা, গুলশান-২',
        price: '৳ 65,000/মাস',
        size: '1800 বর্গফুট',
        rooms: 3,
        baths: 3,
        images: ['https://via.placeholder.com/400x300?text=ফ্লাট+২'],
        isDummy: true
    },
    // ... আপনার বাকি ডামি ডেটা
];


// --- ফাংশন ৩.১: প্রপার্টি লোড ও ডিসপ্লে করা ---
const fetchAndDisplayProperties = async (category, searchTerm = '') => {
    // লোডিং স্পিনার বা অন্য কোনো বার্তা দেখান
    propertyGrid.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';

    let properties = [];

    // যদি Firestore ব্যবহার করেন, তাহলে এখান থেকে রিয়েল ডাটা লোড হবে
    try {
        let query = db.collection('properties').where('category', '==', category);
        
        // সার্চ টার্ম থাকলে টাইটেল, ঠিকানা ইত্যাদির উপর ফিল্টার করা উচিত (ক্লায়েন্ট সাইড বা সার্ভার সাইড)
        // ক্লায়েন্ট সাইড ফিল্টারিংয়ের জন্য, প্রথমে সব ডাটা লোড করে তারপর ফিল্টার করা ভালো
        const snapshot = await query.get();
        properties = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error("Firestore থেকে ডাটা লোড ব্যর্থ:", error);
        // ব্যর্থ হলে ডামি ডেটা দেখান
        properties = dummyProperties.filter(p => p.category === category);
    }
    
    // সার্চ টার্মের উপর ক্লায়েন্ট-সাইড ফিল্টারিং
    if (searchTerm) {
        const lowerSearchTerm = searchTerm.toLowerCase();
        properties = properties.filter(p => 
            p.title.toLowerCase().includes(lowerSearchTerm) ||
            p.location.toLowerCase().includes(lowerSearchTerm)
        );
    }

    // প্রপার্টি ডিসপ্লে করা
    propertyGrid.innerHTML = ''; // পুরোনো লোডিং মেসেজ মুছে ফেলুন
    if (properties.length === 0) {
        propertyGrid.innerHTML = '<p class="no-results-message">এই ক্যাটাগরিতে কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।</p>';
    } else {
        properties.forEach(property => {
            const card = document.createElement('a');
            card.href = 'property-details.html?id=' + property.id; // ডিটেইলস পেজের লিঙ্ক
            card.classList.add('property-card');
            
            card.innerHTML = `
                <div class="property-image" style="background-image: url('${property.images[0] || 'https://via.placeholder.com/400x300?text=ছবি+নেই'}');"></div>
                <div class="property-info">
                    <div class="category-tag ${property.category === 'বিক্রয়' ? 'sell' : 'rent'}">${property.category}</div>
                    <h3>${property.title}</h3>
                    <p class="price">${property.price}</p>
                    <p class="location"><i class="material-icons">location_on</i> ${property.location}</p>
                    <div class="details">
                        <span><i class="material-icons">king_bed</i> ${property.rooms} বেড</span>
                        <span><i class="material-icons">bathtub</i> ${property.baths} বাথ</span>
                        <span><i class="material-icons">square_foot</i> ${property.size}</span>
                    </div>
                </div>
            `;
            propertyGrid.appendChild(card);
        });
    }
};


// --- ফাংশন ৪.১: UI ইভেন্ট লিসেনার সেটআপ করা ---
const setupUIEventListeners = () => {
    
    // ক্যাটাগরি ফিল্টার বাটন লিসেনার
    navButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            const category = e.currentTarget.getAttribute('data-category');
            const currentSearchTerm = globalSearchInput.value;
            fetchAndDisplayProperties(category, currentSearchTerm);
        });
    });

    // গ্লোবাল সার্চ ইনপুট লিসেনার (Enter বাটন প্রেস)
    globalSearchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const category = document.querySelector('.nav-filters .nav-button.active')?.getAttribute('data-category') || 'বিক্রয়';
            fetchAndDisplayProperties(category, globalSearchInput.value);
        }
    });

    // সাইড মেনু খোলার/বন্ধ করার কার্যকারিতা
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    // ওভারলেতে ক্লিক করলে সাইড মেনু বন্ধ হবে
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
    
    // সাইডবার লিঙ্ক ক্লিক হ্যান্ডেলার (অন্যান্য সেকশন দেখানোর জন্য)
    const handleSidebarLink = (linkEl, targetSection) => {
        if (linkEl) {
            linkEl.addEventListener('click', (e) => {
                e.preventDefault();
                // সব সেকশন লুকান
                propertyGridContainer.style.display = 'none';
                aboutSection.style.display = 'none';
                tipsSection.style.display = 'none';
                contactSection.style.display = 'none';

                // টার্গেট সেকশন দেখান
                if(targetSection) targetSection.style.display = 'block';

                // সাইডবার বন্ধ করুন
                sidebar.classList.remove('active');
                overlay.classList.remove('active');
            });
        }
    };

    handleSidebarLink(homeLinkSidebar, propertyGridContainer);
    handleSidebarLink(tipsLinkSidebar, tipsSection);
    handleSidebarLink(aboutLinkSidebar, aboutSection);
    handleSidebarLink(contactLinkSidebar, contactSection);
};


// --- ফাংশন ৫.১: লগআউট হ্যান্ডেলার ---
const handleLogout = async () => {
    try {
        await auth.signOut();
        alert('সফলভাবে লগআউট করা হয়েছে!');
        // লগআউট এর পর পেজ রিলোড
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
            if (profileButton) profileButton.style.display = 'inline-block';
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
            if (profileButton) profileButton.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });
});
