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

const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

let currentOwnerId = null;
let currentPostTitle = null;

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;

    // ১. প্রপার্টি ডাটা লোড
    const doc = await db.collection('properties').doc(postId).get();
    if (doc.exists) {
        const data = doc.data();
        renderDetails(data);
        loadRelatedPosts(data);
        
        currentOwnerId = data.userId || data.uid || data.ownerId;
        currentPostTitle = data.title;
    }

    // ২. ইভেন্ট লিসেনার (বাটনগুলোর কাজ শুরু)
    document.getElementById('messageOwnerButton')?.addEventListener('click', startChat);
    document.getElementById('saveButton')?.addEventListener('click', toggleSave);
    document.getElementById('shareButton')?.addEventListener('click', sharePost);
});

// --- ফাংশন: মেসেজ বাটন ---
async function startChat() {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        alert("চ্যাট করার জন্য লগইন করুন।");
        location.href = "login.html";
        return;
    }
    if (currentUser.uid === currentOwnerId) {
        alert("এটি আপনার নিজের পোস্ট।");
        return;
    }

    const chatsRef = db.collection('chats');
    const existingChat = await chatsRef
        .where('postId', '==', postId)
        .where('users', 'array-contains', currentUser.uid)
        .get();

    let chatId;
    if (!existingChat.empty) {
        chatId = existingChat.docs[0].id;
    } else {
        const newChat = await chatsRef.add({
            postId: postId,
            postTitle: currentPostTitle || "প্রপার্টি চ্যাট",
            users: [currentUser.uid, currentOwnerId],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastMessage: "চ্যাট শুরু হয়েছে..."
        });
        chatId = newChat.id;
    }
    location.href = `messages.html?chatId=${chatId}`;
}

// --- ফাংশন: সেভ বাটন ---
async function toggleSave() {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) { alert("সেভ করতে লগইন করুন।"); return; }

    const saveRef = db.collection('users').doc(currentUser.uid).collection('savedPosts').doc(postId);
    const doc = await saveRef.get();

    if (doc.exists) {
        await saveRef.delete();
        alert("সেভ লিস্ট থেকে সরিয়ে ফেলা হয়েছে।");
        document.getElementById('saveButton').textContent = "Save";
    } else {
        await saveRef.set({ postId: postId, savedAt: new Date() });
        alert("পোস্টটি সেভ হয়েছে!");
        document.getElementById('saveButton').textContent = "Saved";
    }
}

// --- ফাংশন: শেয়ার বাটন ---
function sharePost() {
    if (navigator.share) {
        navigator.share({
            title: document.title,
            url: window.location.href
        }).catch(err => console.error(err));
    } else {
        navigator.clipboard.writeText(window.location.href);
        alert("লিঙ্কটি কপি করা হয়েছে!");
    }
}

// আপনার আগের renderDetails এবং অন্যান্য ফাংশন এখানে থাকবে...
// (যা আমি আগের কোডে দিয়েছিলাম তা এখানে বসিয়ে দিন)
