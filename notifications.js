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
            
            // ১. গেস্ট টোকেন থাকলে তা ইউজার আইডিতে ট্রান্সফার/সিঙ্ক করা
            await syncGuestTokenToUser(user.uid);
            
            // ২. নতুন ইউজারের জন্য ডাটাবেজে স্বাগত নোটিফিকেশন নিশ্চিত করা
            await ensureUserWelcomeNotification(user.uid);
            
            // ৩. রেজিস্টার্ড ইউজারের রিয়েল-টাইম নোটিফিকেশন লোড
            listenForRegisteredUserNotifications(user.uid);
        } else {
            console.log("🌐 গেস্ট ইউজার ব্রাউজ করছেন। নোটিফিকেশন পেজ উন্মুক্ত।");
            
            // ৪. গেস্ট ইউজারদের নোটিফিকেশন (লোকাল স্টোরেজ ও পুশ ভিত্তিক) লোড করা
            listenForGuestNotifications();
        }
    });
}

/**
 * 🔄 গেস্ট টোকেনকে ইউজার আইডিতে সিঙ্ক ও ট্রান্সফার করার লজিক
 */
async function syncGuestTokenToUser(uid) {
    try {
        // লোকাল স্টোরেজে গেস্ট থাকাকালীন জেনারেট হওয়া টোকেন আছে কিনা চেক
        const localToken = localStorage.getItem("my_fcm_token");
        
        if (localToken) {
            // ১. টোকেনটি ইউজারের মেইন প্রোফাইলে যুক্ত করা
            await db.collection("users").doc(uid).set({
                fcmToken: localToken,
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            // ২. anonymous_tokens কালেকশন থেকে এটি মুছে ফেলা (যেহেতু এটি এখন রেজিস্টার্ড ইউজার)
            await db.collection("anonymous_tokens").doc(localToken).delete();
            console.log("🎉 গেস্ট টোকেন সফলভাবে ইউজার আইডিতে স্থানান্তরিত হয়েছে।");
        } else if (Notification.permission === "granted") {
            // যদি লোকাল স্টোরেজে না থাকে কিন্তু ব্রাউজারে এলাউ থাকে, তবে নতুন করে সিঙ্ক করা
            const currentToken = await messaging.getToken({ vapidKey: VAPID_KEY });
            if (currentToken) {
                await db.collection("users").doc(uid).set({
                    fcmToken: currentToken,
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }
    } catch (error) {
        console.error("টোকেন স্থানান্তরে সমস্যা: ", error);
    }
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
                title: "👋 আমার বাড়ি প্ল্যাটফর্মে আপনাকে স্বাগতম!",
                message: "আমাদের সাথে যুক্ত হওয়ার জন্য আপনাকে আন্তরিক ধন্যবাদ। লাইভ আপডেট এবং চ্যাট মেসেজের পুশ নোটিফিকেশন সচল করতে এই নোটিফিকেশনে ক্লিক করুন।",
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
                manageBadgesAndHeader(0);
                return;
            }

            let unreadCount = 0;
            let docsArray = [];

            snapshot.forEach((doc) => {
                docsArray.push({ id: doc.id, data: doc.data() });
            });

            // ক্লায়েন্ট সাইড সর্টিং (ইনডেক্স এরর মুক্ত রাখতে)
            docsArray.sort((a, b) => {
                const tA = a.data.timestamp ? (a.data.timestamp.seconds || new Date(a.data.timestamp).getTime()) : 0;
                const tB = b.data.timestamp ? (b.data.timestamp.seconds || new Date(b.data.timestamp).getTime()) : 0;
                return tB - tA;
            });

            docsArray.forEach((item) => {
                const notif = item.data;
                if (!notif.isRead) unreadCount++;

                const notifItem = createNotificationCard(item.id, notif, uid, false);
                notificationContainer.appendChild(notifItem);
            });

            manageBadgesAndHeader(unreadCount);
        }, (error) => {
            console.error("নোটিফিকেশন লোড এরর: ", error);
        });
}

/**
 * 🌐 গেস্ট ইউজারদের নোটিফিকেশন লোড লজিক (উন্মুক্ত পেজ)
 */
function listenForGuestNotifications() {
    const notificationContainer = document.getElementById("notifications-list");
    if (!notificationContainer) return;

    // লোকাল স্টোরেজ থেকে গেস্ট নোটিফিকেশন রিড করা
    const guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
    notificationContainer.innerHTML = "";

    if (guestNotifications.length === 0) {
        notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
        manageBadgesAndHeader(0);
        return;
    }

    guestNotifications.forEach((notif, index) => {
        const notifItem = createNotificationCard(`guest_${index}`, notif, null, true);
        notificationContainer.appendChild(notifItem);
    });

    const unreadCount = guestNotifications.filter(n => !n.isRead).length;
    manageBadgesAndHeader(unreadCount);
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

    // 🎯 ক্লিক ও টোকেন সংগ্রহের মূল ফিল্টারিং
    li.addEventListener("click", async () => {
        await markAsRead(docId, isGuest);
        
        if (!isGuest && uid) {
            try {
                // ইউজার আইডিতে টোকেন আছে কিনা চেক করা
                const userDoc = await db.collection("users").doc(uid).get();
                const userData = userDoc.data();

                if (!userData || !userData.fcmToken) {
                    console.log("⚠️ ইউজারের টোকেন নেই! নোটিফিকেশন এলাউ প্রম্পট পাঠানো হচ্ছে...");
                    
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

        // পেজ রিডাইরেক্ট লজিক
        if (notif.type === "chat" && notif.chatId) {
            window.location.href = `messages.html?chatId=${notif.chatId}&postId=${notif.postId || ''}&action=direct`;
        } else if (notif.postId) {
            window.location.href = `details.html?id=${notif.postId}`;
        }
    });

    return li;
}

/**
 * 🔴 হেডারে নোটিফিকেশন কাউন্ট এবং ডামি ব্যাজ কন্ট্রোল ফাংশন
 */
function manageBadgesAndHeader(count) {
    const headerBadge = document.getElementById("notification-count"); // আসল হেডার কাউন্ট ব্যাজ
    const dummyBadge = document.getElementById("dummy-notification-badge"); // ইন্ডেক্স পেজের ডামি আকর্ষণ ব্যাজ

    // ১. আসল হেডার কাউন্ট ম্যানেজমেন্ট (সব ইউজারের জন্য উন্মুক্ত)
    if (headerBadge) {
        if (count > 0) {
            headerBadge.innerText = count;
            headerBadge.style.display = "block";
        } else {
            headerBadge.style.display = "none";
        }
    }

    // ২. ডামি ব্যাজ কন্ট্রোল লজিক (১টি নোটিফিকেশন আসলেই এটি চিরতরে ভ্যানিশ হয়ে যাবে)
    if (dummyBadge) {
        if (count >= 1) {
            dummyBadge.style.display = "none";
        } else {
            // যদি নোটিফিকেশন বক্স একদম খালি থাকে, তবেই ডামি ব্যাজ আকর্ষণ করার জন্য শো করবে
            dummyBadge.style.display = "block";
        }
    }
}

/**
 * নোটিফিকেশন রিড মার্ক করার সাধারণ ফাংশন
 */
async function markAsRead(docId, isGuest) {
    if (isGuest) {
        let guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
        const index = parseInt(docId.split("_")[1]);
        if (guestNotifications[index]) {
            guestNotifications[index].isRead = true;
            localStorage.setItem("guest_notifications", JSON.stringify(guestNotifications));
            listenForGuestNotifications();
        }
    } else {
        try {
            await db.collection("notifications").doc(docId).update({ isRead: true });
        } catch (error) {
            console.error("রিড স্টেট আপডেট এরর: ", error);
        }
    }
                }
