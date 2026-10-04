// messages.js - Highly Optimized Messaging Engine
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
let activeSender = null; 
let activeChatListener = null;

firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "auth.html";
        return;
    }
    currentUser = user;

    if (typeof window.getActiveIdentity === 'function') {
        const identity = window.getActiveIdentity();
        if (identity) {
            activeSender = {
                id: identity.id,
                type: identity.type,
                name: identity.name,
                photo: identity.avatar || 'https://www.w3schools.com/howto/img_avatar.png'
            };
        }
    }

    if (!activeSender) {
        const activeMode = localStorage.getItem('activeIdentityType') || 'user';
        if (activeMode === 'company') {
            const savedCompanyId = localStorage.getItem('activeCompanyId');
            if (savedCompanyId) {
                try {
                    const compDoc = await db.collection('companies').doc(savedCompanyId).get();
                    if (compDoc.exists) {
                        const cData = compDoc.data();
                        activeSender = {
                            id: compDoc.id,
                            type: 'company',
                            name: cData.companyName || cData.name || "কোম্পানি পেজ",
                            photo: cData.logo || cData.companyLogo || cData.profilePic || 'https://via.placeholder.com/45?text=Page'
                        };
                    }
                } catch (e) {
                    console.error("কোম্পানি ডাটা লোড সমস্যা:", e);
                }
            }
        }

        if (!activeSender) {
            activeSender = {
                id: user.uid,
                type: 'user',
                name: user.displayName || "ইউজার",
                photo: user.photoURL || 'https://www.w3schools.com/howto/img_avatar.png'
            };
        }
    }

    const headerProfileImg = document.getElementById('profileImage');
    if (headerProfileImg && activeSender.photo) headerProfileImg.src = activeSender.photo;

    renderIdentityBadge();
    initChatSystem();
});

function renderIdentityBadge() {
    const chatInputArea = document.querySelector('.chat-input-area') || document.getElementById('messageInputField')?.parentElement;
    if (!chatInputArea || !activeSender) return;

    let badge = document.getElementById('activeIdentityBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'activeIdentityBadge';
        badge.style.cssText = "font-size: 11px; color: #475569; background: #e2e8f0; padding: 4px 10px; border-radius: 4px; margin-bottom: 6px; display: inline-flex; align-items: center; gap: 5px; border-left: 3px solid #007bff;";
        chatInputArea.parentNode.insertBefore(badge, chatInputArea);
    }

    const typeLabel = activeSender.type === 'company' ? 'কোম্পানি পেজ' : 'ইউজার অ্যাকাউন্ট';
    badge.innerHTML = `<i class="material-icons" style="font-size: 13px;">account_circle</i> আপনি <b>${activeSender.name}</b> (${typeLabel}) মোডে আছেন।`;
}

function initChatSystem() {
    loadChatList();
    if (currentChatId) {
        handleMobileLayout();
        openChatBox(currentChatId, currentPostId);
    }
}

// 💬 ২. ইনবক্স ফিল্টারিং - সরাসরি ActiveSender.id দিয়ে খোঁজা
function loadChatList() {
    const chatListContainer = document.getElementById('chatListContainer');
    if (!chatListContainer || !activeSender) return;

    // activeSender.id (User UID অথবা Company ID) দিয়ে সরাসরি ফিল্টার
    db.collection('chats')
        .where('participants', 'array-contains', activeSender.id)
        .onSnapshot((snapshot) => {
            chatListContainer.innerHTML = "";
            let chatDocs = [];

            snapshot.forEach(doc => {
                const data = doc.data();
                const isDeleted = data.deletedBy && data.deletedBy.includes(activeSender.id);
                if (!isDeleted) {
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
                const otherPartyId = (chatData.senderId === activeSender.id) ? chatData.receiverId : chatData.senderId;
                
                // আনরিড মেসেজ চেক
                const unreadCount = (chatData.unreadCount && chatData.unreadCount[activeSender.id]) || 0;
                const isUnread = unreadCount > 0;

                const chatItemDiv = document.createElement('div');
                chatItemDiv.className = `chat-item ${chatId === currentChatId ? 'active' : ''}`;
                chatItemDiv.id = `item_${chatId}`;

                chatItemDiv.innerHTML = `
                    <img src="https://via.placeholder.com/45?text=..." id="avatar_${chatId}">
                    <div class="chat-item-info">
                        <h4 id="name_${chatId}">লোড হচ্ছে...</h4>
                        <p style="${isUnread ? 'font-weight: bold; color: #0f172a;' : ''}">${chatData.lastMessage || "নতুন বার্তা..."}</p>
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
                    handleMobileLayout();
                    openChatBox(chatId, chatData.postId);
                };

                fetchIdentityDetails(otherPartyId, `name_${chatId}`, `avatar_${chatId}`);
            });
        }, (error) => {
            console.error("চ্যাট লোড করার এরর:", error);
            chatListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:red; font-size:13px;">মেসেজ লোড করতে সমস্যা হয়েছে।</div>`;
        });
}

async function fetchIdentityDetails(targetId, nameElemId, avatarElemId) {
    if (!targetId) return;
    const nameElem = document.getElementById(nameElemId);
    const avatarElem = document.getElementById(avatarElemId);

    try {
        let uDoc = await db.collection('users').doc(targetId).get();
        if (uDoc.exists) {
            const uData = uDoc.data();
            if (nameElem) nameElem.textContent = uData.fullName || uData.name || uData.displayName || "গ্রাহক";
            if (avatarElem && avatarElemId) avatarElem.src = uData.profilePic || uData.photoURL || 'https://www.w3schools.com/howto/img_avatar.png';
            return;
        }

        let cDoc = await db.collection('companies').doc(targetId).get();
        if (cDoc.exists) {
            const cData = cDoc.data();
            if (nameElem) nameElem.textContent = cData.name || cData.companyName || cData.pageName || "কোম্পানি পেজ";
            if (avatarElem && avatarElemId) avatarElem.src = cData.logo || cData.companyLogo || cData.profilePic || 'https://via.placeholder.com/45?text=Page';
            return;
        }

        if (nameElem) nameElem.textContent = "বিজ্ঞাপনদাতা";
        if (avatarElem && avatarElemId) avatarElem.src = 'https://www.w3schools.com/howto/img_avatar.png';
    } catch (err) {
        console.error("আইডেন্টিটি ফেচিং ত্রুটি:", err);
        if (nameElem) nameElem.textContent = "গ্রাহক";
    }
}

async function openChatBox(chatId, postId) {
    currentChatId = chatId;

    const emptyState = document.getElementById('emptyState');
    const activeChatContent = document.getElementById('activeChatContent');

    if (emptyState) emptyState.style.display = 'none';
    if (activeChatContent) activeChatContent.style.display = 'flex';

    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    document.getElementById(`item_${chatId}`)?.classList.add('active');

    const chatRef = db.collection('chats').doc(chatId);
    
    // ⚡ আনরিড কাউন্ট জিরো (0) করা
    await chatRef.update({
        [`unreadCount.${activeSender.id}`]: 0
    }).catch(() => {});

    let chatDoc = await chatRef.get();
    if (!chatDoc.exists) return;
    const cData = chatDoc.data();

    const otherPartyId = (cData.senderId === activeSender.id) ? cData.receiverId : cData.senderId;
    fetchIdentityDetails(otherPartyId, 'activeChatUserName', null);
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
                const isIncoming = msg.senderId !== activeSender.id;

                const bubble = document.createElement('div');
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

// ✉️ ৫. মেসেজ সেন্ড লজিক (নিখুঁত Unread Count আপডেটসহ)
async function sendMessage(text) {
    if (!text.trim() || !currentChatId || !activeSender) return;
    const cleanText = text.trim();

    try {
        const chatDocRef = db.collection('chats').doc(currentChatId);
        const chatDoc = await chatDocRef.get();
        if (!chatDoc.exists) return;

        const cData = chatDoc.data();
        const recipientId = (cData.senderId === activeSender.id) ? cData.receiverId : cData.senderId;

        // ১. সাব-কালেকশনে বার্তা সেভ
        await chatDocRef.collection('messages').add({
            senderId: activeSender.id,
            senderType: activeSender.type,
            text: cleanText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // ২. চ্যাট ব্যাকএন্ড ডকুমেন্ট ও আনরিড কাউন্ট ১ বৃদ্ধি করা
        await chatDocRef.update({
            lastMessage: cleanText,
            lastSenderId: activeSender.id,
            deletedBy: [],
            [`unreadCount.${recipientId}`]: firebase.firestore.FieldValue.increment(1),
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

    } catch (e) {
        console.error("মেসেজ পাঠাতে সমস্যা:", e);
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

function handleMobileLayout() {
    if (window.innerWidth <= 768) {
        document.getElementById('chatSidebar')?.classList.add('hidden');
        document.getElementById('chatMainBox')?.classList.add('active');
        document.body.classList.add('chat-open');
    }
}

function toggleDropdown(e, chatId) {
    e.stopPropagation();
    document.querySelectorAll('.chat-dropdown').forEach(d => {
        if (d.id !== `dropdown_${chatId}`) d.classList.remove('show');
    });
    document.getElementById(`dropdown_${chatId}`)?.classList.toggle('show');
}

async function deleteChatForUser(e, chatId) {
    e.stopPropagation();
    if (!confirm("মেসেজটি ডিলিট করতে চান?")) return;

    const chatRef = db.collection('chats').doc(chatId);
    const doc = await chatRef.get();
    if (!doc.exists) return;

    let deletedBy = doc.data().deletedBy || [];
    if (!deletedBy.includes(activeSender.id)) deletedBy.push(activeSender.id);

    await chatRef.update({ deletedBy });

    if (currentChatId === chatId) {
        currentChatId = null;
        const emptyState = document.getElementById('emptyState');
        const activeChatContent = document.getElementById('activeChatContent');
        if (emptyState) emptyState.style.display = 'flex';
        if (activeChatContent) activeChatContent.style.display = 'none';
    }
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
