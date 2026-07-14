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
            setupLikeSystem(); 
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
        let areaUnit = data.landAreaUnit || data.houseAreaUnit || data.areaSqftUnit || data.commercialAreaUnit || "";
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
                addRow(ownT, "দাগ নং", dag ? `${dag}` : "");
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

    // =======================================================
    // 📞 ৫. বাটন ও অ্যাকশন কন্ট্রোল (ভিজিটর বনাম পোস্টদাতা)
    // =======================================================
    
    // সিএসএস টেবিল ও কল লিংক ডিফল্ট সেটআপ
    const conT = 'table-contact';
    if (document.getElementById(conT)) {
        document.getElementById(conT).innerHTML = "";
        addRow(conT, "প্রাথমিক ফোন", data.phoneNumber);
        addRow(conT, "অতিরিক্ত ফোন", data.secondaryPhone);
    }
    if (document.getElementById('p-call')) {
        document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
    }

    // অথেনটিকেশন চেক করে বাটন টগল করা
    firebase.auth().onAuthStateChanged((currentUser) => {
        const sellerId = data.userId;
        
        // বাটনগুলোর এলিমেন্ট রেফারেন্স
        const callBtn = document.getElementById('p-call');
        const msgBtn = document.getElementById('p-message');
        const saveBtn = document.getElementById('p-save');
        
        const editBtn = document.getElementById('p-edit');
        const boostBtn = document.getElementById('p-boost');
        const deleteBtn = document.getElementById('p-delete');

        // যদি ইউজার লগইন করা থাকে এবং তিনিই এই পোস্টের মালিক হন
        if (currentUser && currentUser.uid === sellerId) {
            // ভিজিটর বাটনগুলো হাইড করুন
            if (callBtn) callBtn.style.display = 'none';
            if (msgBtn) msgBtn.style.display = 'none';
            if (saveBtn) saveBtn.style.display = 'none';

            // নিজের বাটনগুলো শো করুন
            if (editBtn) editBtn.style.display = 'flex';
            if (boostBtn) boostBtn.style.display = 'flex';
            if (deleteBtn) deleteBtn.style.display = 'flex';

            // --- ওনার অ্যাকশন বাটনগুলোর ইভেন্ট লিসেনার ---
            if (editBtn) {
                editBtn.onclick = () => {
                    window.location.href = `post.html?edit=${postId}`;
                };
            }
            if (boostBtn) {
                boostBtn.onclick = () => {
                    window.location.href = `boost.html?id=${postId}`;
                };
            }
            if (deleteBtn) {
                deleteBtn.onclick = async () => {
                    if (confirm("আপনি কি নিশ্চিতভাবে এই প্রপার্টিটি ডিলিট করতে চান?")) {
                        try {
                            await db.collection('properties').doc(postId).delete();
                            alert("প্রপার্টিটি সফলভাবে ডিলিট করা হয়েছে।");
                            window.location.href = "index.html"; // ড্যাশবোর্ডে ফেরত পাঠানো
                        } catch (error) {
                            console.error("ডিলিট করতে সমস্যা:", error);
                            alert("দুঃখিত, পোস্টটি ডিলিট করা যায়নি।");
                        }
                    }
                };
            }

        } else {
            // ইউজার যদি ভিজিটর হন (অথবা লগইন না থাকে)
            if (callBtn && data.phoneNumber) callBtn.style.display = 'flex';
            if (msgBtn) msgBtn.style.display = 'flex';
            if (saveBtn) saveBtn.style.display = 'flex';

            // ওনার বাটনগুলো হাইড রাখুন
            if (editBtn) editBtn.style.display = 'none';
            if (boostBtn) boostBtn.style.display = 'none';
            if (deleteBtn) deleteBtn.style.display = 'none';
        }
    });

    // মেসেজ বাটনের ক্লিকের মূল লজিক (ভিজিটরদের জন্য)
    const msgBtn = document.getElementById('p-message');
    if (msgBtn) {
        msgBtn.onclick = async () => {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) { 
                alert("মেসেজ করতে প্রথমে লগইন করুন।"); 
                window.location.href = "auth.html"; 
                return; 
            }

            const sellerId = data.userId;
            if (!sellerId || !postId) {
                alert("প্রপার্টি বা বিক্রেতার তথ্য পাওয়া যায়নি। আবার চেষ্টা করুন।");
                return;
            }

            const sortedUserIds = [currentUser.uid, sellerId].sort();
            const chatId = `${sortedUserIds[0]}_${sortedUserIds[1]}_${postId}`;

            try {
                const chatRef = db.collection('chats').doc(chatId);
                const chatDoc = await chatRef.get();

                if (!chatDoc.exists) {
                    await chatRef.set({
                        chatId: chatId,
                        participants: [currentUser.uid, sellerId],
                        postId: postId,
                        postTitle: data.title || "প্রপার্টি চ্যাট",
                        lastMessage: "চ্যাট শুরু হয়েছে...",
                        senderId: currentUser.uid,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                window.location.href = `messages.html?chatId=${chatId}&postId=${postId}&action=direct`;

            } catch (error) {
                console.error("ফায়ারস্টোর চ্যাট এরর ডিটেইলস:", error);
                alert(`দুঃখিত, চ্যাট রুম তৈরি করা যায়নি।`);
            }
        };
            }
    
    
    // =======================================================
    // 🎯 আমার বাড়ি.কম - এক্সপার্ট ডাইনামিক এসইও ইঞ্জিন
    // =======================================================
    const currentUrl = window.location.href;

    const village = data.location?.village || "তথ্য নেই";
    const thana = data.location?.thana || "তথ্য নেই";
    const upazila = data.location?.upazila || "তথ্য নেই";
    const district = data.location?.district || "তথ্য নেই";
    const fullLocation = `${village}, ${thana || upazila}, ${district}`;

    const seoTitle = `${data.title || "আমার বাড়ি.কম প্রপার্টি"} - ${thana || upazila}, ${district} | আমার বাড়ি.অনলাইন`;
    const seoDescription = `${fullLocation}-এ আকর্ষনীয় মূল্যে প্রপার্টি। মূল্য: ৳${data.category === 'বিক্রয়' ? (data.price || "আলোচনা সাপেক্ষ") : (data.monthlyRent || "আলোচনা সাপেক্ষ")} টাকা। বিস্তারিত তথ্য ও ছবির জন্য ভিজিট করুন amarbari.online।`;
    
    let firstImg = "https://i.postimg.cc/YSbRvftN/FB-IMG-1781692297303.jpg"; 
    if (data.images && data.images.length > 0) {
        firstImg = data.images[0].url || data.images[0];
    }

    document.title = seoTitle; 
    
    const seoTitleTag = document.getElementById('seo-title');
    if (seoTitleTag) {
        seoTitleTag.innerText = seoTitle;
    }
    
    document.getElementById('seo-desc')?.setAttribute('content', seoDescription);
    document.getElementById('seo-canonical')?.setAttribute('href', currentUrl);

    document.getElementById('og-url')?.setAttribute('content', currentUrl);
    document.getElementById('og-title')?.setAttribute('content', seoTitle);
    document.getElementById('og-desc')?.setAttribute('content', seoDescription);
    document.getElementById('og-image')?.setAttribute('content', firstImg);

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
                "addressLocality": thana || upazila,      
                "addressRegion": district,     
                "addressCountry": "BD"
            }
        }
    };
    
    const schemaTag = document.getElementById('seo-schema');
    if (schemaTag) {
        schemaTag.text = JSON.stringify(schemaData);
    }

    setupSaveAndShareSystem(data);
} // <--- renderDetails ফাংশনটি এখানে সুরক্ষিতভাবে শেষ হয়েছে।

function initSinglePropertyMap(data) {
    const mapContainer = document.getElementById('map-container');
    if (!mapContainer) return;
    try {
        const map = L.map('map-container').setView([data.location.lat, data.location.lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);

        const propertyType = data.type || data.propertyType || 'প্রপার্টি';
        const redPinIcon = L.divIcon({
            html: `
                <div style="position: relative; width: 60px; height: 35px; display: flex; flex-direction: column; align-items: center;">
                    <div style="background-color: #e74c3c; color: white; padding: 4px 8px; border-radius: 15px; font-size: 11px; font-weight: bold; white-space: nowrap; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); text-align: center; min-width: 50px;">
                        ${propertyType}
                    </div>
                    <div style="width: 0; height: 0; border-left: 7px solid transparent; border-right: 7px solid transparent; border-top: 10px solid #e74c3c; margin-top: -2px;"></div>
                </div>`,
            className: 'custom-pin',
            iconSize: [60, 45],
            iconAnchor: [30, 45]
        });

        L.marker([data.location.lat, data.location.lng], { icon: redPinIcon })
         .addTo(map)
         .bindPopup(`<b>${data.title}</b><br>লোকেশন এখানে`)
         .openPopup();
    } catch (e) {
        console.error("ম্যাপ লোড এরর:", e);
    }
}

async function setupLikeSystem() {
    const likeBtn = document.getElementById('likeBtn');
    const likeIcon = document.getElementById('likeIcon');
    if (!likeBtn) return;

    const storageKey = `liked_post_${postId}`;
    let isLiked = localStorage.getItem(storageKey) === 'true';

    const updateLikeUI = (status) => {
        if (status) {
            if (likeIcon) { likeIcon.textContent = 'thumb_up'; likeIcon.style.color = '#007bff'; }
        } else {
            if (likeIcon) { likeIcon.textContent = 'thumb_up_off_alt'; likeIcon.style.color = '#7f8c8d'; }
        }
    };

    updateLikeUI(isLiked);

    try {
        db.collection('properties').doc(postId).onSnapshot((doc) => {
            if (doc.exists) {
                const postData = doc.data();
                const totalLikes = postData.likes || 0;
                const likeCountText = document.getElementById('likeCountText');
                if (likeCountText) likeCountText.textContent = `${totalLikes} লাইক`;
            }
        });
    } catch (err) {
        console.log("লাইক সংখ্যা রিড করতে সমস্যা:", err);
    }

    likeBtn.addEventListener('click', async () => {
        isLiked = !isLiked;
        localStorage.setItem(storageKey, isLiked);
        updateLikeUI(isLiked);

        try {
            const postRef = db.collection('properties').doc(postId);
            await postRef.update({
                likes: firebase.firestore.FieldValue.increment(isLiked ? 1 : -1)
            });
        } catch (e) {
            console.log("ফায়ারবেসে লাইক ডেটা আপডেট করতে সমস্যা:", e);
        }
    });
}

function setupSaveAndShareSystem(data) {
    const saveBtn = document.getElementById('p-save');
    const shareBtn = document.getElementById('p-share');
    const currentUrl = window.location.href;

    if (saveBtn) {
        const saveStorageKey = `saved_post_${postId}`;
        let isSaved = localStorage.getItem(saveStorageKey) === 'true';

        const updateSaveUI = (status) => {
            const icon = saveBtn.querySelector('i');
            if (icon) {
                if (status) {
                    icon.textContent = 'bookmark'; 
                    saveBtn.style.color = '#27ae60'; 
                    if (saveBtn.querySelector('span')) saveBtn.querySelector('span').textContent = 'সেভড';
                } else {
                    icon.textContent = 'bookmark_border'; 
                    saveBtn.style.color = '#2c3e50';
                    if (saveBtn.querySelector('span')) saveBtn.querySelector('span').textContent = 'সেভ';
                }
            }
        };

        updateSaveUI(isSaved);

        saveBtn.onclick = () => {
            isSaved = !isSaved;
            localStorage.setItem(saveStorageKey, isSaved);
            updateSaveUI(isSaved);
            alert(isSaved ? "পোস্টটি আপনার ব্রাউজারে সেভ করা হয়েছে!" : "সেভ তালিকা থেকে বাদ দেওয়া হয়েছে।");
        };
    }

    if (shareBtn) {
        shareBtn.onclick = async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: data.title || "আমার বাড়ি.কম প্রপার্টি",
                        text: `আমার বাড়ি.কম-এ এই চমৎকার প্রপার্টিটি দেখুন: ${data.title}`,
                        url: currentUrl
                    });
                } catch (err) {
                    console.log("শেয়ার বাতিল বা ব্যর্থ হয়েছে:", err);
                }
            } else {
                const fbShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
                window.open(fbShareUrl, '_blank', 'width=600,height=400');
            }
        };
    }
}

function formatPostTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMins / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffWeek / 4);

    if (diffMins < 1) return "এইমাত্র";
    if (diffMins < 60) return `${diffMins} মিনিট আগে`;
    if (diffHour < 24) return `${diffHour} ঘণ্টা আগে`;
    if (diffDay < 7) return `${diffDay} দিন আগে`;
    if (diffWeek < 4) return `${diffWeek} সপ্তাহ আগে`;
    if (diffMonth < 3) return `${diffMonth} মাস আগে`;

    return date.toLocaleDateString('bn-BD', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');
    const seeMoreBox = document.getElementById('see-more-box');
    if (!list) return;
    try {
        const snapshot = await db.collection('properties')
            .where('category', '==', currentData.category)
            .limit(50) 
            .get();

        let allPosts = [];
        snapshot.forEach(doc => {
            if (doc.id !== postId) allPosts.push({ id: doc.id, ...doc.data() });
        });

        allPosts.sort((a, b) => {
            const aVillage = (a.location?.village === currentData.location?.village) ? 1 : 0;
            const bVillage = (b.location?.village === currentData.location?.village) ? 1 : 0;
            if (aVillage !== bVillage) return bVillage - aVillage;
            const aThana = (a.location?.thana === currentData.location?.thana) ? 1 : 0;
            const bThana = (b.location?.thana === currentData.location?.thana) ? 1 : 0;
            return bThana - aThana;
        });

        list.innerHTML = "";
        allPosts.slice(0, 10).forEach(post => {
            let pAmt = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let pUnit = post.priceUnit || post.rentUnit || "";
            list.innerHTML += `
                <div class="rel-card" onclick="location.href='details.html?id=${post.id}'">
                    <img src="${post.images?.[0]?.url || post.images?.[0] || 'placeholder.jpg'}">
                    <div class="rel-info">
                        <h4 class="rel-title">${post.title}</h4>
                        <p class="rel-price">৳ ${pAmt} (${pUnit})</p>
                        <p class="rel-loc">${post.location?.village || ''}, ${post.location?.thana || post.location?.upazila|| ''}, ${post.location?.district || ''}</p>
                    </div>
                </div>`;
        });
        if (allPosts.length > 10 && seeMoreBox) seeMoreBox.style.display = 'block';
    } catch (e) { console.error(e); }
}

function openLightbox(url) {
    const lbImg = document.getElementById('lb-img');
    const lb = document.getElementById('lightbox');
    if(lbImg && lb) {
        lbImg.src = url;
        lb.style.display = 'flex';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    const closeSidebar = () => {
        if(sidebar && overlay) {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        }
    };

    if (overlay) overlay.addEventListener('click', closeSidebar);

    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');
});


firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    
    if (user && headerProfileImg) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().profilePic) {
                headerProfileImg.src = userDoc.data().profilePic;
            } else if (user.photoURL) {
                headerProfileImg.src = user.photoURL;
            } else {
                headerProfileImg.src = 'assets/images/default-avatar.png';
            }
        } catch (error) {
            console.error("হেডার প্রোফাইল পিকচার লোড করতে ব্যর্থ:", error);
        }
    }
});
