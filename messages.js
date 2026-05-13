// Firebase Configuration (আপনার details.js থেকে কপি করুন)
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
const auth = firebase.auth();

const urlParams = new URLSearchParams(window.location.search);
const chatId = urlParams.get('chatId');

const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const msgInput = document.getElementById('msg-input');

auth.onAuthStateChanged(user => {
    if (user && chatId) {
        loadMessages();
    } else if (!user) {
        window.location.href = 'auth.html';
    }
});

// মেসেজ লোড করা (Real-time)
function loadMessages() {
    db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snapshot => {
            chatMessages.innerHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const msgDiv = document.createElement('div');
                msgDiv.classList.add('msg');
                msgDiv.classList.add(data.senderId === auth.currentUser.uid ? 'sent' : 'received');
                msgDiv.textContent = data.text;
                chatMessages.appendChild(msgDiv);
            });
            chatMessages.scrollTop = chatMessages.scrollHeight;
        });
}

// মেসেজ পাঠানো
chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = msgInput.value.trim();
    if (!text) return;

    const user = auth.currentUser;
    
    await db.collection('chats').doc(chatId).collection('messages').add({
        text: text,
        senderId: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    // শেষ মেসেজ আপডেট করা
    await db.collection('chats').doc(chatId).update({
        lastMessage: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    msgInput.value = '';
});
