const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};
let currentPropertyData = null;
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    const menuButton = document.getElementById('menuButton');
    const closeMenu = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const messageButton = document.getElementById('messageButton');
    if (messageButton) {
        messageButton.addEventListener('click', () => {
            const currentUser = firebase.auth().currentUser;
            
            if (!currentUser) {
                alert("চ্যাট শুরু করতে লগইন করুন।");
                window.location.href = 'auth.html';
                return;
            }

            // এখন currentPropertyData থেকে আইডি নিচ্ছি
            if (currentPropertyData && postId) {
                // messages.js এ থাকা ফাংশনটি কল করছি
                // এখানে data.userId হলো আপনার প্রপার্টির মালিকের আইডি
                window.startChat(postId, currentPropertyData.userId, currentPropertyData.title);
            } else {
                alert("প্রপার্টির তথ্য লোড হয়নি, কিছুক্ষণ অপেক্ষা করুন।");
            }
        });
    }
    // মেনু খোলা
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    // মেনু বন্ধ করা
    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    if (closeMenu) closeMenu.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // হেডার বাটনগুলোর লিঙ্ক
    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    
    // মেসেজ বাটনের লজিক আপডেট করা হলো
    const messageButton = document.getElementById('messageButton');
    if (messageButton) {
        messageButton.addEventListener('click', async () => {
            const currentUserId = firebase.auth().currentUser ? firebase.auth().currentUser.uid : null;

            if (!currentUserId) {
                alert("চ্যাট শুরু করতে অনুগ্রহ করে লগইন করুন।");
                window.location.href = 'auth.html';
                return;
            }

            if (postId) {
                try {
                    const doc = await db.collection('properties').doc(postId).get();
                    if (doc.exists) {
                        const data = doc.data();
                        const ownerId = data.userId; // মালিকের আইডি
                        const propertyTitle = data.title;

                        if (currentUserId === ownerId) {
                            alert("এটি আপনার নিজের প্রপার্টি, তাই এখানে চ্যাট অপশন নেই।");
                            return;
                        }

                        // ইউনিক চ্যাট আইডি তৈরি
                        const sortedIds = [currentUserId, ownerId].sort();
                        const chatIdentifier = `${sortedIds[0]}_${sortedIds[1]}_${postId}`;

                        const chatRef = db.collection("chats").doc(chatIdentifier);
                        const chatDoc = await chatRef.get();

                        if (!chatDoc.exists) {
                            await chatRef.set({
                                propertyId: postId,
                                propertyTitle: propertyTitle,
                                participants: [currentUserId, ownerId],
                                lastMessage: 'নতুন কথোপকথন শুরু হলো',
                                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
                            });
                        }

                        window.location.href = `messages.html?chatId=${chatIdentifier}`;
                    }
                } catch (e) {
                    console.error("চ্যাট লোড করতে সমস্যা:", e);
                }
            }
        });
    }
    
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');

    if (!postId) return;
    try {
        const doc = await db.collection('properties').doc(postId).get();
        if (doc.exists) {
            const data = doc.data();
            renderDetails(data);
            loadRelatedPosts(data);
        }
    } catch (e) { console.error(e); }
});

function renderDetails(data) {
    // আপনার বিদ্যমান প্রপার্টি ডাটা রেন্ডারিং লজিক
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";
    currentPropertyData = data;
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";
    // ... আপনার বাকি কোড এখানে থাকবে ...

    // ১. দাম ও ইউনিট
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    // (বাকি রেন্ডার কোডগুলো এখানে রাখুন...)
                }
