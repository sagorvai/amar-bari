// ১. URL থেকে আইডি সংগ্রহ
const urlParams = new URLSearchParams(window.location.search);
const propertyId = urlParams.get('id');

if (!propertyId) {
    alert("প্রপার্টি আইডি পাওয়া যায়নি!");
    window.location.href = 'index.html';
}

// ২. ডাটাবেজ থেকে তথ্য আনা
async function loadFullDetails() {
    try {
        const doc = await db.collection('properties').doc(propertyId).get();
        if (!doc.exists) {
            document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>দুঃখিত! এই বিজ্ঞাপনটি খুঁজে পাওয়া যায়নি।</h2>";
            return;
        }

        const data = doc.data();
        renderCompleteUI(data);
    } catch (error) {
        console.error("Error fetching data:", error);
    }
}

// ৩. UI রেন্ডারিং ফাংশন
function renderCompleteUI(data) {
    // হেডার ও প্রাইস সেটআপ
    document.getElementById('title').innerText = data.title || "শিরোনাম নেই";
    document.getElementById('price').innerText = `৳ ${data.price || data.monthlyRent || 'আলোচনা সাপেক্ষ'}`;
    document.getElementById('catTag').innerText = data.category || "General";

    // ইমেজ গ্যালারি
    const displayImg = document.getElementById('displayImg');
    const thumbList = document.getElementById('thumbList');
    if (data.images && data.images.length > 0) {
        displayImg.src = data.images[0].url;
        thumbList.innerHTML = '';
        data.images.forEach((img, idx) => {
            const t = document.createElement('img');
            t.src = img.url;
            t.className = idx === 0 ? 'active' : '';
            t.onclick = () => {
                displayImg.src = img.url;
                document.querySelectorAll('.thumb-container img').forEach(i => i.classList.remove('active'));
                t.classList.add('active');
            };
            thumbList.appendChild(t);
        });
    }

    const specGrid = document.getElementById('specGrid');
    specGrid.innerHTML = ''; 

    // ফিল্ডের নামগুলো বাংলায় রূপান্তরের ম্যাপ
    const labelMap = {
        posterType: 'পোস্টকারীর ধরন', category: 'ক্যাটাগরি', type: 'প্রপার্টির ধরন',
        areaSize: 'আয়তন/সাইজ', bedRooms: 'বেডরুম', bathRooms: 'বাথরুম',
        floorLevel: 'তলা/লেভেল', facing: 'মুখ (Facing)', completionStatus: 'অবস্থা',
        monthlyRent: 'মাসিক ভাড়া', price: 'মোট মূল্য', bookingMoney: 'বুকিং মানি',
        donorName: 'দাতার নাম', mouja: 'মৌজা', dagNo: 'দাগ নম্বর',
        dagNoType: 'দাগের ধরন', khotianNo: 'খতিয়ান নম্বর',
        district: 'জেলা', upazila: 'উপজেলা', union: 'ইউনিয়ন/ওয়ার্ড',
        village: 'গ্রাম/এলাকা', road: 'রাস্তা/ব্লক',
        phoneNumber: 'প্রাথমিক ফোন', secondaryPhone: 'অতিরিক্ত ফোন', ownerName: 'মালিকের নাম'
    };

    // যে ফিল্ডগুলো আমরা বক্সে দেখাব না (কারণ এগুলো আলাদাভাবে টাইটেল বা ডেসক্রিপশনে আছে)
    const skipFields = ['title', 'description', 'images', 'status', 'location', 'owner', 'timestamp'];

    // --- ১. সকল সাধারণ ও ডাইনামিক ফিল্ড অটো-লুপ ---
    addSectionHeader(specGrid, '📊 প্রপার্টির সকল তথ্য');
    
    // মূল অবজেক্টের ভেতর থেকে সব ডেটা বের করা
    Object.keys(data).forEach(key => {
        if (!skipFields.includes(key) && data[key]) {
            addSpecItem(specGrid, labelMap[key] || key, data[key]);
        }
    });

    // --- ২. লোকেশন অবজেক্টের ভেতর থেকে সব তথ্য ---
    if (data.location) {
        addSectionHeader(specGrid, '📍 ঠিকানা ও অবস্থান');
        Object.keys(data.location).forEach(key => {
            if (data.location[key]) {
                addSpecItem(specGrid, labelMap[key] || key, data.location[key]);
            }
        });
    }

    // --- ৩. মালিকানা অবজেক্টের ভেতর থেকে সব তথ্য (বিক্রয় হলে) ---
    if (data.owner) {
        addSectionHeader(specGrid, '📑 মালিকানা ও দলিলাদি');
        Object.keys(data.owner).forEach(key => {
            if (data.owner[key]) {
                addSpecItem(specGrid, labelMap[key] || key, data.owner[key]);
            }
        });
    }

    // ডেসক্রিপশন
    document.getElementById('descText').innerText = data.description || "কোনো বিস্তারিত বর্ণনা দেওয়া হয়নি।";

    // বাটন অ্যাকশন
    document.getElementById('callLink').href = `tel:${data.phoneNumber}`;
    document.getElementById('waLink').href = `https://wa.me/88${data.phoneNumber}`;
}

// সাহায্যকারী ফাংশন: সেকশন টাইটেল
function addSectionHeader(container, title) {
    const header = document.createElement('div');
    header.style = `grid-column: 1 / -1; margin-top: 25px; padding: 10px 15px; background: #eef2f6; color: #1e293b; font-weight: 700; border-radius: 8px; border-left: 5px solid #2563eb; font-size: 16px;`;
    header.innerText = title;
    container.appendChild(header);
}

// সাহায্যকারী ফাংশন: প্রতিটি তথ্যের বক্স
function addSpecItem(container, label, value) {
    if (typeof value === 'object') return; // ছবি বা অন্য অবজেক্ট বাদ দিতে
    const box = document.createElement('div');
    box.style = `padding: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; flex-direction: column; gap: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);`;
    box.innerHTML = `
        <small style="color: #64748b; font-size: 12px; font-weight: 500; text-transform: capitalize;">${label}</small>
        <span style="color: #1e293b; font-size: 15px; font-weight: 600;">${value}</span>
    `;
    container.appendChild(box);
}

loadFullDetails();
