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
            window.location.href = 'auth.html';
        } catch (error) {
            console.error("লগআউট ব্যর্থ হয়েছে:", error);
            alert("লগআউট ব্যর্থ হয়েছে।");
        }
    };
    
    auth.onAuthStateChanged(user => {
        if (user) {
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                loginLinkSidebar.onclick = constLogout;
            }
            loadChatList(user.uid);
        } else {
            alert("ইনবক্স দেখার জন্য আপনাকে অবশ্যই লগইন করতে হবে।");
            window.location.href = 'auth.html';
        }
    });

    // --- ২. চ্যাট লিস্ট লোড করা ---
    function loadChatList(userId) {
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
                
                const receiverId = chat.participants.find(id => id !== userId);
                const chatName = chat.propertyTitle || `User: ${receiverId.substring(0, 8)}...`;
                const lastMessage = chat.lastMessage || "কোনো মেসেজ নেই";
                const imageUrl = chat.propertyImage || "https://via.placeholder.com/50";

                const chatItem = document.createElement('div');
                chatItem.className = `chat-item ${chatId === currentChatId ? 'active' : ''}`;
                chatItem.dataset.chatId = chatId;
                chatItem.dataset.receiverId = receiverId;
                
                chatItem.innerHTML = `
                    <img src="${imageUrl}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">
                    <div class="chat-info" style="margin-left: 12px;">
                        <h4 style="margin: 0; font-size: 1em; font-weight: bold;">${chatName}</h4>
                        <p style="margin: 0; color: #6c757d; font-size: 0.85em;">${lastMessage.substring(0, 30)}...</p>
                    </div>
                `;
                
                chatItem.addEventListener('click', () => selectChat(chatId, chatName, receiverId));
                chatListPanel.appendChild(chatItem);
            });
            
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

        if (unsubscribeMessages) {
            unsubscribeMessages();
        }

        currentChatId = chatId;
        currentReceiverId = receiverId;
        chatHeader.textContent = chatName;
        messageInput.disabled = false;
        sendButton.disabled = false;
        
        document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
        const activeItem = document.querySelector(`.chat-item[data-chat-id="${chatId}"]`);
        if(activeItem) activeItem.classList.add('active');

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
        const userId = auth.currentUser ? auth.currentUser.uid : null;

        if (text === '' || !currentChatId || !userId || !currentReceiverId) {
            return;
        }

        const messageData = {
            senderId: userId,
            receiverId: currentReceiverId,
            text: text,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        };

        db.collection("chats").doc(currentChatId).collection("messages").add(messageData)
            .then(() => {
                return db.collection("chats").doc(currentChatId).update({
                    lastMessage: text,
                    lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                });
            })
            .then(() => {
                messageInput.value = '';
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
    
    window.addEventListener('beforeunload', () => {
        if (unsubscribeMessages) {
            unsubscribeMessages();
        }
    });
});
