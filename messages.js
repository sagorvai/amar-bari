const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function () {
    const chatListPanel = document.getElementById('chat-list-panel');
    const chatHeader = document.getElementById('chat-header');
    const chatMessagesContainer = document.getElementById('chat-messages');
    
    auth.onAuthStateChanged(user => {
        if (!user) return;
        loadChatList(user.uid);
        
        // URL এ chatId থাকলে সেটি অটো ওপেন হবে
        const urlParams = new URLSearchParams(window.location.search);
        const chatId = urlParams.get("chatId");
        if(chatId) selectChat(chatId);
    });
});

// বাম পাশের চ্যাট লিস্ট লোড করার ফাংশন
function loadChatList(userId) {
    db.collection("chats")
        .where("users", "array-contains", userId)
        .orderBy("createdAt", "desc")
        .onSnapshot(snapshot => {
            const chatListPanel = document.getElementById('chat-list-panel');
            chatListPanel.innerHTML = ''; // লিস্ট ক্লিয়ার করা

            snapshot.forEach(doc => {
                const chat = doc.data();
                const chatId = doc.id;

                const item = document.createElement('div');
                item.className = "chat-item";
                
                // এখানে সরাসরি পোস্টের টাইটেল দেখাচ্ছি
                item.innerHTML = `
                    <div style="font-weight:bold;">${chat.postTitle || "নতুন চ্যাট"}</div>
                    <div style="font-size:12px; color:gray;">${chat.lastMessage || ""}</div>
                `;

                item.onclick = () => {
                    window.history.pushState({}, '', `?chatId=${chatId}`); // URL আপডেট
                    selectChat(chatId);
                };
                
                chatListPanel.appendChild(item);
            });
        });
}

// সিলেক্টেড চ্যাটের মেসেজ লোড করার ফাংশন
let unsubscribe;
function selectChat(chatId) {
    if (unsubscribe) unsubscribe(); // আগের লিসেনার বন্ধ করা

    const chatHeader = document.getElementById('chat-header');
    const chatMessagesContainer = document.getElementById('chat-messages');

    // চ্যাটের টাইটেল আপডেট করা
    db.collection("chats").doc(chatId).get().then(doc => {
        if(doc.exists) chatHeader.textContent = doc.data().postTitle;
    });

    // মেসেজ রেন্ডার করা
    unsubscribe = db.collection("chats").doc(chatId).collection("messages")
        .orderBy("createdAt", "asc")
        .onSnapshot(snapshot => {
            chatMessagesContainer.innerHTML = '';
            snapshot.forEach(doc => {
                const msg = doc.data();
                const isMe = msg.sender === auth.currentUser.uid;
                chatMessagesContainer.innerHTML += `
                    <div class="${isMe ? 'message-sent' : 'message-received'}">
                        ${msg.text}
                    </div>
                `;
            });
            chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
        });
}
