// =======================================================
// 🎯 আমার বাড়ি.কম - ব্যাকগ্রাউন্ড নোটিফিকেশন সার্ভিস ওয়ার্কার
// =======================================================

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// ⚠️ তোমার ফায়ারবেস প্রজেক্ট কনফিগারেশন দিয়ে এটি পরিবর্তন করো
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ব্যাকগ্রাউন্ডে (ট্যাব বন্ধ থাকলে) নোটিফিকেশন রিসিভ করার লজিক
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] ব্যাকগ্রাউন্ড মেসেজ রিসিভড: ', payload);

    const notificationTitle = payload.notification.title || 'আমার বাড়ি.কম';
    const notificationOptions = {
        body: payload.notification.body || 'আপনার একটি নতুন নোটিফিকেশন আছে।',
        icon: '/assets/images/logo.png', // তোমার লোগো পাথ
        badge: '/assets/images/badge.png', // ছোট আইকন পাথ
        data: {
            click_action: payload.data.click_action || '/notifications.html'
        }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// নোটিফিকেশনে ক্লিক করলে পেজ ওপেন করার লজিক
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    const targetUrl = event.notification.data.click_action;

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            for (let i = 0; i < clientList.length; i++) {
                let client = clientList[i];
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
