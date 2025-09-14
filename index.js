// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const loginLink = document.getElementById('login-link');
const postLink = document.getElementById('post-link');

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
                timestamp: new Date().getTime() - 1000,
            },
            {
                id: 'dummy3',
                category: 'বিক্রয়',
                type: 'জমি',
                title: 'খুলনায় বাণিজ্যিক প্লট',
                images: ['https://via.placeholder.com/300x200?text=Land+for+Sale'],
                price: '৫০ লক্ষ টাকা/শতক',
                location: {
                    upazila: 'সোনাডাঙ্গা',
                    district: 'খুলনা',
                },
                timestamp: new Date().getTime() - 2000,
            },
            {
                id: 'dummy4',
                category: 'ভাড়া',
                type: 'দোকান',
                title: 'ধানমন্ডিতে ভালো লোকেশনের দোকান',
                images: ['https://via.placeholder.com/300x200?text=Shop+for+Rent'],
                rentAmount: '৳১২,০০০/মাস',
                location: {
                    upazila: 'ধানমন্ডি',
                    district: 'ঢাকা',
                },
                timestamp: new Date().getTime() - 3000,
            }
        ];
        // --- ডামি ডেটা শেষ ---

        propertyGrid.innerHTML = '';

        if (dummyProperties.length === 0) {
            propertyGrid.innerHTML = '<p>কোনো প্রপার্টি পাওয়া যায়নি।</p>';
            return;
        }

        dummyProperties.forEach(property => {
            const card = document.createElement('div');
            card.classList.add('property-card');

            const imageUrl = property.images && property.images.length > 0
                ? property.images[0]
                : 'https://via.placeholder.com/300x200?text=No+Image';

            card.innerHTML = `
                <img src="${imageUrl}" alt="${property.title}">
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
        if (postLink) postLink.style.display = 'inline-block';
        if (loginLink) {
            loginLink.textContent = 'লগআউট';
            loginLink.href = '#';
            loginLink.addEventListener('click', async (e) => {
                e.preventDefault();
                await auth.signOut();
                alert('সফলভাবে লগআউট করা হয়েছে!');
                window.location.reload();
            });
        }
    } else {
        if (postLink) postLink.style.display = 'none';
        if (loginLink) {
            loginLink.textContent = 'লগইন';
            loginLink.href = 'auth.html';
        }
    }
});

document.addEventListener('DOMContentLoaded', fetchAndDisplayProperties);
