// ... (আগের আইডি এবং ডেটা ফেচিং কোড ঠিক থাকবে) ...

function renderCompleteUI(data) {
    // ইমেজ গ্যালারি এবং বেসিক হেডার সেটআপ (আগের মতো)
    document.getElementById('title').innerText = data.title;
    document.getElementById('price').innerText = `৳ ${data.price || data.monthlyRent || 'আলোচনা সাপেক্ষ'}`;
    const displayImg = document.getElementById('displayImg');
    if (data.images && data.images.length > 0) displayImg.src = data.images[0].url;

    const specGrid = document.getElementById('specGrid');
    specGrid.innerHTML = ''; // ক্লিয়ার করা

    // ১. পোস্টকারী ও ক্যাটাগরি তথ্য
    addSectionHeader(specGrid, '👤 পোস্টের সাধারণ তথ্য');
    addSpecItem(specGrid, 'পোস্টকারীর ধরন', data.posterType || 'ব্যক্তিগত');
    addSpecItem(specGrid, 'পোস্টের ক্যাটাগরি', data.category);
    addSpecItem(specGrid, 'প্রপার্টির ধরন', data.type);

    // ২. বিক্রয়/ভাড়া বিবরণ (ডাইনামিক ফিল্ডস)
    addSectionHeader(specGrid, '🏠 প্রপার্টি বিবরণ');
    if (data.category === 'ভাড়া') {
        addSpecItem(specGrid, 'মাসিক ভাড়া', data.monthlyRent);
        addSpecItem(specGrid, 'বেডরুম', data.bedRooms);
        addSpecItem(specGrid, 'বাথরুম', data.bathRooms);
        addSpecItem(specGrid, 'ফ্লোর লেভেল', data.floorLevel);
    } else {
        addSpecItem(specGrid, 'মূল্য', data.price);
        addSpecItem(specGrid, 'জমির আয়তন', data.areaSize);
        addSpecItem(specGrid, 'জমির ধরন', data.landType);
    }

    // ৩. মালিকানা বিবরণ (শুধুমাত্র বিক্রয়ের জন্য)
    if (data.category === 'বিক্রয়' && data.owner) {
        addSectionHeader(specGrid, '📑 মালিকানা বিবরণ');
        addSpecItem(specGrid, 'দাতার নাম', data.owner.donorName);
        addSpecItem(specGrid, 'মৌজা', data.owner.mouja);
        addSpecItem(specGrid, 'দাগ নম্বর', data.owner.dagNo);
        addSpecItem(specGrid, 'খতিয়ান নম্বর', data.owner.khotianNo);
        addSpecItem(specGrid, 'দাগের ধরন', data.owner.dagNoType);
    }

    // ৪. ঠিকানা ও অবস্থান
    if (data.location) {
        addSectionHeader(specGrid, '📍 ঠিকানা ও অবস্থান');
        addSpecItem(specGrid, 'জেলা', data.location.district);
        addSpecItem(specGrid, 'উপজেলা', data.location.upazila);
        addSpecItem(specGrid, 'ইউনিয়ন/ওয়ার্ড', data.location.union || data.location.wardNo);
        addSpecItem(specGrid, 'গ্রাম/রাস্তা', `${data.location.village}, ${data.location.road}`);
    }

    // ৫. যোগাযোগের তথ্য
    addSectionHeader(specGrid, '📞 যোগাযোগের তথ্য');
    addSpecItem(specGrid, 'নাম', data.ownerName || 'বিজ্ঞাপনদাতা');
    addSpecItem(specGrid, 'প্রাথমিক ফোন', data.phoneNumber);
    addSpecItem(specGrid, 'অতিরিক্ত ফোন', data.secondaryPhone || 'নেই');

    // ৬. প্রপার্টির বিস্তারিত বর্ণনা (নিচে বড় করে)
    document.getElementById('descText').innerText = data.description || "কোনো বিস্তারিত বর্ণনা দেওয়া হয়নি।";

    // কন্টাক্ট বাটন আপডেট
    document.getElementById('callLink').href = `tel:${data.phoneNumber}`;
    document.getElementById('waLink').href = `https://wa.me/88${data.phoneNumber}`;
}

// সাহায্যকারী ফাংশন: সেকশন হেডার যোগ করা
function addSectionHeader(container, title) {
    const header = document.createElement('div');
    header.className = 'section-title'; // CSS-এ এটার ডিজাইন দিতে হবে
    header.style = "grid-column: 1 / -1; margin-top: 20px; padding: 10px; background: #f0f7ff; color: #0056b3; font-weight: bold; border-radius: 5px;";
    header.innerText = title;
    container.appendChild(header);
}

// সাহায্যকারী ফাংশন: আইটেম যোগ করা
function addSpecItem(container, label, value) {
    if (!value || value === "") return;
    const box = document.createElement('div');
    box.className = 'spec-box';
    box.innerHTML = `<small>${label}</small><b>${value}</b>`;
    container.appendChild(box);
        }
