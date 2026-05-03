// Firebase
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
const postId = urlParams.get('id');

let currentUser = null;

// AUTH
auth.onAuthStateChanged(user => {
    currentUser = user;
});

// LOAD
document.addEventListener('DOMContentLoaded', async () => {

    document.getElementById('p-message')?.addEventListener('click', handleMessageClick);

    if (!postId) return;

    const doc = await db.collection('properties').doc(postId).get();

    if (doc.exists) {
        const data = doc.data();
        renderDetails(data);
    }
});

// ================= MESSAGE =================
async function handleMessageClick() {

    if (!currentUser) {
        alert("লগইন করুন");
        window.location.href = "auth.html";
        return;
    }

    const ownerId = window.propertyOwnerId;

    if (!ownerId) {
        alert("ডাটা লোড হচ্ছে...");
        return;
    }

    if (currentUser.uid === ownerId) {
        alert("নিজের পোস্টে মেসেজ করা যাবে না");
        return;
    }

    const chatId = await createOrGetChat(currentUser.uid, ownerId);

    window.location.href = `messages.html?chatId=${chatId}`;
}

// ================= CREATE CHAT =================
async function createOrGetChat(user1, user2) {

    const chatId = `${postId}_${user1}_${user2}`;

    const ref = db.collection("chats").doc(chatId);
    const doc = await ref.get();

    if (!doc.exists) {
        await ref.set({
            users: [user1, user2],
            postId: postId,
            postTitle: document.getElementById('p-title').textContent,
            lastMessage: "",
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            unread: {
                [user1]: 0,
                [user2]: 0
            }
        });
    }

    return chatId;
}

// ================= RENDER =================
function renderDetails(data) {

    window.propertyOwnerId = data.userId;

    document.getElementById('p-title').textContent = data.title || "";
}
