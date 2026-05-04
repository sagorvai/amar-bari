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
let currentChatId = null;
let unsubscribe = null; // রিয়েল-টাইম মেসেজ লিসেনার স্টোর করার জন্য

document.addEventListener('DOMContentLoaded', () => {
    // ব্যবহারকারী লগইন করা আছে কিনা তা যাচাই
    firebase.auth().onAuthStateChanged(async (user) => {
        if (!user) {
            alert('চ্যাট দেখতে অনুগ্রহ করে লগইন করুন।');
            location.href = 'auth.html';
            return;
        }
        currentUser = user;
        
        // চ্যাট লিস্ট লোড করা শুরু করুন
        await loadChatList();

        // URL-এ chatId থাকলে সেই চ্যাটটি ওপেন করা
        const urlParams = new URLSearchParams(window.location.search);
        const chatIdFromUrl = urlParams.get('chatId');
        if (chatIdFromUrl) {
            openChat(chatIdFromUrl);
        }
    });

    // সেন্ড বাটনের ইভেন্ট লিসেনার
    document.getElementById('send-btn')?.addEventListener('click', sendMessage);
    
    // এন্টার প্রেস করলে মেসেজ পাঠানো
    document.getElementById('message-input')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
});

// ১. চ্যাট লিস্ট লোড করার ফাংশন
async function loadChatList() {
    const userId = currentUser.uid;
    const chatListContainer = document.getElementById('chat-list');
    if (!chatListContainer) return;

    chatListContainer.innerHTML = '<p>চ্যাট লোড হচ্ছে...</p>';

    try {
        // দুটি কোয়েরি করে ডাটা একত্রিত করা হলো (যেহেতু ইউজার বায়ার বা সেলার দুই পক্ষের যেকোনো এক হতে পারে)
        const buyerQuery = await db.collection('chats').where('buyerId', '==', userId).get();
        const sellerQuery = await db.collection('chats').where('sellerId', '==', userId).get();

        const chats = [];
        
        buyerQuery.forEach(doc => chats.push({ id: doc.id, ...doc.data() }));
        sellerQuery.forEach(doc => {
            // ডুপ্লিকেট এড়াতে চেক করা
            if (!chats.some(c => c.id === doc.id)) {
                chats.push({ id: doc.id, ...doc.data() });
            }
        });

        // সর্বশেষ মেসেজের সময় অনুযায়ী সাজানো
        chats.sort((a, b) => {
            const timeA = a.lastMessageTime?.toDate() || new Date(0);
            const timeB = b.lastMessageTime?.toDate() || new Date(0);
            return timeB - timeA;
        });

        chatListContainer.innerHTML = '';

        if (chats.length === 0) {
            chatListContainer.innerHTML = '<p>কোনো চ্যাট লিস্ট পাওয়া যায়নি।</p>';
            return;
        }

        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item';
            chatItem.id = `chat-${chat.id}`;
            chatItem.onclick = () => openChat(chat.id);

            chatItem.innerHTML = `
                <div class="chat-info">
                    <h4 class="chat-title">${chat.postTitle || 'প্রপার্টি চ্যাট'}</h4>
                    <p class="chat-last-msg">${chat.lastMessage || 'চ্যাট শুরু হলো'}</p>
                </div>
            `;
            chatListContainer.appendChild(chatItem);
        });

    } catch (error) {
        console.error('Error loading chats:', error);
        chatListContainer.innerHTML = '<p>চ্যাট লোড করতে সমস্যা হয়েছে।</p>';
    }
}

// ২. নির্দিষ্ট চ্যাট ওপেন ও মেসেজ লোড করার ফাংশন
async function openChat(chatId) {
    currentChatId = chatId;
    
    // সবগুলো চ্যাট আইটেম থেকে active ক্লাস সরিয়ে দিন, এবং বর্তমানটিতে যুক্ত করুন
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    const activeItem = document.getElementById(`chat-${chatId}`);
    if (activeItem) activeItem.classList.add('active');

    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) messagesContainer.innerHTML = '<p>মেসেজ লোড হচ্ছে...</p>';

    // পুরাতন লিসেনার থাকলে তা বন্ধ করা
    if (unsubscribe) unsubscribe();

    try {
        unsubscribe = db.collection('chats')
            .doc(chatId)
            .collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                if (!messagesContainer) return;
                messagesContainer.innerHTML = '';

                if (snapshot.empty) {
                    messagesContainer.innerHTML = '<p>এখানে কোনো মেসেজ নেই। আপনি মেসেজ পাঠানো শুরু করতে পারেন।</p>';
                    return;
                }

                snapshot.forEach(doc => {
                    const msg = doc.data();
                    const isSender = msg.senderId === currentUser.uid;

                    const messageDiv = document.createElement('div');
                    messageDiv.className = `message ${isSender ? 'sent' : 'received'}`;

                    messageDiv.innerHTML = `
                        <p>${msg.text || ''}</p>
                        <span class="timestamp">${formatTimestamp(msg.createdAt)}</span>
                    `;
                    messagesContainer.appendChild(messageDiv);
                });

                // স্ক্রল একদম নিচে নিয়ে যাওয়া
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            });

    } catch (error) {
        console.error('Error opening chat:', error);
    }
}

// ৩. নতুন মেসেজ পাঠানোর ফাংশন
async function sendMessage() {
    const messageInput = document.getElementById('message-input');
    if (!messageInput || !currentChatId) return;

    const text = messageInput.value.trim();
    if (text === '') return;

    try {
        const newMessage = {
            senderId: currentUser.uid,
            text: text,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // মেসেজটি chats -> messages সাবকালেকশনে যোগ করা
        await db.collection('chats')
            .doc(currentChatId)
            .collection('messages')
            .add(newMessage);

        // সর্বশেষ মেসেজটি আপডেট করা
        await db.collection('chats')
            .doc(currentChatId)
            .update({
                lastMessage: text,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
            });

        // ইনপুট বক্স পরিষ্কার করা
        messageInput.value = '';

    } catch (error) {
        console.error('Error sending message:', error);
        alert('মেসেজ পাঠাতে সমস্যা হয়েছে।');
    }
}

// ৪. টাইম ফরম্যাট করার ফাংশন
function formatTimestamp(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
                                       }
