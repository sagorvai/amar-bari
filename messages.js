// Firebase configuration (তোমার সাইটের কনফিগারেশন অনুযায়ী)
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

// ইউআরএল থেকে প্যারামিটার নেওয়া
const urlParams = new URLSearchParams(window.location.search);
let currentChatId = urlParams.get('chatId');
let currentPostId = urlParams.get('postId');

let currentUser = null;
let activeChatListener = null;

// ইউজার সাইন-ইন চেক
firebase.auth().onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        initChatSystem();
    } else {
        alert("মেসেজ দেখতে প্রথমে লগইন করুন।");
        window.location.href = "auth.html";
    }
});

// মূল চ্যাট সিস্টেম ইনিশিয়ালাইজেশন
function initChatSystem() {
    loadChatList();

    if (currentChatId) {
        // যদি ডিরেক্টলি details.html থেকে chatId সহ আসে
        openChatBox(currentChatId, currentPostId);
    }
}

// ১. চ্যাট লিস্ট লোড করা (বামপাশে)
function loadChatList() {
    const chatListContainer = document.getElementById('chatListContainer');
    
    // কারেন্ট ইউজার যে চ্যাটগুলোর অংশীদার (participants array) সেগুলোকে কুয়েরি করা
    db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot((snapshot) => {
            if (snapshot.empty) {
                chatListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--gray);">কোনো মেসেজ পাওয়া যায়নি।</div>`;
                return;
            }

            chatListContainer.innerHTML = "";
            snapshot.forEach(async (doc) => {
                const chatData = doc.data();
                const chatId = doc.id;
                
                // অপর পক্ষের ইউজার আইডি বের করা
                const otherUserId = chatData.participants.find(id => id !== currentUser.uid);
                
                // চ্যাট আইটেমের জন্য এইচটিএমএল কন্টেইনার তৈরি
                const chatItemDiv = document.createElement('div');
                chatItemDiv.className = `chat-item ${chatId === currentChatId ? 'active' : ''}`;
                chatItemDiv.id = `item_${chatId}`;
                
                // ডিফল্ট প্লেসহোল্ডার ডেটা
                chatItemDiv.innerHTML = `
                    <img src="https://via.placeholder.com/45/007bff/ffffff?text=U" id="avatar_${chatId}">
                    <div class="chat-item-info">
                        <h4 id="name_${chatId}">লোড হচ্ছে...</h4>
                        <p>${chatData.lastMessage || "নতুন চ্যাট শুরু হয়েছে..."}</p>
                    </div>
                `;
                
                chatListContainer.appendChild(chatItemDiv);

                // ক্লিক করলে চ্যাট ওপেন হবে
                chatItemDiv.onclick = () => {
                    // মোবাইল ভিউয়ের জন্য ক্লাসের টগল
                    if (window.innerWidth <= 768) {
                        document.getElementById('chatSidebar').classList.add('hidden');
                        document.getElementById('chatMainBox').classList.add('active');
                    }
                    openChatBox(chatId, chatData.postId);
                };

                // অপর পক্ষের ইউজারের নাম ও প্রোফাইল ছবি লোড করা
                if (otherUserId) {
                    db.collection('users').doc(otherUserId).get().then(uDoc => {
                        if (uDoc.exists) {
                            document.getElementById(`name_${chatId}`).textContent = uDoc.data().fullName || uDoc.data().name || "ব্যবহারকারী";
                            if (uDoc.data().profilePic) {
                                document.getElementById(`avatar_${chatId}`).src = uDoc.data().profilePic;
                            }
                        }
                    });
                }
            });
        });
}

// ২. নির্দিষ্ট চ্যাট বক্স ওপেন করা
async function openChatBox(chatId, postId) {
    currentChatId = chatId;
    
    // ইউআই আপডেট
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('activeChatContent').style.display = 'flex';
    
    // একটিভ ক্লাস টগল করা
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    const currentItem = document.getElementById(`item_${chatId}`);
    if (currentItem) currentItem.classList.add('active');

    // চ্যাটটির মূল ডকুমেন্ট যদি ফায়ারবেসে না থাকে (প্রথম মেসেজ পাঠাতে এলে), তা তৈরি করা
    const chatRef = db.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();
    if (!chatDoc.exists) {
        // chatId থেকে userIdদ্বয় বের করা
        const parts = chatId.split('_');
        await chatRef.set({
            participants: [parts[0], parts[1]],
            postId: postId || "",
            lastMessage: "",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // প্রপার্টি মিনি-কার্ডের তথ্য আপডেট করা
    loadPropertyContext(postId);

    // পূর্বের কোনো লিসেনার থাকলে তা রিমুভ করা
    if (activeChatListener) activeChatListener();

    // মেসেজ রিয়েল-টাইমে রেন্ডার করা
    const messagesDisplay = document.getElementById('messagesDisplay');
    activeChatListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
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
            // স্ক্রল অটোমেটিকভাবে নিচে নামানো
            messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
        });

    // চ্যাট বক্সের হেডারে ইউজারের নাম বসানো
    const otherUserId = chatId.split('_').find(id => id !== currentUser.uid && id !== postId);
    if (otherUserId) {
        db.collection('users').doc(otherUserId).get().then(uDoc => {
            if (uDoc.exists) {
                document.getElementById('activeChatUserName').textContent = uDoc.data().fullName || uDoc.data().name || "ব্যবহারকারী";
            }
        });
    }
}

// ৩. চ্যাটের ভেতরের প্রপার্টি মিনি কার্ড লোড করা
function loadPropertyContext(postId) {
    const card = document.getElementById('activePropertyCard');
    if (!postId) {
        card.style.display = 'none';
        return;
    }
    card.style.display = 'flex';
    card.href = `details.html?id=${postId}`[cite: 11];

    db.collection('properties').doc(postId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('activePropertyTitle').textContent = data.title || "প্রপার্টি";
            let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;[cite: 11]
            document.getElementById('activePropertyPrice').textContent = amount ? `৳ ${amount}` : "আলোচনা সাপেক্ষ";
            
            if (data.images && data.images.length > 0) {
                document.getElementById('activePropertyImg').src = data.images[0].url || data.images[0];[cite: 11]
            }
        } else {
            card.style.display = 'none';
        }
    }).catch(() => card.style.display = 'none');
}

// ৪. মেসেজ পাঠানো লজিক
async function sendMessage(text) {
    if (!text.trim() || !currentChatId) return;

    const messageData = {
        senderId: currentUser.uid,
        text: text.trim(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    // সাব-কালেকশনে মেসেজ যোগ করা
    await db.collection('chats').doc(currentChatId).collection('messages').add(messageData);

    // মেইন ডকুমেন্টে লাস্ট মেসেজ আপডেট করা
    await db.collection('chats').doc(currentChatId).update({
        lastMessage: text.trim(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}

// বাটন ক্লিক বা এন্টার প্রেস ইভেন্ট হ্যান্ডলার
document.getElementById('sendMessageBtn').onclick = () => {
    const input = document.getElementById('messageInputField');
    sendMessage(input.value);
    input.value = "";
};

document.getElementById('messageInputField').onkeypress = (e) => {
    if (e.key === 'Enter') {
        const input = document.getElementById('messageInputField');
        sendMessage(input.value);
        input.value = "";
    }
};

// কুইক রিপ্লাই ফাংশন
function sendQuickReply(text) {
    sendMessage(text);
}

// মোবাইল ব্যাক বাটন অ্যাকশন (লিস্টে ফিরে যাওয়া)
document.getElementById('backToListBtn').onclick = () => {
    document.getElementById('chatMainBox').classList.remove('active');
    document.getElementById('chatSidebar').classList.remove('hidden');
};
