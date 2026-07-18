// =======================================================
// 🔔 notifications.js - নোটিফিকেশন পেজ ও স্মার্ট টোকেন ম্যানেজার
// =======================================================

const messaging = firebase.messaging(); 
const VAPID_KEY = "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"; 

document.addEventListener("DOMContentLoaded", () => {
    // শুধুমাত্র নোটিফিকেশন পেজে থাকলেই এটি রান করবে
    if (document.getElementById("notifications-list")) {
        initNotificationPageUI();
    }
});

function initNotificationPageUI() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            await syncGuestTokenToUser(user.uid);
            await ensureUserWelcomeNotification(user.uid);
            renderRegisteredUserNotifications(user.uid);
        } else {
            renderGuestNotifications();
        }
    });
}

/**
 * 🔄 গেস্ট টোকেনকে ইউজার আইডিতে সিঙ্ক ও ট্রান্সফার
 */
async function syncGuestTokenToUser(uid) {
    try {
        const localToken = localStorage.getItem("my_fcm_token");
        if (localToken) {
            await db.collection("users").doc(uid).set({
                fcmToken: localToken,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            await db.collection("anonymous_tokens").doc(localToken).delete();
            console.log("🎉 টোকেন ইউজার আইডিতে স্থানান্তরিত হয়েছে।");
        }
    } catch (error) {
        console.error("টোকেন সিঙ্ক এরর: ", error);
    }
}

/**
 * 🎁 ইন-অ্যাপ স্বাগত মেসেজ তৈরি নিশ্চিত করা
 */
async function ensureUserWelcomeNotification(uid) {
    try {
        const notifRef = db.collection("notifications");
        const snapshot = await notifRef.where("userId", "==", uid).get();

        let hasWelcome = false;
        snapshot.forEach((doc) => {
            if (doc.data().type === "welcome") hasWelcome = true;
        });

        if (!hasWelcome) {
            await notifRef.add({
                userId: uid,
                title: "👋 আমার বাড়ি প্ল্যাটফর্মে আপনাকে স্বাগতম!",
                message: "আমাদের সাথে যুক্ত হওয়ার জন্য আপনাকে আন্তরিক ধন্যবাদ। লাইভ আপডেট এবং চ্যাট মেসেজের পুশ নোটিফিকেশন সচল করতে এই নোটিফিকেশনে ক্লিক করুন।",
                type: "welcome",
                isRead: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("স্বাগত নোটিফিকেশন তৈরিতে ব্যর্থ: ", error);
    }
}

/**
 * 🔔 রেজিস্টার্ড ইউজারের নোটিফিকেশন লিস্টে রেন্ডার করা
 */
function renderRegisteredUserNotifications(uid) {
    const container = document.getElementById("notifications-list");
    if (!container) return;

    db.collection("notifications")
        .where("userId", "==", uid)
        .onSnapshot((snapshot) => {
            container.innerHTML = "";

            if (snapshot.empty) {
                container.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
                return;
            }

            let docsArray = [];
            snapshot.forEach((doc) => {
                docsArray.push({ id: doc.id, data: doc.data() });
            });

            // ক্লায়েন্ট সাইড সর্টিং
            docsArray.sort((a, b) => {
                const tA = a.data.timestamp ? (a.data.timestamp.seconds || new Date(a.data.timestamp).getTime()) : 0;
                const tB = b.data.timestamp ? (b.data.timestamp.seconds || new Date(b.data.timestamp).getTime()) : 0;
                return tB - tA;
            });

            docsArray.forEach((item) => {
                const card = createNotificationCard(item.id, item.data, uid, false);
                container.appendChild(card);
            });
        });
}

/**
 * 🌐 গেস্ট ইউজারদের নোটিফিকেশন লিস্টে রেন্ডার করা
 */
function renderGuestNotifications() {
    const container = document.getElementById("notifications-list");
    if (!container) return;

    const guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
    container.innerHTML = "";

    if (guestNotifications.length === 0) {
        container.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
        return;
    }

    guestNotifications.forEach((notif, index) => {
        const card = createNotificationCard(`guest_${index}`, notif, null, true);
        container.appendChild(card);
    });
}

/**
 * 🎴 কার্ড জেনারেশন ও ক্লিক হ্যান্ডলার
 */
function createNotificationCard(docId, notif, uid, isGuest = false) {
    const li = document.createElement("li");
    li.className = `notification-item ${notif.isRead ? 'read' : 'unread'}`;
    
    let iconName = "notifications";
    if (notif.type === "welcome") iconName = "celebration";
    else if (notif.type === "like") iconName = "thumb_up";
    else if (notif.type === "chat") iconName = "chat";

    let dateStr = "এইমাত্র";
    if (notif.timestamp) {
        let dateObj = notif.timestamp.toDate ? notif.timestamp.toDate() : new Date(notif.timestamp.seconds * 1000 || notif.timestamp);
        if (!isNaN(dateObj.getTime())) {
            dateStr = dateObj.toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
    }

    li.innerHTML = `
        <i class="material-icons notification-icon-large">${iconName}</i>
        <div class="notif-content">
            <h4 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 16px;">${notif.title}</h4>
            <p class="notif-text">${notif.message}</p>
        </div>
        <span class="notif-time">${dateStr}</span>
    `;

    li.addEventListener("click", async () => {
        await markNotificationAsRead(docId, isGuest);
        
        if (!isGuest && uid) {
            try {
                const userDoc = await db.collection("users").doc(uid).get();
                const userData = userDoc.data();

                if (!userData || !userData.fcmToken) {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                        const currentToken = await messaging.getToken({ vapidKey: VAPID_KEY });
                        if (currentToken) {
                            await db.collection("users").doc(uid).set({
                                fcmToken: currentToken,
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                            }, { merge: true });
                            alert("🎉 পুশ নোটিফিকেশন সফলভাবে আপনার অ্যাকাউন্টে যুক্ত হয়েছে!");
                        }
                    }
                }
            } catch (err) {
                console.error("টোকেন প্রসেসিং এরর: ", err);
            }
        }

        if (notif.type === "chat" && notif.chatId) {
            window.location.href = `messages.html?chatId=${notif.chatId}&postId=${notif.postId || ''}&action=direct`;
        } else if (notif.postId) {
            window.location.href = `details.html?id=${notif.postId}`;
        }
    });

    return li;
}

/**
 * পঠিত মার্ক করার ফাংশন
 */
async function markNotificationAsRead(docId, isGuest) {
    if (isGuest) {
        let guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
        const index = parseInt(docId.split("_")[1]);
        if (guestNotifications[index]) {
            guestNotifications[index].isRead = true;
            localStorage.setItem("guest_notifications", JSON.stringify(guestNotifications));
            renderGuestNotifications();
        }
    } else {
        try {
            await db.collection("notifications").doc(docId).update({ isRead: true });
        } catch (error) {
            console.error("রিড স্ট্যাটাস আপডেট ব্যর্থ: ", error);
        }
    }
}

// ব্যাকগ্রাউন্ড মেসেজ রিয়েল-টাইম লিসেনার (গেস্টদের জন্য)
messaging.onMessage((payload) => {
    if (!auth.currentUser) {
        let guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
        guestNotifications.unshift({
            title: payload.notification.title,
            message: payload.notification.body,
            type: payload.data ? payload.data.type : "general",
            isRead: false,
            timestamp: new Date().getTime()
        });
        localStorage.setItem("guest_notifications", JSON.stringify(guestNotifications));
        renderGuestNotifications();
    }
});
