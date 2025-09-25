// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');

    // Function to generate and display the main property type dropdown based on category
    function generateTypeDropdown(category) {
        let typeSelectHTML = '';
        let options = [];

        if (category === 'বিক্রয়') {
            options = ['জমি', 'বাড়ি', 'ফ্লাট', 'দোকান'];
        } else if (category === 'ভাড়া') {
            options = ['বাড়ি', 'ফ্লাট', 'দোকান'];
        }

        typeSelectHTML = `
            <div class="input-group">
                <label for="post-type">প্রপার্টির ধরন:</label>
                <select id="post-type" required>
                    <option value="">-- নির্বাচন করুন --</option>
                    ${options.map(option => `<option value="${option}">${option}</option>`).join('')}
                </select>
            </div>
            <div id="specific-fields-container"></div>
        `;
        dynamicFieldsContainer.innerHTML = typeSelectHTML;

        const postTypeSelect = document.getElementById('post-type');
        if (postTypeSelect) {
            postTypeSelect.addEventListener('change', function() {
                generateSpecificFields(this.value);
            });
        }
    }

    // Function to generate specific fields based on property type
    function generateSpecificFields(type) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        let specificFieldsHTML = '';
        
        switch(type) {
            case 'জমি':
                specificFieldsHTML = `
                    <div class="input-group">
                        <label for="land-area">জমির পরিমাণ (ডেসিমেল বা কাঠা):</label>
                        <input type="text" id="land-area" required>
                    </div>
                    <div class="input-group">
                        <label for="price">মূল্য:</label>
                        <input type="text" id="price" required>
                    </div>
                    <div class="input-group">
                        <label for="images">ছবি আপলোড করুন:</label>
                        <input type="file" id="images" multiple required>
                    </div>
                `;
                break;
            case 'বাড়ি':
            case 'ফ্লাট':
                specificFieldsHTML = `
                    <div class="input-inline">
                        <div>
                            <label for="beds">বেডরুম:</label>
                            <input type="number" id="beds" required>
                        </div>
                        <div>
                            <label for="baths">বাথরুম:</label>
                            <input type="number" id="baths" required>
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="sqft">স্কয়ার ফিট:</label>
                        <input type="number" id="sqft" required>
                    </div>
                    <div class="input-group">
                        <label for="price">${postCategorySelect.value === 'ভাড়া' ? 'ভাড়ার পরিমাণ (মাসিক):' : 'মূল্য:'}</label>
                        <input type="text" id="price" required>
                    </div>
                    <div class="input-group">
                        <label for="images">ছবি আপলোড করুন:</label>
                        <input type="file" id="images" multiple required>
                    </div>
                `;
                break;
            case 'দোকান':
                specificFieldsHTML = `
                    <div class="input-group">
                        <label for="sqft">স্কয়ার ফিট:</label>
                        <input type="number" id="sqft" required>
                    </div>
                    <div class="input-group">
                        <label for="price">${postCategorySelect.value === 'ভাড়া' ? 'ভাড়ার পরিমাণ (মাসিক):' : 'মূল্য:'}</label>
                        <input type="text" id="price" required>
                    </div>
                    <div class="input-group">
                        <label for="images">ছবি আপলোড করুন:</label>
                        <input type="file" id="images" multiple required>
                    </div>
                `;
                break;
        }
        specificFieldsContainer.innerHTML = specificFieldsHTML;
    }

    if (postCategorySelect) {
        postCategorySelect.addEventListener('change', function() {
            generateTypeDropdown(this.value);
        });
    }

    // Handle form submission
    if (propertyForm) {
        propertyForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const user = auth.currentUser;
            if (!user) {
                alert("এই কার্যক্রমের জন্য আপনাকে অবশ্যই লগইন করতে হবে।");
                window.location.href = 'auth.html';
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'আপলোড হচ্ছে...';
            
            try {
                // Upload images to Firebase Storage
                const images = document.getElementById('images').files;
                const imageUrls = [];
                for (const image of images) {
                    const storageRef = storage.ref(`property_images/${user.uid}/${image.name}`);
                    const uploadTask = storageRef.put(image);
                    await uploadTask;
                    const url = await storageRef.getDownloadURL();
                    imageUrls.push(url);
                }

                // Gather all form data
                const propertyData = {
                    category: postCategorySelect.value,
                    type: document.getElementById('post-type').value,
                    title: 'New Property Post', // You can add a title field to the form
                    images: imageUrls,
                    phoneNumber: document.getElementById('phone-number').value,
                    googleMap: document.getElementById('google-map').value,
                    uid: user.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                };

                // Add dynamic fields
                const type = document.getElementById('post-type')?.value;
                if (type === 'জমি') {
                    propertyData.landArea = document.getElementById('land-area')?.value;
                    propertyData.price = document.getElementById('price')?.value;
                } else if (type === 'বাড়ি' || type === 'ফ্লাট' || type === 'দোকান') {
                    propertyData.beds = document.getElementById('beds')?.value;
                    propertyData.baths = document.getElementById('baths')?.value;
                    propertyData.sqft = document.getElementById('sqft')?.value;
                    if (postCategorySelect.value === 'ভাড়া') {
                        propertyData.rentAmount = document.getElementById('price')?.value;
                    } else {
                        propertyData.price = document.getElementById('price')?.value;
                    }
                }

                await db.collection("properties").add(propertyData);

                alert("প্রপার্টি সফলভাবে আপলোড করা হয়েছে!");
                propertyForm.reset();
                dynamicFieldsContainer.innerHTML = ''; 

            } catch (error) {
                console.error("ডেটা আপলোড করতে সমস্যা হয়েছে: ", error);
                alert("প্রপার্টি আপলোড ব্যর্থ হয়েছে: " + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'সাবমিট করুন';
            }
        });
    }

    // Auth state change handler for UI updates
    auth.onAuthStateChanged(user => {
        // Since we want the 'post-link' to always be visible, we don't need to hide it here.
        // The check will be done on form submission.
    });

    // New UI elements
    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.getElementById('side-menu');
    const profileLink = document.getElementById('profile-link');
    const postLink = document.getElementById('post-link');
    const logoutLink = document.getElementById('logout-link');

    // Menu toggle
    if (menuToggle && sideMenu) {
        menuToggle.addEventListener('click', () => {
            sideMenu.classList.toggle('open');
        });
    }

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

});
