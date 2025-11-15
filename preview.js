// Firebase SDKs
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    // --- ১. UI Elements সংগ্রহ ---
    const previewContent = document.getElementById('preview-content');
    const editButton = document.getElementById('edit-button');
    const confirmButton = document.getElementById('confirm-post-button');
    
    // Header & Sidebar Elements
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const notificationButton = document.getElementById('notificationButton'); 
    const messageButton = document.getElementById('messageButton');
    const headerPostButton = document.getElementById('headerPostButton'); 
    const profileImageWrapper = document.getElementById('profileImageWrapper'); 
    const profileImage = document.getElementById('profileImage'); 
    const defaultProfileIcon = document.getElementById('defaultProfileIcon'); 
    const notificationCount = document.getElementById('notification-count');
    const messageCount = document.getElementById('message-count');
    const postCount = document.getElementById('post-count'); 
    const loginLinkSidebar = document.getElementById('login-link-sidebar');
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');

    // --- ২. ইউটিলিটি ফাংশন ---
    
    // প্রোফাইল ছবি লোড করার ফাংশন
    async function loadHeaderProfile(user) {
        if (profileImage && defaultProfileIcon) {
            try {
                const doc = await db.collection('users').doc(user.uid).get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data.profilePictureUrl) {
                        profileImage.src = data.profilePictureUrl;
                        profileImage.style.display = 'block';
                        defaultProfileIcon.style.display = 'none';
                    } else {
                        profileImage.style.display = 'none';
                        defaultProfileIcon.style.display = 'block';
                    }
                }
            } catch (error) {
                console.error("Header profile load failed:", error);
            }
        }
    }
    
    // আইকন কাউন্টার আপডেট করার ডামি ফাংশন 
    function updateIconCounts() {
        if (notificationCount) {
            notificationCount.textContent = 5;
            notificationCount.style.display = 'block';
        }
        if (messageCount) {
            messageCount.textContent = 3;
            messageCount.style.display = 'block';
        }
        if (postCount) {
            postCount.textContent = 1;
            postCount.style.display = 'block';
        }
    }
    
    // Base64 to Blob (for final Firebase upload)
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
    
    // ডেটা ফরম্যাট করার ফাংশন
    const checkAndFormat = (value, unit = '', defaultValue = 'প্রদান করা হয়নি') => {
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
            return defaultValue;
        }
        // Array handling for utilities (list)
        if (Array.isArray(value)) {
             return value.length > 0 ? `<ul class="utilities-list">${value.map(item => `<li>${item}</li>`).join('')}</ul>` : defaultValue;
        }
        // Price formatting
        if (unit === 'টাকা' && typeof value === 'number') {
             return value.toLocaleString('bn-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 });
        }
        return `${value} ${unit}`.trim();
    }

    // --- ৩. ডেটা লোড ও রেন্ডার ফাংশন (sessionStorage কী ফিক্স করা হয়েছে) ---
    
    const renderPreview = (data) => {
        // ছবি রেন্ডার
        const photoHTML = `
            <h3>🖼️ প্রপার্টির ছবিসমূহ</h3>
            <div id="photo-preview-container">
                ${data.photos.map(photoDataUrl => `
                    <div class="photo-wrapper">
                        <img src="${photoDataUrl}" alt="Property Image">
                    </div>
                `).join('')}
            </div>
        `;
        
        // প্রধান তথ্য রেন্ডার (টেবিল স্টাইল)
        const detailsHTML = `
            <h3>📋 প্রধান তথ্য</h3>
            <table class="details-table">
                <tr><th>বিভাগ</th><td>${checkAndFormat(data.category)}</td></tr>
                <tr><th>ধরণ</th><td>${checkAndFormat(data.type)}</td></tr>
                <tr><th>ঠিকানা</th><td>${checkAndFormat(data.address)}</td></tr>
                <tr><th>এলাকা/ওয়ার্ড</th><td>${checkAndFormat(data.area)}</td></tr>
                <tr><th>শহর</th><td>${checkAndFormat(data.city)}</td></tr>
                <tr><th>দাম</th><td>${checkAndFormat(data.price, 'টাকা')}</td></tr>
                <tr><th>সাইজ</th><td>${checkAndFormat(data.size, 'বর্গফুট')}</td></tr>
            </table>
        `;
        
        // অতিরিক্ত তথ্য রেন্ডার
        const extraDetailsHTML = `
            <h3>🏡 অতিরিক্ত বিবরণ</h3>
            <table class="details-table">
                <tr><th>বেডরুম</th><td>${checkAndFormat(data.bedrooms)}</td></tr>
                <tr><th>বাথরুম</th><td>${checkAndFormat(data.bathrooms)}</td></tr>
                <tr><th>বারান্দা</th><td>${checkAndFormat(data.balconies)}</td></tr>
                <tr><th>ফ্লোর নং</th><td>${checkAndFormat(data.floorNo)}</td></tr>
            </table>
        `;
        
        // সুবিধার তালিকা রেন্ডার
        const utilitiesHTML = `
            <h3>⚡ সুবিধা সমূহ</h3>
            ${checkAndFormat(data.utilities)}
        `;

        previewContent.innerHTML = `
            <h2 class="property-title">${checkAndFormat(data.title)}</h2>
            <p><strong>বিবরণ:</strong> ${checkAndFormat(data.description)}</p>
            ${photoHTML}
            ${detailsHTML}
            ${extraDetailsHTML}
            ${utilitiesHTML}
        `;
    };

    // ⭐ FIX: post.js এ ব্যবহৃত সঠিক কী (stagedPropertyData ও stagedImageMetadata) ব্যবহার করা হলো ⭐
    const storedDataString = sessionStorage.getItem('stagedPropertyData');
    const storedMetadataString = sessionStorage.getItem('stagedImageMetadata');
    let propertyData = null;

    if (storedDataString) {
        propertyData = JSON.parse(storedDataString);
        
        if (storedMetadataString) {
             const imageMetadata = JSON.parse(storedMetadataString);
             // ফটো মেটাডেটা থেকে ডেটা ইউআরএলগুলো নিয়ে photos অ্যারে তৈরি করা হলো
             propertyData.photos = imageMetadata.map(meta => meta.dataURL); 
        } else {
             propertyData.photos = []; 
        }
        
        renderPreview(propertyData);
        confirmButton.disabled = false;
    } else {
        previewContent.innerHTML = '<p style="color: red; text-align: center;">কোনো প্রিভিউ ডেটা পাওয়া যায়নি। অনুগ্রহ করে পোস্ট ফর্মে ফিরে যান এবং তথ্য পূরণ করুন।</p>';
        confirmButton.disabled = true;
    }
    
    // লগআউট হ্যান্ডেলার
    const handleLogout = async (e) => {
        e.preventDefault();
        try {
            await auth.signOut();
            alert('সফলভাবে লগআউট করা হয়েছে!');
            window.location.href = 'auth.html'; 
        } catch (error) {
            console.error("লগআউট ব্যর্থ হয়েছে:", error);
            alert("লগআউট ব্যর্থ হয়েছে।");
        }
    };


    // --- ৪. ইভেন্ট লিসেনার্স (ক্লিক ফিক্স) ---
    
    // মেনু এবং সাইডবার কার্যকারিতা
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

    // হেডার আইকন রিডাইরেক্ট
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


    editButton.addEventListener('click', () => {
        window.location.href = 'post.html'; 
    });

    confirmButton.addEventListener('click', async () => {
        if (!propertyData || !auth.currentUser) {
            alert("পোস্ট করার আগে লগইন করুন এবং ডেটা নিশ্চিত করুন।");
            return;
        }

        confirmButton.disabled = true;
        confirmButton.textContent = 'পোস্ট হচ্ছে...';

        try {
            const user = auth.currentUser;
            const uid = user.uid;
            
            // ১. ছবিগুলো Firebase Storage এ আপলোড করা
            const uploadPromises = propertyData.photos.map((photoDataUrl, index) => {
                const blob = dataURLtoBlob(photoDataUrl);
                const storageRef = storage.ref(`properties/${uid}/${Date.now()}_${index}.jpg`);
                return storageRef.put(blob).then(snapshot => snapshot.ref.getDownloadURL());
            });

            const uploadedUrls = await Promise.all(uploadPromises);
            
            // ২. Firestore এ ডেটা সেভ করা
            const newProperty = {
                ...propertyData,
                listerId: uid,
                photos: uploadedUrls, 
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                status: 'active'
            };

            await db.collection('properties').add(newProperty);

            // ৩. পোস্ট সফল হলে Draft মুছে দেওয়া
            sessionStorage.removeItem('stagedPropertyData'); // ⭐ FIX: সঠিক কী মুছে ফেলা হলো
            sessionStorage.removeItem('stagedImageMetadata'); // ⭐ FIX: সঠিক কী মুছে ফেলা হলো
            
            alert('সফলভাবে প্রপার্টি পোস্ট করা হয়েছে! এখন এটি ওয়েবসাইটে দেখা যাবে।');
            window.location.href = 'index.html';

        } catch (error) {
            console.error("পোস্ট করার সময় ত্রুটি:", error);
            alert(`পোস্ট ব্যর্থ হয়েছে। ত্রুটি: ${error.message}`);
            confirmButton.disabled = false;
            confirmButton.textContent = 'নিশ্চিত করে পোস্ট করুন';
        }
    });

    // --- ৫. অথেন্টিকেশন স্টেট চেঞ্জ লজিক ---
    auth.onAuthStateChanged(user => {
        if (user) {
            // লগইন থাকলে
            loadHeaderProfile(user); 
            updateIconCounts(); 
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 

            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout;
            }
        } else {
            // লগইন না থাকলে
            profileImage.style.display = 'none';
            defaultProfileIcon.style.display = 'block';
            if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 
            
            if (notificationCount) notificationCount.style.display = 'none';
            if (messageCount) messageCount.style.display = 'none';
            if (postCount) postCount.style.display = 'none';
            
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null;
            }
            confirmButton.disabled = true;
        }
    });
});
