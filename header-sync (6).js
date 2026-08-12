// =======================================================
// 🎯 আমার বাড়ি.কম - গ্লোবাল হেডার লাইভ সিঙ্ক ENGINE (কোম্পানি ও পার্সোনাল মোড সাপোর্ট সহ)
// =======================================================

// ⚡ ১. বর্তমান অ্যাক্টিভ আইডি (User UID নাকি Company ID) রিটার্ন করবে (গ্লোবাল এক্সেসযোগ্য)
window.getActiveIdentity = function() {
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
            name: localStorage.getItem('activeName') || user.displayName || 'ইউজার',
            avatar: localStorage.getItem('activeAvatar') || user.photoURL || ''
        };
    }
};

// ⚡ ২. আইডি বা মোড সুইচ করার গ্লোবাল হেলপার ফাংশন
window.switchIdentity = function(type, companyId = null, name = '', avatar = '') {
    localStorage.setItem('activeIdentityType', type);
    
    if (type === 'company' && companyId) {
        localStorage.setItem('activeCompanyId', companyId);
    } else {
        localStorage.removeItem('activeCompanyId');
    }

    if (name) localStorage.setItem('activeName', name);
    if (avatar) localStorage.setItem('activeAvatar', avatar);

    // সিঙ্ক করার জন্য কাস্টম ইভেন্ট ফায়ার করা
    window.dispatchEvent(new Event('identityChanged'));
};

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

        // ⚡ প্রোফাইল পেজ বা সুইচ ড্রপডাউন থেকে আইডি সুইচ করলে সঙ্গে সঙ্গে সব আপডেট হবে
        window.addEventListener('identityChanged', function() {
            if (auth.currentUser) {
                initHeaderSync();
            }
        });
    });

    function initHeaderSync() {
        const activeIdentity = window.getActiveIdentity();
        if (!activeIdentity) return;

        // 🖼️ হেডারের ছবি ও ভিজ্যুয়াল ইন্ডিকেটর আপডেট করা
        updateHeaderAvatarAndBadge(activeIdentity);

        // 🔔 ১. অ্যাক্টিভ আইডির নোটিফিকেশন লোড
        syncUnreadNotifications(activeIdentity.id);

        // 💬 ২. অ্যাক্টিভ আইডির মেসেজ লোড
        syncUnreadMessages(activeIdentity.id);
    }

    // 🖼️ হেডারের ছবি ও মোড টেক্সট আপডেট ফাংশন
    function updateHeaderAvatarAndBadge(activeIdentity) {
        const headerProfileImg = document.querySelector('#profileImageWrapper img') || document.getElementById('profileImage');
        if (headerProfileImg && activeIdentity.avatar) {
            headerProfileImg.src = activeIdentity.avatar;
        }

        // যদি হেডারে মোড দেখানোর জন্য কোনো এলিমেন্ট থাকে (যেমন: #active-mode-label)
        const modeLabel = document.getElementById('active-mode-label');
        if (modeLabel) {
            modeLabel.textContent = activeIdentity.type === 'company' ? `🏢 ${activeIdentity.name}` : `👤 ${activeIdentity.name}`;
        }
    }

    // 🔔 ১. আনরিড নোটিফিকেশন লাইভ কাউন্ট
    function syncUnreadNotifications(activeId) {
        const notifBadge = document.getElementById('notification-badge') || document.getElementById('notification-count');
        if (!notifBadge) return;

        if (unreadNotifListener) unreadNotifListener();

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
