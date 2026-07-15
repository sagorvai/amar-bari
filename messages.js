// =======================================================
// 🎯 আমার বাড়ি.কম - আলটিমেট রিয়েল-টাইম চ্যাট ইঞ্জিন (অপ্টিমাইজড মোড)
// =======================================================

const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};

// ফায়ারবেস ইনিশিয়ালাইজেশন
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ইউআরএল থেকে প্যারামিটার নেওয়া
const urlParams = new URLSearchParams(window.location.search);
let currentChatId = urlParams.get('chatId');
let currentPostId = urlParams.get('postId');
let currentAction = urlParams.get('action'); 

let currentUser = null;
let activeChatListener = null;

// ১. ইউজার লগইন স্টেট পর্যবেক্ষণ ও হেডার প্রোফাইল পিকচার ইন্টিগ্রেশন
firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        console.log("লগইন করা ইউজার UID:", currentUser.uid);
        
        // হেডার প্রোফাইল পিকচার অটো-লোড
        const headerProfileImg = document.getElementById('profileImage');
        if (headerProfileImg) {
            try {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists && userDoc.data().profilePic) {
                    headerProfileImg.src = userDoc.data().profilePic;
                } else if (user.photoURL) {
                    headerProfileImg.src = user.photoURL;
                }
            } catch (error) {
                console.error("হেডার প্রোফাইল পিকচার লোড করতে ব্যর্থ:", error);
            }
        }
        
        initChatSystem();
    } else {
        alert("মেসেজ দেখতে প্রথমে লগইন করুন।");
        window.location.href = "auth.html";
    }
});

// চ্যাট সিস্টেম স্টার্ট
function initChatSystem() {
    loadChatList();

    // details.html থেকে ডাইরেক্ট আসা মোড চেক
    if (currentChatId) {
        if (currentAction === 'direct' || window.innerWidth <= 768) {
            const sidebar = document.getElementById('chatSidebar');
            const mainBox = document.getElementById('chatMainBox');
            if (sidebar) sidebar.classList.add('hidden');
            if (mainBox) mainBox.classList.add('active');
            
            // 🎯 মোবাইলে চ্যাট ডাইরেক্ট ওপেন হলে মেইন ব্যাক বাটন হাইড
            document.body.classList.add('chat-open');
        }
        openChatBox(currentChatId, currentPostId);
    }
}

// ২. বামপাশের চ্যাট লিস্ট লোড করা (থ্রি-ডট মেনু ও ডিলিট অপশন সহ)
function loadChatList() {
    const chatListContainer = document.getElementById('chatListContainer');
    if (!chatListContainer) return;

    db.collection('chats')
        .where('participants', 'array-contains', currentUser.uid)
        .onSnapshot((snapshot) => {
            
            if (snapshot.empty) {
                chatListContainer.innerHTML = `<div style="padding:20px; text-align:center; color:var(--gray);">কোনো মেসেজ পাওয়া যায়নি।</div>`;
                return;
            }

            chatListContainer.innerHTML = "";
            
            snapshot.forEach((doc) => {
                const chatData = doc.data();
                const chatId = doc.id;
                
                const otherUserId = chatData.participants ? chatData.participants.find(id => id !== currentUser.uid) : null;
                
                const chatItemDiv = document.createElement('div');
                chatItemDiv.className = `chat-item ${chatId === currentChatId ? 'active' : ''}`;
                chatItemDiv.id = `item_${chatId}`;
                
                // ডাইনামিক ড্রপডাউন ও থ্রি-ডট সহ চ্যাট আইটেম HTML গঠন
                chatItemDiv.innerHTML = `
                    <img src="https://via.placeholder.com/45/007bff/ffffff?text=U" id="avatar_${chatId}">
                    <div class="chat-item-info">
                        <h4 id="name_${chatId}">ব্যবহারকারী...</h4>
                        <p id="msg_preview_${chatId}">${chatData.lastMessage || "নতুন চ্যাট শুরু হয়েছে..."}</p>
                    </div>
                    
                    <!-- 🎯 থ্রি-ডট মেনু বাটন -->
                    <button class="chat-item-menu-btn" id="menu_btn_${chatId}">
                        <i class="material-icons" style="font-size: 20px;">more_vert</i>
                    </button>
                    
                    <!-- 🎯 ড্রপডাউন কন্টেইনার -->
                    <div class="chat-dropdown" id="dropdown_${chatId}">
                        <button class="chat-dropdown-item" id="delete_btn_${chatId}">
                            <i class="material-icons">delete</i> ডিলিট করুন
                        </button>
                    </div>
                `;
                
                chatListContainer.appendChild(chatItemDiv);

                // চ্যাট আইটেমে ক্লিক করলে চ্যাট বক্স ওপেন হবে (তবে থ্রি-ডট বাটনে ক্লিক করলে যেন চ্যাট ওপেন না হয়)
                chatItemDiv.onclick = (e) => {
                    // যদি ইউজার থ্রি-ডট বা ডিলিট বাটনে ক্লিক করে, তবে চ্যাট বক্স ওপেন হবে না
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

                // থ্রি-ডট মেনু টগল করার লজিক
                const menuBtn = chatItemDiv.querySelector(`#menu_btn_${chatId}`);
                const dropdown = chatItemDiv.querySelector(`#dropdown_${chatId}`);
                
                if (menuBtn && dropdown) {
                    menuBtn.onclick = (e) => {
                        e.stopPropagation(); // যাতে চ্যাট ওপেন ট্রিগার না হয়
                        
                        // অন্য সব খোলা ড্রপডাউন বন্ধ করা
                        document.querySelectorAll('.chat-dropdown').forEach(dd => {
                            if (dd.id !== `dropdown_${chatId}`) dd.classList.remove('show');
                        });
                        
                        // বর্তমান ড্রপডাউন টগল করা
                        dropdown.classList.toggle('show');
                    };
                }

                // চ্যাট ডিলিট করার লজিক
                const deleteBtn = chatItemDiv.querySelector(`#delete_btn_${chatId}`);
                if (deleteBtn) {
                    deleteBtn.onclick = async (e) => {
                        e.stopPropagation(); // স্টপ প্রোপাগেশন
                        dropdown.classList.remove('show');

                        const confirmDelete = confirm("আপনি কি নিশ্চিতভাবে এই চ্যাটটি ডিলিট করতে চান? (আপনার সব মেসেজ মুছে যাবে)");
                        if (confirmDelete) {
                            try {
                                // ১. চ্যাটের ভেতরের সব মেসেজ ডিলিট করা
                                const messagesSnapshot = await db.collection('chats').doc(chatId).collection('messages').get();
                                const batch = db.batch();
                                messagesSnapshot.forEach(mDoc => {
                                    batch.delete(mDoc.ref);
                                });
                                await batch.commit();

                                // ২. মূল চ্যাট ডকুমেন্টটি ডিলিট করা
                                await db.collection('chats').doc(chatId).delete();
                                
                                alert("চ্যাটটি সফলভাবে ডিলিট করা হয়েছে।");
                                
                                // যদি ডিলিট করা চ্যাটটি বর্তমানে স্ক্রিনে ওপেন থাকে, তবে স্ক্রিন খালি করা
                                if (currentChatId === chatId) {
                                    currentChatId = null;
                                    const emptyState = document.getElementById('emptyState');
                                    const activeChatContent = document.getElementById('activeChatContent');
                                    if (emptyState) emptyState.style.display = 'flex';
                                    if (activeChatContent) activeChatContent.style.display = 'none';
                                    
                                    // মোবাইলে চ্যাট ডিলিট হলে ব্যাক নিয়ে যাওয়া
                                    if (window.innerWidth <= 768) {
                                        const backBtn = document.getElementById('backToListBtn');
                                        if (backBtn) backBtn.click();
                                    }
                                }
                            } catch (error) {
                                console.error("চ্যাট ডিলিট করতে ত্রুটি:", error);
                                alert("দুঃখিত, চ্যাটটি ডিলিট করা যায়নি। আবার চেষ্টা করুন।");
                            }
                        }
                    };
                }

                if (otherUserId) {
                    db.collection('users').doc(otherUserId).get().then(uDoc => {
                        if (uDoc.exists) {
                            const uData = uDoc.data();
                            const targetName = document.getElementById(`name_${chatId}`);
                            const targetAvatar = document.getElementById(`avatar_${chatId}`);
                            
                            if (targetName) targetName.textContent = uData.fullName || uData.name || "সম্মানিত ইউজার";
                            if (uData.profilePic && targetAvatar) {
                                targetAvatar.src = uData.profilePic;
                            }
                        }
                    }).catch(err => console.error("ইউজার ডাটা লোড এরর:", err));
                }
            });
        }, (error) => {
            console.error("চ্যাট লিস্ট স্ন্যাপশট এরর:", error);
        });
}

// স্ক্রিনের অন্য কোথাও ক্লিক করলে যেন খোলা ড্রপডাউন মেনুগুলো বন্ধ হয়ে যায়
document.addEventListener('click', () => {
    document.querySelectorAll('.chat-dropdown').forEach(dd => {
        dd.classList.remove('show');
    });
});

// ৩. ডানপাশের নির্দিষ্ট চ্যাট বক্স ওপেন করা
async function openChatBox(chatId, postId) {
    currentChatId = chatId;
    
    const emptyState = document.getElementById('emptyState');
    const activeChatContent = document.getElementById('activeChatContent');
    
    if (emptyState) emptyState.style.display = 'none';
    if (activeChatContent) activeChatContent.style.display = 'flex';
    
    document.querySelectorAll('.chat-item').forEach(item => item.classList.remove('active'));
    const currentItem = document.getElementById(`item_${chatId}`);
    if (currentItem) currentItem.classList.add('active');

    // ডাটাবেজে চ্যাট ডকুমেন্টটি না থাকলে তা তৈরি করা (সেফগার্ড)
    const chatRef = db.collection('chats').doc(chatId);
    let chatDocData = null;
    try {
        const chatDoc = await chatRef.get();
        if (!chatDoc.exists) {
            const parts = chatId.split('_');
            const userA = parts[0];
            const userB = parts[1];
            
            chatDocData = {
                participants: [userA, userB],
                postId: postId || currentPostId || "",
                lastMessage: "",
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };
            await chatRef.set(chatDocData);
        } else {
            chatDocData = chatDoc.data();
        }
    } catch (e) {
        console.error("চ্যাট ইনিশিয়ালিং এরর:", e);
    }

    // প্রপার্টির মিনি কার্ড লোড করা
    loadPropertyContext(postId || currentPostId || (chatDocData ? chatDocData.postId : ""));

    // আগের কোনো লিসেনার সচল থাকলে তা রিমুভ করা
    if (activeChatListener) activeChatListener();

    // রিয়েল-টাইม মেসেজ লোড ও রেন্ডারিং
    const messagesDisplay = document.getElementById('messagesDisplay');
    const quickRepliesContainer = document.querySelector('.quick-replies');

    activeChatListener = db.collection('chats').doc(chatId).collection('messages')
        .orderBy('timestamp', 'asc')
        .onSnapshot((snapshot) => {
            if (!messagesDisplay) return;
            messagesDisplay.innerHTML = "";
            
            // চ্যাটে কোন মেসেজ আছে কিনা ট্র্যাক করার ভেরিয়েবল
            const hasMessages = !snapshot.empty;

            snapshot.forEach(doc => {
                const msg = doc.data();
                const bubble = document.createElement('div');
                const isIncoming = msg.senderId !== currentUser.uid;
                
                bubble.className = `msg-bubble ${isIncoming ? 'incoming' : 'outgoing'}`;
                
                let timeString = "এইমাত্র";
                if (msg.timestamp) {
                    const date = msg.timestamp.toDate();
                    timeString = date.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
                }

                bubble.innerHTML = `${msg.text} <span class="msg-time">${timeString}</span>`;
                messagesDisplay.appendChild(bubble);
            });

            // অটোমেটিক স্ক্রল ডাউন
            messagesDisplay.scrollTop = messagesDisplay.scrollHeight;

            // 🎯 কুইক রিপ্লাই শো/হাইড লজিক (শুধুমাত্র ভিজিটর এবং ফাকা চ্যাটের জন্য)
            const targetPostId = postId || currentPostId || (chatDocData ? chatDocData.postId : "");
            if (quickRepliesContainer) {
                if (hasMessages || !targetPostId) {
                    // চ্যাটে মেসেজ থাকলে অথবা পোস্ট আইডি না থাকলে হাইড হবে
                    quickRepliesContainer.style.display = 'none';
                } else {
                    // প্রপার্টি ডকুমেন্ট থেকে পোস্ট দাতা কে তা খুঁজে বের করা
                    db.collection('properties').doc(targetPostId).get().then(pDoc => {
                        if (pDoc.exists) {
                            const propertyData = pDoc.data();
                            // যদি কারেন্ট ইউজার পোস্ট দাতা (owner/seller) হন, তবে কুইক রিপ্লাই লুকানো থাকবে
                            if (propertyData.userId === currentUser.uid) {
                                quickRepliesContainer.style.display = 'none';
                            } else {
                                // যদি কারেন্ট ইউজার ভিজিটর (ক্রেতা) হন, এবং চ্যাটে কোনো মেসেজ না থাকে
                                quickRepliesContainer.style.display = 'flex';
                            }
                        } else {
                            quickRepliesContainer.style.display = 'none';
                        }
                    }).catch(() => {
                        quickRepliesContainer.style.display = 'none';
                    });
                }
            }

        }, (err) => console.error("মেসেজ লোড এরর:", err));

    // চ্যাট হেডারে অপরপক্ষের নাম সেট করা
    const parts = chatId.split('_');
    const otherUserId = parts.find(id => id !== currentUser.uid && id !== postId && id !== currentPostId);
    if (otherUserId) {
        db.collection('users').doc(otherUserId).get().then(uDoc => {
            const headerName = document.getElementById('activeChatUserName');
            if (uDoc.exists && headerName) {
                headerName.textContent = uDoc.data().fullName || uDoc.data().name || "ব্যবহারকারী";
            }
        }).catch(err => console.error(err));
    }
                                                    }

// ৪. মেসেজ পাঠানো লজিক (লাস্ট সেন্ডার আইডি ট্র্যাকিং সহ আপডেট করা হলো)
async function sendMessage(text) {
    if (!text.trim() || !currentChatId) return;

    const cleanText = text.trim();
    const messageData = {
        senderId: currentUser.uid,
        text: cleanText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        // ১. মেসেজ সাব-কালেকশনে নতুন মেসেজ অ্যাড করা
        await db.collection('chats').doc(currentChatId).collection('messages').add(messageData);
        
        // ২. মূল চ্যাট ডকুমেন্টে লাইভ কাউন্টের জন্য ট্র্যাকিং ডাটা আপডেট করা
        await db.collection('chats').doc(currentChatId).update({
            lastMessage: cleanText,
            lastSenderId: currentUser.uid,             // 🎯 কারেন্ট ইউজারের আইডি ট্র্যাক করবে
            isUnread: true,                           // 🎯 চ্যাটটি আনরিড হিসেবে চিহ্নিত করবে
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error("মেসেজ পাঠাতে সমস্যা হয়েছে:", error);
    }
}

// ৫. মেসেজের ভেতরে প্রপার্টি মিনি কার্ড লোড করা
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
                document.getElementById('activePropertyImg').src = data.images[0].url || data.images[0];
            }
        } else {
            card.style.display = 'none';
        }
    }).catch(() => card.style.display = 'none');
}

// DOM ইভেন্ট লিসেনার ও কিবোর্ড ভিউপোর্ট ফিক্সিং
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

        // 🎯 অ্যান্ড্রয়েড ক্রোম কিবোর্ড অন হলে স্ক্রোল ফিক্স
        inputField.addEventListener('focus', () => {
            setTimeout(() => {
                inputField.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 300);
        });
    }

    // ৩টি কুইক রিপ্লাই কোয়েরি একশন লিসেনার
    const quickRepliesContainer = document.querySelector('.quick-replies');
    if (quickRepliesContainer) {
        quickRepliesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('quick-btn')) {
                sendMessage(e.target.textContent);
            }
        });
    }

    // 🎯 ক্রোম ব্রাউজারে কিবোর্ড অন/অফ ট্র্যাকিং ও স্ক্রিন রিসাইজ ফিক্স
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
    
    // মোবাইলের ভেতরের ব্যাক বাটন লজিক (লিস্টে ফিরলে মেইন বাটন আবার শো করবে)
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
