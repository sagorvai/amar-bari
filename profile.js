// firebase.initializeApp(firebaseConfig) আপনার ইফেসিয়েট কনফিগ নিশ্চিত করুন

const auth = firebase.auth();
const db = firebase.firestore();

let currentUserData = null;
let companyData = null;
let isCompanyMode = false; // বর্তমানে কিসে আছে (পার্সোনাল নাকি কোম্পানি পেজে)

// Auth State Changed
auth.onAuthStateChanged(async (user) => {
    if (user) {
        await loadUserData(user.uid);
    } else {
        window.location.href = "login.html";
    }
});

// ইউজারের মেইন ডাটা লোড
async function loadUserData(uid) {
    try {
        const doc = await db.collection("users").doc(uid).get();
        if (doc.exists) {
            currentUserData = doc.data();
            
            // কোম্পানি পেজের তথ্য লোড
            const compDoc = await db.collection("companies").doc(uid).get();
            if (compDoc.exists) {
                companyData = compDoc.data();
            }

            // মোড চেক করে UI রেন্ডার করা
            renderProfile();
        }
    } catch (err) {
        console.error("Error loading user data:", err);
    }
}

// UI রেন্ডারিং ফাংশন
function renderProfile() {
    // কোম্পানি সুইচার উইজেট আপডেট (পরিচিতির ঠিক উপরে)
    renderCompanyWidget();

    if (isCompanyMode && companyData) {
        // --- কোম্পানি পেজ ভিউ (Company Page Active) ---
        document.getElementById("displayName").innerText = companyData.name;
        document.getElementById("displayBio").innerText = companyData.bio || "আবাসন ও ডেভেলপার প্রতিষ্ঠান";
        document.getElementById("profileAvatar").src = companyData.logo || "https://via.placeholder.com/100";
        if(companyData.cover) {
            document.getElementById("coverPhoto").style.backgroundImage = `url('${companyData.cover}')`;
        }

        // কোম্পানি পরিচিতি (Intro)
        document.getElementById("introProfession").innerText = "আবাসন ও ডেভেলপার কোম্পানি";
        document.getElementById("introAddress").innerText = companyData.address || "নট সেট";
        document.getElementById("introOffice").innerText = companyData.address || "নট সেট";
        document.getElementById("introPhone").innerText = companyData.phone || "নট সেট";
        document.getElementById("introEmail").innerText = currentUserData.email || "নট সেট";

        document.getElementById("postsTitle").innerText = companyData.name + " - এর প্রপার্টি সমূহ";
        
        // কোম্পানি পোস্ট লোড
        loadProperties(companyData.companyId, true);

    } else {
        // --- পার্সোনাল প্রোফাইল ভিউ (Personal Profile Active) ---
        document.getElementById("displayName").innerText = currentUserData.name || "ইউজার";
        document.getElementById("displayBio").innerText = currentUserData.bio || "সততাই ব্যবসার মূল ধন।";
        document.getElementById("profileAvatar").src = currentUserData.photoURL || "https://via.placeholder.com/100";
        document.getElementById("coverPhoto").style.backgroundImage = currentUserData.coverURL ? `url('${currentUserData.coverURL}')` : "none";

        // পার্সোনাল পরিচিতি (Intro)
        document.getElementById("introProfession").innerText = currentUserData.profession || "ব্যবসায়ী";
        document.getElementById("introAddress").innerText = currentUserData.city || "খুলনা";
        document.getElementById("introOffice").innerText = currentUserData.office || "জলিল সরণি, খুলনা";
        document.getElementById("introPhone").innerText = currentUserData.phone || "ফোন সেট করা নেই";
        document.getElementById("introEmail").innerText = currentUserData.email || "";

        document.getElementById("postsTitle").innerText = "আমার প্রপার্টি সমূহ";

        // ইউজার পোস্ট লোড
        loadProperties(currentUserData.uid, false);
    }
}

// কোম্পানি সুইচ উইজেট (Intro-র ঠিক উপরে গোল লোগো ও সুইচ বাটন)
function renderCompanyWidget() {
    const container = document.getElementById("companyWidgetContent");

    if (companyData) {
        if (!isCompanyMode) {
            // ইউজার পার্সোনাল প্রোফাইলে আছে, কোম্পানি পেজে সুইচ করার অপশন দেখাবে
            container.innerHTML = `
                <div class="company-item" onclick="toggleMode(true)">
                    <div class="company-item-left">
                        <img src="${companyData.logo}" class="company-logo-small" alt="logo">
                        <div>
                            <div class="company-name-text">${companyData.name} <span class="badge-tag">কোম্পানি</span></div>
                            <small style="color: #65676b;">ক্লিক করে কোম্পানি পেজে সুইচ করুন</small>
                        </div>
                    </div>
                    <i class="fa-solid fa-chevron-right" style="color: #65676b;"></i>
                </div>
            `;
        } else {
            // ইউজার বর্তমানে কোম্পানি পেজে আছে, পার্সোনালে ফেরত আসার অপশন
            container.innerHTML = `
                <button class="btn btn-switch" onclick="toggleMode(false)">
                    <i class="fa-solid fa-repeat"></i> পার্সোনাল প্রোফাইলে ফেরত যান (${currentUserData.name})
                </button>
            `;
        }
    } else {
        // কোম্পানি পেজ না থাকলে তৈরি করার বাটন দেখাবে
        container.innerHTML = `
            <button class="btn btn-blue" style="width: 100%; justify-content: center;" onclick="openCompanyModal()">
                <i class="fa-solid fa-plus-circle"></i> আবাসন ও ডেভেলপার কোম্পানি পেজ তৈরি করুন
            </button>
        `;
    }
}

// পার্সোনাল <-> কোম্পানি সুইচ
function toggleMode(toCompany) {
    isCompanyMode = toCompany;
    renderProfile();
}

// কোম্পানি পেজ খোলার মোডাল কন্ট্রোল
function openCompanyModal() {
    document.getElementById("companyModal").classList.add("active");
}
function closeCompanyModal() {
    document.getElementById("companyModal").classList.remove("active");
}

// কোম্পানি ফর্ম সাবমিট
document.getElementById("companyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const uid = auth.currentUser.uid;

    const newCompany = {
        companyId: "comp_" + uid, // Unique ID for company
        ownerUid: uid,
        name: document.getElementById("compName").value,
        logo: document.getElementById("compLogo").value,
        cover: document.getElementById("compCover").value || "",
        bio: document.getElementById("compBio").value || "",
        address: document.getElementById("compAddress").value || "",
        phone: document.getElementById("compPhone").value || "",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("companies").doc(uid).set(newCompany);
        companyData = newCompany;
        closeCompanyModal();
        alert("আপনার আবাসন কোম্পানি পেজ সফলভাবে তৈরি হয়েছে!");
        toggleMode(true); // সরাসরি পেজে সুইচ করবে
    } catch (err) {
        console.error("Error creating company:", err);
        alert("পেজ তৈরি করতে সমস্যা হয়েছে!");
    }
});

// প্রপার্টি লোড করার লজিক (কোম্পানি বা ইউজার অনুযায়ী)
async function loadProperties(targetId, isComp) {
    const container = document.getElementById("propertiesContainer");
    container.innerHTML = "<p>লোড হচ্ছে...</p>";

    try {
        let query;
        if(isComp) {
            query = db.collection("posts").where("companyId", "==", targetId);
        } else {
            query = db.collection("posts").where("userId", "==", targetId).where("companyId", "==", null);
        }

        const snapshot = await query.get();
        if(snapshot.empty) {
            container.innerHTML = "<p style='color: #65676b;'>কোনো পোস্ট পাওয়া যায়নি।</p>";
            return;
        }

        let html = "";
        snapshot.forEach(doc => {
            const item = doc.data();
            html += `
                <div class="property-card">
                    <img src="${item.images ? item.images[0] : 'https://via.placeholder.com/90'}" alt="Property">
                    <div class="property-info">
                        <div class="property-title">${item.title || 'শিরোনাম নেই'}</div>
                        <div class="property-price">৳ ${item.price || '0'}</div>
                        <small style="color:#65676b;">${item.location || ''}</small>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
    } catch (err) {
        console.error("Error fetching posts:", err);
        container.innerHTML = "<p>পোস্ট লোড করা যায়নি।</p>";
    }
        }
