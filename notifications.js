// Firebase কনফিগারেশন এবং ইনিশিয়ালাইজেশন (তোমার প্রজেক্টের সাথে মিলিয়ে নিও)
// assumed firebase, db (firestore), auth, and messaging are already initialized globally or imported

const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); // Firebase Cloud Messaging

// পেজ লোড হলে কাজ শুরু হবে
document.addEventListener("DOMContentLoaded", () => {
    initNotificationPage();
});

/**
 * নোটিফিকেশন পেজের মেইন ইনিশিয়ালাইজেশন ফাংশন
 */
function initNotificationPage() {
    // ইউজার সাইন-ইন স্টেট পর্যবেক্ষণ
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log("সাইনআপ/লগইন করা ইউজার একটিভ আছেন।");
            // ১. সাইনআপ ইউজারের জন্য ডিভাইস টোকেন সংগ্রহ ও আপডেট করা[cite: 6]
            await handleUserTokenSetup(user.uid);
            // ২. গেস্ট মোডের কোনো ডাটা বা টোকেন থাকলে তা নতুন অ্যাকাউন্টে মাইগ্রেট করা[cite: 6]
            await migrateGuestDataToUser(user.uid);
            // ৩. ইন-অ্যাপ নোটিফিকেশনগুলো ডাটাবেজ থেকে রিয়েল-টাইমে লোড করা[cite: 6]
            listenForUserNotifications(user.uid);
        } else {
            console.log("গেস্ট ইউজার পেজ ব্রাউজ করছেন।");
            // ৪. গেস্ট ইউজারের নোটিফিকেশন (লোকাল স্টোরেজ ভিত্তিক) লোড করা
            loadGuestNotifications();
            // ৫. গেস্ট ইউজার পারমিশন দিলে তার টোকেন অ্যানোনিমাস কালেকশনে রাখা[cite: 6]
            await handleGuestTokenSetup();
        }
    });
}

/**
 * ১. সাইনআপ করা ইউজারের ডিভাইস টোকেন সংগ্রহ ও ফায়ারস্টোরে সেভ করার লজিক[cite: 6]
 */
async function handleUserTokenSetup(uid) {
    try {
        // ব্রাউজারে নোটিফিকেশন পারমিশন চেক করা
        if (Notification.permission === "granted") {
            // FCM থেকে ইউনিক ডিভাইস টোকেন জেনারেট করা[cite: 6]
            const currentToken = await messaging.getToken({
                vapidKey: "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg" // তোমার ফায়ারবেস পুশ কি এখানে বসবে
            });

            if (currentToken) {
                // ইউজারের প্রোফাইলে টোকেনটি সেভ বা আপডেট করা[cite: 6]
                await db.collection("users").doc(uid).set({
                    fcm_tokens: firebase.firestore.FieldValue.arrayUnion(currentToken),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                console.log("সাইনআপ ইউজারের পুশ টোকেন সফলভাবে সিঙ্ক হয়েছে।[cite: 6]");
            }
        }
    } catch (error) {
        console.error("টোকেন সংগ্রহ করতে সমস্যা হয়েছে: ", error);
    }
}

/**
 * ২. গেস্ট থেকে সাইনআপে রূপান্তর (Guest to Signup Migration)[cite: 6]
 */
async function migrateGuestDataToUser(uid) {
    try {
        const guestToken = localStorage.getItem("anonymous_fcm_token");
        const guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];

        // যদি লোকাল স্টোরেজে গেস্ট টোকেন থাকে, তবে তা ইউজারের মেইন প্রোফাইলে নিয়ে যাওয়া[cite: 6]
        if (guestToken) {
            await db.collection("users").doc(uid).set({
                fcm_tokens: firebase.firestore.FieldValue.arrayUnion(guestToken)
            }, { merge: true });

            // পুরানো অ্যানোনিমাস কালেকশন থেকে ডিলিট করা (ক্লিনআপ)[cite: 6]
            await db.collection("anonymous_tokens").doc(guestToken).delete();
            localStorage.removeItem("anonymous_fcm_token");
            console.log("গেস্ট টোকেন সফলভাবে ইউজার অ্যাকাউন্টে মাইগ্রেট হয়েছে।[cite: 6]");
        }

        // যদি গেস্ট মোডে থাকা অবস্থায় কোনো নোটিফিকেশন লোকাল স্টোরেজে সেভ হয়ে থাকে
        if (guestNotifications.length > 0) {
            const batch = db.batch();
            guestNotifications.forEach((notif) => {
                const notifRef = db.collection("notifications").doc();
                batch.set(notifRef, {
                    ...notif,
                    userId: uid, // এখন এটি সাইনআপ ইউজারের আইডি হয়ে গেল
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            await batch.commit();
            localStorage.removeItem("guest_notifications");
            console.log("গেস্ট নোটিফিকেশন হিস্ট্রি অ্যাকাউন্টে যুক্ত হয়েছে।");
        }
    } catch (error) {
        console.error("মাইগ্রেশন করতে সমস্যা হয়েছে: ", error);
    }
}

/**
 * ৩. সাইনআপ করা ইউজারের জন্য ফায়ারস্টোর থেকে রিয়েল-টাইমে ইন-অ্যাপ নোটিফিকেশন লোড[cite: 6]
 */
function listenForUserNotifications(uid) {
    const notificationContainer = document.getElementById("notification-list");
    if (!notificationContainer) return;

    // ইউজারের আইডি অনুযায়ী নোটিফিকেশন কুয়েরি করা (সর্বশেষগুলো আগে আসবে)
    db.collection("notifications")
        .where("userId", "==", uid)
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            notificationContainer.innerHTML = ""; // আগের লিস্ট ক্লিয়ার করা

            if (snapshot.empty) {
                notificationContainer.innerHTML = `<p class="no-notif-text">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
                updateNotificationBadge(0); // বেলের লাল ডট আপডেট[cite: 6]
                return;
            }

            let unreadCount = 0;

            snapshot.forEach((doc) => {
                const notif = doc.data();
                if (!notif.isRead) unreadCount++;

                // নোটিফিকেশনের HTML কার্ড তৈরি
                const notifItem = createNotificationCard(doc.id, notif);
                notificationContainer.appendChild(notifItem);
            });

            // হেডার বা বেল আইকনে লাল ব্যাজ বা সংখ্যা আপডেট[cite: 6]
            updateNotificationBadge(unreadCount);
        }, (error) => {
            console.error("নোটিফিকেশন রিয়েল-টাইম লোড ব্যর্থ: ", error);
        });
}

/**
 * ৪. গেস্ট ইউজারের নোটিফিকেশন (लोकल স্টোরেজ) লোড করা
 */
function loadGuestNotifications() {
    const notificationContainer = document.getElementById("notification-list");
    if (!notificationContainer) return;

    const guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
    notificationContainer.innerHTML = "";

    if (guestNotifications.length === 0) {
        notificationContainer.innerHTML = `<p class="no-notif-text">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
        updateNotificationBadge(0);
        return;
    }

    guestNotifications.forEach((notif, index) => {
        // গেস্ট নোটিফিকেশন কার্ড তৈরি (ইনডেক্স ব্যবহার করে ইউনিক আইডি দেওয়া)
        const notifItem = createNotificationCard(`guest_${index}`, notif, true);
        notificationContainer.appendChild(notifItem);
    });

    // আনরিড কাউন্ট গেস্টদের জন্যও ব্যাজে দেখানো
    const unreadCount = guestNotifications.filter(n => !n.isRead).length;
    updateNotificationBadge(unreadCount);
}

/**
 * ৫. গেস্ট ইউজার যদি পারমিশন দিয়ে থাকে তবে ব্যাকগ্রাউন্ড টোকেন অ্যানোনিমাস কালেকশনে রাখা[cite: 6]
 */
async function handleGuestTokenSetup() {
    try {
        if (Notification.permission === "granted") {
            const currentToken = await messaging.getToken({
                vapidKey: "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"
            });

            if (currentToken) {
                localStorage.setItem("anonymous_fcm_token", currentToken);
                
                // ফায়ারস্টোরের অস্থায়ী কালেকশনে রাখা, যাতে অফলাইনেও পুশ পাঠানো যায়[cite: 6]
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
 * নোটিফিকেশন কার্ডের HTML লেআউট তৈরি (আমাদের ফাইনাল মেসেজ ফরম্যাট অনুযায়ী)
 */
function createNotificationCard(docId, notif, isGuest = false) {
    const card = document.createElement("div");
    card.className = `notification-card ${notif.isRead ? 'read' : 'unread'}`;
    
    // টাইপ অনুযায়ী সুন্দর আইকন ডিফাইন করা
    let icon = "🔔";
    if (notif.type === "like") icon = "👍";
    else if (notif.type === "save") icon = "❤️";
    else if (notif.type === "price_drop") icon = "🔥";
    else if (notif.type === "khotian") icon = "🔍";
    else if (notif.type === "chat") icon = "💬";

    // নোটিফিকেশনের ডেট ফরম্যাট করা
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

    // কার্ডে ক্লিক করলে 'পঠিত' (Mark as Read) করার লজিক এবং সংশ্লিষ্ট প্রপার্টি বা চ্যাট পেজে রিডাইরেক্ট
    card.addEventListener("click", () => {
        markAsRead(docId, isGuest);
        
        // যদি চ্যাট নোটিফিকেশন হয় তবে চ্যাট বক্সে যাবে, প্রপার্টি হলে ডিটেইলস পেজে যাবে
        if (notif.type === "chat" && notif.chatId) {
            window.location.href = `chat.html?chatId=${notif.chatId}`;
        } else if (notif.postId) {
            window.location.href = `details.html?id=${notif.postId}`;
        }
    });

    return card;
}

/**
 * নোটিফিকেশন 'পঠিত/Read' মার্ক করার ফাংশন
 */
async function markAsRead(docId, isGuest) {
    if (isGuest) {
        // গেস্টের জন্য লোকাল স্টোরেজ আপডেট
        let guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
        const index = parseInt(docId.split("_")[1]);
        if (guestNotifications[index]) {
            guestNotifications[index].isRead = true;
            localStorage.setItem("guest_notifications", JSON.stringify(guestNotifications));
            loadGuestNotifications(); // পেজ রিফ্রেশ ছাড়া রেন্ডার
        }
    } else {
        // সাইনআপ ইউজারের জন্য সরাসরি ফায়ারস্টোর আপডেট
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
 * হেডার বা বেল আইকনের লাল ব্যাজ (🔴) আপডেট করার ফাংশন[cite: 6]
 */
function updateNotificationBadge(count) {
    const badge = document.getElementById("notification-badge");
    if (!badge) return;

    if (count > 0) {
        badge.innerText = count;
        badge.style.display = "block"; // সংখ্যা থাকলে লাল ব্যাজ দেখাবে[cite: 6]
    } else {
        badge.style.display = "none";  // কোনো নতুন নোটিফিকেশন না থাকলে হাইড থাকবে
    }
            }
