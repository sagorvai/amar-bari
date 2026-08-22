// notifications.js - Strict Prefix-based Mode Separation
const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); 

const VAPID_KEY = "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"; 

let currentNotifUnsubscribe = null; 

document.addEventListener("DOMContentLoaded", () => {
    initGlobalNotificationSystem();

    // ⚡ মোড সুইচ হলে (User ↔ Page) সাথে সাথে ফিল্টার আপডেট হবে
    window.addEventListener('identityChanged', () => {
        if (auth.currentUser) {
            loadNotificationsForActiveMode();
        }
    });
});

function initGlobalNotificationSystem() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            await syncGuestTokenToUser(user.uid);
            loadNotificationsForActiveMode();
        } else {
            showGuestMessage();
        }
    });
}

// 🎯 বর্তমান অ্যাক্টিভ মোড চেক (User নাকি Page)
function getActiveModeDetails() {
    const user = auth.currentUser;
    if (!user) return null;

    let isCompanyMode = false;
    let companyId = null;

    // ১. header-sync.js এর এক্টিভ আইডেন্টিটি চেক
    if (typeof window.getActiveIdentity === 'function') {
        const identity = window.getActiveIdentity();
        if (identity && identity.type === 'company') {
            isCompanyMode = true;
            companyId = identity.id;
        }
    }

    // ২. localStorage চেক
    if (!isCompanyMode) {
        const activeMode = localStorage.getItem('activeIdentityType');
        if (activeMode === 'company') {
            isCompanyMode = true;
            companyId = localStorage.getItem('activeCompanyId');
        }
    }

    const rawUid = user.uid;
    // পেজ আইডি গঠন: যদি কোম্পানি আইডি না থাকে, তবে comp_ + rawUid ধরে নেওয়া
    const pageTargetId = companyId ? companyId : `comp_${rawUid}`;

    return {
        uid: rawUid,
        isPageMode: isCompanyMode,
        targetId: isCompanyMode ? pageTargetId : rawUid
    };
}

function loadNotificationsForActiveMode() {
    const modeDetails = getActiveModeDetails();
    const container = document.getElementById('notifications-list');

    if (!modeDetails) {
        if (container) {
            container.innerHTML = `<p style="text-align:center;color:#7f8c8d;padding:20px;">অ্যাকাউন্ট যাচাই হচ্ছে...</p>`;
        }
        return;
    }

    listenForNotifications(modeDetails);
}

// 🎯 মোড অনুসারে সুনির্দিষ্ট ফিল্টারিং
function listenForNotifications(modeDetails) {
    const notificationContainer = document.getElementById("notifications-list");

    if (currentNotifUnsubscribe) {
        currentNotifUnsubscribe();
        currentNotifUnsubscribe = null;
    }

    const rawUid = modeDetails.uid;
    const isPageMode = modeDetails.isPageMode;
    const targetId = modeDetails.targetId;

    // ১. টার্গেট কোয়েরি করা (userId == targetId অথবা receiverId == targetId)
    currentNotifUnsubscribe = db.collection("notifications")
        .onSnapshot((snapshot) => {
            if (notificationContainer) notificationContainer.innerHTML = "";

            if (snapshot.empty) {
                showEmptyState(notificationContainer, isPageMode);
                return;
            }

            const uniqueNotifsMap = new Map();

            snapshot.forEach((doc) => {
                const data = doc.data();
                const docUserId = String(data.userId || data.receiverId || '');

                // 🚨 ১. কড়া ফিল্টার: comp_ প্রিফিক্স লজিক
                if (isPageMode) {
                    // পেজ মোড: শুধুমাত্র comp_ দিয়ে শুরু এবং বর্তমান ইউজারের সাথে সম্পর্কিত হতে হবে
                    if (!docUserId.startsWith('comp_')) return;
                    if (!docUserId.includes(rawUid) && docUserId !== targetId) return;
                } else {
                    // ইউজার মোড: comp_ থাকা যাবে না এবং শুধুমাত্র নিজস্ব rawUid মিলতে হবে
                    if (docUserId.startsWith('comp_')) return;
                    if (docUserId !== rawUid) return;
                }

                // 🚨 ২. নিজের পাঠানো নোটিফিকেশন স্কিপ করা
                if (data.senderId && (data.senderId === rawUid || data.senderId === targetId)) {
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
                showEmptyState(notificationContainer, isPageMode);
                return;
            }

            // সময় অনুযায়ী সর্টিং
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
            updateHeaderBadge(unreadCount);

        }, (error) => {
            console.error("নোটিফিকেশন লোড এরর: ", error);
            showEmptyState(notificationContainer, isPageMode);
        });
}

function showEmptyState(container, isPageMode) {
    if (container) {
        const label = isPageMode ? 'পেজের' : 'ইউজারের';
        container.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">এই ${label} জন্য কোনো নোটিফিকেশন নেই।</p>`;
    }
    updateHeaderBadge(0);
}

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

function showGuestMessage() {
    const notificationContainer = document.getElementById("notifications-list");
    if (notificationContainer) {
        notificationContainer.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; background: #ffffff; border: 1px dashed #ced4da; border-radius: 12px; margin: 20px auto; max-width: 500px;">
                <div style="font-size: 50px; color: #ffc107; margin-bottom: 15px;">🔔</div>
                <h3 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 20px;">নোটিফিকেশন দেখতে লগইন করুন</h3>
                <a href="auth.html" style="background: #1877f2; color: #fff; padding: 10px 25px; text-decoration: none; border-radius: 20px; font-weight: bold; display: inline-block; margin-top: 10px;">লগইন করুন</a>
            </div>
        `;
    }
    updateHeaderBadge(0);
}

async function syncGuestTokenToUser(uid) {
    try {
        let currentToken = localStorage.getItem("my_fcm_token");
        if (!currentToken && Notification.permission === "granted") {
            currentToken = await messaging.getToken({ vapidKey: VAPID_KEY });
        }
        if (currentToken) {
            const modeDetails = getActiveModeDetails();
            const targetCol = modeDetails?.isPageMode ? 'companies' : 'users';
            const targetId = modeDetails?.targetId || uid;
            
            await db.collection(targetCol).doc(targetId).set({
                fcmToken: currentToken,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }
    } catch (e) {
        console.error("Token Sync Error:", e);
    }
    }
