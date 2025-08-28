// Firebase Auth এবং Firestore এর জন্য প্রয়োজনীয় SDKs
const auth = firebase.auth();
const db = firebase.firestore();

// ফর্মের উপাদানগুলো নির্বাচন করা
const loginFormContainer = document.getElementById('login-form-container');
const registerFormContainer = document.getElementById('register-form-container');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');

// লগইন এবং রেজিস্ট্রেশন ফর্মের মধ্যে পরিবর্তন করার জন্য ইভেন্ট লিসেনার
document.addEventListener('DOMContentLoaded', function() {
    if (showRegisterLink && showLoginLink) {
        showRegisterLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginFormContainer.style.display = 'none';
            registerFormContainer.style.display = 'block';
        });

        showLoginLink.addEventListener('click', function(e) {
            e.preventDefault();
            loginFormContainer.style.display = 'block';
            registerFormContainer.style.display = 'none';
        });
    }
});

// রেজিস্ট্রেশন ফাংশন
registerBtn.addEventListener('click', function() {
    const name = document.getElementById('register-name').value;
    const mobile = document.getElementById('register-mobile').value;
    const password = document.getElementById('register-password').value;

    if (!name || !mobile || !password) {
        alert('সকল তথ্য পূরণ করুন।');
        return;
    }

    auth.createUserWithEmailAndPassword(mobile + "@amarbariapp.com", password)
        .then((userCredential) => {
            const user = userCredential.user;
            db.collection("users").doc(user.uid).set({
                name: name,
                mobile: mobile
            })
            .then(() => {
                alert("রেজিস্ট্রেশন সফল হয়েছে!");
                window.location.href = "index.html";
            })
            .catch((error) => {
                console.error("Firestore ডেটাবেজে ডেটা সংরক্ষণ করতে সমস্যা:", error);
                alert("রেজিস্ট্রেশন সফল, কিন্তু ডেটা সংরক্ষণ করা যায়নি।");
            });
        })
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            if (errorCode === 'auth/email-already-in-use') {
                alert('এই মোবাইল নম্বরটি ইতিমধ্যে ব্যবহৃত হয়েছে।');
            } else {
                alert("রেজিস্ট্রেশন ব্যর্থ: " + errorMessage);
            }
            console.error(error);
        });
});

// লগইন ফাংশন
loginBtn.addEventListener('click', function() {
    const mobile = document.getElementById('login-mobile').value;
    const password = document.getElementById('login-password').value;

    if (!mobile || !password) {
        alert('মোবাইল নম্বর এবং পাসওয়ার্ড দিন।');
        return;
    }

    auth.signInWithEmailAndPassword(mobile + "@amarbariapp.com", password)
        .then((userCredential) => {
            alert("লগইন সফল হয়েছে!");
            window.location.href = "index.html";
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
});
