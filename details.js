const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;
    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            const data = doc.data();
            renderDetails(data);
            loadRelatedPosts(data);
            setupLikeSystem(); // ✅ ফিক্সড: এখানে সরাসরি লাইক সিস্টেম চালু করা হলো
        }
    } catch (e) {
        console.error("ডেটা লোড করতে সমস্যা:", e);
    }
});

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    // ১. দাম ও ইউনিট
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // ইমেজ গ্যালারি
    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));
    if (data.documents?.khotian) images.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) images.push(data.documents.sketch.url || data.documents.sketch);

    const gallery = document.getElementById('p-gallery');
    if (gallery) {
        gallery.innerHTML = '';
        images.slice(0, 5).forEach(url => {
            const div = document.createElement('div');
            div.className = 'gal-item';
            div.innerHTML = `<img src="${url}" onclick="openLightbox('${url}')">`;
            gallery.appendChild(div);
        });
    }

    // পোস্টদাতার ডাটা লোড ও প্রোফাইল পেইজ রিডাইরেক্ট লজিক
    if (data.userId) {
        db.collection('users').doc(data.userId).get().then(userDoc => {
            if (userDoc.exists) {
                const userData = userDoc.data();
                document.getElementById('pub-name').textContent = userData.fullName || userData.name || "সম্মানিত বিক্রেতা";
                if (userData.profilePic) {
                    document.getElementById('pub-avatar').src = userData.profilePic;
                }
            } else {
                document.getElementById('pub-name').textContent = "সাধারণ ইউজার";
            }
        }).catch(() => {
            document.getElementById('pub-name').textContent = "আমার বাড়ি ইউজার";
        });

        const authorTrigger = document.getElementById('authorProfileTrigger');
        if (authorTrigger) {
            authorTrigger.onclick = () => {
                window.location.href = `seller-profile.html?userId=${data.userId}`;
            };
        }
    } else {
        document.getElementById('pub-name').textContent = "বিজ্ঞাপনদাতা";
    }

    if (data.createdAt) {
        let dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        document.getElementById('pub-time').textContent = formatPostTime(dateObj);
    } else {
        document.getElementById('pub-time').textContent = "কিছুক্ষণ আগে";
    }

    const addRow = (tableId, label, value) => {
        if (!value || value === "" || value === "undefined") return;
        const table = document.getElementById(tableId);
        if (table) table.innerHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // ২. 🏠 প্রপার্টির তথ্য
    const basicT = 'table-basic';
    if (document.getElementById(basicT)) {
        document.getElementById(basicT).innerHTML = ""; 
        addRow(basicT, "ক্যাটাগরি", data.category);
        addRow(basicT, "টাইপ", data.type);
        addRow(basicT, "জমির ধরন", data.landType);
        addRow(basicT, "প্রপার্টির বয়স", data.propertyAge? `${data.propertyAge} বছর` : "");
        
        if (data.category === 'ভাড়া') {
            addRow(basicT, "ভাড়ার ধরন", data.rentType);
            addRow(basicT, "ওঠার তারিখ", data.moveInDate);
            addRow(basicT, "অগ্রিম (এডভ্যান্স)", data.advance ? `৳ ${data.advance} টাকা` : "");
        }

        addRow(basicT, "বেডরুম", data.bedrooms || data.rooms? `${data.rooms} টি` : "");
        addRow(basicT, "ডাইনিং", data.dining? `${data.dining} টি` : "");
        addRow(basicT, "বাথরুম", data.bathrooms? `${data.bathrooms} টি` : "");
        addRow(basicT, "কিচেন", data.kitchen? `${data.kitchen} টি` : "");
        addRow(basicT, "বেলকনি", data.balcony? `${data.balcony} টি` : "");
        addRow(basicT, "ফ্লোর নম্বর", data.floorNo || data.floorLevel);
        addRow(basicT, "রাস্তা", data.roadWidth ? `${data.roadWidth} ফিট` : "");
        addRow(basicT, "ফেসিং", data.facing? `${data.facing} দিক` : "");
        
        if (data.utilities && data.utilities.length > 0) {
            addRow(basicT, "সুবিধা সমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);
        }

        let area = data.landArea || data.houseArea || data.areaSqft || data.commercialArea;
        let areaUnit = data.landAreaUnit || data.houseAreaUnit || data.commercialAreaUnit || "";
        addRow(basicT, "পরিমাণ", area ? `${area} (${areaUnit})` : "");
    }

    // ৩. 📑 মালিকানা তথ্য
    const ownerSection = document.getElementById('section-owner');
    if (ownerSection) {
        if (data.category === 'বিক্রয়' && data.owner) {
            ownerSection.style.display = 'block';
            const ownT = 'table-owner';
            if (document.getElementById(ownT)) {
                document.getElementById(ownT).innerHTML = "";
                addRow(ownT, "দাতার নাম", data.owner.donorName);
                let khotian = data.owner.khotianNo;
                let khotianType = data.owner.khotianNoType || "";
                addRow(ownT, "খতিয়ান নং", khotian ? `${khotian} (${khotianType})` : "");
                let dag = data.owner.dagNo;
                let dagType = data.owner.dagNoType || "";
                addRow(ownT, "দাগ নং", dag ? `${dag} (${dagType})` : "");
                addRow(ownT, "মৌজা", data.owner.mouja);
            }
        } else {
            ownerSection.style.display = 'none';
        }
    }
    
    // ৪. 📍 অবস্থান
    const locT = 'table-location';
    if (document.getElementById(locT)) {
        document.getElementById(locT).innerHTML = "";
        addRow(locT, "জেলা", data.location?.district);
        addRow(locT, "এরিয়া", data.location?.areaType);
        addRow(locT, "উপজেলা", data.location?.upazila);
        addRow(locT, "থানা", data.location?.thana);
        addRow(locT, "ইউনিয়ন", data.location?.union);
        addRow(locT, "ওয়ার্ড নম্বর", data.location?.wardNo);
        addRow(locT, "গ্রাম/এলাকা", data.location?.village);
        addRow(locT, "রাস্তা", data.location?.road);
    }

    if (data.location && data.location.lat && data.location.lng) {
        initSinglePropertyMap(data);
    }

    // ৫. 📞 যোগাযোগ ও মেসেজ অ্যাকশন
    const conT = 'table-contact';
    if (document.getElementById(conT)) {
        document.getElementById(conT).innerHTML = "";
        addRow(conT, "প্রাথমিক ফোন", data.phoneNumber);
        addRow(conT, "অতিরিক্ত ফোন", data.secondaryPhone);
    }
    if (document.getElementById('p-call')) {
        document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
    }

    const msgBtn = document.getElementById('p-message');
    if (msgBtn) {
        msgBtn.onclick = () => {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) { 
                alert("মেসেজ করতে প্রথমে লগইন করুন।"); 
                window.location.href = "auth.html"; 
                return; 
            }
            if (currentUser.uid === data.userId) { 
                alert("এটি আপনার নিজের পোস্ট!"); 
                return; 
            }
            const chatId = [currentUser.uid, data.userId].sort().join('_') + `_${postId}`;
            window.location.href = `messages.html?chatId=${chatId}&postId=${postId}`;
        };
    }

    // ফেইসবুক শেয়ারের জন্য মেটা ট্যাগ ডাইনামিক করা
const currentUrl = window.location.href;
document.getElementById('og-url')?.setAttribute('content', currentUrl);
document.getElementById('og-title')?.setAttribute('content', data.title || "আমার বাড়ি.কম");
document.getElementById('og-desc')?.setAttribute('content', data.description ? data.description.substring(0, 150) + '...' : "");

if (data.images && data.images.length > 0) {
    const firstImg = data.images[0].url || data.images[0];
    document.getElementById('og-image')?.setAttribute('content', firstImg);
}


// =======================================================
    // 🎯 আমার বাড়ি.কম - এক্সপার্ট ডাইনামিক এসইও ইঞ্জিন (সংশোধিত)
    // =======================================================
    const currentUrl = window.location.href;

    // ১. ডাটাবেজ থেকে গ্রাম, থানা ও জেলা সুনির্দিষ্টভাবে তুলে আনা
    const village = data.location?.village || "তথ্য নেই";
    const thana = data.location?.thana || "তথ্য নেই";
    const district = data.location?.district || "তথ্য নেই";
    const fullLocation = `${village}, ${thana}, ${district}`;

    // ২. গুগল সার্চের জন্য ১০০% নিখুঁত কিওয়ার্ড সমৃদ্ধ টাইটেল ও বিবরণী তৈরি
    const seoTitle = `${data.title || "আমার বাড়ি.কম প্রপার্টি"} - ${thana}, ${district} | আমার বাড়ি.কম`;
    const seoDescription = `${fullLocation}-এ আকর্ষনীয় মূল্যে প্রপার্টি। মূল্য: ৳${data.category === 'বিক্রয়' ? (data.price || "আলোচনা সাপেক্ষ") : (data.monthlyRent || "আলোচনা সাপেক্ষ")} টাকা। বিস্তারিত তথ্য ও ছবির জন্য ভিজিট করুন আমার বাড়ি ডট কম।`;
    
    // ৩. প্রথম ইমেজটি ট্র্যাকিং (স্কিমা ও ফেসবুক শেয়ারের জন্য)
    let firstImg = "https://i.postimg.cc/YSbRvftN/FB-IMG-1781692297303.jpg"; // আপনার ডিফল্ট মেটা ইমেজ ব্যাকআপ হিসেবে
    if (data.images && data.images.length > 0) {
        firstImg = data.images[0].url || data.images[0];
    }

    // ৪. ব্রাউজার এবং গুগল বটের মূল মেটা ট্যাগগুলো আপডেট করা (১০০% নিখুঁত ও ক্লিন রূপ)
    document.title = seoTitle; // ব্রাউজার ট্যাব টাইটেল সরাসরি আপডেট
    
    const seoTitleTag = document.getElementById('seo-title');
    if (seoTitleTag) {
        seoTitleTag.innerText = seoTitle;
    }
    
    document.getElementById('seo-desc')?.setAttribute('content', seoDescription);
    document.getElementById('seo-canonical')?.setAttribute('href', currentUrl);

    // ৫. ফেসবুক ও অন্যান্য সোশ্যাল মিডিয়ার জন্য মেটা ট্যাগ ডাইনামিক করা
    document.getElementById('og-url')?.setAttribute('content', currentUrl);
    document.getElementById('og-title')?.setAttribute('content', seoTitle);
    document.getElementById('og-desc')?.setAttribute('content', seoDescription);
    document.getElementById('og-image')?.setAttribute('content', firstImg);

    // ৬. গুগলে ছবি, দাম, শিরোনাম ও পূর্ণাঙ্গ লোকেশন সরাসরি দেখানোর জন্য এডভান্সড Schema Markup (JSON-LD)
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "RealEstateListing",
        "name": data.title || "আমার বাড়ি.কম প্রপার্টি", 
        "description": data.description ? data.description.substring(0, 200) : seoDescription,
        "url": currentUrl,
        "image": firstImg, 
        "offers": {
            "@type": "Offer",
            "price": data.category === 'বিক্রয়' ? (data.price || 0) : (data.monthlyRent || 0), 
            "priceCurrency": "BDT",
            "availability": "https://schema.org/InStock"
        },
        "location": {
            "@type": "Place",
            "name": fullLocation,
            "address": {
                "@type": "PostalAddress",
                "streetAddress": village,       
                "addressLocality": thana,      
                "addressRegion": district,     
                "addressCountry": "BD"
            }
        }
    };
    
    const schemaTag = document.getElementById('seo-schema');
    if (schemaTag) {
        schemaTag.text = JSON.stringify(schemaData);
    }

    
