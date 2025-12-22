document.addEventListener("DOMContentLoaded", function () {
    // ১. লগইন চেক (ধরে নিচ্ছি 'userLoggedIn' কি ব্যবহার করছেন)
    const isLoggedIn = localStorage.getItem('isLoggedIn'); 

    if (isLoggedIn !== 'true') {
        alert("এই পেইজটি দেখতে আপনাকে আগে লগইন করতে হবে।");
        window.location.href = "login.html"; // আপনার লগইন পেইজের নাম
        return;
    }

    // লগইন থাকলে কন্টেন্ট দেখাও
    document.getElementById('main-content').style.display = 'block';

    // ২. localStorage থেকে ডাটা নেওয়া (post.js এ সেভ করা key)
    const rawData = localStorage.getItem('previewData');
    
    if (rawData) {
        const adData = JSON.parse(rawData);

        // ৩. HTML এলিমেন্টে ডাটা বসানো
        document.getElementById('ad-title').innerText = adData.title || "শিরোনাম নেই";
        document.getElementById('ad-price').innerText = adData.price || "০";
        document.getElementById('ad-category').innerText = adData.category || "N/A";
        document.getElementById('ad-location').innerText = adData.location || "উল্লেখ নেই";
        document.getElementById('ad-description').innerText = adData.description || "কোনো বর্ণনা নেই";
        document.getElementById('ad-contact').innerText = adData.contact || "নম্বর পাওয়া যায়নি";

        // ৪. ছবি প্রদর্শন (একাধিক ছবি থাকলে প্রথমটি দেখাবে)
        if (adData.images && adData.images.length > 0) {
            document.getElementById('ad-image').src = adData.images[0];
        } else if (adData.image) {
            document.getElementById('ad-image').src = adData.image;
        }
    } else {
        document.getElementById('main-content').innerHTML = "<h2>কোনো বিজ্ঞাপনের তথ্য পাওয়া যায়নি!</h2>";
    }
});
