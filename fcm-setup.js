// =======================================================
// 🎯 আমার বাড়ি.কম - আলটিমেট নোটিফিকেশন কোর লজিক ইঞ্জিন
// =======================================================

const messaging = firebase.messaging();

// ⚠️ ফায়ারবেস কনসোলের Cloud Messaging সেটিংস থেকে জেনারেট করা VAPID Key এখানে বসাও
const VAPID_KEY = "BIWyqUvtwx7iH6nKiZRVCNl7ihTsFn40IJ1LVp58RYIFDEbHrWBSYnVVQ2iA5m9d7tmbNngRPvAhPDEW34SBoLg"; 

let currentTriggerType = "delayed"; // ৪টি ভিন্ন ট্রিগার ট্র্যাক করার জন্য ভেরিয়েবল

// পেজ লোড হবার সাথে সাথে ইনিশিয়ালাইজেশন শুরু
document.addEventListener('DOMContentLoaded', () => {
    // ১. 🪝 হেডারের ডামি ব্যাজ লজিক (তোমার আইডিয়া)
    checkAndSetupDummyBadge();

    // সার্ভিস ওয়ার্কার রেজিস্টার করা ও ৩-মিনিট ডিলে টাইমার শুরু
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => {
            messaging.useServiceWorker(registration);
            
            // ⏳ ৩ মিনিট বিলম্বিত ট্রিগার (১৮০,০০০ মিলিসেকেন্ড)
            // টেস্ট করার জন্য সাময়িকভাবে ২০০০০ (২০ সেকেন্ড) দিয়ে দেখতে পারো
            const delayTime = 180000; 
            setTimeout(() => {
                // ইউজার ইতিমধ্যে অ্যাকশন না নিয়ে থাকলে ৩ মিনিট পর স্বয়ংক্রিয়ভাবে দেখাবে
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

// ২. 🪝 ডামি নোটিফিকেশন ব্যাজ কন্ট্রোলার (লগইন ছাড়া ভিজিটরদের জন্য)
function checkAndSetupDummyBadge() {
    const notificationBadge = document.getElementById('notification-badge'); // তোমার হেডারের লাল ব্যাজ আইডি
    const notificationBtn = document.getElementById('notification-bell-btn'); // তোমার হেডারের বেল বাটন আইডি

    firebase.auth().onAuthStateChanged(user => {
        if (!user) {
            // ইউজার লগইন ছাড়া থাকলে ব্যাজে ১ শো করবে
            if (notificationBadge) {
                notificationBadge.innerText = "1";
                notificationBadge.style.display = "block";
            }
            
            // বেল বাটনে ক্লিক করলে কাস্টম পপআপ ট্রিগার হবে
            if (notificationBtn) {
                notificationBtn.onclick = (e) => {
                    e.preventDefault();
                    triggerCustomPopup("badge");
                };
            }
        }
    });
}

// 📢 ৩. ডাইনামিক মেসেজ সেটআপ (৪টি ভিন্ন ট্রিগারের জন্য কাস্টম টেক্সট)
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

    // পপআপ স্ক্রিনে প্রদর্শন
    document.getElementById('custom-notification-popup').classList.add('fcm-popup-show');
}

// 🛑 ৪. ইউজার 'পরে দেখব' (Deny) বাটনে ক্লিক করলে লজিক
function handleDenyClick() {
    document.getElementById('custom-notification-popup').classList.remove('fcm-popup-show');
    
    // ইউজার ডিনাই করলে ৩ দিনের জন্য একটি ট্র্যাকিং ফ্ল্যাগ লোকাল স্টোরেজে রাখা হচ্ছে
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
            await getAndSaveToken();
            
            // 🎉 তাৎক্ষণিক স্বাগত পুশ নোটিফিকেশন ট্রিগার করা (তোমার আইডিয়া)
            triggerWelcomeNotification();
        }
    } catch (error) {
        console.error('পারমিশন প্রসেস করার সময় এরর:', error);
    }
}

// 💾 ৬. টোকেন সংগ্রহ এবং ফায়ারস্টোরে স্মার্ট সংরক্ষণ
async function getAndSaveToken() {
    try {
        const currentToken = await messaging.getToken({ vapidKey: VAPID_KEY });
        if (!currentToken) return;

        localStorage.setItem('my_fcm_token', currentToken);
        const currentUser = firebase.auth().currentUser;

        if (currentUser) {
            // রেজিস্টার্ড ইউজারের ফায়ারস্টোর ডকে সেভ হবে
            await firebase.firestore().collection('users').doc(currentUser.uid).set({
                fcmToken: currentToken
            }, { merge: true });
            
            // ডুপ্লিকেট এড়াতে গেস্ট তালিকা থেকে মুছে দেওয়া হবে
            await firebase.firestore().collection('anonymous_tokens').doc(currentToken).delete();
        } else {
            // গেস্ট ভিজিটরের জন্য আলাদা কালেকশনে টোকেন সেভ হবে
            await firebase.firestore().collection('anonymous_tokens').doc(currentToken).set({
                token: currentToken,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (error) {
        console.error('টোকেন সেভ করার সময় ত্রুটি:', error);
    }
}

// 🔄 ৭. স্মার্ট টোকেন মাইগ্রেশন (ভিজিটর থেকে সাইনআপ/লগইন ইউজার সিঙ্ক)
async function migrateVisitorTokenToUser(userId) {
    const savedToken = localStorage.getItem('my_fcm_token');
    if (!savedToken) return;

    try {
        await firebase.firestore().collection('users').doc(userId).set({
            fcmToken: savedToken
        }, { merge: true });

        await firebase.firestore().collection('anonymous_tokens').doc(savedToken).delete();
        console.log('ভিজিটর টোকেন সফলভাবে রেজিস্টার্ড আইডিতে স্থানান্তরিত হয়েছে।');
    } catch (error) {
        console.error('টোকেন মাইগ্রেশন এরর:', error);
    }
}

// অথেনটিকেশন স্টেট মনিটর করা
firebase.auth().onAuthStateChanged(user => {
    if (user) {
        migrateVisitorTokenToUser(user.uid);
        // লগইন করা থাকলে ডামী ব্যাজ রিমুভ করে ফায়ারস্টোরের অরিজিনাল কাউন্ট চালু করতে পারো
        const notificationBadge = document.getElementById('notification-badge');
        if (notificationBadge) notificationBadge.style.display = "none";
    }
});

// 🎉 ৮. তাৎক্ষণিক স্বাগত ফোরগ্রাউন্ড নোটিফিকেশন জেনারেটর
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

// 🚀 ৯. এক্সটার্নাল ট্রিগার ফাংশন (সার্চ পেজ ও হার্ট বাটনে ব্যবহারের জন্য)
// অন্য জেএস ফাইল থেকে কল করতে পারবে: window.triggerFCM("alert") অথবা window.triggerFCM("save")
window.triggerFCM = function(type) {
    if (!localStorage.getItem('fcm_popup_dismissed') || new Date().getTime() > localStorage.getItem('fcm_popup_dismissed')) {
        triggerCustomPopup(type);
    }
  }
