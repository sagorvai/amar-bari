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

    window.dispatchEvent(new Event('identityChanged'));
};

(function() {
    const db = firebase.firestore();
    const auth = firebase.auth();

    let unreadNotifListener = null;
    let unreadMsgListener = null;

    document.addEventListener('DOMContentLoaded', function() {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log("Header-Sync: 🔓 ইউজার কানেক্টেড। সিঙ্কিং শুরু হচ্ছে...");
                
                // ⚡ ১. প্রথমে ছবি ও প্রোফাইল ডাটা ফেচ ও আপডেট
                await syncProfileAvatarNow(user);
                
                // ⚡ ২. হেডার এবং কাউন্টার সিঙ্ক
                initHeaderSync();
            } else {
                console.log("Header-Sync: 🌐 গেস্ট/লগআউট মোড।");
                hideBadges();
            }
        });

        window.addEventListener('identityChanged', function() {
            if (auth.currentUser) {
                initHeaderSync();
            }
        });
    });

    // ⚡ ইনস্ট্যান্ট ছবি সিঙ্ক ফাংশন (যা ফার্স্ট লোডেই ফায়ারবেস থেকে ছবি টেনে আনে)
    async function syncProfileAvatarNow(user) {
        const activeType = localStorage.getItem('activeIdentityType') || 'user';
        
        if (activeType === 'company') {
            const compId = localStorage.getItem('activeCompanyId');
            if (compId) {
                try {
                    const compDoc = await db.collection('companies').doc(compId).get();
                    if (compDoc.exists) {
                        const data = compDoc.data();
                        if (data.logo) localStorage.setItem('activeAvatar', data.logo);
                        if (data.companyName) localStorage.setItem('activeName', data.companyName);
                    }
                } catch (e) {
                    console.warn("Company sync error:", e);
                }
            }
        } else {
            // পার্সোনাল মোড
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const data = userDoc.data();
                    const pic = data.profilePic || data.photoURL || user.photoURL || '';
                    const name = data.name || data.displayName || user.displayName || 'ইউজার';
                    
                    if (pic) localStorage.setItem('activeAvatar', pic);
                    if (name) localStorage.setItem('activeName', name);
                } else if (user.photoURL) {
                    localStorage.setItem('activeAvatar', user.photoURL);
                }
            } catch (e) {
                if (user.photoURL) localStorage.setItem('activeAvatar', user.photoURL);
            }
        }

        // ছবি আপডেট হওয়া মাত্র ইনস্ট্যান্ট DOM আপডেট
        const activeIdentity = window.getActiveIdentity();
        updateHeaderAvatarAndBadge(activeIdentity);
    }

    function initHeaderSync() {
        const activeIdentity = window.getActiveIdentity();
        if (!activeIdentity) return;

        // 🖼️ হেডারের ছবি ও মোড লেবেল আপডেট
        updateHeaderAvatarAndBadge(activeIdentity);

        // 🔔 ১. নোটিফিকেশন সিঙ্ক
        syncUnreadNotifications(activeIdentity);

        // 💬 ২. মেসেজ সিঙ্ক
        syncUnreadMessages(activeIdentity.id);
    }

    // 🖼️ হেডারের ছবি সরাসরি DOM-এ রেন্ডার করার ফাংশন
    function updateHeaderAvatarAndBadge(activeIdentity) {
        const headerProfileImg = document.querySelector('#profileImageWrapper img') || document.getElementById('profileImage');
        const defaultProfileIcon = document.getElementById('defaultProfileIcon');

        if (headerProfileImg) {
            const currentAvatar = (activeIdentity && activeIdentity.avatar) ? activeIdentity.avatar : localStorage.getItem('activeAvatar');

            if (currentAvatar && currentAvatar.trim() !== '') {
                headerProfileImg.src = currentAvatar;
                headerProfileImg.style.display = 'block';
                if (defaultProfileIcon) defaultProfileIcon.style.display = 'none';
            } else {
                headerProfileImg.style.display = 'none';
                if (defaultProfileIcon) defaultProfileIcon.style.display = 'block';
            }
        }

        const modeLabel = document.getElementById('active-mode-label');
        if (modeLabel && activeIdentity) {
            modeLabel.textContent = activeIdentity.type === 'company' ? `🏢 ${activeIdentity.name}` : `👤 ${activeIdentity.name}`;
        }
    }

    // 🔔 আনরিড নোটিফিকেশন লাইভ কাউন্ট
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
                        if (data.type === 'chat' && data.companyId && data.companyId !== targetId) return;
                    }

                    if (isCompanyMode) {
                        if (targetType === 'user') return;
                        if (!notifUserId.startsWith('comp_') && targetId.startsWith('comp_')) return;
                    }

                    if (data.senderId && String(data.senderId) === targetId) return;

                    const msgContent = (data.message || data.body || '').trim();
                    const notifType = data.type || 'general';
                    
                    let uniqueKey = doc.id;
                    if (data.chatId && msgContent) {
                        uniqueKey = `${data.chatId}_${msgContent}_${notifType}`;
                    } else if (msgContent) {
                        uniqueKey = `${msgContent}_${notifType}`;
                    }

                    if (!uniqueKeys.has(uniqueKey)) {
                        uniqueKeys.add(uniqueKey);
                        validUnreadCount++;
                    }
                });

                try {
                    if (window.AndroidBridge && typeof window.AndroidBridge.setPendingNotificationCount === 'function') {
                        window.AndroidBridge.setPendingNotificationCount(validUnreadCount);
                    }
                } catch (e) {
                    console.warn('Android badge sync unavailable:', e);
                }

                if (validUnreadCount > 0) {
                    notifBadge.textContent = validUnreadCount > 99 ? '99+' : validUnreadCount;
                    notifBadge.style.display = 'inline-block'; 
                } else {
                    notifBadge.style.display = 'none';
                }
            }, err => console.error("Notif badge error:", err));
    }

    // 💬 আনরিড চ্যাট মেসেজ লাইভ কাউন্ট
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

// =======================================================
// 🚪 গ্লোবাল লগআউট ও অথ স্টেট হ্যান্ডলার
// =======================================================

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

document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.getElementById('logout-link-sidebar');
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (confirm("আপনি কি নিশ্চিত যে লগআউট করতে চান?")) {
                firebase.auth().signOut().then(() => {
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
