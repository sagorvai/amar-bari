// Firebase SDKs
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', function() {
    // Function to fetch and display properties
    async function fetchAndDisplayProperties() {
        try {
            const propertyGrid = document.querySelector('.property-grid');
            if (!propertyGrid) return;
            
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

    fetchAndDisplayProperties();
});