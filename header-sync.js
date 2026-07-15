// =======================================================
// 🎯 আমার বাড়ি.কম - গ্লোবাল হেডার লাইভ কাউন্ট সিঙ্ক
// =======================================================

(function() {
    const db = firebase.firestore();
    const auth = firebase.auth();

    let unreadNotifListener = null;
    let unreadMsgListener = null;

    document.addEventListener('DOMContentLoaded', function() {
        // অথেন্টিকেশন স্টেট চেক
        auth.onAuthStateChanged(user => {
            if (user) {
                // ১. লাইভ নোটিফিকেশন কাউন্ট চালু
                syncUnreadNotifications(user.uid);
                // ২. লাইভ চ্যাট মেসেজ কাউন্ট চালু
                syncUnreadMessages(user.uid);
            } else {
                // লগআউট থাকলে কাউন্ট বন্ধ ও হাইড করা
                hideBadges();
            }
        });
    });

    // 🔔 আনরিড নোটিফিকেশন কাউন্ট লজিক
    function syncUnreadNotifications(userId) {
        const notifBadge = document.getElementById('notification-count');
        if (!notifBadge) return;

        if (unreadNotifListener) unreadNotifListener();

        unreadNotifListener = db.collection('notifications')
            .where('userId', '==', userId)
            .where('read', '==', false) // শুধুমাত্র আনরিডগুলো গুনবে
            .onSnapshot(snapshot => {
                const count = snapshot.size;
                if (count > 0) {
                    notifBadge.textContent = count;
                    notifBadge.style.display = 'inline-block';
                } else {
                    notifBadge.style.display = 'none';
                }
            }, err => console.error("Notif badge error:", err));
    }

    // 💬 আনরিড চ্যাট মেসেজ কাউন্ট লজিক
    function syncUnreadMessages(userId) {
        const msgBadge = document.getElementById('message-count');
        if (!msgBadge) return;

        if (unreadMsgListener) unreadMsgListener();

        // ইউজার যে চ্যাটগুলোতে যুক্ত আছে সেগুলো ট্র্যাক করা
        unreadMsgListener = db.collection('chats')
            .where('participants', 'array-contains', userId)
            .onSnapshot(snapshot => {
                let totalUnreadMessages = 0;
                let activeSubListeners = [];

                if (snapshot.empty) {
                    msgBadge.style.display = 'none';
                    return;
                }

                // প্রতিটি চ্যাটরুমের ভেতরের আনরিড মেসেজ চেক করা
                snapshot.forEach(doc => {
                    const chatId = doc.id;
                    
                    // মেসেজ সাব-কালেকশন থেকে আনরিড এবং অন্যের পাঠানো মেসেজ খোঁজা
                    db.collection('chats').doc(chatId).collection('messages')
                        .where('senderId', '!=', userId) // নিজের পাঠানো মেসেজ গুনবে না
                        .get() // লাইভ কাউন্টের জন্য এখানে জাস্ট সাইজ নিচ্ছি
                        .then(msgSnapshot => {
                            // এখানে তুমি যদি মেসেজে আলাদা 'read: false' ফিল্ড রাখো, তবে সেটা ফিল্টার করতে পারো।
                            // আপাতত চ্যাট একটিভ থাকলে লাস্ট মেসেজের ভিত্তিতে জাস্ট লজিক চেক হচ্ছে।
                        });
                });
                
                // বিকল্প সহজ নিয়ম: যদি চ্যাট ডকুমেন্টে `unreadBy` অ্যারে বা কারেন্ট স্ট্যাটাস থাকে।
                // তোমার বর্তমান চ্যাট স্ট্রাকচার অনুযায়ী যদি ডাইরেক্ট ট্র্যাকিং না থাকে, তবে নিচের সহজ রিয়েল-টাইম ট্র্যাকিংটি ব্যবহার করো:
                
                // ধরি, প্রতিটি চ্যাটে শেষ মেসেজটি ইউজার দেখেছে কিনা তা চ্যাট লিস্টের snapshot থেকেই কাউন্ট করা সম্ভব
                let unreadChatsCount = 0;
                snapshot.forEach(chatDoc => {
                    const chatData = chatDoc.data();
                    // যদি চ্যাটের লাস্ট মেসেজটি কারেন্ট ইউজারের না হয় এবং চ্যাটটি ওপেন না থাকে
                    if (chatData.lastSenderId && chatData.lastSenderId !== userId && chatData.isUnread !== false) {
                        unreadChatsCount++;
                    }
                });

                if (unreadChatsCount > 0) {
                    msgBadge.textContent = unreadChatsCount;
                    msgBadge.style.display = 'inline-block';
                } else {
                    msgBadge.style.display = 'none';
                }
            }, err => console.error("Message badge error:", err));
    }

    function hideBadges() {
        const notifBadge = document.getElementById('notification-count');
        const msgBadge = document.getElementById('message-count');
        if (notifBadge) notifBadge.style.display = 'none';
        if (msgBadge) msgBadge.style.display = 'none';
        
        if (unreadNotifListener) unreadNotifListener();
        if (unreadMsgListener) unreadMsgListener();
    }
})();
