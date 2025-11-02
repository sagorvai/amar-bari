// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const notificationsList = document.getElementById('notifications-list');
    const authMessage = document.getElementById('auth-message');

    // ব্যবহারকারী লগইন করা আছে কিনা তা চেক করা
    auth.onAuthStateChanged(user => {
        if (user) {
            authMessage.style.display = 'none';
            // ব্যবহারকারী লগইন করা থাকলে নোটিফিকেশন লোড করা
            loadNotifications(user.uid);
        } else {
            // লগইন করা না থাকলে ওয়ার্নিং দেখানো
            notificationsList.innerHTML = ''; // খালি করে দেওয়া
            authMessage.style.display = 'block';
        }
    });

    // নোটিফিকেশন লোড করার ফাংশন
    async function loadNotifications(userId) {
        notificationsList.innerHTML = '<p style="text-align: center; color: #555;">নোটিফিকেশন লোড হচ্ছে...</p>';

        try {
            // নির্দিষ্ট ব্যবহারকারীর জন্য নোটিফিকেশনগুলি সংগ্রহ করা
            const snapshot = await db.collection('notifications')
                .where('userId', '==', userId)
                .orderBy('timestamp', 'desc') // নতুনগুলো আগে দেখানোর জন্য
                .get();

            if (snapshot.empty) {
                notificationsList.innerHTML = '<p style="text-align: center; color: #999;">আপনার কোনো নোটিফিকেশন নেই।</p>';
                return;
            }

            notificationsList.innerHTML = ''; // লোডিং বার্তা মুছে ফেলা

            snapshot.forEach(doc => {
                const notification = doc.data();
                const notifId = doc.id;
                
                const listItem = document.createElement('li');
                listItem.className = `notification-item ${notification.read ? '' : 'unread'}`;
                listItem.dataset.id = notifId;
                
                // সময় বিন্যাস করা
                const time = notification.timestamp ? 
                    new Date(notification.timestamp.toDate()).toLocaleTimeString('bn-BD', {
                        hour: '2-digit', minute: '2-digit'
                    }) + ', ' + new Date(notification.timestamp.toDate()).toLocaleDateString('bn-BD')
                    : 'এখনই'; // যদি সময় না থাকে

                listItem.innerHTML = `
                    <i class="material-icons notification-icon-large">${notification.read ? 'done_all' : 'notifications'}</i>
                    <div class="notif-content">
                        <p class="notif-text">${notification.message}</p>
                    </div>
                    <span class="notif-time">${time}</span>
                `;

                // নোটিফিকেশনে ক্লিক করলে সেটি 'read' হিসেবে চিহ্নিত করা
                listItem.addEventListener('click', () => {
                    markAsRead(notifId, listItem);
                });

                notificationsList.appendChild(listItem);
            });

        } catch (error) {
            console.error("নোটিফিকেশন লোড করতে সমস্যা হয়েছে: ", error);
            notificationsList.innerHTML = '<p style="text-align: center; color: red;">নোটিফিকেশন লোড করতে ব্যর্থ হয়েছে।</p>';
        }
    }

    // নোটিফিকেশন 'read' হিসেবে চিহ্নিত করার ফাংশন
    async function markAsRead(notifId, listItemElement) {
        try {
            await db.collection('notifications').doc(notifId).update({
                read: true
            });
            // UI আপডেট করা
            listItemElement.classList.remove('unread');
            const iconElement = listItemElement.querySelector('.notification-icon-large');
            if (iconElement) {
                iconElement.textContent = 'done_all'; // আইকন পরিবর্তন
            }
        } catch (error) {
            console.error("নোটিফিকেশন 'read' হিসেবে চিহ্নিত করতে সমস্যা হয়েছে: ", error);
        }
    }
});
