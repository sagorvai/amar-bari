// Firebase SDKs
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const switchLink = document.getElementById('switch-link');
    const authTitle = document.getElementById('auth-title');

    // Show login form by default
    if (loginForm) {
        loginForm.style.display = 'block';
    }
    if (signupForm) {
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
            const email = loginForm['email'].value;
            const password = loginForm['password'].value;
            try {
                await auth.signInWithEmailAndPassword(email, password);
                alert('সফলভাবে লগইন করা হয়েছে!');
                // Redirect to homepage after successful login
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
            const email = signupForm['email'].value;
            const password = signupForm['password'].value;
            try {
                await auth.createUserWithEmailAndPassword(email, password);
                alert('সফলভাবে সাইনআপ করা হয়েছে!');
                // Redirect to login page or homepage after successful signup
                window.location.href = 'index.html';
            } catch (error) {
                console.error("সাইনআপ ব্যর্থ হয়েছে:", error);
                alert("সাইনআপ ব্যর্থ হয়েছে: " + error.message);
            }
        });
    }

});
