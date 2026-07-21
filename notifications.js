// =======================================================
// 🎯 আমার বাড়ি.কম - সর্বজনীন স্মার্ট নোটিফিকেশন ইঞ্জিন
// =======================================================

const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); 

const VAPID_KEY = "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"; 

// পেজ লোড হলে কার্যক্রম শুরু
document.addEventListener("DOMContentLoaded", () => {
    initGlobalNotificationSystem();
});

/**
 * গ্লোবাল নোটিফিকেশন সিস্টেম ইনিশিয়ালাইজেশন
 */
function initGlobalNotificationSystem() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("🔓 রেজিস্টার্ড ইউজার একটিভ আছেন।");
            
            // ১. গেস্ট টোকেন সিঙ্ক ও অটো রি-প্রম্পট/রিকভারি ইঞ্জিন রান করা
            await syncGuestTokenToUser(user.uid);
            
            // ২. নতুন ইউজারের জন্য ডাটাবেজে স্বাগত নোটিফিকেশন নিশ্চিত করা
            await ensureUserWelcomeNotification(user.uid);
            
            // ৩. রেজিস্টার্ড ইউজারের রিয়েল-টাইম নোটিফিকেশন লোড
            listenForRegisteredUserNotifications(user.uid);
        } else {
            console.log("🌐 গেস্ট ইউজার ব্রাউজ করছেন। নোটিফিকেশন পেজ উন্মুক্ত।");
            
            // ৪. গেস্ট ইউজারদের জন্য ডাইনামিক মেসেজ বক্স ইন্টারফেস শো করা
            showGuestMessage();
        }
    });
}

/**
 * 📢 গেস্ট ইউজারদের জন্য স্পেশাল নোটিশ/মেসেজ ইন্টারফেস রেন্ডারার
 */
function showGuestMessage() {
    const notificationContainer = document.getElementById("notifications-list"); // আপনার HTML এর কন্টেইনার
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
            <!-- একটি সুন্দর নোটিফিকেশন অ্যানিমেটেড বা স্ট্যাটিক আইকন -->
            <div style="font-size: 50px; color: #ffc107; margin-bottom: 15px;">🔔</div>
            
            <h3 style="color: #2c3e50; margin: 0 0 10px 0; font-size: 20px; font-weight: 700;">
                পারমিশন অ্যালাউ করার জন্য ধন্যবাদ!
            </h3>
            
            <p style="color: #7f8c8d; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0;">
                আপনার কাঙ্ক্ষিত প্লট, বাড়ি বা ফ্ল্যাটের সর্বশেষ লাইভ আপডেট ও ক্রেতা-বিক্রেতাদের চ্যাট মেসেজের রিয়েল-টাইম নোটিফিকেশন দেখতে দয়া করে আপনার অ্যাকাউন্টে লগইন করুন।
            </p>
            
            <!-- লগইন করার বাটন -->
            <a href="auth.html" style="
                background: #1877f2; 
                color: #fff; 
                padding: 10px 25px; 
                text-decoration: none; 
                border-radius: 20px; 
                font-weight: bold;
                display: inline-block;
                box-shadow: 0 3px 8px rgba(24, 119, 242, 0.3);
                transition: background 0.2s;
            }" onmouseover="this.style.background='#166fe5'" onmouseout="this.style.background='#1877f2'">
                এখনই লগইন করুন
            </a>
        </div>
    `;

    // গেস্টদের জন্য হেডার ব্যাজ জিরো (Hided) করে দেওয়া
    const headerBadge = document.getElementById("notification-badge") || document.getElementById("notification-count");
    if (headerBadge) headerBadge.style.display = "none";
}

/**
 * 🔄 টোকেন সিঙ্ক, অটো রি-প্রম্পট এবং পারমিশন রিকভারি লজিক (Updated)
 */
async function syncGuestTokenToUser(uid) {
    try {
        // ১. লোকাল স্টোরেজে গেস্ট টোকেন থাকলে তা সিঙ্ক করা
        const localToken = localStorage.getItem("my_fcm_token");
        if (localToken) {
            await saveTokenToFirestore(uid, localToken);
            await db.collection("anonymous_tokens").doc(localToken).delete();
            localStorage.removeItem("my_fcm_token"); // সিঙ্ক শেষে লোকাল স্টোরেজ ক্লিয়ার
            console.log("🎉 গেস্ট টোকেন সফলভাবে ইউজার অ্যাকাউন্টে স্থানান্তরিত হয়েছে।");
            return;
        }

        // ২. অলরেডি পারমিশন দেওয়া থাকলে ব্যাকগ্রাউন্ডে ক্রস-চেক ও রিকভারি করা
        if (Notification.permission === "granted") {
            const currentToken = await messaging.getToken({ vapidKey: VAPID_KEY });
            if (currentToken) {
                await saveTokenToFirestore(uid, currentToken);
            }
        } 
        // ৩. পারমিশন যদি ডিফল্ট (মিসিং) থাকে, তবে বাটনের মাধ্যমে রি-প্রম্পট করা
        else if (Notification.permission === "default") {
            console.log("🔔 নোটিফিকেশন পারমিশন ডিফল্ট মোডে আছে। ইউজারের বাটন ক্লিকের অপেক্ষা করা হচ্ছে...");
            showEnableNotificationButton(uid);
        }
        // ৪. ইউজার ব্লক করে রাখলে সহায়তামূলক ব্যানার দেখানো
        else if (Notification.permission === "denied") {
            showPermissionDeniedBanner();
        }

    } catch (error) {
        console.error("💥 টোকেন সংগ্রহ বা পারমিশন রিকভারিতে সমস্যা: ", error);
    }
}

/**
 * 💾 ফায়ারস্টোরে টোকেন সেভ করার হেল্পার ফাংশন
 */
async function saveTokenToFirestore(uid, token) {
    await db.collection("users").doc(uid).set({
        fcmToken: token,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    console.log("✅ FCM Token সফলভাবে ফায়ারস্টোরে সুরক্ষিত করা হয়েছে।");
}

/**
 * ⚡ পারমিশন মিসিং থাকলে নোটিফিকেশন লিস্টের ওপরে প্রম্পট বাটন তৈরি
 */
function showEnableNotificationButton(uid) {
    const listContainer = document.getElementById("notifications-list");
    if (!listContainer) return;

    if (document.getElementById("enable-notif-banner")) return;

    const banner = document.createElement("div");
    banner.id = "enable-notif-banner";
    banner.style = `
        background: #e8f0fe; 
        color: #1a73e8; 
        padding: 15px; 
        border: 1px solid #d2e3fc; 
        border-radius: 10px; 
        margin-bottom: 20px; 
        text-align: center;
        font-family: 'Hind Siliguri', sans-serif;
    `;
    banner.innerHTML = `
        <p style="margin: 0 0 10px 0; font-size: 14px; font-weight: bold;">
            🚀 লাইভ আপডেট ও চ্যাট নোটিফিকেশন মিস করতে না চাইলে পুশ নোটিফিকেশন সচল করুন!
        </p>
        <button id="btn-grant-now" style="
            background: #1a73e8; 
            color: white; 
            border: none; 
            padding: 8px 20px; 
            border-radius: 20px; 
            font-weight: bold; 
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(26,115,232,0.3);
        ">নোটিফিকেশন চালু করুন</button>
    `;

    listContainer.parentNode.insertBefore(banner, listContainer);

    // ইউজার বাটনে ক্লিক করলে ব্রাউজার প্রম্পট পপ-আপ ওপেন হবে (এটি ব্রাউজার পলিসি ফ্রেন্ডলি)
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

/**
 * ⚠️ ইউজার ব্লক করে রাখলে সহায়তামূলক ব্যানার
 */
function showPermissionDeniedBanner() {
    const listContainer = document.getElementById("notifications-list");
    if (!listContainer) return;
    
    if (document.getElementById("permission-denied-alert")) return;

    const alertBanner = document.createElement("div");
    alertBanner.id = "permission-denied-alert";
    alertBanner.style = `
        background: #fff3cd; 
        color: #856404; 
        padding: 12px; 
        border: 1px solid #ffeeba; 
        border-radius: 8px; 
        margin-bottom: 15px; 
        font-size: 13px;
        text-align: center;
        font-family: 'Hind Siliguri', sans-serif;
    `;
    alertBanner.innerHTML = `
        <strong>বিজ্ঞপ্তি:</strong> আপনার ব্রাউজারে নোটিফিকেশন ব্লক করা আছে। লাইভ চ্যাট ও প্রপার্টি আপডেট পেতে ব্রাউজারের অ্যাড্রেস বারের লক (🔒) আইকনে ক্লিক করে নোটিফিকেশন <strong>Allow</strong> করে দিন।
    `;
    listContainer.parentNode.insertBefore(alertBanner, listContainer);
}

/**
 * 🎁 সাইনআপ করা সকল ইউজারের জন্য ইন-অ্যাপ স্বাগত মেসেজ নিশ্চিত করা
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
                title: "👋 আমার বাড়ি প্ল্যাটফর্মে আপনাকে স্বাগত!",
                message: "আমাদের সাথে যুক্ত হওয়ার জন্য আপনাকে আন্তরিক ধন্যবাদ। সেরা সব প্রপার্টি ডিল এবং ক্রেতা-বিক্রেতার চ্যাট মেসেজের লাইভ আপডেট পেতে এই মেসেজটিতে ক্লিক করে নোটিফিকেশন সচল করুন।",
                type: "welcome",
                isRead: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("ইউজারের স্বাগত নোটিফিকেশন ডাটাবেজে যুক্ত হয়েছে।");
        }
    } catch (error) {
        console.error("স্বাগত নোটিফিকেশন তৈরিতে ব্যর্থ: ", error);
    }
}

/**
 * 🔔 রেজিস্টার্ড ইউজারের নোটিফিকেশন লোড ও ব্যাজ লজিক
 */
function listenForRegisteredUserNotifications(uid) {
    const notificationContainer = document.getElementById("notifications-list");
    if (!notificationContainer) return;

    db.collection("notifications")
        .where("userId", "==", uid)
        .onSnapshot((snapshot) => {
            notificationContainer.innerHTML = "";

            if (snapshot.empty) {
                notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
                return;
            }

            let docsArray = [];
            snapshot.forEach((doc) => {
                docsArray.push({ id: doc.id, data: doc.data() });
            });

            // ক্লায়েন্ট সাইড সর্টিং (নতুন নোটিফিকেশন ওপরে থাকবে)
            docsArray.sort((a, b) => {
                const tA = a.data.timestamp ? (a.data.timestamp.seconds || new Date(a.data.timestamp).getTime()) : 0;
                const tB = b.data.timestamp ? (b.data.timestamp.seconds || new Date(b.data.timestamp).getTime()) : 0;
                return tB - tA;
            });

            docsArray.forEach((item) => {
                const notif = item.data;
                const notifItem = createNotificationCard(item.id, notif, uid, false);
                notificationContainer.appendChild(notifItem);
            });
        }, (error) => {
            console.error("নোটিফিকেশন লোড এরর: ", error);
        });
}

/**
 * 🎴 সর্বজনীন নোটিফিকেশন কার্ড ও ক্লিক-পারমিশন মেকানিজম
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
        await markAsRead(docId, isGuest);
        
        if (notif.type === "chat" && notif.chatId) {
            window.location.href = `messages.html?chatId=${notif.chatId}&postId=${notif.postId || ''}&action=direct`;
        } else if (notif.postId) {
            window.location.href = `details.html?id=${notif.postId}`;
        }
    });

    return li;
}

/**
 * নোটিফিকেশন রিড মার্ক করার সাধারণ ফাংশন
 */
async function markAsRead(docId, isGuest) {
    try {
        await db.collection("notifications").doc(docId).update({ isRead: true });
    } catch (error) {
        console.error("রিড স্টেট আপডেট এরর: ", error);
    }
    }


