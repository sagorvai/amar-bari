// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const menuToggle = document.getElementById('menu-toggle');
const sideMenu = document.getElementById('side-menu');
const profileLink = document.getElementById('profile-link');
const postLink = document.getElementById('post-link');
const logoutLink = document.getElementById('logout-link');

// Function to fetch and display properties
async function fetchAndDisplayProperties() {
    console.log("Function 'fetchAndDisplayProperties' is running.");
    try {
        const propertyGrid = document.querySelector('.property-grid');
        if (!propertyGrid) {
            console.error("Error: '.property-grid' element not found.");
            return;
        }

        // --- ডামি ডেটা শুরু ---
        const dummyProperties = [
            {
                id: 'dummy1',
                category: 'বিক্রয়',
                type: 'বাড়ি',
                title: 'শান্তিনগরে আধুনিক ডিজাইনের বাড়ি',
                images: ['https://via.placeholder.com/300x200?text=House+for+Sale'],
                price: '১.৫ কোটি টাকা',
                location: {
                    upazila: 'মতিঝিল',
                    district: 'ঢাকা',
                },
                timestamp: new Date().getTime(),
            },
            {
                id: 'dummy2',
                category: 'ভাড়া',
                type: 'ফ্লাট',
                title: 'গুলশানে ২ রুমের ফ্লাট ভাড়া',
                images: ['https://via.placeholder.com/300x200?text=Flat+for+Rent'],
                rentAmount: '৳২৫,০০০/মাস',
                location: {
                    upazila: 'গুলশান',
                    district: 'ঢাকা',
                },
                timestamp: new Date().getTime() - 86400000,
            }
        ];
        // --- ডামি ডেটা শেষ ---

        // Display dummy data
        propertyGrid.innerHTML = '';
        dummyProperties.forEach(property => {
            const card = document.createElement('div');
            card.className = 'property-card';
            card.innerHTML = `
                <img src="${property.images[0]}" alt="${property.title}">
                <div class="property-card-content">
                    <h4>${property.title}</h4>
                    <p class="location">${property.location?.upazila || ''}, ${property.location?.district || ''}</p>
                    <p class="price">${property.price || property.rentAmount || ''}</p>
                </div>
            `;
            propertyGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching properties:", error);
        const propertyGrid = document.querySelector('.property-grid');
        if (propertyGrid) {
            propertyGrid.innerHTML = '<p>প্রপার্টি লোড করতে সমস্যা হয়েছে।</p>';
        }
    }
}

// Handle user authentication state changes
auth.onAuthStateChanged(user => {
    if (user) {
        // User is logged in
        if (profileLink) {
            profileLink.href = '#';
            profileLink.innerHTML = `<i class="fas fa-user-circle"></i> প্রোফাইল`;
        }
        if (logoutLink) logoutLink.style.display = 'block';
    } else {
        // User is logged out
        if (profileLink) {
            profileLink.href = 'auth.html';
            profileLink.innerHTML = `<i class="fas fa-user-circle"></i> লগইন`;
        }
        if (logoutLink) logoutLink.style.display = 'none';
    }
});

// Menu toggle
if (menuToggle && sideMenu) {
    menuToggle.addEventListener('click', () => {
        sideMenu.classList.toggle('open');
    });
}

document.addEventListener('DOMContentLoaded', fetchAndDisplayProperties);
