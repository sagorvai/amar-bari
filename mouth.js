document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form-container');
    const registerForm = document.getElementById('register-form-container');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');

    if (showRegisterLink && showLoginLink) {
        showRegisterLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
        });

        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
        });
    }
});

function login() {
    alert('লগইন বাটন কাজ করছে!');
    // এখানে ভবিষ্যতে আসল লগইন লজিক যুক্ত হবে
}

function register() {
    alert('রেজিস্ট্রেশন বাটন কাজ করছে!');
    // এখানে ভবিষ্যতে আসল রেজিস্ট্রেশন লজিক যুক্ত হবে
}