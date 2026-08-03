// messages.js - Precise Identity & Dual-Mode Isolation Messaging Architecture
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

// URL Parameters
const urlParams = new URLSearchParams(window.location.search);
let currentChatId = urlParams.get('chatId');
let currentPostId = urlParams.get('postId');

// State Variables
let currentUser = null;
let activeSender = null; // { id: string, type: 'user'|'company', name: string, photo: string }
let activeChatListener = null;

// 🚀 ১. বর্তমান ব্যবহারকারীর মোড ও সক্রিয় প্রেরক (Sender) আইডেন্টিটি নির্ধারণ
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
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
                name: cData.companyName || cData.name || "কোম্পানি পেজ",
                photo: cData.logo || cData.companyLogo || cData.profilePic || 'https://via.placeholder.com/45?text=Page'
            };
        }
    }

    // পেজ মোড না থাকলে বা ইউজার মোডে থাকলে
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

    // হেডার প্রোফাইল আপডেট ও আইডেন্টিটি ইন্ডিকেটর
    const headerProfileImg = document.getElementById('profileImage');
    if (headerProfileImg) headerProfileImg.src = activeSender.photo;

    renderIdentityBadge();
    initChatSystem();
});

// 📌 মোড নির্দেশক ব্যাজ (ভিজিটর কার হয়ে কথা বলছেন তা নিশ্চিত করতে)
function renderIdentityBadge() {
    const chatInputArea = document.querySelector('.chat-input-area') || document.getElementById('messageInputField')?.parentElement;
    if (!chatInputArea) return;

    let badge = document.getElementById('activeIdentityBadge');
    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'activeIdentityBadge';
        badge.style.cssText = "font-size: 11px; color: #475569; background: #e2e8f0; padding: 4px 10px; border-radius: 4px; margin-bottom: 6px; display: inline-flex; align-items: center; gap: 5px; border-left: 3px solid #007bff;";
        chatInputArea.parentNode.insertBefore(badge, chatInputArea);
    }

    const typeLabel = activeSender.type === 'company' ? 'কোম্পানি পেজ' : 'ইউজার অ্যাকাউন্ট';
    badge.innerHTML = `<i class="material-icons" style="font-size: 13px;">account_circle</i> আপনি <b>${activeSender.name}</b> (${typeLabel}) মোডে চ্যাট করছেন।`;
}

function initChatSystem() {
    loadChatList();

    if (currentChatId) {
        handleMobileLayout();
        openChatBox(currentChatId, currentPostId);
    }
}

// 💬 ২. ইনবক্স ফিল্টারিং (ইউজার মোডে শুধুমাত্র ইউজারের চ্যাট, পেজ মোডে শুধুমাত্র পেজের চ্যাট)
function loadChatList() {
    const chatListContainer = document.getElementById('chatListContainer');
    if (!chatListContainer || !activeSender) return;

    // 'participants' এ সক্রিয় activeSender.id (userId অথবা companyId) দিয়ে অনুসন্ধান
    db.collection('chats')
        .where('participants', 'array-contains', activeSender.id)
        .onSnapshot((snapshot) => {
            chatListContainer.innerHTML = "";
            let chatDocs = [];

            snapshot.forEach(doc => {
                const data = doc.data();

                // 🎯 সুনির্দিষ্ট লজিক: বার্তাটি প্রেরক (Sender) বা প্রাপক (Receiver) হিসেবে সক্রিয় activeSender.id এর সাথেই হতে হবে
                const isDirectParticipant = (data.senderId === activeSender.id || data.receiverId === activeSender.id);
                const isDeleted = data.deletedBy && data.deletedBy.includes(activeSender.id);

                if (isDirectParticipant && !isDeleted) {
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

                // অপর পক্ষের আইডি (প্রাপক অথবা প্রেরক)
                const otherPartyId = (chatData.senderId === activeSender.id) ? chatData.receiverId : chatData.senderId;
                const isUnread = chatData.isUnread && chatData.lastSenderId !== activeSender.id;

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

                // অপর পক্ষের প্রোফাইল লোড (Company/User)
                fetchIdentityDetails(otherPartyId, `name_${chatId}`, `avatar_${chatId}`);
            });
        });
}

// 👤 ৩. অপর পক্ষের সঠিক নাম ও ছবি আনার ফাংশন (Smart Company/User Profiling)
async function fetchIdentityDetails(targetId, nameElemId, avatarElemId) {
    if (!targetId) return;

    const nameElem = document.getElementById(nameElemId);
    const avatarElem = document.getElementById(avatarElemId);

    try {
        // ১. আগে 'companies' কালেকশনে খোঁজ করা হবে
        let cDoc = await db.collection('companies').doc(targetId).get();
        if (cDoc.exists) {
            const cData = cDoc.data();
            if (nameElem) nameElem.textContent = cData.companyName || cData.name || "কোম্পানি পেজ";
            if (avatarElem) avatarElem.src = cData.logo || cData.companyLogo || cData.profilePic || 'https://via.placeholder.com/45?text=Page';
            return;
        }

        // ২. কোম্পানি না হলে 'users' কালেকশনে খোঁজ করা হবে
        let uDoc = await db.collection('users').doc(targetId).get();
        if (uDoc.exists) {
            const uData = uDoc.data();
            if (nameElem) nameElem.textContent = uData.fullName || uData.name || "গ্রাহক";
            if (avatarElem) avatarElem.src = uData.profilePic || 'https://www.w3schools.com/howto/img_avatar.png';
            return;
        }

        // ৩. কোনো তথ্য না পাওয়া গেলে ডিফল্ট ব্যাকআপ
        if (nameElem) nameElem.textContent = "বিজ্ঞাপনদাতা";
        if (avatarElem) avatarElem.src = 'https://www.w3schools.com/howto/img_avatar.png';
    } catch (err) {
        if (nameElem) nameElem.textContent = "গ্রাহক";
    }
}

// 📖 ৪. চ্যাট বক্স ওপেন ও মেসেজ ফেচিং
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
        const otherPartyId = parts.find(id => id !== activeSender.id) || parts[1];

        // 🎯 ৪টি কম্বিনেশন হ্যান্ডেল করার জন্য স্পষ্ট পার্টিসিপ্যান্ট স্ট্রাকচার
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

    // চ্যাট হেডারে প্রাপক/প্রেরকের নাম লোড
    fetchIdentityDetails(otherPartyId, 'activeChatUserName', null);

    // প্রপার্টি ইনফরমেশন কার্ড
    loadPropertyContext(postId || cData.postId);

    // রিয়েলটাইম মেসেজ ফেচিং
    if (activeChatListener) activeChatListener();

    const messagesDisplay = document.getElementById('messagesDisplay');
    activeChatListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
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

// 🏢 প্রপার্টি কার্ড লোডিং
function loadPropertyContext(postId) {
    const card = document.getElementById('activePropertyCard');
    if (!card || !postId) { if (card) card.style.display = 'none'; return; }

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

// 📱 মোবাইল ডিভাইস ইউআই
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
        document.getElementById('emptyState').style.display = 'flex';
        document.getElementById('activeChatContent').style.display = 'none';
    }
}

document.addEventListener('click', () => {
    document.querySelectorAll('.chat-dropdown').forEach(d => d.classList.remove('show'));
});

// ⌨️ ইভেন্ট হ্যান্ডলার
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
