// messages.js - রিয়েল-টাইম চ্যাট ইঞ্জিন (পার্সোনাল ও কোম্পানি মোড সাপোর্টসহ)
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
let currentAction = urlParams.get('action'); 

let currentUser = null;
let activeIdentity = null; // { id: '...', name: '...', photo: '...', type: 'user'|'company' }
let activeChatListener = null;

function getChatId(uid1, uid2) {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// 🔄 ১. ইউজার ও কোম্পানি আইডেন্টিটি ইনিশিয়ালাইজেশন
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        const activeIdentityType = localStorage.getItem('activeIdentityType') || 'user';

        if (activeIdentityType === 'company') {
            try {
                const compDoc = await db.collection('companies').doc(user.uid).get();
                if (compDoc.exists) {
                    const cData = compDoc.data();
                    activeIdentity = {
                        id: cData.companyId || user.uid,
                        ownerUid: user.uid,
                        name: cData.name || cData.companyName || "অফিসিয়াল পেজ",
                        photo: cData.logo || 'https://via.placeholder.com/45?text=Page',
                        type: 'company'
                    };
                }
            } catch (e) {
                console.error("কোম্পানি প্রোফাইল লোড এরর:", e);
            }
        }

        // কোম্পানি মোডে না থাকলে পার্সোনাল প্রোফাইল সেট হবে
        if (!activeIdentity) {
            let pName = "সম্মানিত ইউজার";
            let pPhoto = user.photoURL || 'https://www.w3schools.com/howto/img_avatar.png';
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    const uData = userDoc.data();
                    pName = uData.fullName || uData.name || pName;
                    pPhoto = uData.profilePic || pPhoto;
                }
            } catch (e) {
                console.error("ইউজার প্রোফাইল লোড এরর:", e);
            }

            activeIdentity = {
                id: user.uid,
                ownerUid: user.uid,
                name: pName,
                photo: pPhoto,
                type: 'user'
            };
        }

        // হেডার প্রোফাইল পিকচার সেট
        const headerProfileImg = document.getElementById('profileImage');
        if (headerProfileImg) {
            headerProfileImg.src = activeIdentity.photo;
        }

        initChatSystem();
    } else {
        alert("মেসেজ দেখতে প্রথমে লগইন করুন।");
        window.location.href = "auth.html";
    }
});

function initChatSystem() {
    loadChatList();

    if (currentChatId) {
        if (currentAction === 'direct' || window.innerWidth <= 768) {
            const sidebar = document.getElementById('chatSidebar');
            const mainBox = document.getElementById('chatMainBox');
            if (sidebar) sidebar.classList.add('hidden');
            if (mainBox) mainBox.classList.add('active');
            
            document.body.classList.add('chat-open');
        }
        openChatBox(currentChatId, currentPostId);
    }
}

// 💬 ২. চ্যাট তালিকা লোড (ইউজার এবং কোম্পানি ফিল্টারিং সহ)
function loadChatList() {
    const chatListContainer = document.getElementById('chatListContainer');
    if (!chatListContainer) return;

    db.collection('chats')
        .where('participants', 'array-contains', activeIdentity.id)
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            
            if (snapshot.empty) {
                chatListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--gray);">কোনো মেসেজ পাওয়া যায়নি।</div>`;
                return;
            }

            chatListContainer.innerHTML = "";
            
            snapshot.forEach((doc) => {
                const chatData = doc.data();
                const chatId = doc.id;
                
                const otherParticipantId = chatData.participants ? chatData.participants.find(id => id !== activeIdentity.id) : null;
                const isUnreadMessage = chatData.isUnread && chatData.lastSenderId !== activeIdentity.id;
                const unreadClass = isUnreadMessage ? 'unread-chat' : '';

                const chatItemDiv = document.createElement('div');
                chatItemDiv.className = `chat-item ${chatId === currentChatId ? 'active' : ''} ${unreadClass}`;
                chatItemDiv.id = `item_${chatId}`;
                
                chatItemDiv.innerHTML = `
                    <img src="https://via.placeholder.com/45/007bff/ffffff?text=U" id="avatar_${chatId}">
                    <div class="chat-item-info">
                        <h4 id="name_${chatId}">লোড হচ্ছে...</h4>
                        <p id="msg_preview_${chatId}" style="${isUnreadMessage ? 'font-weight: bold; color: #1e293b;' : ''}">${chatData.lastMessage || "নতুন চ্যাট শুরু হয়েছে..."}</p>
                    </div>
                    
                    ${isUnreadMessage ? `<span class="unread-dot" style="width: 8px; height: 8px; background-color: #007bff; border-radius: 50%; margin-right: 8px;"></span>` : ''}

                    <button class="chat-item-menu-btn" id="menu_btn_${chatId}">
                        <i class="material-icons" style="font-size: 20px;">more_vert</i>
                    </button>
                    
                    <div class="chat-dropdown" id="dropdown_${chatId}">
                        <button class="chat-dropdown-item" id="delete_btn_${chatId}">
                            <i class="material-icons">delete</i> ডিলিট করুন
                        </button>
                    </div>
                `;
                
                chatListContainer.appendChild(chatItemDiv);

                chatItemDiv.onclick = (e) => {
                    if (e.target.closest('.chat-item-menu-btn') || e.target.closest('.chat-dropdown')) {
                        return; 
                    }

                    const sidebar = document.getElementById('chatSidebar');
                    const mainBox = document.getElementById('chatMainBox');
                    
                    if (window.innerWidth <= 768) {
                        if (sidebar) sidebar.classList.add('hidden');
                        if (mainBox) mainBox.classList.add('active');
                        document.body.classList.add('chat-open');
                    }
                    
                    openChatBox(chatId, chatData.postId);
                };

                const menuBtn = chatItemDiv.querySelector(`#menu_btn_${chatId}`);
                const dropdown = chatItemDiv.querySelector(`#dropdown_${chatId}`);
                
                if (menuBtn && dropdown) {
                    menuBtn.onclick = (e) => {
                        e.stopPropagation(); 
                        document.querySelectorAll('.chat-dropdown').forEach(dd => {
                            if (dd.id !== `dropdown_${chatId}`) dd.classList.remove('show');
                        });
                        dropdown.classList.toggle('show');
                    };
                }

                const deleteBtn = chatItemDiv.querySelector(`#delete_btn_${chatId}`);
                if (deleteBtn) {
                    deleteBtn.onclick = async (e) => {
                        e.stopPropagation(); 
                        dropdown.classList.remove('show');

                        const confirmDelete = confirm("আপনি কি নিশ্চিতভাবে এই চ্যাটটি ডিলিট করতে চান?");
                        if (confirmDelete) {
                            try {
                                const messagesSnapshot = await db.collection('chats').doc(chatId).collection('messages').get();
                                const batch = db.batch();
                                messagesSnapshot.forEach(mDoc => batch.delete(mDoc.ref));
                                await batch.commit();

                                await db.collection('chats').doc(chatId).delete();
                                alert("চ্যাটটি সফলভাবে ডিলিট করা হয়েছে।");
                                
                                if (currentChatId === chatId) {
                                    currentChatId = null;
                                    document.getElementById('emptyState').style.display = 'flex';
                                    document.getElementById('activeChatContent').style.display = 'none';
                                }
                            } catch (error) {
                                console.error("চ্যাট ডিলিট ত্রুটি:", error);
                            }
                        }
                    };
                }

                // 👤/🏢 অপর পাশের পার্টি চ্যাট ইনফো লোড
                if (otherParticipantId) {
                    fetchParticipantDetails(otherParticipantId, `name_${chatId}`, `avatar_${chatId}`);
                }
            });
        }, (error) => {
            console.error("চ্যাট লিস্ট স্ন্যাপশট এরর:", error);
        });
}

document.addEventListener('click', () => {
    document.querySelectorAll('.chat-dropdown').forEach(dd => dd.classList.remove('show'));
});

// 📖 ৩. চ্যাট বক্স ওপেন ও মেসেজ ফেচিং
async function openChatBox(chatId, postId) {
    currentChatId = chatId;
    
    const emptyState = document.getElementById('emptyState');
    const activeChatContent = document.getElementById('activeChatContent');
    
    if (emptyState) emptyState.style.display = 'none';
    if (activeChatContent) activeChatContent.style.display = 'flex';
    
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    const currentItem = document.getElementById(`item_${chatId}`);
    if (currentItem) currentItem.classList.add('active');

    const chatRef = db.collection('chats').doc(chatId);
    let chatDocData = null;

    try {
        const chatDoc = await chatRef.get();
        if (!chatDoc.exists) {
            const parts = chatId.split('_');
            chatDocData = {
                participants: [parts[0], parts[1]],
                postId: postId || currentPostId || "",
                lastMessage: "",
                lastSenderId: activeIdentity.id,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            await chatRef.set(chatDocData);
        } else {
            chatDocData = chatDoc.data();
            if (chatDocData.isUnread && chatDocData.lastSenderId !== activeIdentity.id) {
                await chatRef.update({ isUnread: false });
            }
        }
    } catch (e) {
        console.error("চ্যাট ইনিশিয়ালিং এরর:", e);
    }

    loadPropertyContext(postId || currentPostId || (chatDocData ? chatDocData.postId : ""));

    if (activeChatListener) activeChatListener();

    const messagesDisplay = document.getElementById('messagesDisplay');
    const quickRepliesContainer = document.querySelector('.quick-replies');

    activeChatListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            if (!messagesDisplay) return;
            messagesDisplay.innerHTML = "";
            
            const hasMessages = !snapshot.empty;

            snapshot.forEach(doc => {
                const msg = doc.data();
                const bubble = document.createElement('div');
                const isIncoming = msg.senderId !== activeIdentity.id;
                
                bubble.className = `msg-bubble ${isIncoming ? 'incoming' : 'outgoing'}`;
                
                let timeString = "এইমাত্র";
                if (msg.timestamp && typeof msg.timestamp.toDate === 'function') {
                    try {
                        const date = msg.timestamp.toDate();
                        timeString = date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
                    } catch(e) {
                        timeString = "এইমাত্র";
                    }
                }

                bubble.innerHTML = `${msg.text} <span class="msg-time">${timeString}</span>`;
                messagesDisplay.appendChild(bubble);
            });

            messagesDisplay.scrollTop = messagesDisplay.scrollHeight;

            const targetPostId = postId || currentPostId || (chatDocData ? chatDocData.postId : "");
            if (quickRepliesContainer) {
                if (hasMessages || !targetPostId) {
                    quickRepliesContainer.style.display = 'none';
                } else {
                    db.collection('properties').doc(targetPostId).get().then(pDoc => {
                        if (pDoc.exists) {
                            const propertyData = pDoc.data();
                            if (propertyData.userId === currentUser.uid || propertyData.companyId === activeIdentity.id) {
                                quickRepliesContainer.style.display = 'none';
                            } else {
                                quickRepliesContainer.style.display = 'flex';
                            }
                        } else {
                            quickRepliesContainer.style.display = 'none';
                        }
                    }).catch(() => quickRepliesContainer.style.display = 'none');
                }
            }

        }, (err) => console.error("মেসেজ লোড এরর:", err));

    const parts = chatId.split('_');
    const otherParticipantId = parts.find(id => id !== activeIdentity.id);
    if (otherParticipantId) {
        fetchParticipantDetails(otherParticipantId, 'activeChatUserName', null);
    }
}

// ✉️ ৪. মেসেজ সেন্ডিং
async function sendMessage(text) {
    if (!text.trim() || !currentChatId) return;

    const cleanText = text.trim();
    const messageData = {
        senderId: activeIdentity.id,
        senderType: activeIdentity.type,
        text: cleanText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('chats').doc(currentChatId).collection('messages').add(messageData);
        
        await db.collection('chats').doc(currentChatId).update({
            lastMessage: cleanText,
            lastSenderId: activeIdentity.id,             
            isUnread: true,                           
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("মেসেজ পাঠাতে সমস্যা হয়েছে:", error);
    }
}

// 🔍 ৫. সাহায্যকারী সার্ভিস: ইউজার বা কোম্পানি ডাটা বের করা
async function fetchParticipantDetails(participantId, nameElemId, avatarElemId) {
    try {
        // ১. আগে ইউজার কালেকশনে খোঁজা
        let uDoc = await db.collection('users').doc(participantId).get();
        if (uDoc.exists) {
            const uData = uDoc.data();
            if (nameElemId && document.getElementById(nameElemId)) document.getElementById(nameElemId).textContent = uData.fullName || uData.name || "সম্মানিত ইউজার";
            if (avatarElemId && document.getElementById(avatarElemId) && uData.profilePic) document.getElementById(avatarElemId).src = uData.profilePic;
            return;
        }

        // ২. না পাওয়া গেলে কোম্পানি কালেকশনে খোঁজা
        let cDoc = await db.collection('companies').doc(participantId).get();
        if (!cDoc.exists) {
            const qSnap = await db.collection('companies').where('companyId', '==', participantId).limit(1).get();
            if (!qSnap.empty) cDoc = qSnap.docs[0];
        }

        if (cDoc && cDoc.exists) {
            const cData = cDoc.data();
            if (nameElemId && document.getElementById(nameElemId)) document.getElementById(nameElemId).textContent = cData.name || cData.companyName || "কোম্পানি পেজ";
            if (avatarElemId && document.getElementById(avatarElemId) && cData.logo) document.getElementById(avatarElemId).src = cData.logo;
        }
    } catch (e) {
        console.error("পার্টিসিপ্যান্ট তথ্য লোড সমস্যা:", e);
    }
}

function loadPropertyContext(postId) {
    const card = document.getElementById('activePropertyCard');
    if (!card) return;
    if (!postId) {
        card.style.display = 'none';
        return;
    }
    card.style.display = 'flex';
    card.href = `details.html?id=${postId}`;

    db.collection('properties').doc(postId).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById('activePropertyTitle').textContent = data.title || "প্রপার্টি";
            let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
            document.getElementById('activePropertyPrice').textContent = amount ? `৳ ${amount}` : "আলোচনা সাপেক্ষ";
            
            if (data.images && data.images.length > 0) {
                const firstImg = data.images[0];
                document.getElementById('activePropertyImg').src = firstImg.url || firstImg;
            }
        } else {
            card.style.display = 'none';
        }
    }).catch(() => card.style.display = 'none');
}

document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('sendMessageBtn');
    const inputField = document.getElementById('messageInputField');

    if (sendBtn && inputField) {
        sendBtn.onclick = () => {
            sendMessage(inputField.value);
            inputField.value = "";
        };

        inputField.onkeypress = (e) => {
            if (e.key === 'Enter') {
                sendMessage(inputField.value);
                inputField.value = "";
            }
        };

        inputField.addEventListener('focus', () => {
            setTimeout(() => {
                inputField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    }

    const quickRepliesContainer = document.querySelector('.quick-replies');
    if (quickRepliesContainer) {
        quickRepliesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-btn')) {
                sendMessage(e.target.textContent);
            }
        });
    }

    if (window.visualViewport) {
        const chatMain = document.getElementById('chatMainBox');
        window.visualViewport.addEventListener('resize', () => {
            if (window.innerWidth <= 768 && chatMain && chatMain.classList.contains('active')) {
                chatMain.style.height = `${window.visualViewport.height - 60}px`;
                const messagesDisplay = document.getElementById('messagesDisplay');
                if (messagesDisplay) messagesDisplay.scrollTop = messagesDisplay.scrollHeight;
            }
        });
    }
    
    const backBtn = document.getElementById('backToListBtn');
    if (backBtn) {
        backBtn.onclick = () => {
            document.getElementById('chatMainBox').classList.remove('active');
            document.getElementById('chatSidebar').classList.remove('hidden');
            document.body.classList.remove('chat-open');
            
            if (currentAction === 'direct') {
                window.history.pushState({}, document.title, "messages.html");
                currentAction = null;
            }
        };
    }
});

function sendQuickReply(text) {
    sendMessage(text);
                                   }
