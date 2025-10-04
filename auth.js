// Firebase SDKs
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const switchLink = document.getElementById('switch-link');
    const authTitle = document.getElementById('auth-title');
    
    // নতুন সাইডবার লিঙ্ক উপাদানগুলো
    const postLinkSidebar = document.getElementById('post-link'); 
    const loginLinkSidebar = document.getElementById('login-link-sidebar'); 
    

    // Show login form by default, hide signup
    if (loginForm && signupForm) {
        // শুরুতে লগইন ফর্ম দেখাবে
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        authTitle.textContent = 'লগইন করুন'; // শিরোনাম নিশ্চিত করা হলো
    }

    // লগইন ও সাইনআপ ফর্মের মধ্যে পরিবর্তন (Switch between forms)
    if (switchLink && loginForm && signupForm) {
        switchLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (loginForm.style.display === 'block') {
                loginForm.style.display = 'none';
                signupForm.style.display = 'block';
                authTitle.textContent = 'সাইনআপ করুন';
                switchLink.textContent = 'আপনার কি একটি অ্যাকাউন্ট আছে? লগইন করুন';
            } else {
                loginForm.style.display = 'block';
                signupForm.style.display = 'none';
                authTitle.textContent = 'লগইন করুন';
                switchLink.textContent = 'আপনার কি একটি অ্যাকাউন্ট নেই? সাইনআপ করুন';
            }
        });
    }

    // ১. ইউজার লগইন হ্যান্ডেল
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = loginForm['login-email'].value;
            const password = loginForm['login-password'].value;
            try {
                await auth.signInWithEmailAndPassword(email, password);
                alert('সফলভাবে লগইন করা হয়েছে!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error("লগইন ব্যর্থ হয়েছে:", error);
                alert("লগইন ব্যর্থ হয়েছে: " + error.message);
            }
        });
    }

    // ২. ইউজার সাইনআপ হ্যান্ডেল
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = signupForm['signup-email'].value;
            const password = signupForm['signup-password'].value;
            try {
                await auth.createUserWithEmailAndPassword(email, password);
                alert('সফলভাবে সাইনআপ করা হয়েছে!');
                window.location.href = 'index.html';
            } catch (error) {
                console.error("সাইনআপ ব্যর্থ হয়েছে:", error);
                let errorMessage = "সাইনআপ ব্যর্থ হয়েছে।";
                
                if (error.code === 'auth/weak-password') {
                    errorMessage = "পাসওয়ার্ডটি খুব দুর্বল। কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড ব্যবহার করুন।";
                } else {
                    errorMessage = `সাইনআপ ব্যর্থ হয়েছে। (${error.message})`;
                }
                
                alert(errorMessage);
            }
        });
    }
    
    // ৩. অথেন্টিকেশন স্টেট পরিবর্তন (Auth state change handler)
    // এই অংশটি সব পেজেই লগইন স্ট্যাটাস বজায় রাখবে।
    auth.onAuthStateChanged(user => {
        if (user) {
            // ইউজার লগইন থাকলে
            if (postLinkSidebar) postLinkSidebar.style.display = 'flex';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগআউট';
                loginLinkSidebar.href = '#';
                
                // লগআউট ইভেন্ট হ্যান্ডেলার সেট করা
                loginLinkSidebar.onclick = async (e) => {
                    e.preventDefault();
                    await auth.signOut();
                    alert('সফলভাবে লগআউট করা হয়েছে!');
                    window.location.href = 'index.html';
                };
            }
        } else {
            // ইউজার লগইন না থাকলে
            if (postLinkSidebar) postLinkSidebar.style.display = 'none';
            if (loginLinkSidebar) {
                loginLinkSidebar.textContent = 'লগইন';
                loginLinkSidebar.href = 'auth.html';
                loginLinkSidebar.onclick = null; // লগইন লিঙ্কে ক্লিক করলে auth.html এ যাবে
            }
        }
    });

});
