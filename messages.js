const firebaseConfig = {
    apiKey: "AIzaSy...",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const chatId = new URLSearchParams(window.location.search).get("chatId");

let currentUser;

// auth check
firebase.auth().onAuthStateChanged(user => {
    if (!user) {
        location.href = "auth.html";
    } else {
        currentUser = user;
        loadMessages();
    }
});

// load messages realtime
function loadMessages() {
    db.collection("chats")
      .doc(chatId)
      .collection("messages")
      .orderBy("createdAt")
      .onSnapshot(snapshot => {
          const box = document.getElementById("chat-box");
          box.innerHTML = "";

          snapshot.forEach(doc => {
              const msg = doc.data();

              const div = document.createElement("div");
              div.className = "msg " + (msg.sender === currentUser.uid ? "me" : "other");
              div.textContent = msg.text;

              box.appendChild(div);
          });

          box.scrollTop = box.scrollHeight;
      });
}

// send message
function sendMessage() {
    const input = document.getElementById("msgInput");
    const text = input.value.trim();

    if (!text) return;

    db.collection("chats")
      .doc(chatId)
      .collection("messages")
      .add({
          text: text,
          sender: currentUser.uid,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

    input.value = "";
}
