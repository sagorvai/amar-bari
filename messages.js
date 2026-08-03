// messages.js - Clean Identity & Mode-Based Messaging System
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

// 🔄 ১. অ্যাক্টিভ প্রেরক (Sender Identity) নির্ধারণ
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        alert("মেসেজ দেখতে লগইন করুন।");
        window.location.href = "auth.html";
        return;
    }

    currentUser = user;
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
                name: cData.name || cData.companyName || "কোম্পানি পেজ",
                photo: cData.logo || cData.companyLogo || 'https://via.placeholder.com/45?text=Page'
            };
        }
    }

    // কোম্পানি না হলে বা ইউজার মোড থাকলে ইউজার আইডেন্টিটি সেট হবে
    if (!activeSender) {
        let pName = user.displayName || "ইউজার";
        let pPhoto = user.photoURL || 'https://www.w3schools.com/howto/img_avatar.png';

        const userDoc = await db.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const uData = userDoc.data();
            pName = uData.fullName || uData.name || pName;
            pPhoto = uData.profilePic || pPhoto;
        }

        activeSender = {
            id: user.uid,
            type: 'user',
            name: pName,
            photo: pPhoto
        };
    }

    // হেডার প্রোফাইল আপডেট
    const headerProfileImg = document.getElementById('profileImage');
    if (headerProfileImg) headerProfileImg.src = activeSender.photo;

    // সিস্টেম স্টার্ট
    initChatSystem();
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

// 💬 ২. মোড অনুযায়ী চ্যাট লিস্ট ফিল্টারিং
function loadChatList() {
    const chatListContainer = document.getElementById('chatListContainer');
    if (!chatListContainer || !activeSender) return;

    // শুধুমাত্র বর্তমান প্রেরক (activeSender.id) যেখানে অংশগ্রহণকারী, সেই চ্যাটগুলো আনবে
    db.collection('chats')
        .where('participants', 'array-contains', activeSender.id)
        .onSnapshot((snapshot) => {
            chatListContainer.innerHTML = "";
            let chatDocs = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.deletedBy || !data.deletedBy.includes(activeSender.id)) {
                    chatDocs.push({ id: doc.id, ...data });
                }
            });

            if (chatDocs.length === 0) {
                chatListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:#7f8c8d;">কোনো মেসেজ পাওয়া যায়নি।</div>`;
                return;
            }

            chatDocs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            chatDocs.forEach((chatData) => {
                const chatId = chatData.id;
                
                // 🎯 প্রাপক (Recipient ID) সঠিকভাবে নির্ধারণ
                let recipientId = null;
                if (chatData.senderId === activeSender.id) {
                    recipientId = chatData.receiverId;
                } else if (chatData.receiverId === activeSender.id) {
                    recipientId = chatData.senderId;
                } else {
                    recipientId = chatData.participants ? chatData.participants.find(id => id !== activeSender.id && id !== currentUser.uid) : null;
                }

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

                // প্রাপকের তথ্য (User/Company) দিয়ে UI ফিল করবে
                if (recipientId) {
                    fetchIdentityDetails(recipientId, `name_${chatId}`, `avatar_${chatId}`);
                }
            });
        });
}

// 👤 ৩. আইডেন্টিটি চেক (User নাকি Company তা চেক করে নাম ও ছবি বসাবে)
async function fetchIdentityDetails(targetId, nameElemId, avatarElemId) {
    if (!targetId) return;

    try {
        // ১. আগে 'users' কালেকশনে চেক
        let uDoc = await db.collection('users').doc(targetId).get();
        if (uDoc.exists) {
            const uData = uDoc.data();
            if (nameElemId && document.getElementById(nameElemId)) {
                document.getElementById(nameElemId).textContent = uData.fullName || uData.name || "ইউজার";
            }
            if (avatarElemId && document.getElementById(avatarElemId)) {
                document.getElementById(avatarElemId).src = uData.profilePic || 'https://www.w3schools.com/howto/img_avatar.png';
            }
            return;
        }

        // ২. না পাওয়া গেলে 'companies' কালেকশনে চেক
        let cDoc = await db.collection('companies').doc(targetId).get();
        if (cDoc.exists) {
            const cData = cDoc.data();
            if (nameElemId && document.getElementById(nameElemId)) {
                document.getElementById(nameElemId).textContent = cData.name || cData.companyName || "কোম্পানি পেজ";
            }
            if (avatarElemId && document.getElementById(avatarElemId)) {
                document.getElementById(avatarElemId).src = cData.logo || cData.companyLogo || 'https://via.placeholder.com/45?text=Page';
            }
            return;
        }

        // ৩. ব্যাকআপ নাম
        if (nameElemId && document.getElementById(nameElemId)) {
            document.getElementById(nameElemId).textContent = "প্রাপক";
        }
    } catch (err) {
        console.error("প্রোফাইল লোড ত্রুটি:", err);
    }
}

// 📖 ৪. চ্যাট বক্স ওপেন
async function openChatBox(chatId, postId) {
    currentChatId = chatId;

    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('activeChatContent').style.display = 'flex';

    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    document.getElementById(`item_${chatId}`)?.classList.add('active');

    const chatRef = db.collection('chats').doc(chatId);
    let chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
        const parts = chatId.split('_');
        await chatRef.set({
            chatId: chatId,
            participants: Array.from(new Set([currentUser.uid, activeSender.id, parts[0], parts[1]])),
            senderId: activeSender.id,
            senderType: activeSender.type,
            senderUserUid: currentUser.uid,
            receiverId: parts.find(id => id !== activeSender.id) || parts[1],
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

    // প্রাপকের নাম চ্যাট হেডার-এ দেখানো
    let recipientId = null;
    if (chatDoc.exists) {
        const cData = chatDoc.data();
        recipientId = (cData.senderId === activeSender.id) ? cData.receiverId : cData.senderId;
    } 
    if (!recipientId) {
        recipientId = chatId.split('_').find(id => id !== activeSender.id);
    }

    if (recipientId) {
        fetchIdentityDetails(recipientId, 'activeChatUserName', null);
    }

    loadPropertyContext(postId || (chatDoc.exists ? chatDoc.data().postId : ""));

    // রিয়েলটাইম মেসেজ লোড
    if (activeChatListener) activeChatListener();

    const messagesDisplay = document.getElementById('messagesDisplay');
    activeChatListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
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
        console.error("মেসেজ সেন্ড সমস্যা:", e);
    }
}

// 🔘 ডিলিট এবং ইউটিলিটি
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

    const mainParticipants = [
        doc.data().senderId || doc.data().participants?.[0], 
        doc.data().receiverId || doc.data().participants?.[1]
    ].filter(Boolean);

    const bothDeleted = mainParticipants.length > 0 && mainParticipants.every(id => deletedBy.includes(id));

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
    if (!card || !postId) { if(card) card.style.display = 'none'; return; }

    card.style.display = 'flex';
    card.href = `details.html?id=${postId}`;

    db.collection('properties').doc(postId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('activePropertyTitle').textContent = data.title || "প্রপার্টি";
            const amt = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
            document.getElementById('activePropertyPrice').textContent = amt ? `৳ ${amt}` : "আলোচনা সাপেক্ষ";
            if (data.images?.[0]) {
                document.getElementById('activePropertyImg').src = data.images[0].url || data.images[0];
            }
        } else card.style.display = 'none';
    }).catch(() => card.style.display = 'none');
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
