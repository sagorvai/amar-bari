// messages.js - Optimized Dual-Mode Realtime Messaging Engine
// AmarBari / আমার বাড়ি.কম
// Firebase v8.x compatible

const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const db = firebase.firestore();

// ============================================================
// URL Parameters
// ============================================================
const urlParams = new URLSearchParams(window.location.search);
let currentChatId = urlParams.get("chatId");
let currentPostId = urlParams.get("postId");

// ============================================================
// Global States
// ============================================================
let currentUser = null;
let activeSender = null; // { id, type: 'user'|'company', name, photo }
let activeChatListener = null;
let chatListUnsubscribe = null;
let authReady = false;
let identityReady = false;
let chatSystemInitialized = false;

// ============================================================
// Constants / Helpers
// ============================================================
const DEFAULT_USER_AVATAR =
    "https://www.w3schools.com/howto/img_avatar.png";

const DEFAULT_COMPANY_AVATAR =
    "https://via.placeholder.com/45?text=Page";

function safeText(value, fallback = "") {
    if (value === null || value === undefined) return fallback;
    return String(value);
}

function getUserName(data) {
    return data?.fullName || data?.name || data?.displayName || "গ্রাহক";
}

function getUserPhoto(data) {
    return data?.profilePic || data?.photoURL || DEFAULT_USER_AVATAR;
}

function getCompanyName(data) {
    return data?.companyName || data?.name || data?.pageName || "কোম্পানি পেজ";
}

function getCompanyPhoto(data) {
    return data?.logo || data?.companyLogo || data?.profilePic || DEFAULT_COMPANY_AVATAR;
}

// Safely render message text without allowing HTML/JS injection.
function appendMessageBubble(container, text, timeStr, isIncoming) {
    const bubble = document.createElement("div");
    bubble.className = `msg-bubble ${isIncoming ? "incoming" : "outgoing"}`;

    const messageText = document.createElement("span");
    messageText.className = "msg-text";
    messageText.textContent = safeText(text);

    const time = document.createElement("span");
    time.className = "msg-time";
    time.textContent = timeStr;

    bubble.appendChild(messageText);
    bubble.appendChild(time);
    container.appendChild(bubble);
}

function setImageSafely(img, url, fallback) {
    if (!img) return;

    const finalUrl = safeText(url, fallback);

    img.onerror = () => {
        img.onerror = null;
        img.src = fallback;
    };

    img.src = finalUrl;
}

function getChatCounterpartType(chatData, activeId) {
    if (!chatData || !activeId) return null;

    if (chatData.senderId === activeId) {
        return chatData.receiverType || null;
    }

    if (chatData.receiverId === activeId) {
        return chatData.senderType || null;
    }

    return null;
}

// ============================================================
// 1. Current User + Active Identity
// ============================================================
firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
        window.location.href = "auth.html";
        return;
    }

    currentUser = user;
    authReady = true;

    await resolveActiveIdentity();

    if (!activeSender) {
        // Final safe fallback: Firebase user account.
        activeSender = {
            id: user.uid,
            type: "user",
            name: user.displayName || "ইউজার",
            photo: user.photoURL || DEFAULT_USER_AVATAR
        };
    }

    identityReady = true;

    // Header profile image
    const headerProfileImg = document.getElementById("profileImage");
    if (headerProfileImg && activeSender.photo) {
        setImageSafely(
            headerProfileImg,
            activeSender.photo,
            activeSender.type === "company"
                ? DEFAULT_COMPANY_AVATAR
                : DEFAULT_USER_AVATAR
        );
    }

    renderIdentityBadge();
    initChatSystem();
});

// Resolve the currently selected User/Company identity.
async function resolveActiveIdentity() {
    activeSender = null;

    // 1. Prefer header-sync.js active identity when available.
    if (typeof window.getActiveIdentity === "function") {
        try {
            const identity = window.getActiveIdentity();

            if (identity && identity.id) {
                activeSender = {
                    id: identity.id,
                    type: identity.type === "company" ? "company" : "user",
                    name:
                        identity.name ||
                        (identity.type === "company"
                            ? "কোম্পানি পেজ"
                            : "ইউজার"),
                    photo:
                        identity.avatar ||
                        (identity.type === "company"
                            ? DEFAULT_COMPANY_AVATAR
                            : DEFAULT_USER_AVATAR)
                };
            }
        } catch (e) {
            console.warn(
                "getActiveIdentity() থেকে identity নেওয়া যায়নি:",
                e
            );
        }
    }

    // 2. Backup: localStorage company mode.
    if (!activeSender) {
        const activeMode =
            localStorage.getItem("activeIdentityType") || "user";

        if (activeMode === "company") {
            const savedCompanyId =
                localStorage.getItem("activeCompanyId");

            if (savedCompanyId) {
                try {
                    const compDoc = await db
                        .collection("companies")
                        .doc(savedCompanyId)
                        .get();

                    if (compDoc.exists) {
                        const cData = compDoc.data();

                        activeSender = {
                            id: compDoc.id,
                            type: "company",
                            name: getCompanyName(cData),
                            photo: getCompanyPhoto(cData)
                        };
                    }
                } catch (e) {
                    console.error(
                        "কোম্পানি ডাটা লোড সমস্যা:",
                        e
                    );
                }
            }
        }
    }

    // 3. Final user fallback.
    if (!activeSender && currentUser) {
        activeSender = {
            id: currentUser.uid,
            type: "user",
            name: currentUser.displayName || "ইউজার",
            photo: currentUser.photoURL || DEFAULT_USER_AVATAR
        };
    }
}

// ============================================================
// 2. Identity Mode Badge
// ============================================================
function renderIdentityBadge() {
    const chatInputArea =
        document.querySelector(".chat-input-area") ||
        document.getElementById("messageInputField")?.parentElement;

    if (!chatInputArea || !activeSender) return;

    let badge =
        document.getElementById("activeIdentityBadge");

    if (!badge) {
        badge = document.createElement("div");
        badge.id = "activeIdentityBadge";
        badge.style.cssText =
            "font-size:11px;color:#475569;background:#e2e8f0;padding:4px 10px;border-radius:4px;margin-bottom:6px;display:inline-flex;align-items:center;gap:5px;border-left:3px solid #007bff;";

        chatInputArea.parentNode.insertBefore(
            badge,
            chatInputArea
        );
    }

    const typeLabel =
        activeSender.type === "company"
            ? "কোম্পানি পেজ"
            : "ইউজার অ্যাকাউন্ট";

    // Use DOM nodes instead of innerHTML for the dynamic identity name.
    badge.replaceChildren();

    const icon = document.createElement("i");
    icon.className = "material-icons";
    icon.style.fontSize = "13px";
    icon.textContent = "account_circle";

    const youText =
        document.createTextNode(" আপনি ");

    const name = document.createElement("b");
    name.textContent = safeText(
        activeSender.name,
        "ইউজার"
    );

    const modeText =
        document.createTextNode(
            ` (${typeLabel}) মোডে আছেন।`
        );

    badge.appendChild(icon);
    badge.appendChild(youText);
    badge.appendChild(name);
    badge.appendChild(modeText);
}

// ============================================================
// 3. Chat System Initialization
// ============================================================
function initChatSystem() {
    if (chatSystemInitialized) return;
    if (
        !authReady ||
        !identityReady ||
        !currentUser ||
        !activeSender
    ) {
        return;
    }

    chatSystemInitialized = true;

    loadChatList();

    if (currentChatId) {
        handleMobileLayout();
        openChatBox(
            currentChatId,
            currentPostId
        );
    }
}

// ============================================================
// 4. Inbox / Chat List
// ============================================================
function loadChatList() {
    const chatListContainer =
        document.getElementById(
            "chatListContainer"
        );

    if (
        !chatListContainer ||
        !activeSender ||
        !currentUser
    ) {
        return;
    }

    // Prevent duplicate realtime listeners.
    if (chatListUnsubscribe) {
        chatListUnsubscribe();
        chatListUnsubscribe = null;
    }

    chatListUnsubscribe = db
        .collection("chats")
        .where(
            "participants",
            "array-contains",
            currentUser.uid
        )
        .onSnapshot(
            (snapshot) => {
                chatListContainer.innerHTML = "";

                const chatDocs = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();

                    // The chat is visible in the active identity's inbox
                    // only when that identity is sender or receiver.
                    const isRelevantToActiveMode =
                        data.senderId ===
                            activeSender.id ||
                        data.receiverId ===
                            activeSender.id;

                    const deletedBy =
                        Array.isArray(data.deletedBy)
                            ? data.deletedBy
                            : [];

                    const isDeleted =
                        deletedBy.includes(
                            activeSender.id
                        );

                    if (
                        isRelevantToActiveMode &&
                        !isDeleted
                    ) {
                        chatDocs.push({
                            id: doc.id,
                            ...data
                        });
                    }
                });

                if (chatDocs.length === 0) {
                    chatListContainer.innerHTML =
                        '<div style="padding:20px;text-align:center;color:#7f8c8d;font-size:14px;">কোনো ইনবক্স মেসেজ নেই।</div>';
                    return;
                }

                chatDocs.sort((a, b) => {
                    const aTime =
                        a.timestamp?.toMillis?.() ||
                        (a.timestamp?.seconds || 0) *
                            1000 ||
                        0;

                    const bTime =
                        b.timestamp?.toMillis?.() ||
                        (b.timestamp?.seconds || 0) *
                            1000 ||
                        0;

                    return bTime - aTime;
                });

                chatDocs.forEach((chatData) => {
                    const chatId = chatData.id;

                    const otherPartyId =
                        chatData.senderId ===
                        activeSender.id
                            ? chatData.receiverId
                            : chatData.senderId;

                    const isUnread =
                        chatData.isUnread === true &&
                        chatData.lastSenderId !==
                            activeSender.id;

                    const chatItemDiv =
                        document.createElement(
                            "div"
                        );

                    chatItemDiv.className =
                        "chat-item" +
                        (chatId === currentChatId
                            ? " active"
                            : "");

                    chatItemDiv.id =
                        `item_${chatId}`;

                    // Build chat item safely.
                    const avatar =
                        document.createElement(
                            "img"
                        );

                    avatar.src =
                        DEFAULT_USER_AVATAR;

                    avatar.alt = "প্রোফাইল";

                    avatar.id =
                        `avatar_${chatId}`;

                    const info =
                        document.createElement(
                            "div"
                        );

                    info.className =
                        "chat-item-info";

                    const title =
                        document.createElement(
                            "h4"
                        );

                    title.id =
                        `name_${chatId}`;

                    title.textContent =
                        "লোড হচ্ছে...";

                    const preview =
                        document.createElement(
                            "p"
                        );

                    preview.textContent =
                        chatData.lastMessage ||
                        "নতুন বার্তা...";

                    if (isUnread) {
                        preview.style.fontWeight =
                            "bold";

                        preview.style.color =
                            "#0f172a";
                    }

                    info.appendChild(title);
                    info.appendChild(preview);

                    const menuButton =
                        document.createElement(
                            "button"
                        );

                    menuButton.className =
                        "chat-item-menu-btn";

                    menuButton.type = "button";

                    menuButton.setAttribute(
                        "aria-label",
                        "চ্যাট অপশন"
                    );

                    const menuIcon =
                        document.createElement(
                            "i"
                        );

                    menuIcon.className =
                        "material-icons";

                    menuIcon.textContent =
                        "more_vert";

                    menuButton.appendChild(
                        menuIcon
                    );

                    menuButton.addEventListener(
                        "click",
                        (event) => {
                            toggleDropdown(
                                event,
                                chatId
                            );
                        }
                    );

                    const dropdown =
                        document.createElement(
                            "div"
                        );

                    dropdown.className =
                        "chat-dropdown";

                    dropdown.id =
                        `dropdown_${chatId}`;

                    const deleteButton =
                        document.createElement(
                            "button"
                        );

                    deleteButton.className =
                        "chat-dropdown-item";

                    deleteButton.type = "button";

                    const deleteIcon =
                        document.createElement(
                            "i"
                        );

                    deleteIcon.className =
                        "material-icons";

                    deleteIcon.textContent =
                        "delete";

                    deleteButton.appendChild(
                        deleteIcon
                    );

                    deleteButton.appendChild(
                        document.createTextNode(
                            " ডিলিট করুন"
                        )
                    );

                    deleteButton.addEventListener(
                        "click",
                        (event) => {
                            deleteChatForUser(
                                event,
                                chatId
                            );
                        }
                    );

                    dropdown.appendChild(
                        deleteButton
                    );

                    chatItemDiv.appendChild(
                        avatar
                    );

                    chatItemDiv.appendChild(
                        info
                    );

                    chatItemDiv.appendChild(
                        menuButton
                    );

                    chatItemDiv.appendChild(
                        dropdown
                    );

                    chatListContainer.appendChild(
                        chatItemDiv
                    );

                    chatItemDiv.addEventListener(
                        "click",
                        (event) => {
                            if (
                                event.target.closest(
                                    ".chat-item-menu-btn"
                                ) ||
                                event.target.closest(
                                    ".chat-dropdown"
                                )
                            ) {
                                return;
                            }

                            handleMobileLayout();

                            openChatBox(
                                chatId,
                                chatData.postId
                            );
                        }
                    );

                    const counterpartType =
                        getChatCounterpartType(
                            chatData,
                            activeSender.id
                        );

                    fetchIdentityDetails(
                        otherPartyId,
                        `name_${chatId}`,
                        `avatar_${chatId}`,
                        counterpartType
                    );
                });
            },
            (error) => {
                console.error(
                    "চ্যাট লোড করার এরর:",
                    error
                );

                chatListContainer.innerHTML =
                    '<div style="padding:20px;text-align:center;color:red;font-size:13px;">মেসেজ লোড করতে সমস্যা হয়েছে।</div>';
            }
        );
}

// ============================================================
// 5. Other Party Identity Resolver
// ============================================================
// Search priority:
//   A. Explicit company document
//   B. companyId field
//   C. Explicit user document
//   D. ownerUid fallback
//
// Why this order?
// - A company ID must never accidentally be treated as a user.
// - companyId can exist independently of document ID.
// - A real user UID should remain a user if that user also owns a company.
// - ownerUid is therefore used only as a final fallback.

async function fetchIdentityDetails(
    targetId,
    nameElemId,
    avatarElemId,
    preferredType = null
) {
    if (!targetId) return;

    const nameElem =
        document.getElementById(nameElemId);

    const avatarElem = avatarElemId
        ? document.getElementById(avatarElemId)
        : null;

    try {
        // --------------------------------------------------------
        // A. If chat metadata explicitly says company, prioritize
        // company identity.
        // --------------------------------------------------------
        if (preferredType === "company") {
            const directCompany = await db
                .collection("companies")
                .doc(targetId)
                .get();

            if (directCompany.exists) {
                const cData =
                    directCompany.data();

                if (nameElem) {
                    nameElem.textContent =
                        getCompanyName(cData);
                }

                if (avatarElem) {
                    setImageSafely(
                        avatarElem,
                        getCompanyPhoto(cData),
                        DEFAULT_COMPANY_AVATAR
                    );
                }

                return;
            }

            const companyById = await db
                .collection("companies")
                .where(
                    "companyId",
                    "==",
                    targetId
                )
                .limit(1)
                .get();

            if (!companyById.empty) {
                const cData =
                    companyById.docs[0].data();

                if (nameElem) {
                    nameElem.textContent =
                        getCompanyName(cData);
                }

                if (avatarElem) {
                    setImageSafely(
                        avatarElem,
                        getCompanyPhoto(cData),
                        DEFAULT_COMPANY_AVATAR
                    );
                }

                return;
            }
        }

        // --------------------------------------------------------
        // B. Direct company document lookup.
        // --------------------------------------------------------
        const cDoc = await db
            .collection("companies")
            .doc(targetId)
            .get();

        if (cDoc.exists) {
            const cData = cDoc.data();

            if (nameElem) {
                nameElem.textContent =
                    getCompanyName(cData);
            }

            if (avatarElem) {
                setImageSafely(
                    avatarElem,
                    getCompanyPhoto(cData),
                    DEFAULT_COMPANY_AVATAR
                );
            }

            return;
        }

        // --------------------------------------------------------
        // C. Company lookup by companyId field.
        // --------------------------------------------------------
        const compQueryById = await db
            .collection("companies")
            .where(
                "companyId",
                "==",
                targetId
            )
            .limit(1)
            .get();

        if (!compQueryById.empty) {
            const cData =
                compQueryById.docs[0].data();

            if (nameElem) {
                nameElem.textContent =
                    getCompanyName(cData);
            }

            if (avatarElem) {
                setImageSafely(
                    avatarElem,
                    getCompanyPhoto(cData),
                    DEFAULT_COMPANY_AVATAR
                );
            }

            return;
        }

        // --------------------------------------------------------
        // D. Direct user document lookup.
        // --------------------------------------------------------
        const uDoc = await db
            .collection("users")
            .doc(targetId)
            .get();

        if (uDoc.exists) {
            const uData = uDoc.data();

            if (nameElem) {
                nameElem.textContent =
                    getUserName(uData);
            }

            if (avatarElem) {
                setImageSafely(
                    avatarElem,
                    getUserPhoto(uData),
                    DEFAULT_USER_AVATAR
                );
            }

            return;
        }

        // --------------------------------------------------------
        // E. Final company owner fallback.
        // --------------------------------------------------------
        const compQueryByOwner = await db
            .collection("companies")
            .where(
                "ownerUid",
                "==",
                targetId
            )
            .limit(1)
            .get();

        if (!compQueryByOwner.empty) {
            const cData =
                compQueryByOwner.docs[0].data();

            if (nameElem) {
                nameElem.textContent =
                    getCompanyName(cData);
            }

            if (avatarElem) {
                setImageSafely(
                    avatarElem,
                    getCompanyPhoto(cData),
                    DEFAULT_COMPANY_AVATAR
                );
            }

            return;
        }

        // --------------------------------------------------------
        // F. Nothing found.
        // --------------------------------------------------------
        if (nameElem) {
            nameElem.textContent =
                "বিজ্ঞাপনদাতা";
        }

        if (avatarElem) {
            setImageSafely(
                avatarElem,
                DEFAULT_USER_AVATAR,
                DEFAULT_USER_AVATAR
            );
        }
    } catch (err) {
        console.error(
            "আইডেন্টিটি ফেচিং ত্রুটি:",
            err
        );

        if (nameElem) {
            nameElem.textContent =
                "গ্রাহক";
        }

        if (avatarElem) {
            setImageSafely(
                avatarElem,
                DEFAULT_USER_AVATAR,
                DEFAULT_USER_AVATAR
            );
        }
    }
}

// ============================================================
// 6. Open Chat + Realtime Messages
// ============================================================
async function openChatBox(
    chatId,
    postId
) {
    if (!chatId || !activeSender) return;

    currentChatId = chatId;

    const emptyState =
        document.getElementById(
            "emptyState"
        );

    const activeChatContent =
        document.getElementById(
            "activeChatContent"
        );

    if (emptyState) {
        emptyState.style.display =
            "none";
    }

    if (activeChatContent) {
        activeChatContent.style.display =
            "flex";
    }

    document
        .querySelectorAll(".chat-item")
        .forEach((item) =>
            item.classList.remove(
                "active"
            )
        );

    document
        .getElementById(
            `item_${chatId}`
        )
        ?.classList.add("active");

    const chatRef =
        db.collection("chats").doc(chatId);

    try {
        const chatDoc =
            await chatRef.get();

        if (!chatDoc.exists) {
            console.warn(
                "চ্যাট ডকুমেন্ট পাওয়া যায়নি:",
                chatId
            );
            return;
        }

        const cData =
            chatDoc.data();

        // Mark unread only when the active identity is the recipient.
        if (
            cData.isUnread === true &&
            cData.lastSenderId !==
                activeSender.id
        ) {
            await chatRef.update({
                isUnread: false
            });
        }

        const otherPartyId =
            cData.senderId ===
            activeSender.id
                ? cData.receiverId
                : cData.senderId;

        const counterpartType =
            getChatCounterpartType(
                cData,
                activeSender.id
            );

        fetchIdentityDetails(
            otherPartyId,
            "activeChatUserName",
            null,
            counterpartType
        );

        loadPropertyContext(
            postId || cData.postId
        );

        // Stop previous realtime listener.
        if (activeChatListener) {
            activeChatListener();
            activeChatListener = null;
        }

        const messagesDisplay =
            document.getElementById(
                "messagesDisplay"
            );

        if (!messagesDisplay) return;

        activeChatListener = db
            .collection("chats")
            .doc(chatId)
            .collection("messages")
            .orderBy(
                "timestamp",
                "asc"
            )
            .onSnapshot(
                (snapshot) => {
                    messagesDisplay.innerHTML =
                        "";

                    snapshot.forEach(
                        (doc) => {
                            const msg =
                                doc.data();

                            const isIncoming =
                                msg.senderId !==
                                activeSender.id;

                            let timeStr =
                                "এইমাত্র";

                            if (
                                msg.timestamp
                                    ?.toDate
                            ) {
                                timeStr =
                                    msg.timestamp
                                        .toDate()
                                        .toLocaleTimeString(
                                            "bn-BD",
                                            {
                                                hour:
                                                    "2-digit",
                                                minute:
                                                    "2-digit"
                                            }
                                        );
                            }

                            appendMessageBubble(
                                messagesDisplay,
                                msg.text || "",
                                timeStr,
                                isIncoming
                            );
                        }
                    );

                    messagesDisplay.scrollTop =
                        messagesDisplay.scrollHeight;
                },
                (error) => {
                    console.error(
                        "রিয়েলটাইম মেসেজ লোড করার এরর:",
                        error
                    );
                }
            );
    } catch (error) {
        console.error(
            "চ্যাট ওপেন করার সমস্যা:",
            error
        );
    }
}

// ============================================================
// 7. Send Message
// ============================================================
async function sendMessage(text) {
    if (
        !text ||
        !text.trim() ||
        !currentChatId ||
        !activeSender
    ) {
        return;
    }

    const cleanText =
        text.trim();

    try {
        const chatDocRef =
            db.collection("chats")
                .doc(currentChatId);

        // Ensure the chat still exists before adding a message.
        const chatDoc =
            await chatDocRef.get();

        if (!chatDoc.exists) {
            console.warn(
                "মেসেজ পাঠানোর সময় চ্যাট পাওয়া যায়নি।"
            );
            return;
        }

        // 1. Add message to subcollection.
        await chatDocRef
            .collection("messages")
            .add({
                senderId:
                    activeSender.id,

                senderType:
                    activeSender.type,

                text:
                    cleanText,

                timestamp:
                    firebase.firestore
                        .FieldValue
                        .serverTimestamp()
            });

        // 2. Update chat summary.
        // Cloud Function remains responsible for push notification creation.
        await chatDocRef.update({
            lastMessage:
                cleanText,

            lastSenderId:
                activeSender.id,

            lastSenderType:
                activeSender.type,

            isUnread:
                true,

            deletedBy:
                [],

            timestamp:
                firebase.firestore
                    .FieldValue
                    .serverTimestamp()
        });
    } catch (e) {
        console.error(
            "মেসেজ পাঠাতে সমস্যা:",
            e
        );
    }
}

// ============================================================
// 8. Property Card
// ============================================================
function loadPropertyContext(
    postId
) {
    const card =
        document.getElementById(
            "activePropertyCard"
        );

    if (!card || !postId) {
        if (card) {
            card.style.display =
                "none";
        }

        return;
    }

    card.style.display =
        "flex";

    card.href =
        `details.html?id=${encodeURIComponent(
            postId
        )}`;

    db.collection("properties")
        .doc(postId)
        .get()
        .then((doc) => {
            if (!doc.exists) {
                card.style.display =
                    "none";

                return;
            }

            const data =
                doc.data();

            const pTitle =
                document.getElementById(
                    "activePropertyTitle"
                );

            const pPrice =
                document.getElementById(
                    "activePropertyPrice"
                );

            const pImg =
                document.getElementById(
                    "activePropertyImg"
                );

            if (pTitle) {
                pTitle.textContent =
                    data.title ||
                    "প্রপার্টি";
            }

            const amt =
                data.category ===
                "বিক্রয়"
                    ? data.price
                    : data.monthlyRent;

            if (pPrice) {
                pPrice.textContent =
                    amt
                        ? `৳ ${amt}`
                        : "আলোচনা সাপেক্ষ";
            }

            if (pImg) {
                let imageUrl =
                    null;

                if (
                    Array.isArray(
                        data.images
                    ) &&
                    data.images.length
                ) {
                    const firstImage =
                        data.images[0];

                    if (
                        typeof firstImage ===
                        "string"
                    ) {
                        imageUrl =
                            firstImage;
                    } else if (
                        firstImage?.url
                    ) {
                        imageUrl =
                            firstImage.url;
                    }
                }

                if (imageUrl) {
                    setImageSafely(
                        pImg,
                        imageUrl,
                        DEFAULT_USER_AVATAR
                    );
                }
            }
        })
        .catch((error) => {
            console.error(
                "প্রপার্টি context লোড করার সমস্যা:",
                error
            );

            card.style.display =
                "none";
        });
        }
