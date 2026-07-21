// =======================================================
// 🎯 আমার বাড়ি.কম - গ্লোবাল হেডার লাইভ সিঙ্ক ENGINE (কোম্পানি ও পার্সোনাল মোড সাপোর্ট সহ)
// =======================================================

// ⚡ ১. বর্তমান অ্যাক্টিভ আইডি (User UID নাকি Company ID) রিটার্ন করবে
function getActiveIdentity() {
    const activeIdentityType = localStorage.getItem('activeIdentityType') || 'user';
    const activeCompanyId = localStorage.getItem('activeCompanyId');
    const user = firebase.auth().currentUser;

    if (!user) return null;

    if (activeIdentityType === 'company' && activeCompanyId) {
        return {
            id: activeCompanyId,       // যেমন: "comp_abc123"
            type: 'company',
            ownerUid: user.uid,
            name: localStorage.getItem('activeName') || 'কোম্পানি',
            avatar: localStorage.getItem('activeAvatar') || ''
        };
    } else {
        return {
            id: user.uid,              // ইউজার নিজের UID
            type: 'user',
            ownerUid: user.uid,
            name: localStorage.getItem('activeName') || 'ইউজার',
            avatar: localStorage.getItem('activeAvatar') || ''
        };
    }
}

(function() {
    const db = firebase.firestore();
    const auth = firebase.auth();

    let unreadNotifListener = null;
    let unreadMsgListener = null;

    document.addEventListener('DOMContentLoaded', function() {
        auth.onAuthStateChanged(user => {
            if (user) {
                console.log("Header-Sync: 🔓 ইউজার কানেক্টেড। হেডার ব্যাজ ও আইডি সিঙ্ক হচ্ছে...");
                initHeaderSync();
            } else {
                console.log("Header-Sync: 🌐 গেস্ট/লগআউট মোড। ব্যাজ হাইড করা হলো।");
                hideBadges();
            }
        });

        // ⚡ প্রোফাইল পেজ থেকে আইডি সুইচ করলে সঙ্গে সঙ্গে অন্য সব উপাদান আপডেট হবে
        window.addEventListener('identityChanged', function() {
            if (auth.currentUser) {
                initHeaderSync();
            }
        });
    });

    function initHeaderSync() {
        const activeIdentity = getActiveIdentity();
        if (!activeIdentity) return;

        // 🖼️ হেডারের ছবি অ্যাক্টিভ প্রোফাইল/কোম্পানির লোগো অনুযায়ী চেঞ্জ করা
        updateHeaderAvatar(activeIdentity);

        // 🔔 ১. অ্যাক্টিভ আইডির নোটিফিকেশন লোড
        syncUnreadNotifications(activeIdentity.id);

        // 💬 ২. অ্যাক্টিভ আইডির মেসেজ লোড
        syncUnreadMessages(activeIdentity.id);
    }

    // 🖼️ হেডারের ছবি আপডেট ফাংশন
    function updateHeaderAvatar(activeIdentity) {
        const headerProfileImg = document.querySelector('#profileImageWrapper img') || document.getElementById('profileImage');
        if (headerProfileImg && activeIdentity.avatar) {
            headerProfileImg.src = activeIdentity.avatar;
        }
    }

    // 🔔 ১. আনরিড নোটিফিকেশন লাইভ কাউন্ট
    function syncUnreadNotifications(activeId) {
        const notifBadge = document.getElementById('notification-badge') || document.getElementById('notification-count');
        if (!notifBadge) return;

        if (unreadNotifListener) unreadNotifListener();

        // 🎯 FIXED: user.uid এর জায়গায় activeId ব্যবহার করা হয়েছে
        unreadNotifListener = db.collection('notifications')
            .where('userId', '==', activeId)
            .where('isRead', '==', false) 
            .onSnapshot(snapshot => {
                const count = snapshot.size;
                console.log(`🔔 লাইভ নোটিফিকেশন কাউন্ট (${activeId}): ${count} টি আনরিড`);
                if (count > 0) {
                    notifBadge.textContent = count;
                    notifBadge.style.display = 'inline-block'; 
                } else {
                    notifBadge.style.display = 'none';
                }
            }, err => console.error("Notif badge error:", err));
    }

    // 💬 ২. আনরিড চ্যাট মেসেজ লাইভ কাউন্ট
    function syncUnreadMessages(activeId) {
        const msgBadge = document.getElementById('message-count');
        if (!msgBadge) return;

        if (unreadMsgListener) unreadMsgListener();

        // 🎯 FIXED: activeId (যা পার্সোনাল আইডি অথবা কোম্পানি আইডি) চেক করা হচ্ছে
        unreadMsgListener = db.collection('chats')
            .where('participants', 'array-contains', activeId)
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    msgBadge.style.display = 'none';
                    return;
                }

                let unreadChatsCount = 0;
                snapshot.forEach(chatDoc => {
                    const chatData = chatDoc.data();
                    
                    // লাস্ট মেসেজ যদি বর্তমান এক্টিভ আইডির থেকে না হয় এবং চ্যাট আনরিড থাকে
                    if (chatData.lastSenderId && chatData.lastSenderId !== activeId && chatData.isUnread === true) {
                        unreadChatsCount++;
                    }
                });

                console.log(`💬 লাইভ চ্যাট মেসেজ কাউন্ট (${activeId}): ${unreadChatsCount} টি আনরিড`);
                if (unreadChatsCount > 0) {
                    msgBadge.textContent = unreadChatsCount;
                    msgBadge.style.display = 'inline-block';
                } else {
                    msgBadge.style.display = 'none';
                }
            }, err => console.error("Message badge error:", err));
    }

    function hideBadges() {
        const notifBadge = document.getElementById('notification-badge') || document.getElementById('notification-count');
        const msgBadge = document.getElementById('message-count');
        if (notifBadge) notifBadge.style.display = 'none';
        if (msgBadge) msgBadge.style.display = 'none';
        
        if (unreadNotifListener) { unreadNotifListener(); unreadNotifListener = null; }
        if (unreadMsgListener) { unreadMsgListener(); unreadMsgListener = null; }
    }
})();
