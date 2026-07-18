// =======================================================
// 🎯 আমার বাড়ি.কম - আলটিমেট নোটিফিকেশন ও টোকেন সিঙ্ক ইঞ্জিন (সংশোধিত)
// =======================================================

const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); // Firebase Cloud Messaging

document.addEventListener("DOMContentLoaded", () => {
    initNotificationPage();
});

/**
 * নোটিফিকেশন পেজের মেইন ইনিশিয়ালাইজেশন ফাংশন
 */
function initNotificationPage() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("সাইনআপ/লগইন করা ইউজার একটিভ আছেন।");
            
            // ১. আগে গেস্ট মোডের কোনো ডাটা বা টোকেন থাকলে তা অ্যাকাউন্টে মাইগ্রেট করে নেব
            await migrateGuestDataToUser(user.uid);
            
            // ২. ইন-অ্যাপ নোটিফিকেশনগুলো ডাটাবেজ থেকে রিয়েল-টাইমে লোড করা
            listenForUserNotifications(user.uid);
        } else {
            console.log("গেস্ট ইউজার পেজ ব্রাউজ করছেন।");
            loadGuestNotifications(); 
            await handleGuestTokenSetup(); 
        }
    });
}

/**
 * 📢 ইউজারের ক্লিকের পর টোকেন সংগ্রহ ও পারমিশন ভেরিফিকেশন লজিক
 */
async function triggerTokenSetupOnUserAction(uid) {
    try {
        let hasExistingToken = false;

        // ফায়ারস্টোরে টোকেন আছে কিনা চেক করি
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists && userDoc.data().fcm_tokens && userDoc.data().fcm_tokens.length > 0) {
            console.log("ফায়ারস্টোরে ইতিমধ্যে টোকেন সংরক্ষিত আছে।");
            hasExistingToken = true;
        }

        // লোকাল স্টোরেজ চেক করি
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
                    console.log("টোকেন সফলভাবে ইউজার আইডিতে যুক্ত হয়েছে।");
                }
            }
        } else if (Notification.permission === "granted" && !hasExistingToken) {
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
 * ৩. সাইনআপ করা ইউজারের জন্য ফায়ারস্টোর থেকে রিয়েল-টাইমে ইন-অ্যাপ নোটিফিকেশন লোড
 */
function listenForUserNotifications(uid) {
    // 🎯 ফিক্স: HTML ফাইলের অরিজিনাল আইডি 'notifications-list' সিলেক্ট করা হলো
    const notificationContainer = document.getElementById("notifications-list");
    if (!notificationContainer) return;

    db.collection("notifications")
        .where("userId", "==", uid)
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            notificationContainer.innerHTML = ""; 

            if (snapshot.empty) {
                notificationContainer.innerHTML = `<p style="text-align: center; color: #555; padding: 20px;">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
                updateNotificationBadge(0); 
                return;
            }

            let unreadCount = 0;

            snapshot.forEach((doc) => {
                const notif = doc.data();
                
                // 🎯 ফিক্স: ফায়ারস্টোরে 'isRead' বা 'read' যেকোনো একটি ফিল্ড থাকলেই যেন ট্র্যাকিং ঠিক থাকে
                const isNotificationRead = (notif.isRead !== undefined) ? notif.isRead : notif.read;
                if (!isNotificationRead) unreadCount++;

                // নোটিফিকেশনের HTML কার্ড তৈরি
                const notifItem = createNotificationCard(doc.id, notif, false, uid); 
                notificationContainer.appendChild(notifItem);
            });

            updateNotificationBadge(unreadCount); 
        }, (error) => {
            console.error("নোটিফিকেশন রিয়েল-টাইম লোড ব্যর্থ: ", error);
        });
}

/**
 * নোটিফিকেশন কার্ডের HTML লেআউট তৈরি
 */
function createNotificationCard(docId, notif, isGuest = false, uid = null) {
    const card = document.createElement("li"); // 🎯 ফিক্স: HTML-এর কাস্টম সিএসএস ম্যাচ করার জন্য div থেকে li করা হলো
    
    const isNotificationRead = (notif.isRead !== undefined) ? notif.isRead : notif.read;
    card.className = `notification-item ${isNotificationRead ? 'read' : 'unread'}`; // 🎯 ফিক্স: HTML-এর অরিজিনাল সিএসএস ক্লাস '.notification-item' ম্যাপ করা হলো
    
    let icon = "notifications";
    if (notif.type === "welcome") icon = "celebration";
    else if (notif.type === "like") icon = "thumb_up";
    else if (notif.type === "save") icon = "favorite";
    else if (notif.type === "price_drop") icon = "local_fire_department";
    else if (notif.type === "chat") icon = "chat";

    const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    const dateStr = notif.timestamp ? new Date(notif.timestamp.seconds * 1000).toLocaleDateString('bn-BD', options) : 'এইমাত্র';

    card.innerHTML = `
        <i class="material-icons notification-icon-large">${icon}</i>
        <div class="notif-content">
            <h4 style="margin: 0; font-size: 15px; color: #1877f2;">${notif.title}</h4>
            <p class="notif-text">${notif.message}</p>
        </div>
        <span class="notif-time">${dateStr}</span>
    `;

    // 🎯 কার্ডে ক্লিক করার ইভেন্ট লিসেনার
    card.addEventListener("click", async () => {
        // ১. নোটিফিকেশনটি পঠিত (Read) মার্ক করা
        markAsRead(docId, isGuest);

        // ২. স্বাগত নোটিফিকেশনে ক্লিক করলেই সাথে সাথে টোকেন চেকিং ও পারমিশন প্রম্পট রান হবে
        if (notif.type === "welcome" && uid) {
            await triggerTokenSetupOnUserAction(uid);
        }
        
        // ৩. অন্যান্য নোটিফিকেশনের স্বাভাবিক রিডাইরেক্ট লজিক
        if (notif.type === "chat" && notif.chatId) {
            window.location.href = `chat.html?chatId=${notif.chatId}`;
        } else if (notif.postId) {
            window.location.href = `details.html?id=${notif.postId}`;
        }
    });

    return card;
}

/**
 * ২. গেস্ট থেকে সাইনআপে রূপান্তর (Guest to Signup Migration)
 */
async function migrateGuestDataToUser(uid) {
    try {
        const guestToken = localStorage.getItem("anonymous_fcm_token");
        const guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];

        if (guestToken) {
            await db.collection("users").doc(uid).set({
                fcm_tokens: firebase.firestore.FieldValue.arrayUnion(guestToken)
            }, { merge: true });

            await db.collection("anonymous_tokens").doc(guestToken).delete(); 
            localStorage.removeItem("anonymous_fcm_token");
        }

        if (guestNotifications.length > 0) {
            const batch = db.batch();
            guestNotifications.forEach((notif) => {
                const notifRef = db.collection("notifications").doc();
                batch.set(notifRef, {
                    ...notif,
                    userId: uid, 
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
 * ৪. গেস্ট ইউজারের নোটিফিকেশন লোড করা
 */
function loadGuestNotifications() {
    const notificationContainer = document.getElementById("notifications-list"); // 🎯 ফিক্সড আইডি
    if (!notificationContainer) return;

    const guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
    notificationContainer.innerHTML = ""; 

    if (guestNotifications.length === 0) {
        notificationContainer.innerHTML = `<p style="text-align: center; color: #555; padding: 20px;">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
        updateNotificationBadge(0); 
        return;
    }

    guestNotifications.forEach((notif, index) => {
        const notifItem = createNotificationCard(`guest_${index}`, notif, true); 
        notificationContainer.appendChild(notifItem);
    });

    const unreadCount = guestNotifications.filter(n => !n.isRead || !n.read).length; 
    updateNotificationBadge(unreadCount);
}

/**
 * ৫. গেস্ট ইউজার টোকেন অ্যানোনিমাস কালেকশনে রাখা
 */
async function handleGuestTokenSetup() {
    try {
        if (Notification.permission === "granted") {
            const currentToken = await messaging.getToken({
                vapidKey: "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"
            });

            if (currentToken) {
                localStorage.setItem("anonymous_fcm_token", currentToken);
                await db.collection("anonymous_tokens").doc(currentToken).set({ 
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    deviceType: "web"
                });
            }
        }
    } catch (error) {
        console.log("গেস্ট টোকেন সেটআপ স্কিপ করা হয়েছে।");
    }
}

/**
 * নোটিফিকেশন 'পঠিত/Read' মার্ক করার ফাংশন
 */
async function markAsRead(docId, isGuest) {
    if (isGuest) {
        let guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
        const index = parseInt(docId.split("_")[1]);
        if (guestNotifications[index]) {
            guestNotifications[index].isRead = true;
            guestNotifications[index].read = true;
            localStorage.setItem("guest_notifications", JSON.stringify(guestNotifications));
            loadGuestNotifications(); 
        }
    } else {
        try {
            // 🎯 ফিক্স: ফায়ারস্টোরে 'isRead' এবং 'read' দুই ফিল্ডই ট্রু করে দেওয়া হচ্ছে ফেইল-সেফ রাখার জন্য
            await db.collection("notifications").doc(docId).update({
                isRead: true,
                read: true
            });
        } catch (error) {
            console.error("Read স্ট্যাটাস আপডেট করতে সমস্যা: ", error);
        }
    }
}

/**
 * হেডার বা বেল আইকনের লাল ব্যাজ (🔴) আপডেট করার ফাংশন
 */
function updateNotificationBadge(count) {
    // 🎯 ফিক্স: index.html এবং notifications.html এর উভয় আইডিই হ্যান্ডেল করা হলো
    const badge = document.getElementById("notification-badge") || document.getElementById("notification-count");
    if (!badge) return;

    if (count > 0) {
        badge.innerText = count;
        badge.style.display = "inline-block"; 
    } else {
        badge.style.display = "none"; 
    }
                                }
