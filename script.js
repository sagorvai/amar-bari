// script.js - জাভাস্ক্রিপ্ট লজিক

document.addEventListener('DOMContentLoaded', () => {
    // লগইন ফর্ম হ্যান্ডলিং
    const loginForm = document.getElementById('loginForm');
    const loginMessageDiv = document.createElement('div'); // মেসেজ দেখানোর জন্য নতুন div
    if (loginForm) {
        loginForm.parentNode.insertBefore(loginMessageDiv, loginForm.nextSibling); // ফর্মের নিচে মেসেজ div যোগ করা

        loginForm.addEventListener('submit', (event) => {
            event.preventDefault(); // ফর্ম সাবমিট ডিফল্ট আচরণ বন্ধ করা
            loginMessageDiv.textContent = ''; // পূর্ববর্তী বার্তা পরিষ্কার করা
            loginMessageDiv.className = ''; // ক্লাস পরিষ্কার করা

            const email = loginForm.email.value.trim(); // অতিরিক্ত স্পেস মুছে ফেলা
            const password = loginForm.password.value.trim();

            if (!email || !password) {
                loginMessageDiv.textContent = 'অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড উভয়ই পূরণ করুন।';
                loginMessageDiv.className = 'error-message';
                return;
            }

            // ইমেইল ফরম্যাট ভ্যালিডেশন (সাধারণ রেজেক্স)
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                loginMessageDiv.textContent = 'একটি সঠিক ইমেইল ঠিকানা দিন।';
                loginMessageDiv.className = 'error-message';
                return;
            }

            // এখানে আপনি লগইন লজিক যোগ করতে পারেন
            // যেমন: API কল, ইনপুট ভ্যালিডেশন ইত্যাদি।
            console.log('Login Attempt:', { email, password });

            // আপাতত একটি সফল বার্তা দেখাচ্ছি
            loginMessageDiv.textContent = 'লগইন চেষ্টা সফল হয়েছে! (ব্যাকএন্ড লজিক যোগ করা হয়নি)';
            loginMessageDiv.className = 'success-message';

            // সফল হলে অন্য পেজে রিডাইরেক্ট করতে পারেন:
            // setTimeout(() => {
            //     window.location.href = 'dashboard.html';
            // }, 2000); // 2 সেকেন্ড পর রিডাইরেক্ট
        });
    }

    // রেজিস্ট্রেশন ফর্ম হ্যান্ডলিং
    const registerForm = document.getElementById('registerForm');
    const registerMessageDiv = document.createElement('div'); // মেসেজ দেখানোর জন্য নতুন div
    if (registerForm) {
        registerForm.parentNode.insertBefore(registerMessageDiv, registerForm.nextSibling); // ফর্মের নিচে মেসেজ div যোগ করা

        registerForm.addEventListener('submit', (event) => {
            event.preventDefault(); // ফর্ম সাবমিট ডিফল্ট আচরণ বন্ধ করা
            registerMessageDiv.textContent = ''; // পূর্ববর্তী বার্তা পরিষ্কার করা
            registerMessageDiv.className = ''; // ক্লাস পরিষ্কার করা

            const name = registerForm.name.value.trim();
            const email = registerForm.email.value.trim();
            const password = registerForm.password.value.trim();
            const confirmPassword = registerForm.confirmPassword.value.trim();

            // প্রাথমিক ভ্যালিডেশন
            if (!name || !email || !password || !confirmPassword) {
                registerMessageDiv.textContent = 'অনুগ্রহ করে সকল ঘর পূরণ করুন।';
                registerMessageDiv.className = 'error-message';
                return;
            }

            if (password !== confirmPassword) {
                registerMessageDiv.textContent = 'পাসওয়ার্ড মিলছে না!';
                registerMessageDiv.className = 'error-message';
                return;
            }

            if (password.length < 6) {
                registerMessageDiv.textContent = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
                registerMessageDiv.className = 'error-message';
                return;
            }

            // ইমেইল ফরম্যাট ভ্যালিডেশন
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                registerMessageDiv.textContent = 'একটি সঠিক ইমেইল ঠিকানা দিন।';
                registerMessageDiv.className = 'error-message';
                return;
            }

            // এখানে আপনি রেজিস্ট্রেশন লজিক যোগ করতে পারেন
            // যেমন: API কল, ডেটাবেজে সেভ করা ইত্যাদি।
            console.log('Registration Attempt:', { name, email, password });

            // আপাতত একটি সফল বার্তা দেখাচ্ছি
            registerMessageDiv.textContent = 'রেজিস্ট্রেশন চেষ্টা সফল হয়েছে! এখন লগইন করুন। (ব্যাকএন্ড লজিক যোগ করা হয়নি)';
            registerMessageDiv.className = 'success-message';

            // সফল হলে লগইন পেজে রিডাইরেক্ট করতে পারেন:
            // setTimeout(() => {
            //     window.location.href = 'login.html';
            // }, 2000); // 2 সেকেন্ড পর রিডাইরেক্ট
        });
    }
});
