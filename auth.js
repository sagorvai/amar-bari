// Firebase Auth এবং Firestore এর জন্য প্রয়োজনীয় SDKs
const auth = firebase.auth();
const db = firebase.firestore();

// ফর্মের উপাদানগুলো নির্বাচন করা
const loginForm = document.getElementById('login-form-container');
const registerForm = document.getElementById('register-form-container');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');

// লগইন এবং রেজিস্ট্রেশন ফর্মের মধ্যে পরিবর্তন করার জন্য ইভেন্ট লিসেনার
document.addEventListener('DOMContentLoaded', function() {
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

// রেজিস্ট্রেশন ফাংশন
function register() {
    const name = document.getElementById('register-name').value;
    const mobile = document.getElementById('register-mobile').value;
    const password = document.getElementById('register-password').value;

    if (!name || !mobile || !password) {
        alert('সকল তথ্য পূরণ করুন।');
        return;
    }

    // Firebase-এর Email/Password Authentication ব্যবহার করে নতুন ইউজার তৈরি
    auth.createUserWithEmailAndPassword(mobile + "@amarbariapp.com", password)
        .then((userCredential) => {
            // রেজিস্ট্রেশন সফল হলে
            const user = userCredential.user;
            // ব্যবহারকারীর তথ্য Firestore ডেটাবেজে সংরক্ষণ
            db.collection("users").doc(user.uid).set({
                name: name,
                mobile: mobile
            })
            .then(() => {
                alert("রেজিস্ট্রেশন সফল হয়েছে!");
                window.location.href = "index.html"; // হোমপেজে ফিরে যাওয়া
            })
            .catch((error) => {
                console.error("Firestore ডেটাবেজে ডেটা সংরক্ষণ করতে সমস্যা:", error);
                alert("রেজিস্ট্রেশন সফল, কিন্তু ডেটা সংরক্ষণ করা যায়নি।");
            });
        })
        .catch((error) => {
            // রেজিস্ট্রেশনে কোনো সমস্যা হলে
            const errorCode = error.code;
            const errorMessage = error.message;
            if (errorCode === 'auth/email-already-in-use') {
                alert('এই মোবাইল নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে।');
            } else {
                alert("রেজিস্ট্রেশন ব্যর্থ: " + errorMessage);
            }
            console.error(error);
        });
}

// লগইন ফাংশন
function login() {
    const mobile = document.getElementById('login-mobile').value;
    const password = document.getElementById('login-password').value;

    if (!mobile || !password) {
        alert('মোবাইল নম্বর এবং পাসওয়ার্ড দিন।');
        return;
    }

    // Firebase-এর Email/Password Authentication ব্যবহার করে লগইন
    auth.signInWithEmailAndPassword(mobile + "@amarbariapp.com", password)
        .then((userCredential) => {
            alert("লগইন সফল হয়েছে!");
            window.location.href = "index.html"; // হোমপেজে ফিরে যাওয়া
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            if (errorCode === 'auth/user-not-found' || errorCode === 'auth/wrong-password') {
                alert('ভুল মোবাইল নম্বর বা পাসওয়ার্ড।');
            } else {
                alert("লগইন ব্যর্থ: " + errorMessage);
            }
            console.error(error);
        });
}