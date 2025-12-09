// preview.js

const db = firebase.firestore();
const storage = firebase.storage(); 
const auth = firebase.auth();

// স্টেজড (Staged) ইমেজকে চূড়ান্ত (Final) লোকেশনে নিয়ে যাওয়ার ফাংশন
const moveImageToFinalLocation = async (metadata, propertyId, docType) => {
    const oldPath = metadata.storagePath;
    // চূড়ান্ত স্টোরেজ ডিরেক্টরি
    const finalDir = docType === 'main' ? `properties/${propertyId}/images` : `properties/${propertyId}/documents`;
    const finalPath = `${finalDir}/${metadata.fileName}`;
    
    const oldRef = storage.ref().child(oldPath);
    const newRef = storage.ref().child(finalPath);
    
    try {
        // ফাইলটি কপি করা হচ্ছে
        const blob = await oldRef.getBlob(); // স্টেজড ফাইল ডাউনলোড করা
        await newRef.put(blob); // চূড়ান্ত লোকেশনে আপলোড করা
        
        // পুরাতন স্টেজড ফাইল মুছে ফেলা
        await oldRef.delete();
        
        // চূড়ান্ত ডাউনলোডের URL নেওয়া
        const finalURL = await newRef.getDownloadURL();

        // আপডেট করা মেটাডেটা রিটার্ন করা
        return {
            ...metadata,
            storagePath: finalPath,
            url: finalURL,
        };
    } catch (error) {
        console.error(`ইমেজ স্থানান্তরে ব্যর্থ: ${metadata.fileName}`, error);
        // যদি স্থানান্তর ব্যর্থ হয়, তবুও অস্থায়ী URL ব্যবহার করে ডেটা সেভ করার জন্য পুরোনো মেটাডেটা রিটার্ন করা হচ্ছে
        // তবে এর ফলে স্টোরেজে স্টেজড ফাইলটি রয়ে যেতে পারে।
        return metadata; 
    }
};


// ডেটা লোড করে প্রিভিউ তৈরি করার ফাংশন
function loadPreviewData(user) {
    const dataString = sessionStorage.getItem('stagedPropertyData');
    const metaString = sessionStorage.getItem('stagedImageMetadata');
    const previewContainer = document.getElementById('preview-container');
    const publishButton = document.getElementById('publish-button');
    const editButton = document.getElementById('edit-button');

    if (!dataString) {
        previewContainer.innerHTML = '<p style="color: red;">প্রিভিউ করার মতো কোনো ডেটা পাওয়া যায়নি। অনুগ্রহ করে <a href="post.html">পোস্ট পেজে</a> ফিরে যান।</p>';
        publishButton.disabled = true;
        editButton.addEventListener('click', () => { window.location.href = 'post.html'; });
        return;
    }

    try {
        const propertyData = JSON.parse(dataString);
        const imageMetadata = JSON.parse(metaString || '{}');

        // --- প্রিভিউ কন্টেন্ট তৈরি করা ---
        let html = `<div class="property-preview">`;

        // ১. ছবি ও ডকুমেন্ট প্রিভিউ
        if ((imageMetadata.images || []).length > 0) {
            html += `<h4>ছবিসমূহ:</h4><div class="image-gallery">`;
            imageMetadata.images.forEach(img => {
                html += `<img src="${img.url}" alt="Property Image" style="max-width: 150px; height: auto; margin: 5px; border-radius: 5px;">`;
            });
            html += `</div>`;
        }
        if (imageMetadata.khotian) {
            html += `<h4>খতিয়ান ডকুমেন্ট:</h4><img src="${imageMetadata.khotian.url}" alt="Khotian" style="max-width: 150px; height: auto; margin: 5px; border-radius: 5px;">`;
        }
        if (imageMetadata.sketch) {
            html += `<h4>স্কেচ ম্যাপ:</h4><img src="${imageMetadata.sketch.url}" alt="Sketch Map" style="max-width: 150px; height: auto; margin: 5px; border-radius: 5px;">`;
        }
        
        // ২. মূল তথ্য
        html += `
            <h3>${propertyData.title || 'Untitled Property'}</h3>
            <p><strong>পোস্টের ধরন:</strong> ${propertyData.category || ''} - ${propertyData.type || ''}</p>
            <p><strong>দাম/ভাড়া:</strong> 
                ${propertyData.price ? `${propertyData.price} ${propertyData.priceUnit}` : ''}
                ${propertyData.monthlyRent ? `মাসিক ভাড়া: ${propertyData.monthlyRent} টাকা` : ''}
            </p>
            
            <h4>ঠিকানা:</h4>
            <p>${propertyData.location.village}, ${propertyData.location.district}, ${propertyData.location.division}</p>
            
            <h4>বিবরণ:</h4>
            <p class="description-text">${propertyData.description || 'কোনো বর্ণনা নেই।'}</p>
            </div>`;
        
        previewContainer.innerHTML = html;

        // --- বাটন লজিক সেট করা ---
        editButton.addEventListener('click', () => {
            window.location.href = 'post.html';
        });

        publishButton.addEventListener('click', () => publishProperty(user, propertyData, imageMetadata));

    } catch (error) {
        console.error('স্টেজড ডেটা লোড বা পার্স করতে সমস্যা:', error);
        previewContainer.innerHTML = '<p style="color: red;">ডেটা লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে <a href="post.html">পোস্ট পেজে</a> ফিরে যান এবং আবার চেষ্টা করুন।</p>';
        publishButton.disabled = true;
    }
}


// চূড়ান্ত পোস্ট করার ফাংশন
async function publishProperty(user, propertyData, imageMetadata) {
    const publishButton = document.getElementById('publish-button');
    publishButton.disabled = true;
    publishButton.textContent = 'পোস্ট হচ্ছে... অপেক্ষা করুন';

    try {
        // ১. Firestore-এ একটি নতুন ডকুমেন্ট রেফারেন্স তৈরি করা
        const docRef = db.collection('properties').doc();
        const propertyId = docRef.id;

        // ২. ইমেজ/ডকুমেন্টগুলো স্টেজড লোকেশন থেকে চূড়ান্ত লোকেশনে সরানো
        let finalImageMetadata = {};

        // A. মেইন ছবিগুলো সরানো
        const mainImagePromises = (imageMetadata.images || []).map(meta => 
            moveImageToFinalLocation(meta, propertyId, 'main')
        );
        finalImageMetadata.images = await Promise.all(mainImagePromises);
        
        // B. ডকুমেন্টগুলো সরানো (যদি থাকে)
        if (imageMetadata.khotian) {
            finalImageMetadata.khotian = await moveImageToFinalLocation(imageMetadata.khotian, propertyId, 'khotian');
        }
        if (imageMetadata.sketch) {
            finalImageMetadata.sketch = await moveImageToFinalLocation(imageMetadata.sketch, propertyId, 'sketch');
        }

        // ৩. চূড়ান্ত ডেটা প্রস্তুত করা
        const finalPropertyData = {
            ...propertyData,
            ...finalImageMetadata, // চূড়ান্ত ইমেজ মেটাডেটা যুক্ত করা
            id: propertyId,
            userId: user.uid,
            listerPhone: user.phoneNumber, // যদি আপনার auth লজিকে ফোন নম্বর সেভ করা থাকে
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            
            // 🔥 এটাই সেই লজিক যা আপনার পোস্টকে সরাসরি লাইভ করবে 🔥
            status: 'published' 
        };

        // ৪. Firestore-এ সেভ করা
        await docRef.set(finalPropertyData);

        // ৫. সেশন স্টোরেজ ক্লিয়ার করা
        sessionStorage.removeItem('stagedPropertyData');
        sessionStorage.removeItem('stagedImageMetadata');

        alert('🎉 আপনার প্রপার্টি সফলভাবে লাইভ হয়েছে! এখন এটি ওয়েবসাইটে দেখা যাবে।');
        window.location.href = 'profile.html'; // ব্যবহারকারীকে প্রোফাইল/ড্যাশবোর্ড পেজে রিডাইরেক্ট করা

    } catch (error) {
        console.error('চূড়ান্ত পোস্ট ব্যর্থ হয়েছে:', error);
        alert('পোস্ট সেভ করতে সমস্যা হয়েছে। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন এবং আবার চেষ্টা করুন।');
        publishButton.disabled = false;
        publishButton.textContent = 'চুরান্ত পোস্ট করুন';
    }
}

// ডকুমেন্ট লোড হওয়ার পর প্রধান লজিক
document.addEventListener('DOMContentLoaded', function() {
    // হেডার ও সাইডবার লজিক আপনার post.js থেকে কপি করুন (যদি প্রয়োজন হয়)
    
    // Auth Check
    auth.onAuthStateChanged(user => {
        if (!user) {
            alert('পোস্ট করার আগে আপনাকে লগইন করতে হবে।');
            window.location.href = 'auth.html';
            return;
        }
        // লগইন থাকলে ডেটা লোড ও প্রিভিউ তৈরি করা হবে।
        loadPreviewData(user);
    });
});
