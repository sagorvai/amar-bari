// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const loginLink = document.getElementById('login-link');
const postLink = document.getElementById('post-link');
const navLinks = document.querySelector('.nav-links'); // Assuming you have this class

// Function to fetch and display properties
async function fetchAndDisplayProperties() {
    try {
        const propertyGrid = document.querySelector('.property-grid');
        
        const propertiesSnapshot = await db.collection("properties").orderBy("timestamp", "desc").get();
        
        propertyGrid.innerHTML = ''; 

        if (propertiesSnapshot.empty) {
            propertyGrid.innerHTML = '<p>কোনো প্রপার্টি পাওয়া যায়নি।</p>';
            return;
        }

        propertiesSnapshot.forEach(doc => {
            const property = doc.data();
            const card = document.createElement('div');
            card.classList.add('property-card');
            
            const imageUrl = property.images && property.images.length > 0 
                             ? property.images[0] 
                             : 'https://via.placeholder.com/300x200?text=No+Image';

            card.innerHTML = `
                <img src="${imageUrl}" alt="${property.title}">
                <div class="property-card-content">
                    <h4>${property.title}</h4>
                    <p class="location">${property.upazila}, ${property.district}</p>
                    <p class="price">${property.price}</p>
                </div>
            `;
            propertyGrid.appendChild(card);
        });

    } catch (error) {
        console.error("Error fetching properties:", error);
        propertyGrid.innerHTML = '<p>প্রপার্টি লোড করতে সমস্যা হয়েছে।</p>';
    }
}

// Handle user authentication state changes
auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
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
        // User is signed out
        if (postLink) postLink.style.display = 'none';
        if (loginLink) {
            loginLink.textContent = 'লগইন';
            loginLink.href = 'auth.html';
        }
    }
});


document.addEventListener('DOMContentLoaded', fetchAndDisplayProperties);
