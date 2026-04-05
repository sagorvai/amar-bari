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
const postId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;
    const doc = await db.collection('properties').doc(postId).get();
    if (doc.exists) {
        const data = doc.data();
        renderDetails(data);
        loadRelatedPosts(data);
    }
});

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    // ১. দাম ও ইউনিট (ভাড়া ও বিক্রয় উভয় ঠিক করা হলো)
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // ইমেজ গ্যালারি
    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));
    if (data.documents?.khotian) images.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) images.push(data.documents.sketch.url || data.documents.sketch);

    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';
    images.slice(0, 5).forEach(url => {
        const div = document.createElement('div');
        div.className = 'gal-item';
        div.innerHTML = `<img src="${url}" onclick="openLightbox('${url}')">`;
        gallery.appendChild(div);
    });

    const addRow = (tableId, label, value) => {
        if (!value || value === "" || value === "undefined") return;
        const table = document.getElementById(tableId);
        table.innerHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // ২. 🏠 প্রপার্টির তথ্য
    const basicT = 'table-basic';
    document.getElementById(basicT).innerHTML = ""; 

    addRow(basicT, "ক্যাটাগরি", data.category);
    addRow(basicT, "টাইপ", data.type);
    
    // ভাড়ার জন্য বিশেষ তথ্য (উঠার তারিখ, ধরন, এডভ্যান্স)
    if (data.category === 'ভাড়া') {
        addRow(basicT, "ভাড়ার ধরন", data.rentType); // ফ্যামিলি/ব্যাচেলর
        addRow(basicT, "ওঠার তারিখ", data.availableDate);
        addRow(basicT, "অগ্রিম (এডভ্যান্স)", data.advanceAmount ? `৳ ${data.advanceAmount}` : "");
    }

    addRow(basicT, "বেডরুম", data.bedrooms || data.rooms);
    addRow(basicT, "বাথরুম", data.bathrooms);
    addRow(basicT, "কিচেন", data.kitchen);
    addRow(basicT, "ফ্লোর নম্বর", data.floorNo || data.floorLevel);
    addRow(basicT, "রাস্তা", data.roadWidth ? `${data.roadWidth} ফিট` : "");
    addRow(basicT, "ফেসিং", data.facing);
    
    // সুবিধা সমূহ (Utilities - কমা দিয়ে সুন্দর করে দেখানো)
    if (data.utilities && data.utilities.length > 0) {
        addRow(basicT, "সুবিধা সমূহ", Array.isArray(data.utilities) ? data.utilities.join(', ') : data.utilities);
    }

    // পরিমাণের পাসে ব্র্যাকেটে ইউনিট
    let area = data.landArea || data.houseArea || data.areaSqft || data.commercialArea;
    let areaUnit = data.landAreaUnit || data.houseAreaUnit || data.commercialAreaUnit || "";
    addRow(basicT, "পরিমাণ", area ? `${area} (${areaUnit})` : "");

    // ৩. 📑 মালিকানা তথ্য
    if (data.category === 'বিক্রয়' && data.owner) {
        document.getElementById('section-owner').style.display = 'block';
        const ownT = 'table-owner';
        document.getElementById(ownT).innerHTML = "";
        addRow(ownT, "দাতার নাম", data.owner.donorName);
        let dag = data.owner.dagNo;
        let dagType = data.owner.dagNoType || "";
        addRow(ownT, "দাগ নং", dag ? `${dag} (${dagType})` : "");
        addRow(ownT, "মৌজা", data.owner.mouja);
    }

    // ৪. 📍 অবস্থান
    const locT = 'table-location';
    document.getElementById(locT).innerHTML = "";
    addRow(locT, "জেলা", data.location?.district);
    addRow(locT, "উপজেলা", data.location?.upazila);
    addRow(locT, "থানা", data.location?.thana);
    addRow(locT, "ইউনিয়ন", data.location?.union);
    addRow(locT, "ওয়ার্ড নম্বর", data.location?.wardNo);
    addRow(locT, "গ্রাম/এলাকা", data.location?.village);
    addRow(locT, "রাস্তা", data.location?.road);

    if (data.googleMap) {
        const m = document.getElementById('p-map');
        m.href = data.googleMap;
        m.style.display = 'flex';
    }

    // ৫. 📞 যোগাযোগ
    const conT = 'table-contact';
    document.getElementById(conT).innerHTML = "";
    addRow(conT, "প্রাথমিক ফোন", data.phoneNumber);
    addRow(conT, "অতিরিক্ত ফোন", data.secondaryPhone);
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
}

// সম্পর্কিত পোস্ট লজিক (আগের মতোই সঠিক আছে)
async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');
    const seeMoreBox = document.getElementById('see-more-box');
    try {
        const snapshot = await db.collection('properties')
            .where('category', '==', currentData.category)
            .limit(50) 
            .get();

        let allPosts = [];
        snapshot.forEach(doc => {
            if (doc.id !== postId) allPosts.push({ id: doc.id, ...doc.data() });
        });

        allPosts.sort((a, b) => {
            const aVillage = (a.location?.village === currentData.location?.village) ? 1 : 0;
            const bVillage = (b.location?.village === currentData.location?.village) ? 1 : 0;
            if (aVillage !== bVillage) return bVillage - aVillage;
            const aThana = (a.location?.thana === currentData.location?.thana) ? 1 : 0;
            const bThana = (b.location?.thana === currentData.location?.thana) ? 1 : 0;
            return bThana - aThana;
        });

        const displayPosts = allPosts.slice(0, 10);
        list.innerHTML = "";
        displayPosts.forEach(post => {
            let pAmt = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let pUnit = post.priceUnit || post.rentUnit || "";
            list.innerHTML += `
                <div class="rel-card" onclick="location.href='details.html?id=${post.id}'">
                    <img src="${post.images?.[0]?.url || post.images?.[0] || 'placeholder.jpg'}">
                    <div class="rel-info">
                        <h4 class="rel-title">${post.title}</h4>
                        <p class="rel-price">৳ ${pAmt} (${pUnit})</p>
                        <p class="rel-loc">${post.location?.village || ''}, ${post.location?.thana || ''}</p>
                    </div>
                </div>`;
        });
        if (allPosts.length > 10) seeMoreBox.style.display = 'block';
    } catch (e) { console.error(e); }
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const closeMenu = document.getElementById('closeMenu');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    // মেনু খোলা
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.add('active');
            overlay.classList.add('active');
        });
    }

    // মেনু বন্ধ করা
    const closeSidebar = () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    };

    if (closeMenu) closeMenu.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // হেডার বাটনগুলোর লিঙ্ক
    document.getElementById('notificationButton')?.addEventListener('click', () => location.href = 'notifications.html');
    document.getElementById('headerPostButton')?.addEventListener('click', () => location.href = 'post.html');
    document.getElementById('messageButton')?.addEventListener('click', () => location.href = 'messages.html');
    document.getElementById('profileImageWrapper')?.addEventListener('click', () => location.href = 'profile.html');
});


// header_logic.js

// ⭐ ফাংশন ১: হেডার প্রোফাইল লোড করার জন্য ⭐
function loadHeaderProfile(user) {
    const headerProfileImage = document.getElementById('profileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');

    if (headerProfileImage && defaultProfileIcon) {
        // ফায়ারবেস লোড হয়েছে ধরে নিয়ে ডেটা লোড করার চেষ্টা
        if (typeof db !== 'undefined' && db.collection) {
             db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    if (data.profilePictureUrl) {
                        headerProfileImage.src = data.profilePictureUrl;
                        headerProfileImage.style.display = 'block';
                        defaultProfileIcon.style.display = 'none';
                    } else {
                        // যদি URL না থাকে, ডিফল্ট আইকন দেখান
                        headerProfileImage.style.display = 'none';
                        defaultProfileIcon.style.display = 'block';
                    }
                }
            }).catch(error => {
                console.error("Header profile load failed:", error);
                // ফেইল হলেও ডিফল্ট আইকন দেখান
                headerProfileImage.style.display = 'none';
                defaultProfileIcon.style.display = 'block';
            });
        }
    }
}

// ফাংশন ২: লগআউট হ্যান্ডেলার
const handleLogout = async (e) => {
    e.preventDefault();
    try {
        await auth.signOut(); 
        alert('সফলভাবে লগআউট করা হয়েছে!');
        window.location.href = 'index.html'; 
    } catch (error) {
        console.error("লগআউট ব্যর্থ হয়েছে:", error);
        alert("লগআউট ব্যর্থ হয়েছে।");
    }
};


document.addEventListener('DOMContentLoaded', function() {
    
    // --- হেডার UI উপাদানগুলো ---
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const notificationButton = document.getElementById('notificationButton');
    const headerPostButton = document.getElementById('headerPostButton');
    const messageButton = document.getElementById('messageButton');
    const profileImageWrapper = document.getElementById('profileImageWrapper'); 
    const headerProfileImage = document.getElementById('profileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');
    const postLinkSidebar = document.getElementById('post-link-sidebar-menu');
    const loginLinkSidebar = document.getElementById('login-link-sidebar');


    // ⭐ অথেন্টিকেশন স্টেট চেঞ্জ লজিক (প্রোফাইল ইমেজ এবং সাইডবার লিঙ্ক ম্যানেজ করে) ⭐
    if (typeof auth !== 'undefined' && auth.onAuthStateChanged) {
        auth.onAuthStateChanged(user => {
            if (user) {
                // লগইন অবস্থায়: প্রোফাইল ইমেজ লোড এবং সঠিক সাইডবার লিঙ্ক দেখানো
                loadHeaderProfile(user); 
                if (profileImageWrapper) profileImageWrapper.style.display = 'flex'; 

                // সাইডবার লিঙ্ক আপডেট
                if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
                if (loginLinkSidebar) {
                    loginLinkSidebar.textContent = 'লগআউট';
                    loginLinkSidebar.href = '#'; 
                    loginLinkSidebar.onclick = handleLogout; 
                }
            } else {
                // লগআউট অবস্থায়: ডিফল্ট আইকন দেখানো এবং সাইডবার লিঙ্ক আপডেট
                if (headerProfileImage && defaultProfileIcon) {
                    headerProfileImage.style.display = 'none';
                    defaultProfileIcon.style.display = 'block';
                }
                if (profileImageWrapper) profileImageWrapper.style.display = 'flex';
                
                // সাইডবার লিঙ্ক আপডেট
                if (postLinkSidebar) postLinkSidebar.style.display = 'none';
                if (loginLinkSidebar) {
                    loginLinkSidebar.textContent = 'লগইন';
                    loginLinkSidebar.href = 'auth.html';
                    loginLinkSidebar.onclick = null;
                }
            }
        });
    }

    // ⭐ হেডার আইকন কার্যকারিতা (মেনু এবং ওভারলে ফিক্স) ⭐
    
    // মেনু বাটন এবং সাইডবার টগল
    if (menuButton) {
        menuButton.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
    }
    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    // নোটিফিকেশন আইকন রিডাইরেক্ট
    if (notificationButton) {
        notificationButton.addEventListener('click', () => {
             window.location.href = 'notifications.html'; 
        });
    }

    // পোস্ট আইকন রিডাইরেক্ট
    if (headerPostButton) {
        headerPostButton.addEventListener('click', () => {
            window.location.href = 'post.html'; 
        });
    }

    // ম্যাসেজ আইকন রিডাইরেক্ট
    if (messageButton) {
        messageButton.addEventListener('click', () => {
             window.location.href = 'messages.html';
        });
    }
    
    // প্রোফাইল ইমেজ রিডাইরেক্ট
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }
});
