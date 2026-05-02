const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
const auth = firebase.auth();

const chatId = new URLSearchParams(window.location.search).get("chatId");

let currentUser = null;

// 🔥 AUTH READY (IMPORTANT FIX)
auth.onAuthStateChanged(user => {

    if (!user) {
        // ⛔ আগে সাথে সাথে redirect করবে না
        console.log("User not logged in");
        return;
    }

    currentUser = user;

    if (!chatId) {
        alert("Chat ID পাওয়া যায়নি");
        return;
    }

    loadMessages();
});

// ================= LOAD MESSAGE =================
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

                div.className = "msg " +
                    (msg.sender === currentUser.uid ? "me" : "other");

                div.textContent = msg.text;

                box.appendChild(div);
            });

            box.scrollTop = box.scrollHeight;
        });
}

// ================= SEND =================
async function sendMessage() {

    const input = document.getElementById("msgInput");
    const text = input.value.trim();

    if (!text) return;

    if (!currentUser) {
        alert("লগইন নেই");
        return;
    }

    try {
        await db.collection("chats")
            .doc(chatId)
            .collection("messages")
            .add({
                text: text,
                sender: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        input.value = "";

    } catch (e) {
        console.error("SEND ERROR:", e);
        alert("মেসেজ পাঠাতে সমস্যা হয়েছে");
    }
}
