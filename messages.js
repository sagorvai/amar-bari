// =======================================================
// 🎯 আমার বাড়ি.কম - আলটিমেট রিয়েল-টাইম চ্যাট ইঞ্জিন (ডাইরেক্ট চ্যাট মোড সহ)
// =======================================================

const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};

// ফায়ারবেস ইনিশিয়ালাইজেশন
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ইউআরএল থেকে প্যারামিটার নেওয়া
const urlParams = new URLSearchParams(window.location.search);
let currentChatId = urlParams.get('chatId');
let currentPostId = urlParams.get('postId');
let currentAction = urlParams.get('action'); // 🎯 ডিটেইলস পেজ থেকে ডাইরেক্ট মোড ট্র্যাকিং

let currentUser = null;
let activeChatListener = null;

// ১. ইউজার লগইন স্টেট পর্যবেক্ষণ
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        console.log("লগইন করা ইউজার UID:", currentUser.uid);
        initChatSystem();
    } else {
        alert("মেসেজ দেখতে প্রথমে লগইন করুন।");
        window.location.href = "auth.html";
    }
});

// চ্যাট সিস্টেম স্টার্ট
function initChatSystem() {
    loadChatList();

    // যদি details.html থেকে সরাসরি চ্যাট আইডি পাঠানো হয়ে থাকে
    if (currentChatId) {
        // 🎯 ডাইরেক্ট মোড বা মোবাইল স্ক্রিনের জন্য লেআউট ম্যানেজমেন্ট
        if (currentAction === 'direct' || window.innerWidth <= 768) {
            const sidebar = document.getElementById('chatSidebar');
            const mainBox = document.getElementById('chatMainBox');
            if (sidebar) sidebar.classList.add('hidden');
            if (mainBox) mainBox.classList.add('active');
        }
        openChatBox(currentChatId, currentPostId);
    }
}

// ২. বামপাশের চ্যাট লিস্ট লোড করা
function loadChatList() {
    const chatListContainer = document.getElementById('chatListContainer');
    if (!chatListContainer) return;

    db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot((snapshot) => {
            
            if (snapshot.empty) {
                chatListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--gray);">কোনো মেসেজ পাওয়া যায়নি।</div>`;
                return;
            }

            chatListContainer.innerHTML = "";
            
            snapshot.forEach((doc) => {
                const chatData = doc.data();
                const chatId = doc.id;
                
                // নিজের আইডি বাদে অপর পক্ষের ইউজার আইডি বের করা
                const otherUserId = chatData.participants ? chatData.participants.find(id => id !== currentUser.uid) : null;
                
                const chatItemDiv = document.createElement('div');
                chatItemDiv.className = `chat-item ${chatId === currentChatId ? 'active' : ''}`;
                chatItemDiv.id = `item_${chatId}`;
                
                chatItemDiv.innerHTML = `
                    <img src="https://via.placeholder.com/45/007bff/ffffff?text=U" id="avatar_${chatId}">
                    <div class="chat-item-info">
                        <h4 id="name_${chatId}">ব্যবহারকারী...</h4>
                        <p id="msg_preview_${chatId}">${chatData.lastMessage || "নতুন চ্যাট শুরু হয়েছে..."}</p>
                    </div>
                `;
                
                chatListContainer.appendChild(chatItemDiv);

                // আইটেমে ক্লিক করলে চ্যাট বক্স ওপেন হবে
                chatItemDiv.onclick = () => {
                    const sidebar = document.getElementById('chatSidebar');
                    const mainBox = document.getElementById('chatMainBox');
                    if (sidebar) sidebar.classList.add('hidden');
                    if (mainBox) mainBox.classList.add('active');
                    
                    openChatBox(chatId, chatData.postId);
                };

                // অপর পক্ষের প্রোফাইল ইনফো (নাম ও ছবি) ফায়ারস্টোর থেকে আনা
                if (otherUserId) {
                    db.collection('users').doc(otherUserId).get().then(uDoc => {
                        if (uDoc.exists) {
                            const uData = uDoc.data();
                            const targetName = document.getElementById(`name_${chatId}`);
                            const targetAvatar = document.getElementById(`avatar_${chatId}`);
                            
                            if (targetName) targetName.textContent = uData.fullName || uData.name || "সম্মানিত ইউজার";
                            if (uData.profilePic && targetAvatar) {
                                targetAvatar.src = uData.profilePic;
                            }
                        }
                    }).catch(err => console.error("ইউজার ডাটা লোড এরর:", err));
                }
            });
        }, (error) => {
            console.error("চ্যাট লিস্ট স্ন্যাপশট এরর:", error);
            chatListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:red;">চ্যাট লিস্ট লোড করতে সমস্যা হচ্ছে।</div>`;
        });
}

// ৩. ডানপাশের নির্দিষ্ট চ্যাট বক্স ওপেন করা
async function openChatBox(chatId, postId) {
    currentChatId = chatId;
    
    const emptyState = document.getElementById('emptyState');
    const activeChatContent = document.getElementById('activeChatContent');
    
    if (emptyState) emptyState.style.display = 'none';
    if (activeChatContent) activeChatContent.style.display = 'flex';
    
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    const currentItem = document.getElementById(`item_${chatId}`);
    if (currentItem) currentItem.classList.add('active');

    // ডাটাবেজে চ্যাট ডকুমেন্টটি না থাকলে তা তৈরি করা (সেফগার্ড)
    const chatRef = db.collection('chats').doc(chatId);
    try {
        const chatDoc = await chatRef.get();
        if (!chatDoc.exists) {
            const parts = chatId.split('_');
            const userA = parts[0];
            const userB = parts[1];
            
            await chatRef.set({
                participants: [userA, userB],
                postId: postId || currentPostId || "",
                lastMessage: "",
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    } catch (e) {
        console.error("চ্যাট ইনিশিয়ালিং এরর:", e);
    }

    // প্রপার্টির মিনিカード লোড করা
    loadPropertyContext(postId || currentPostId);

    // আগের কোনো লিসেনার সচল থাকলে তা রিমুভ করা
    if (activeChatListener) activeChatListener();

    // রিয়েল-টাইম মেসেজ লোড ও রেন্ডারিং
    const messagesDisplay = document.getElementById('messagesDisplay');
    activeChatListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            if (!messagesDisplay) return;
            messagesDisplay.innerHTML = "";
            
            snapshot.forEach(doc => {
                const msg = doc.data();
                const bubble = document.createElement('div');
                const isIncoming = msg.senderId !== currentUser.uid;
                
                bubble.className = `msg-bubble ${isIncoming ? 'incoming' : 'outgoing'}`;
                
                let timeString = "এইমাত্র";
                if (msg.timestamp) {
                    const date = msg.timestamp.toDate();
                    timeString = date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
                }

                bubble.innerHTML = `${msg.text} <span class="msg-time">${timeString}</span>`;
                messagesDisplay.appendChild(bubble);
            });
            // অটোমেটিক স্ক্রল ডাউন
            messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
        }, (err) => console.error("মেসেজ লোড এরর:", err));

    // চ্যাট হেডারে অপরপক্ষের নাম সেট করা
    const parts = chatId.split('_');
    const otherUserId = parts.find(id => id !== currentUser.uid && id !== postId && id !== currentPostId);
    if (otherUserId) {
        db.collection('users').doc(otherUserId).get().then(uDoc => {
            const headerName = document.getElementById('activeChatUserName');
            if (uDoc.exists && headerName) {
                headerName.textContent = uDoc.data().fullName || uDoc.data().name || "ব্যবহারকারী";
            }
        }).catch(err => console.error(err));
    }
}

// ৪. মেসেজ পাঠানো লজিক
async function sendMessage(text) {
    if (!text.trim() || !currentChatId) return;

    const cleanText = text.trim();
    const messageData = {
        senderId: currentUser.uid,
        text: cleanText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('chats').doc(currentChatId).collection('messages').add(messageData);
        await db.collection('chats').doc(currentChatId).update({
            lastMessage: cleanText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("মেসেজ সেন্ডিং এরর:", error);
    }
}

// ৫. মেসেজের ভেতরে প্রপার্টি মিনি কার্ড লোড করা
function loadPropertyContext(postId) {
    const card = document.getElementById('activePropertyCard');
    if (!card) return;
    if (!postId) {
        card.style.display = 'none';
        return;
    }
    card.style.display = 'flex';
    card.href = `details.html?id=${postId}`;

    db.collection('properties').doc(postId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('activePropertyTitle').textContent = data.title || "প্রপার্টি";
            let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
            document.getElementById('activePropertyPrice').textContent = amount ? `৳ ${amount}` : "আলোচনা সাপেক্ষ";
            
            if (data.images && data.images.length > 0) {
                document.getElementById('activePropertyImg').src = data.images[0].url || data.images[0];
            }
        } else {
            card.style.display = 'none';
        }
    }).catch(() => card.style.display = 'none');
}

// DOM ইভেন্ট লিসেনার
document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendMessageBtn');
    const inputField = document.getElementById('messageInputField');

    if (sendBtn && inputField) {
        sendBtn.onclick = () => {
            sendMessage(inputField.value);
            inputField.value = "";
        };

        inputField.onkeypress = (e) => {
            if (e.key === 'Enter') {
                sendMessage(inputField.value);
                inputField.value = "";
            }
        };
    }
});

// কুইক রিপ্লাই ফাংশন
function sendQuickReply(text) {
    sendMessage(text);
}

// 🎯 ডাইরেক্ট চ্যাট মোড এবং মোবাইল রেসপনসিভ ব্যাক বাটন ফিক্স
const backBtn = document.getElementById('backToListBtn');
if (backBtn) {
    backBtn.onclick = () => {
        // চ্যাট বক্স হাইড করে মূল চ্যাট লিস্ট ওপেন করা
        document.getElementById('chatMainBox').classList.remove('active');
        document.getElementById('chatSidebar').classList.remove('hidden');
        
        // ইউআরএল থেকে ডাইরেক্ট প্যারামিটার রিসেট করে দেওয়া যাতে পুনরায় পেজ লোড হলে পুরো লিস্ট দেখায়
        if (currentAction === 'direct') {
            window.history.pushState({}, document.title, "messages.html");
            currentAction = null;
        }
    };
}
