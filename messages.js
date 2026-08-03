// messages.js - Realtime Mode Synchronized Messaging System
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
let currentChatId = urlParams.get('chatId');
let currentPostId = urlParams.get('postId');

let currentUser = null;
let activeSender = null; // প্রেরক (Sender): বর্তমান মোড অনুযায়ী ID, Name, Photo, Type থাকবে
let activeChatListener = null;
let inboxListListener = null;

// 🔄 ১. অ্যাক্টিভ প্রেরক (Sender Identity) নির্ধারণ ও সেটআপ
async function setupActiveSenderIdentity(user) {
    activeSender = null;
    const activeMode = localStorage.getItem('activeIdentityType') || 'user'; // 'user' অথবা 'company'

    if (activeMode === 'company') {
        const savedCompanyId = localStorage.getItem('activeCompanyId');
        let compDoc = null;

        if (savedCompanyId) {
            compDoc = await db.collection('companies').doc(savedCompanyId).get();
        }

        if (!compDoc || !compDoc.exists) {
            const qSnap = await db.collection('companies').where('ownerUid', '==', user.uid).limit(1).get();
            if (!qSnap.empty) compDoc = qSnap.docs[0];
        }

        if (compDoc && compDoc.exists) {
            const cData = compDoc.data();
            activeSender = {
                id: compDoc.id,
                type: 'company',
                name: cData.companyName || cData.name || "কোম্পানি পেজ",
                photo: cData.logo || cData.companyLogo || cData.profilePic || 'https://via.placeholder.com/45?text=Page'
            };
        }
    }

    // কোম্পানি মোড না থাকলে বা ডাটা না পেলে ইউজার মোড সেট হবে
    if (!activeSender) {
        let pName = user.displayName || "ইউজার";
        let pPhoto = user.photoURL || 'https://www.w3schools.com/howto/img_avatar.png';

        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                const uData = userDoc.data();
                pName = uData.fullName || uData.name || pName;
                pPhoto = uData.profilePic || pPhoto;
            }
        } catch (e) {
            console.log("ইউজার ডাটা লোড সমস্যা:", e);
        }

        activeSender = {
            id: user.uid,
            type: 'user',
            name: pName,
            photo: pPhoto
        };
    }

    // হেডার প্রোফাইল ছবি আপডেট
    const headerProfileImg = document.getElementById('profileImage');
    if (headerProfileImg) headerProfileImg.src = activeSender.photo;

    // আইডেন্টিটি অনুযায়ী চ্যাট সিস্টেম পুনরায় চালু
    initChatSystem();
}

firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        alert("মেসেজ দেখতে লগইন করুন।");
        window.location.href = "auth.html";
        return;
    }
    currentUser = user;
    await setupActiveSenderIdentity(user);
});

function initChatSystem() {
    loadChatList();

    if (currentChatId) {
        if (window.innerWidth <= 768) {
            document.getElementById('chatSidebar')?.classList.add('hidden');
            document.getElementById('chatMainBox')?.classList.add('active');
            document.body.classList.add('chat-open');
        }
        openChatBox(currentChatId, currentPostId);
    }
}

// 💬 ২. মোড অনুযায়ী ইনবক্স চ্যাট লিস্ট ফিল্টারিং
function loadChatList() {
    const chatListContainer = document.getElementById('chatListContainer');
    if (!chatListContainer || !activeSender || !currentUser) return;

    if (inboxListListener) inboxListListener(); // আগের লিসেনার বন্ধ করা

    // সিকিউরিটি রুলস পাসের জন্য auth.uid দিয়ে সার্চ
    inboxListListener = db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot((snapshot) => {
            chatListContainer.innerHTML = "";
            let chatDocs = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                
                // শুধুমাত্র বর্তমান মোড (User or Page)-এর আইডি সম্বলিত চ্যাট ফিল্টার হবে
                const isRelevantToActiveMode = (data.senderId === activeSender.id || data.receiverId === activeSender.id);
                const isDeleted = data.deletedBy && data.deletedBy.includes(activeSender.id);

                if (isRelevantToActiveMode && !isDeleted) {
                    chatDocs.push({ id: doc.id, ...data });
                }
            });

            if (chatDocs.length === 0) {
                chatListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:#7f8c8d; font-size:14px;">কোনো ইনবক্স মেসেজ নেই।</div>`;
                return;
            }

            chatDocs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            chatDocs.forEach((chatData) => {
                const chatId = chatData.id;
                
                // 🎯 অপর পক্ষের ID (Recipient ID) নির্ধারণ
                const recipientId = (chatData.senderId === activeSender.id) ? chatData.receiverId : chatData.senderId;
                const isUnread = chatData.isUnread && chatData.lastSenderId !== activeSender.id;

                const chatItemDiv = document.createElement('div');
                chatItemDiv.className = `chat-item ${chatId === currentChatId ? 'active' : ''}`;
                chatItemDiv.id = `item_${chatId}`;

                chatItemDiv.innerHTML = `
                    <img src="https://via.placeholder.com/45?text=..." id="avatar_${chatId}">
                    <div class="chat-item-info">
                        <h4 id="name_${chatId}">লোড হচ্ছে...</h4>
                        <p style="${isUnread ? 'font-weight: bold; color: #1e293b;' : ''}">${chatData.lastMessage || "নতুন চ্যাট..."}</p>
                    </div>
                    <button class="chat-item-menu-btn" onclick="toggleDropdown(event, '${chatId}')">
                        <i class="material-icons">more_vert</i>
                    </button>
                    <div class="chat-dropdown" id="dropdown_${chatId}">
                        <button class="chat-dropdown-item" onclick="deleteChatForUser(event, '${chatId}')">
                            <i class="material-icons">delete</i> ডিলিট করুন
                        </button>
                    </div>
                `;

                chatListContainer.appendChild(chatItemDiv);

                chatItemDiv.onclick = (e) => {
                    if (e.target.closest('.chat-item-menu-btn') || e.target.closest('.chat-dropdown')) return;

                    if (window.innerWidth <= 768) {
                        document.getElementById('chatSidebar')?.classList.add('hidden');
                        document.getElementById('chatMainBox')?.classList.add('active');
                        document.body.classList.add('chat-open');
                    }
                    openChatBox(chatId, chatData.postId);
                };

                // অপর পক্ষের প্রোফাইল ডায়নামিকালি লোড
                if (recipientId) {
                    fetchIdentityDetails(recipientId, `name_${chatId}`, `avatar_${chatId}`);
                }
            });
        }, (error) => {
            console.error("ইনবক্স লোড এরর:", error);
        });
}

// 👤 ৩. নাম ও ছবি নির্ধারণ (Company vs User)
async function fetchIdentityDetails(targetId, nameElemId, avatarElemId) {
    if (!targetId) return;

    const nameElem = document.getElementById(nameElemId);
    const avatarElem = document.getElementById(avatarElemId);

    try {
        // ১. কোম্পানি পেজ চেক
        let cDoc = await db.collection('companies').doc(targetId).get();
        if (cDoc.exists) {
            const cData = cDoc.data();
            if (nameElem) nameElem.textContent = cData.companyName || cData.name || "কোম্পানি পেজ";
            if (avatarElem) avatarElem.src = cData.logo || cData.companyLogo || cData.profilePic || 'https://via.placeholder.com/45?text=Page';
            return;
        }

        // ২. ইউজার প্রোফাইল চেক
        let uDoc = await db.collection('users').doc(targetId).get();
        if (uDoc.exists) {
            const uData = uDoc.data();
            if (nameElem) nameElem.textContent = uData.fullName || uData.name || "ইউজার";
            if (avatarElem) avatarElem.src = uData.profilePic || 'https://www.w3schools.com/howto/img_avatar.png';
            return;
        }

        if (nameElem) nameElem.textContent = "বিজ্ঞাপনদাতা";
        if (avatarElem) avatarElem.src = 'https://www.w3schools.com/howto/img_avatar.png';
    } catch (err) {
        console.error("প্রোফাইল তথ্য পেতে সমস্যা:", err);
    }
}

// 📖 ৪. চ্যাট বক্স ওপেন করা
async function openChatBox(chatId, postId) {
    currentChatId = chatId;

    const emptyState = document.getElementById('emptyState');
    const activeChatContent = document.getElementById('activeChatContent');

    if (emptyState) emptyState.style.display = 'none';
    if (activeChatContent) activeChatContent.style.display = 'flex';

    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    document.getElementById(`item_${chatId}`)?.classList.add('active');

    const chatRef = db.collection('chats').doc(chatId);
    let chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
        const parts = chatId.split('_');
        const otherPartyId = parts.find(id => id !== activeSender.id) || parts[1];

        await chatRef.set({
            chatId: chatId,
            participants: Array.from(new Set([activeSender.id, otherPartyId, currentUser.uid])),
            senderId: activeSender.id,
            senderType: activeSender.type,
            receiverId: otherPartyId,
            postId: postId || currentPostId || "",
            lastMessage: "",
            lastSenderId: activeSender.id,
            deletedBy: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        chatDoc = await chatRef.get();
    } else if (chatDoc.data().isUnread && chatDoc.data().lastSenderId !== activeSender.id) {
        await chatRef.update({ isUnread: false });
    }

    const cData = chatDoc.data();
    const otherPartyId = (cData.senderId === activeSender.id) ? cData.receiverId : cData.senderId;

    if (otherPartyId) {
        fetchIdentityDetails(otherPartyId, 'activeChatUserName', null);
    }

    loadPropertyContext(postId || cData.postId);

    if (activeChatListener) activeChatListener();

    const messagesDisplay = document.getElementById('messagesDisplay');
    activeChatListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            if (!messagesDisplay) return;
            messagesDisplay.innerHTML = "";
            snapshot.forEach(doc => {
                const msg = doc.data();
                const bubble = document.createElement('div');
                const isIncoming = msg.senderId !== activeSender.id;

                bubble.className = `msg-bubble ${isIncoming ? 'incoming' : 'outgoing'}`;

                let timeStr = "এইমাত্র";
                if (msg.timestamp?.toDate) {
                    timeStr = msg.timestamp.toDate().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
                }

                bubble.innerHTML = `${msg.text} <span class="msg-time">${timeStr}</span>`;
                messagesDisplay.appendChild(bubble);
            });
            messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
        });
}

// ✉️ ৫. মেসেজ সেন্ড লজিক
async function sendMessage(text) {
    if (!text.trim() || !currentChatId || !activeSender) return;

    const cleanText = text.trim();

    try {
        await db.collection('chats').doc(currentChatId).collection('messages').add({
            senderId: activeSender.id,
            senderType: activeSender.type,
            text: cleanText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('chats').doc(currentChatId).update({
            lastMessage: cleanText,
            lastSenderId: activeSender.id,
            isUnread: true,
            deletedBy: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("মেসেজ পাঠাতে সমস্যা:", e);
    }
}

// 🔁 ৬. header-sync.js থেকে মোড সুইচিং ট্র্যাক করার লিসেনার
window.addEventListener('storage', (e) => {
    if ((e.key === 'activeIdentityType' || e.key === 'activeCompanyId') && currentUser) {
        setupActiveSenderIdentity(currentUser);
    }
});

window.addEventListener('identityChanged', () => {
    if (currentUser) setupActiveSenderIdentity(currentUser);
});

// 🔘 ডিলিট ও ইউটিলিটি ফাংশন
function toggleDropdown(e, chatId) {
    e.stopPropagation();
    document.querySelectorAll('.chat-dropdown').forEach(d => {
        if (d.id !== `dropdown_${chatId}`) d.classList.remove('show');
    });
    document.getElementById(`dropdown_${chatId}`)?.classList.toggle('show');
}

async function deleteChatForUser(e, chatId) {
    e.stopPropagation();
    if (!confirm("চ্যাটটি মুছে ফেলতে চান?")) return;

    const chatRef = db.collection('chats').doc(chatId);
    const doc = await chatRef.get();
    if (!doc.exists) return;

    let deletedBy = doc.data().deletedBy || [];
    if (!deletedBy.includes(activeSender.id)) deletedBy.push(activeSender.id);

    const bothDeleted = doc.data().participants.every(id => deletedBy.includes(id));

    if (bothDeleted) {
        const msgs = await chatRef.collection('messages').get();
        const batch = db.batch();
        msgs.forEach(m => batch.delete(m.ref));
        batch.delete(chatRef);
        await batch.commit();
    } else {
        await chatRef.update({ deletedBy });
    }

    if (currentChatId === chatId) {
        currentChatId = null;
        document.getElementById('emptyState').style.display = 'flex';
        document.getElementById('activeChatContent').style.display = 'none';
    }
}

function loadPropertyContext(postId) {
    const card = document.getElementById('activePropertyCard');
    if (!card || !postId) { if (card) card.style.display = 'none'; return; }

    card.style.display = 'flex';
    card.href = `details.html?id=${postId}`;

    db.collection('properties').doc(postId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const pTitle = document.getElementById('activePropertyTitle');
            const pPrice = document.getElementById('activePropertyPrice');
            const pImg = document.getElementById('activePropertyImg');

            if (pTitle) pTitle.textContent = data.title || "প্রপার্টি";
            const amt = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
            if (pPrice) pPrice.textContent = amt ? `৳ ${amt}` : "আলোচনা সাপেক্ষ";
            if (pImg && data.images?.[0]) {
                pImg.src = data.images[0].url || data.images[0];
            }
        } else card.style.display = 'none';
    }).catch(() => { if (card) card.style.display = 'none'; });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.chat-dropdown').forEach(d => d.classList.remove('show'));
});

document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendMessageBtn');
    const input = document.getElementById('messageInputField');

    if (sendBtn && input) {
        sendBtn.onclick = () => { sendMessage(input.value); input.value = ""; };
        input.onkeypress = (e) => { if (e.key === 'Enter') { sendMessage(input.value); input.value = ""; } };
    }

    const backBtn = document.getElementById('backToListBtn');
    if (backBtn) {
        backBtn.onclick = () => {
            document.getElementById('chatMainBox')?.classList.remove('active');
            document.getElementById('chatSidebar')?.classList.remove('hidden');
            document.body.classList.remove('chat-open');
        };
    }

    document.querySelectorAll('.quick-btn').forEach(btn => {
        btn.onclick = () => sendMessage(btn.textContent);
    });
});
