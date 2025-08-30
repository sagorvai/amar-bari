// Firebase SDKs
const db = firebase.firestore();

// Function to fetch and display properties
async function fetchAndDisplayProperties() {
    try {
        const propertyGrid = document.querySelector('.property-grid');
        
        // Fetch data from Firestore's 'properties' collection, ordered by timestamp
        const propertiesSnapshot = await db.collection("properties").orderBy("timestamp", "desc").get();
        
        // Clear previous content
        propertyGrid.innerHTML = ''; 

        // Check if no documents were found
        if (propertiesSnapshot.empty) {
            propertyGrid.innerHTML = '<p>কোনো প্রপার্টি পাওয়া যায়নি।</p>';
            return;
        }

        // Loop through each document and create a property card
        propertiesSnapshot.forEach(doc => {
            const property = doc.data();
            const card = document.createElement('div');
            card.classList.add('property-card');
            
            // Handle image URL (if images array exists and is not empty)
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

document.addEventListener('DOMContentLoaded', fetchAndDisplayProperties);
