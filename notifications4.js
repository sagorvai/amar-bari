// notifications.js - সম্পূর্ণ ডায়নামিক ও স্মার্ট নোটিফিকেশন ইঞ্জিন
const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); 

const VAPID_KEY = "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"; 

let currentNotifUnsubscribe = null; // মেমোরি লিক রোধ করতে লাইভ লিসেনার ট্র্যাকার

document.addEventListener("DOMContentLoaded", () => {
    initGlobalNotificationSystem();

    // ⚡ মোড সুইচ (ইউজার ↔ কোম্পানি) হলে স্বয়ংক্রিয়ভাবে নোটিফিকেশন লিস্ট ও ওয়েলকাম মেসেজ আপডেট হবে
    window.addEventListener('identityChanged', async () => {
        if (auth.currentUser) {
            const activeIdentity = typeof window.getActiveIdentity === 'function' ? window.getActiveIdentity() : null;
            if (activeIdentity) {
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
            
            // বর্তমান সক্রিয় প্রোফাইল (ইউজার নাকি কোম্পানি) সংগ্রহ
            const activeIdentity = typeof window.getActiveIdentity === 'function' ? window.getActiveIdentity() : null;
            
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

// 🎯 ১. ইউজার বা পেজের জন্য ডায়নামিক ওয়েলকাম নোটিফিকেশন নিশ্চিতকরণ
async function ensureWelcomeNotification(activeIdentity) {
    if (!activeIdentity || !activeIdentity.id) return;

    try {
        const notifRef = db.collection("notifications");
        const snapshot = await notifRef.where("userId", "==", activeIdentity.id).get();

        let hasWelcome = false;
        snapshot.forEach((doc) => {
            if (doc.data().type === "welcome") hasWelcome = true;
        });

        if (!hasWelcome) {
            const isCompany = activeIdentity.type === 'company';
            
            // নাম না থাকলে "সম্মানিত গ্রাহক" ফলব্যাক
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
    const activeIdentity = typeof window.getActiveIdentity === 'function' 
        ? window.getActiveIdentity() 
        : null;

    if (!activeIdentity) return;

    const currentName = activeIdentity.name || "সম্মানিত গ্রাহক";
    console.log(`🔔 নোটিফিকেশন লোড হচ্ছে: ${currentName} (${activeIdentity.id}) [টাইপ: ${activeIdentity.type}]`);
    
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
        console.error("💥 টোকেন সিঙ্ক এরর: ", error);
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
            🚀 লাইভ আপডেট ও চ্যাট নোটিফিকেশন পেতে পুশ নোটিফিকেশন সচল করুন!
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

// 🎯 ৩. রিয়েলটাইম লিসেনার
function listenForNotifications(targetId) {
    const notificationContainer = document.getElementById("notifications-list");
    if (!notificationContainer) return;

    if (currentNotifUnsubscribe) {
        currentNotifUnsubscribe(); // পূর্বের লিসেনার বন্ধ
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

            // তারিখ অনুসারে সর্ট করা
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

// 🎯 ৪. নোটিফিকেশন কার্ড রেন্ডারিং (নাম এবং ফলব্যাক লজিক সহ)
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

    // 💡 নাম চেক লজিক: senderName -> title -> "সম্মানিত গ্রাহক"
    const displayName = notif.senderName || notif.title || "সম্মানিত গ্রাহক";

    li.innerHTML = `
        <i class="material-icons notification-icon-large">${iconName}</i>
        <div class="notif-content">
            <h4 style="margin: 0 0 5px 0; color: #2c3e50; font-size: 16px; font-weight: 600;">
                ${displayName}
            </h4>
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
