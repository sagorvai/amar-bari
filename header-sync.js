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

        // Notification documents use isRead:false as the canonical unread field.
        unreadNotifListener = db.collection('notifications')
            .where('userId', '==', activeId)
            .where('isRead', '==', false)
            .onSnapshot(snapshot => {
                const count = snapshot.size;
                console.log(`🔔 লাইভ নোটিফিকেশন কাউন্ট (${activeId}): ${count} টি আনরিড`);

                // Android WebView-এ launcher badge-কে Firestore-এর canonical unread count-এর সঙ্গে sync করি।
                try {
                    if (window.AndroidBridge && typeof window.AndroidBridge.setPendingNotificationCount === 'function') {
                        window.AndroidBridge.setPendingNotificationCount(count);
                    }
                } catch (e) {
                    console.warn('Android badge sync unavailable:', e);
                }

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

// =======================================================
// 🚪 গ্লোবাল লগআউট ও অথ স্টেট হ্যান্ডলার (Header Sync)
// =======================================================

// ১. অথ স্টেট পরিবর্তনের সাথে সাথে সাইডবার বাটন আপডেট
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        const loginBtn = document.getElementById('login-link-sidebar');
        const logoutBtn = document.getElementById('logout-link-sidebar');

        if (user) {
            // ইউজার লগইন থাকলে লগইন বাটন হাইড ও লগআউট বাটন শো করবে
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'flex';
        } else {
            // ইউজার লগআউট থাকলে লগইন বাটন শো ও লগআউট বাটন হাইড করবে
            if (loginBtn) loginBtn.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    });
}

// ২. লগআউট ক্লিক ইভেন্ট হ্যান্ডলার
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-link-sidebar');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (confirm("আপনি কি নিশ্চিত যে লগআউট করতে চান?")) {
                firebase.auth().signOut().then(() => {
                    // স্টোরেজ ক্লিন করা
                    localStorage.removeItem('activeIdentityType');
                    localStorage.removeItem('activeCompanyId');
                    localStorage.removeItem('activeName');
                    localStorage.removeItem('activeAvatar');
                    sessionStorage.clear();

                    alert("সফলভাবে লগআউট হয়েছে।");
                    window.location.href = 'auth.html';
                }).catch((error) => {
                    console.error("লগআউট ত্রুটি:", error);
                    alert("লগআউট হতে সমস্যা হয়েছে: " + error.message);
                });
            }
        });
    }
});
