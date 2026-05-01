// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const chatListPanel = document.getElementById('chat-list-panel');
    const chatHeader = document.getElementById('chat-header');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');

    let currentChatId = null;
    let currentReceiverId = null;
    let unsubscribeMessages = null; // To stop listening to previous chat

    // --- ১. ইউজার অথেন্টিকেশন এবং UI আপডেট ---
    
    const handleLogout = async () => {
        try {
            await auth.signOut();
            alert('সফলভাবে লগআউট করা হয়েছে!');
            window.location.href = 'auth.html'; // লগআউটের পরে লগইন পেইজে পাঠানো
        } catch (error) {
            console.error("লগআউট ব্যর্থ হয়েছে:", error);
            alert("লগআউট ব্যর্থ হয়েছে।");
        }
    };
    
    auth.onAuthStateChanged(user => {
        if (user) {
            // লগইন করা থাকলে
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = handleLogout;
            }
            loadChatList(user.uid); // চ্যাট লিস্ট লোড শুরু করো
        } else {
            // লগইন না থাকলে, ইনবক্স দেখানোর দরকার নেই, লগইন পেইজে পাঠিয়ে দাও
            alert("ইনবক্স দেখার জন্য আপনাকে অবশ্যই লগইন করতে হবে।");
            window.location.href = 'auth.html';
        }
    });

    // --- ২. চ্যাট লিস্ট লোড করা ---
    
    // Firestore থেকে ব্যবহারকারীর সমস্ত চ্যাট লোড করে
    function loadChatList(userId) {
        // 'chats' কালেকশন থেকে যেখানে 'participants' অ্যারেতে বর্তমান userId আছে
        db.collection("chats")
          .where("participants", "array-contains", userId)
          .orderBy("lastMessageTime", "desc")
          .onSnapshot(snapshot => {
            chatListPanel.innerHTML = '';
            if (snapshot.empty) {
                chatListPanel.innerHTML = '<p style="text-align: center; color: #6c757d;">আপনার কোনো কথোপকথন নেই।</p>';
                return;
            }

            snapshot.forEach(doc => {
                const chat = doc.data();
                const chatId = doc.id;
                
                // অন্য অংশগ্রহণকারীর ID খুঁজে বের করো
                const receiverId = chat.participants.find(id => id !== userId);
                
                // আমরা এখানে ব্যবহারকারীর প্রোফাইল ডেটা (নাম) লোড করতে পারি। 
                // আপাতত, আমি শুধু ID দেখাচ্ছি, কিন্তু বাস্তবে এটি পরিবর্তন করতে হবে।
                const chatName = chat.propertyTitle || `User: ${receiverId.substring(0, 8)}...`;
                const lastMessage = chat.lastMessage || "কোনো মেসেজ নেই";

                const chatItem = document.createElement('div');
                chatItem.className = `chat-item ${chatId === currentChatId ? 'active' : ''}`;
                chatItem.dataset.chatId = chatId;
                chatItem.dataset.receiverId = receiverId;
                
                chatItem.innerHTML = `
                    <i class="material-icons" style="font-size: 30px; color: #007bff;">person_pin</i>
                    <div class="chat-info">
                        <h4>${chatName}</h4>
                        <p>${lastMessage.substring(0, 30)}...</p>
                    </div>
                `;
                
                chatItem.addEventListener('click', () => selectChat(chatId, chatName, receiverId));
                chatListPanel.appendChild(chatItem);
            });
            
            // প্রথমবার লোডের সময় যদি কোনো কারেন্ট চ্যাট না থাকে তবে প্রথম চ্যাটটি নির্বাচন করো
            if (currentChatId === null && !snapshot.empty) {
                 const firstChatElement = chatListPanel.querySelector('.chat-item');
                 if (firstChatElement) {
                     selectChat(firstChatElement.dataset.chatId, firstChatElement.querySelector('h4').textContent, firstChatElement.dataset.receiverId);
                 }
            }
        });
    }

    // --- ৩. একটি চ্যাট নির্বাচন করা এবং মেসেজ লোড করা ---
    
    function selectChat(chatId, chatName, receiverId) {
        if (currentChatId === chatId) return;

        // আগের চ্যাটের লিসেনার বন্ধ করো
        if (unsubscribeMessages) {
            unsubscribeMessages();
        }

        currentChatId = chatId;
        currentReceiverId = receiverId;
        chatHeader.textContent = chatName;
        messageInput.disabled = false;
        sendButton.disabled = false;
        
        // সমস্ত চ্যাট আইটেম থেকে 'active' ক্লাস সরিয়ে দাও
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
        // বর্তমান চ্যাট আইটেমে 'active' ক্লাস যুক্ত করো
        const activeItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if(activeItem) activeItem.classList.add('active');

        // নতুন চ্যাটের মেসেজ রিয়েল-টাইমে শুনতে শুরু করো
        unsubscribeMessages = db.collection("chats").doc(chatId).collection("messages")
            .orderBy("timestamp", "asc")
            .onSnapshot(snapshot => {
                chatMessagesContainer.innerHTML = '';
                if (snapshot.empty) {
                    chatMessagesContainer.innerHTML = '<p style="text-align: center; color: #6c757d;">এই কথোপকথনে কোনো মেসেজ নেই।</p>';
                    return;
                }

                snapshot.forEach(doc => {
                    const message = doc.data();
                    displayMessage(message, auth.currentUser.uid);
                });
                
                // সবসময় নিচে স্ক্রল করো
                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            });
    }
    
    // --- ৪. মেসেজ ডিসপ্লে করা ---
    
    function displayMessage(message, currentUserId) {
        const bubble = document.createElement('div');
        const isSent = message.senderId === currentUserId;
        
        bubble.className = `message-bubble ${isSent ? 'sent' : 'received'}`;
        
        const timestamp = message.timestamp ? message.timestamp.toDate().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : 'এখনই';
        
        bubble.innerHTML = `
            ${message.text}
            <span class="message-time">${timestamp}</span>
        `;
        
        chatMessagesContainer.appendChild(bubble);
    }
    
    // --- ৫. মেসেজ পাঠানো ---

    function sendMessage() {
        const text = messageInput.value.trim();
        const userId = auth.currentUser.uid;

        if (text === '' || !currentChatId || !userId || !currentReceiverId) {
            return;
        }

        const messageData = {
            senderId: userId,
            receiverId: currentReceiverId,
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 1. 'messages' সাব-কালেকশনে মেসেজ যোগ করো
        db.collection("chats").doc(currentChatId).collection("messages").add(messageData)
            .then(() => {
                // 2. 'chats' মেইন ডকুমেন্টে শেষ মেসেজ ও সময় আপডেট করো
                return db.collection("chats").doc(currentChatId).update({
                    lastMessage: text,
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                    // একটি নতুন মেসেজ এসেছে তা চিহ্নিত করার জন্য
                    // unreadCountForReceiverId: firebase.firestore.FieldValue.increment(1) 
                });
            })
            .then(() => {
                messageInput.value = ''; // ইনপুট খালি করো
            })
            .catch(error => {
                console.error("মেসেজ পাঠাতে ব্যর্থ:", error);
                alert("মেসেজ পাঠানো যায়নি।");
            });
    }

    // ইভেন্ট লিসেনার
    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // উইন্ডো বন্ধ হলে লিসেনার বন্ধ করো
    window.addEventListener('beforeunload', () => {
        if (unsubscribeMessages) {
            unsubscribeMessages();
        }
    });

    
    // --- অতিরিক্ত ফাংশন: চ্যাট শুরু করার জন্য ---
    // এই ফাংশনটি প্রপার্টি ভিউ পেজ (যেমন view.js) থেকে কল করা হবে।
    // ক্রেতা যখন 'মেসেজ করুন' বাটনে ক্লিক করবে, তখন এই লজিকটি নতুন চ্যাট তৈরি করবে বা বিদ্যমান চ্যাটে রিডাইরেক্ট করবে।
    
    window.startChat = async (propertyId, listerId, propertyTitle) => {
        const currentUserId = auth.currentUser ? auth.currentUser.uid : null;
        
        if (!currentUserId || currentUserId === listerId) {
            alert("নিজে নিজের সাথে চ্যাট করতে পারবেন না বা চ্যাট শুরু করতে লগইন করুন।");
            return;
        }

        // চ্যাট আইডি তৈরি: উভয় ইউজার আইডি এবং প্রপার্টি আইডি ব্যবহার করে একটি ইউনিক আইডি তৈরি করা।
        // যাতে দুইজন ব্যবহারকারী একটি নির্দিষ্ট প্রপার্টির জন্য একটিই চ্যাট ব্যবহার করে।
        const sortedIds = [currentUserId, listerId].sort();
        const chatIdentifier = `${sortedIds[0]}_${sortedIds[1]}_${propertyId}`;

        // Firestore থেকে চ্যাট ডকুমেন্ট খুঁজুন
        const chatRef = db.collection("chats").doc(chatIdentifier);
        const chatDoc = await chatRef.get();

        if (!chatDoc.exists) {
            // যদি চ্যাট না থাকে, তবে নতুন চ্যাট তৈরি করুন
            await chatRef.set({
                propertyId: propertyId,
                propertyTitle: propertyTitle,
                participants: [currentUserId, listerId],
                lastMessage: 'নতুন কথোপকথন শুরু হলো',
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        
        // ব্যবহারকারীকে messages.html এ রিডাইরেক্ট করুন
        // আমরা URL প্যারামিটার ব্যবহার করে নির্দিষ্ট চ্যাটটি খুলতে পারি।
        window.location.href = `messages.html?chatId=${chatIdentifier}`;
    };
});
