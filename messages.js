// Firebase
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function () {

    const chatListPanel = document.getElementById('chat-list-panel');
    const chatHeader = document.getElementById('chat-header');
    const chatMessagesContainer = document.getElementById('chat-messages');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');

    let currentChatId = null;
    let currentReceiverId = null;
    let unsubscribeMessages = null;

    const urlParams = new URLSearchParams(window.location.search);
    const urlChatId = urlParams.get("chatId");

    // ================= AUTH =================
    auth.onAuthStateChanged(user => {

        if (!user) {
            alert("লগইন করুন");
            window.location.href = "auth.html";
            return;
        }

        // 🔥 chat list load
        loadChatList(user.uid);

        // 🔥 যদি URL এ chatId থাকে → direct open
        if (urlChatId) {
            openChatDirect(urlChatId, user.uid);
        }
    });

    // ================= CHAT LIST =================
    function loadChatList(userId) {

        db.collection("chats")
            .where("users", "array-contains", userId) // 🔥 FIXED
            .orderBy("createdAt", "desc")
            .onSnapshot(snapshot => {

                chatListPanel.innerHTML = '';

                snapshot.forEach(doc => {

                    const chat = doc.data();
                    const chatId = doc.id;

                    const receiverId = chat.users.find(id => id !== userId);

                    const item = document.createElement('div');
                    item.className = "chat-item";
                    item.dataset.chatId = chatId;
                    item.dataset.receiverId = receiverId;

                    item.innerHTML = `
                        <div class="chat-info">
                            <h4>User</h4>
                            <p>${chat.lastMessage || "Start chat"}</p>
                        </div>
                    `;

                    item.onclick = () => selectChat(chatId, "User", receiverId);

                    chatListPanel.appendChild(item);
                });
            });
    }

    // ================= DIRECT OPEN =================
    async function openChatDirect(chatId, userId) {

        const chatDoc = await db.collection("chats").doc(chatId).get();

        if (!chatDoc.exists) return;

        const chat = chatDoc.data();
        const receiverId = chat.users.find(id => id !== userId);

        selectChat(chatId, "User", receiverId);
    }

    // ================= SELECT CHAT =================
    function selectChat(chatId, chatName, receiverId) {

        if (unsubscribeMessages) unsubscribeMessages();

        currentChatId = chatId;
        currentReceiverId = receiverId;

        chatHeader.textContent = chatName;
        messageInput.disabled = false;
        sendButton.disabled = false;

        unsubscribeMessages = db.collection("chats")
            .doc(chatId)
            .collection("messages")
            .orderBy("createdAt", "asc") // 🔥 FIXED
            .onSnapshot(snapshot => {

                chatMessagesContainer.innerHTML = '';

                snapshot.forEach(doc => {
                    displayMessage(doc.data(), auth.currentUser.uid);
                });

                chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
            });
    }

    // ================= MESSAGE SHOW =================
    function displayMessage(message, uid) {

        const div = document.createElement('div');
        const isMe = message.sender === uid;

        div.className = "message-bubble " + (isMe ? "sent" : "received");

        div.innerHTML = `
            ${message.text}
        `;

        chatMessagesContainer.appendChild(div);
    }

    // ================= SEND =================
    async function sendMessage() {

        const text = messageInput.value.trim();
        const userId = auth.currentUser.uid;

        if (!text || !currentChatId) return;

        try {
            await db.collection("chats")
                .doc(currentChatId)
                .collection("messages")
                .add({
                    text: text,
                    sender: userId,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            await db.collection("chats")
                .doc(currentChatId)
                .update({
                    lastMessage: text,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            messageInput.value = "";

        } catch (e) {
            console.error(e);
            alert("মেসেজ পাঠানো যায়নি");
        }
    }

    // ================= EVENTS =================
    sendButton.addEventListener('click', sendMessage);

    messageInput.addEventListener('keypress', e => {
        if (e.key === "Enter") sendMessage();
    });

});
