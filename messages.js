// Firebase init (assumes already initialized in HTML)
const auth = firebase.auth();
const db = firebase.firestore();

let currentChatId = null;

// ======================
// Create or Get Chat
// ======================
async function createOrGetChat(user1Id, user2Id) {
    const chatId = [user1Id, user2Id].sort().join("_");
    const chatRef = db.collection("chats").doc(chatId);

    const doc = await chatRef.get();

    if (!doc.exists) {
        await chatRef.set({
            participants: [user1Id, user2Id],
            lastMessage: "",
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    return chatId;
}

// ======================
// Send Message
// ======================
async function sendMessage(chatId, messageText, senderId) {
    if (!messageText.trim()) return;

    const messageRef = db.collection("chats")
        .doc(chatId)
        .collection("messages");

    await messageRef.add({
        senderId: senderId,
        text: messageText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    await db.collection("chats").doc(chatId).update({
        lastMessage: messageText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    document.getElementById("message-input").value = "";
}

// ======================
// Load Messages (Realtime)
// ======================
function loadMessages(chatId) {
    const chatBox = document.getElementById("chat-messages");

    db.collection("chats")
      .doc(chatId)
      .collection("messages")
      .orderBy("timestamp")
      .onSnapshot(snapshot => {

        chatBox.innerHTML = "";

        snapshot.forEach(doc => {
            const msg = doc.data();

            const div = document.createElement("div");
            div.classList.add("message-bubble");

            if (msg.senderId === auth.currentUser.uid) {
                div.classList.add("sent");
            } else {
                div.classList.add("received");
            }

            const time = msg.timestamp
                ? new Date(msg.timestamp.toDate()).toLocaleTimeString()
                : "";

            div.innerHTML = `
                ${msg.text}
                <span class="message-time">${time}</span>
            `;

            chatBox.appendChild(div);
        });

        chatBox.scrollTop = chatBox.scrollHeight;
    });
}

// ======================
// Load Chat List
// ======================
function loadChatList() {
    const chatList = document.getElementById("chat-list-panel");

    db.collection("chats")
      .where("participants", "array-contains", auth.currentUser.uid)
      .orderBy("timestamp", "desc")
      .onSnapshot(snapshot => {

        chatList.innerHTML = "";

        snapshot.forEach(doc => {
            const chat = doc.data();
            const chatId = doc.id;

            const div = document.createElement("div");
            div.classList.add("chat-item");

            div.innerHTML = `
                <div class="chat-info">
                    <h4>Chat</h4>
                    <p>${chat.lastMessage || ""}</p>
                </div>
            `;

            div.onclick = () => {
                currentChatId = chatId;
                loadMessages(chatId);

                document.getElementById("message-input").disabled = false;
                document.getElementById("send-button").disabled = false;
            };

            chatList.appendChild(div);
        });
    });
}

// ======================
// Send Button Event
// ======================
document.getElementById("send-button").addEventListener("click", () => {
    const text = document.getElementById("message-input").value;
    sendMessage(currentChatId, text, auth.currentUser.uid);
});

// ======================
// Auth Check
// ======================
auth.onAuthStateChanged(user => {
    if (user) {
        loadChatList();
    } else {
        alert("লগইন করতে হবে");
        window.location.href = "auth.html";
    }
});
