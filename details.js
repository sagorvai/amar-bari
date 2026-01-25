const urlParams = new URLSearchParams(window.location.search);
const propertyId = urlParams.get('id');

if (!propertyId) {
    alert("প্রপার্টি আইডি পাওয়া যায়নি!");
    window.location.href = 'index.html';
}

async function loadFullDetails() {
    try {
        const doc = await db.collection('properties').doc(propertyId).get();
        if (!doc.exists) {
            document.body.innerHTML = "<h2>বিজ্ঞাপনটি খুঁজে পাওয়া যায়নি।</h2>";
            return;
        }

        const data = doc.data();
        renderCompleteUI(data);
    } catch (error) {
        console.error("Error:", error);
    }
}

function renderCompleteUI(data) {
    // ১. বেসিক তথ্য
    document.getElementById('title').innerText = data.title;
    document.getElementById('price').innerText = `৳ ${data.price || data.monthlyRent || 'আলোচনা সাপেক্ষ'}`;
    document.getElementById('descText').innerText = data.description || "কোনো বিবরণ নেই।";
    document.getElementById('catTag').innerText = data.category;

    // ২. ইমেজ গ্যালারি (আগের মতোই)
    const displayImg = document.getElementById('displayImg');
    const thumbList = document.getElementById('thumbList');
    if (data.images && data.images.length > 0) {
        displayImg.src = data.images[0].url;
        data.images.forEach(img => {
            const t = document.createElement('img');
            t.src = img.url;
            t.onclick = () => displayImg.src = img.url;
            thumbList.appendChild(t);
        });
    }

    // ৩. ডাইনামিক ফিল্ডস (সব তথ্য দেখানোর ম্যাজিক)
    const specGrid = document.getElementById('specGrid');
    specGrid.innerHTML = ''; // ক্লিয়ার করা

    // সকল সম্ভাব্য ফিল্ডের বাংলা নাম (ম্যাপিং)
    const fieldLabels = {
        // সাধারণ
        type: 'প্রপার্টির ধরন',
        areaSize: 'আয়তন/সাইজ',
        bedRooms: 'বেডরুম',
        bathRooms: 'বাথরুম',
        floorLevel: 'তলা',
        facing: 'মুখ (Facing)',
        completionStatus: 'অবস্থা',
        
        // জমি সংক্রান্ত (Sale)
        landType: 'জমির ধরন',
        mouja: 'মৌজা',
        dagNo: 'দাগ নম্বর',
        khotianNo: 'খতিয়ান নম্বর',
        bookingMoney: 'বুকিং মানি',
        
        // লোকেশন বিস্তারিত
        district: 'জেলা',
        upazila: 'উপজেলা',
        union: 'ইউনিয়ন',
        village: 'গ্রাম/এলাকা',
        road: 'রাস্তা/ব্লক'
    };

    // ডেটা অবজেক্ট লুপ করে সব তথ্য বের করা
    // এখানে আমরা 'location' এবং 'owner' অবজেক্টের ভেতরেও খুঁজবো
    const allInfo = { ...data, ...data.location, ...data.owner };

    Object.keys(fieldLabels).forEach(key => {
        if (allInfo[key] && allInfo[key] !== "") {
            const box = document.createElement('div');
            box.className = 'spec-box';
            box.innerHTML = `
                <small style="color: #64748b; font-size: 13px;">${fieldLabels[key]}</small>
                <b style="display: block; font-size: 16px; color: #1e293b;">${allInfo[key]}</b>
            `;
            specGrid.appendChild(box);
        }
    });

    // ৪. কন্টাক্ট ইনফো
    document.getElementById('sellerName').innerText = data.ownerName || "বিজ্ঞাপনদাতা";
    document.getElementById('callLink').href = `tel:${data.phoneNumber}`;
    document.getElementById('waLink').href = `https://wa.me/88${data.phoneNumber}`;
}

loadFullDetails();
