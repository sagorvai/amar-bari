// messages.js - Complete Redesigned Isolated Messaging System for AmarBari
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
let activeIdentity = null; // { id: string, type: 'user'|'company', name: string, photo: string }
let activeChatUnsubscribe = null;

// 🚀 ১. ইনিশিয়ালাইজেশন ও মোড শনাক্তকরণ
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "auth.html";
        return;
    }

    currentUser = user;
    const currentMode = localStorage.getItem('activeIdentityType') || 'user';

    if (currentMode === 'company') {
        const companyId = localStorage.getItem('activeCompanyId');
        let compDoc = null;

        if (companyId) {
            compDoc = await db.collection('companies').doc(companyId).get();
        }

        if (!compDoc || !compDoc.exists) {
            const snap = await db.collection('companies').where('ownerUid', '==', user.uid).limit(1).get();
            if (!snap.empty) compDoc = snap.docs[0];
        }

        if (compDoc && compDoc.exists) {
            const data = compDoc.data();
            activeIdentity = {
                id: compDoc.id,
                type: 'company',
                name: data.companyName || data.name || "কোম্পানি পেজ",
                photo: data.logo || data.companyLogo || data.profilePic || 'https://via.placeholder.com/45?text=Page'
            };
        }
    }

    // কোম্পানি না থাকলে বা ইউজার মোড হলে
    if (!activeIdentity) {
        let uName = user.displayName || "ইউজার";
        let uPhoto = user.photoURL || 'https://www.w3schools.com/howto/img_avatar.png';

        const uDoc = await db.collection('users').doc(user.uid).get();
        if (uDoc.exists) {
            const uData = uDoc.data();
            uName = uData.fullName || uData.name || uName;
            uPhoto = uData.profilePic || uPhoto;
        }

        activeIdentity = {
            id: user.uid,
            type: 'user',
            name: uName,
            photo: uPhoto
        };
    }

    // UI আইডেন্টিটি মেসেজ প্রদর্শন
    showActiveIdentityBanner();

    // চ্যাট সিস্টেম চালু
    setupChatApp();
});

// 📌 সক্রিয় মোড ব্যানার (ইউজারকে জানানোর জন্য)
function showActiveIdentityBanner() {
    const inputContainer = document.querySelector('.chat-input-area') || document.getElementById('messageInputField')?.parentElement;
    if (!inputContainer) return;

    let banner = document.getElementById('identityNoticeBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'identityNoticeBanner';
        banner.style.cssText = "font-size: 12px; color: #475569; background: #e2e8f0; padding: 6px 12px; border-radius: 6px; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;";
        inputContainer.parentNode.insertBefore(banner, inputContainer);
    }

    const typeText = activeIdentity.type === 'company' ? 'কোম্পানি' : 'ব্যক্তিগত অ্যাকাউন্ট';
    banner.innerHTML = `<i class="material-icons" style="font-size: 16px;">account_circle</i> আপনি বর্তমানে <b>${activeIdentity.name}</b> (${typeText}) হিসেবে উত্তর দিচ্ছেন।`;
}

function setupChatApp() {
    listenToChatList();

    if (currentChatId) {
        handleResponsiveLayoutOnOpen();
        openChat(currentChatId, currentPostId);
    }
}

// 💬 ২. ফায়ারস্টোর থেকে রিয়েলটাইম চ্যাট লিস্ট লোড
function listenToChatList() {
    const container = document.getElementById('chatListContainer');
    if (!container || !activeIdentity) return;

    // 'participants' অ্যারেতে একটিভ আইডি ধরে সার্চ
    db.collection('chats')
        .where('participants', 'array-contains', activeIdentity.id)
        .onSnapshot((snapshot) => {
            container.innerHTML = "";
            let chats = [];

            snapshot.forEach(doc => {
                const data = doc.data();

                // 🛡️ মোড সেপারেশন ফিল্টারিং
                const isForCurrentSender = (data.senderId === activeIdentity.id || data.receiverId === activeIdentity.id);
                const isDeleted = data.deletedBy && data.deletedBy.includes(activeIdentity.id);

                if (isForCurrentSender && !isDeleted) {
                    chats.push({ id: doc.id, ...data });
                }
            });

            if (chats.length === 0) {
                container.innerHTML = `<div style="padding: 20px; text-align: center; color: #94a3b8; font-size: 14px;">কোনো ইনবক্স মেসেজ নেই।</div>`;
                return;
            }

            chats.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            chats.forEach(chat => {
                const isUnread = chat.isUnread && chat.lastSenderId !== activeIdentity.id;
                const otherPartyId = (chat.senderId === activeIdentity.id) ? chat.receiverId : chat.senderId;

                const item = document.createElement('div');
                item.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
                item.id = `chat_item_${chat.id}`;

                item.innerHTML = `
                    <img src="https://via.placeholder.com/45?text=..." id="chat_img_${chat.id}">
                    <div class="chat-item-info">
                        <h4 id="chat_title_${chat.id}">লোড হচ্ছে...</h4>
                        <p style="${isUnread ? 'font-weight: bold; color: #0f172a;' : ''}">${chat.lastMessage || "কথা বলুন..."}</p>
                    </div>
                    <button class="chat-item-menu-btn" onclick="openMenu(event, '${chat.id}')">
                        <i class="material-icons">more_vert</i>
                    </button>
                    <div class="chat-dropdown" id="menu_${chat.id}">
                        <button class="chat-dropdown-item" onclick="deleteConversation(event, '${chat.id}')">
                            <i class="material-icons">delete</i> ডিলিট করুন
                        </button>
                    </div>
                `;

                container.appendChild(item);

                item.onclick = (e) => {
                    if (e.target.closest('.chat-item-menu-btn') || e.target.closest('.chat-dropdown')) return;
                    handleResponsiveLayoutOnOpen();
                    openChat(chat.id, chat.postId);
                };

                // অন্য পক্ষের প্রোফাইল লোড
                loadUserProfileOrCompany(otherPartyId, `chat_title_${chat.id}`, `chat_img_${chat.id}`);
            });
        }, err => console.error("চ্যাট লিস্ট সমস্যা:", err));
}

// 👤 ৩. কোম্পানির নাম ও ছবি সফলভাবে দেখানোর লজিক
async function loadUserProfileOrCompany(targetId, titleElemId, imgElemId) {
    if (!targetId) return;

    const titleElem = document.getElementById(titleElemId);
    const imgElem = document.getElementById(imgElemId);

    try {
        // ১. আগে কোম্পানি ডাটাবেসে খোঁজা
        const cDoc = await db.collection('companies').doc(targetId).get();
        if (cDoc.exists) {
            const data = cDoc.data();
            if (titleElem) titleElem.textContent = data.companyName || data.name || "কোম্পানি পেজ";
            if (imgElem) imgElem.src = data.logo || data.companyLogo || data.profilePic || 'https://via.placeholder.com/45?text=Company';
            return;
        }

        // ২. না পেলে ইউজার ডাটাবেসে খোঁজা
        const uDoc = await db.collection('users').doc(targetId).get();
        if (uDoc.exists) {
            const data = uDoc.data();
            if (titleElem) titleElem.textContent = data.fullName || data.name || "সম্মানিত গ্রাহক";
            if (imgElem) imgElem.src = data.profilePic || 'https://www.w3schools.com/howto/img_avatar.png';
            return;
        }

        // ৩. ফলব্যাক ব্যাকআপ নাম (যাতে 'প্রাপক' না দেখায়)
        if (titleElem) titleElem.textContent = "গ্রাহক/বিজ্ঞাপনদাতা";
        if (imgElem) imgElem.src = 'https://www.w3schools.com/howto/img_avatar.png';
    } catch (e) {
        if (titleElem) titleElem.textContent = "গ্রাহক";
    }
}

// 📖 ৪. চ্যাট বক্স ওপেন ও মেসেজ ফেচিং
async function openChat(chatId, postId) {
    currentChatId = chatId;

    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('activeChatContent').style.display = 'flex';

    document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active'));
    document.getElementById(`chat_item_${chatId}`)?.classList.add('active');

    const chatRef = db.collection('chats').doc(chatId);
    let chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
        const parts = chatId.split('_');
        const otherParty = parts.find(p => p !== activeIdentity.id) || parts[1];

        await chatRef.set({
            chatId: chatId,
            participants: Array.from(new Set([activeIdentity.id, currentUser.uid, otherParty])),
            senderId: activeIdentity.id,
            senderType: activeIdentity.type,
            receiverId: otherParty,
            postId: postId || currentPostId || "",
            lastMessage: "",
            lastSenderId: activeIdentity.id,
            deletedBy: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        chatDoc = await chatRef.get();
    } else if (chatDoc.data().isUnread && chatDoc.data().lastSenderId !== activeIdentity.id) {
        await chatRef.update({ isUnread: false });
    }

    const cData = chatDoc.data();
    const otherPartyId = (cData.senderId === activeIdentity.id) ? cData.receiverId : cData.senderId;
    loadUserProfileOrCompany(otherPartyId, 'activeChatUserName', null);

    // প্রপার্টি ইনফো কার্ড লোড
    loadPropertyHeaderCard(postId || cData.postId);

    // রিয়েলটাইম মেসেজ লিসেনার
    if (activeChatUnsubscribe) activeChatUnsubscribe();

    const display = document.getElementById('messagesDisplay');
    activeChatUnsubscribe = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot(snap => {
            display.innerHTML = "";
            snap.forEach(doc => {
                const msg = doc.data();
                const isIncoming = msg.senderId !== activeIdentity.id;

                const bubble = document.createElement('div');
                bubble.className = `msg-bubble ${isIncoming ? 'incoming' : 'outgoing'}`;

                let time = "এইমাত্র";
                if (msg.timestamp?.toDate) {
                    time = msg.timestamp.toDate().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
                }

                bubble.innerHTML = `${msg.text} <span class="msg-time">${time}</span>`;
                display.appendChild(bubble);
            });
            display.scrollTop = display.scrollHeight;
        });
}

// ✉️ ৫. মেসেজ সেন্ডিং
async function dispatchMessage(text) {
    if (!text.trim() || !currentChatId || !activeIdentity) return;

    const msg = text.trim();

    try {
        await db.collection('chats').doc(currentChatId).collection('messages').add({
            senderId: activeIdentity.id,
            senderType: activeIdentity.type,
            text: msg,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        await db.collection('chats').doc(currentChatId).update({
            lastMessage: msg,
            lastSenderId: activeIdentity.id,
            isUnread: true,
            deletedBy: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (e) {
        console.error("মেসেজ পাঠানো ব্যর্থ:", e);
    }
}

// 🏢 പ്രপার্টি কার্ড লোডার
function loadPropertyHeaderCard(postId) {
    const card = document.getElementById('activePropertyCard');
    if (!card || !postId) { if (card) card.style.display = 'none'; return; }

    card.style.display = 'flex';
    card.href = `details.html?id=${postId}`;

    db.collection('properties').doc(postId).get().then(doc => {
        if (doc.exists) {
            const p = doc.data();
            document.getElementById('activePropertyTitle').textContent = p.title || "প্রপার্টি";
            const val = p.category === 'বিক্রয়' ? p.price : p.monthlyRent;
            document.getElementById('activePropertyPrice').textContent = val ? `৳ ${val}` : "আলোচনা সাপেক্ষ";
            if (p.images?.[0]) {
                document.getElementById('activePropertyImg').src = p.images[0].url || p.images[0];
            }
        } else card.style.display = 'none';
    }).catch(() => card.style.display = 'none');
}

// 📱 রেসপন্সিভ সাহায্যকারী
function handleResponsiveLayoutOnOpen() {
    if (window.innerWidth <= 768) {
        document.getElementById('chatSidebar')?.classList.add('hidden');
        document.getElementById('chatMainBox')?.classList.add('active');
        document.body.classList.add('chat-open');
    }
}

function openMenu(e, chatId) {
    e.stopPropagation();
    document.querySelectorAll('.chat-dropdown').forEach(m => {
        if (m.id !== `menu_${chatId}`) m.classList.remove('show');
    });
    document.getElementById(`menu_${chatId}`)?.classList.toggle('show');
}

async function deleteConversation(e, chatId) {
    e.stopPropagation();
    if (!confirm("মেসেজটি মুছে ফেলতে চান?")) return;

    const ref = db.collection('chats').doc(chatId);
    const snap = await ref.get();
    if (!snap.exists) return;

    let deletedBy = snap.data().deletedBy || [];
    if (!deletedBy.includes(activeIdentity.id)) deletedBy.push(activeIdentity.id);

    await ref.update({ deletedBy });

    if (currentChatId === chatId) {
        currentChatId = null;
        document.getElementById('emptyState').style.display = 'flex';
        document.getElementById('activeChatContent').style.display = 'none';
    }
}

document.addEventListener('click', () => {
    document.querySelectorAll('.chat-dropdown').forEach(m => m.classList.remove('show'));
});

// ⌨️ ইভেন্ট লিসেনার
document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendMessageBtn');
    const inputField = document.getElementById('messageInputField');

    if (sendBtn && inputField) {
        sendBtn.onclick = () => { dispatchMessage(inputField.value); inputField.value = ""; };
        inputField.onkeypress = (e) => { if (e.key === 'Enter') { dispatchMessage(inputField.value); inputField.value = ""; } };
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
        btn.onclick = () => dispatchMessage(btn.textContent);
    });
});
