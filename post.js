// Initialize Firebase
const firestore = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const postForm = document.getElementById('post-form');
    const categorySelect = document.getElementById('category-select');
    const specificFieldsContainer = document.getElementById('specific-fields');
    const imageUploadInput = document.getElementById('image-upload');
    const postLink = document.getElementById('post-link');

    // Handle UI changes on auth state change for post page
    auth.onAuthStateChanged(user => {
        if (!user) {
            // If user is not logged in, hide post link and redirect to login page
            if (postLink) postLink.style.display = 'none';
            alert('পোস্ট করার জন্য আপনাকে অবশ্যই লগইন করতে হবে।');
            window.location.href = 'auth.html';
        }
    });

    // Generate specific form fields based on category selection
    function generateSpecificFields(category) {
        specificFieldsContainer.innerHTML = '';
        let htmlContent = '';
        
        // Define fields based on category
        const fields = {
            'ভাড়া': [
                { id: 'house-location', label: 'বাসার ঠিকানা:', type: 'text' },
                { id: 'rent-amount', label: 'ভাড়ার পরিমাণ:', type: 'number' },
                { id: 'flat-size', label: 'ফ্ল্যাটের আকার:', type: 'text' },
                { id: 'bedrooms', label: 'বেডরুম:', type: 'number' },
                { id: 'bathrooms', label: 'বাথরুম:', type: 'number' },
                { id: 'balcony', label: 'বারান্দা:', type: 'number' }
            ],
            'বিক্রয়': [
                { id: 'land-location', label: 'জমির ঠিকানা:', type: 'text' },
                { id: 'land-size', label: 'জমির আকার (শতক/কাঠা):', type: 'text' },
                { id: 'price', label: 'বিক্রয় মূল্য:', type: 'number' },
                { id: 'land-type', label: 'জমির ধরণ:', type: 'text' }
            ]
        };

        if (fields[category]) {
            fields[category].forEach(field => {
                htmlContent += `
                    <div class="input-group">
                        <label for="${field.id}">${field.label}</label>
                        <input type="${field.type}" id="${field.id}" required>
                    </div>
                `;
            });
        }
        
        specificFieldsContainer.innerHTML = htmlContent;
    }

    // Event listener for category selection
    if (categorySelect) {
        categorySelect.addEventListener('change', (e) => {
            const selectedCategory = e.target.value;
            generateSpecificFields(selectedCategory);
        });
    }
    
    // Handle form submission
    if (postForm) {
        postForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const user = auth.currentUser;
            if (!user) {
                alert('অনুগ্রহ করে প্রপার্টি যোগ করার জন্য লগইন করুন।');
                return;
            }

            const category = categorySelect.value;
            const contactNumber = document.getElementById('contact-number').value;
            const googleMapLink = document.getElementById('google-map-link').value;
            const images = imageUploadInput.files;

            if (images.length === 0) {
                alert('অনুগ্রহ করে কমপক্ষে একটি ছবি আপলোড করুন।');
                return;
            }

            try {
                // Upload images to Firebase Storage
                const imageUrls = await Promise.all(Array.from(images).map(async (file) => {
                    const storageRef = storage.ref(`properties/${user.uid}/${Date.now()}_${file.name}`);
                    await storageRef.put(file);
                    return await storageRef.getDownloadURL();
                }));

                // Collect specific fields data
                const specificData = {};
                const fields = {
                    'ভাড়া': ['house-location', 'rent-amount', 'flat-size', 'bedrooms', 'bathrooms', 'balcony'],
                    'বিক্রয়': ['land-location', 'land-size', 'price', 'land-type']
                };

                if (fields[category]) {
                    fields[category].forEach(id => {
                        const inputElement = document.getElementById(id);
                        if (inputElement) {
                            specificData[id] = inputElement.value;
                        }
                    });
                }
                
                // Add property to Firestore
                await firestore.collection('properties').add({
                    category,
                    contactNumber,
                    googleMapLink,
                    imageUrls,
                    ...specificData,
                    userId: user.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });

                alert('প্রপার্টি সফলভাবে যোগ করা হয়েছে!');
                postForm.reset();
                generateSpecificFields(''); // Reset form fields
            } catch (error) {
                console.error("Error adding property: ", error);
                alert("প্রপার্টি যোগ করতে ব্যর্থ হয়েছে। ত্রুটি: " + error.message);
            }
        });
    }

    // Initial call to set up the form fields
    if (categorySelect) {
        generateSpecificFields(categorySelect.value);
    }
});
