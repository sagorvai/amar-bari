// ১. প্রপার্টি আইডি সংগ্রহ
const urlParams = new URLSearchParams(window.location.search);
const propertyId = urlParams.get('id');

if (!propertyId) {
    alert("প্রপার্টি আইডি পাওয়া যায়নি!");
    window.location.href = 'index.html';
}

// ২. ডাটাবেজ থেকে তথ্য আনা
async function loadPropertyDetails() {
    try {
        const doc = await db.collection('properties').doc(propertyId).get();
        if (!doc.exists) {
            document.body.innerHTML = "<h2 style='text-align:center; margin-top:50px;'>দুঃখিত! এই বিজ্ঞাপনটি পাওয়া যায়নি।</h2>";
            return;
        }
        const data = doc.data();
        renderStructuredUI(data);
    } catch (error) {
        console.error("Error:", error);
    }
}

// ৩. সিরিয়াল অনুযায়ী ডাটা রেন্ডারিং
function renderStructuredUI(data) {
    // --- ক. হেডার ও ছবি (First Impression) ---
    document.getElementById('title').innerText = data.title;
    document.getElementById('price').innerText = `৳ ${data.price || data.monthlyRent || 'আলোচনা সাপেক্ষ'}`;
    document.getElementById('catTag').innerText = data.category;

    const displayImg = document.getElementById('displayImg');
    const thumbList = document.getElementById('thumbList');
    if (data.images && data.images.length > 0) {
        displayImg.src = data.images[0].url;
        thumbList.innerHTML = '';
        data.images.forEach((img, idx) => {
            const t = document.createElement('img');
            t.src = img.url;
            if(idx === 0) t.classList.add('active');
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

    // --- ১. পোস্টের ধরণ (Basic Info) ---
    addSectionHeader(specGrid, '📋 সাধারণ তথ্য');
    addSpecItem(specGrid, 'বিজ্ঞাপন দাতা', data.posterType);
    addSpecItem(specGrid, 'ক্যাটাগরি', data.category);
    addSpecItem(specGrid, 'প্রপার্টির ধরণ', data.type);

    // --- ২. প্রপার্টি বিবরণ (Property Features) ---
    addSectionHeader(specGrid, '🏠 প্রপার্টির অভ্যন্তরীণ বিবরণ');
    if (data.category === 'ভাড়া') {
        addSpecItem(specGrid, 'বেডরুম', data.bedRooms);
        addSpecItem(specGrid, 'বাথরুম', data.bathRooms);
        addSpecItem(specGrid, 'তলা/ফ্লোর', data.floorLevel);
        addSpecItem(specGrid, 'Facing (মুখ)', data.facing);
    } else {
        addSpecItem(specGrid, 'জমির আয়তন', data.areaSize);
        addSpecItem(specGrid, 'জমির ধরণ', data.landType);
        addSpecItem(specGrid, 'বর্তমান অবস্থা', data.completionStatus);
        addSpecItem(specGrid, 'বুকিং মানি', data.bookingMoney);
    }

    // --- ৩. ঠিকানা ও অবস্থান (Location) ---
    if (data.location) {
        addSectionHeader(specGrid, '📍 ঠিকানা ও অবস্থান');
        addSpecItem(specGrid, 'জেলা', data.location.district);
        addSpecItem(specGrid, 'উপজেলা', data.location.upazila);
        addSpecItem(specGrid, 'ইউনিয়ন/ওয়ার্ড', data.location.union || data.location.wardNo);
        addSpecItem(specGrid, 'গ্রাম/এলাকা', data.location.village);
        addSpecItem(specGrid, 'রাস্তা/ব্লক', data.location.road);
    }

    // --- ৪. মালিকানা বিবরণ (Ownership - Only for Sale) ---
    if (data.category === 'বিক্রয়' && data.owner) {
        addSectionHeader(specGrid, '📑 মালিকানা ও দলিলাদি');
        addSpecItem(specGrid, 'দাতার নাম', data.owner.donorName);
        addSpecItem(specGrid, 'মৌজা', data.owner.mouja);
        addSpecItem(specGrid, 'দাগ নম্বর', data.owner.dagNo);
        addSpecItem(specGrid, 'খতিয়ান নম্বর', data.owner.khotianNo);
        addSpecItem(specGrid, 'দাগের ধরণ', data.owner.dagNoType);
    }

    // --- ৫. যোগাযোগ (Contact) ---
    addSectionHeader(specGrid, '📞 যোগাযোগের মাধ্যম');
    addSpecItem(specGrid, 'যোগাযোগের নাম', data.ownerName);
    addSpecItem(specGrid, 'প্রাথমিক মোবাইল', data.phoneNumber);
    addSpecItem(specGrid, 'অন্যান্য মোবাইল', data.secondaryPhone);

    // --- ৬. বিস্তারিত বর্ণনা (Long Description) ---
    document.getElementById('descText').innerText = data.description || "কোনো বর্ণনা নেই।";

    // বাটন লিঙ্ক
    document.getElementById('callLink').href = `tel:${data.phoneNumber}`;
    document.getElementById('waLink').href = `https://wa.me/88${data.phoneNumber}`;
}

// স্টাইলিশ সেকশন হেডার
function addSectionHeader(container, title) {
    const header = document.createElement('div');
    header.style = `
        grid-column: 1 / -1; 
        margin-top: 30px; 
        padding: 12px; 
        background: linear-gradient(90deg, #f8fafc 0%, #ffffff 100%);
        color: #334155; 
        font-weight: bold; 
        border-bottom: 2px solid #e2e8f0;
        display: flex;
        align-items: center;
        font-size: 18px;
    `;
    header.innerText = title;
    container.appendChild(header);
}

// ডাটা বক্স
function addSpecItem(container, label, value) {
    if (!value || value === "" || value === undefined) return;
    const box = document.createElement('div');
    box.className = 'info-box';
    box.style = `
        padding: 15px;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
    `;
    box.innerHTML = `
        <span style="color: #64748b; font-size: 14px;">${label}</span>
        <span style="color: #1e293b; font-weight: 600;">${value}</span>
    `;
    container.appendChild(box);
}

loadPropertyDetails();
