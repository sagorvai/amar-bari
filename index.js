// Initialize Firebase
const firestore = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const propertiesList = document.getElementById('properties-list');
    const postLink = document.getElementById('post-link');
    const loginLink = document.getElementById('login-link');

    // Handle UI changes on auth state change
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
                    window.location.href = 'index.html';
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

    // Fetch and display properties from Firestore
    function fetchProperties() {
        if (!propertiesList) return;

        firestore.collection('properties')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                let properties = [];
                snapshot.forEach(doc => {
                    properties.push({ id: doc.id, ...doc.data() });
                });
                
                // Clear the list before adding new properties
                propertiesList.innerHTML = '';
                
                if (properties.length === 0) {
                    propertiesList.innerHTML = '<p>কোনো প্রপার্টি পাওয়া যায়নি।</p>';
                } else {
                    properties.forEach(property => {
                        const propertyCard = document.createElement('div');
                        propertyCard.className = 'property-card';
                        propertyCard.innerHTML = `
                            <img src="${property.imageUrls[0]}" alt="${property.category}">
                            <h3>${property.category === 'বিক্রয়' ? 'বিক্রয়' : 'ভাড়া'} - ${property['house-location'] || property['land-location']}</h3>
                            <p>মূল্য: ${property.price || property['rent-amount']}</p>
                            <p>যোগাযোগ: ${property.contactNumber}</p>
                            ${property.googleMapLink ? `<p><a href="${property.googleMapLink}" target="_blank">Google Map এ দেখুন</a></p>` : ''}
                        `;
                        propertiesList.appendChild(propertyCard);
                    });
                }
            });
    }

    fetchProperties();
});
