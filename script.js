// script.js - জাভাস্ক্রিপ্ট লজিক

document.addEventListener('DOMContentLoaded', () => {
    // লগইন ফর্ম হ্যান্ডলিং
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault(); // ফর্ম সাবমিট ডিফল্ট আচরণ বন্ধ করা

            const email = loginForm.email.value;
            const password = loginForm.password.value;

            // এখানে আপনি লগইন লজিক যোগ করতে পারেন
            // যেমন: API কল, ইনপুট ভ্যালিডেশন ইত্যাদি।
            console.log('Login Attempt:', { email, password });

            // আপাতত একটি সাধারণ বার্তা দেখাচ্ছি
            alert('লগইন চেষ্টা করা হয়েছে। ব্যাকএন্ড লজিক এখনও যোগ করা হয়নি।');

            // সফল হলে অন্য পেজে রিডাইরেক্ট করতে পারেন:
            // window.location.href = 'dashboard.html';
        });
    }

    // রেজিস্ট্রেশন ফর্ম হ্যান্ডলিং
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', (event) => {
            event.preventDefault(); // ফর্ম সাবমিট ডিফল্ট আচরণ বন্ধ করা

            const name = registerForm.name.value;
            const email = registerForm.email.value;
            const password = registerForm.password.value;
            const confirmPassword = registerForm.confirmPassword.value;

            // প্রাথমিক ভ্যালিডেশন
            if (password !== confirmPassword) {
                alert('পাসওয়ার্ড মিলছে না!');
                return;
            }
            if (password.length < 6) {
                alert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে!');
                return;
            }

            // এখানে আপনি রেজিস্ট্রেশন লজিক যোগ করতে পারেন
            // যেমন: API কল, ডেটাবেজে সেভ করা ইত্যাদি।
            console.log('Registration Attempt:', { name, email, password });

            // আপাতত একটি সাধারণ বার্তা দেখাচ্ছি
            alert('রেজিস্ট্রেশন চেষ্টা করা হয়েছে। ব্যাকএন্ড লজিক এখনও যোগ করা হয়নি।');

            // সফল হলে লগইন পেজে রিডাইরেক্ট করতে পারেন:
            // window.location.href = 'login.html';
        });
    }
});