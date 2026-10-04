// notifications.js - Optimized Pure Notification Engine
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
            }
            loadNotificationsForActiveIdentity();
        } else {
            showGuestMessage();
        }
    });
}

function loadNotificationsForActiveIdentity() {
    const activeIdentity = getActiveIdentityData();
    const container = document.getElementById('notifications-list');

    if (!activeIdentity || !activeIdentity.id) {
        if (container) container.innerHTML = `<p style="text-align:center;color:#7f8c8d;padding:20px;">অ্যাকাউন্ট যাচাই হচ্ছে...</p>`;
        return;
    }

    listenForNotifications(activeIdentity);
    listenForActiveChatBadge(activeIdentity);
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

// 🎯 ১. সরাসরি activeIdentity.id দিয়ে নোটিফিকেশন লোড (Clean Logic)
function listenForNotifications(activeIdentity) {
    const notificationContainer = document.getElementById("notifications-list");

    if (currentNotifUnsubscribe) {
        currentNotifUnsubscribe();
        currentNotifUnsubscribe = null;
    }

    const targetUserId = String(activeIdentity.id);

    currentNotifUnsubscribe = db.collection("notifications")
        .where("userId", "==", targetUserId)
        .onSnapshot((snapshot) => {
            if (notificationContainer) notificationContainer.innerHTML = "";

            if (snapshot.empty) {
                if (notificationContainer) {
                    notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">কোনো নোটিফিকেশন নেই।</p>`;
                }
                updateNotificationHeaderBadge(0);
                return;
            }

            let notifDocs = [];
            snapshot.forEach((doc) => {
                notifDocs.push({ id: doc.id, ...doc.data() });
            });

            // টাইমস্ট্যাম্প অনুযায়ী সর্টিং
            notifDocs.sort((a, b) => {
                const getTime = (d) => d?.seconds ? d.seconds * 1000 : (new Date(d).getTime() || 0);
                return getTime(b.createdAt || b.timestamp) - getTime(a.createdAt || a.timestamp);
            });

            if (notificationContainer) {
                notifDocs.forEach((item) => {
                    const notifItem = createNotificationCard(item.id, item);
                    notificationContainer.appendChild(notifItem);
                });
            }

            const unreadCount = notifDocs.reduce((n, item) => n + (item.isRead === false ? 1 : 0), 0);
            updateNotificationHeaderBadge(unreadCount);

        }, (error) => {
            console.error("নোটিফিকেশন লোড এরর:", error);
        });
}

// 🎯 ২. চ্যাট ব্যাজ ফিল্টারিং
function listenForActiveChatBadge(activeIdentity) {
    if (currentChatUnsubscribe) {
        currentChatUnsubscribe();
        currentChatUnsubscribe = null;
    }

    const targetId = activeIdentity.id;

    currentChatUnsubscribe = db.collection("chats")
        .where("participants", "array-contains", targetId)
        .onSnapshot((snapshot) => {
            let totalUnreadMessages = 0;

            snapshot.forEach((doc) => {
                const chatData = doc.data();
                if (chatData.unreadCount && chatData.unreadCount[targetId]) {
                    totalUnreadMessages += chatData.unreadCount[targetId];
                }
            });

            updateMessageHeaderBadge(totalUnreadMessages);
        });
}

function updateNotificationHeaderBadge(count) {
    const badge = document.getElementById("notification-badge") || document.getElementById("notification-count");
    if (badge) {
        badge.textContent = count > 99 ? '99+' : count;
        badge.style.display = count > 0 ? "inline-block" : "none";
    }
}

function updateMessageHeaderBadge(count) {
    const messageBadge = document.getElementById("message-badge") || document.getElementById("message-count") || document.getElementById("chat-badge");
    if (messageBadge) {
        messageBadge.textContent = count > 99 ? '99+' : count;
        messageBadge.style.display = count > 0 ? "inline-block" : "none";
    }
}

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

    li.innerHTML = `
        <i class="material-icons notification-icon-large">${iconName}</i>
        <div class="notif-content">
            <h4 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 16px; font-weight: 600;">
                ${notif.title || notif.senderName || "নোটিফিকেশন"}
            </h4>
            <p class="notif-text">${notif.message || notif.body || ''}</p>
        </div>
        <span class="notif-time">${dateStr}</span>
    `;

    li.addEventListener("click", async () => {
        await db.collection("notifications").doc(docId).update({ isRead: true }).catch(() => {});
        
        if ((notif.type === "chat" || notif.type === "message") && notif.chatId) {
            window.location.href = `messages.html?chatId=${notif.chatId}&postId=${notif.postId || ''}`;
        } else if (notif.postId) {
            window.location.href = `details.html?id=${notif.postId}`;
        }
    });

    return li;
                }
