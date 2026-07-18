// =======================================================
// 🎯 আমার বাড়ি.কম - গ্লোবাল হেডার লাইভ কাউন্ট সিঙ্ক ENGINE
// =======================================================

(function() {
    const db = firebase.firestore();
    const auth = firebase.auth();

    let unreadNotifListener = null;
    let unreadMsgListener = null;

    document.addEventListener('DOMContentLoaded', function() {
        // ফায়ারবেস অথেন্টিকেশন স্টেট চেক
        auth.onAuthStateChanged(user => {
            if (user) {
                console.log("Header-Sync: 🔓 ইউজার কানেক্টেড। হেডার ব্যাজ রিয়েল-টাইম সিঙ্ক হচ্ছে...");
                // ১. গ্লোবাল লাইভ নোটিফিকেশন কাউন্ট সচল করা
                syncUnreadNotifications(user.uid);
                // ২. গ্লোবাল লাইভ চ্যাট মেসেজ কাউন্ট সচল করা
                syncUnreadMessages(user.uid);
            } else {
                console.log("Header-Sync: 🌐 গেস্ট/লগআউট মোড। ব্যাজ হাইড করা হলো।");
                hideBadges();
            }
        });
    });

    // 🔔 ১. আনরিড নোটিফিকেশন লাইভ কাউন্ট কুয়েরি (সব পেজের জন্য)
    function syncUnreadNotifications(userId) {
        const notifBadge = document.getElementById('notification-count');
        if (!notifBadge) return;

        if (unreadNotifListener) unreadNotifListener();

        // কালেকশন কুয়েরি: notifications -> isRead == false
        unreadNotifListener = db.collection('notifications')
            .where('userId', '==', userId)
            .where('isRead', '==', false) 
            .onSnapshot(snapshot => {
                const count = snapshot.size;
                if (count > 0) {
                    notifBadge.textContent = count;
                    notifBadge.style.display = 'inline-flex'; // প্রপার সেন্টারিং এর জন্য inline-flex
                } else {
                    notifBadge.style.display = 'none';
                }
            }, err => console.error("Notif badge error:", err));
    }

    // 💬 ২. আনরিড চ্যাট মেসেজ লাইভ কাউন্ট লজিক (সব পেজের জন্য)
    function syncUnreadMessages(userId) {
        const msgBadge = document.getElementById('message-count');
        if (!msgBadge) return;

        if (unreadMsgListener) unreadMsgListener();

        // কালেকশন কুয়েরি: chats -> participants array-contains userId
        unreadMsgListener = db.collection('chats')
            .where('participants', 'array-contains', userId)
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    msgBadge.style.display = 'none';
                    return;
                }

                let unreadChatsCount = 0;
                snapshot.forEach(chatDoc => {
                    const chatData = chatDoc.data();
                    
                    // 🎯 পারফেক্ট ম্যাচিং লজিক: লাস্ট মেসেজ যদি অন্য কেউ পাঠায় এবং চ্যাটটি আনরিড হয় (isUnread == true)
                    if (chatData.lastSenderId && chatData.lastSenderId !== userId && chatData.isUnread === true) {
                        unreadChatsCount++;
                    }
                });

                if (unreadChatsCount > 0) {
                    msgBadge.textContent = unreadChatsCount;
                    msgBadge.style.display = 'inline-flex';
                } else {
                    msgBadge.style.display = 'none';
                }
            }, err => console.error("Message badge error:", err));
    }

    // ৩. ব্যাজসমূহ হাইড এবং লিসেনার রিলিজ করার ফাংশন
    function hideBadges() {
        const notifBadge = document.getElementById('notification-count');
        const msgBadge = document.getElementById('message-count');
        if (notifBadge) notifBadge.style.display = 'none';
        if (msgBadge) msgBadge.style.display = 'none';
        
        if (unreadNotifListener) { unreadNotifListener(); unreadNotifListener = null; }
        if (unreadMsgListener) { unreadMsgListener(); unreadMsgListener = null; }
    }
})();
