// notifications.js - সর্বজনীন স্মার্ট নোটিফিকেশন ইঞ্জিন (ইউজার ও পেজ মোড সাপোর্ট সহ)
const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); 

const VAPID_KEY = "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"; 

let currentNotifUnsubscribe = null; // লাইভ লিসেনার বন্ধ করার জন্য

document.addEventListener("DOMContentLoaded", () => {
    initGlobalNotificationSystem();

    // ⚡ প্রোফাইল/হেডার থেকে ইউজার ↔ পেজ মোড সুইচ করলে লাইভ নোটিফিকেশন লিস্ট চেঞ্জ হবে
    window.addEventListener('identityChanged', () => {
        if (auth.currentUser) {
            loadNotificationsForActiveIdentity();
        }
    });
});

function initGlobalNotificationSystem() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("🔓 রেজিস্টার্ড ইউজার একটিভ আছেন।");
            await syncGuestTokenToUser(user.uid);
            await ensureUserWelcomeNotification(user.uid);
            
            // অ্যাক্টিভ আইডি (ইউজার নাকি কোম্পানি) অনুসারে নোটিফিকেশন লোড
            loadNotificationsForActiveIdentity();
        } else {
            console.log("🌐 গেস্ট ইউজার ব্রাউজ করছেন। নোটিফিকেশন পেজ উন্মুক্ত।");
            showGuestMessage();
        }
    });
}

// 🎯 ১. বর্তমান অ্যাক্টিভ আইডি (ইউজার বা পেজ) অনুযায়ী নোটিফিকেশন ফিল্টার
function loadNotificationsForActiveIdentity() {
    const activeIdentity = typeof window.getActiveIdentity === 'function' 
        ? window.getActiveIdentity() 
        : null;

    if (!activeIdentity) return;

    console.log(`🔔 নোটিফিকেশন লোড হচ্ছে বর্তমান আইডির জন্য: ${activeIdentity.name} (${activeIdentity.id}) [টাইপ: ${activeIdentity.type}]`);
    
    listenForNotifications(activeIdentity.id);
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
                পারমিশন অ্যালাউ করার জন্য ধন্যবাদ!
            </h3>
            <p style="color: #7f8c8d; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">
                আপনার কাঙ্ক্ষিত প্লট, বাড়ি বা ফ্ল্যাটের সর্বশেষ লাইভ আপডেট ও ক্রেতা-বিক্রেতাদের চ্যাট মেসেজের রিয়েল-টাইম নোটিফিকেশন দেখতে দয়া করে আপনার অ্যাকাউন্টে লগইন করুন।
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

async function syncGuestTokenToUser(uid) {
    try {
        const localToken = localStorage.getItem("my_fcm_token");
        if (localToken) {
            await saveTokenToFirestore(uid, localToken);
            await db.collection("anonymous_tokens").doc(localToken).delete();
            localStorage.removeItem("my_fcm_token");
            return;
        }

        if (Notification.permission === "granted") {
            const currentToken = await messaging.getToken({ vapidKey: VAPID_KEY });
            if (currentToken) {
                await saveTokenToFirestore(uid, currentToken);
            }
        } 
        else if (Notification.permission === "default") {
            showEnableNotificationButton(uid);
        }
        else if (Notification.permission === "denied") {
            showPermissionDeniedBanner();
        }
    } catch (error) {
        console.error("💥 টোকেন সংগ্রহ বা পারমিশন রিকভারিতে সমস্যা: ", error);
    }
}

async function saveTokenToFirestore(uid, token) {
    await db.collection("users").doc(uid).set({
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
            🚀 লাইভ আপডেট ও চ্যাট নোটিফিকেশন মিস করতে না চাইলে পুশ নোটিফিকেশন সচল করুন!
        </p>
        <button id="btn-grant-now" style="background: #1a73e8; color: white; border: none; padding: 8px 20px; border-radius: 20px; font-weight: bold; cursor: pointer;">নোটিফিকেশন চালু করুন</button>
    `;

    listContainer.parentNode.insertBefore(banner, listContainer);

    document.getElementById("btn-grant-now").addEventListener("click", async () => {
        try {
            const token = await messaging.getToken({ vapidKey: VAPID_KEY });
            if (token) {
                await saveTokenToFirestore(uid, token);
                banner.remove();
                alert("🎉 নোটিফিকেশন সফলভাবে চালু হয়েছে!");
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
    alertBanner.innerHTML = `<strong>বিজ্ঞপ্তি:</strong> আপনার ব্রাউজারে নোটিফিকেশন ব্লক করা আছে। লাইভ চ্যাট ও প্রপার্টি আপডেট পেতে ব্রাউজারের লক (🔒) আইকনে ক্লিক করে নোটিফিকেশন <strong>Allow</strong> করে দিন।`;
    listContainer.parentNode.insertBefore(alertBanner, listContainer);
}

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
                title: "👋 আমার বাড়ি প্ল্যাটফর্মে আপনাকে স্বাগত!",
                message: "আমাদের সাথে যুক্ত হওয়ার জন্য আপনাকে আন্তরিক ধন্যবাদ। সেরা সব প্রপার্টি ডিল এবং ক্রেতা-বিক্রেতার চ্যাট মেসেজের লাইভ আপডেট পেতে এই মেসেজটিতে ক্লিক করে নোটিফিকেশন সচল করুন।",
                type: "welcome",
                isRead: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("স্বাগত নোটিফিকেশন তৈরিতে ব্যর্থ: ", error);
    }
}

// 🎯 ২. ডাইনামিক লাইভ লিসেনার (targetId = User UID অথবা Company ID)
function listenForNotifications(targetId) {
    const notificationContainer = document.getElementById("notifications-list");
    if (!notificationContainer) return;

    // আগের লিসেনার চালু থাকলে তা বন্ধ করা (যেন মেমোরি লিক বা ডুপ্লিকেট না হয়)
    if (currentNotifUnsubscribe) {
        currentNotifUnsubscribe();
    }

    currentNotifUnsubscribe = db.collection("notifications")
        .where("userId", "==", targetId)
        .onSnapshot((snapshot) => {
            notificationContainer.innerHTML = "";

            if (snapshot.empty) {
                notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">এই অ্যাকাউন্টের জন্য কোনো নোটিফিকেশন নেই।</p>`;
                return;
            }

            let docsArray = [];
            snapshot.forEach((doc) => {
                docsArray.push({ id: doc.id, data: doc.data() });
            });

            // টাইমস্ট্যাম্প অনুযায়ী সর্টিং
            docsArray.sort((a, b) => {
                const tA = a.data.timestamp ? (a.data.timestamp.seconds || new Date(a.data.timestamp).getTime()) : 0;
                const tB = b.data.timestamp ? (b.data.timestamp.seconds || new Date(b.data.timestamp).getTime()) : 0;
                return tB - tA;
            });

            docsArray.forEach((item) => {
                const notif = item.data;
                const notifItem = createNotificationCard(item.id, notif);
                notificationContainer.appendChild(notifItem);
            });
        }, (error) => {
            console.error("নোটিফিকেশন লোড এরর: ", error);
        });
}

function createNotificationCard(docId, notif) {
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
        await markAsRead(docId);
        
        if (notif.type === "chat" && notif.chatId) {
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
