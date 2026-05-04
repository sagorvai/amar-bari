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

        // চ্যাট লিস্ট লোড করুন
        loadChatList(user.uid);

        // যদি URL এ chatId থাকে → ডিরেক্ট ওপেন করুন
        if (urlChatId) {
            openChatDirect(urlChatId, user.uid);
        }
    });

    // ================= CHAT LIST =================
    function loadChatList(userId) {

        db.collection("chats")
            .where("users", "array-contains", userId)
            .orderBy("createdAt", "desc")
            .onSnapshot(async snapshot => {

                chatListPanel.innerHTML = '';

                for (const doc of snapshot.docs) {

                    const chat = doc.data();
                    const chatId = doc.id;

                    const receiverId = chat.users.find(id => id !== userId);

                    // ডাইনামিকালি ইউজারের নাম ফেচ করা
                    let receiverName = "ব্যবহারকারী";
                    try {
                        const userDoc = await db.collection("users").doc(receiverId).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            receiverName = userData.name || userData.fullName || userData.displayName || "ব্যবহারকারী";
                        }
                    } catch (e) {
                        console.error("Error fetching user name:", e);
                    }

                    const item = document.createElement('div');
                    item.className = "chat-item";
                    item.dataset.chatId = chatId;
                    item.dataset.receiverId = receiverId;

                    // চ্যাট লিস্টের টাইটেল হিসেবে postTitle ব্যবহার করা হচ্ছে
                    item.innerHTML = `
                        <div class="chat-info">
                            <h4>${chat.postTitle || "প্রপার্টি চ্যাট"}</h4>
                            <p>${chat.lastMessage || "Start chat"}</p>
                        </div>
                    `;

                    item.onclick = () => selectChat(chatId, receiverName, receiverId);

                    chatListPanel.appendChild(item);
                }
            });
    }

    // ================= DIRECT OPEN =================
    async function openChatDirect(chatId, userId) {

        const chatDoc = await db.collection("chats").doc(chatId).get();

        if (!chatDoc.exists) return;

        const chat = chatDoc.data();
        const receiverId = chat.users.find(id => id !== userId);

        let receiverName = "ব্যবহারকারী";
        try {
            const userDoc = await db.collection("users").doc(receiverId).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                receiverName = userData.name || userData.fullName || userData.displayName || "ব্যবহারকারী";
            }
        } catch (e) {
            console.error("Error fetching user name for direct open:", e);
        }

        selectChat(chatId, receiverName, receiverId);
    }

    // ================= SELECT CHAT =================
    function selectChat(chatId, chatName, receiverId) {

        if (unsubscribeMessages) unsubscribeMessages();

        currentChatId = chatId;
        currentReceiverId = receiverId;

        // হেডে ডাইনামিক নাম সেট করা
        chatHeader.textContent = chatName;
        messageInput.disabled = false;
        sendButton.disabled = false;

        unsubscribeMessages = db.collection("chats")
            .doc(chatId)
            .collection("messages")
            .orderBy("createdAt", "asc")
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
