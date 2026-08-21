// notifications.js - সম্পূর্ণ ডায়নামিক ও স্মার্ট নোটিফিকেশন এবং হেডার কাউন্ট ইঞ্জিন
const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); 

const VAPID_KEY = "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"; 

let currentNotifUnsubscribe = null; // মেমোরি লিক ও ডুপ্লিকেট লিসেনার রোধ করতে ট্র্যাকার

document.addEventListener("DOMContentLoaded", () => {
    initGlobalNotificationSystem();

    // ⚡ মোড সুইচ (ইউজার ↔ কোম্পানি) হলে স্বয়ংক্রিয়ভাবে নোটিফিকেশন লিস্ট ও হেডার কাউন্ট আপডেট হবে
    window.addEventListener('identityChanged', async () => {
        if (auth.currentUser) {
            const activeIdentity = getActiveIdentityData();
            if (activeIdentity) {
                await syncGuestTokenToUser(auth.currentUser.uid);
                await ensureWelcomeNotification(activeIdentity);
            }
            loadNotificationsForActiveIdentity();
        }
    });
});

function initGlobalNotificationSystem() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("🔓 রেজিস্টার্ড ইউজার একটিভ আছেন।");
            await syncGuestTokenToUser(user.uid);
            
            const activeIdentity = getActiveIdentityData();
            if (activeIdentity) {
                await ensureWelcomeNotification(activeIdentity);
            }
            
            loadNotificationsForActiveIdentity();
        } else {
            console.log("🌐 গেস্ট ইউজার ব্রাউজ করছেন।");
            showGuestMessage();
        }
    });
}

// 🎯 সক্রিয় আইডেন্টিটি নিরাপদে ফেচ করার হেলপার ফাংশন
function getActiveIdentityData() {
    let activeIdentity = null;
    try {
        activeIdentity = typeof window.getActiveIdentity === 'function' ? window.getActiveIdentity() : null;
    } catch (e) {
        console.warn('Active identity জেনারেট করা যায়নি:', e);
    }

    const user = auth.currentUser;
    if (!activeIdentity && user) {
        activeIdentity = {
            id: user.uid,
            type: 'user',
            ownerUid: user.uid,
            name: user.displayName || 'সম্মানিত গ্রাহক',
            avatar: user.photoURL || ''
        };
    }
    return activeIdentity;
}

// 🎯 ১. ডায়নামিক ওয়েলকাম নোটিফিকেশন নিশ্চিতকরণ
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
                title: titleText,
                message: messageText,
                type: "welcome",
                senderName: targetName,
                isRead: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("স্বাগত নোটিফিকেশন তৈরিতে সমস্যা: ", error);
    }
}

// 🎯 ২. একটিভ আইডেন্টিটি অনুযায়ী নোটিফিকেশন লোড
function loadNotificationsForActiveIdentity() {
    const activeIdentity = getActiveIdentityData();

    const container = document.getElementById('notifications-list');
    if (!activeIdentity || !activeIdentity.id) {
        if (container) {
            container.innerHTML = `<p style="text-align:center;color:#7f8c8d;padding:20px;">অ্যাকাউন্ট যাচাই হচ্ছে...</p>`;
        }
        return;
    }

    console.log(`🔔 নোটিফিকেশন লোড হচ্ছে: ${activeIdentity.name} (${activeIdentity.id}) [মোড: ${activeIdentity.type}]`);
    listenForNotifications(activeIdentity);
}

function showGuestMessage() {
    const notificationContainer = document.getElementById("notifications-list");
    if (notificationContainer) {
        notificationContainer.innerHTML = `
            <div class="guest-notification-box" style="
                text-align: center; padding: 40px 20px; background: #ffffff; 
                border: 1px dashed #ced4da; border-radius: 12px; margin: 20px auto; 
                max-width: 500px; box-shadow: 0 4px 15px rgba(0,0,0,0.05);
                font-family: 'Hind Siliguri', sans-serif;
            ">
                <div style="font-size: 50px; color: #ffc107; margin-bottom: 15px;">🔔</div>
                <h3 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">
                    পারমিশন অ্যালাউ করার জন্য ধন্যবাদ!
                </h3>
                <p style="color: #7f8c8d; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">
                    আপনার কাঙ্ক্ষিত প্রপার্টির লাইভ আপডেট ও মেসেজের নোটিফিকেশন পেতে দয়া করে অ্যাকাউন্টে লগইন করুন।
                </p>
                <a href="auth.html" style="
                    background: #1877f2; color: #fff; padding: 10px 25px; text-decoration: none; 
                    border-radius: 20px; font-weight: bold; display: inline-block;
                ">এখনই লগইন করুন</a>
            </div>
        `;
    }
    updateHeaderBadge(0);
}

// 🎯 ৩. টোকেন সিঙ্ক
async function syncGuestTokenToUser(uid) {
    try {
        const activeIdentity = getActiveIdentityData();
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

// 🎯 ৪. রিয়েলটাইম লিসেনার (মোড অনুযায়ী আলাদা ফিল্টারিং ও ব্যাজ কাউন্ট সহ)
function listenForNotifications(activeIdentity) {
    const notificationContainer = document.getElementById("notifications-list");

    // পূর্বের লিসেনার বন্ধ নিশ্চিত করা
    if (currentNotifUnsubscribe) {
        currentNotifUnsubscribe();
        currentNotifUnsubscribe = null;
    }

    const targetId = activeIdentity.id;

    // 🎯 সুনির্দিষ্ট মোডের ID দিয়ে Firestore Query
    let query = db.collection("notifications").where("userId", "==", targetId);

    const handleSnapshot = (snapshot) => {
        if (notificationContainer) notificationContainer.innerHTML = "";

        if (snapshot.empty) {
            if (notificationContainer) {
                notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">এই অ্যাকাউন্টের জন্য কোনো নোটিফিকেশন নেই।</p>`;
            }
            updateHeaderBadge(0);
            return;
        }

        const uniqueNotifsMap = new Map();

        snapshot.forEach((doc) => {
            const data = doc.data();
            
            // 🚨 ফিল্টার ১: নিজের পাঠানো নোটিফিকেশন স্কিপ করা
            if (data.senderId && String(data.senderId) === String(targetId)) {
                return;
            }

            // 🚨 ফিল্টার ২: ডুপ্লিকেট প্রতিরোধ
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
            if (notificationContainer) {
                notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">এই অ্যাকাউন্টের জন্য কোনো নতুন নোটিফিকেশন নেই।</p>`;
            }
            updateHeaderBadge(0);
            return;
        }

        // সময়ের ভিত্তিতে সাজানো
        docsArray.sort((a, b) => {
            const getMillis = (d) => {
                if (!d) return 0;
                if (d.seconds) return d.seconds * 1000;
                return new Date(d).getTime() || 0;
            };
            const tA = getMillis(a.data.createdAt || a.data.timestamp);
            const tB = getMillis(b.data.createdAt || b.data.timestamp);
            return tB - tA;
        });

        // নোটিফিকেশন পেজে রেন্ডার করা (যদি container থাকে)
        if (notificationContainer) {
            docsArray.forEach((item) => {
                const notifItem = createNotificationCard(item.id, item.data);
                notificationContainer.appendChild(notifItem);
            });
        }

        // 🎯 হেডারে আনরিড (Unread) লাল ব্যাজ কাউন্ট আপডেট
        const unreadCount = docsArray.reduce((n, item) => n + (item.data.isRead === false ? 1 : 0), 0);
        updateHeaderBadge(unreadCount);

        // অ্যান্ড্রেয়েড অ্যাপ নোটিফিকেশন ব্যাজ
        try {
            if (window.AndroidBridge && typeof window.AndroidBridge.setPendingNotificationCount === 'function') {
                window.AndroidBridge.setPendingNotificationCount(unreadCount);
            }
        } catch (e) {
            console.warn('Android notification badge sync unavailable:', e);
        }
    };

    const handleError = (error) => {
        console.error("নোটিফিকেশন লোড করতে সমস্যা হয়েছে: ", error);
        if (notificationContainer) showErrorUI(notificationContainer);
    };

    currentNotifUnsubscribe = query.onSnapshot(handleSnapshot, handleError);
}

// 🎯 ৫. হেডারে লাল ব্যাজ রিয়েল-টাইম আপডেট ফাংশন
function updateHeaderBadge(count) {
    const badgeElements = [
        document.getElementById("notification-badge"),
        document.getElementById("notification-count"),
        document.getElementById("header-notif-badge"),
        document.querySelector(".notif-badge")
    ];

    badgeElements.forEach(badge => {
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = "inline-flex";
            } else {
                badge.style.display = "none";
            }
        }
    });
}

function showErrorUI(container) {
    if (!container) return;
    container.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">নোটিফিকেশন লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পেজটি রিফ্রেশ করুন।</p>`;
}

// 🎯 ৬. নোটিফিকেশন কার্ড রেন্ডারিং
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
        console.error("রিড স্টেট আপডেট এরর: ", error);
    }
}
