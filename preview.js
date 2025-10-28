// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const previewContent = document.getElementById('preview-content');
    const editButton = document.getElementById('edit-button');
    const confirmButton = document.getElementById('confirm-post-button');

    // Utility Function: Base64 to Blob (for final Firebase upload)
    const dataURLtoBlob = (dataurl) => {
        const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
            bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], {type:mime});
    }

    // Function to render the preview data
    function renderPreview(stagedData, stagedMetadata) {
        let html = '';
        
        // 1. Image Preview Section
        if (stagedData.base64Images && stagedData.base64Images.length > 0) {
            html += `
                <div class="preview-section">
                    <h3>ছবিসমূহ (${stagedData.base64Images.length}টি)</h3>
                    <div id="image-carousel">
                        ${stagedData.base64Images.map(base64 => `<img src="${base64}" class="preview-image" alt="Property Image">`).join('')}
                    </div>
                </div>
            `;
        }
        
        // 2. Main Details
        html += `
            <div class="preview-section">
                <h3>সাধারণ তথ্য</h3>
                <div class="preview-item"><div class="preview-label">পোস্টকারী ধরন</div><div class="preview-value">${stagedData.listerType || 'N/A'}</div></div>
                <div class="preview-item"><div class="preview-label">ক্যাটাগরি</div><div class="preview-value">${stagedData.category}</div></div>
                <div class="preview-item"><div class="preview-label">ধরন</div><div class="preview-value">${stagedData.type}</div></div>
                <div class="preview-item"><div class="preview-label">শিরোনাম</div><div class="preview-value">${stagedData.title}</div></div>
                
                ${stagedData.propertyAge !== undefined ? `<div class="preview-item"><div class="preview-label">প্রপার্টির বয়স</div><div class="preview-value">${stagedData.propertyAge} বছর</div></div>` : ''}
                ${stagedData.facing ? `<div class="preview-item"><div class="preview-label">প্রপার্টির দিক</div><div class="preview-value">${stagedData.facing}</div></div>` : ''}
                
                ${stagedData.utilities && stagedData.utilities.length > 0 ? `
                    <div class="preview-item">
                        <div class="preview-label">অন্যান্য সুবিধা</div>
                        <div class="preview-value"><ul class="utility-list">${stagedData.utilities.map(u => `<li>${u}</li>`).join('')}</ul></div>
                    </div>
                ` : ''}
                
                ${stagedData.rooms !== undefined ? `<div class="preview-item"><div class="preview-label">রুম সংখ্যা</div><div class="preview-value">${stagedData.rooms || 'N/A'}</div></div>` : ''}
                ${stagedData.bathrooms !== undefined ? `<div class="preview-label">বাথরুম সংখ্যা</div><div class="preview-value">${stagedData.bathrooms || 'N/A'}</div></div>` : ''}
                ${stagedData.kitchen !== undefined ? `<div class="preview-item"><div class="preview-label">কিচেন সংখ্যা</div><div class="preview-value">${stagedData.kitchen || 'N/A'}</div></div>` : ''}
            </div>
        `;

        // 3. Price/Rent Section
        html += `
            <div class="preview-section">
                <h3>পরিমাণ ও দাম/ভাড়া</h3>
                ${stagedData.landArea ? `<div class="preview-item"><div class="preview-label">জমির পরিমাণ</div><div class="preview-value">${stagedData.landArea} ${stagedData.landAreaUnit}</div></div>` : ''}
                ${stagedData.houseArea ? `<div class="preview-item"><div class="preview-label">বাড়ির/জমির পরিমাণ</div><div class="preview-value">${stagedData.houseArea} ${stagedData.houseAreaUnit}</div></div>` : ''}
                ${stagedData.areaSqft ? `<div class="preview-item"><div class="preview-label">ফ্ল্যাটের পরিমাণ</div><div class="preview-value">${stagedData.areaSqft} স্কয়ার ফিট</div></div>` : ''}
                ${stagedData.commercialArea ? `<div class="preview-item"><div class="preview-label">বাণিজ্যিক পরিমাণ</div><div class="preview-value">${stagedData.commercialArea} ${stagedData.commercialAreaUnit}</div></div>` : ''}
                
                ${stagedData.price ? `<div class="preview-item"><div class="preview-label">দাম</div><div class="preview-value">${stagedData.price} টাকা (${stagedData.priceUnit})</div></div>` : ''}
                ${stagedData.monthlyRent ? `<div class="preview-item"><div class="preview-label">মাসিক ভাড়া</div><div class="preview-value">${stagedData.monthlyRent} টাকা</div></div>` : ''}
                ${stagedData.advance ? `<div class="preview-item"><div class="preview-label">এডভান্স/জামানত</div><div class="preview-value">${stagedData.advance} টাকা</div></div>` : ''}
            </div>
        `;
        
        // 4. Ownership Documents (Only for 'বিক্রয়')
        if (stagedData.category === 'বিক্রয়' && stagedData.owner) {
             html += `
                <div class="preview-section">
                    <h3>মালিকানা বিবরণ</h3>
                    <div class="preview-item"><div class="preview-label">দাতার নাম</div><div class="preview-value">${stagedData.owner.donorName}</div></div>
                    <div class="preview-item"><div class="preview-label">দাগ নং</div><div class="preview-value">${stagedData.owner.dagNo} (${stagedData.owner.dagNoType})</div></div>
                    <div class="preview-item"><div class="preview-label">মৌজা</div><div class="preview-value">${stagedData.owner.mouja}</div></div>
                    ${stagedData.owner.khotianBase64 ? `
                        <div class="preview-item"><div class="preview-label">সর্বশেষ খতিয়ান</div><div class="preview-value"><img src="${stagedData.owner.khotianBase64}" class="full-width-image" alt="খতিয়ানের ছবি"></div></div>
                    ` : ''}
                    ${stagedData.owner.sketchBase64 ? `
                        <div class="preview-item"><div class="preview-label">প্রপার্টি স্কেস</div><div class="preview-value"><img src="${stagedData.owner.sketchBase64}" class="full-width-image" alt="স্কেসের ছবি"></div></div>
                    ` : ''}
                </div>
            `;
        }
        
        // 5. Address & Contact
        html += `
            <div class="preview-section">
                <h3>ঠিকানা ও যোগাযোগ</h3>
                <div class="preview-item"><div class="preview-label">বিভাগ, জেলা</div><div class="preview-value">${stagedData.location.division}, ${stagedData.location.district}</div></div>
                <div class="preview-item"><div class="preview-label">এলাকার ধরন</div><div class="preview-value">${stagedData.location.areaType}</div></div>
                <div class="preview-item"><div class="preview-label">ঠিকানা</div><div class="preview-value">গ্রাম: ${stagedData.location.village}, রোড: ${stagedData.location.road}, থানা: ${stagedData.location.thana}</div></div>
                <div class="preview-item"><div class="preview-label">ফোন নম্বর</div><div class="preview-value">${stagedData.phoneNumber} ${stagedData.secondaryPhone ? `(${stagedData.secondaryPhone})` : ''}</div></div>
                <div class="preview-item"><div class="preview-label">গুগল ম্যাপ পিন</div><div class="preview-value">${stagedData.googleMap || 'প্রদান করা হয়নি'}</div></div>
            </div>
        `;

        // 6. Full Description
        html += `
            <div class="preview-section">
                <h3>সম্পূর্ণ বিস্তারিত বিবরণ</h3>
                <p>${stagedData.description.replace(/\n/g, '<br>')}</p>
            </div>
        `;

        previewContent.innerHTML = html;
        confirmButton.disabled = false; // Enable final post button
    }


    // Function to handle the final submission to Firebase
    async function handleFinalSubmission(stagedData, stagedMetadata) {
        confirmButton.disabled = true;
        confirmButton.textContent = 'পোস্ট করা হচ্ছে... অনুগ্রহ করে অপেক্ষা করুন';
        editButton.disabled = true;

        try {
            const user = auth.currentUser;
            if (!user) {
                alert("আপনার সেশন মেয়াদোত্তীর্ণ হয়েছে। চূড়ান্ত পোস্টের জন্য আবার লগইন করুন।");
                window.location.href = 'auth.html';
                return;
            }
            
            // 1. Image Upload Function
            const uploadFile = async (base64Data, metadata, path) => {
                const blob = dataURLtoBlob(base64Data);
                const storageRef = storage.ref(`${path}/${Date.now()}_${metadata.name}`);
                const snapshot = await storageRef.put(blob);
                return await snapshot.ref.getDownloadURL();
            };

            // 2. Upload Main Images
            const imageUrls = [];
            for (let i = 0; i < stagedData.base64Images.length; i++) {
                const downloadURL = await uploadFile(stagedData.base64Images[i], stagedMetadata.images[i], 'property_images');
                imageUrls.push(downloadURL);
            }
            stagedData.images = imageUrls;
            delete stagedData.base64Images; // Clean up data object

            // 3. Upload Ownership Documents
            if (stagedData.category === 'বিক্রয়' && stagedData.owner) {
                if (stagedData.owner.khotianBase64) {
                    stagedData.owner.khotianImageUrl = await uploadFile(stagedData.owner.khotianBase64, stagedMetadata.khotian, 'ownership_docs/khotian');
                    delete stagedData.owner.khotianBase64;
                }
                if (stagedData.owner.sketchBase64) {
                    stagedData.owner.sketchImageUrl = await uploadFile(stagedData.owner.sketchBase64, stagedMetadata.sketch, 'ownership_docs/sketch');
                    delete stagedData.owner.sketchBase64;
                }
            }
            
            // 4. Add final metadata (timestamp and status)
            stagedData.timestamp = firebase.firestore.FieldValue.serverTimestamp();
            stagedData.status = 'pending'; // or 'live', depending on your approval process

            // 5. Save to Firestore
            await db.collection("properties").add(stagedData);

            // 6. Success and Cleanup
            sessionStorage.removeItem('stagedPropertyData');
            sessionStorage.removeItem('stagedImageMetadata');

            alert("প্রপার্টি সফলভাবে পোস্ট করা হয়েছে! এটি এখন অনুমোদনের অপেক্ষায় আছে।");
            window.location.href = 'index.html'; // Go back to the homepage/dashboard

        } catch (error) {
            console.error("চূড়ান্ত পোস্ট ব্যর্থ হয়েছে: ", error);
            alert("পোস্ট ব্যর্থ হয়েছে: " + error.message);
            confirmButton.disabled = false;
            confirmButton.textContent = 'আবার পোস্ট করার চেষ্টা করুন';
            editButton.disabled = false;
        }
    }


    // --- Main Logic on Load ---
    const stagedDataString = sessionStorage.getItem('stagedPropertyData');
    const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');
    
    if (stagedDataString && stagedMetadataString) {
        try {
            const stagedData = JSON.parse(stagedDataString);
            const stagedMetadata = JSON.parse(stagedMetadataString);
            previewContent.innerHTML = ''; // Clear the "not found" message
            renderPreview(stagedData, stagedMetadata);

            // Event Listeners for action buttons
            editButton.addEventListener('click', () => {
                window.location.href = 'post.html'; // Go back to edit
            });

            confirmButton.addEventListener('click', () => {
                handleFinalSubmission(stagedData, stagedMetadata);
            });

        } catch (error) {
            console.error('Error parsing staged data:', error);
        }
    } else {
        // No data found: keep default message and disable confirm button
        confirmButton.disabled = true;
        editButton.addEventListener('click', () => {
            window.location.href = 'post.html';
        });
    }
});
