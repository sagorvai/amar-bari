// =======================================================
// 🎯 আমার বাড়ি.কম - আলটিমেট নোটিফিকেশন ও টোকেন সিঙ্ক ইঞ্জিন
// =======================================================

// ফায়ারবেস কনফিগারেশন এবং ইনিশিয়ালাইজেশন গ্লোবালি করা আছে ধরে নেওয়া হয়েছে
const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); // Firebase Cloud Messaging

// পেজ লোড হলে কাজ শুরু হবে
document.addEventListener("DOMContentLoaded", () => {
    initNotificationPage();
});

/**
 * নোটিফিকেশন পেজের মেইন ইনিশিয়ালাইজেশন ফাংশন (ফিক্সড সিকোয়েন্স)
 */
function initNotificationPage() {
    // ইউজার সাইন-ইন স্টেট পর্যবেক্ষণ
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("সাইনআপ/লগইন করা ইউজার একটিভ আছেন।");
            
            // ১. আগে গেস্ট মোডের কোনো ডাটা বা টোকেন থাকলে তা অ্যাকাউন্টে মাইগ্রেট করে নেব[cite: 6, 12]
            await migrateGuestDataToUser(user.uid);
            
            // ২. মাইগ্রেশন শেষ হওয়ার পর চেক করব টোকেন আছে কি না, না থাকলে পারমিশন চাবো[cite: 6, 12]
            await handleUserTokenSetup(user.uid);
            
            // ৩. ইন-অ্যাপ নোটিফিকেশনগুলো ডাটাবেজ থেকে রিয়েল-টাইমে লোড করা[cite: 6, 12]
            listenForUserNotifications(user.uid);
        } else {
            console.log("গেস্ট ইউজার পেজ ব্রাউজ করছেন।");
            // ৪. গেস্ট ইউজারের নোটিফিকেশন (লোকাল স্টোরেজ ভিত্তিক) লোড করা[cite: 12]
            loadGuestNotifications();
            // ৫. গেস্ট ইউজার পারমিশন দিলে তার টোকেন অ্যানোনিমাস কালেকশনে রাখা[cite: 6, 12]
            await handleGuestTokenSetup();
        }
    });
}

/**
 * ১. সাইনআপ করা ইউজারের ডিভাইস টোকেন ভেরিফিকেশন ও পারমিশন প্রম্পট লজিক
 */
async function handleUserTokenSetup(uid) {
    try {
        let hasExistingToken = false;

        // ফায়ারস্টোরে ইউজারের নিজস্ব ডকুমেন্টে টোকেন আছে কিনা গভীর চেক করি[cite: 6, 12]
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

        // 🎯 লজিক: যদি ফায়ারস্টোর বা লোকাল কোথাও টোকেন না পাওয়া যায়
        if (!hasExistingToken) {
            console.log("কোথাও কোনো টোকেন পাওয়া যায়নি। পারমিশনের জন্য চেক করা হচ্ছে...");

            // যদি ব্রাউজারের পারমিশন এখনো default (জিজ্ঞাসা করা হয়নি বা ইউজার এড়িয়ে গেছে) থাকে
            if (Notification.permission === "default") {
                console.log("নোটিফিকেশন পেজ থেকে সরাসরি পারমিশন প্রম্পট ওপেন করা হচ্ছে...");
                
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
                        
                        // স্বাগত লাল ব্যাজ মুছে ফেলা (যদি থাকে)[cite: 6, 12]
                        const badge = document.getElementById("notification-badge");
                        if (badge) badge.style.display = "none";
                    }
                } else {
                    console.log("ইউজার নোটিফিকেশন পারমিশন Deny বা ব্লক করেছেন।");
                }
            } 
            // যদি পারমিশন আগেই granted থাকে কিন্তু কোনো কারণে টোকেন ডাটাবেজে না থাকে
            else if (Notification.permission === "granted") {
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
            }
        } else {
            console.log("ইউজারের টোকেন সচল আছে, নতুন করে পারমিশন চাওয়ার প্রয়োজন নেই।");
            // টোকেন ঠিক থাকলে স্বাগত লাল ব্যাজ লুকিয়ে ফেলা হবে[cite: 6, 12]
            const badge = document.getElementById("notification-badge");
            if (badge) badge.style.display = "none";
        }

    } catch (error) {
        console.error("নোটিফিকেশন পেজে টোকেন ভেরিফিকেশন ও সংগ্রহ করতে সমস্যা হয়েছে: ", error);
    }
}

/**
 * ২. গেস্ট থেকে সাইনআপে রূপান্তর (Guest to Signup Migration)[cite: 6, 12]
 */
async function migrateGuestDataToUser(uid) {
    try {
        const guestToken = localStorage.getItem("anonymous_fcm_token");
        const guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];

        // যদি লোকাল স্টোরেজে গেস্ট টোকেন থাকে, তবে তা ইউজারের মেইন প্রোফাইলে নিয়ে যাওয়া[cite: 6, 12]
        if (guestToken) {
            await db.collection("users").doc(uid).set({
                fcm_tokens: firebase.firestore.FieldValue.arrayUnion(guestToken)
            }, { merge: true });

            // পুরানো অ্যানোনিমাস কালেকশন থেকে ডিলিট করা (ক্লিনআপ)[cite: 6, 12]
            await db.collection("anonymous_tokens").doc(guestToken).delete();
            localStorage.removeItem("anonymous_fcm_token");
            console.log("게স্ট টোকেন সফলভাবে ইউজার অ্যাকাউন্টে মাইগ্রেট হয়েছে।[cite: 6, 12]");
        }

        // যদি গেস্ট মোডে থাকা অবস্থায় কোনো নোটিফিকেশন লোকাল স্টোরেজে সেভ হয়ে থাকে[cite: 12]
        if (guestNotifications.length > 0) {
            const batch = db.batch();
            guestNotifications.forEach((notif) => {
                const notifRef = db.collection("notifications").doc();
                batch.set(notifRef, {
                    ...notif,
                    userId: uid, // এখন এটি সাইনআপ ইউজারের আইডি হয়ে গেল[cite: 12]
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

    // ইউজারের আইডি অনুযায়ী নোটিফিকেশন কুয়েরি করা (সর্বশেষগুলো আগে আসবে)[cite: 12]
    db.collection("notifications")
        .where("userId", "==", uid)
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            notificationContainer.innerHTML = ""; // আগের লিস্ট ক্লিয়ার করা[cite: 12]

            if (snapshot.empty) {
                notificationContainer.innerHTML = `<p class="no-notif-text">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
                updateNotificationBadge(0); // বেলের লাল ডট আপডেট[cite: 6, 12]
                return;
            }

            let unreadCount = 0;

            snapshot.forEach((doc) => {
                const notif = doc.data();
                if (!notif.isRead) unreadCount++;

                // নোটিফিকেশনের HTMLカード তৈরি[cite: 12]
                const notifItem = createNotificationCard(doc.id, notif);
                notificationContainer.appendChild(notifItem);
            });

            // হেডার বা বেল আইকনে লাল ব্যাজ বা সংখ্যা আপডেট[cite: 6, 12]
            updateNotificationBadge(unreadCount);
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
        // গেস্ট নোটিফিকেশন কার্ড তৈরি (ইনডেক্স ব্যবহার করে ইউনিক আইডি দেওয়া)[cite: 12]
        const notifItem = createNotificationCard(`guest_${index}`, notif, true);
        notificationContainer.appendChild(notifItem);
    });

    // আনরিড কাউন্ট গেস্টদের জন্যও ব্যাজে দেখানো[cite: 12]
    const unreadCount = guestNotifications.filter(n => !n.isRead).length;
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
                
                // ফায়ারস্টোর কালেকশনে রাখা[cite: 6, 12]
                await db.collection("anonymous_tokens").doc(currentToken).set({
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
    
    // টাইপ অনুযায়ী সুন্দর আইকন ডিফাইন করা[cite: 12]
    let icon = "🔔";
    if (notif.type === "like") icon = "👍";
    else if (notif.type === "save") icon = "❤️";
    else if (notif.type === "price_drop") icon = "🔥";
    else if (notif.type === "khotian") icon = "🔍";
    else if (notif.type === "chat") icon = "💬";

    // নোটিফিকেশনের ডেট ফরম্যাট করা[cite: 12]
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

    // কার্ডে ক্লিক করলে 'পঠিত' (Mark as Read) করার লজিক[cite: 12]
    card.addEventListener("click", () => {
        markAsRead(docId, isGuest);
        
        // টাইপ অনুযায়ী নির্দিষ্ট পেজে রিডাইরেক্ট করা[cite: 12]
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
        // গেস্টের জন্য লোকাল স্টোরেজ আপডেট[cite: 12]
        let guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
        const index = parseInt(docId.split("_")[1]);
        if (guestNotifications[index]) {
            guestNotifications[index].isRead = true;
            localStorage.setItem("guest_notifications", JSON.stringify(guestNotifications));
            loadGuestNotifications(); // পেজ রিফ্রেশ ছাড়া রেন্ডার[cite: 12]
        }
    } else {
        // সাইনআপ ইউজারের জন্য সরাসরি ফায়ারস্টোর আপডেট[cite: 12]
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
        badge.style.display = "block"; // সংখ্যা থাকলে লাল ব্যাজ দেখাবে[cite: 6, 12]
    } else {
        badge.style.display = "none";  // কোনো নতুন নোটিফিকেশন না থাকলে হাইড থাকবে[cite: 12]
    }
                     }
