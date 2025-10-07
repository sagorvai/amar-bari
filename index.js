// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const postLink = document.getElementById('post-link'); // সাইডবার প্রপার্টি লিঙ্ক
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const profileButton = document.getElementById('profileButton'); // ✅ এখানে লিঙ্কটি নেওয়া হয়েছে
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
        title: 'শান্তিনগরে আধুনিক ডিজাইনের ব...',
        description: '৪ বেড, ৩ বাথ, ১ রান্নাঘর, ২ বারান্দা, ১৫০০ বর্গফুট।',
        price: '৳ ৮৫,০০,০০০',
        location: 'ঢাকা',
        imageUrl: 'images/prop-placeholder.jpg',
        status: 'প্রকাশিত'
    },
    {
        id: 'dummy2',
        category: 'ভাড়া',
        type: 'ফ্লাট',
        title: 'ধানমন্ডিতে ২ বেডরুমের ফ্লাট ভাড়া',
        description: '৩য় তলায়, এলিভেটর সুবিধা, ১০৫০ বর্গফুট।',
        price: '৳ ১৫,০০০/মাস',
        location: 'ঢাকা',
        imageUrl: 'images/prop-placeholder.jpg',
        status: 'প্রকাশিত'
    }
];
// --- ডামি ডেটা শেষ ---


// প্রপার্টি গ্রিডে রেন্ডার করার জন্য ফাংশন
function renderProperty(prop) {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.setAttribute('data-id', prop.id);
    card.innerHTML = `
        <img src="${prop.imageUrl}" alt="${prop.title}">
        <div class="card-content">
            <h4>${prop.title}</h4>
            <p class="card-price">${prop.price}</p>
            <p class="card-location"><i class="material-icons">location_on</i> ${prop.location}</p>
            <p class="card-description">${prop.description.substring(0, 50)}...</p>
            <button class="details-button">বিস্তারিত দেখুন</button>
        </div>
    `;
    return card;
}


// Firebase থেকে প্রপার্টি লোড করার ফাংশন
async function fetchAndDisplayProperties(category, searchTerm) {
    propertyGrid.innerHTML = '<h2><i class="material-icons rotating-icon">sync</i> প্রপার্টি লোড হচ্ছে...</h2>';
    
    try {
        let query = db.collection('properties').where('category', '==', category);
        
        const snapshot = await query.get();
        const properties = [];
        
        snapshot.forEach(doc => {
            properties.push({ id: doc.id, ...doc.data() });
        });

        // যদি কোনো প্রপার্টি না থাকে, তবে ডামি ডেটা ব্যবহার করা
        let finalProperties = properties.length > 0 ? properties : dummyProperties.filter(p => p.category === category);

        // সার্চ টার্ম দিয়ে ফিল্টার করা (কেস-সেন্সিটিভ)
        if (searchTerm) {
            finalProperties = finalProperties.filter(prop => 
                prop.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                prop.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                prop.description.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        propertyGrid.innerHTML = '';
        if (finalProperties.length === 0) {
            propertyGrid.innerHTML = '<p class="empty-message">এই ক্যাটাগরি বা সার্চের জন্য কোনো প্রপার্টি পাওয়া যায়নি।</p>';
            return;
        }

        finalProperties.forEach(prop => {
            propertyGrid.appendChild(renderProperty(prop));
        });

    } catch (error) {
        console.error("প্রপার্টি লোড করতে ব্যর্থ:", error);
        // ব্যর্থ হলে ডামি ডেটা দিয়ে পূরণ করা
        let finalProperties = dummyProperties.filter(p => p.category === category);
        propertyGrid.innerHTML = '';
        finalProperties.forEach(prop => {
            propertyGrid.appendChild(renderProperty(prop));
        });
        propertyGrid.insertAdjacentHTML('afterbegin', '<p style="color: red; text-align: center;">ডাটাবেস লোড করতে ব্যর্থ হয়েছি। ডামি ডেটা দেখানো হচ্ছে।</p>');
    }
}


// ইভেন্ট লিসেনার সেটআপ করা
function setupUIEventListeners() {
    
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

    // ফিল্টার বাটনগুলির জন্য লিসেনার
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.getAttribute('data-category');
            
            // সব বাটন থেকে active ক্লাস সরানো
            navButtons.forEach(btn => btn.classList.remove('active'));
            // ক্লিক করা বাটনে active ক্লাস যোগ করা
            button.classList.add('active'); 

            fetchAndDisplayProperties(category, globalSearchInput.value);
        });
    });

    // গ্লোবাল সার্চ ইনপুটের জন্য লিসেনার
    if (globalSearchInput) {
        globalSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const activeCategoryButton = document.querySelector('.nav-filters .nav-button.active');
                const activeCategory = activeCategoryButton ? activeCategoryButton.getAttribute('data-category') : 'বিক্রয়';
                fetchAndDisplayProperties(activeCategory, globalSearchInput.value);
            }
        });
    }

    // নতুন সেকশন দেখানোর লিসেনার (হোমপেজে শুধুমাত্র)
    if (homeLinkSidebar && propertyGridContainer) {
        const sections = [propertyGridContainer, aboutSection, tipsSection, contactSection];
        
        const showSection = (targetId) => {
            sections.forEach(section => {
                if (section) {
                    section.style.display = section.id === targetId ? 'block' : 'none';
                }
            });
            // সাইডবার বন্ধ করা
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        };

        // সাইডবার লিঙ্ক লিসেনার
        const sidebarLinks = [homeLinkSidebar, tipsLinkSidebar, aboutLinkSidebar, contactLinkSidebar];
        sidebarLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                let targetId = 'property-grid-container';
                if (link.id === 'tips-link-sidebar') {
                    targetId = 'tips-section';
                } else if (link.id === 'about-link-sidebar') {
                    targetId = 'about-section';
                } else if (link.id === 'contact-link-sidebar') {
                    targetId = 'contact-section';
                }
                showSection(targetId);
            });
        });

        // ডিফল্টভাবে শুধুমাত্র হোম সেকশন দেখানো
        showSection('property-grid-container');
    }

    // ✅ প্রোফাইল বাটন ক্লিক হ্যান্ডলার যোগ করা হলো
    if (profileButton) {
        profileButton.addEventListener('click', (e) => {
            const user = auth.currentUser;
            if (!user) {
                // যদি ব্যবহারকারী কোনোভাবে লগইন না করে প্রোফাইল বাটনে ক্লিক করেন
                e.preventDefault(); 
                alert('অনুগ্রহ করে আগে লগইন করুন।');
                window.location.href = 'auth.html';
            }
            // যদি লগইন করা থাকে, তবে ডিফল্ট নেভিগেশন (href="profile.html") কাজ করবে
        });
    }
}


// লগআউট হ্যান্ডেলার
const handleLogout = async (e) => {
    e.preventDefault();
    try {
        await auth.signOut();
        alert('সফলভাবে লগআউট করা হয়েছে!');
        // লগআউটের পর রিফ্রেশ
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
            
            // ✅ প্রোফাইল বাটনকে দৃশ্যমান করা
            if (profileButton) profileButton.style.display = 'inline-block'; 

            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                // লগআউট লিসেনার সেট করা
                // নিশ্চিত করা হলো যে একাধিক লিসেনার যুক্ত হচ্ছে না
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            // লগইন না থাকলে
            if (postLink) postLink.style.display = 'none';
            
            // ✅ প্রোফাইল বাটনকে লুকানো
            if (profileButton) profileButton.style.display = 'none'; 

            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });
});
