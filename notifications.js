// 🎯 ১. নিশ্চিত ওয়েলকাম নোটিফিকেশন ক্রিয়েশন ফিক্স
async function ensureWelcomeNotification(activeIdentity) {
    if (!activeIdentity || !activeIdentity.id || !auth.currentUser) return;

    try {
        const notifRef = db.collection("notifications");
        // সরাসরি activeIdentity.id দিয়ে চেক
        const snapshot = await notifRef.where("userId", "==", activeIdentity.id).limit(1).get();

        if (snapshot.empty) {
            const isCompany = activeIdentity.type === 'company';
            const targetName = activeIdentity.name || (isCompany ? "কোম্পানি" : "সম্মানিত গ্রাহক");

            const titleText = isCompany 
                ? `🏢 ${targetName}-এ আপনাকে স্বাগতম!`
                : `👋 ${targetName}, আমার বাড়ি প্ল্যাটফর্মে আপনাকে স্বাগত!`;

            const messageText = isCompany
                ? `আপনার কোম্পানি/পেজ প্রোফাইলটি সফলভাবে সক্রিয় হয়েছে। কাস্টমারদের বার্তা ও আপডেট এখানে দেখতে পাবেন।`
                : `আমাদের সাথে যুক্ত হওয়ার জন্য আপনাকে আন্তরিক ধন্যবাদ। সেরা প্রপার্টি ডিল এবং রিয়েল-টাইম আপডেট পেতে সাথে থাকুন।`;

            await notifRef.add({
                userId: activeIdentity.id, // কোম্পানি মোডে কোম্পানি ID, ইউজার মোডে ইউজার UID
                ownerUid: auth.currentUser.uid,
                recipientType: isCompany ? 'company' : 'user', // ⚡ স্ট্রিক্ট টাইপ
                title: titleText,
                message: messageText,
                type: "welcome",
                senderName: targetName,
                isRead: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error("স্বাগত নোটিফিকেশন তৈরিতে সমস্যা: ", error);
    }
}

// 🎯 ২. নোটিফিকেশন সেপারেশন ফিল্টার (ইউজার মোডে কোনো পেজের নোটিফিকেশন আসবে না)
function listenForNotifications(activeIdentity) {
    const notificationContainer = document.getElementById("notifications-list");

    if (currentNotifUnsubscribe) {
        currentNotifUnsubscribe();
        currentNotifUnsubscribe = null;
    }

    const targetUserId = String(activeIdentity.id);
    const isCompany = activeIdentity.type === 'company';

    // শুধুমাত্র যে আইডি সক্রিয় (User UID অথবা Company ID), ঠিক তার নোটিফিকেশন লোড হবে
    const query = db.collection("notifications").where("userId", "==", targetUserId);

    currentNotifUnsubscribe = query.onSnapshot((snapshot) => {
        if (notificationContainer) notificationContainer.innerHTML = "";

        if (snapshot.empty) {
            if (notificationContainer) {
                notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">কোনো নোটিফিকেশন নেই।</p>`;
            }
            updateNotificationHeaderBadge(0);
            return;
        }

        const uniqueNotifsMap = new Map();

        snapshot.forEach((doc) => {
            const data = doc.data();
            const notifUserId = String(data.userId || '');

            // ⚡ মূল ফিল্টারিং গার্ড:
            // ১. ডাটার userId আর অ্যাক্টিভ ഐഡി ১০০% একই হতে হবে
            if (notifUserId !== targetUserId) {
                return;
            }

            // ২. ইউজার মোডে থাকলে 'comp_' দিয়ে শুরু হওয়া কোনো কোম্পানির ডাটা দেখানো যাবে না
            if (!isCompany && (notifUserId.startsWith('comp_') || data.recipientType === 'company')) {
                return;
            }

            // ৩. পেজ মোডে থাকলে ইউজারের ব্যক্তিগত নোটিফিকেশন বাদ দেওয়া
            if (isCompany && data.recipientType === 'user') {
                return;
            }

            // ৪. নিজেকে পাঠানো নোটিফিকেশন ফিল্টার
            if (data.senderId && String(data.senderId) === targetUserId) {
                return;
            }

            const msgContent = (data.message || data.body || '').trim();
            const notifType = data.type || 'general';
            
            let uniqueKey = doc.id;
            if (data.chatId && msgContent) {
                uniqueKey = `${data.chatId}_${msgContent}_${notifType}`;
            } else if (msgContent) {
                uniqueKey = `${msgContent}_${notifType}`;
            }

            if (!uniqueNotifsMap.has(uniqueKey)) {
                uniqueNotifsMap.set(uniqueKey, { id: doc.id, data: data });
            }
        });

        let docsArray = Array.from(uniqueNotifsMap.values());

        if (docsArray.length === 0) {
            if (notificationContainer) {
                notificationContainer.innerHTML = `<p style="text-align: center; color: #7f8c8d; padding: 20px;">কোনো নতুন নোটিফিকেশন নেই।</p>`;
            }
            updateNotificationHeaderBadge(0);
            return;
        }

        docsArray.sort((a, b) => {
            const getMillis = (d) => {
                if (!d) return 0;
                if (d.seconds) return d.seconds * 1000;
                return new Date(d).getTime() || 0;
            };
            return getMillis(b.data.createdAt || b.data.timestamp) - getMillis(a.data.createdAt || a.data.timestamp);
        });

        if (notificationContainer) {
            docsArray.forEach((item) => {
                const notifItem = createNotificationCard(item.id, item.data);
                notificationContainer.appendChild(notifItem);
            });
        }

        const unreadCount = docsArray.reduce((n, item) => n + (item.data.isRead === false ? 1 : 0), 0);
        updateNotificationHeaderBadge(unreadCount);

    }, (error) => {
        console.error("নোটিফিকেশন লোড এরর:", error);
        if (notificationContainer) showErrorUI(notificationContainer);
    });
                                          }
