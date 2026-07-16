// =======================================================
// 🎯 আমার বাড়ি.কম - রিয়েল-টাইম উন্মুক্ত নোটিফিকেশন ইঞ্জিন
// =======================================================

const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const notificationsList = document.getElementById('notifications-list');
    const notificationBadge = document.getElementById('notification-count');
    
    let activeNotificationListener = null;

    // ব্যবহারকারী লগইন করা আছে কি না চেক করা
    auth.onAuthStateChanged(user => {
        if (user) {
            // ১. লগইন করা থাকলে ইউজারের আইডি দিয়ে সরাসরি ডাটাবেজ থেকে লাইভ নোটিফিকেশন শুনবে
            listenToNotifications(user.uid);
            loadHeaderProfile(user.uid);
        } else {
            // ২. লগইন না থাকলে গেস্টদের স্বাগতম নোটিফিকেশন এবং লোকাল নোটিফিকেশন লোড করবে
            loadGuestNotifications();
        }
    });

    // 🎯 রিয়েল-টাইম নোটিফিকেশন লোড ও ব্যাজ আপডেট ফাংশন (লগইন করা ইউজারের জন্য)
    function listenToNotifications(userId) {
        if (!notificationsList) return;
        notificationsList.innerHTML = '<p style="text-align: center; color: #555;">নোটিফিকেশন লোড হচ্ছে...</p>';

        if (activeNotificationListener) activeNotificationListener();

        // .orderBy() বাদ দেওয়া হয়েছে ইনডেক্সিং এরর এড়ানোর জন্য
        activeNotificationListener = db.collection('notifications')
            .where('userId', '==', userId)
            .onSnapshot((snapshot) => {
                
                let onlineNotifications = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    data.id = doc.id;
                    onlineNotifications.push(data);
                });

                // নোটিফিকেশনগুলোকে ক্লায়েন্ট সাইডে টাইমস্ট্যাম্প দিয়ে ক্রমানুসারে সাজানো
                onlineNotifications.sort((a, b) => {
                    const timeA = a.timestamp ? a.timestamp.toDate() : new Date();
                    const timeB = b.timestamp ? b.timestamp.toDate() : new Date();
                    return timeB - timeA; // নতুনগুলো সবার ওপরে থাকবে
                });

                renderAllNotifications(onlineNotifications);

            }, (error) => {
                console.error("নোটিফিকেশন লোড এরর: ", error);
                notificationsList.innerHTML = '<p style="text-align: center; color: red;">নোটিফিকেশন লোড করতে ব্যর্থ হয়েছে।</p>';
            });
    }

    // 🎯 গেস্ট এবং সদ্য নোটিফিকেশন এলাউ করা ইউজারদের জন্য অফলাইন/লোকাল নোটিফিকেশন লোড
    function loadGuestNotifications() {
        if (!notificationsList) return;
        
        let guestNotifications = [];

        // নোটিফিকেশন পারমিশন অলরেডি গ্র্যান্টেড কি না চেক করা
        const hasPermission = Notification.permission === 'granted';
        const welcomed = localStorage.getItem('fcm_welcome_shown');

        // যদি ইউজার পারমিশন এলাউ করে থাকেন, তবে স্বাগতম নোটিফিকেশনটি তালিকায় দেখানো হবে
        if (hasPermission) {
            guestNotifications.push({
                id: 'local_welcome',
                message: '🎉 অভিনন্দন বন্ধু! নোটিফিকেশন সার্ভিস এখন সম্পূর্ণ সচল!',
                read: welcomed === 'true', // যদি আগে ক্লিক হয়ে থাকে তবে রিড দেখাবে
                timestamp: null // 'এখনই' বা কোনো ফিক্সড টাইম শো করবে
            });
        }

        if (guestNotifications.length === 0) {
            notificationsList.innerHTML = '<p style="text-align: center; color: #999;">আপনার কোনো নোটিফিকেশন নেই।</p>';
            if (notificationBadge) notificationBadge.style.display = 'none';
        } else {
            renderAllNotifications(guestNotifications);
        }
    }

    // 🎨 নোটিফিকেশন স্ক্রিনে রেন্ডার করার কমন ফাংশন
    function renderAllNotifications(list) {
        notificationsList.innerHTML = '';
        let unreadCount = 0;

        list.forEach(notification => {
            if (!notification.read) {
                unreadCount++;
            }

            const listItem = document.createElement('li');
            listItem.className = `notification-item ${notification.read ? '' : 'unread'}`;
            listItem.dataset.id = notification.id;

            // সময় ডাইনামিক রেন্ডারিং
            let time = 'এখনই';
            if (notification.timestamp) {
                time = new Date(notification.timestamp.toDate()).toLocaleTimeString('bn-BD', {
                    hour: '2-digit', minute: '2-digit'
                }) + ', ' + new Date(notification.timestamp.toDate()).toLocaleDateString('bn-BD');
            }

            listItem.innerHTML = `
                <i class="material-icons notification-icon-large">${notification.read ? 'done_all' : 'notifications'}</i>
                <div class="notif-content">
                    <p class="notif-text">${notification.message}</p>
                </div>
                <span class="notif-time">${time}</span>
            `;

            // নোটিফিকেশনে ক্লিক ইভেন্ট
            listItem.addEventListener('click', () => {
                if (notification.id === 'local_welcome') {
                    // লোকাল নোটিফিকেশন রিড ট্র্যাকিং
                    localStorage.setItem('fcm_welcome_shown', 'true');
                    listItem.classList.remove('unread');
                    const icon = listItem.querySelector('.notification-icon-large');
                    if (icon) icon.innerText = 'done_all';
                    updateBadge(0);
                } else if (!notification.read) {
                    markAsRead(notification.id);
                }
            });

            notificationsList.appendChild(listItem);
        });

        updateBadge(unreadCount);
    }

    // নোটিফিকেশন ব্যাজ আপডেট
    function updateBadge(unreadCount) {
        if (notificationBadge) {
            if (unreadCount > 0) {
                notificationBadge.textContent = unreadCount;
                notificationBadge.style.display = 'inline-block';
            } else {
                notificationBadge.style.display = 'none';
            }
        }
    }

    // নোটিফিকেশন 'read' হিসেবে চিহ্নিত করার ফাংশন
    async function markAsRead(notifId) {
        try {
            await db.collection('notifications').doc(notifId).update({
                read: true
            });
        } catch (error) {
            console.error("নোটিফিকেশন আপডেট ত্রুটি: ", error);
        }
    }

    // হেডারের প্রোফাইল পিকচার লোডার
    function loadHeaderProfile(userId) {
        const headerProfileImg = document.getElementById('profileImage');
        if (!headerProfileImg) return;

        db.collection('users').doc(userId).get().then(doc => {
            if (doc.exists) {
                const data = doc.data();
                if (data.profilePic) {
                    headerProfileImg.src = data.profilePic;
                } else if (data.profilePictureUrl) {
                    headerProfileImg.src = data.profilePictureUrl;
                }
            }
        }).catch(error => console.error("হেডার ইমেজ লোড এরর:", error));
    }
});
