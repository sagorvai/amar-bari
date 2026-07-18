// =======================================================
// 🌐 header-sync.js - গ্লোবাল হেডার ও লাইভ ব্যাজ সিঙ্ক ম্যানেজার
// =======================================================

const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener("DOMContentLoaded", () => {
    initHeaderNotificationTracker();
});

/**
 * সব পেজের হেডারে রিয়েল-টাইমে আনরিড নোটিফিকেশন ট্র্যাক করার ফাংশন
 */
function initHeaderNotificationTracker() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            // রেজিস্টার্ড ইউজারের জন্য ফায়ারস্টোর থেকে আনরিড কাউন্ট ট্র্যাকিং
            db.collection("notifications")
                .where("userId", "==", user.uid)
                .onSnapshot((snapshot) => {
                    let unreadCount = 0;
                    snapshot.forEach((doc) => {
                        if (!doc.data().isRead) unreadCount++;
                    });
                    updateGlobalBadges(unreadCount);
                }, (error) => {
                    console.error("হেডার কাউন্ট ট্র্যাকিং ব্যর্থ: ", error);
                });
        } else {
            // গেস্ট ইউজারের জন্য লোকাল স্টোরেজ থেকে আনরিড কাউন্ট ট্র্যাকিং
            const guestNotifications = JSON.parse(localStorage.getItem("guest_notifications")) || [];
            let unreadCount = guestNotifications.filter(n => !n.isRead).length;
            updateGlobalBadges(unreadCount);
        }
    });
}

/**
 * হেডারের আসল ব্যাজ এবং ইন্ডেক্স পেজের ডামি ব্যাজ কন্ট্রোল
 */
function updateGlobalBadges(count) {
    const headerBadge = document.getElementById("notification-count"); // আসল হেডার বেল ব্যাজ
    const dummyBadge = document.getElementById("dummy-notification-badge"); // ডামি আকর্ষণ ব্যাজ

    // ১. আসল হেডার কাউন্ট আপডেট
    if (headerBadge) {
        if (count > 0) {
            headerBadge.innerText = count;
            headerBadge.style.display = "block";
        } else {
            headerBadge.style.display = "none";
        }
    }

    // ২. ডামি ব্যাজ কন্ট্রোল (১টি নোটিফিকেশন পেলেই বা পারমিশন দেওয়া থাকলে ভ্যানিশ হবে)
    if (dummyBadge) {
        if (count >= 1 || Notification.permission === "granted") {
            dummyBadge.style.display = "none";
        } else {
            dummyBadge.style.display = "block";
        }
    }
                }
