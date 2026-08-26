// notifications.js - ইউজার/পেজ সেপারেশন ও মেসেজ কাউন্ট ফিক্স সহ আপডেট
const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); 

const VAPID_KEY = "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"; 

let currentNotifUnsubscribe = null; 
let currentChatUnsubscribe = null;

document.addEventListener("DOMContentLoaded", () => {
    initGlobalNotificationSystem();

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

function getActiveIdentityData() {
    let activeIdentity = null;
    if (typeof window.getActiveIdentity === 'function') {
        activeIdentity = window.getActiveIdentity();
    }

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
            const activeIdentity = getActiveIdentityData();
            if (activeIdentity) {
                await syncGuestTokenToUser(user.uid, activeIdentity);
                await ensureWelcomeNotification(activeIdentity);
            }
            loadNotificationsForActiveIdentity();
        } else {
            showGuestMessage();
        }
    });
}

async function ensureWelcomeNotification(activeIdentity) {
    if (!activeIdentity || !activeIdentity.id || !auth.currentUser) return;

    try {
        const notifRef = db.collection("notifications");
        const snapshot = await notifRef.where("userId", "==", activeIdentity.id).limit(1).get();

        if (snapshot.empty) {
            const isCompany = activeIdentity.type === 'company';
            const targetName = activeIdentity.name || (isCompany ? "কোম্পানি" : "সম্মানিত গ্রাহক");

            const titleText = isCompany 
                ? `🏢 ${targetName}-এ আপনাকে স্বাগতম!`
                : `👋 ${targetName}, আমার বাড়ি প্ল্যাটফর্মে আপনাকে স্বাগত!`;

            const messageText = isCompany
                ? `আপনার কোম্পানি/পেজ প্রোফাইলটি সফলভাবে সক্রিয় হয়েছে। কাস্টমারদের বার্তা ও আপডেট এখানে দেখতে পাবেন।`
                : `আমাদের সাথে যুক্ত হওয়ার জন্য আপনাকে আন্তরিক ধন্যবাদ। সেরা প্রপার্টি ডিল এবং রিয়েল-টাইম আপডেট পেতে সাথে থাকুন।`;

            await notifRef.add({
                userId: activeIdentity.id,
                ownerUid: auth.currentUser.uid,
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

function loadNotificationsForActiveIdentity() {
    const activeIdentity = getActiveIdentityData();
    const container = document.getElementById('notifications-list');

    if (!activeIdentity || !activeIdentity.id) {
        if (container) {
            container.innerHTML = `<p style="text-align:center;color:#7f8c8d;padding:20px;">অ্যাকাউন্ট যাচাই হচ্ছে...</p>`;
        }
        return;
    }

    listenForNotifications(activeIdentity);
    listenForActiveChatBadge(activeIdentity); // ⚡ পেজ/ইউজার মোড অনুযায়ী মেসেজ কাউন্ট
}

function showGuestMessage() {
    const notificationContainer = document.getElementById("notifications-list");
    if (!notificationContainer) return;

    notificationContainer.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; background: #ffffff; border: 1px dashed #ced4da; border-radius: 12px; margin: 20px auto; max-width: 500px;">
            <div style="font-size: 50px; color: #ffc107; margin-bottom: 15px;">🔔</div>
            <h3 style="color: #2c3e50; margin: 0 0 10px 0;">নোটিফিকেশন দেখতে লগইন করুন</h3>
            <p style="color: #7f8c8d; margin: 0 0 25px 0;">আপনার আপডেট ও চ্যাট নোটিফিকেশন পেতে অ্যাকাউন্টে লগইন করুন।</p>
            <a href="auth.html" style="background: #1877f2; color: #fff; padding: 10px 25px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block;">এখনই লগইন করুন</a>
        </div>
    `;

    const headerBadge = document.getElementById("notification-badge") || document.getElementById("notification-count");
    if (headerBadge) headerBadge.style.display = "none";
}

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
        }
    } catch (error) {
        console.error("টোকেন সিঙ্ক এরর: ", error);
    }
}

async function saveTokenToFirestore(collectionName, id, token) {
    await db.collection(collectionName).doc(id).set({
        fcmToken: token,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

function showErrorUI(container) {
    if (!container) return;
    container.innerHTML = `<p style="text-align: center; color: #e74c3c; padding: 20px;">নোটিফিকেশন লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে পেজটি রিফ্রেশ করুন।</p>`;
}

// 🎯 ৪. নোটিফিকেশন লিসেনার (ইউজার ও পেজ সেপারেট রাখা)
function listenForNotifications(activeIdentity) {
    const notificationContainer = document.getElementById("notifications-list");

    if (currentNotifUnsubscribe) {
        currentNotifUnsubscribe();
        currentNotifUnsubscribe = null;
    }

    const targetUserId = activeIdentity.id;

    const query = db.collection("notifications").where("userId", "==", targetUserId);

    currentNotifUnsubscribe = query.onSnapshot((snapshot) => {
        if (notificationContainer) notificationContainer.innerHTML = "";

        if (snapshot.empty) {
            if (notificationContainer) {
                notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">কোনো নোটিফিকেশন নেই।</p>`;
            }
            updateNotificationHeaderBadge(0);
            return;
        }

        const uniqueNotifsMap = new Map();

        snapshot.forEach((doc) => {
            const data = doc.data();

            // ⚡ নিখুঁত ফিল্টার: ডাটার userId এবং বর্তমান অ্যাক্টিভ ID হুবহু এক হতে হবে
            if (String(data.userId) !== String(targetUserId)) {
                return;
            }

            // নিজেকে পাঠানো বার্তা বা নোটিফিকেশন ফিল্টার
            if (data.senderId && String(data.senderId) === String(targetUserId)) {
                return;
            }

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
                notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">কোনো নতুন নোটিফিকেশন নেই।</p>`;
            }
            updateNotificationHeaderBadge(0);
            return;
        }

        docsArray.sort((a, b) => {
            const getMillis = (d) => {
                if (!d) return 0;
                if (d.seconds) return d.seconds * 1000;
                return new Date(d).getTime() || 0;
            };
            return getMillis(b.data.createdAt || b.data.timestamp) - getMillis(a.data.createdAt || a.data.timestamp);
        });

        if (notificationContainer) {
            docsArray.forEach((item) => {
                const notifItem = createNotificationCard(item.id, item.data);
                notificationContainer.appendChild(notifItem);
            });
        }

        const unreadCount = docsArray.reduce((n, item) => n + (item.data.isRead === false ? 1 : 0), 0);
        updateNotificationHeaderBadge(unreadCount);

        try {
            if (window.AndroidBridge && typeof window.AndroidBridge.setPendingNotificationCount === 'function') {
                window.AndroidBridge.setPendingNotificationCount(unreadCount);
            }
        } catch (e) {
            console.warn('Android badge sync error:', e);
        }
    }, (error) => {
        console.error("নোটিফিকেশন লোড এরর:", error);
        if (notificationContainer) showErrorUI(notificationContainer);
    });
}

// 🎯 ৫. পেজ/ইউজার মোড অনুযায়ী মেসেজ আইকনে রিয়েল-টাইম আনরিড কাউন্ট প্রদর্শন
function listenForActiveChatBadge(activeIdentity) {
    if (currentChatUnsubscribe) {
        currentChatUnsubscribe();
        currentChatUnsubscribe = null;
    }

    const targetId = activeIdentity.id;

    // বর্তমান আইডেন্টিটি অনুযায়ী সকল চ্যাট পর্যবেক্ষণ
    currentChatUnsubscribe = db.collection("chats")
        .where("participants", "array-contains", targetId)
        .onSnapshot((snapshot) => {
            let unreadChatCount = 0;

            snapshot.forEach((doc) => {
                const chatData = doc.data();
                // যদি মেসেজের unreadCount থাকে এবং শেষ মেসেজটি অন্য কেউ পাঠায়
                if (chatData.unreadCount && chatData.lastSenderId && String(chatData.lastSenderId) !== String(targetId)) {
                    const count = chatData.unreadCount[targetId] || 0;
                    unreadChatCount += count;
                }
            });

            updateMessageHeaderBadge(unreadChatCount);
        }, (err) => {
            console.warn("চ্যাট ব্যাজ লোড এরর:", err);
        });
}

function updateNotificationHeaderBadge(count) {
    const badge = document.getElementById("notification-badge") || document.getElementById("notification-count");
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.style.display = "inline-block";
        } else {
            badge.style.display = "none";
        }
    }
}

function updateMessageHeaderBadge(count) {
    const messageBadge = document.getElementById("message-badge") || document.getElementById("chat-badge") || document.getElementById("unread-messages-count");
    if (messageBadge) {
        if (count > 0) {
            messageBadge.textContent = count > 99 ? '99+' : count;
            messageBadge.style.display = "inline-block";
        } else {
            messageBadge.style.display = "none";
        }
    }
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

    let displayName = notif.title || notif.senderName;
    if (!displayName || displayName === "সম্মানিত গ্রাহক" || displayName === "আমার বাড়ি ব্যবহারকারী") {
        displayName = notif.type === "chat" ? "নতুন বার্তা এসেছে" : "নোটিফিকেশন";
    }

    li.innerHTML = `
        <i class="material-icons notification-icon-large">${iconName}</i>
        <div class="notif-content">
            <h4 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 16px; font-weight: 600;">
                ${displayName}
            </h4>
            <p class="notif-text">${notif.message || notif.body || ''}</p>
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
