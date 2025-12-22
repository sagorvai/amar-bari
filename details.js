// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth(); 
// অন্য পেজগুলোর মতো এখানেও অথেন্টিকেশন ভেরিয়েবল রাখা হলো

document.addEventListener('DOMContentLoaded', async function() {
    const detailsContainer = document.getElementById('property-details-container');
    const loadingMessage = document.getElementById('loading-message');
    const errorMessage = document.getElementById('error-message');

    // URL থেকে property ID বের করা
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    // সাইডবার এবং লগইন/লগআউট কার্যকারিতা
    const postLinkSidebar = document.getElementById('post-link'); 
    const loginLinkSidebar = document.getElementById('login-link-sidebar');

    // লগআউট হ্যান্ডেলার ফাংশন
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

    // Auth state change handler for UI updates
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

    // --- প্রধান লজিক: ডেটা লোড করা ---
    if (!propertyId) {
        // ID না পেলে
        loadingMessage.style.display = 'none';
        errorMessage.style.display = 'block';
        return;
    }

    try {
        const doc = await db.collection('properties').doc(propertyId).get();

        if (doc.exists) {
            const property = doc.data();
            
            // ডেটা লোড হলে মেসেজ লুকানো
            loadingMessage.style.display = 'none';
            
            // এইচটিএমএল রেন্ডার ফাংশন
            renderPropertyDetails(property);
            
        } else {
            // প্রপার্টি না পেলে
            loadingMessage.style.display = 'none';
            errorMessage.style.display = 'block';
        }

    } catch (error) {
        console.error("প্রপার্টি ডেটা লোড ব্যর্থ হয়েছে:", error);
        loadingMessage.style.display = 'none';
        errorMessage.textContent = "ডেটা লোড করার সময় একটি সমস্যা হয়েছে।";
        errorMessage.style.display = 'block';
    }
});


// ডেটা প্রদর্শন করার জন্য ফাংশন
function renderPropertyDetails(property) {
    const container = document.getElementById('property-details-container');
    const titleEl = document.getElementById('details-title');
    
    // ম্যাপ লিঙ্কে যদি `embed` না থাকে, তবে তা যোগ করা হলো
    let mapEmbedUrl = property.googleMap;
    if (mapEmbedUrl && !mapEmbedUrl.includes('embed')) {
        // একটি সাধারণ লিঙ্ককে এম্বেড ফ্রেমে ব্যবহারের জন্য ঠিক করা
        const match = mapEmbedUrl.match(/@([\d.-]+),([\d.-]+),(\d+z)/);
        if (match) {
            mapEmbedUrl = `https://maps.google.com/maps?q=${match[1]},${match[2]}&z=${match[3].replace('z', '')}&output=embed`;
        }
    }


    // ইউজার-ফ্রেন্ডলি ফিচার ডিসপ্লে
    const featuresHTML = property.type === 'জমি' ? 
        `
        <div class="detail-feature-box">
            <i class="material-icons">landscape</i>
            <p><strong>জমির পরিমাণ:</strong> ${property.size}</p>
        </div>
        ` 
        : 
        `
        <div class="detail-feature-box">
            <i class="material-icons">bed</i>
            <p><strong>বেডরুম:</strong> ${property.bedrooms}</p>
        </div>
        <div class="detail-feature-box">
            <i class="material-icons">bathtub</i>
            <p><strong>বাথরুম:</strong> ${property.bathrooms}</p>
        </div>
        `;

    // প্রধান এইচটিএমএল কাঠামো তৈরি
    const detailsHTML = `
        <div class="details-card">
            
            <img src="${property.imageURL || 'placeholder.jpg'}" alt="${property.title}" class="details-image">

            <div class="details-header">
                <h1 class="details-h1">${property.title}</h1>
                <p class="details-price">মূল্য: ৳ ${property.price.toLocaleString('bn-BD')}</p>
                <p class="details-location"><i class="material-icons">location_on</i> <strong>অবস্থান:</strong> ${property.address || ''}, ${property.district}</p>
            </div>
            
            <div class="details-content-box">
                <div class="details-meta-grid">
                    <div class="meta-item">
                        <p><strong>ক্যাটেগরি:</strong> ${property.category}</p>
                    </div>
                    <div class="meta-item">
                        <p><strong>ধরণ:</strong> ${property.type}</p>
                    </div>
                </div>

                <div class="details-features-container">
                    ${featuresHTML}
                </div>

                <h2 class="section-heading">বিস্তারিত বর্ণনা</h2>
                <p class="details-description">${property.description.replace(/\n/g, '<br>')}</p>
            </div>

            <div class="contact-section-details">
                <h2 class="section-heading">যোগাযোগের তথ্য</h2>
                <p><i class="material-icons">person</i> <strong>পোস্ট করেছেন:</strong> ${property.userName || 'অজানা'}</p>
                <p><i class="material-icons">phone</i> <strong>ফোন নম্বর:</strong> <a href="tel:${property.phoneNumber}">${property.phoneNumber || 'প্রদান করা হয়নি'}</a></p>
            </div>
            
            ${mapEmbedUrl ? `
            <div class="map-container">
                <h2 class="section-heading">মানচিত্রে অবস্থান</h2>
                <iframe 
                    width="100%" 
                    height="400" 
                    frameborder="0" 
                    style="border:0" 
                    src="${mapEmbedUrl}" 
                    allowfullscreen>
                </iframe>
            </div>
            ` : ''}
            
        </div>
    `;

    container.innerHTML = detailsHTML;
    titleEl.textContent = property.title; // পেজের শিরোনাম পরিবর্তন
      }
