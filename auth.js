// Firebase SDKs
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const authForm = document.getElementById('auth-form');
    const authTitle = document.querySelector('.auth-container h2');
    const authButton = document.querySelector('#auth-form button');
    const switchAuthLink = document.getElementById('switch-auth');
    let isLogin = false;

    // Toggle between login and register forms
    if(switchAuthLink) {
        switchAuthLink.addEventListener('click', function(e) {
            e.preventDefault();
            isLogin = !isLogin;
            if (isLogin) {
                authTitle.textContent = 'লগইন করুন';
                authButton.textContent = 'লগইন করুন';
                switchAuthLink.textContent = 'অ্যাকাউন্ট তৈরি করুন';
            } else {
                authTitle.textContent = 'অ্যাকাউন্ট তৈরি করুন';
                authButton.textContent = 'রেজিস্টার করুন';
                switchAuthLink.textContent = 'লগইন করুন';
            }
        });
    }

    // Handle form submission
    if(authForm) {
        authForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                if (isLogin) {
                    // Login existing user
                    await auth.signInWithEmailAndPassword(email, password);
                    alert('সফলভাবে লগইন করা হয়েছে!');
                } else {
                    // Register new user
                    await auth.createUserWithEmailAndPassword(email, password);
                    alert('অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে!');
                }
                window.location.href = 'index.html'; // Redirect to home page
            } catch (error) {
                console.error("Authentication Error: ", error);
                alert("অ্যাকাউন্ট তৈরি বা লগইন ব্যর্থ হয়েছে। ত্রুটি: " + error.message);
            }
        });
    }

    // Handle UI changes on auth state change
    auth.onAuthStateChanged(user => {
        const postLink = document.getElementById('post-link');
        const loginLink = document.getElementById('login-link');
        if (user) {
            if (postLink) postLink.style.display = 'inline-block';
            if (loginLink) {
                loginLink.textContent = 'লগআউট';
                loginLink.href = '#';
                loginLink.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await auth.signOut();
                    alert('সফলভাবে লগআউট করা হয়েছে!');
                    window.location.href = 'index.html';
                });
            }
        } else {
            if (postLink) postLink.style.display = 'none';
            if (loginLink) {
                loginLink.textContent = 'লগইন';
                loginLink.href = 'auth.html';
            }
        }
    });
});
