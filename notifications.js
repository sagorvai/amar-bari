// =======================================================
// 🎯 আমার বাড়ি.কম - স্মার্ট ইন-অ্যাপ নোটিফিকেশন ম্যানেজার
// =======================================================

const db = firebase.firestore();
const auth = firebase.auth();
const messaging = firebase.messaging(); 

const VAPID_KEY = "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"; 

// পেজ লোড হলে কাজ শুরু হবে
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
            // ১. সাইনআপ করার পর স্বয়ংক্রিয় স্বাগত নোটিফিকেশন চেক ও তৈরি
            await checkAndCreateWelcomeNotification(user.uid);
            // ২. নোটিফিকেশন রিয়েল-টাইমে লোড করা
            listenForUserNotifications(user.uid);
        } else {
            console.log("গেস্ট ইউজার পেজ ব্রাউজ করছেন।");
            // ৩. গেস্ট নোটিফিকেশন লোড করা
            loadGuestNotifications();
            // ৪. গেস্ট টোকেন ব্যাকগ্রাউন্ডে সেটআপ করা
            await handleGuestTokenSetup();
        }
    });
}

/**
 * ১. নতুন সাইনআপ করা ইউজারের জন্য স্বাগত নোটিফিকেশন তৈরি করার লজিক (ইন্ডেক্স এরর মুক্ত)
 */
async function checkAndCreateWelcomeNotification(uid) {
    try {
        const notifRef = db.collection("notifications");
        // সিকিউরিটি রুলস ও ইন্ডেক্স ফ্রেন্ডলি সাধারণ কুয়েরি
        const snapshot = await notifRef
            .where("userId", "==", uid)
            .get();

        // চেক করা হচ্ছে আগে কোনো স্বাগত নোটিফিকেশন তৈরি হয়েছে কিনা
        let hasWelcome = false;
        snapshot.forEach((doc) => {
            if (doc.data().type === "welcome") {
                hasWelcome = true;
            }
        });

        // যদি আগে কোনো স্বাগত নোটিফিকেশন না থাকে, তবে একটি নতুন তৈরি হবে
        if (!hasWelcome) {
            await notifRef.add({
                userId: uid,
                title: "👋 আমার বাড়ি.কম-এ আপনাকে স্বাগতম!",
                message: "আমাদের প্ল্যাটফর্মে যুক্ত হওয়ার জন্য ধন্যবাদ। আপনার অ্যাকাউন্টের রিয়েল-টাইম আপডেট ও পুশ নোটিফিকেশন সচল করতে এই নোটিফিকেশনে ক্লিক করুন।",
                type: "welcome",
                isRead: false,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log("নতুন ইউজারের জন্য স্বাগত নোটিফিকেশন সফলভাবে তৈরি হয়েছে।");
        }
    } catch (error) {
        console.error("স্বাগত নোটিফিকেশন তৈরিতে সমস্যা: ", error);
    }
}

/**
 * ২. সাইনআপ করা ইউজারের জন্য ফায়ারস্টোর থেকে রিয়েল-টাইমে ইন-অ্যাপ নোটিফিকেশন লোড
 */
function listenForUserNotifications(uid) {
    const notificationContainer = document.getElementById("notifications-list");
    if (!notificationContainer) return;

    db.collection("notifications")
        .where("userId", "==", uid)
        .orderBy("timestamp", "desc")
        .onSnapshot((snapshot) => {
            notificationContainer.innerHTML = ""; 

            if (snapshot.empty) {
                notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
                updateNotificationBadge(0); 
                return;
            }

            let unreadCount = 0;

            snapshot.forEach((doc) => {
                const notif = doc.data();
                if (!notif.isRead) unreadCount++;

                // সঠিক প্যারামিটার সিকোয়েন্স সহ কার্ড তৈরি
                const notifItem = createNotificationCard(doc.id, notif, uid, false);
                notificationContainer.appendChild(notifItem);
            });

            updateNotificationBadge(unreadCount);
        }, (error) => {
            console.error("নোটিফিকেশন লোড ব্যর্থ: ", error);
            notificationContainer.innerHTML = `<p style="text-align: center; color: red; padding: 20px;">নোটিফিকেশন লোড করতে সমস্যা হয়েছে।</p>`;
        });
}

/**
 * ৩. গেস্ট ইউজারের নোটিফিকেশন (লোকাল স্টোরেজ) লোড করা
 */
function loadGuestNotifications() {
    const notificationContainer = document.getElementById("notifications-list");
    if (!notificationContainer) return;

    const guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
    notificationContainer.innerHTML = "";

    if (guestNotifications.length === 0) {
        notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">আপনার নোটিফিকেশন বক্স এখন খালি।</p>`;
        updateNotificationBadge(0);
        return;
    }

    guestNotifications.forEach((notif, index) => {
        // গেস্ট ইউজারের জন্য uid=null এবং isGuest=true
        const notifItem = createNotificationCard(`guest_${index}`, notif, null, true);
        notificationContainer.appendChild(notifItem);
    });

    const unreadCount = guestNotifications.filter(n => !n.isRead).length;
    updateNotificationBadge(unreadCount);
}

/**
 * নোটিফিকেশন কার্ডের HTML লেআউট এবং স্মার্ট ক্লিক হ্যান্ডলার
 */
function createNotificationCard(docId, notif, uid, isGuest = false) {
    const li = document.createElement("li");
    li.className = `notification-item ${notif.isRead ? 'read' : 'unread'}`;
    
    // টাইপ অনুযায়ী আইকন সেট করা
    let iconName = "notifications";
    if (notif.type === "welcome") iconName = "celebration"; 
    else if (notif.type === "like") iconName = "thumb_up";
    else if (notif.type === "save") iconName = "bookmark";
    else if (notif.type === "chat") iconName = "chat";

    let dateStr = "এইমাত্র";
    if (notif.timestamp) {
        let dateObj;
        if (notif.timestamp.toDate) {
            dateObj = notif.timestamp.toDate();
        } else if (notif.timestamp.seconds) {
            dateObj = new Date(notif.timestamp.seconds * 1000);
        } else {
            dateObj = new Date(notif.timestamp);
        }
        
        if (!isNaN(dateObj.getTime())) {
            const options = { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            dateStr = dateObj.toLocaleDateString('bn-BD', options);
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

    // ইউজারের ক্লিক হ্যান্ডলার লজিক (টোকেন কালেকশন এবং রিডাইরেক্ট)
    li.addEventListener("click", async () => {
        await markAsRead(docId, isGuest);
        
        if (!isGuest && uid) {
            try {
                // ডাটাবেজে ইউজারের আইডি চেক করা হচ্ছে টোকেন আছে কি না
                const userDoc = await db.collection("users").doc(uid).get();
                const userData = userDoc.data();

                if (!userData || !userData.fcmToken) {
                    console.log("ইউজারের কোনো টোকেন পাওয়া যায়নি! এবার পারমিশন প্রম্পট দেখানো হবে...");
                    
                    const permission = await Notification.requestPermission();
                    
                    if (permission === "granted") {
                        const currentToken = await messaging.getToken({ vapidKey: VAPID_KEY });
                        if (currentToken) {
                            await db.collection("users").doc(uid).set({
                                fcmToken: currentToken,
                                lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
                            }, { merge: true });
                            alert("🎉 ধন্যবাদ! পুশ নোটিফিকেশন সফলভাবে চালু হয়েছে।");
                        }
                    } else {
                        alert("⚠️ আপনি নোটিফিকেশন ব্লক করেছেন। লাইভ আপডেট পেতে ব্রাউজার সেটিংস থেকে এটি এলাউ করুন।");
                    }
                }
            } catch (err) {
                console.error("টোকেন চেক বা সংরক্ষণে সমস্যা: ", err);
            }

            // নোটিফিকেশনের টাইপ অনুযায়ী রিডাইরেক্ট করা
            if (notif.type === "chat" && notif.chatId) {
                window.location.href = `messages.html?chatId=${notif.chatId}&postId=${notif.postId || ''}&action=direct`;
            } else if (notif.postId) {
                window.location.href = `details.html?id=${notif.postId}`;
            }
        }
    });

    return li;
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
            localStorage.setItem("guest_notifications", JSON.stringify(guestNotifications));
            loadGuestNotifications(); 
        }
    } else {
        try {
            await db.collection("notifications").doc(docId).update({ isRead: true });
        } catch (error) {
            console.error("Read স্ট্যাটাস আপডেট করতে সমস্যা: ", error);
        }
    }
}

/**
 * ৪. গেস্ট টোকেন সেটআপ
 */
async function handleGuestTokenSetup() {
    try {
        if (Notification.permission === "granted") {
            const currentToken = await messaging.getToken({ vapidKey: VAPID_KEY });
            if (currentToken) {
                localStorage.setItem("my_fcm_token", currentToken);
                await db.collection("anonymous_tokens").doc(currentToken).set({
                    token: currentToken,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    } catch (error) {
        console.log("গেস্ট টোকেন স্কিপ করা হয়েছে।");
    }
}

/**
 * হেডার বা বেল আইকনের লাল ব্যাজ (🔴) আপডেট করার ফাংশন
 */
function updateNotificationBadge(count) {
    const badge = document.getElementById("notification-count");
    if (!badge) return;

    if (count > 0) {
        badge.innerText = count;
        badge.style.display = "block"; 
    } else {
        badge.style.display = "none";  
    }
                         }
