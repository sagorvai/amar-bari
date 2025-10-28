// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const previewContent = document.getElementById('preview-content');
    const editButton = document.getElementById('edit-button');
    const confirmButton = document.getElementById('confirm-post-button');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');

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
    
    // Function to safely check and format data for display
    const checkAndFormat = (value, unit = '', defaultValue = 'প্রদান করা হয়নি') => {
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
            return defaultValue;
        }
        return `${value} ${unit}`.trim();
    };

    // Function to render the preview data
    function renderPreview(stagedData, stagedMetadata) {
        let html = '';
        
        // 1. Image Preview Section (Wrapper added for fixed size)
        if (stagedData.base64Images && stagedData.base64Images.length > 0) {
            html += `
                <div class="preview-section">
                    <h3>🖼️ ছবিসমূহ (${stagedData.base64Images.length}টি)</h3>
                    <div id="image-carousel">
                        ${stagedData.base64Images.map(base64 => `
                            <div class="preview-image-wrapper">
                                <img src="${base64}" class="preview-image" alt="Property Image">
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // 2. Main Details
        html += `
            <div class="preview-section">
                <h3>📜 সাধারণ তথ্য</h3>
                <div class="preview-item"><div class="preview-label">পোস্টকারী ধরন</div><div class="preview-value">${checkAndFormat(stagedData.listerType)}</div></div>
                <div class="preview-item"><div class="preview-label">ক্যাটাগরি</div><div class="preview-value">${checkAndFormat(stagedData.category)}</div></div>
                <div class="preview-item"><div class="preview-label">প্রপার্টির ধরন</div><div class="preview-value">${checkAndFormat(stagedData.type)}</div></div>
                <div class="preview-item"><div class="preview-label">শিরোনাম</div><div class="preview-value">${checkAndFormat(stagedData.title)}</div></div>
                
                ${stagedData.propertyAge !== undefined ? `<div class="preview-item"><div class="preview-label">প্রপার্টির বয়স</div><div class="preview-value">${checkAndFormat(stagedData.propertyAge, 'বছর')}</div></div>` : ''}
                ${stagedData.facing ? `<div class="preview-item"><div class="preview-label">প্রপার্টির দিক</div><div class="preview-value">${checkAndFormat(stagedData.facing)}</div></div>` : ''}
                
                ${stagedData.utilities && stagedData.utilities.length > 0 ? `
                    <div class="preview-item">
                        <div class="preview-label">অন্যান্য সুবিধা</div>
                        <div class="preview-value"><ul class="utility-list">${stagedData.utilities.map(u => `<li>${u}</li>`).join('')}</ul></div>
                    </div>
                ` : ''}
                
                ${stagedData.rooms !== undefined ? `<div class="preview-item"><div class="preview-label">রুম সংখ্যা</div><div class="preview-value">${checkAndFormat(stagedData.rooms)}</div></div>` : ''}
                ${stagedData.bathrooms !== undefined ? `<div class="preview-item"><div class="preview-label">বাথরুম সংখ্যা</div><div class="preview-value">${checkAndFormat(stagedData.bathrooms)}</div></div>` : ''}
                ${stagedData.kitchen !== undefined ? `<div class="preview-item"><div class="preview-label">কিচেন সংখ্যা</div><div class="preview-value">${checkAndFormat(stagedData.kitchen)}</div></div>` : ''}
                ${stagedData.floors !== undefined ? `<div class="preview-item"><div class="preview-label">তলা সংখ্যা</div><div class="preview-value">${checkAndFormat(stagedData.floors)}</div></div>` : ''}
                ${stagedData.floorNo !== undefined ? `<div class="preview-item"><div class="preview-label">ফ্লোর নং</div><div class="preview-value">${checkAndFormat(stagedData.floorNo)}</div></div>` : ''}
                ${stagedData.roadWidth !== undefined ? `<div class="preview-item"><div class="preview-label">রাস্তার প্রস্থ</div><div class="preview-value">${checkAndFormat(stagedData.roadWidth, 'ফিট')}</div></div>` : ''}
                ${stagedData.parking !== undefined ? `<div class="preview-item"><div class="preview-label">পার্কিং সুবিধা</div><div class="preview-value">${checkAndFormat(stagedData.parking)}</div></div>` : ''}
                ${stagedData.landType !== undefined ? `<div class="preview-item"><div class="preview-label">জমির ধরন</div><div class="preview-value">${checkAndFormat(stagedData.landType)}</div></div>` : ''}
                ${stagedData.plotNo !== undefined ? `<div class="preview-item"><div class="preview-label">প্লট নং</div><div class="preview-value">${checkAndFormat(stagedData.plotNo)}</div></div>` : ''}
                ${stagedData.shopCount !== undefined ? `<div class="preview-item"><div class="preview-label">দোকান সংখ্যা</div><div class="preview-value">${checkAndFormat(stagedData.shopCount)}</div></div>` : ''}
                ${stagedData.rentType !== undefined ? `<div class="preview-item"><div class="preview-label">ভাড়ার ধরন</div><div class="preview-value">${checkAndFormat(stagedData.rentType)}</div></div>` : ''}
                ${stagedData.moveInDate !== undefined ? `<div class="preview-item"><div class="preview-label">ওঠার তারিখ</div><div class="preview-value">${checkAndFormat(stagedData.moveInDate)}</div></div>` : ''}
            </div>
        `;

        // 3. Price/Rent Section
        html += `
            <div class="preview-section">
                <h3>💰 পরিমাণ ও দাম/ভাড়া</h3>
                
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
                    <h3>⚖️ মালিকানা বিবরণ</h3>
                    <div class="preview-item"><div class="preview-label">দাতার নাম</div><div class="preview-value">${checkAndFormat(stagedData.owner.donorName)}</div></div>
                    <div class="preview-item"><div class="preview-label">দাগ নং</div><div class="preview-value">${checkAndFormat(stagedData.owner.dagNo)} (${checkAndFormat(stagedData.owner.dagNoType)})</div></div>
                    <div class="preview-item"><div class="preview-label">মৌজা</div><div class="preview-value">${checkAndFormat(stagedData.owner.mouja)}</div></div>
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
                <h3>📍 ঠিকানা ও যোগাযোগ</h3>
                <div class="preview-item"><div class="preview-label">বিভাগ</div><div class="preview-value">${checkAndFormat(stagedData.location.division)}</div></div>
                <div class="preview-item"><div class="preview-label">জেলা</div><div class="preview-value">${checkAndFormat(stagedData.location.district)}</div></div>
                <div class="preview-item"><div class="preview-label">এলাকার ধরন</div><div class="preview-value">${checkAndFormat(stagedData.location.areaType)}</div></div>
                
                ${stagedData.location.areaType === 'উপজেলা' ? `<div class="preview-item"><div class="preview-label">উপজেলা / ইউনিয়ন</div><div class="preview-value">${checkAndFormat(stagedData.location.upazila)} / ${checkAndFormat(stagedData.location.union)}</div></div>` : ''}
                ${stagedData.location.areaType === 'সিটি কর্পোরেশন' ? `<div class="preview-item"><div class="preview-label">সিটি কর্পোরেশন</div><div class="preview-value">${checkAndFormat(stagedData.location.cityCorporation)}</div></div>` : ''}
                
                <div class="preview-item"><div class="preview-label">থানা / ওয়ার্ড</div><div class="preview-value">${checkAndFormat(stagedData.location.thana)} / ${checkAndFormat(stagedData.location.wardNo)}</div></div>
                <div class="preview-item"><div class="preview-label">গ্রাম / রোড</div><div class="preview-value">${checkAndFormat(stagedData.location.village)} / ${checkAndFormat(stagedData.location.road)}</div></div>
                
                <div class="preview-item"><div class="preview-label">প্রাথমিক ফোন</div><div class="preview-value">${checkAndFormat(stagedData.phoneNumber)}</div></div>
                <div class="preview-item"><div class="preview-label">অতিরিক্ত ফোন</div><div class="preview-value">${checkAndFormat(stagedData.secondaryPhone)}</div></div>
                <div class="preview-item"><div class="preview-label">গুগল ম্যাপ পিন</div><div class="preview-value">${checkAndFormat(stagedData.googleMap)}</div></div>
            </div>
        `;

        // 6. Full Description
        html += `
            <div class="preview-section">
                <h3>📝 সম্পূর্ণ বিস্তারিত বিবরণ</h3>
                <p>${checkAndFormat(stagedData.description).replace(/\n/g, '<br>')}</p>
            </div>
        `;

        previewContent.innerHTML = html;
        confirmButton.disabled = false; // Enable final post button
    }


    // Function to handle the final submission to Firebase (Same logic as before)
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
            stagedData.status = 'pending'; 

            // 5. Save to Firestore
            await db.collection("properties").add(stagedData);

            // 6. Success and Cleanup
            sessionStorage.removeItem('stagedPropertyData');
            sessionStorage.removeItem('stagedImageMetadata');

            alert("প্রপার্টি সফলভাবে পোস্ট করা হয়েছে! এটি এখন অনুমোদনের অপেক্ষায় আছে।");
            window.location.href = 'index.html'; 

        } catch (error) {
            console.error("চূড়ান্ত পোস্ট ব্যর্থ হয়েছে: ", error);
            alert("পোস্ট ব্যর্থ হয়েছে: " + error.message);
            confirmButton.disabled = false;
            confirmButton.textContent = 'আবার পোস্ট করার চেষ্টা করুন';
            editButton.disabled = false;
        }
    }


    // --- Main Logic on Load & Auth State ---
    
    // Auth state change handler for UI updates (Sidebar Link)
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
    
    auth.onAuthStateChanged(user => {
        if (user) {
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout;
            }
        } else {
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
        }
    });
    

    const stagedDataString = sessionStorage.getItem('stagedPropertyData');
    const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');
    
    if (stagedDataString && stagedMetadataString) {
        try {
            const stagedData = JSON.parse(stagedDataString);
            const stagedMetadata = JSON.parse(stagedMetadataString);
            previewContent.innerHTML = ''; 
            renderPreview(stagedData, stagedMetadata);

            // Event Listeners for action buttons
            editButton.addEventListener('click', () => {
                window.location.href = 'post.html'; 
            });

            confirmButton.addEventListener('click', () => {
                handleFinalSubmission(stagedData, stagedMetadata);
            });

        } catch (error) {
            console.error('Error parsing staged data:', error);
            alert('সংরক্ষিত ডেটা লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে আবার পোস্ট করুন।');
        }
    } else {
        confirmButton.disabled = true;
        editButton.addEventListener('click', () => {
            window.location.href = 'post.html';
        });
    }
});
