// ১. URL থেকে প্রপার্টি ID সংগ্রহ করা
const urlParams = new URLSearchParams(window.location.search);
const propertyId = urlParams.get('id');

if (!propertyId) {
    alert("প্রপার্টি আইডি পাওয়া যায়নি!");
    window.location.href = 'index.html';
}

// ২. ডেটাবেজ থেকে তথ্য লোড করা
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
    // --- বেসিক হেডার তথ্য ---
    document.getElementById('title').innerText = data.title;
    document.getElementById('price').innerText = `৳ ${data.price || data.monthlyRent || 'আলোচনা সাপেক্ষ'}`;
    document.getElementById('catTag').innerText = data.category;

    // --- ইমেজ গ্যালারি সেটআপ ---
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
    specGrid.innerHTML = ''; // ক্লিয়ার করা

    // --- ১. পোস্টকারী ও ক্যাটাগরি তথ্য ---
    addSectionHeader(specGrid, '👤 পোস্টের সাধারণ তথ্য');
    addSpecItem(specGrid, 'পোস্টকারীর ধরন', data.posterType || 'ব্যক্তিগত');
    addSpecItem(specGrid, 'পোস্টের ক্যাটাগরি', data.category);
    addSpecItem(specGrid, 'প্রপার্টির ধরন', data.type);

    // --- ২. বিক্রয়/ভাড়া বিবরণ ---
    addSectionHeader(specGrid, '🏠 প্রপার্টি বিবরণ');
    if (data.category === 'ভাড়া') {
        addSpecItem(specGrid, 'মাসিক ভাড়া', data.monthlyRent ? `৳ ${data.monthlyRent}` : null);
        addSpecItem(specGrid, 'বেডরুম', data.bedRooms);
        addSpecItem(specGrid, 'বাথরুম', data.bathRooms);
        addSpecItem(specGrid, 'ফ্লোর লেভেল', data.floorLevel);
        addSpecItem(specGrid, 'মুখ (Facing)', data.facing);
    } else {
        addSpecItem(specGrid, 'মোট মূল্য', data.price ? `৳ ${data.price}` : null);
        addSpecItem(specGrid, 'জমির আয়তন', data.areaSize);
        addSpecItem(specGrid, 'জমির ধরন', data.landType);
        addSpecItem(specGrid, 'অবস্থা (Status)', data.completionStatus);
        addSpecItem(specGrid, 'বুকিং মানি', data.bookingMoney);
    }

    // --- ৩. মালিকানা বিবরণ (শুধুমাত্র বিক্রয়ের জন্য) ---
    if (data.category === 'বিক্রয়' && data.owner) {
        addSectionHeader(specGrid, '📑 মালিকানা তথ্য');
        addSpecItem(specGrid, 'দাতার নাম', data.owner.donorName);
        addSpecItem(specGrid, 'মৌজা', data.owner.mouja);
        addSpecItem(specGrid, 'দাগ নম্বর', data.owner.dagNo);
        addSpecItem(specGrid, 'দাগের ধরন', data.owner.dagNoType);
        addSpecItem(specGrid, 'খতিয়ান নম্বর', data.owner.khotianNo);
    }

    // --- ৪. ঠিকানা ও অবস্থান ---
    if (data.location) {
        addSectionHeader(specGrid, '📍 ঠিকানা ও অবস্থান');
        addSpecItem(specGrid, 'জেলা', data.location.district);
        addSpecItem(specGrid, 'উপজেলা', data.location.upazila);
        addSpecItem(specGrid, 'ইউনিয়ন/ওয়ার্ড', data.location.union || data.location.wardNo);
        addSpecItem(specGrid, 'গ্রাম/এলাকা', data.location.village);
        addSpecItem(specGrid, 'রাস্তা/ব্লক', data.location.road);
    }

    // --- ৫. যোগাযোগের তথ্য ---
    addSectionHeader(specGrid, '📞 যোগাযোগ');
    addSpecItem(specGrid, 'নাম', data.ownerName || 'বিজ্ঞাপনদাতা');
    addSpecItem(specGrid, 'প্রাথমিক ফোন', data.phoneNumber);
    addSpecItem(specGrid, 'অতিরিক্ত ফোন', data.secondaryPhone);

    // --- ৬. প্রপার্টির বিস্তারিত বর্ণনা ---
    document.getElementById('descText').innerText = data.description || "কোনো বিস্তারিত বর্ণনা দেওয়া হয়নি।";

    // কন্টাক্ট অ্যাকশন বাটন
    document.getElementById('callLink').href = `tel:${data.phoneNumber}`;
    document.getElementById('waLink').href = `https://wa.me/88${data.phoneNumber}`;
}

// সাহায্যকারী ফাংশন: সেকশন টাইটেল তৈরি
function addSectionHeader(container, title) {
    const header = document.createElement('div');
    header.style = `
        grid-column: 1 / -1; 
        margin-top: 25px; 
        padding: 8px 15px; 
        background: #f1f5f9; 
        color: #334155; 
        font-weight: 700; 
        border-radius: 8px; 
        border-left: 5px solid #2563eb;
        font-size: 16px;
    `;
    header.innerText = title;
    container.appendChild(header);
}

// সাহায্যকারী ফাংশন: প্রতিটি তথ্যের বক্স তৈরি
function addSpecItem(container, label, value) {
    if (!value || value === "" || value === undefined) return;
    const box = document.createElement('div');
    box.className = 'spec-box';
    box.style = `
        padding: 12px;
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
    `;
    box.innerHTML = `
        <small style="color: #64748b; font-size: 12px; font-weight: 500;">${label}</small>
        <span style="color: #1e293b; font-size: 15px; font-weight: 600;">${value}</span>
    `;
    container.appendChild(box);
}

// ডাটা লোড শুরু করা
loadFullDetails();
