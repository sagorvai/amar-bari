// Firebase Initialize (আপনার কনফিগারেশন index.html থেকে নেবে)
const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
    // ১. সাইডবার ও ইউজার হ্যান্ডলিং (index.js থেকে অনুপ্রাণিত)
    const menuButton = document.getElementById('menuButton');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    menuButton.onclick = () => { sidebar.classList.add('active'); overlay.classList.add('active'); };
    overlay.onclick = () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); };

    // ২. ডেটা রিড করা (SessionStorage থেকে)
    const pData = JSON.parse(sessionStorage.getItem('stagedPropertyData'));
    const iData = JSON.parse(sessionStorage.getItem('stagedImageMetadata'));

    if (!pData) {
        alert("কোনো তথ্য পাওয়া যায়নি!");
        window.location.href = 'index.html';
        return;
    }

    // ৩. কন্টেন্ট সেট করা
    document.getElementById('det-title').textContent = pData.title;
    document.getElementById('det-desc').textContent = pData.description || "কোনো বর্ণনা নেই।";
    document.getElementById('det-price').textContent = `৳ ${pData.price || pData.monthlyRent} (${pData.priceUnit || 'ফিক্সড'})`;
    
    const loc = pData.location;
    document.getElementById('det-location').innerHTML = `<i class="material-icons" style="font-size:18px;">place</i> ${loc.village}, ${loc.upazila}, ${loc.district}`;

    // ৪. ইমেজ গ্যালারি লজিক
    const mainImg = document.getElementById('mainViewImg');
    const thumbRow = document.getElementById('thumbRow');

    if (iData && iData.images && iData.images.length > 0) {
        mainImg.src = iData.images[0].url;
        iData.images.forEach((imgObj, idx) => {
            const thumb = document.createElement('img');
            thumb.src = imgObj.url;
            thumb.className = `thumb-img ${idx === 0 ? 'active' : ''}`;
            thumb.onclick = () => {
                mainImg.src = imgObj.url;
                document.querySelectorAll('.thumb-img').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbRow.appendChild(thumb);
        });
    }

    // ৫. ফিচার গ্রিড (Icons)
    const grid = document.getElementById('featureGrid');
    const features = [
        { icon: 'square_foot', label: 'আয়তন', val: pData.landArea || pData.areaSqft },
        { icon: 'king_bed', label: 'বেডরুম', val: pData.rooms },
        { icon: 'bathtub', label: 'বাথরুম', val: pData.bathrooms },
        { icon: 'layers', label: 'তলা', val: pData.floorNo },
        { icon: 'explore', label: 'মুখ', val: pData.facing }
    ];

    features.forEach(f => {
        if (f.val) {
            grid.innerHTML += `
                <div class="feature-item">
                    <i class="material-icons">${f.icon}</i>
                    <div>
                        <small style="display:block; color:#777;">${f.label}</small>
                        <strong>${f.val}</strong>
                    </div>
                </div>`;
        }
    });

    // ৬. কন্টাক্ট ইনফো
    document.getElementById('det-phone').textContent = pData.phoneNumber;
    document.getElementById('callBtn').href = `tel:${pData.phoneNumber}`;

    // ৭. প্রোফাইল চেক (index.js লজিক)
    auth.onAuthStateChanged(user => {
        if (user) {
            document.getElementById('profileImageWrapper').style.display = 'flex';
            // আপনি এখানে index.js এর loadProfilePicture ফাংশনটি কল করতে পারেন
        }
    });
});
