// =======================================================
// 🎯 আমার বাড়ি.কম - রিয়েল-টাইમ নোটিফিকেশন ইঞ্জিন
// =======================================================

const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const notificationsList = document.getElementById('notifications-list');
    const authMessage = document.getElementById('auth-message');
    const notificationBadge = document.getElementById('notification-count');
    
    let activeNotificationListener = null;

    // ব্যবহারকারী লগইন করা আছে কিনা তা চেক করা
    auth.onAuthStateChanged(user => {
        if (user) {
            if (authMessage) authMessage.style.display = 'none';
            
            // হেডার প্রোফাইল পিকচার সিঙ্ক (চ্যাট পেজের সাথে সামঞ্জস্য রেখে)
            loadHeaderProfile(user.uid);
            
            // রিয়েল-টাইম নোটিফিকেশন লিসেনার চালু করা
            listenToNotifications(user.uid);
        } else {
            if (notificationsList) notificationsList.innerHTML = ''; 
            if (authMessage) authMessage.style.display = 'block';
            if (notificationBadge) notificationBadge.style.display = 'none';
            
            if (activeNotificationListener) activeNotificationListener();
        }
    });

    // 🎯 রিয়েল-টাইম নোটিফিকেশন লোড ও ব্যাজ আপডেট ফাংশন
    function listenToNotifications(userId) {
        if (!notificationsList) return;
        notificationsList.innerHTML = '<p style="text-align: center; color: #555;">নোটিফিকেশন লোড হচ্ছে...</p>';

        // পুরানো লিসেনার সচল থাকলে বন্ধ করা
        if (activeNotificationListener) activeNotificationListener();

        activeNotificationListener = db.collection('notifications')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .onSnapshot((snapshot) => {
                
                if (snapshot.empty) {
                    notificationsList.innerHTML = '<p style="text-align: center; color: #999;">আপনার কোনো নোটিফিকেশন নেই।</p>';
                    if (notificationBadge) notificationBadge.style.display = 'none';
                    return;
                }

                notificationsList.innerHTML = ''; 
                let unreadCount = 0;

                snapshot.forEach(doc => {
                    const notification = doc.data();
                    const notifId = doc.id;
                    
                    if (!notification.read) {
                        unreadCount++;
                    }

                    const listItem = document.createElement('li');
                    listItem.className = `notification-item ${notification.read ? '' : 'unread'}`;
                    listItem.dataset.id = notifId;
                    
                    // সময় বিন্যাস
                    const time = notification.timestamp ? 
                        new Date(notification.timestamp.toDate()).toLocaleTimeString('bn-BD', {
                            hour: '2-digit', minute: '2-digit'
                        }) + ', ' + new Date(notification.timestamp.toDate()).toLocaleDateString('bn-BD')
                        : 'এখনই';

                    listItem.innerHTML = `
                        <i class="material-icons notification-icon-large">${notification.read ? 'done_all' : 'notifications'}</i>
                        <div class="notif-content">
                            <p class="notif-text">${notification.message}</p>
                        </div>
                        <span class="notif-time">${time}</span>
                    `;

                    // নোটিফিকেশনে ক্লিক করলে 'read: true' হবে
                    listItem.addEventListener('click', () => {
                        if (!notification.read) {
                            markAsRead(notifId);
                        }
                    });

                    notificationsList.appendChild(listItem);
                });

                // 🎯 লাইভ নোটিফিকেশন কাউন্ট ব্যাজ আপডেট
                if (notificationBadge) {
                    if (unreadCount > 0) {
                        notificationBadge.textContent = unreadCount;
                        notificationBadge.style.display = 'inline-block';
                    } else {
                        notificationBadge.style.display = 'none';
                    }
                }

            }, (error) => {
                console.error("নোটিফিকেশন লোড এরর: ", error);
                notificationsList.innerHTML = '<p style="text-align: center; color: red;">নোটিফিকেশন লোড করতে ব্যর্থ হয়েছে।</p>';
            });
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
                // প্রোফাইল পেজের ফিল্ড নেম ও ফেসবুক/গুগল অথ ফিল্ড চেক
                if (data.profilePic) {
                    headerProfileImg.src = data.profilePic;
                } else if (data.profilePictureUrl) {
                    headerProfileImg.src = data.profilePictureUrl;
                }
            }
        }).catch(error => console.error("হেডার ইমেজ লোড এরর:", error));
    }
});
