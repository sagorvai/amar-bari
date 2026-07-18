// =======================================================
// 🎯 আমার বাড়ি.কম - গ্লোবাল হেডার লাইভ কাউন্ট সিঙ্ক ENGINE (চূড়ান্ত ফিক্সড)
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
        // 🎯 FIXED: index.html এর সঠিক আইডি 'notification-badge' এবং 'notification-count' দুটোই সেফগার্ডে রাখা হলো
        const notifBadge = document.getElementById('notification-badge') || document.getElementById('notification-count');
        if (!notifBadge) return;

        if (unreadNotifListener) unreadNotifListener();

        // 🎯 FIXED: কুয়েরি ফিল্ডে 'read' এর বদলে সঠিক 'isRead' ব্যবহার করা হয়েছে
        unreadNotifListener = db.collection('notifications')
            .where('userId', '==', userId)
            .where('isRead', '==', false) 
            .onSnapshot(snapshot => {
                const count = snapshot.size;
                console.log(`🔔 লাইভ নোটিফিকেশন কাউন্ট আপডেট: ${count} টি আনরিড`);
                if (count > 0) {
                    notifBadge.textContent = count;
                    notifBadge.style.display = 'inline-block'; 
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

        // 🎯 FIXED: messages কালেকশনের বদলে আপনার মূল চ্যাট ইঞ্জিন (chats) ট্রাক করা হচ্ছে
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
                    
                    // লাস্ট মেসেজ যদি অন্য কেউ পাঠায় এবং চ্যাটটি আনরিড হয় (isUnread == true)
                    if (chatData.lastSenderId && chatData.lastSenderId !== userId && chatData.isUnread === true) {
                        unreadChatsCount++;
                    }
                });

                console.log(`💬 লাইভ চ্যাট মেসেজ কাউন্ট আপডেট: ${unreadChatsCount} টি আনরিড`);
                if (unreadChatsCount > 0) {
                    msgBadge.textContent = unreadChatsCount;
                    msgBadge.style.display = 'inline-block';
                } else {
                    msgBadge.style.display = 'none';
                }
            }, err => console.error("Message badge error:", err));
    }

    // ৩. ব্যাজসমূহ হাইড এবং লিসেনার রিলিজ করার ফাংশন
    function hideBadges() {
        const notifBadge = document.getElementById('notification-badge') || document.getElementById('notification-count');
        const msgBadge = document.getElementById('message-count');
        if (notifBadge) notifBadge.style.display = 'none';
        if (msgBadge) msgBadge.style.display = 'none';
        
        if (unreadNotifListener) { unreadNotifListener(); unreadNotifListener = null; }
        if (unreadMsgListener) { unreadMsgListener(); unreadMsgListener = null; }
    }
})();
