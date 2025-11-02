// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const postLink = document.getElementById('post-link'); 
const menuButton = document.getElementById('menuButton');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');
const profileButton = document.getElementById('profileButton');
const messageButton = document.getElementById('messageButton');
const messagesLinkSidebar = document.getElementById('messages-link-sidebar');

// ✅ নতুন নোটিফিকেশন UI উপাদান
const notificationButton = document.getElementById('notificationButton');
const notificationCount = document.getElementById('notification-count');
const notificationDropdown = document.getElementById('notification-dropdown');

const navButtons = document.querySelectorAll('.nav-filters .nav-button'); 
const globalSearchInput = document.getElementById('globalSearchInput');
const propertyG = document.querySelector('.property-grid');
const loginLinkSidebar = document.getElementById('login-link-sidebar');

let unsubscribeNotifications = null; // রিয়েল-টাইম লিসেনার বন্ধ করার জন্য

// --- ১. প্রপার্টি লোডিং এবং ডিসপ্লে লজিক ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    // এখানে আপনার প্রপার্টি লোডিং এবং গ্রিডে ডিসপ্লে করার লজিক থাকবে।
    
    propertyG.innerHTML = `
        <div style="text-align: center; padding: 20px; font-size: 1.2em; color: #007bff;">
            ${category === 'map' ? 'ম্যাপ ভিউ লোড হচ্ছে...' : `${category} ক্যাটাগরির প্রপার্টি লোড হচ্ছে...`}
        </div>
    `;
    
    setTimeout(() => {
        propertyG.innerHTML = `
             <h3 style="width: 100%; text-align: center; margin: 20px 0;">
                ${category === 'map' ? 'এখানে ম্যাপ ভিউ প্রদর্শিত হবে' : `${category} ক্যাটাগরির প্রপার্টি`} 
             </h3>
             <div style="width: 100%; text-align: center; padding: 10px; color: #6c757d;">
                (যদি ডেটা না থাকে, তবে এখানে কোনো কার্ড দেখাবে না)
             </div>
        `;
    }, 500);
}

// --- ২. নোটিফিকেশন লজিক ---

function loadNotifications(userId) {
    if (unsubscribeNotifications) {
        unsubscribeNotifications(); // আগের লিসেনার বন্ধ করা
    }
    
    // শেষ ৫টি নোটিফিকেশন রিয়েল-টাইমে লোড করা
    unsubscribeNotifications = db.collection("notifications")
        .where("userId", "==", userId)
        .orderBy("timestamp", "desc")
        .limit(5) 
        .onSnapshot(snapshot => {
            let unreadCount = 0;
            notificationDropdown.innerHTML = ''; // ড্রপডাউন খালি করা
            
            if (snapshot.empty) {
                notificationDropdown.innerHTML = '<div class="notification-item">কোনো নতুন নোটিফিকেশন নেই।</div>';
            } else {
                snapshot.forEach(doc => {
                    const notification = doc.data();
                    const notifId = doc.id;
                    
                    if (!notification.read) {
                        unreadCount++;
                    }
                    
                    // নোটিফিকেশন আইটেম তৈরি
                    const item = document.createElement('a');
                    item.href = notification.link || '#';
                    item.className = `notification-item ${notification.read ? '' : 'unread'}`;
                    item.dataset.notifId = notifId;

                    const timeAgo = notification.timestamp ? 
                        notification.timestamp.toDate().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' }) : '';
                        
                    item.innerHTML = `
                        <div class="notif-text">${notification.message}</div>
                        <div class="notif-time">${timeAgo}</div>
                    `;
                    
                    // ক্লিক করলে 'read' হিসেবে মার্ক করা
                    item.addEventListener('click', () => markNotificationAsRead(notifId));

                    notificationDropdown.appendChild(item);
                });
            }
            
            // অপঠিত সংখ্যা আপডেট করা
            if (unreadCount > 0) {
                notificationCount.textContent = unreadCount;
                notificationCount.style.display = 'block';
            } else {
                notificationCount.style.display = 'none';
            }
        }, error => {
            console.error("নোটিফিকেশন লোড করতে ব্যর্থ:", error);
        });
}

// নোটিফিকেশন 'read' হিসেবে চিহ্নিত করার ফাংশন
function markNotificationAsRead(notifId) {
    const userId = auth.currentUser ? auth.currentUser.uid : null;
    if (userId && notifId) {
        db.collection("notifications").doc(notifId).update({ read: true })
            .catch(error => {
                console.error("নোটিফিকেশন রিড করতে ব্যর্থ:", error);
            });
        // UI আপডেট loadNotifications দ্বারা রিয়েল-টাইমে হবে।
    }
}

// --- ৩. UI লজিক ---

function setupUIEventListeners() {
    
    // হেডার নেভিগেশন (বিক্রয়/ভাড়া/ম্যাপ)
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.dataset.category;
            
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            fetchAndDisplayProperties(category, globalSearchInput.value);
        });
    });
    
    // ✅ নোটিফিকেশন বাটন ক্লিক লজিক
    if (notificationButton) {
        notificationButton.addEventListener('click', (e) => {
            e.stopPropagation(); // document ক্লিক ইভেন্ট বন্ধ করা
            if (auth.currentUser) {
                notificationDropdown.classList.toggle('active');
            } else {
                 alert("নোটিফিকেশন দেখতে আপনাকে লগইন করতে হবে।");
            }
        });
    }
    
    // অন্য কোথাও ক্লিক করলে ড্রপডাউন বন্ধ করা
    document.addEventListener('click', (e) => {
        if (notificationDropdown && notificationDropdown.classList.contains('active') && !e.target.closest('#notificationButton')) {
            notificationDropdown.classList.remove('active');
        }
    });


    // অন্যান্য ইভেন্ট লিসেনার...
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

    if (profileButton) {
        profileButton.addEventListener('click', () => {
            window.location.href = 'profile.html';
        });
    }
    
    if (messageButton) {
        messageButton.addEventListener('click', () => {
            if (auth.currentUser) {
                window.location.href = 'messages.html'; 
            } else {
                alert("মেসেজ দেখার জন্য আপনাকে লগইন করতে হবে।");
                window.location.href = 'auth.html';
            }
        });
    }
    
    if (globalSearchInput) {
        globalSearchInput.addEventListener('keypress', (e) => {
             if (e.key === 'Enter') {
                 const activeCategory = document.querySelector('.nav-button.active').dataset.category;
                 fetchAndDisplayProperties(activeCategory, globalSearchInput.value);
             }
        });
    }
}

// --- ৪. লগআউট হ্যান্ডেলার ---
const handleLogout = async () => {
    try {
        await auth.signOut();
        alert('সফলভাবে লগআউট করা হয়েছে!');
        if (unsubscribeNotifications) {
            unsubscribeNotifications(); // লিসেনার বন্ধ করা
        }
        window.location.reload();
    } catch (error) {
        console.error("লগআউট ব্যর্থ হয়েছে:", error);
        alert("লগআউট ব্যর্থ হয়েছে।");
    }
};

document.addEventListener('DOMContentLoaded', () => {
    setupUIEventListeners();
    fetchAndDisplayProperties('বিক্রয়', ''); 
    
    // Auth State Change Handler 
    auth.onAuthStateChanged(user => {
        
        if (user) {
            // লগইন থাকলে
            if (postLink) postLink.style.display = 'flex'; 
            if (profileButton) profileButton.style.display = 'inline-block';
            
            // ✅ নোটিফিকেশন বাটন দেখানো এবং লোড করা
            if (notificationButton) notificationButton.style.display = 'inline-flex';
            loadNotifications(user.uid);
            
            if (messageButton) messageButton.style.display = 'inline-flex'; 
            if (messagesLinkSidebar) messagesLinkSidebar.style.display = 'flex';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                loginLinkSidebar.removeEventListener('click', handleLogout);
                loginLinkSidebar.addEventListener('click', handleLogout);
            }
        } else {
            // লগইন না থাকলে
            if (postLink) postLink.style.display = 'none';
            if (profileButton) profileButton.style.display = 'none';
            
            // ✅ নোটিফিকেশন বাটন লুকিয়ে রাখা
            if (notificationButton) notificationButton.style.display = 'none'; 
            if (notificationCount) notificationCount.style.display = 'none'; 
            if (notificationDropdown) notificationDropdown.classList.remove('active');
            if (unsubscribeNotifications) unsubscribeNotifications();

            if (messageButton) messageButton.style.display = 'none'; 
            if (messagesLinkSidebar) messagesLinkSidebar.style.display = 'none';
            
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.removeEventListener('click', handleLogout); 
            }
        }
    });

});
