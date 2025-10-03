document.addEventListener('DOMContentLoaded', () => {
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const profileButton = document.getElementById('profileButton');

    // সাইড মেনু খোলার/বন্ধ করার কার্যকারিতা
    menuButton.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    });

    // ওভারলেতে ক্লিক করলে সাইড মেনু বন্ধ হবে
    overlay.addEventListener('click', () => {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    });

    // প্রোফাইল বাটনে ক্লিক করার কার্যকারিতা
    profileButton.addEventListener('click', () => {
        alert('প্রোফাইল পেজে নিয়ে যাওয়া হবে।');
        // এখানে প্রোফাইল পেজে নেভিগেট করার কোড যুক্ত হবে
    });

    // সাব-হেডারের বাটনগুলোর কার্যকারিতা
    const navButtons = document.querySelectorAll('.sub-header .nav-button');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            // সকল বাটন থেকে 'active' ক্লাস সরিয়ে দেওয়া
            navButtons.forEach(btn => btn.classList.remove('active'));
            
            // বর্তমান বাটনে 'active' ক্লাস যুক্ত করা
            button.classList.add('active');

            // ডিসপ্লে পরিবর্তন করার জন্য কার্যকারিতা
            const actionType = button.id.replace('Button', ''); // map, sell, rent
            
            let displayMessage = '';
            if (actionType === 'map') {
                displayMessage = 'সাইটের সকল পোস্টগুলো এখন Google Map আকারে দৃশ্যমান হবে।';
            } else if (actionType === 'sell') {
                displayMessage = 'সাইটের সকল বিক্রয় পোস্টগুলো এখানে দৃশ্যমান হবে।';
            } else if (actionType === 'rent') {
                displayMessage = 'সাইটের সকল ভাড়া পোস্টগুলো এখানে দৃশ্যমান হবে।';
            }

            document.querySelector('.placeholder-text').textContent = displayMessage;
            
            // **দ্রষ্টব্য:** এখানে AJAX কল বা ডেটা লোড করার আসল কোড লিখতে হবে।
        });
    });
});
