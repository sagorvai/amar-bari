// Firebase SDKs
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const switchLink = document.getElementById('switch-link');
    const authTitle = document.getElementById('auth-title');
    
    // New UI elements
    const menuToggle = document.getElementById('menu-toggle');
    const sideMenu = document.getElementById('side-menu');
    const profileLink = document.getElementById('profile-link');
    const postLink = document.getElementById('post-link');
    const logoutLink = document.getElementById('logout-link');

    // Show login form by default, hide signup
    if (loginForm && signupForm) {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    }

    // Switch between login and signup forms
    if (switchLink) {
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

    // Handle user login
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

    // Handle user signup
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
                alert("সাইনআপ ব্যর্থ হয়েছে: " + error.message);
            }
        });
    }
    
    // Auth state change handler for all pages
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is logged in
            if (profileLink) {
                profileLink.href = '#';
                profileLink.innerHTML = `<i class="fas fa-user-circle"></i> প্রোফাইল`;
            }
            if (logoutLink) logoutLink.style.display = 'block';
        } else {
            // User is logged out
            if (profileLink) {
                profileLink.href = 'auth.html';
                profileLink.innerHTML = `<i class="fas fa-user-circle"></i> লগইন`;
            }
            if (logoutLink) logoutLink.style.display = 'none';
        }
    });

    // Menu toggle
    if (menuToggle && sideMenu) {
        menuToggle.addEventListener('click', () => {
            sideMenu.classList.toggle('open');
        });
    }

});
