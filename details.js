// ১. URL থেকে ID সংগ্রহ করা
const urlParams = new URLSearchParams(window.location.search);
const propertyId = urlParams.get('id');

if (!propertyId) {
    alert("ভুল লিঙ্ক! হোম পেজে ফিরে যান।");
    window.location.href = 'index.html';
}

// ২. ডেটাবেজ থেকে তথ্য আনা
async function loadPropertyDetails() {
    try {
        const doc = await db.collection('properties').doc(propertyId).get();
        if (!doc.exists) {
            document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>দুঃখিত! এই বিজ্ঞাপনটি খুঁজে পাওয়া যায়নি।</h2>";
            return;
        }

        const data = doc.data();
        displayUI(data);
    } catch (error) {
        console.error("Error:", error);
    }
}

// ৩. UI-তে ডেটা প্রদর্শন করা
function displayUI(data) {
    // বেসিক টেক্সট
    document.getElementById('title').innerText = data.title;
    document.getElementById('catTag').innerText = data.category;
    document.getElementById('descText').innerText = data.description || "কোনো বিবরণ নেই।";
    document.getElementById('price').innerText = `৳ ${data.price || data.monthlyRent || 'আলোচনা সাপেক্ষ'}`;
    
    // লোকেশন ফরম্যাট
    const loc = data.location;
    document.getElementById('location').innerHTML = `<i class="fas fa-map-marker-alt"></i> ${loc.village}, ${loc.upazila}, ${loc.district}`;

    // ছবি সেটআপ
    const displayImg = document.getElementById('displayImg');
    const thumbList = document.getElementById('thumbList');
    if (data.images && data.images.length > 0) {
        displayImg.src = data.images[0].url;
        data.images.forEach((img, idx) => {
            const t = document.createElement('img');
            t.src = img.url;
            t.onclick = () => {
                displayImg.src = img.url;
                document.querySelectorAll('.thumb-container img').forEach(i => i.classList.remove('active'));
                t.classList.add('active');
            };
            if(idx === 0) t.classList.add('active');
            thumbList.appendChild(t);
        });
    }

    // ৪. ডাইনামিক ফিল্ড জেনারেটর (অত্যাধুনিক পদ্ধতি)
    const specGrid = document.getElementById('specGrid');
    const fieldsToDisplay = {
        'type': 'প্রপার্টির ধরন',
        'areaSize': 'আয়তন',
        'bedRooms': 'বেডরুম',
        'bathRooms': 'বাথরুম',
        'floorLevel': 'তলা',
        'landType': 'জমির ধরন',
        'facing': 'মুখ',
        'bookingMoney': 'বুকিং মানি',
        'mouja': 'মৌজা'
    };

    for (const [key, label] of Object.entries(fieldsToDisplay)) {
        if (data[key]) {
            const box = document.createElement('div');
            box.className = 'spec-box';
            box.innerHTML = `<small>${label}</small><b>${data[key]}</b>`;
            specGrid.appendChild(box);
        }
    }

    // ৫. কন্টাক্ট বাটন
    document.getElementById('callLink').href = `tel:${data.phoneNumber}`;
    document.getElementById('waLink').href = `https://wa.me/88${data.phoneNumber}`;
}

// লোড শুরু
loadPropertyDetails();
