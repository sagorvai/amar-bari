// =======================================================
// 🎯 আমার বাড়ি.কম - গ্লোবাল হেডার লাইভ সিঙ্ক (Bulletproof Sync Engine)
// =======================================================

window.getActiveIdentity = function() {
    let activeIdentityType = localStorage.getItem('activeIdentityType') || 'user';
    const activeCompanyId = localStorage.getItem('activeCompanyId');
    const user = firebase.auth().currentUser;

    if (!user) return null;

    if (activeIdentityType === 'company' && activeCompanyId) {
        return {
            id: activeCompanyId,       
            type: 'company',
            ownerUid: user.uid,
            name: localStorage.getItem('activeName') || 'কোম্পানি',
            avatar: localStorage.getItem('activeAvatar') || ''
        };
    } else {
        return {
            id: user.uid,              
            type: 'user',
            ownerUid: user.uid,
            name: localStorage.getItem('activeName') || user.displayName || 'ইউজার',
            avatar: localStorage.getItem('activeAvatar') || user.photoURL || ''
        };
    }
};

window.switchIdentity = function(type, companyId = null, name = '', avatar = '') {
    localStorage.setItem('activeIdentityType', type);
    
    if (type === 'company' && companyId) {
        localStorage.setItem('activeCompanyId', companyId);
    } else {
        localStorage.removeItem('activeCompanyId');
    }

    if (name) localStorage.setItem('activeName', name);
    if (avatar) localStorage.setItem('activeAvatar', avatar);

    window.dispatchEvent(new Event('identityChanged'));
};

(function() {
    const db = firebase.firestore();
    const auth = firebase.auth();

    let unreadNotifListener = null;
    let unreadMsgListener = null;

    // ⚡ ১. হেডারের ছবি সরাসরি DOM-এ আপডেট করার ফাংশন
    function applyAvatarToDOM(avatarUrl) {
        const headerProfileImg = document.getElementById('profileImage') || document.querySelector('#profileImageWrapper img');
        const defaultProfileIcon = document.getElementById('defaultProfileIcon');

        if (!headerProfileImg) return;

        if (avatarUrl && avatarUrl.trim() !== '') {
            headerProfileImg.src = avatarUrl;
            headerProfileImg.style.display = 'block';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'none';
        } else {
            headerProfileImg.style.display = 'none';
            if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
        }
    }

    // ⚡ ২. ফায়ারবেস বা লোকাল স্টোরেজ থেকে ছবি তোলার মেইন লজিক
    async function loadAvatarFast(user) {
        // যদি লোকাল স্টোরেজে আগেই ছবি থাকে, ইনস্ট্যান্ট বসিয়ে দাও (No Delay)
        let localAvatar = localStorage.getItem('activeAvatar');
        if (localAvatar) {
            applyAvatarToDOM(localAvatar);
        }

        let activeType = localStorage.getItem('activeIdentityType');
        if (!activeType) {
            activeType = 'user';
            localStorage.setItem('activeIdentityType', 'user');
        }

        // ফায়ারবেস থেকে ফ্রেশ ছবি ফ্লেচ করা
        if (activeType === 'user') {
            if (user.photoURL) {
                localStorage.setItem('activeAvatar', user.photoURL);
                applyAvatarToDOM(user.photoURL);
            }
            
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().profilePic) {
                    const pic = userDoc.data().profilePic;
                    localStorage.setItem('activeAvatar', pic);
                    if (userDoc.data().name) localStorage.setItem('activeName', userDoc.data().name);
                    applyAvatarToDOM(pic);
                }
            } catch (e) {
                console.warn("User avatar sync failed:", e);
            }
        } else if (activeType === 'company') {
            const compId = localStorage.getItem('activeCompanyId');
            if (compId) {
                try {
                    const compDoc = await db.collection('companies').doc(compId).get();
                    if (compDoc.exists && compDoc.data().logo) {
                        const logo = compDoc.data().logo;
                        localStorage.setItem('activeAvatar', logo);
                        applyAvatarToDOM(logo);
                    }
                } catch (e) {
                    console.warn("Company logo sync failed:", e);
                }
            }
        }
    }

    // ⚡ ৩. অথ স্টেট চেঞ্জ ও ইনিশিয়ালাইজেশন
    document.addEventListener('DOMContentLoaded', function() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("Header-Sync: 🔓 ইউজার লগইন অবস্থায় আছে।");
                await loadAvatarFast(user);
                initHeaderSync();
            } else {
                console.log("Header-Sync: 🌐 লগআউট মোড।");
                applyAvatarToDOM(null);
                hideBadges();
            }
        });

        window.addEventListener('identityChanged', function() {
            const user = auth.currentUser;
            if (user) {
                loadAvatarFast(user);
                initHeaderSync();
            }
        });
    });

    function initHeaderSync() {
        const activeIdentity = window.getActiveIdentity();
        if (!activeIdentity) return;

        syncUnreadNotifications(activeIdentity);
        syncUnreadMessages(activeIdentity.id);
    }

    function syncUnreadNotifications(activeIdentity) {
        const notifBadge = document.getElementById('notification-badge') || document.getElementById('notification-count');
        if (!notifBadge || !activeIdentity) return;

        if (unreadNotifListener) unreadNotifListener();

        const targetId = String(activeIdentity.id);
        const isCompanyMode = activeIdentity.type === 'company';

        unreadNotifListener = db.collection('notifications')
            .where('userId', '==', targetId)
            .where('isRead', '==', false)
            .onSnapshot(snapshot => {
                let validUnreadCount = 0;
                const uniqueKeys = new Set();

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const notifUserId = String(data.userId || '');
                    const targetType = data.targetType || '';

                    if (notifUserId !== targetId) return;

                    if (!isCompanyMode) {
                        if (targetType === 'company') return;
                        if (notifUserId.startsWith('comp_')) return;
                    }

                    if (isCompanyMode) {
                        if (targetType === 'user') return;
                    }

                    if (data.senderId && String(data.senderId) === targetId) return;

                    const msgContent = (data.message || data.body || '').trim();
                    const notifType = data.type || 'general';
                    let uniqueKey = doc.id;
                    if (msgContent) uniqueKey = `${msgContent}_${notifType}`;

                    if (!uniqueKeys.has(uniqueKey)) {
                        uniqueKeys.add(uniqueKey);
                        validUnreadCount++;
                    }
                });

                if (validUnreadCount > 0) {
                    notifBadge.textContent = validUnreadCount > 99 ? '99+' : validUnreadCount;
                    notifBadge.style.display = 'inline-block'; 
                } else {
                    notifBadge.style.display = 'none';
                }
            }, err => console.error("Notif badge error:", err));
    }

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
                    if (chatData.lastSenderId && chatData.lastSenderId !== activeId && chatData.isUnread === true) {
                        unreadChatsCount++;
                    }
                });

                if (unreadChatsCount > 0) {
                    msgBadge.textContent = unreadChatsCount > 99 ? '99+' : unreadChatsCount;
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

// 🚪 লগআউট লজিক
if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged((user) => {
        const loginBtn = document.getElementById('login-link-sidebar');
        const logoutBtn = document.getElementById('logout-link-sidebar');

        if (user) {
            if (loginBtn) loginBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'flex';
        } else {
            if (loginBtn) loginBtn.style.display = 'flex';
            if (logoutBtn) logoutBtn.style.display = 'none';
        }
    });
    }
