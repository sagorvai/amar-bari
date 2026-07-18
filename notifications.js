// =======================================================
// 🎯 আমার বাড়ি.কম - আলটিমেট নোটিফিকেশন ও টোকেন সিঙ্ক ইঞ্জিন
// =======================================================

const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); // Firebase Cloud Messaging

document.addEventListener("DOMContentLoaded", () => {
    initNotificationPage();
});

/**
 * নোটিফিকেশন পেজের মেইন ইনিশিয়ালাইজেশন ফাংশন (ফিক্সড সিকোয়েন্স)
 */
function initNotificationPage() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("সাইনআপ/লগইন করা ইউজার একটিভ আছেন।");
            
            // ১. আগে গেস্ট মোডের কোনো ডাটা বা টোকেন থাকলে তা অ্যাকাউন্টে মাইগ্রেট করে নেব[cite: 6, 12]
            await migrateGuestDataToUser(user.uid);
            
            // ২. মাইগ্রেশন শেষ হওয়ার পর চেক করব টোকেন আছে কি না, না থাকলে পেজে পারমিশন বক্স দেখাবো[cite: 6, 12]
            await handleUserTokenSetup(user.uid);
            
            // ৩. ইন-অ্যাপ নোটিফিকেশনগুলো ডাটাবেজ থেকে রিয়েল-টাইমে লোড করা[cite: 6, 12]
            listenForUserNotifications(user.uid);
        } else {
            console.log("গেস্ট ইউজার পেজ ব্রাউজ করছেন।");
            loadGuestNotifications(); //[cite: 12]
            await handleGuestTokenSetup(); //[cite: 6, 12]
        }
    });
}

/**
 * ১. সাইনআপ করা ইউজারের ডিভাইস টোকেন ভেরিফিকেশন ও স্মার্ট পারমিশন হ্যান্ডলার
 */
async function handleUserTokenSetup(uid) {
    try {
        let hasExistingToken = false;

        // ফায়ারস্টোরে ইউজারের নিজস্ব ডকুমেন্টে টোকেন আছে কিনা চেক করি[cite: 6, 12]
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists && userDoc.data().fcm_tokens && userDoc.data().fcm_tokens.length > 0) {
            console.log("ফায়ারস্টোরে ইউজারের অ্যাকাউন্টে ইতিমধ্যে টোকেন সংরক্ষিত আছে।[cite: 6, 12]");
            hasExistingToken = true;
        }

        // লোকাল স্টোরেজে কোনো একটিভ টোকেন ব্যাকআপ আছে কিনা চেক করি[cite: 6, 12]
        const localToken = localStorage.getItem("my_fcm_token") || localStorage.getItem("anonymous_fcm_token");
        if (localToken) {
            hasExistingToken = true;
        }

        // 🎯 লজিক: যদি ফায়ারস্টোর বা লোকাল কোথাও টোকেন না পাওয়া যায় এবং পারমিশন default থাকে
        if (!hasExistingToken && Notification.permission === "default") {
            console.log("কোনো টোকেন পাওয়া যায়নি। পারমিশন ব্যানার দেখানো হচ্ছে...");
            
            // পেজের নোটিফিকেশন লিস্টের ঠিক উপরে একটি সুন্দর পারমিশন কার্ড তৈরি করে দেখাবো
            showPermissionBanner(uid);
        } else if (Notification.permission === "granted" && !hasExistingToken) {
            // যদি পারমিশন আগেই দেওয়া থাকে কিন্তু টোকেন হারিয়ে যায়, তবে সরাসরি ব্যাকগ্রাউন্ডে জেনারেট করা সম্ভব
            const currentToken = await messaging.getToken({
                vapidKey: "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"
            });
            if (currentToken) {
                localStorage.setItem("my_fcm_token", currentToken);
                await db.collection("users").doc(uid).set({
                    fcm_tokens: firebase.firestore.FieldValue.arrayUnion(currentToken),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log("পূর্বের গ্র্যান্টেড পারমিশন থেকে টোকেন রিকভার করা হয়েছে।[cite: 6, 12]");
            }
        } else {
            // টোকেন ঠিক থাকলে স্বাগত লাল ব্যাজ লুকিয়ে ফেলা হবে[cite: 6, 12]
            const badge = document.getElementById("notification-badge");
            if (badge) badge.style.display = "none";
        }

    } catch (error) {
        console.error("নোটিফিকেশন পেজে টোকেন ভেরিফিকেশন ও সংগ্রহ করতে সমস্যা হয়েছে: ", error);
    }
}

/**
 * 📢 নোটিফিকেশন পেজের ভেতরে সুন্দর পারমিশন নেওয়ার ব্যানার (ইউজার অ্যাকশন ফিক্স)
 */
function showPermissionBanner(uid) {
    const container = document.getElementById("notification-list");
    if (!container) return;

    // আগে থেকে ব্যানার থাকলে আর তৈরি করবে না
    if (document.getElementById("page-fcm-banner")) return;

    const banner = document.createElement("div");
    banner.id = "page-fcm-banner";
    banner.style.cssText = `
        background: #fff3cd;
        border: 1px solid #ffeeba;
        color: #856404;
        padding: 15px;
        border-radius: 8px;
        margin-bottom: 20px;
        display: flex;
        flex-direction: column;
        gap: 10px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    `;

    banner.innerHTML = `
        <div style="font-weight: bold; font-size: 16px;">🔔 লাইভ নোটিফিকেশন চালু করুন!</div>
        <div style="font-size: 14px; color: #666;">বাড়ির মালিক বা ক্রেতার পাঠানো মেসেজের তাৎক্ষণিক আপডেট এবং নতুন প্রপার্টির নোটিফিকেশন সরাসরি স্ক্রিনে পেতে পারমিশন দিন।</div>
        <button id="page-fcm-allow-btn" style="
            background: #28a745;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: bold;
            align-self: flex-start;
        ">হ্যাঁ, চালু করুন</button>
    `;

    // লিস্টের একদম উপরে ব্যানারটি পুশ করা
    container.insertBefore(banner, container.firstChild);

    // ইউজারের সরাসরি ক্লিকের মাধ্যমে পারমিশন চাওয়া (১০০% কাজ করবে ব্রাউজারে)
    document.getElementById("page-fcm-allow-btn").addEventListener("click", async () => {
        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                const currentToken = await messaging.getToken({
                    vapidKey: "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"
                });

                if (currentToken) {
                    localStorage.setItem("my_fcm_token", currentToken);
                    await db.collection("users").doc(uid).set({
                        fcm_tokens: firebase.firestore.FieldValue.arrayUnion(currentToken),
                        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });
                    
                    console.log("নতুন পারমিশন গ্র্যান্টেড এবং টোকেন ইউজার আইডিতে যুক্ত হয়েছে।[cite: 6, 12]");
                    
                    // কাজ হয়ে গেলে ব্যানার এবং হেডার ব্যাজ রিমুভ করে দেওয়া
                    banner.remove();
                    const badge = document.getElementById("notification-badge");
                    if (badge) badge.style.display = "none";
                }
            } else {
                banner.remove(); // ইউজার ব্লক করলে ব্যানার সরিয়ে দেওয়া
            }
        } catch (err) {
            console.error("ব্যানার থেকে পারমিশন নিতে ভুল হয়েছে:", err);
        }
    });
}

/**
 * ২. গেস্ট থেকে সাইনআপে রূপান্তর (Guest to Signup Migration)[cite: 6, 12]
 */
async function migrateGuestDataToUser(uid) {
    try {
        const guestToken = localStorage.getItem("anonymous_fcm_token");
        const guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];

        if (guestToken) {
            await db.collection("users").doc(uid).set({
                fcm_tokens: firebase.firestore.FieldValue.arrayUnion(guestToken)
            }, { merge: true });

            await db.collection("anonymous_tokens").doc(guestToken).delete(); //[cite: 6, 12]
            localStorage.removeItem("anonymous_fcm_token");
            console.log("गेস্ট টোকেন সফলভাবে ইউজার অ্যাকাউন্টে মাইগ্রেট হয়েছে।[cite: 6, 12]");
        }

        if (guestNotifications.length > 0) {
            const batch = db.batch();
            guestNotifications.forEach((notif) => {
                const notifRef = db.collection("notifications").doc();
                batch.set(notifRef, {
                    ...notif,
                    userId: uid, //[cite: 12]
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit();
            localStorage.removeItem("guest_notifications");
            console.log("গেস্ট নোটিফিকেশন হিস্ট্রি অ্যাকাউন্টে যুক্ত হয়েছে।[cite: 12]");
        }
    } catch (error) {
        console.error("মাইগ্রেশন করতে সমস্যা হয়েছে: ", error);
    }
}

/**
 * ৩. সাইনআপ করা ইউজারের জন্য ফায়ারস্টোর থেকে রিয়েল-টাইমে ইন-অ্যাপ নোটিফিকেশন লোড[cite: 6, 12]
 */
function listenForUserNotifications(uid) {
    const notificationContainer = document.getElementById("notification-list");
    if (!notificationContainer) return;

    db.collection("notifications")
        .where("userId", "==", uid)
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            // ব্যানার ছাড়া বাকি আগের লিস্ট ক্লিয়ার করা
            const banner = document.getElementById("page-fcm-banner");
            notificationContainer.innerHTML = "";
            if (banner) notificationContainer.appendChild(banner);

            if (snapshot.empty) {
                const emptyMsg = document.createElement("p");
                emptyMsg.className = "no-notif-text";
                emptyMsg.innerText = "আপনার নোটিফিকেশন বক্স এখন খালি।";
                notificationContainer.appendChild(emptyMsg);
                updateNotificationBadge(0); //[cite: 6, 12]
                return;
            }

            let unreadCount = 0;

            snapshot.forEach((doc) => {
                const notif = doc.data();
                if (!notif.isRead) unreadCount++;

                const notifItem = createNotificationCard(doc.id, notif); //[cite: 12]
                notificationContainer.appendChild(notifItem);
            });

            updateNotificationBadge(unreadCount); //[cite: 6, 12]
        }, (error) => {
            console.error("নোটিফিকেশন রিয়েল-টাইম লোড ব্যর্থ: ", error);
        });
}

/**
 * ৪. গেস্ট ইউজারের নোটিফিকেশন (লোকাল স্টোরেজ) লোড করা[cite: 12]
 */
function loadGuestNotifications() {
    const notificationContainer = document.getElementById("notification-list");
    if (!notificationContainer) return;

    const guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
    notificationContainer.innerHTML = ""; //[cite: 12]

    if (guestNotifications.length === 0) {
        notificationContainer.innerHTML = `<p class="no-notif-text">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
        updateNotificationBadge(0); //[cite: 12]
        return;
    }

    guestNotifications.forEach((notif, index) => {
        const notifItem = createNotificationCard(`guest_${index}`, notif, true); //[cite: 12]
        notificationContainer.appendChild(notifItem);
    });

    const unreadCount = guestNotifications.filter(n => !n.isRead).length; //[cite: 12]
    updateNotificationBadge(unreadCount);
}

/**
 * ৫. গেস্ট ইউজার যদি পারমিশন দিয়ে থাকে তবে ব্যাকগ্রাউন্ড টোকেন অ্যানোনিমাস কালেকশনে রাখা[cite: 6, 12]
 */
async function handleGuestTokenSetup() {
    try {
        if (Notification.permission === "granted") {
            const currentToken = await messaging.getToken({
                vapidKey: "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"
            });

            if (currentToken) {
                localStorage.setItem("anonymous_fcm_token", currentToken);
                await db.collection("anonymous_tokens").doc(currentToken).set({ //[cite: 6, 12]
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    deviceType: "web"
                });
            }
        }
    } catch (error) {
        console.log("গেস্ট টোকেন সেটআপ স্কিপ করা হয়েছে।[cite: 12]");
    }
}

/**
 * নোটিফিকেশন কার্ডের HTML লেআউট তৈরি[cite: 12]
 */
function createNotificationCard(docId, notif, isGuest = false) {
    const card = document.createElement("div");
    card.className = `notification-card ${notif.isRead ? 'read' : 'unread'}`; //[cite: 12]
    
    let icon = "🔔";
    if (notif.type === "like") icon = "👍";
    else if (notif.type === "save") icon = "❤️";
    else if (notif.type === "price_drop") icon = "🔥";
    else if (notif.type === "khotian") icon = "🔍";
    else if (notif.type === "chat") icon = "💬";

    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const dateStr = notif.timestamp ? new Date(notif.timestamp.seconds * 1000).toLocaleDateString('bn-BD', options) : 'এইমাত্র';

    card.innerHTML = `
        <div class="notif-icon-wrapper">${icon}</div>
        <div class="notif-content-wrapper">
            <h4 class="notif-title">${notif.title}</h4>
            <p class="notif-message">${notif.message}</p>
            <span class="notif-time">${dateStr}</span>
        </div>
    `;

    card.addEventListener("click", () => {
        markAsRead(docId, isGuest); //[cite: 12]
        
        if (notif.type === "chat" && notif.chatId) {
            window.location.href = `chat.html?chatId=${notif.chatId}`;
        } else if (notif.postId) {
            window.location.href = `details.html?id=${notif.postId}`;
        }
    });

    return card;
}

/**
 * নোটিফিকেশন 'পঠিত/Read' মার্ক করার ফাংশন[cite: 12]
 */
async function markAsRead(docId, isGuest) {
    if (isGuest) {
        let guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
        const index = parseInt(docId.split("_")[1]);
        if (guestNotifications[index]) {
            guestNotifications[index].isRead = true;
            localStorage.setItem("guest_notifications", JSON.stringify(guestNotifications));
            loadGuestNotifications(); //[cite: 12]
        }
    } else {
        try {
            await db.collection("notifications").doc(docId).update({
                isRead: true
            });
        } catch (error) {
            console.error("Read স্ট্যাটাস আপডেট করতে সমস্যা: ", error);
        }
    }
}

/**
 * হেডার বা বেল আইকনের লাল ব্যাজ (🔴) আপডেট করার ফাংশন[cite: 6, 12]
 */
function updateNotificationBadge(count) {
    const badge = document.getElementById("notification-badge");
    if (!badge) return;

    if (count > 0) {
        badge.innerText = count;
        badge.style.display = "block"; //[cite: 6, 12]
    } else {
        badge.style.display = "none"; //[cite: 12]
    }
            }
