// =======================================================
// 🎯 আমার বাড়ি.কম - ব্যাকগ্রাউন্ড নোটিফিকেশন সার্ভিস ওয়ার্কার
// =======================================================

importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

// ⚠️ ফিক্সড কনফিগারেশন
const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// ব্যাকগ্রাউন্ডে নোটিফিকেশন রিসিভ করার লজিক
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] ব্যাকগ্রাউন্ড মেসেজ রিসিভড: ', payload);

    const notificationTitle = payload.notification.title || 'আমার বাড়ি.কম';
    const notificationOptions = {
        body: payload.notification.body || 'আপনার একটি নতুন নোটিফিকেশন আছে।',
        icon: '/assets/images/logo.png',
        badge: '/assets/images/badge.png',
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
