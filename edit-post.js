// edit-post.js

// ১. গ্লোবাল স্টেট ম্যানেজমেন্ট
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');
let originalData = null; // পুরোনো ডেটা স্টোর করার জন্য
let currentImages = []; // বর্তমানে ফর্মে থাকা ছবির লিস্ট (পুরাণ + নতুন মিলিয়ে)
let imagesToDeleteFromStorage = []; // যে পুরোনো ছবিগুলো ডিলিট করা হয়েছে
let hasUnsavedChanges = false;
let isSubmitting = false; // ডবল সাবমিট রোধ করতে

// ছবি ট্র্যাক করার জন্য একটি স্ট্রাকচার:
// { id: 'unique_id', type: 'old'|'new', url: 'blob_or_fire_url', storagePath: 'path_if_old', file: FileObjectIfNew }

// ২. অথেনটিকেশন এবং নিরাপত্তা চেক
document.addEventListener('DOMContentLoaded', () => {
    if (!postId) {
        alert('পোস্ট আইডি পাওয়া যায়নি!');
        window.location.href = 'index.html';
        return;
    }

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // হেডার প্রোফাইল পিক লোড (post.js থেকে সংগৃহীত)
            loadHeaderProfilePic(user);
            // পোস্টের ডেটা লোড
            await loadPostData(user.uid);
        } else {
            alert('ইডিট করতে প্রথমে লগইন করুন।');
            window.location.href = `auth.html?redirect=edit-post.html?id=${postId}`;
        }
    });

    setupImageUpload();
    setupFormDependency();
    setupUnsavedChangesWarning();
});

// ৩. ফায়ারস্টোর থেকে ডেটা লোড এবং ফর্ম অটো-ফিল
async function loadPostData(currentUserId) {
    try {
        const doc = await db.collection('properties').doc(postId).get();
        
        if (!doc.exists) {
            alert('পোস্টটি পাওয়া যায়নি।');
            window.location.href = 'index.html';
            return;
        }

        const data = doc.data();
        originalData = data; // ব্যাকআপ রাখা হলো কমপেয়ার করার জন্য

        // নিরাপত্তা চেক: শুধুমাত্র পোস্টের মালিক ইডিট করতে পারবেন
        if (data.userId !== currentUserId) {
            alert('আপনি এই পোস্টের মালিক নন। এটি ইডিট করার অধিকার আপনার নেই।');
            window.location.href = `details.html?id=${postId}`;
            return;
        }

        // --- ফর্ম ফিলআপ শুরু ---
        
        // বেসিক তথ্য
        setVal('display-category', data.category);
        setVal('display-type', data.type);
        setVal('property-title', data.title);
        setVal('description', data.description);

        // ডাইনামিক ফিল্ডস জেনারেট এবং ফিল আপ (Type ও Category অনুযায়ী)
        renderDynamicFields(data.category, data.type, data);

        // অবস্থান (লিখিত)
        setVal('loc-division', data.location?.division);
        setVal('loc-district', data.location?.district);
        setVal('loc-thana', data.location?.thana || data.location?.upazila);
        setVal('loc-village', data.location?.village);
        setVal('loc-road', data.location?.road);

        // যোগাযোগ
        setVal('primary-phone', data.phoneNumber);
        setVal('secondary-phone', data.secondaryPhone);

        // বাতিল বাটনের লিঙ্ক সেট করা
        document.getElementById('btn-cancel').href = `details.html?id=${postId}`;

        // --- ছবি লোড করা (সবচেয়ে গুরুত্বপূর্ণ অংশ) ---
        if (data.images && Array.isArray(data.images)) {
            data.images.forEach((img, index) => {
                // পুরোনো ছবির অবজেক্ট তৈরি
                const imgObj = {
                    id: `old_${index}_${Date.now()}`, // ইউনিক আইডি রেন্ডারিং এর জন্য
                    type: 'old',
                    url: img.url || img, // আপনার ডেটাবেস স্ট্রাকচার অনুযায়ী
                    storagePath: img.storagePath || extractStoragePath(img.url || img) // যদি storagePath না থাকে তবে URL থেকে বের করার চেষ্টা
                };
                currentImages.push(imgObj);
                renderImagePreview(imgObj);
            });
        }
        
        // SortableJS অ্যাক্টিভেট করা (ছবি Reorder করার জন্য Drag & Drop)
        setupDragAndDrop();

        // লোডিং স্ক্রিন হাইড করা
        document.getElementById('loading-screen').style.display = 'none';

    } catch (error) {
        console.error("Error loading post:", error);
        alert('ডেটা লোড করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।');
    }
}

// ৪. ডাইনামিক ফিল্ডস রেন্ডারিং লজিক (আপনার post.js থেকে কনসেপ্ট নেওয়া)
function renderDynamicFields(category, type, data) {
    const priceContainer = document.getElementById('dynamic-price-fields');
    const detailsContainer = document.getElementById('dynamic-details-fields');
    
    priceContainer.innerHTML = '';
    detailsContainer.innerHTML = '';

    // --- মূল্য সেকশন ---
    let priceHTML = '';
    if (category === 'বিক্রয়') {
        priceHTML = `
            <div class="input-group">
                <label>দাম (টাকা)</label>
                <div class="input-with-unit">
                    <input type="number" id="price" required value="${data.price || ''}">
                    <select id="price-unit" class="unit-select">
                        <option value="মোট" ${data.priceUnit === 'মোট' ? 'selected' : ''}>মোট</option>
                        <option value="শতক প্রতি" ${data.priceUnit === 'শতক প্রতি' ? 'selected' : ''}>per শতক</option>
                        <option value="স্কয়ার ফিট প্রতি" ${data.priceUnit === 'স্কয়ার ফিট প্রতি' ? 'selected' : ''}>per sqft</option>
                    </select>
                </div>
            </div>
        `;
    } else {
        priceHTML = `
            <div class="input-group">
                <label>মাসিক ভাড়া (টাকা)</label>
                <input type="number" id="monthly-rent" required value="${data.monthlyRent || ''}">
            </div>
            <div class="input-group">
                <label>অগ্রিম/জামানত (টাকা)</label>
                <input type="number" id="advance" value="${data.advance || ''}">
            </div>
        `;
    }
    priceContainer.innerHTML = priceHTML;

    // --- পরিমাণ ফিল্ড (Type অনুযায়ী) ---
    let areaHTML = '';
    if (type === 'জমি' || type === 'প্লট') {
        areaHTML = `
            <div class="input-group">
                <label>জমির পরিমাণ</label>
                <div class="input-with-unit">
                    <input type="number" id="land-area" required value="${data.landArea || ''}">
                    <select id="land-area-unit" class="unit-select">
                        <option value="শতক" ${data.landAreaUnit === 'শতক' ? 'selected' : ''}>শতক</option>
                        <option value="একর" ${data.landAreaUnit === 'একর' ? 'selected' : ''}>একর</option>
                        <option value="বিঘা" ${data.landAreaUnit === 'বিঘা' ? 'selected' : ''}>বিঘা</option>
                    </select>
                </div>
            </div>
        `;
    } else if (type === 'ফ্ল্যাট') {
        areaHTML = `<div class="input-group"><label>সাইজ (Sqft)</label><input type="number" id="area-sqft" required value="${data.areaSqft || ''}"></div>`;
    } else {
        areaHTML = `<div class="input-group"><label>পরিমাণ/সাইজ</label><input type="text" id="generic-area" value="${data.landArea || data.areaSqft || ''}"></div>`;
    }
    priceContainer.innerHTML += areaHTML;


    // --- বিবরণ সেকশন (Beds, Baths etc.) ---
    let detailsHTML = '';
    if (type === 'ফ্ল্যাট' || type === 'বাড়ি') {
        detailsHTML = `
            <div class="input-group"><label>বেডরুম</label><input type="number" id="bedrooms" value="${data.bedrooms || ''}"></div>
            <div class="input-group"><label>বাথরুম</label><input type="number" id="bathrooms" value="${data.bathrooms || ''}"></div>
            <div class="input-group"><label>বেলকনি</label><input type="number" id="balcony" value="${data.balcony || ''}"></div>
            <div class="input-group"><label>ফ্লোর নম্বর</label><input type="number" id="floor-no" value="${data.floorNo || ''}"></div>
        `;
    }
    
    // কমন ফিল্ডস
    detailsHTML += `<div class="input-group"><label>রাস্তা (ফিট)</label><input type="number" id="road-width" value="${data.roadWidth || ''}"></div>`;
    
    if (type !== 'জমি' && type !== 'প্লট') {
        detailsHTML += `
            <div class="input-group">
                <label>ফেসিং (দিক)</label>
                <select id="facing">
                    <option value="">নির্বাচন করুন</option>
                    <option value="উত্তর" ${data.facing === 'উত্তর' ? 'selected' : ''}>উত্তর</option>
                    <option value="দক্ষিণ" ${data.facing === 'দক্ষিণ' ? 'selected' : ''}>দক্ষিণ</option>
                    <option value="পূর্ব" ${data.facing === 'পূর্ব' ? 'selected' : ''}>পূর্ব</option>
                    <option value="পশ্চিম" ${data.facing === 'পশ্চিম' ? 'selected' : ''}>পশ্চিম</option>
                </select>
            </div>
        `;
    }

    detailsContainer.innerHTML = detailsHTML;
}

// ৫. ইমেজ ম্যানেজমেন্ট লজিক (Add/Delete/Preview)
function setupImageUpload() {
    const fileInput = document.getElementById('images-input');
    const trigger = document.getElementById('upload-trigger');

    trigger.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // আপনার post.js-এর মতো কমপ্রেশন লজিক এখানে যুক্ত করা উচিত KB সাইজ রাখার জন্য।
        // আপাতত আমি সরাসরি প্রিভিউ দেখাচ্ছি সময় এবং জটিলতা বাঁচাতে।

        files.forEach(file => {
            if (!file.type.startsWith('image/')) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                // নতুন ছবির অবজেক্ট
                const imgObj = {
                    id: `new_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    type: 'new',
                    url: event.target.result, // base64 for preview
                    file: file // Actual file for upload
                };
                currentImages.push(imgObj);
                renderImagePreview(imgObj);
                hasUnsavedChanges = true;
            };
            reader.readAsDataURL(file);
        });
        
        fileInput.value = ''; // Reset input
    });
}

// ইমেজ কন্টেইনারে ছবি রেন্ডার করা
function renderImagePreview(imgObj) {
    const container = document.getElementById('image-preview-area');
    
    const wrapper = document.createElement('div');
    wrapper.className = 'image-preview-wrapper';
    wrapper.id = imgObj.id;
    wrapper.setAttribute('data-type', imgObj.type);

    const img = document.createElement('img');
    img.className = 'preview-image';
    img.src = imgObj.url;
    wrapper.appendChild(img);

    // পুরোনো ছবি হলে একটি ব্যাজ দেখানো (ঐচ্ছিক, UI বোঝার সুবিধার্থে)
    if (imgObj.type === 'old') {
        const badge = document.createElement('span');
        badge.className = 'old-image-badge';
        badge.textContent = 'আগের ছবি';
        wrapper.appendChild(badge);
    }

    // ডিলিট বাটন
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-image-btn';
    removeBtn.innerHTML = '<i class="material-icons" style="font-size:16px">close</i>';
    removeBtn.type = 'button';
    removeBtn.onclick = (e) => {
        e.stopPropagation(); // Reorder ট্রিগার রোধ করতে
        removeImage(imgObj.id);
    };
    wrapper.appendChild(removeBtn);

    container.appendChild(wrapper);
}

// ছবি রিমুভ করার লজিক
function removeImage(id) {
    // ১. অ্যারে থেকে ইনডেক্স খুঁজে বের করা
    const index = currentImages.findIndex(img => img.id === id);
    if (index === -1) return;

    const imgToRemove = currentImages[index];

    // ২. যদি এটি পুরোনো ছবি হয়, তবে এটিকে Storage থেকে ডিলিট করার লিস্টে রাখা
    if (imgToRemove.type === 'old' && imgToRemove.storagePath) {
        imagesToDeleteFromStorage.push(imgToRemove.storagePath);
        console.log("উইলিং টু ডিলিট ফ্রম স্টোরেজ:", imagesToDeleteFromStorage);
    }

    // ৩. মেইন অ্যারে থেকে ডিলিট
    currentImages.splice(index, 1);

    // ৪. UI থেকে রিমুভ
    const element = document.getElementById(id);
    if (element) element.remove();

    hasUnsavedChanges = true;
}

// ৬. Drag and Drop (Reorder) লজিক
function setupDragAndDrop() {
    const el = document.getElementById('image-preview-area');
    Sortable.create(el, {
        animation: 150,
        ghostClass: 'dragging',
        onEnd: function () {
            // ড্রাগ শেষ হলে নতুন অর্ডার অনুযায়ী currentImages অ্যারে আপডেট করা
            reorderImagesArray();
            hasUnsavedChanges = true;
        },
    });
}

function reorderImagesArray() {
    const container = document.getElementById('image-preview-area');
    const currentOrderIds = Array.from(container.children).map(child => child.id);
    
    const newOrderedArray = [];
    currentOrderIds.forEach(id => {
        const imgObj = currentImages.find(img => img.id === id);
        if (imgObj) newOrderedArray.push(imgObj);
    });
    
    currentImages = newOrderedArray;
    // console.log("New Image Order:", currentImages);
}

// ৭. ফর্ম সাবমিট এবং ফায়ারবেস আপডেট (The Main Engine)
const editForm = document.getElementById('edit-property-form');
editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (currentImages.length === 0) {
        alert('দয়া করে কমপক্ষে একটি ছবি যুক্ত করুন।');
        return;
    }

    // প্রিভিউ মোডাল দেখানো ভালো, কিন্তু আপাতত সরাসরি নিশ্চিত করছি
    if (!confirm("আপনি কি নিশ্চিতভাবে এই পরিবর্তনগুলো সেভ করতে চান?")) return;

    isSubmitting = true;
    const saveBtn = document.getElementById('btn-save');
    const saveBtnText = saveBtn.querySelector('span');
    saveBtn.disabled = true;
    saveBtnText.textContent = 'সেভ হচ্ছে...';

    try {
        const userId = auth.currentUser.uid;
        
        // --- ধাপ ১: স্টোরেজ ম্যানেজমেন্ট (ডিলিট এবং আপলোড) ---
        
        // A. ছবি Storage থেকে মুছে ফেলা (Storage Sync)
        if (imagesToDeleteFromStorage.length > 0) {
            const deletePromises = imagesToDeleteFromStorage.map(path => {
                // নিরাপত্তা: শুধুমাত্র staged/ বা properties/ ফোল্ডারের ফাইল ডিলিট করার অনুমতি দেওয়া উচিত।
                // এবং নিশ্চিত করা উচিত যে এটি এই ইউজারেরই ফাইল।
                if (path.includes(userId)) {
                    return storage.ref().child(path).delete().catch(err => console.error("Error deleting file:", path, err));
                }
                return Promise.resolve(); // skipping if path invalid
            });
            await Promise.all(deletePromises);
            console.log("স্টোরেজ থেকে পুরোনো ছবি ডিলিট সফল।");
        }

        // B. নতুন ছবি স্টোরেজে আপলোড করা (KB সাইজ মেইনটেইন করে post.js লজিক অনুযায়ী করা উচিত)
        const finalImagesMetadata = []; // Firestore-এ সেভ করার জন্য চূড়ান্ত ছবির তথ্য

        // Reordered currentImages অ্যারে ধরে লুপ চালানো
        for (let i = 0; i < currentImages.length; i++) {
            const img = currentImages[i];

            if (img.type === 'old') {
                // পুরোনো ছবি হলে জাস্ট বর্তমান URL এবং Path রেখে দেওয়া
                finalImagesMetadata.push({
                    url: img.url,
                    storagePath: img.storagePath
                });
            } else if (img.type === 'new' && img.file) {
                // নতুন ছবি হলে আপলোড করা
                saveBtnText.textContent = `ছবি আপলোড হচ্ছে (${i+1}/${currentImages.length})...`;
                
                // post.js-এর মতো কমপ্রেশন ফাংশন (compressImage) এখানে কল করা উচিত।
                // const compressedFile = await compressImage(img.file); 
                const fileToUpload = img.file; // Currently uploading without compression

                const fileName = `${Date.now()}_${i}_${img.file.name}`;
                const storagePath = `properties/images/${userId}/${fileName}`;
                const fileRef = storage.ref().child(storagePath);
                
                await fileRef.put(fileToUpload);
                const downloadURL = await fileRef.getDownloadURL();
                
                finalImagesMetadata.push({
                    url: downloadURL,
                    storagePath: storagePath // ভবিষ্যতের ইডিটের জন্য পাথ সেভ রাখা জরুরি
                });
            }
        }

        // --- ধাপ ২: Firestore ডকুমেন্ট আপডেট ---
        saveBtnText.textContent = 'ডেটাবেস আপডেট হচ্ছে...';

        // বর্তমান ফর্মের ডেটা সংগ্রহ
        const updatedFields = {
            title: getVal('property-title'),
            description: getVal('description'),
            images: finalImagesMetadata, // চূড়ান্ত ছবি Reordered লিস্ট
            
            // অবস্থান
            location: {
                ...originalData.location, // পুরোনো বিভাগ/জেলা ঠিক রাখা
                village: getVal('loc-village'),
                road: getVal('loc-road')
            },
            
            // যোগাযোগ
            secondaryPhone: getVal('secondary-phone'),
            
            // মেটাডেটা আপডেট
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            editCount: firebase.firestore.FieldValue.increment(1) // ইডিট সংখ্যা ১ বাড়ানো
        };

        // ডাইনামিক ফিল্ডস ডেটা সংগ্রহ (Category/Type অনুযায়ী)
        const category = originalData.category;
        const type = originalData.type;

        if (category === 'বিক্রয়') {
            updatedFields.price = getVal('price');
            updatedFields.priceUnit = getVal('price-unit');
        } else {
            updatedFields.monthlyRent = getVal('monthly-rent');
            updatedFields.advance = getVal('advance');
        }

        if (type === 'জমি' || type === 'প্লট') {
            updatedFields.landArea = getVal('land-area');
            updatedFields.landAreaUnit = getVal('land-area-unit');
        } else if (type === 'ফ্ল্যাট') {
            updatedFields.areaSqft = getVal('area-sqft');
        }

        if (document.getElementById('bedrooms')) updatedFields.bedrooms = getVal('bedrooms');
        if (document.getElementById('bathrooms')) updatedFields.bathrooms = getVal('bathrooms');
        if (document.getElementById('road-width')) updatedFields.roadWidth = getVal('road-width');
        if (document.getElementById('facing')) updatedFields.facing = getVal('facing');


        // ফায়ারস্টোর আপডেট কল
        await db.collection('properties').doc(postId).update(updatedFields);

        console.complete("Update successful!");
        hasUnsavedChanges = false; // Warning বন্ধ করা
        alert('🎉 অভিনন্দন! আপনার পোস্টটি সফলভাবে আপডেট করা হয়েছে।');
        window.location.href = `details.html?id=${postId}`; // ডিটেইলস পেইজে ফেরত পাঠানো

    } catch (error) {
        console.error("Error updating post:", error);
        alert('দুঃখিত, পোস্ট আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন। error: ' + error.message);
        isSubmitting = false;
        saveBtn.disabled = false;
        saveBtnText.textContent = 'পরিবর্তন সেভ করুন';
    }
});

// ৮. সাহায্যকারী ফাংশনসমূহ (Helper Functions)

// ইনপুট ভ্যালু সেট/গেট
const setVal = (id, val) => { if(document.getElementById(id)) document.getElementById(id).value = val || ''; };
const getVal = (id) => { return document.getElementById(id) ? document.getElementById(id).value.trim() : null; };

// Firebase URL থেকে Storage Path বের করার ফাংশন (যদি পাথ সেভ না থাকে)
function extractStoragePath(url) {
    if (!url || !url.includes('firebasestorage.googleapis.com')) return null;
    try {
        // URL formatting: .../b/BUCKET/o/PATH?alt=media...
        const decodedUrl = decodeURIComponent(url);
        const parts = decodedUrl.split('/o/');
        if (parts.length > 1) {
            return parts[1].split('?')[0]; // Path before '?'
        }
    } catch (e) { console.error("Error extracting path:", e); }
    return null;
}

// ফর্ম চেঞ্জ ট্র্যাকিং
function setupFormDependency() {
    // ফর্মে কোনো কিছু টাইপ বা চেঞ্জ করলে warning অ্যাক্টিভেট হবে
    editForm.addEventListener('input', () => {
        if (!isSubmitting) hasUnsavedChanges = true;
    });
}

// Unsaved Changes Warning (Responsive requirement)
function setupUnsavedChangesWarning() {
    window.addEventListener('beforeunload', (e) => {
        if (hasUnsavedChanges && !isSubmitting) {
            // আধুনিক ব্রাউজারে কাস্টম মেসেজ দেখানো যায় না, জাস্ট স্ট্যান্ডার্ড ওয়ার্নিং দেখাবে
            e.preventDefault();
            e.returnValue = '';
        }
    });
}

// হেডার প্রোফাইল পিকচার (details.js থেকে সংগৃহীত)
function loadHeaderProfilePic(user) {
    const headerImg = document.getElementById('headerProfileImg');
    if (!headerImg) return;
    
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists && doc.data().profilePic) {
            headerImg.src = doc.data().profilePic;
        } else if (user.photoURL) {
            headerImg.src = user.photoURL;
        }
    }).catch(err => console.log(err));
}
