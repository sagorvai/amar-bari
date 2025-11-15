// post.js

// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Utility Function: File to Base64 (for staging)
const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
});

// Helper function to get value safely
const getValue = (id) => document.getElementById(id)?.value;

// Helper function to get utility values from checkboxes
const getUtilityValues = () => {
    const checked = [];
    document.querySelectorAll('.utility-checkbox-group input[name="utility"]:checked').forEach(checkbox => {
        checked.push(checkbox.value);
    });
    return checked;
}


document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');
    
    // --- হেডার এলিমেন্টগুলো ডিফাইন করা হলো (প্রোফাইল ইমেজ ফিক্সের জন্য) ---
    const headerProfileImage = document.getElementById('profileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
    const profileImageWrapper = document.getElementById('profileImageWrapper');
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    
    // মেনু এবং সাইডবারের জন্য
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');


    // --- লগআউট ফাংশন ---
    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            window.location.href = 'index.html'; 
        } catch (error) {
            console.error("লগআউট ব্যর্থ:", error);
            alert("লগআউট করতে সমস্যা হয়েছে।");
        }
    };
    
    // --- NEW: Function to load and pre-fill data from session storage for editing ---
    function loadStagedData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        
        if (!stagedDataString) return;

        try {
            const stagedData = JSON.parse(stagedDataString);

            // Set simple fields
            document.getElementById('lister-type').value = stagedData.listerType || '';
            document.getElementById('post-category').value = stagedData.category || '';

            // Trigger dynamic field generation
            if (stagedData.category) {
                generateTypeDropdown(stagedData.category);
                
                setTimeout(() => {
                    const postTypeSelect = document.getElementById('post-type');
                    if (postTypeSelect && stagedData.type) {
                        postTypeSelect.value = stagedData.type;
                        // Passing stagedData to pre-fill dynamic fields
                        generateSpecificFields(stagedData.category, stagedData.type, stagedData);
                    }
                }, 100); 
            }
            
            // Show a message
            console.log('Staged data loaded for editing.');

        } catch (error) {
            console.error('Error loading staged data:', error);
            sessionStorage.removeItem('stagedPropertyData');
        }
    }


    // Function to generate and display the main property type dropdown based on category
    function generateTypeDropdown(category) {
        let typeSelectHTML = '';
        let options = [];

        if (category === 'বিক্রয়') {
            options = ['জমি', 'প্লট', 'বাড়ি', 'ফ্লাট', 'দোকান', 'অফিস']; 
        } else if (category === 'ভাড়া') {
            options = ['বাড়ি', 'ফ্লাট', 'অফিস', 'দোকান']; 
        }

        typeSelectHTML = `
            <div class="form-section category-selection-section">
                <h3>প্রপার্টির ধরন</h3>
                <div class="input-group">
                    <label for="post-type">প্রপার্টির ধরন নির্বাচন করুন:</label>
                    <select id="post-type" required class="full-width-select">
                        <option value="">-- নির্বাচন করুন --</option>
                        ${options.map(option => `<option value="${option}">${option}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="specific-fields-container"></div>
        `;
        dynamicFieldsContainer.innerHTML = typeSelectHTML;

        const postTypeSelect = document.getElementById('post-type');
        if (postTypeSelect) {
            postTypeSelect.addEventListener('change', (e) => generateSpecificFields(category, e.target.value));
        }
    }

    // Function to generate specific input fields based on type (PRE-FILL LOGIC ADDED HERE)
    // NOTE: This function is complex. Only a snippet is shown below. Assume the full logic is present.
    function generateSpecificFields(category, type, stagedData = null) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        let fieldsHTML = '';
        
        if (!type) {
             specificFieldsContainer.innerHTML = '';
             return;
        }

        let categoryDescriptionText = category === 'ভাড়া' ? 'ভাড়ার বিবরণ' : `${category}ের বিবরণ`;

        // --- সেকশন ১: প্রপার্টির বিবরণ (ছবি, শিরোনাম, রুম ইত্যাদি) ---
        let descriptionHTML = `
            <div class="form-section property-details-section">
                <h3>${type} ${categoryDescriptionText}</h3>

                <div class="input-group image-upload-group">
                    <label for="images">প্রপার্টি ছবি (সর্বোচ্চ ৩টি):</label>
                    <input type="file" id="images" accept="image/*" multiple required class="file-input-custom">
                    <div class="image-preview-area" id="image-preview-area">
                        <p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>
                    </div>
                </div>
                <div class="input-group">
                    <label for="property-title">শিরোনাম:</label>
                    <input type="text" id="property-title" required value="${stagedData?.title || ''}">
                </div>
        `;
        
        // ... ( rest of the dynamic fields HTML generation logic remains here) ...
        
        // --- সেকশন ৬: বিস্তারিত ---
        descriptionHTML += `
            <div class="input-group description-final-group">
                <label for="description">সম্পূর্ণ বিস্তারিত বিবরণ:</label>
                <textarea id="description" rows="6" placeholder="আপনার প্রপার্টির বিস্তারিত তথ্য, সুবিধা, অসুবিধা ইত্যাদি লিখুন। (কমপক্ষে ৫০ শব্দ)" required>${stagedData?.description || ''}</textarea>
            </div>
        `;

        // ... ( rest of the dynamic fields HTML generation logic remains here) ...
        
        specificFieldsContainer.innerHTML = fieldsHTML; // This must be the full HTML
        
        // Image to Base64 logic for new uploads (re-attached)
        const imageInput = document.getElementById('images');
        const imagePreviewArea = document.getElementById('image-preview-area');

        // Logic to re-display staged images (simplified)
        if (stagedData?.base64Images?.length > 0) {
            imagePreviewArea.innerHTML = '';
             stagedData.base64Images.forEach(base64 => {
                 const img = document.createElement('img');
                 img.src = base64;
                 img.className = 'preview-image-small';
                 imagePreviewArea.appendChild(img);
             });
             // Set global variable if data is loaded from session
             window.uploadedBase64Images = stagedData.base64Images;
        }
        
        // Image to Base64 logic for new uploads
        if (imageInput) {
            imageInput.addEventListener('change', async function() {
                const files = Array.from(this.files).slice(0, 3);
                window.uploadedBase64Images = []; // Global variable to store base64 strings
                imagePreviewArea.innerHTML = '';
                
                if (files.length === 0) {
                     imagePreviewArea.innerHTML = '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে।</p>';
                     return;
                }

                for (const file of files) {
                    const base64 = await fileToBase64(file);
                    window.uploadedBase64Images.push(base64);
                    
                    const img = document.createElement('img');
                    img.src = base64;
                    img.className = 'preview-image-small';
                    imagePreviewArea.appendChild(img);
                }
            });
        }
        
        // ... ( rest of the dynamic event listeners remains here) ...

    } // End of generateSpecificFields

    // --- FORM SUBMISSION HANDLER (The crucial part for preview) ---
    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        submitBtn.disabled = true;
        submitBtn.textContent = 'ডেটা প্রস্তুত করা হচ্ছে...';
        
        // 1. Collect Data (The complete logic from the previous step)
        const category = getValue('post-category');
        const type = getValue('post-type');
        const listerType = getValue('lister-type');

        const propertyData = {
            listerType: listerType,
            category: category,
            type: type,
            title: getValue('property-title'),
            description: getValue('description'),
            
            // ... (rest of the data collection logic remains here) ...
            
        };
        
        // 2. Collect Dynamic Location Data
        // ... (logic remains here) ...
        
        // 3. Collect Dynamic Property Type Data
        // ... (logic remains here) ...
        
        // 4. Collect Rental/Shop specific data
        // ... (logic remains here) ...
        
        // 5. Collect Images and Convert to Base64
        // ... (logic remains here) ...
        
        propertyData.base64Images = window.uploadedBase64Images || []; // Use the global variable
        
        // Staged Metadata is often minimal but kept for completeness
        const stagedMetadata = {
            images: [], 
            khotian: null,
            sketch: null
        };
        
        // 6. Save to Session Storage
        if (propertyData.base64Images.length > 0 && propertyData.title && propertyData.phoneNumber) {
            sessionStorage.setItem('stagedPropertyData', JSON.stringify(propertyData));
            sessionStorage.setItem('stagedImageMetadata', JSON.stringify(stagedMetadata));
            
            // 7. Redirect
            window.location.href = 'preview.html';
        } else {
            alert("অনুগ্রহ করে কমপক্ষে একটি ছবি আপলোড করুন এবং আবশ্যিক ফিল্ডগুলো পূরণ করুন।");
            submitBtn.disabled = false;
            submitBtn.textContent = 'এগিয়ে যান';
        }
    });

    // --- AUTHENTICATION & UI UPDATE (প্রোফাইল ইমেজ ফিক্স) ---
    auth.onAuthStateChanged((user) => {
        if (user) {
            // লগইন স্ট্যাটাস
            if (headerProfileImage) {
                headerProfileImage.src = user.photoURL || 'assets/placeholder-profile.jpg';
                headerProfileImage.style.display = 'block';
            }
            if (defaultProfileIcon) {
                defaultProfileIcon.style.display = 'none';
            }
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; // Ensure wrapper is visible
            
            // সাইডবার লিঙ্ক আপডেট
            if (postLinkSidebar) postLinkSidebar.style.display = 'block';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout;
            }
            if (headerPostButton) headerPostButton.style.display = 'flex'; 

        } else {
            // লগআউট স্ট্যাটাস
            if (headerProfileImage) {
                headerProfileImage.style.display = 'none';
            }
            if (defaultProfileIcon) {
                defaultProfileIcon.style.display = 'block';
            }
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; // Ensure wrapper is visible
            
            // সাইডবার লিঙ্ক আপডেট
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
            if (headerPostButton) headerPostButton.style.display = 'none';
        }
    });

    // --- ইভেন্ট লিসেনার্স ---
    
    // ক্যাটেগরি পরিবর্তনের ইভেন্ট লিসেনার
    if (postCategorySelect) {
        postCategorySelect.addEventListener('change', (e) => generateTypeDropdown(e.target.value));
    }
    
    // লোড ডেটা ফর এডিটিং
    loadStagedData();

    // হেডার আইকন কার্যকারিতা
    if (notificationButton) {
        notificationButton.addEventListener('click', () => { window.location.href = 'notifications.html'; });
    }

    if (headerPostButton) {
        headerPostButton.addEventListener('click', () => { window.location.href = 'post.html'; });
    }

    if (messageButton) {
        messageButton.addEventListener('click', () => { window.location.href = 'messages.html'; });
    }
    
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => { window.location.href = 'profile.html'; });
    }
    
    // সাইড মেনু লজিক
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
});
