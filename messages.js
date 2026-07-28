// ==========================================
// 1. Firebase Initialization & Global States
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let currentUser = null;
let activeChatId = null;
let activePostId = null;
let activeIdentityType = 'user'; // 'user' অথবা 'company'
let activeCompanyId = null;
let currentTargetId = null;      // যার সাথে কথা হচ্ছে তার ID (User or Company)
let messagesListener = null;
let chatsListener = null;

// URL Params থেকে chatId ও postId নেওয়া
const urlParams = new URLSearchParams(window.location.search);
activeChatId = urlParams.get('chatId');
activePostId = urlParams.get('postId');

// ==========================================
// 2. Auth State & Initial Setup
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // header-sync বা localStorage থেকে বর্তমান মোড নেওয়া
    activeIdentityType = localStorage.getItem('activeIdentityType') || 'user';
    activeCompanyId = localStorage.getItem('activeCompanyId') || null;

    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            alert("মেসেজ দেখতে প্রথমে লগইন করুন।");
            window.location.href = "auth.html";
            return;
        }
        currentUser = user;

        // চ্যাট লিস্ট লোড
        loadChatList();

        // যদি URL-এ সরাসরি chatId থাকে তবে চ্যাট রুম ওপেন করা
        if (activeChatId) {
            openChatRoom(activeChatId);
        }
    });

    // মেসেজ সেন্ড ফর্ম সাবমিট
    const msgForm = document.getElementById('chatForm') || document.getElementById('messageForm');
    if (msgForm) {
        msgForm.addEventListener('submit', handleSendMessage);
    }
});

// ==========================================
// 3. Load Chat List (Active Mode Filtering)
// ==========================================
function loadChatList() {
    const chatListContainer = document.getElementById('chatList');
    if (!chatListContainer) return;

    if (chatsListener) chatsListener(); // আগের রিয়েলটাইম লিসেনার অফ করা

    // সক্রিয় আইডি ফিল্টারিং লজিক:
    // ১. ইউজার মোডে থাকলে -> currentuser.uid সার্চ করবে
    // ২. পেজ মোডে থাকলে -> activeCompanyId সার্চ করবে
    let mySearchId = (activeIdentityType === 'company' && activeCompanyId) 
                     ? activeCompanyId 
                     : currentUser.uid;

    chatsListener = db.collection('chats')
        .where('participants', 'array-contains', mySearchId)
        .orderBy('timestamp', 'desc')
        .onSnapshot(async (snapshot) => {
            chatListContainer.innerHTML = '';

            if (snapshot.empty) {
                chatListContainer.innerHTML = `
                    <div style="text-align:center; padding: 20px; color: #7f8c8d;">
                        <i class="material-icons" style="font-size: 48px;">chat_bubble_outline</i>
                        <p>কোনো বার্তা পাওয়া যায়নি (${activeIdentityType === 'company' ? 'পেজ মোড' : 'ইউজার মোড'})</p>
                    </div>`;
                return;
            }

            for (let doc of snapshot.docs) {
                const chatData = doc.data();
                
                // চ্যাট ফিল্টারিং: বর্তমান মোড অনুযায়ী মেসেজ দেখানো
                // পেজ মোডে থাকলে শুধু সেই পেজের চ্যাট, ইউজার মোডে থাকলে ইউজারের চ্যাট
                if (activeIdentityType === 'company') {
                    if (chatData.receiverId !== activeCompanyId && chatData.senderId !== activeCompanyId) {
                        continue; // পেজ সম্পর্কিত না হলে স্কিপ
                    }
                } else {
                    // ইউজার মোডে থাকলে কোম্পানি বনাম কোম্পানি বা অন্য পেজের চ্যাট স্কিপ
                    if (chatData.senderType === 'company' && chatData.senderId !== currentUser.uid &&
                        chatData.receiverType === 'company' && chatData.receiverId !== currentUser.uid) {
                        continue;
                    }
                }

                // প্রতিপক্ষের ID নির্ণয়
                let opponentId = (chatData.senderId === mySearchId) ? chatData.receiverId : chatData.senderId;
                let opponentType = (chatData.senderId === mySearchId) ? chatData.receiverType : chatData.senderType;

                // প্রোফাইল ও নাম লোড
                let opponentName = "ব্যবহারকারী";
                let opponentAvatar = "https://i.postimg.cc/YSbRvftN/FB-IMG-1781692297303.jpg";

                try {
                    if (opponentType === 'company') {
                        const compDoc = await db.collection('companies').doc(opponentId).get();
                        if (compDoc.exists) {
                            const cData = compDoc.data();
                            opponentName = cData.companyName || cData.name || "কোম্পানি পেজ";
                            opponentAvatar = cData.logo || cData.companyLogo || opponentAvatar;
                        }
                    } else {
                        const userDoc = await db.collection('users').doc(opponentId).get();
                        if (userDoc.exists) {
                            const uData = userDoc.data();
                            opponentName = uData.fullName || uData.name || "ইউজার";
                            opponentAvatar = uData.profilePic || opponentAvatar;
                        }
                    }
                } catch (e) {
                    console.error("প্রোফাইল লোড এরর:", e);
                }

                // চ্যাট আইটেম HTML তৈরি
                const isActive = (doc.id === activeChatId) ? 'active-chat' : '';
                const chatCard = document.createElement('div');
                chatCard.className = `chat-item ${isActive}`;
                chatCard.onclick = () => openChatRoom(doc.id, opponentName, opponentAvatar, opponentId);

                chatCard.innerHTML = `
                    <img src="${opponentAvatar}" alt="Avatar" class="chat-avatar">
                    <div class="chat-details">
                        <div class="chat-header-info">
                            <h4 class="chat-name">${opponentName} ${opponentType === 'company' ? '<span class="badge-page">পেজ</span>' : ''}</h4>
                            <span class="chat-time">${formatTime(chatData.timestamp)}</span>
                        </div>
                        <p class="chat-post-title"><i class="material-icons" style="font-size:12px;">home</i> ${chatData.postTitle || 'প্রপার্টি অনুসন্ধান'}</p>
                        <p class="chat-last-msg">${chatData.lastMessage || '...'}</p>
                    </div>
                `;
                chatListContainer.appendChild(chatCard);
            }
        }, (error) => {
            console.error("চ্যাট লিস্ট ফিল্টার এরর:", error);
        });
}

// ==========================================
// 4. Open Specific Chat Room & Load Messages
// ==========================================
async function openChatRoom(chatId, opponentName = null, opponentAvatar = null, opponentId = null) {
    activeChatId = chatId;
    
    // UI টগল (মোবাইল ভিউ-এর জন্য চ্যাট রুম প্যানেল দেখানো)
    const mainChatArea = document.getElementById('chatRoomArea');
    if (mainChatArea) mainChatArea.classList.add('active-room');

    // হেডার ও প্রতিপক্ষের ডিটেইলস আপডেট
    if (opponentName) {
        document.getElementById('chatHeaderName').textContent = opponentName;
    }
    if (opponentAvatar) {
        document.getElementById('chatHeaderAvatar').src = opponentAvatar;
    }

    // চ্যাট ডকুমেন্টের ডাটা ফেচ (যদি হ্যান্ডলার থেকে আইডি না আসে)
    try {
        const chatDoc = await db.collection('chats').doc(chatId).get();
        if (chatDoc.exists) {
            const cData = chatDoc.data();
            activePostId = cData.postId;

            // বর্তমান আইডি অনুযায়ী Target/Opponent Id বের করা
            let mySearchId = (activeIdentityType === 'company' && activeCompanyId) ? activeCompanyId : currentUser.uid;
            currentTargetId = (cData.senderId === mySearchId) ? cData.receiverId : cData.senderId;

            // প্রোডাক্ট / পোস্ট ইনফো হেডার আপডেট
            if (cData.postTitle) {
                const postInfo = document.getElementById('chatPostTitle');
                if (postInfo) postInfo.textContent = cData.postTitle;
            }
        }
    } catch (e) {
        console.error("চ্যাট ডিটেইলস রিড এরর:", e);
    }

    // চ্যাট মেসেজ লিসেনার চালু করা
    loadMessages(chatId);
}

// ==========================================
// 5. Load Realtime Messages
// ==========================================
function loadMessages(chatId) {
    const messagesBox = document.getElementById('messagesBox');
    if (!messagesBox) return;

    if (messagesListener) messagesListener(); // পুরনো সাবস্ক্রিপশন বাতিল

    messagesListener = db.collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            messagesBox.innerHTML = '';

            let mySearchId = (activeIdentityType === 'company' && activeCompanyId) ? activeCompanyId : currentUser.uid;

            snapshot.forEach((doc) => {
                const msg = doc.data();
                const isOutgoing = (msg.senderId === mySearchId || msg.senderUid === currentUser.uid);

                const msgBubble = document.createElement('div');
                msgBubble.className = `message-bubble ${isOutgoing ? 'outgoing' : 'incoming'}`;
                
                msgBubble.innerHTML = `
                    <div class="message-content">
                        ${msg.text ? `<p>${escapeHtml(msg.text)}</p>` : ''}
                        ${msg.imageUrl ? `<img src="${msg.imageUrl}" class="msg-img" onclick="window.open('${msg.imageUrl}')">` : ''}
                        <span class="msg-time">${formatTime(msg.timestamp)}</span>
                    </div>
                `;
                messagesBox.appendChild(msgBubble);
            });

            // স্ক্রোল একদম নিচে নামানো
            messagesBox.scrollTop = messagesBox.scrollHeight;
        });
}

// ==========================================
// 6. Handle Send Message
// ==========================================
async function handleSendMessage(e) {
    e.preventDefault();
    if (!activeChatId) {
        alert("কোনো চ্যাট নির্বাচন করা হয়নি।");
        return;
    }

    const inputField = document.getElementById('messageInput');
    const messageText = inputField ? inputField.value.trim() : '';

    if (!messageText) return;

    // ১. সেন্ডার Identity তৈরি
    let senderId = currentUser.uid;
    let senderType = activeIdentityType; // 'user' or 'company'

    if (activeIdentityType === 'company' && activeCompanyId) {
        senderId = activeCompanyId;
    }

    try {
        const msgRef = db.collection('chats').doc(activeChatId).collection('messages');
        
        // ২. সাব-কালেকশনে মেসেজ যোগ করা
        await msgRef.add({
            text: messageText,
            senderId: senderId,               // Company ID অথবা User UID
            senderUid: currentUser.uid,        // আসল প্রেরক ফায়ারবেস ইউজার
            senderType: senderType,           // 'user' or 'company'
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // ৩. প্রধান চ্যাট ডকুমেন্টের lastMessage আপডেট
        await db.collection('chats').doc(activeChatId).update({
            lastMessage: messageText,
            lastSenderId: senderId,
            isUnread: true,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // ইনপুট ফিল্ড ক্লিয়ার
        if (inputField) inputField.value = '';

    } catch (error) {
        console.error("মেসেজ সেন্ড করতে সমস্যা:", error);
        alert("মেসেজ পাঠানো যায়নি, আবার চেষ্টা করুন।");
    }
}

// ==========================================
// 7. Utility Functions
// ==========================================
function formatTime(timestamp) {
    if (!timestamp) return 'এইমাত্র';
    let date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// মোবাইল ভিউ-এ চ্যাট লিস্টে ফেরত আসার ফাংশন
function closeChatRoom() {
    const mainChatArea = document.getElementById('chatRoomArea');
    if (mainChatArea) mainChatArea.classList.remove('active-room');
                                      }
