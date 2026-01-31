// ১. প্রপার্টি আইডি সংগ্রহ
const urlParams = new URLSearchParams(window.location.search);
const propertyId = urlParams.get('id');

if (!propertyId) {
    alert("প্রপার্টি আইডি পাওয়া যায়নি!");
    window.location.href = 'index.html';
}

// ২. ডাটাবেজ থেকে তথ্য লোড করা
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

// ৩. UI রেন্ডারিং ফাংশন
function renderStructuredUI(data) {
    // --- ক. হেডার ও ছবি ---
    document.getElementById('title').innerText = data.title || "শিরোনাম নেই";
    
    // দাম ও ইউনিট সেটআপ
    let priceDisplay = "আলোচনা সাপেক্ষ";
    if (data.price) priceDisplay = `৳ ${data.price}`;
    else if (data.monthlyRent) priceDisplay = `৳ ${data.monthlyRent} / মাস`;
    document.getElementById('price').innerText = priceDisplay;
    
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

    // --- ১. সাধারণ তথ্য ---
    addSectionHeader(specGrid, '📋 সাধারণ তথ্য');
    addSpecItem(specGrid, 'বিজ্ঞাপন দাতা', data.posterType);
    addSpecItem(specGrid, 'ক্যাটাগরি', data.category);
    addSpecItem(specGrid, 'প্রপার্টির ধরণ', data.type);

    // --- ২. প্রপার্টি বিবরণ (ইন্টারনাল ডিটেইলস) ---
    // এখানে আপনার ডাটাবেজের সঠিক ফিল্ড নামগুলো ব্যবহার করা হয়েছে
    addSectionHeader(specGrid, '🏠 প্রপার্টির অভ্যন্তরীণ বিবরণ');
    
    if (data.category === 'ভাড়া' || data.type === 'ফ্ল্যাট' || data.type === 'বাড়ি') {
        addSpecItem(specGrid, 'বেডরুম', data.bedRooms ? `${data.bedRooms} টি` : null);
        addSpecItem(specGrid, 'বাথরুম', data.bathRooms ? `${data.bathRooms} টি` : null);
        addSpecItem(specGrid, 'তলা/ফ্লোর', data.floorLevel ? `${data.floorLevel} তলা` : null);
        addSpecItem(specGrid, 'আয়তন', data.areaSize ? `${data.areaSize} স্কয়ার ফিট` : null);
        addSpecItem(specGrid, 'Facing (মুখ)', data.facing);
    } 
    
    if (data.category === 'বিক্রয়') {
        addSpecItem(specGrid, 'জমির আয়তন', data.areaSize ? `${data.areaSize} শতাংশ/কাঠা` : null);
        addSpecItem(specGrid, 'জমির ধরণ', data.landType);
        addSpecItem(specGrid, 'বর্তমান অবস্থা', data.completionStatus);
        addSpecItem(specGrid, 'বুকিং মানি', data.bookingMoney ? `৳ ${data.bookingMoney}` : null);
    }

    // --- ৩. ঠিকানা ও অবস্থান ---
    if (data.location) {
        addSectionHeader(specGrid, '📍 ঠিকানা ও অবস্থান');
        addSpecItem(specGrid, 'জেলা', data.location.district);
        addSpecItem(specGrid, 'উপজেলা', data.location.upazila);
        addSpecItem(specGrid, 'ইউনিয়ন/ওয়ার্ড', data.location.union || data.location.wardNo);
        addSpecItem(specGrid, 'গ্রাম/এলাকা', data.location.village);
        addSpecItem(specGrid, 'রাস্তা/ব্লক', data.location.road);
    }

    // --- ৪. মালিকানা বিবরণ (Only for Sale) ---
    if (data.category === 'বিক্রয়' && data.owner) {
        addSectionHeader(specGrid, '📑 মালিকানা ও দলিলাদি');
        addSpecItem(specGrid, 'দাতার নাম', data.owner.donorName);
        addSpecItem(specGrid, 'মৌজা', data.owner.mouja);
        addSpecItem(specGrid, 'দাগ নম্বর', data.owner.dagNo);
        addSpecItem(specGrid, 'খতিয়ান নম্বর', data.owner.khotianNo);
    }

    // --- ৫. যোগাযোগ ---
    addSectionHeader(specGrid, '📞 যোগাযোগের মাধ্যম');
    addSpecItem(specGrid, 'নাম', data.ownerName);
    addSpecItem(specGrid, 'মোবাইল', data.phoneNumber);
    addSpecItem(specGrid, 'অন্যান্য ফোন', data.secondaryPhone);

    // --- ৬. বিস্তারিত বর্ণনা ---
    document.getElementById('descText').innerText = data.description || "কোনো বর্ণনা নেই।";

    // বাটন লিঙ্ক
    document.getElementById('callLink').href = `tel:${data.phoneNumber}`;
    document.getElementById('waLink').href = `https://wa.me/88${data.phoneNumber}`;
}

// সেকশন হেডার স্টাইল
function addSectionHeader(container, title) {
    const header = document.createElement('div');
    header.style = "grid-column: 1 / -1; margin-top: 25px; padding: 10px; background: #f8fafc; border-left: 5px solid #2563eb; font-weight: bold; font-size: 16px; color: #334155;";
    header.innerText = title;
    container.appendChild(header);
}

// ডাটা বক্স স্টাইল (লেবেল ও ভ্যালু ইউনিটসহ)
function addSpecItem(container, label, value) {
    if (!value || value === "" || value === "undefined" || value === null) return;
    const box = document.createElement('div');
    box.style = "padding: 12px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #fff;";
    box.innerHTML = `
        <span style="color: #64748b; font-size: 14px;">${label}</span>
        <span style="color: #1e293b; font-weight: 600; font-size: 15px;">${value}</span>
    `;
    container.appendChild(box);
}

loadPropertyDetails();
