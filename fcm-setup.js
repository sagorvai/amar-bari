// =======================================================
// 🎯 আমার বাড়ি.কম - আলটিমেট নোটিফিকেশন কোর লজিক ইঞ্জিন
// =======================================================

const messaging = firebase.messaging();

// VAPID Key
const VAPID_KEY = "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"; 

let currentTriggerType = "delayed";

// পেজ লোড হবার সাথে সাথে ইনিশিয়ালাইজেশন শুরু
document.addEventListener('DOMContentLoaded', () => {
    // ১. 🪝 হেডারের ডামি ব্যাজ লজিক
    checkAndSetupDummyBadge();

    // সার্ভিস ওয়ার্কার রেজিস্টার করা ও ৩-মিনিট ডিলে টাইমার শুরু
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./firebase-messaging-sw.js')
        .then((registration) => {
            messaging.useServiceWorker(registration);
            
            const delayTime = 180000; 
            setTimeout(() => {
                if (Notification.permission === 'default' && !localStorage.getItem('fcm_popup_dismissed')) {
                    triggerCustomPopup("delayed");
                }
            }, delayTime);

        }).catch(err => console.error('Service Worker Error:', err));
    }

    // পপআপ বাটনের ইভেন্ট লিসেনারস
    document.getElementById('fcm-btn-allow').addEventListener('click', handleAllowClick);
    document.getElementById('fcm-btn-deny').addEventListener('click', handleDenyClick);
});

// ২. 🪝 ডামি নোটিফিকেশন ব্যাজ কন্ট্রোলার (আইডি সিঙ্ক করা হয়েছে)
function checkAndSetupDummyBadge() {
    const notificationBadge = document.getElementById('notification-badge'); // HTML-এর অরিজিনাল আইডি
    const notificationBtn = document.getElementById('notificationButton'); // HTML-এর অরিজিনাল আইডি

    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            // যদি আগে থেকে নোটিফিকেশন এলাউ করা থাকে, তবে ডামি ব্যাজ দেখাবে না
            if (Notification.permission === 'granted') {
                if (notificationBadge) notificationBadge.style.display = "none";
                return;
            }

            if (notificationBadge) {
                notificationBadge.innerText = "1";
                notificationBadge.style.display = "block";
            }
            
            if (notificationBtn) {
                notificationBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    triggerCustomPopup("badge");
                };
            }
        }
    });
}

// 📢 ৩. ডাইনামিক মেসেজ সেটআপ
function triggerCustomPopup(triggerType) {
    if (Notification.permission !== 'default') return;
    
    currentTriggerType = triggerType;
    const titleElement = document.getElementById('fcm-popup-title');
    const bodyElement = document.getElementById('fcm-popup-body');
    const currentUser = firebase.auth().currentUser;

    if (triggerType === "badge") {
        titleElement.innerText = "🔔 নোটিফিকেশন পেজটি দেখতে অনুমতি দিন!";
        bodyElement.innerText = "'আমার বাড়ি.কম'-এর সেরা সব প্রপার্টি ডিল, নতুন বাসা ভাড়া এবং ক্রেতা-বিক্রেতার চ্যাট মেসেজের লাইভ আপডেট সরাসরি আপনার ডিভাইসের স্ক্রিনে পেতে নোটিফিকেশনটি চালু করুন।";
    } else if (triggerType === "delayed") {
        if (currentUser) {
            titleElement.innerText = "🔔 মেসেজের উত্তর মিস করতে চান না?";
            bodyElement.innerText = "বাড়ির মালিক বা ক্রেতার পাঠানো মেসেজের তাৎক্ষণিক আপডেট সরাসরি ডিভাইসের স্ক্রিনে পেতে নোটিফিকেশনটি চালু করে রাখুন।";
        } else {
            titleElement.innerText = "🏡 স্বপ্নের বাড়ির খোঁজ পান সবার আগে!";
            bodyElement.innerText = "আপনার এলাকায় নতুন বাসা ভাড়া, ফ্ল্যাট বিক্রি বা প্লটের বিজ্ঞাপন আসার সাথে সাথে ইনস্ট্যান্ট নোটিফিকেশন পেতে অনুমতি দিন।";
        }
    } else if (triggerType === "alert") {
        titleElement.innerText = "📍 এই এলাকার নতুন প্রপার্টির আপডেট চান?";
        bodyElement.innerText = "আপনার সার্চ করা লোকেশনে নতুন কোনো ফ্ল্যাট বা প্লটের বিজ্ঞাপন আসার সাথে সাথে সরাসরি মোবাইলে ইনস্ট্যান্ট নোটিফিকেশন পেতে অ্যালার্টটি সচল করুন।";
    } else if (triggerType === "save") {
        titleElement.innerText = "❤️ লগইন ছাড়াই প্রপার্টিটি সেভ করে রাখুন!";
        bodyElement.innerText = "এই বাড়িটি আপনার ডিভাইসে সেভ থাকবে এবং পরবর্তীতে এর দাম কমলে বা প্রপার্টির কোনো আপডেট আসলে আপনাকে সরাসরি স্ক্রিনে নোটিফিকেশন পাঠানো হবে।";
    }

    document.getElementById('custom-notification-popup').classList.add('fcm-popup-show');
}

// 🛑 ৪. ইউজার 'পরে দেখব' (Deny) বাটনে ক্লিক করলে লজিক
function handleDenyClick() {
    document.getElementById('custom-notification-popup').classList.remove('fcm-popup-show');
    const expiryTime = new Date().getTime() + (3 * 24 * 60 * 60 * 1000); 
    localStorage.setItem('fcm_popup_dismissed', expiryTime);
}

// 🟢 ৫. ইউজার 'হ্যাঁ, চালু করুন' বাটনে ক্লিক করলে আসল ব্রাউজার পারমিশন প্রম্পট
async function handleAllowClick() {
    document.getElementById('custom-notification-popup').classList.remove('fcm-popup-show');
    
    try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('ব্রাউজার নোটিফিকেশন পারমিশন গ্রান্টেড!');
            
            // ডামি ব্যাজ সাথে সাথে লুকিয়ে ফেলা হবে
            const notificationBadge = document.getElementById('notification-badge');
            if (notificationBadge) notificationBadge.style.display = "none";

            await getAndSaveToken();
            triggerWelcomeNotification();
        }
    } catch (error) {
        console.error('পারমিশন প্রসেস করার সময় এরর:', error);
    }
}

// 💾 ৬. টোকেন সংগ্রহ এবং ফায়ারস্টোরে স্মার্ট সংরক্ষণ
async function getAndSaveToken() {
    try {
        console.log("FCM টোকেন সংগ্রহের চেষ্টা করা হচ্ছে...");
        const currentToken = await messaging.getToken({ vapidKey: VAPID_KEY });
        
        if (!currentToken) {
            console.error('কোনো টোকেন পাওয়া যায়নি! পারমিশন বা VAPID কী চেক করুন।');
            return;
        }

        console.log("টোকেন জেনারেট হয়েছে:", currentToken);
        localStorage.setItem('my_fcm_token', currentToken);

        // গ্লোবাল db রেফারেন্স অথবা লোকাল ইনিশিয়ালাইজেশন নিশ্চিত করা
        const firestoreDb = typeof db !== 'undefined' ? db : firebase.firestore();
        const currentUser = firebase.auth().currentUser;

        if (currentUser) {
            console.log("লগইন করা ইউজারের জন্য টোকেন সেভ হচ্ছে...");
            await firestoreDb.collection('users').doc(currentUser.uid).set({
                fcmToken: currentToken,
                lastActive: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            
            // অ্যানোনিমাস কালেকশন থেকে ডিলিট করা (যদি থাকে)
            try {
                await firestoreDb.collection('anonymous_tokens').doc(currentToken).delete();
            } catch(e) { /* ডক না থাকলে এরর স্কিপ করবে */ }
            
        } else {
            console.log("গেস্ট (Anonymous) ইউজারের জন্য টোকেন সেভ হচ্ছে...");
            
            // আপনার রুলস অনুযায়ী 'create' পারমিশন ট্রিগার করতে সরাসরি .doc(currentToken).set() ব্যবহার
            await firestoreDb.collection('anonymous_tokens').doc(currentToken).set({
                token: currentToken,
                deviceType: "web",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log("🎉 গেস্ট টোকেন সফলভাবে anonymous_tokens কালেকশনে জমা হয়েছে!");
        }
    } catch (error) {
        console.error('টোকেন ডাটাবেজে সেভ করার সময় মূল ত্রুটি:', error);
    }
            }
// 🔄 ৭. স্মার্ট টোকেন মাইগ্রেশন
async function migrateVisitorTokenToUser(userId) {
    const savedToken = localStorage.getItem('my_fcm_token');
    if (!savedToken) return;

    try {
        await firebase.firestore().collection('users').doc(userId).set({
            fcmToken: savedToken
        }, { merge: true });

        await firebase.firestore().collection('anonymous_tokens').doc(savedToken).delete();
        console.log('টোকেন সফলভাবে রেজিস্টার্ড আইডিতে স্থানান্তরিত হয়েছে।');
    } catch (error) {
        console.error('টোকেন মাইগ্রেশন এরর:', error);
    }
}

// 🔄 অথেনটিকেশন স্টেট মনিটর করা (১০০% সচল ও সহজ সংস্করণ)
// 🔄 অথেনটিকেশন স্টেট মনিটর করা (আপডেটেড ও কাস্টমাইজড সংস্করণ)
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        console.log("ইউজার লগইন/সাইনআপ অবস্থায় আছেন। UID:", user.uid);
        const db = firebase.firestore();

        // ফায়ারস্টোরে ইউজারের বেসিক প্রোফাইল নিশ্চিত করা
        db.collection('users').doc(user.uid).set({
            uid: user.uid,
            email: user.email || "",
            phoneNumber: user.phoneNumber || "",
            lastActive: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true })
        .then(() => {
            console.log("ফায়ারস্টোরে ইউজারের বেシック প্রোফাইল আপডেট হয়েছে।");
            
            const savedToken = localStorage.getItem('my_fcm_token');

            if (savedToken) {
                console.log("পূর্বে টোকেন জেনারেট করা আছে, মাইগ্রেট করা হচ্ছে...");
                // গেস্ট টোকেনটি ইউজারের ডকে সেভ করবে এবং অ্যানোনিমাস থেকে ডিলিট করবে
                migrateVisitorTokenToUser(user.uid);
            } else {
                console.log("পূর্বে কোনো টোকেন নেই। সাইন-আপের পর স্বাগত নোটিফিকেশন ব্যাজ সেটআপ করা হচ্ছে...");
                
                // 🔔 ইউজার সাইন-আপ করার পর যদি টোকেন না থাকে, তবে হেডারে একটি ডামি স্বাগত নোটিফিকেশন ব্যাজ দেখাবো
                const notificationBadge = document.getElementById('notification-badge'); // অথবা 'notification-count'
                const notificationBtn = document.getElementById('notificationButton');

                if (notificationBadge) {
                    notificationBadge.innerText = "1"; // স্বাগত নোটিফিকেশনের জন্য '১' দেখাবে
                    notificationBadge.style.display = "block";
                }

                if (notificationBtn) {
                    // হেডারের নোটিফিকেশন আইকনে ক্লিক করলে তাকে নোটিফিকেশন পেজে রিডিরেক্ট করবে
                    notificationBtn.onclick = (e) => {
                        window.location.href = '/notifications.html';
                    };
                }
            }
        })
        .catch((error) => console.error("ইউজার ডক স্যাটআপ করতে ব্যর্থ: ", error));
    }
});

// 🎉 ৮. স্বাগত নোটিফিকেশন
function triggerWelcomeNotification() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.showNotification('🏡 আমার বাড়ি.কম-এ আপনাকে স্বাগতম!', {
                body: 'এখন থেকে সেরা সব প্রপার্টি ডিল, বাসা ভাড়া এবং চ্যাট মেসেজের লাইভ আপডেট পাবেন সবার আগে। ধন্যবাদ আমাদের সাথে থাকার জন্য!',
                icon: '/assets/images/logo.png',
                data: { click_action: '/notifications.html' }
            });
        });
    }
}

window.triggerFCM = function(type) {
    if (!localStorage.getItem('fcm_popup_dismissed') || new Date().getTime() > localStorage.getItem('fcm_popup_dismissed')) {
        triggerCustomPopup(type);
    }
}
