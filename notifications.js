// notifications.js - সম্পূর্ণ ডায়নামিক ও স্মার্ট ডুয়েল-মোড নোটিফিকেশন ইঞ্জিন
const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); 

const VAPID_KEY = "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"; 

let currentNotifUnsubscribe = null; // মেমোরি লিক ও ডুপ্লিকেট লিসেনার রোধ করতে ট্র্যাকার

document.addEventListener("DOMContentLoaded", () => {
    initGlobalNotificationSystem();

    // ⚡ মোড সুইচ (ইউজার ↔ কোম্পানি) হলে স্বয়ংক্রিয়ভাবে নোটিফিকেশন ও টোকেন সিঙ্ক হবে
    window.addEventListener('identityChanged', async () => {
        if (auth.currentUser) {
            const activeIdentity = getActiveIdentityData();
            if (activeIdentity) {
                await syncGuestTokenToUser(auth.currentUser.uid, activeIdentity);
                await ensureWelcomeNotification(activeIdentity);
            }
            loadNotificationsForActiveIdentity();
        }
    });
});

// 📌 সক্রিয় আইডেন্টিটি (ইউজার বা পেজ) বের করার সেন্ট্রাল ফাংশন
function getActiveIdentityData() {
    let activeIdentity = null;
    if (typeof window.getActiveIdentity === 'function') {
        activeIdentity = window.getActiveIdentity();
    }

    // fallback: header-sync লোড হতে দেরি হলে localStorage ও Auth থেকে ডেটা নেবে
    if (!activeIdentity && auth.currentUser) {
        const user = auth.currentUser;
        const activeMode = localStorage.getItem('activeIdentityType') || 'user';

        if (activeMode === 'company') {
            const savedCompanyId = localStorage.getItem('activeCompanyId');
            if (savedCompanyId) {
                activeIdentity = {
                    id: savedCompanyId,
                    type: 'company',
                    ownerUid: user.uid,
                    name: localStorage.getItem('activeName') || 'কোম্পানি পেজ',
                    avatar: localStorage.getItem('activeAvatar') || ''
                };
            }
        }

        if (!activeIdentity) {
            activeIdentity = {
                id: user.uid,
                type: 'user',
                ownerUid: user.uid,
                name: user.displayName || 'সম্মানিত গ্রাহক',
                avatar: user.photoURL || ''
            };
        }
    }
    return activeIdentity;
}

function initGlobalNotificationSystem() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("🔓 রেজিস্টার্ড ইউজার একটিভ আছেন।");
            const activeIdentity = getActiveIdentityData();
            if (activeIdentity) {
                await syncGuestTokenToUser(user.uid, activeIdentity);
                await ensureWelcomeNotification(activeIdentity);
            }
            loadNotificationsForActiveIdentity();
        } else {
            console.log("🌐 গেস্ট ইউজার ব্রাউজ করছেন।");
            showGuestMessage();
        }
    });
}

// 🎯 ১. ইউজার বা পেজের জন্য ডায়নামিক ওয়েলকাম নোটিফিকেশন নিশ্চিতকরণ
async function ensureWelcomeNotification(activeIdentity) {
    if (!activeIdentity || !activeIdentity.id) return;

    try {
        const notifRef = db.collection("notifications");
        const snapshot = await notifRef.where("userId", "==", activeIdentity.id).limit(1).get();

        if (snapshot.empty) {
            const isCompany = activeIdentity.type === 'company';
            const targetName = activeIdentity.name || "সম্মানিত গ্রাহক";

            const titleText = isCompany 
                ? `🏢 ${targetName}-এ আপনাকে স্বাগতম!`
                : `👋 ${targetName}, আমার বাড়ি প্ল্যাটফর্মে আপনাকে স্বাগত!`;

            const messageText = isCompany
                ? `আপনার কোম্পানি/পেজ প্রোফাইলটি সফলভাবে সক্রিয় হয়েছে। কাস্টমারদের চ্যাট, মেসেজ ও প্রপার্টি সম্পর্কিত লাইভ আপডেট এখানে দেখতে পাবেন।`
                : `আমাদের সাথে যুক্ত হওয়ার জন্য আপনাকে আন্তরিক ধন্যবাদ। সেরা প্রপার্টি ডিল এবং রিয়েল-টাইম আপডেট পেতে আমাদের সাথেই থাকুন।`;

            await notifRef.add({
                userId: activeIdentity.id,
                ownerUid: auth.currentUser ? auth.currentUser.uid : activeIdentity.id,
                title: titleText,
                message: messageText,
                type: "welcome",
                senderName: targetName,
                isRead: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`✅ ${activeIdentity.type} (${targetName})-এর জন্য স্বাগতম নোটিফিকেশন তৈরি হয়েছে।`);
        }
    } catch (error) {
        console.error("স্বাগত নোটিফিকেশন তৈরিতে সমস্যা: ", error);
    }
}

// 🎯 ২. একটিভ আইডেন্টিটি ফিল্টার করে নোটিফিকেশন লোড
function loadNotificationsForActiveIdentity() {
    const activeIdentity = getActiveIdentityData();
    const container = document.getElementById('notifications-list');

    if (!activeIdentity || !activeIdentity.id) {
        if (container) {
            container.innerHTML = `<p style="text-align:center;color:#7f8c8d;padding:20px;">অ্যাকাউন্ট যাচাই হচ্ছে...</p>`;
        }
        return;
    }

    const currentName = activeIdentity.name || "সম্মানিত গ্রাহক";
    console.log(`🔔 নোটিফিকেশন লোড হচ্ছে: ${currentName} (${activeIdentity.id}) [টাইপ: ${activeIdentity.type}]`);
    listenForNotifications(activeIdentity);
}

function showGuestMessage() {
    const notificationContainer = document.getElementById("notifications-list");
    if (!notificationContainer) return;

    notificationContainer.innerHTML = `
        <div class="guest-notification-box" style="
            text-align: center; 
            padding: 40px 20px; 
            background: #ffffff; 
            border: 1px dashed #ced4da; 
            border-radius: 12px; 
            margin: 20px auto; 
            max-width: 500px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            font-family: 'Hind Siliguri', sans-serif;
        ">
            <div style="font-size: 50px; color: #ffc107; margin-bottom: 15px;">🔔</div>
            <h3 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">
                নোটিফিকেশন দেখতে লগইন করুন!
            </h3>
            <p style="color: #7f8c8d; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">
                আপনার কাঙ্ক্ষিত প্রপার্টির লাইভ আপডেট ও ক্রেতা-বিক্রেতাদের মেসেজের নোটিফিকেশন পেতে দয়া করে অ্যাকাউন্টে লগইন করুন।
            </p>
            <a href="auth.html" style="
                background: #1877f2; 
                color: #fff; 
                padding: 10px 25px; 
                text-decoration: none; 
                border-radius: 20px; 
                font-weight: bold;
                display: inline-block;
                box-shadow: 0 3px 8px rgba(24, 119, 242, 0.3);
            ">এখনই লগইন করুন</a>
        </div>
    `;

    const headerBadge = document.getElementById("notification-badge") || document.getElementById("notification-count");
    if (headerBadge) headerBadge.style.display = "none";
}

// 🎯 ৩. টোকেন সিঙ্ক (ইউজার এবং পেজ উভয়ের নির্দিষ্ট আইডি অনুযায়ী টোকেন সেভ করবে)
async function syncGuestTokenToUser(uid, activeIdentity) {
    try {
        let currentToken = localStorage.getItem("my_fcm_token");

        if (!currentToken && Notification.permission === "granted") {
            currentToken = await messaging.getToken({ vapidKey: VAPID_KEY });
        }

        if (currentToken) {
            await saveTokenToFirestore("users", uid, currentToken);
            
            if (activeIdentity && activeIdentity.type === 'company' && activeIdentity.id) {
                await saveTokenToFirestore("companies", activeIdentity.id, currentToken);
            }

            if (localStorage.getItem("my_fcm_token")) {
                await db.collection("anonymous_tokens").doc(currentToken).delete().catch(()=>{});
                localStorage.removeItem("my_fcm_token");
            }
        } else if (Notification.permission === "default") {
            showEnableNotificationButton(uid);
        } else if (Notification.permission === "denied") {
            showPermissionDeniedBanner();
        }
    } catch (error) {
        console.error("💥 টোকেন সিঙ্ক এরর: ", error);
    }
}

async function saveTokenToFirestore(collectionName, id, token) {
    await db.collection(collectionName).doc(id).set({
        fcmToken: token,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

function showEnableNotificationButton(uid) {
    const listContainer = document.getElementById("notifications-list");
    if (!listContainer || document.getElementById("enable-notif-banner")) return;

    const banner = document.createElement("div");
    banner.id = "enable-notif-banner";
    banner.style = `background: #e8f0fe; color: #1a73e8; padding: 15px; border: 1px solid #d2e3fc; border-radius: 10px; margin-bottom: 20px; text-align: center; font-family: 'Hind Siliguri', sans-serif;`;
    banner.innerHTML = `
        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">
            🚀 লাইভ আপডেট ও চ্যাট নোটিফিকেশন পেতে পুশ নোটিফিকেশন সচল করুন!
        </p>
        <button id="btn-grant-now" style="background: #1a73e8; color: white; border: none; padding: 8px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">নোটিফিকেশন चालू করুন</button>
    `;

    listContainer.parentNode.insertBefore(banner, listContainer);

    document.getElementById("btn-grant-now").addEventListener("click", async () => {
        try {
            const token = await messaging.getToken({ vapidKey: VAPID_KEY });
            if (token) {
                const activeIdentity = getActiveIdentityData();
                await syncGuestTokenToUser(uid, activeIdentity);
                banner.remove();
                alert("🎉 নোটিফিকেশন চালু হয়েছে!");
                location.reload(); 
            }
        } catch (err) {
            console.error("পারমিশন নিতে ব্যর্থ:", err);
            alert("অনুগ্রহ করে ব্রাউজার পপ-আপ থেকে 'Allow' সিলেক্ট করুন।");
        }
    });
}

function showPermissionDeniedBanner() {
    const listContainer = document.getElementById("notifications-list");
    if (!listContainer || document.getElementById("permission-denied-alert")) return;

    const alertBanner = document.createElement("div");
    alertBanner.id = "permission-denied-alert";
    alertBanner.style = `background: #fff3cd; color: #856404; padding: 12px; border: 1px solid #ffeeba; border-radius: 8px; margin-bottom: 15px; font-size: 13px; text-align: center; font-family: 'Hind Siliguri', sans-serif;`;
    alertBanner.innerHTML = `<strong>বিজ্ঞপ্তি:</strong> আপনার ব্রাউজারে নোটিফিকেশন ব্লক করা আছে। লাইভ আপডেট পেতে লক (🔒) আইকনে ক্লিক করে নোটিফিকেশন <strong>Allow</strong> করে দিন।`;
    listContainer.parentNode.insertBefore(alertBanner, listContainer);
}

function showErrorUI(container) {
    if (!container) return;
    container.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">নোটিফিকেশন লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পেজটি রিফ্রেশ করুন।</p>`;
}

// 🎯 ৪. রিয়েলটাইম লিসেনার (ইউজার বা পেজ আইডি দিয়ে ফিল্টার)
function listenForNotifications(activeIdentity) {
    const notificationContainer = document.getElementById("notifications-list");
    if (!notificationContainer) return;

    // ১. আগের লিসেনার বন্ধ করে মেমোরি ক্লিয়ার করা
    if (currentNotifUnsubscribe) {
        currentNotifUnsubscribe();
        currentNotifUnsubscribe = null;
    }

    const targetId = activeIdentity.id;

    // ২. Firestore সিকিউরিটি রুলসের সাথে ম্যাচ করা কোয়েরি
    const query = db.collection("notifications").where("userId", "==", targetId);

    currentNotifUnsubscribe = query.onSnapshot((snapshot) => {
        notificationContainer.innerHTML = "";

        if (snapshot.empty) {
            notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">এই মোডের জন্য কোনো নোটিফিকেশন নেই।</p>`;
            return;
        }

        const uniqueNotifsMap = new Map();

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // ফিল্টার: নিজের পাঠানো নোটিফিকেশন নিজে দেখবে না
            if (data.senderId && String(data.senderId) === String(targetId)) return;

            // ফিল্টার: ডুপ্লিকেট মেসেজ নোটিফিকেশন রিমুভ
            const msgContent = (data.message || data.body || '').trim();
            const notifType = data.type || 'general';
            
            let uniqueKey = doc.id;
            if (data.chatId && msgContent) {
                uniqueKey = `${data.chatId}_${msgContent}_${notifType}`;
            } else if (msgContent) {
                uniqueKey = `${msgContent}_${notifType}`;
            }

            if (!uniqueNotifsMap.has(uniqueKey)) {
                uniqueNotifsMap.set(uniqueKey, { id: doc.id, data: data });
            }
        });

        let docsArray = Array.from(uniqueNotifsMap.values());

        if (docsArray.length === 0) {
            notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">এই মোডের জন্য কোনো নতুন নোটিফিকেশন নেই।</p>`;
            return;
        }

        // টাইমস্ট্যাম্প অনুযায়ী নতুনগুলো উপরে সাজানো
        docsArray.sort((a, b) => {
            const getMillis = (d) => {
                if (!d) return 0;
                if (d.seconds) return d.seconds * 1000;
                return new Date(d).getTime() || 0;
            };
            return getMillis(b.data.createdAt || b.data.timestamp) - getMillis(a.data.createdAt || a.data.timestamp);
        });

        // লিস্ট আইটেম তৈরি
        docsArray.forEach((item) => {
            const notifItem = createNotificationCard(item.id, item.data);
            notificationContainer.appendChild(notifItem);
        });

        // অ্যান্ড্রেয়েড অ্যাপ নোটিফিকেশন ব্যাজ সিঙ্ক
        const unreadCount = docsArray.reduce((n, item) => n + (item.data.isRead === false ? 1 : 0), 0);
        try {
            if (window.AndroidBridge && typeof window.AndroidBridge.setPendingNotificationCount === 'function') {
                window.AndroidBridge.setPendingNotificationCount(unreadCount);
            }
        } catch (e) {
            console.warn('Android notification badge sync unavailable:', e);
        }
    }, (error) => {
        console.error("নোটিফিকেশন লোড করতে সমস্যা: ", error);
        showErrorUI(notificationContainer);
    });
}

// 🎯 ৫. নোটিফিকেশন কার্ড রেন্ডারিং
function createNotificationCard(docId, notif) {
    const li = document.createElement("li");
    li.className = `notification-item ${notif.isRead ? 'read' : 'unread'}`;
    
    let iconName = "notifications";
    if (notif.type === "welcome") iconName = "celebration";
    else if (notif.type === "like") iconName = "thumb_up";
    else if (notif.type === "chat" || notif.type === "message") iconName = "chat";

    let dateStr = "এইমাত্র";
    const timeField = notif.createdAt || notif.timestamp;
    if (timeField) {
        let dateObj = timeField.toDate ? timeField.toDate() : new Date(timeField.seconds ? timeField.seconds * 1000 : timeField);
        if (!isNaN(dateObj.getTime())) {
            dateStr = dateObj.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    }

    const displayName = notif.title || notif.senderName || "সম্মানিত গ্রাহক";

    li.innerHTML = `
        <i class="material-icons notification-icon-large">${iconName}</i>
        <div class="notif-content">
            <h4 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 16px; font-weight: 600;">
                ${displayName}
            </h4>
            <p class="notif-text">${notif.message || notif.body}</p>
        </div>
        <span class="notif-time">${dateStr}</span>
    `;

    li.addEventListener("click", async () => {
        await markAsRead(docId);
        
        if ((notif.type === "chat" || notif.type === "message") && notif.chatId) {
            window.location.href = `messages.html?chatId=${notif.chatId}&postId=${notif.postId || ''}&action=direct`;
        } else if (notif.postId) {
            window.location.href = `details.html?id=${notif.postId}`;
        }
    });

    return li;
}

async function markAsRead(docId) {
    try {
        await db.collection("notifications").doc(docId).update({ isRead: true });
    } catch (error) {
        console.error("রিড স্ট্যাটাস এরর: ", error);
    }
                }
