// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// গ্লোবাল ভ্যারিয়েবল: আপলোড করার জন্য নির্বাচিত ফাইলগুলো সংরক্ষণ করে
let selectedImageFiles = [];

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
            postTypeSelect.addEventListener('change', (e) => generateSpecificFields(category, e.target.value));
        }
    }

    // Function to generate specific input fields based on type
    function generateSpecificFields(category, type) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        let fieldsHTML = '';
        
        // --- সকল প্রকার প্রপার্টির জন্য সাধারণ ফিল্ডসমূহ ---
        fieldsHTML += `
            <div class="input-group">
                <label for="property-title">পোস্টের শিরোনাম:</label>
                <input type="text" id="property-title" required>
            </div>
            <div class="input-group">
                <label for="description">সম্পূর্ণ বিবরণ:</label>
                <textarea id="description" rows="4" required></textarea>
            </div>
            <div class="input-group">
                <label for="district">জেলা:</label>
                <input type="text" id="district" required>
            </div>
            <div class="input-group">
                <label for="upazila">উপজেলা/এলাকা:</label>
                <input type="text" id="upazila" required>
            </div>
        `;

        // --- স্পেসিফিক ফিল্ডসমূহ (ধরন ও ক্যাটাগরি অনুযায়ী) ---
        if (category === 'বিক্রয়') {
            fieldsHTML += `
                <div class="input-group">
                    <label for="price">বিক্রয় মূল্য (টাকায়):</label>
                    <input type="number" id="price" required>
                </div>
            `;
            if (type === 'জমি') {
                fieldsHTML += `
                    <div class="input-group">
                        <label for="land-size">জমির পরিমাণ (শতাংশ/কাঠা):</label>
                        <input type="text" id="land-size" required>
                    </div>
                `;
            } else if (type === 'বাড়ি' || type === 'ফ্লাট') {
                fieldsHTML += `
                    <div class="input-inline">
                        <div class="input-group">
                            <label for="rooms">রুম সংখ্যা:</label>
                            <input type="number" id="rooms" required>
                        </div>
                        <div class="input-group">
                            <label for="bathrooms">বাথরুম সংখ্যা:</label>
                            <input type="number" id="bathrooms" required>
                        </div>
                    </div>
                `;
            }
        } else if (category === 'ভাড়া') {
            fieldsHTML += `
                <div class="input-group">
                    <label for="rent-amount">ভাড়ার পরিমাণ (মাসিক টাকায়):</label>
                    <input type="number" id="rent-amount" required>
                </div>
            `;
            if (type === 'বাড়ি' || type === 'ফ্লাট') {
                fieldsHTML += `
                    <div class="input-inline">
                        <div class="input-group">
                            <label for="rooms">রুম সংখ্যা:</label>
                            <input type="number" id="rooms" required>
                        </div>
                        <div class="input-group">
                            <label for="bathrooms">বাথরুম সংখ্যা:</label>
                            <input type="number" id="bathrooms" required>
                        </div>
                    </div>
                    <div class="input-group">
                        <label for="advance">অগ্রিম/ডিপোজিট (ঐচ্ছিক):</label>
                        <input type="number" id="advance">
                    </div>
                `;
            }
        }
        
        // --- ইমেজ ইনপুট এবং প্রিভিউ কন্টেইনার (এখানে সব সময় একই থাকবে) ---
        fieldsHTML += `
            <div class="form-section image-upload-section">
                <h3>ছবি আপলোড</h3>
                <div class="input-group">
                    <label for="images">ছবি আপলোড (কমপক্ষে ১টি, সর্বোচ্চ ৩টি):</label>
                    <input type="file" id="images" accept="image/*" multiple required>
                </div>
                <div class="image-preview-area" id="image-preview-area">
                    <p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে। (সর্বোচ্চ ৩টি)</p>
                </div>
            </div>
        `;

        specificFieldsContainer.innerHTML = fieldsHTML;

        // Image Preview Handler যুক্ত করা
        const imageInput = document.getElementById('images');
        if (imageInput) {
            imageInput.addEventListener('change', handleImageSelection);
        }
        
        // ডাইনামিক ফিল্ড লোড হওয়ার পরেও প্রিভিউ রেন্ডার করা
        renderImagePreviews(document.getElementById('image-preview-area'));
    }
    
    // ছবি প্রিভিউ এবং রিমুভ করার লজিক
    function handleImageSelection(event) {
        const files = event.target.files;
        const newFiles = Array.from(files); 

        // নতুন ফাইল দিয়ে অ্যারে প্রতিস্থাপন
        selectedImageFiles = newFiles;

        // ফাইল সংখ্যা পরীক্ষা করা
        if (selectedImageFiles.length > 3) {
            alert("আপনি সর্বোচ্চ ৩টি ছবি আপলোড করতে পারবেন।");
            event.target.value = ''; 
            selectedImageFiles = [];
        }
        
        // প্রিভিউ রেন্ডার করা
        renderImagePreviews(document.getElementById('image-preview-area'));
    }

    function renderImagePreviews(previewArea) {
        previewArea.innerHTML = ''; // কন্টেইনার খালি করা

        if (selectedImageFiles.length === 0) {
            previewArea.innerHTML = '<p class="placeholder-text">এখানে আপলোড করা ছবিগুলো দেখা যাবে। (সর্বোচ্চ ৩টি)</p>';
            return;
        }

        selectedImageFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'preview-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = `Image Preview ${index + 1}`;
                
                // ক্রস বাটন (&#10006; হলো X চিহ্নের HTML এনটিটি)
                const removeBtn = document.createElement('span');
                removeBtn.className = 'remove-image-btn';
                removeBtn.innerHTML = '&#10006;'; 
                
                // ছবি বা ক্রস বাটনে ক্লিক করলে রিমুভ ফাংশন কল হবে
                const remover = (e) => {
                    e.stopPropagation();
                    removeImage(index);
                };
                
                removeBtn.addEventListener('click', remover);
                img.addEventListener('click', remover);

                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                previewArea.appendChild(previewItem);
            };
            reader.readAsDataURL(file);
        });
    }

    function removeImage(index) {
        // গ্লোবাল অ্যারে থেকে ফাইল মুছে ফেলা
        selectedImageFiles.splice(index, 1); 
        
        // প্রিভিউ আপডেট করা
        renderImagePreviews(document.getElementById('image-preview-area'));

        // ইনপুট ফাইল রিসেট করা
        const imageInput = document.getElementById('images');
        if (imageInput) {
             imageInput.value = '';
        }
    }
    // ছবি প্রিভিউ এবং রিমুভ করার লজিক শেষ

    // প্রাথমিক ক্যাটাগরি নির্বাচনের ইভেন্ট
    postCategorySelect.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        // ক্যাটাগরি পরিবর্তন হলে গ্লোবাল ফাইল অ্যারে খালি করা
        selectedImageFiles = []; 
        if (selectedCategory) {
            generateTypeDropdown(selectedCategory);
        } else {
            dynamicFieldsContainer.innerHTML = '<p class="placeholder-text">ক্যাটাগরি নির্বাচন করার পরে এখানে ফর্মের বাকি অংশ আসবে।</p>';
        }
    });

    // ফর্ম সাবমিট হ্যান্ডেল (selectedImageFiles ব্যবহার করা হচ্ছে)
    propertyForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.textContent = 'আপলোড হচ্ছে...';

        try {
            const user = auth.currentUser;
            if (!user) {
                alert("পোস্ট করার আগে আপনাকে লগইন করতে হবে!");
                submitBtn.disabled = false;
                submitBtn.textContent = 'সাবমিট করুন';
                return;
            }

            const imageFilesToUpload = selectedImageFiles; // গ্লোবাল অ্যারে থেকে ফাইল নেওয়া
            
            if (imageFilesToUpload.length === 0) {
                 alert("অনুগ্রহ করে কমপক্ষে একটি ছবি আপলোড করুন।");
                 submitBtn.disabled = false;
                 submitBtn.textContent = 'সাবমিট করুন';
                 return;
            }
            // (৩টি ছবির লিমিট handleImageSelection ফাংশনে চেক করা হয়েছে)


            const category = document.getElementById('post-category').value;
            const type = document.getElementById('post-type')?.value;
            const title = document.getElementById('property-title')?.value;
            const description = document.getElementById('description')?.value;
            const district = document.getElementById('district')?.value;
            const upazila = document.getElementById('upazila')?.value;
            const phoneNumber = document.getElementById('phone-number')?.value; 
            const googleMap = document.getElementById('google-map')?.value;

            // ইমেজ আপলোড
            const imageUrls = [];
            for (const file of imageFilesToUpload) {
                const storageRef = storage.ref(`property_images/${Date.now()}_${file.name}`);
                const snapshot = await storageRef.put(file);
                const downloadURL = await snapshot.ref.getDownloadURL();
                imageUrls.push(downloadURL);
            }

            const propertyData = {
                category,
                type,
                title,
                description,
                images: imageUrls,
                phoneNumber,
                googleMap,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                location: {
                    district,
                    upazila,
                },
                userId: user.uid,
                status: 'pending' 
            };
            
            // ... (অতিরিক্ত ফিল্ড যোগ করার লজিক)
             if (category === 'বিক্রয়') {
                propertyData.price = document.getElementById('price')?.value;
                if (type === 'জমি') {
                    propertyData.landSize = document.getElementById('land-size')?.value;
                } else if (type === 'বাড়ি' || type === 'ফ্লাট') {
                    propertyData.rooms = document.getElementById('rooms')?.value;
                    propertyData.bathrooms = document.getElementById('bathrooms')?.value;
                }
            } else if (category === 'ভাড়া') {
                propertyData.rentAmount = document.getElementById('rent-amount')?.value;
                propertyData.advance = document.getElementById('advance')?.value || null;
                if (type === 'বাড়ি' || type === 'ফ্লাট') {
                    propertyData.rooms = document.getElementById('rooms')?.value;
                    propertyData.bathrooms = document.getElementById('bathrooms')?.value;
                }
            }


            await db.collection("properties").add(propertyData);

            alert("প্রপার্টি সফলভাবে আপলোড করা হয়েছে!");
            propertyForm.reset();
            // ফর্ম সাবমিট হওয়ার পর গ্লোবাল ফাইল ও প্রিভিউ রিসেট করা
            selectedImageFiles = []; 
            renderImagePreviews(document.getElementById('image-preview-area'));
            dynamicFieldsContainer.innerHTML = '<p class="placeholder-text">ক্যাটাগরি নির্বাচন করার পরে এখানে ফর্মের বাকি অংশ আসবে।</p>'; 

        } catch (error) {
            console.error("ডেটা আপলোড করতে সমস্যা হয়েছে: ", error);
            alert("প্রপার্টি আপলোড ব্যর্থ হয়েছে: " + error.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'সাবমিট করুন';
        }
    });

    // Auth state change handler for UI updates (মোবাইল নম্বর দৃশ্যমান করা)
    auth.onAuthStateChanged(user => {
        const postLinkSidebar = document.getElementById('post-link');
        const loginLinkSidebar = document.getElementById('login-link-sidebar');
        const authWarningMessage = document.getElementById('auth-warning-message');
        const propertyFormDisplay = document.getElementById('property-form');
        const phoneNumberInput = document.getElementById('phone-number'); // ফোন ইনপুট

        // লগআউট হ্যান্ডেলার
        const handleLogout = async () => {
            try {
                await auth.signOut();
                alert('সফলভাবে লগআউট করা হয়েছে!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error("লগআউট ব্যর্থ হয়েছে:", error);
                alert("লগআউট ব্যর্থ হয়েছে।");
            }
        };

        if (user) {
            // লগইন থাকলে
            if (propertyFormDisplay) propertyFormDisplay.style.display = 'block';
            if (authWarningMessage) authWarningMessage.style.display = 'none';

            // ✅ ফোন নম্বর দৃশ্যমান করা
            if (phoneNumberInput) {
                // NOTE: ফায়ারবেস/Firestore থেকে আসল নম্বর লোড করার লজিক এখানে যুক্ত করুন
                // আপাতত একটি ডামি/টেস্ট নম্বর ব্যবহার করা হলো:
                phoneNumberInput.value = '01712345678'; // ডামি প্রোফাইল নম্বর
                phoneNumberInput.disabled = false; // সম্পাদনার সুযোগ রাখা হলো
            }
            
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout;
            }
        } else {
            // লগইন না থাকলে
            if (propertyFormDisplay) propertyFormDisplay.style.display = 'none';
            if (authWarningMessage) authWarningMessage.style.display = 'block';
            
            if (phoneNumberInput) {
                phoneNumberInput.value = ''; // নম্বর খালি রাখা হলো
                phoneNumberInput.disabled = true;
            }

            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
        }
    });
});
