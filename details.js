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

let globalPostData = null;

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


/* =========================================================
   🔎 ADVANCED KHATIAN QR SCANNER ENGINE
   ========================================================= */

/**
 * Image URL থেকে HTMLImageElement load করা
 */
function loadImageForQR(imageUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = () => {
            if (!img.naturalWidth || !img.naturalHeight) {
                reject(new Error("ছবির valid dimension পাওয়া যায়নি।"));
                return;
            }
            resolve(img);
        };

        img.onerror = () => {
            reject(new Error("খতিয়ানের ছবি লোড করা যায়নি।"));
        };

        img.src = imageUrl;
    });
}


/**
 * Canvas থেকে jsQR দিয়ে QR scan
 */
function tryJsQR(canvas) {
    if (typeof jsQR === 'undefined') {
        console.warn("jsQR library পাওয়া যায়নি।");
        return null;
    }

    try {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (!imageData || !imageData.data) return null;

        let result = jsQR(
            imageData.data,
            canvas.width,
            canvas.height,
            { inversionAttempts: "attemptBoth" }
        );

        if (result && result.data) {
            return result.data;
        }

        return null;
    } catch (error) {
        console.warn("jsQR scan failed:", error);
        return null;
    }
}


/**
 * Image-কে Canvas-এ draw করে jsQR scan
 */
function scanCanvasImage(sourceCanvas, scale = 1, enhance = false) {
    try {
        const srcWidth = sourceCanvas.width;
        const srcHeight = sourceCanvas.height;

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(srcWidth * scale));
        canvas.height = Math.max(1, Math.round(srcHeight * scale));

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;

        ctx.imageSmoothingEnabled = false;

        if (enhance) {
            try {
                ctx.filter = "grayscale(1) contrast(220%) brightness(115%)";
            } catch (e) {
                ctx.filter = "none";
            }
        } else {
            ctx.filter = "none";
        }

        ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

        let result = tryJsQR(canvas);
        if (result) return result;

        if (enhance) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const d = imageData.data;

            for (let i = 0; i < d.length; i += 4) {
                const gray = (0.299 * d[i]) + (0.587 * d[i + 1]) + (0.114 * d[i + 2]);
                const threshold = gray > 145 ? 255 : 0;
                d[i] = threshold;
                d[i + 1] = threshold;
                d[i + 2] = threshold;
            }

            ctx.putImageData(imageData, 0, 0);
            result = tryJsQR(canvas);
            if (result) return result;
        }

        return null;
    } catch (error) {
        console.warn("Canvas QR processing failed:", error);
        return null;
    }
}


/**
 * Image rotate করার জন্য Canvas
 */
function rotateCanvas(sourceCanvas, degrees) {
    const radians = degrees * Math.PI / 180;
    const rotated = document.createElement('canvas');
    const ctx = rotated.getContext('2d', { willReadFrequently: true });

    if (!ctx) return null;

    if (degrees === 90 || degrees === 270) {
        rotated.width = sourceCanvas.height;
        rotated.height = sourceCanvas.width;
    } else {
        rotated.width = sourceCanvas.width;
        rotated.height = sourceCanvas.height;
    }

    ctx.imageSmoothingEnabled = false;
    ctx.translate(rotated.width / 2, rotated.height / 2);
    ctx.rotate(radians);
    ctx.drawImage(sourceCanvas, -sourceCanvas.width / 2, -sourceCanvas.height / 2);

    return rotated;
}


/**
 * Crop অঞ্চল তৈরি
 */
function createCropCanvas(sourceCanvas, x, y, width, height) {
    const crop = document.createElement('canvas');
    crop.width = Math.max(1, Math.round(width));
    crop.height = Math.max(1, Math.round(height));

    const ctx = crop.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(sourceCanvas, x, y, width, height, 0, 0, crop.width, crop.height);

    return crop;
}


/**
 * ZXing fallback
 */
async function tryZXingOnCanvas(canvas) {
    if (!window.ZXing) return null;

    try {
        if (typeof ZXing.BrowserMultiFormatReader === 'function') {
            const reader = new ZXing.BrowserMultiFormatReader();
            const image = new Image();
            image.src = canvas.toDataURL("image/png");

            if (typeof reader.decodeFromImageElement === 'function') {
                const result = await reader.decodeFromImageElement(image);
                if (result) {
                    if (typeof result.getText === 'function') return result.getText();
                    if (result.text) return result.text;
                }
            }

            if (typeof reader.decodeFromCanvas === 'function') {
                const result = await reader.decodeFromCanvas(canvas);
                if (result) {
                    if (typeof result.getText === 'function') return result.getText();
                    if (result.text) return result.text;
                }
            }
        }
    } catch (error) {
        console.warn("ZXing QR fallback failed:", error);
    }

    return null;
}


/**
 * একটি canvas-এর বিভিন্ন rotation এবং enhancement দিয়ে QR খোঁজা
 */
async function scanCanvasWithAllMethods(canvas) {
    const scales = [1, 1.5, 2, 3, 4];
    const rotations = [0, 90, 180, 270];

    for (const degree of rotations) {
        let workingCanvas = canvas;
        if (degree !== 0) {
            workingCanvas = rotateCanvas(canvas, degree);
            if (!workingCanvas) continue;
        }

        for (const scale of scales) {
            let result = scanCanvasImage(workingCanvas, scale, false);
            if (result) return result;
        }

        for (const scale of scales) {
            let result = scanCanvasImage(workingCanvas, scale, true);
            if (result) return result;
        }

        let zxingResult = await tryZXingOnCanvas(workingCanvas);
        if (zxingResult) return zxingResult;
    }

    return null;
}


/**
 * Khatiyan-এর সম্ভাব্য QR অঞ্চল তৈরি
 */
function getKhatianScanRegions(canvas) {
    const width = canvas.width;
    const height = canvas.height;

    return [
        { name: "full", x: 0, y: 0, width: width, height: height },
        { name: "bottom-right", x: width * 0.55, y: height * 0.55, width: width * 0.45, height: height * 0.45 },
        { name: "bottom-left", x: 0, y: height * 0.55, width: width * 0.45, height: height * 0.45 },
        { name: "top-right", x: width * 0.55, y: 0, width: width * 0.45, height: height * 0.45 },
        { name: "top-left", x: 0, y: 0, width: width * 0.45, height: height * 0.45 },
        { name: "bottom-half", x: 0, y: height * 0.50, width: width, height: height * 0.50 },
        { name: "top-half", x: 0, y: 0, width: width, height: height * 0.50 },
        { name: "center", x: width * 0.20, y: height * 0.20, width: width * 0.60, height: height * 0.60 },
        { name: "right-half", x: width * 0.50, y: 0, width: width * 0.50, height: height },
        { name: "left-half", x: 0, y: 0, width: width * 0.50, height: height }
    ];
}


/**
 * মূল QR Scanner
 */
async function scanQRCodeFromImageUrl(imageUrl) {
    if (!imageUrl) {
        console.warn("QR scanner: image URL পাওয়া যায়নি।");
        return null;
    }

    try {
        console.log("🔎 Khatian QR Scan শুরু:", imageUrl);
        const img = await loadImageForQR(imageUrl);

        const originalCanvas = document.createElement('canvas');
        const maxDimension = 3000;

        let drawWidth = img.naturalWidth;
        let drawHeight = img.naturalHeight;
        const largest = Math.max(drawWidth, drawHeight);

        if (largest > maxDimension) {
            const ratio = maxDimension / largest;
            drawWidth = Math.round(drawWidth * ratio);
            drawHeight = Math.round(drawHeight * ratio);
        }

        originalCanvas.width = drawWidth;
        originalCanvas.height = drawHeight;

        const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
        if (!originalCtx) throw new Error("Canvas context পাওয়া যায়নি।");

        originalCtx.imageSmoothingEnabled = true;
        originalCtx.drawImage(img, 0, 0, drawWidth, drawHeight);

        // STEP 1: Full Image
        let result = await scanCanvasWithAllMethods(originalCanvas);
        if (result) return result;

        // STEP 2: Regions
        const regions = getKhatianScanRegions(originalCanvas);
        for (const region of regions) {
            const crop = createCropCanvas(originalCanvas, region.x, region.y, region.width, region.height);
            if (!crop) continue;

            result = await scanCanvasWithAllMethods(crop);
            if (result) return result;
        }

        // STEP 3: Grid Search
        const gridColumns = 4, gridRows = 4;
        const cellWidth = originalCanvas.width / gridColumns;
        const cellHeight = originalCanvas.height / gridRows;
        const overlapX = cellWidth * 0.20, overlapY = cellHeight * 0.20;

        for (let row = 0; row < gridRows; row++) {
            for (let col = 0; col < gridColumns; col++) {
                const x = Math.max(0, col * cellWidth - overlapX);
                const y = Math.max(0, row * cellHeight - overlapY);
                const right = Math.min(originalCanvas.width, (col + 1) * cellWidth + overlapX);
                const bottom = Math.min(originalCanvas.height, (row + 1) * cellHeight + overlapY);

                const crop = createCropCanvas(originalCanvas, x, y, right - x, bottom - y);
                if (!crop) continue;

                result = await scanCanvasWithAllMethods(crop);
                if (result) return result;
            }
        }

        return null;
    } catch (err) {
        console.error("❌ QR Scanner Error:", err);
        return null;
    }
}


/* =========================================================
   PROPERTY DETAILS
   ========================================================= */

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || "";
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // Gallery
    let images = [];
    if (data.images) {
        data.images.forEach(img => images.push(img.url || img));
    }
    if (data.documents?.khotian) {
        images.push(data.documents.khotian.url || data.documents.khotian);
    }
    if (data.documents?.sketch) {
        images.push(data.documents.sketch.url || data.documents.sketch);
    }

    const gallery = document.getElementById('p-gallery');
    if (gallery) {
        gallery.innerHTML = '';
        images.slice(0, 5).forEach(url => {
            const div = document.createElement('div');
            div.className = 'gal-item';
            div.innerHTML = `
                <a href="${url}" data-fancybox="gallery" data-caption="আমার বাড়ি প্ল্যাটফর্ম - প্রপার্টি ছবি">
                    <img src="${url}" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer;" alt="Property Image">
                </a>
            `;
            gallery.appendChild(div);
        });

        if (typeof Fancybox !== 'undefined') {
            Fancybox.bind("[data-fancybox='gallery']", { Images: { Panzoom: { maxScale: 3 } } });
        }
    }

    // Seller / Company Info
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

    // Post Time
    if (data.createdAt) {
        let dateObj = data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt);
        document.getElementById('pub-time').textContent = formatPostTime(dateObj);
    } else {
        document.getElementById('pub-time').textContent = "কিছুক্ষণ আগে";
    }

    // Table Helper
    const addRow = (tableId, label, value) => {
        if (!value || value === "" || value === "undefined") return;
        const table = document.getElementById(tableId);
        if (table) {
            table.innerHTML += `
                <tr>
                    <td>${label}</td>
                    <td>${value}</td>
                </tr>
            `;
        }
    };

    // Basic Information
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

    // Owner / Khatian Section
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

    // Location
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

    // Map
    if (data.location && data.location.lat && data.location.lng) {
        initSinglePropertyMap(data);
    }

    // Contact
    const conT = 'table-contact';
    if (document.getElementById(conT)) {
        document.getElementById(conT).innerHTML = "";
        addRow(conT, "প্রাথমিক ফোন", data.phoneNumber);
        addRow(conT, "অতিরিক্ত ফোন", data.secondaryPhone);
    }

    if (document.getElementById('p-call')) {
        document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
    }

    // Auth & Action Buttons
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

    // Message Button Logic
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
                alert("দুঃখিত, চ্যাট রুম তৈরি করা যায়নি।");
            }
        };
    }

    // SEO
    const currentUrl = window.location.href;
    const village = data.location?.village || "";
    const thana = data.location?.thana || data.location?.upazila || "";
    const district = data.location?.district || "";
    const fullLocation = `${village ? village + ', ' : ''}${thana ? thana + ', ' : ''}${district}`;

    const seoTitle = `${data.title || "আমার বাড়ি প্ল্যাটফর্ম প্রপার্টি"} - ${thana}, ${district} | আমার বাড়ি`;
    const seoDescription = `${fullLocation}-এ আকর্ষণীয় মূল্যে প্রপার্টি। মূল্য: ৳${data.category === 'বিক্রয়' ? (data.price || "আলোচনা সাপেক্ষ") : (data.monthlyRent || "আলোচনা সাপেক্ষ")} টাকা। বিস্তারিত তথ্য ও ছবির জন্য ভিজিট করুন আমার বাড়ি প্ল্যাটফর্ম.`;

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


/* =========================================================
   MAP
   ========================================================= */

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
                </div>
            `,
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


/* =========================================================
   LIKE SYSTEM
   ========================================================= */

async function setupLikeSystem(postData) {
    const likeBtn = document.getElementById('likeBtn');
    const likeIcon = document.getElementById('likeIcon');
    if (!likeBtn) return;

    const storageKey = `liked_post_${postId}`;
    let isLiked = localStorage.getItem(storageKey) === 'true';

    const updateLikeUI = (status) => {
        if (status) {
            if (likeIcon) {
                likeIcon.textContent = 'thumb_up';
                likeIcon.style.color = '#007bff';
            }
        } else {
            if (likeIcon) {
                likeIcon.textContent = 'thumb_up_off_alt';
                likeIcon.style.color = '#7f8c8d';
            }
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


/* =========================================================
   SAVE + SHARE
   ========================================================= */

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


/* =========================================================
   🎯 KHATIAN QR VERIFICATION BUTTON & CAMERA CHECK LOGIC
   ========================================================= */

// স্ক্যানার/ক্যামেরা ডিভাইসে এভেলেবল আছে কিনা তা দ্রুত পরীক্ষা
function checkCameraAvailability() {
    return new Promise((resolve) => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            resolve(false);
            return;
        }
        
        // ২ সেকেন্ডের টাইমআউট সহ ডিভাইস চেক
        const timeout = setTimeout(() => resolve(false), 2000);

        navigator.mediaDevices.enumerateDevices()
            .then(devices => {
                clearTimeout(timeout);
                const hasVideo = devices.some(device => device.kind === 'videoinput');
                resolve(hasVideo);
            })
            .catch(() => {
                clearTimeout(timeout);
                resolve(false);
            });
    });
}

// DLRMS পোর্টাল রিডাইরেক্ট ফাংশন
function redirectToDlrmsPortal() {
    window.open("https://dlrms.land.gov.bd", "_blank");
}

document.addEventListener('DOMContentLoaded', () => {
    // ID সহ বা ক্লাস বা টাইটেল দিয়ে বাটন রিটার্ন করা
    const khotiyanButton = document.getElementById('btn-verify-khotian') || document.querySelector('.btn-verify-khotian');

    if (!khotiyanButton) return;

    khotiyanButton.addEventListener('click', async (event) => {
        event.preventDefault();

        const originalText = khotiyanButton.innerHTML;

        // ১. জীবন্ত অ্যানিমেশন ও স্টাইলিং চালুকরণ
        khotiyanButton.classList.add('btn-scanning');
        khotiyanButton.disabled = true;
        khotiyanButton.innerHTML = `<i class="material-icons" style="animation: spin 1s linear infinite;">sync</i> দ্রুত স্ক্যান করা হচ্ছে...`;

        try {
            // ২. ক্যামেরা সাপোর্ট পরীক্ষা
            const isCameraAvailable = await checkCameraAvailability();

            if (!isCameraAvailable) {
                console.warn("স্ক্যানার/ক্যামেরা সার্ভিস পাওয়া যায়নি। DLRMS পোর্টালে নিয়ে যাওয়া হচ্ছে...");
                redirectToDlrmsPortal();
                return;
            }

            // ৩. খতিয়ানের ছবি সংগ্রহ
            let khotianImgUrl = null;
            const khotianDocument = globalPostData?.documents?.khotian;

            if (khotianDocument) {
                if (typeof khotianDocument === 'string') {
                    khotianImgUrl = khotianDocument;
                } else if (khotianDocument.url) {
                    khotianImgUrl = khotianDocument.url;
                } else if (Array.isArray(khotianDocument)) {
                    const first = khotianDocument[0];
                    khotianImgUrl = typeof first === 'string' ? first : (first?.url || null);
                }
            }

            // ছবি না পাওয়া গেলে রিডাইরেক্ট
            if (!khotianImgUrl) {
                redirectToDlrmsPortal();
                return;
            }

            // ৪. QR Code স্ক্যান প্রসেস
            const qrData = await scanQRCodeFromImageUrl(khotianImgUrl);

            if (qrData && (qrData.startsWith("http://") || qrData.startsWith("https://"))) {
                window.open(qrData, '_blank');
            } else if (qrData) {
                alert(`খতিয়ান QR ডাটা পাওয়া গেছে:\n\n${qrData}`);
                redirectToDlrmsPortal();
            } else {
                // স্ক্যান ব্যর্থ হলে রিডাইরেক্ট
                redirectToDlrmsPortal();
            }

        } catch (err) {
            console.error("খতিয়ান প্রসেসিং ত্রুটি:", err);
            redirectToDlrmsPortal();
        } finally {
            // অ্যানিমেশন সমাপ্ত করে বাটনের পূর্বের অবস্থা নিশ্চিত করা
            khotiyanButton.classList.remove('btn-scanning');
            khotiyanButton.innerHTML = originalText;
            khotiyanButton.disabled = false;
        }
    });
});


/* =========================================================
   POST TIME FORMAT
   ========================================================= */

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


/* =========================================================
   RELATED POSTS
   ========================================================= */

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
            if (doc.id !== postId) {
                allPosts.push({ id: doc.id, ...doc.data() });
            }
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
                            <p class="rel-loc">
                                ${post.location?.village || ''},
                                ${post.location?.thana || post.location?.upazila || ''},
                                ${post.location?.district || ''}
                            </p>
                        </div>
                    </div>
                `;
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


/* =========================================================
   MENU / HEADER
   ========================================================= */

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
        if (sidebar && overlay) {
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


/* =========================================================
   NOTIFICATION - FIRESTORE
   ========================================================= */

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
    } catch (error) {
        console.error("ফায়ারস্টোরে নোটিফিকেশন লিখতে ত্রুটি: ", error);
    }
}


/* =========================================================
   NOTIFICATION - LOCAL STORAGE
   ========================================================= */

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
}