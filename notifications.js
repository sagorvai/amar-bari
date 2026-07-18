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
 * নোটিফিকেশন পেজের মেইন ইনিশিয়ালাইজেশন ফাংশন[cite: 12]
 */
function initNotificationPage() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("সাইনআপ/লগইন করা ইউজার একটিভ আছেন।");
            
            // ১. আগে গেস্ট মোডের কোনো ডাটা বা টোকেন থাকলে তা অ্যাকাউন্টে মাইগ্রেট করে নেব[cite: 6, 12]
            await migrateGuestDataToUser(user.uid);
            
            // ২. ইন-অ্যাপ নোটিফিকেশনগুলো ডাটাবেজ থেকে রিয়েল-টাইমে লোড করা[cite: 6, 12]
            listenForUserNotifications(user.uid);
        } else {
            console.log("গেস্ট ইউজার পেজ ব্রাউজ করছেন।");
            loadGuestNotifications(); //[cite: 12]
            await handleGuestTokenSetup(); //[cite: 6, 12]
        }
    });
}

/**
 * 📢 ইউজারের ক্লিকের পর টোকেন সংগ্রহ ও পারমিশন ভেরিফিকেশন লজিক
 * (এটি কার্ডে ক্লিকের পর রান হবে, তাই ব্রাউজার ১০০% এলাউ করবে)
 */
async function triggerTokenSetupOnUserAction(uid) {
    try {
        let hasExistingToken = false;

        // ফায়ারস্টোরে টোকেন আছে কিনা চেক করি[cite: 6, 12]
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists && userDoc.data().fcm_tokens && userDoc.data().fcm_tokens.length > 0) {
            console.log("ফায়ারস্টোরে ইতিমধ্যে টোকেন সংরক্ষিত আছে।[cite: 6, 12]");
            hasExistingToken = true;
        }

        // লোকাল স্টোরেজ চেক করি[cite: 6, 12]
        const localToken = localStorage.getItem("my_fcm_token") || localStorage.getItem("anonymous_fcm_token");
        if (localToken) {
            hasExistingToken = true;
        }

        // 🎯 যদি টোকেন না থাকে এবং পারমিশন default থাকে, তবে প্রম্পট দেখাবে
        if (!hasExistingToken && Notification.permission === "default") {
            console.log("ইউজার অ্যাকশনের মাধ্যমে সরাসরি পারমিশন প্রম্পট ওপেন করা হচ্ছে...");
            
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
                    console.log("টোকেন সফলভাবে ইউজার আইডিতে যুক্ত হয়েছে।[cite: 6, 12]");
                }
            }
        } else if (Notification.permission === "granted" && !hasExistingToken) {
            // পারমিশন আগে থেকে এলাউ থাকলে সরাসরি টোকেন জেনারেট করে নেওয়া
            const currentToken = await messaging.getToken({
                vapidKey: "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"
            });
            if (currentToken) {
                localStorage.setItem("my_fcm_token", currentToken);
                await db.collection("users").doc(uid).set({
                    fcm_tokens: firebase.firestore.FieldValue.arrayUnion(currentToken),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }
    } catch (error) {
        console.error("টোকেন সংগ্রহ করতে সমস্যা হয়েছে: ", error);
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
            notificationContainer.innerHTML = ""; //[cite: 12]

            if (snapshot.empty) {
                notificationContainer.innerHTML = `<p class="no-notif-text">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
                updateNotificationBadge(0); //[cite: 6, 12]
                return;
            }

            let unreadCount = 0;

            snapshot.forEach((doc) => {
                const notif = doc.data();
                if (!notif.isRead) unreadCount++;

                // নোটিফিকেশনের HTML কার্ড তৈরি[cite: 12]
                const notifItem = createNotificationCard(doc.id, notif, false, uid); 
                notificationContainer.appendChild(notifItem);
            });

            updateNotificationBadge(unreadCount); //[cite: 6, 12]
        }, (error) => {
            console.error("নোটিফিকেশন রিয়েল-টাইম লোড ব্যর্থ: ", error);
        });
}

/**
 * নোটিফিকেশন কার্ডের HTML লেআউট তৈরি[cite: 12]
 */
function createNotificationCard(docId, notif, isGuest = false, uid = null) {
    const card = document.createElement("div");
    card.className = `notification-card ${notif.isRead ? 'read' : 'unread'}`; //[cite: 12]
    
    let icon = "🔔";
    if (notif.type === "welcome") icon = "🎉";
    else if (notif.type === "like") icon = "👍";
    else if (notif.type === "save") icon = "❤️";
    else if (notif.type === "price_drop") icon = "🔥";
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

    // 🎯 কার্ডে ক্লিক করার ইভেন্ট লিসেনার
    card.addEventListener("click", async () => {
        // ১. নোটিফিকেশনটি পঠিত (Read) মার্ক করা[cite: 12]
        markAsRead(docId, isGuest);

        // ২. আপনার পরিকল্পনা: স্বাগত নোটিফিকেশনে ক্লিক করলেই সাথে সাথে টোকেন চেকিং ও পারমিশন প্রম্পট রান হবে
        if (notif.type === "welcome" && uid) {
            await triggerTokenSetupOnUserAction(uid);
        }
        
        // ৩. অন্যান্য নোটিফিকেশনের স্বাভাবিক রিডাইরেক্ট লজিক[cite: 12]
        if (notif.type === "chat" && notif.chatId) {
            window.location.href = `chat.html?chatId=${notif.chatId}`;
        } else if (notif.postId) {
            window.location.href = `details.html?id=${notif.postId}`;
        }
    });

    return card;
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
        }
    } catch (error) {
        console.error("মাইগ্রেশন করতে সমস্যা হয়েছে: ", error);
    }
}

/**
 * ৪. গেস্ট ইউজারের নোটিফিকেশন লোড করা[cite: 12]
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
 * ৫. গেস্ট ইউজার টোকেন অ্যানোনিমাস কালেকশনে রাখা[cite: 6, 12]
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
