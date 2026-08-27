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

let globalPostData = null; // খতিয়ান স্ক্যান করার জন্য পোস্ট ডাটা গ্লোবালি রিসিভ রাখা

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;
    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            globalPostData = doc.data();
            renderDetails(globalPostData);
            loadRelatedPosts(globalPostData);
            setupLikeSystem(globalPostData);
        }
    } catch (e) {
        console.error("ডেটা লোড করতে সমস্যা:", e);
    }
});

function redirectToDLMRS() {
    alert("খতিয়ানে কোনো QR কোড রিড করা সম্ভব হয়নি। আপনাকে DLMRS সরকারি সাইটে রিডাইরেক্ট করা হচ্ছে।");
    window.location.href = "https://dlrms.land.gov.bd";
}

// QR কোড স্ক্যান করার মূল লজিক (ZXing + Canvas Processing)
async function scanQRCodeFromImageUrl(url) {
    // পদ্ধতি ১: ZXing Reader
    try {
        if (window.ZXing) {
            const codeReader = new ZXing.BrowserQRCodeReader();
            const result = await codeReader.decodeFromImageUrl(url);
            if (result && result.text) {
                return result.text;
            }
        }
    } catch (err) {
        console.warn("ZXing Scan Fallback engaged:", err);
    }

    // পদ্ধতি ২: Canvas Scaling + Contrast Boost + jsQR
    return new Promise(async (resolve) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const img = new Image();
            img.src = URL.createObjectURL(blob);

            img.onload = () => {
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');

                let width = img.width;
                let height = img.height;
                const maxDim = 1500;

                if (width > maxDim || height > maxDim) {
                    if (width > height) {
                        height = Math.round((height * maxDim) / width);
                        width = maxDim;
                    } else {
                        width = Math.round((width * maxDim) / height);
                        height = maxDim;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                context.drawImage(img, 0, 0, width, height);

                const imageData = context.getImageData(0, 0, width, height);

                let code = (typeof jsQR !== 'undefined') ? jsQR(imageData.data, width, height, { inversionAttempts: "dontInvert" }) : null;

                if (!code && typeof jsQR !== 'undefined') {
                    const data = imageData.data;
                    for (let i = 0; i < data.length; i += 4) {
                        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                        const threshold = avg > 128 ? 255 : 0;
                        data[i] = threshold;
                        data[i + 1] = threshold;
                        data[i + 2] = threshold;
                    }
                    context.putImageData(imageData, 0, 0);
                    code = jsQR(data, width, height, { inversionAttempts: "attemptBoth" });
                }

                URL.revokeObjectURL(img.src);
                resolve(code ? code.data : null);
            };

            img.onerror = () => resolve(null);
        } catch (error) {
            console.error("Image Fetch Error:", error);
            resolve(null);
        }
    });
}

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

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
            div.innerHTML = `
                <a href="${url}" data-fancybox="gallery" data-caption="আমার বাড়ি প্ল্যাটফর্ম - প্রপার্টি ছবি">
                    <img src="${url}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;">
                </a>
            `;
            gallery.appendChild(div);
        });

        if (typeof Fancybox !== 'undefined') {
            Fancybox.bind("[data-fancybox='gallery']", {
                Images: { Panzoom: { maxScale: 3 } }
            });
        }
    }

    const authorTrigger = document.getElementById('authorProfileTrigger');
    const isCompany = data.ownerType === 'company' || data.authorType === 'company' || !!data.companyId;
    const companyId = data.companyId || data.ownerId || data.authorId;
    const userId = data.userId || data.createdByUid || data.createdByUserId;

    if (isCompany && companyId) {
        db.collection('companies').doc(companyId).get().then(compDoc => {
            if (compDoc.exists) {
                const compData = compDoc.data();
                document.getElementById('pub-name').textContent = compData.companyName || compData.name || data.postedByName || "অফিসিয়াল কোম্পানি";
                const logo = compData.logo || compData.companyLogo || compData.profilePic || data.postedByAvatar;
                if (logo) document.getElementById('pub-avatar').src = logo;
            } else {
                document.getElementById('pub-name').textContent = data.postedByName || "কোম্পানি পেজ";
                if (data.postedByAvatar) document.getElementById('pub-avatar').src = data.postedByAvatar;
            }
        }).catch(() => {
            document.getElementById('pub-name').textContent = data.postedByName || "আমার বাড়ি প্ল্যাটফর্ম কোম্পানি";
        });

        if (authorTrigger) {
            authorTrigger.onclick = () => window.location.href = `seller-profile.html?companyId=${companyId}&mode=company`;
        }
    } else if (userId) {
        db.collection('users').doc(userId).get().then(userDoc => {
            if (userDoc.exists) {
                const userData = userDoc.data();
                document.getElementById('pub-name').textContent = userData.fullName || userData.name || data.postedByName || "সম্মানিত বিক্রেতা";
                const avatar = userData.profilePic || data.postedByAvatar;
                if (avatar) document.getElementById('pub-avatar').src = avatar;
            } else {
                document.getElementById('pub-name').textContent = data.postedByName || "সাধারণ ইউজার";
            }
        }).catch(() => {
            document.getElementById('pub-name').textContent = "আমার বাড়ি প্ল্যাটফর্ম ইউজার";
        });

        if (authorTrigger) {
            authorTrigger.onclick = () => window.location.href = `seller-profile.html?userId=${userId}&mode=user`;
        }
    } else {
        document.getElementById('pub-name').textContent = data.postedByName || "বিজ্ঞাপনদাতা";
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

    const basicT = 'table-basic';
    if (document.getElementById(basicT)) {
        document.getElementById(basicT).innerHTML = ""; 
        addRow(basicT, "ক্যাটাগরি", data.category);
        addRow(basicT, "টাইপ", data.type);
        addRow(basicT, "জমির ধরন", data.landType);
        addRow(basicT, "প্রপার্টির বয়স", data.propertyAge ? `${data.propertyAge} বছর` : "");
        
        if (data.category === 'ভাড়া') {
            addRow(basicT, "ভাড়ার ধরন", data.rentType);
            addRow(basicT, "ওঠার তারিখ", data.moveInDate);
            addRow(basicT, "অগ্রিম (এডভ্যান্স)", data.advance ? `৳ ${data.advance} টাকা` : "");
        }

        addRow(basicT, "বেডরুম", data.bedrooms || data.rooms ? `${data.rooms} টি` : "");
        addRow(basicT, "ডাইনিং", data.dining ? `${data.dining} টি` : "");
        addRow(basicT, "বাথরুম", data.bathrooms ? `${data.bathrooms} টি` : "");
        addRow(basicT, "কিচেন", data.kitchen ? `${data.kitchen} টি` : "");
        addRow(basicT, "বেলকনি", data.balcony ? `${data.balcony} টি` : "");
        addRow(basicT, "ফ্লোর নম্বর", data.floorNo || data.floorLevel);
        addRow(basicT, "রাস্তা", data.roadWidth ? `${data.roadWidth} ফিট` : "");
        addRow(basicT, "ফেসিং", data.facing ? `${data.facing} দিক` : "");
        
        if (data.utilities && data.utilities.length > 0) {
            addRow(basicT, "সুবিধা সমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);
        }

        let area = data.landArea || data.houseArea || data.areaSqft || data.commercialArea;
        let areaUnit = data.landAreaUnit || data.houseAreaUnit || data.areaSqftUnit || data.commercialAreaUnit || "";
        addRow(basicT, "পরিমাণ", area ? `${area} (${areaUnit})` : "");
    }

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
                addRow(ownT, "দাগ নং", dag ? `${dag}` : "");
                addRow(ownT, "মৌজা", data.owner.mouja);
            }
        } else {
            ownerSection.style.display = 'none';
        }
    }
    
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

    const conT = 'table-contact';
    if (document.getElementById(conT)) {
        document.getElementById(conT).innerHTML = "";
        addRow(conT, "প্রাথমিক ফোন", data.phoneNumber);
        addRow(conT, "অতিরিক্ত ফোন", data.secondaryPhone);
    }
    if (document.getElementById('p-call')) {
        document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
    }

    firebase.auth().onAuthStateChanged((currentUser) => {
        const creatorId = data.userId || data.createdByUid;
        
        const callBtn = document.getElementById('p-call');
        const msgBtn = document.getElementById('p-message');
        const saveBtn = document.getElementById('p-save');
        
        const editBtn = document.getElementById('p-edit');
        const boostBtn = document.getElementById('p-boost');
        const deleteBtn = document.getElementById('p-delete');

        if (currentUser && currentUser.uid === creatorId) {
            if (callBtn) callBtn.style.display = 'none';
            if (msgBtn) msgBtn.style.display = 'none';
            if (saveBtn) saveBtn.style.display = 'none';

            if (editBtn) editBtn.style.display = 'flex';
            if (boostBtn) boostBtn.style.display = 'flex';
            if (deleteBtn) deleteBtn.style.display = 'flex';

            if (editBtn) editBtn.onclick = () => window.location.href = `post.html?edit=${postId}`;
            if (boostBtn) boostBtn.onclick = (e) => { e.preventDefault(); alert("ফিচারটি অতিশিগ্রই আসছে, সাইটের কাজ চলমান।"); };
            if (deleteBtn) {
                deleteBtn.onclick = async () => {
                    if (confirm("আপনি কি নিশ্চিতভাবে এই প্রপার্টিটি ডিলিট করতে চান?")) {
                        try {
                            await db.collection('properties').doc(postId).delete();
                            alert("প্রপার্টিটি সফলভাবে ডিলিট করা হয়েছে।");
                            window.location.href = "index.html";
                        } catch (error) {
                            console.error("ডিলিট করতে সমস্যা:", error);
                            alert("দুঃখিত, পোস্টটি ডিলিট করা যায়নি।");
                        }
                    }
                };
            }
        } else {
            if (callBtn && data.phoneNumber) callBtn.style.display = 'flex';
            if (msgBtn) msgBtn.style.display = 'flex';
            if (saveBtn) saveBtn.style.display = 'flex';

            if (editBtn) editBtn.style.display = 'none';
            if (boostBtn) boostBtn.style.display = 'none';
            if (deleteBtn) deleteBtn.style.display = 'none';
        }
    });

    const msgBtn = document.getElementById('p-message');
    if (msgBtn) {
        msgBtn.onclick = async () => {
            const currentUser = firebase.auth().currentUser;
            if (!currentUser) { 
                alert("মেসেজ করতে প্রথমে লগইন করুন।"); 
                window.location.href = "auth.html"; 
                return; 
            }

            const activeIdentityType = localStorage.getItem('activeIdentityType') || 'user';
            const senderType = activeIdentityType;
            let senderId = currentUser.uid;

            if (senderType === 'company') {
                const storedCompanyId = localStorage.getItem('activeCompanyId');
                if (storedCompanyId) senderId = storedCompanyId;
            }

            const receiverType = isCompany ? 'company' : 'user';
            const receiverId = isCompany ? companyId : userId;
            const receiverOwnerUid = data.userId || data.createdByUid;

            if (!receiverId || !postId) {
                alert("প্রপার্টি বা বিক্রেতার তথ্য পাওয়া যায়নি। আবার চেষ্টা করুন।");
                return;
            }

            if (senderId === receiverId || currentUser.uid === receiverOwnerUid) {
                alert("আপনি নিজের প্রপার্টি পোস্টে মেসেজ পাঠাতে পারবেন না।");
                return;
            }

            const sortedIds = [senderId, receiverId].sort();
            const chatId = `${sortedIds[0]}_${sortedIds[1]}`;

            const participantsSet = new Set([currentUser.uid, senderId, receiverId]);
            if (receiverOwnerUid) participantsSet.add(receiverOwnerUid);
            const participants = Array.from(participantsSet);

            try {
                const chatRef = db.collection('chats').doc(chatId);
                const chatDoc = await chatRef.get();

                if (!chatDoc.exists) {
                    await chatRef.set({
                        chatId: chatId,
                        participants: participants,
                        senderId: senderId,
                        senderType: senderType,
                        senderUserUid: currentUser.uid,
                        receiverId: receiverId,
                        receiverType: receiverType,
                        receiverUserUid: receiverOwnerUid || null,
                        companyId: isCompany ? companyId : (senderType === 'company' ? senderId : null),
                        postId: postId,
                        postTitle: data.title || "প্রপার্টি চ্যাট",
                        lastMessage: "চ্যাট শুরু হয়েছে...",
                        lastSenderId: senderId,
                        isUnread: true,
                        chatType: `${senderType}_to_${receiverType}`, 
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    });
                } else {
                    await chatRef.update({
                        postId: postId,
                        postTitle: data.title || "প্রপার্টি চ্যাট"
                    });
                }

                window.location.href = `messages.html?chatId=${chatId}&postId=${postId}&action=direct`;

            } catch (error) {
                console.error("ফায়ারস্টোর চ্যাট এরর ডিটেইলস:", error);
                alert(`দুঃখিত, চ্যাট রুম তৈরি করা যায়নি।`);
            }
        };
    }

    const currentUrl = window.location.href;
    const village = data.location?.village || "";
    const thana = data.location?.thana || data.location?.upazila || "";
    const district = data.location?.district || "";
    const fullLocation = `${village ? village + ', ' : ''}${thana ? thana + ', ' : ''}${district}`;

    const seoTitle = `${data.title || "আমার বাড়ি প্ল্যাটফর্ম প্রপার্টি"} - ${thana}, ${district} | আমার বাড়ি`;
    const seoDescription = `${fullLocation}-এ আকর্ষণীয় মূল্যে প্রপার্টি। মূল্য: ৳${data.category === 'বিক্রয়' ? (data.price || "আলোচনা সাপেক্ষ") : (data.monthlyRent || "আলোচনা সাপেক্ষ")} টাকা। বিস্তারিত তথ্য ও ছবির জন্য ভিজিট করুন আমার বাড়ি প্ল্যাটফর্ম।`;
    
    let firstImg = "https://i.postimg.cc/YSbRvftN/FB-IMG-1781692297303.jpg"; 
    if (data.images && data.images.length > 0) {
        firstImg = data.images[0].url || data.images[0];
    }

    document.title = seoTitle; 
    
    const seoTitleTag = document.getElementById('seo-title');
    if (seoTitleTag) seoTitleTag.innerText = seoTitle;
    
    document.getElementById('seo-desc')?.setAttribute('content', seoDescription);
    document.getElementById('seo-canonical')?.setAttribute('href', currentUrl);

    document.getElementById('og-url')?.setAttribute('content', currentUrl);
    document.getElementById('og-title')?.setAttribute('content', seoTitle);
    document.getElementById('og-desc')?.setAttribute('content', seoDescription);
    document.getElementById('og-image')?.setAttribute('content', firstImg);

    setupSaveAndShareSystem(data, isCompany ? companyId : userId);
} 

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

async function setupLikeSystem(postData) {
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
                const currentPostData = doc.data();
                const totalLikes = currentPostData.likes || 0;
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

            if (isLiked) {
                const currentUser = firebase.auth().currentUser;
                const recipientId = postData.companyId || postData.ownerId || postData.userId;
                if (currentUser && currentUser.uid !== recipientId) {
                    writeNotificationToFirestore(
                        recipientId,              
                        currentUser.uid,                
                        postId,                         
                        "লাইক পেয়েছেন! 👍",
                        `একজন ইউজার আপনার '${postData.title}' প্রপার্টিটি লাইক করেছেন! আপনার বিজ্ঞাপনের জনপ্রিয়তা বাড়ছে।`,
                        "like"
                    );
                }
            }
        } catch (e) {
            console.log("ফায়ারবেসে লাইক ডেটা আপডেট করতে সমস্যা:", e);
        }
    });
}

function setupSaveAndShareSystem(postData, sellerId) {
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
            alert(isSaved ? "পোস্টটি সফলভাবে সেভ করা হয়েছে!" : "সেভ তালিকা থেকে বাদ দেওয়া হয়েছে।");

            if (isSaved) {
                const currentUser = firebase.auth().currentUser;
                if (currentUser) {
                    if (currentUser.uid !== sellerId) {
                        writeNotificationToFirestore(
                            sellerId,
                            currentUser.uid,
                            postId,
                            "বুকমার্ক অ্যালার্ট! ❤️",
                            `একজন সম্ভাব্য ক্রেতা আপনার '${postData.title}' প্রপার্টিটি বুকমার্ক করে সেভ রেখেছেন।`,
                            "save"
                        );
                    }
                } else {
                    writeNotificationToLocalStorage(
                        postId,
                        "বিজ্ঞাপনটি সফলভাবে সেভ হয়েছে! 📌",
                        `এই বাড়িটির মালিক যদি কখনো দাম কমান বা নতুন কোনো তথ্য আপডেট করেন, আমরা আপনাকে সরাসরি এখানে জানিয়ে দেব।`,
                        "save"
                    );
                }
            }
        };
    }

    if (shareBtn) {
        shareBtn.onclick = async () => {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: postData.title || "আমার বাড়ি প্ল্যাটফর্ম প্রপার্টি",
                        text: `আমার বাড়ি প্ল্যাটফর্মে এই চমৎকার প্রপার্টিটি দেখুন: ${postData.title}`,
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

// 🎯 খতিয়ান যাচাইকরণ বাটন লজিক (QR Scan Integration)
document.addEventListener('DOMContentLoaded', () => {
    const khotiyanButton = document.getElementById('btn-verify-khotian');
    if (khotiyanButton) {
        khotiyanButton.addEventListener('click', async (event) => {
            event.preventDefault();
            
            const originalText = khotiyanButton.innerHTML;
            khotiyanButton.innerHTML = `<i class="material-icons">sync</i> খতিয়ান স্ক্যান হচ্ছে...`;
            khotiyanButton.disabled = true;

            try {
                const khotianImgUrl = globalPostData?.documents?.khotian?.url || 
                                     globalPostData?.documents?.khotian || 
                                     (Array.isArray(globalPostData?.documents?.khotian) ? globalPostData.documents.khotian[0]?.url : null);

                if (!khotianImgUrl) {
                    redirectToDLMRS();
                    return;
                }

                // QR Scan Process Call
                const qrData = await scanQRCodeFromImageUrl(khotianImgUrl);

                if (qrData) {
                    if (qrData.startsWith("http://") || qrData.startsWith("https://")) {
                        window.location.href = qrData;
                    } else {
                        alert(`খতিয়ান তথ্য পাওয়া গেছে: ${qrData}`);
                    }
                } else {
                    redirectToDLMRS();
                }

                // নোটিফিকেশন লজিক
                if (postId && globalPostData) {
                    const currentUser = firebase.auth().currentUser;
                    const recipientId = globalPostData.companyId || globalPostData.ownerId || globalPostData.userId;
                    if (currentUser && currentUser.uid !== recipientId) {
                        writeNotificationToFirestore(
                            recipientId,
                            currentUser.uid,
                            postId,
                            "খতিয়ান যাচাই হচ্ছে! 🔍",
                            `অভিনন্দন! একজন ক্রেতা আপনার '${globalPostData.title}' প্রপার্টির খতিয়ান যাচাই করে দেখছেন।`,
                            "khotian"
                        );
                    }
                }

            } catch (err) {
                console.error("খতিয়ান প্রসেসিং ত্রুটি:", err);
                redirectToDLMRS();
            } finally {
                khotiyanButton.innerHTML = originalText;
                khotiyanButton.disabled = false;
            }
        });
    }
});

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
    const seeMoreBtn = document.getElementById('btn-see-more');
    if (!list) return;

    try {
        const snapshot = await db.collection('properties')
            .where('category', '==', currentData.category)
            .limit(25) 
            .get();

        let allPosts = [];
        snapshot.forEach(doc => {
            if (doc.id !== postId) allPosts.push({ id: doc.id, ...doc.data() });
        });

        allPosts.sort((a, b) => {
            const aType = (a.type === currentData.type) ? 1 : 0;
            const bType = (b.type === currentData.type) ? 1 : 0;
            if (aType !== bType) return bType - aType;

            const aVillage = (a.location?.village === currentData.location?.village) ? 1 : 0;
            const bVillage = (b.location?.village === currentData.location?.village) ? 1 : 0;
            if (aVillage !== bVillage) return bVillage - aVillage;

            const aThana = (a.location?.thana === currentData.location?.thana || a.location?.upazila === currentData.location?.upazila) ? 1 : 0;
            const bThana = (b.location?.thana === currentData.location?.thana || b.location?.upazila === currentData.location?.upazila) ? 1 : 0;
            return bThana - aThana;
        });

        list.innerHTML = "";
        let displayedCount = 0;
        const limitIncrement = 10; 

        const renderPostCards = (start, end) => {
            const slice = allPosts.slice(start, end);
            slice.forEach(post => {
                let pAmt = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
                let pUnit = post.priceUnit || post.rentUnit || "";
                list.innerHTML += `
                    <div class="rel-card" onclick="location.href='details.html?id=${post.id}'">
                        <img src="${post.images?.[0]?.url || post.images?.[0] || 'placeholder.jpg'}" alt="Related Property">
                        <div class="rel-info">
                            <h4 class="rel-title">${post.title}</h4>
                            <p class="rel-price">৳ ${pAmt} (${pUnit})</p>
                            <p class="rel-loc">${post.location?.village || ''}, ${post.location?.thana || post.location?.upazila || ''}, ${post.location?.district || ''}</p>
                        </div>
                    </div>`;
            });
            displayedCount = end;
        };

        renderPostCards(0, Math.min(10, allPosts.length));

        if (allPosts.length > 10 && seeMoreBox) {
            seeMoreBox.style.display = 'block';
            if (seeMoreBtn) {
                seeMoreBtn.onclick = () => {
                    const nextLimit = Math.min(displayedCount + limitIncrement, allPosts.length);
                    renderPostCards(displayedCount, nextLimit);
                    if (displayedCount >= allPosts.length) {
                        seeMoreBox.style.display = 'none';
                    }
                };
            }
        } else if (seeMoreBox) {
            seeMoreBox.style.display = 'none';
        }
    } catch (e) { 
        console.error("সম্পর্কিত পোস্ট লোড করতে সমস্যা:", e); 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar?.classList.add('active');
            overlay?.classList.add('active');
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

async function writeNotificationToFirestore(recipientId, senderId, postId, title, message, type) {
    try {
        const notifData = {
            userId: recipientId,      
            senderId: senderId,        
            postId: postId,            
            title: title,
            message: message,
            type: type,                
            isRead: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        await db.collection("notifications").add(notifData);
        console.log("ফায়ারস্টোরে নোটিফিকেশন সফলভাবে লেখা হয়েছে।");
    } catch (error) {
        console.error("ফায়ারস্টোরে নোটিফিকেশন লিখতে ত্রুটি: ", error);
    }
}

function writeNotificationToLocalStorage(postId, title, message, type) {
    let guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
    const newNotification = {
        postId: postId,
        title: title,
        message: message,
        type: type,
        isRead: false,
        timestamp: { seconds: Math.floor(Date.now() / 1000) } 
    };
    guestNotifications.unshift(newNotification);
    localStorage.setItem("guest_notifications", JSON.stringify(guestNotifications));
    console.log("গেস্ট নোটিফিকেশন লোকাল স্টোরেজে লেখা হয়েছে।");
    }
