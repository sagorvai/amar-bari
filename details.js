// Firebase কনফিগারেশন
const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b351"
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('id');

    if (!propId) { window.location.href = 'index.html'; return; }

    try {
        const doc = await db.collection('properties').doc(propId).get();
        if (doc.exists) {
            renderView(doc.data(), propId);
        } else {
            alert("দুঃখিত, এই পোস্টটি আর নেই।");
        }
    } catch (err) {
        console.error(err);
    }
});

function renderView(data, id) {
    document.getElementById('loading-state').style.display = 'none';
    document.getElementById('details-view').style.display = 'block';

    // ১. টেক্সট ডেটা ম্যাপিং
    document.getElementById('p-title').innerText = data.title;
    document.getElementById('p-price').innerText = `৳ ${Number(data.price).toLocaleString('bn-BD')} ${data.category === 'ভাড়া' ? '/ মাস' : ''}`;
    document.getElementById('p-location').innerHTML += data.location || data.district;
    document.getElementById('p-description').innerText = data.description;

    // ২. অ্যাডভান্সড ইমেজ গ্যালারি
    const mainImg = document.getElementById('main-img-display');
    const thumbContainer = document.getElementById('thumbnail-list');
    
    if (data.images && data.images.length > 0) {
        mainImg.src = data.images[0].url;
        data.images.forEach((imgObj, idx) => {
            const tImg = document.createElement('img');
            tImg.src = imgObj.url;
            if (idx === 0) tImg.classList.add('active');
            
            tImg.onclick = () => {
                mainImg.src = imgObj.url;
                document.querySelectorAll('.thumb-nav img').forEach(i => i.classList.remove('active'));
                tImg.classList.add('active');
            };
            thumbContainer.appendChild(tImg);
        });
    }

    // ৩. ডাইনামিক ফিচার গ্রিড (post.js এর ইনপুট ফিল্ডের ওপর ভিত্তি করে)
    const specs = document.getElementById('specs-container');
    const fieldMapping = {
        category: { n: 'ক্যাটাগরি', i: 'sell' },
        subCategory: { n: 'প্রপার্টি টাইপ', i: 'apartment' },
        beds: { n: 'বেডরুম', i: 'bed' },
        baths: { n: 'বাথরুম', i: 'bathtub' },
        area: { n: 'আয়তন', i: 'square_foot' },
        floorLevel: { n: 'তলা', i: 'stairs' },
        facing: { n: 'দিক', i: 'explore' },
        completionStatus: { n: 'অবস্থা', i: 'new_releases' }
    };

    Object.keys(fieldMapping).forEach(key => {
        if (data[key] && data[key] !== "") {
            specs.innerHTML += `
                <div class="spec-card">
                    <i class="material-icons">${fieldMapping[key].i}</i>
                    <div>
                        <span class="spec-label">${fieldMapping[key].n}</span>
                        <span class="spec-data">${data[key]}</span>
                    </div>
                </div>`;
        }
    });

    // ৪. সরাসরি চ্যাট ইন্টিগ্রেশন
    document.getElementById('chatNowBtn').onclick = () => {
        window.location.href = `messages.html?chatId=${id}`;
    };
        }

// header_logic.js

// Firebase SDKs (আপনার মূল HTML ফাইলে লোড করা থাকতে হবে)
// const db = firebase.firestore(); 
// const auth = firebase.auth();
// ধরে নেওয়া হচ্ছে db এবং auth ভ্যারিয়েবলগুলো বিশ্বব্যাপী (globally) সংজ্ঞায়িত আছে।

// --- ফাংশন ১: হেডার প্রোফাইল লোড করার জন্য ---
function loadHeaderProfile(user) {
    const headerProfileImage = document.getElementById('profileImage');
    const defaultProfileIcon = document.getElementById('defaultProfileIcon');

    // db এর গ্লোবাল অ্যাক্সেস ধরে নেওয়া হয়েছে
    db.collection('users').doc(user.uid).get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            if (data.profilePictureUrl && headerProfileImage && defaultProfileIcon) {
                headerProfileImage.src = data.profilePictureUrl;
                headerProfileImage.style.display = 'block';
                defaultProfileIcon.style.display = 'none';
            }
        }
    }).catch(error => {
        console.error("Header profile load failed:", error);
    });
}

// --- ফাংশন ২: লগআউট হ্যান্ডেলার ---
const handleLogout = async (e) => {
    e.preventDefault();
    try {
        // auth এর গ্লোবাল অ্যাক্সেস ধরে নেওয়া হয়েছে
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


    // --- অথেন্টিকেশন স্টেট চেঞ্জ লজিক (হেডার/সাইডবার UI আপডেট) ---
    // ধরে নেওয়া হচ্ছে auth ভ্যারিয়েবল গ্লোবালি সংজ্ঞায়িত আছে।
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

    // --- হেডার আইকন কার্যকারিতা ---
    
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
    </script>
</body>
                    </html>
