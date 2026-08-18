// messages.js - Optimized Dual-Mode Realtime Messaging Engine
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

// Global States
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

    // header-sync.js এর গ্লোবাল এক্টিভ আইডেন্টিটি ব্যবহার করা হচ্ছে
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

    // ব্যাকআপ fallback (যদি header-sync লোড না হয়)
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

    // হেডার প্রোফাইল ছবি আপডেট
    const headerProfileImg = document.getElementById('profileImage');
    if (headerProfileImg && activeSender.photo) {
        headerProfileImg.src = activeSender.photo;
    }

    renderIdentityBadge();
    initChatSystem();
});

// 📌 মোড নির্দেশক ব্যাজ
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

// 💬 ২. ইনবক্স ফিল্টারিং (লগইন করা ইউজারের Auth UID ও Active ID দিয়ে নিরাপদ ফিল্টারিং)
function loadChatList() {
    const chatListContainer = document.getElementById('chatListContainer');
    if (!chatListContainer || !activeSender || !currentUser) return;

    // Security Rule পাসের জন্য সর্বদাই currentUser.uid দিয়ে Query করা হবে
    db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot((snapshot) => {
            chatListContainer.innerHTML = "";
            let chatDocs = [];

            snapshot.forEach(doc => {
                const data = doc.data();

                // 🎯 নিখুঁত মোড লজিক:
                // বর্তমান activeSender.id চ্যাটের senderId অথবা receiverId এর সাথে মিলতে হবে।
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

            // সময় অনুযায়ী সাজানো
            chatDocs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

            chatDocs.forEach((chatData) => {
                const chatId = chatData.id;

                // অপর পক্ষের ID সঠিকভাবে নির্ধারণ
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

                // অপর পক্ষের প্রফেশনাল নাম ও ছবি ফেচ করা
                fetchIdentityDetails(otherPartyId, `name_${chatId}`, `avatar_${chatId}`);
            });
        }, (error) => {
            console.error("চ্যাট লোড করার এরর:", error);
            chatListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:red; font-size:13px;">মেসেজ লোড করতে সমস্যা হয়েছে।</div>`;
        });
}

// 👤/🏢 ৩. অপর পক্ষের সঠিক নাম ও ছবি আনার সম্পূর্ণ নিখুঁত ফাংশন
async function fetchIdentityDetails(targetId, nameElemId, avatarElemId) {
    if (!targetId) return;

    const nameElem = document.getElementById(nameElemId);
    const avatarElem = document.getElementById(avatarElemId);

    try {
        // 🔹 ধাপ ১: আগে 'users' কালেকশনে চেক করা (User Document ID দিয়ে)
        let uDoc = await db.collection('users').doc(targetId).get();
        if (uDoc.exists) {
            const uData = uDoc.data();
            if (nameElem) nameElem.textContent = uData.fullName || uData.name || uData.displayName || "গ্রাহক";
            if (avatarElem && avatarElemId) avatarElem.src = uData.profilePic || uData.photoURL || 'https://www.w3schools.com/howto/img_avatar.png';
            return;
        }

        // 🔹 ধাপ ২: 'companies' কালেকশনে সরাসরি Document ID দিয়ে চেক করা
        let cDoc = await db.collection('companies').doc(targetId).get();
        if (cDoc.exists) {
            const cData = cDoc.data();
            if (nameElem) nameElem.textContent = cData.name || cData.companyName || cData.pageName || "কোম্পানি পেজ";
            if (avatarElem && avatarElemId) avatarElem.src = cData.logo || cData.companyLogo || cData.profilePic || 'https://via.placeholder.com/45?text=Page';
            return;
        }

        // 🔹 ধাপ ৩: কোম্পানি কালেকশনের ভেতর 'companyId' ফিল্ডের সাথে মিল থাকলে
        let compQueryById = await db.collection('companies').where('companyId', '==', targetId).limit(1).get();
        if (!compQueryById.empty) {
            const cData = compQueryById.docs[0].data();
            if (nameElem) nameElem.textContent = cData.name || cData.companyName || cData.pageName || "কোম্পানি পেজ";
            if (avatarElem && avatarElemId) avatarElem.src = cData.logo || cData.companyLogo || cData.profilePic || 'https://via.placeholder.com/45?text=Page';
            return;
        }

        // 🔹 ধাপ ৪: 'ownerUid' (মালিকের UID) দিয়ে কোম্পানি খোঁজা
        let compQueryByOwner = await db.collection('companies').where('ownerUid', '==', targetId).limit(1).get();
        if (!compQueryByOwner.empty) {
            const cData = compQueryByOwner.docs[0].data();
            if (nameElem) nameElem.textContent = cData.name || cData.companyName || cData.pageName || "কোম্পানি পেজ";
            if (avatarElem && avatarElemId) avatarElem.src = cData.logo || cData.companyLogo || cData.profilePic || 'https://via.placeholder.com/45?text=Page';
            return;
        }

        // 🔹 ধাপ ৫: যদি কিছুই না পাওয়া যায়
        if (nameElem) nameElem.textContent = "বিজ্ঞাপনদাতা";
        if (avatarElem && avatarElemId) avatarElem.src = 'https://www.w3schools.com/howto/img_avatar.png';

    } catch (err) {
        console.error("আইডেন্টিটি ফেচিং ত্রুটি:", err);
        if (nameElem) nameElem.textContent = "গ্রাহক";
    }
        }

// 📖 ৪. চ্যাট বক্স ওপেন ও রিয়েলটাইম মেসেজ প্রদর্শন
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
        console.warn("চ্যাট রুম পাওয়া যায়নি। সঠিক আইডি লিংক ব্যবহার করুন।");
        return;
    }

    const cData = chatDoc.data();

    // চ্যাট পড়া হয়ে গেলে isUnread আপডেট
    if (cData.isUnread && cData.lastSenderId !== activeSender.id) {
        await chatRef.update({ isUnread: false });
    }

    // অপর পক্ষের আইডি বের করা
    const otherPartyId = (cData.senderId === activeSender.id) ? cData.receiverId : cData.senderId;

    // হেডার প্রোফাইল নাম আপডেট
    fetchIdentityDetails(otherPartyId, 'activeChatUserName', null);

    // প্রপার্টি ইনফরমেশন লোড
    loadPropertyContext(postId || cData.postId);

    // মেসেজ সাবস্ক্রিপশন (রিয়েলটাইম শুনবে)
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

// ✉️ ৫. মেসেজ সেন্ড ও স্মার্ট পুশ নোটিফিকেশন লজিক
async function sendMessage(text) {
    if (!text.trim() || !currentChatId || !activeSender) return;

    const cleanText = text.trim();

    try {
        // ১. মেসেজ সাব-কালেকশনে যোগ করা
        await db.collection('chats').doc(currentChatId).collection('messages').add({
            senderId: activeSender.id,
            senderType: activeSender.type,
            text: cleanText,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // ২. চ্যাট ডকুমেন্টের লাস্ট মেসেজ আপডেট
        const chatDocRef = db.collection('chats').doc(currentChatId);
        const chatSnapshot = await chatDocRef.get();
        
        if (!chatSnapshot.exists) return;
        const chatData = chatSnapshot.data();

        await chatDocRef.update({
            lastMessage: cleanText,
            lastSenderId: activeSender.id,
            isUnread: true,
            deletedBy: [],
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // ৩. প্রাপকের (Receiver) সঠিক আইডি বের করা
        const receiverId = (chatData.senderId === activeSender.id) ? chatData.receiverId : chatData.senderId;

        // ৪. অ্যাপের ভেতরে ইন-অ্যাপ নোটিফিকেশন সংরক্ষণ করা (notifications কালেকশন)
        await db.collection("notifications").add({
            userId: receiverId,                  // কোম্পানি বা ইউজার যার কাছে যাবে
            title: activeSender.name,             // 🎯 সঠিক নাম (কোম্পানি হলে কোম্পানির নাম, ইউজার হলে ইউজারের নাম)
            message: cleanText,
            type: "chat",
            chatId: currentChatId,
            postId: chatData.postId || '',
            senderName: activeSender.name,       // 🎯 প্রেরকের নাম
            isRead: false,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });

        // 🎯 ৫. পুশ নোটিফিকেশনের জন্য প্রাপকের মূল User UID ও FCM Token বের করা
        let targetUserUid = receiverId;

        // যদি প্রাপক একটি কোম্পানি আইডি হয়, তবে তার ownerUid খুঁজে বের করবে
        const compDoc = await db.collection('companies').doc(receiverId).get();
        if (compDoc.exists) {
            targetUserUid = compDoc.data().ownerUid || receiverId;
        }

        // মূল ইউজারের প্রোফাইল থেকে FCM Token সংগ্রহ
        const userDoc = await db.collection('users').doc(targetUserUid).get();
        if (userDoc.exists && userDoc.data().fcmToken) {
            const fcmToken = userDoc.data().fcmToken;
            
            // পুশ নোটিফিকেশন ফাংশন কল (Cloud Function বা আপনার FCM API Trigger)
            sendPushNotificationTrigger(fcmToken, activeSender.name, cleanText, currentChatId, chatData.postId);
        }

    } catch (e) {
        console.error("মেসেজ পাঠাতে সমস্যা:", e);
    }
}

// 🚀 FCM পুশ নোটিফিকেশন পাঠানোর হেলপার ফাংশন
function sendPushNotificationTrigger(token, title, body, chatId, postId) {
    // যদি আপনার ব্যাকএন্ড/ক্লাউড ফাংশন থাকে বা সরাসরি API কল করেন:
    console.log(`📡 পুশ নোটিফিকেশন পাঠানো হচ্ছে -> টোকেন: ${token}`);
    console.log(`🏷️ টাইটেল/নাম: ${title}`);
    console.log(`💬 মেসেজ: ${body}`);
    
    /* 
       উদাহরণ (যদি কোনো API বা Cloud Function URL থাকে):
       fetch('https://your-cloud-function-url/sendPush', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({
               token: token,
               title: title, // এখানে কোম্পানির নাম বা প্রেরকের নাম যাবে
               body: body,
               clickAction: `messages.html?chatId=${chatId}&postId=${postId || ''}`
           })
       });
    */
        }

// 🏢 প্রপার্টি কার্ড ডিসপ্লে
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

// 📱 মোবাইল লেআউট কন্ট্রোল
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

// ⌨️ DOM Event Listeners
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
