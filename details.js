// Firebase Config আগের মতোই থাকবে...
const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get('id');

document.addEventListener('DOMContentLoaded', async () => {
    if (!postId) return;
    const doc = await db.collection('properties').doc(postId).get();
    if (doc.exists) {
        const data = doc.data();
        renderDetails(data);
        loadRelatedPosts(data);
    }
});

function renderDetails(data) {
    document.getElementById('p-title').textContent = data.title || "";
    document.getElementById('p-desc').textContent = data.description || "";

    // ১. দামের সাথে ইউনিট (বিক্রয় ও ভাড়া উভয় ক্ষেত্রেই সমাধান)
    let amount = data.category === 'বিক্রয়' ? data.price : data.monthlyRent;
    // এখানে priceUnit বা rentUnit যেটা পাওয়া যাবে সেটাই নিবে
    let unit = data.priceUnit || data.rentUnit || ""; 
    document.getElementById('p-price').textContent = amount ? `৳ ${amount} (${unit})` : "আলোচনা সাপেক্ষ";

    // ইমেজ গ্যালারি
    let images = [];
    if (data.images) data.images.forEach(img => images.push(img.url || img));
    if (data.documents?.khotian) images.push(data.documents.khotian.url || data.documents.khotian);
    if (data.documents?.sketch) images.push(data.documents.sketch.url || data.documents.sketch);

    const gallery = document.getElementById('p-gallery');
    gallery.innerHTML = '';
    images.slice(0, 5).forEach(url => {
        const div = document.createElement('div');
        div.className = 'gal-item';
        div.innerHTML = `<img src="${url}" onclick="openLightbox('${url}')">`;
        gallery.appendChild(div);
    });

    // সাহায্যকারী ফাংশন
    const addRow = (tableId, label, value) => {
        if (!value || value === "" || value === "undefined") return;
        const table = document.getElementById(tableId);
        table.innerHTML += `<tr><td>${label}</td><td>${value}</td></tr>`;
    };

    // ২. 🏠 প্রপার্টির তথ্য (সব ডেটা পয়েন্ট সহ)
    const basicT = 'table-basic';
    document.getElementById(basicT).innerHTML = ""; // রিসেট
    addRow(basicT, "ক্যাটাগরি", data.category);
    addRow(basicT, "টাইপ", data.type);
    addRow(basicT, "বেডরুম", data.bedrooms || data.rooms);
    addRow(basicT, "বাথরুম", data.bathrooms);
    addRow(basicT, "কিচেন", data.kitchen);
    addRow(basicT, "ফ্লোর নম্বর", data.floorNo || data.floorLevel);
    addRow(basicT, "রাস্তা", data.roadWidth ? `${data.roadWidth} ফিট` : "");
    addRow(basicT, "ফেসিং", data.facing);
    
    // পরিমাণের পাসে ব্র্যাকেটে ইউনিট (landAreaUnit/houseAreaUnit/commercialAreaUnit)
    let area = data.landArea || data.houseArea || data.areaSqft || data.commercialArea;
    let areaUnit = data.landAreaUnit || data.houseAreaUnit || data.commercialAreaUnit || "";
    addRow(basicT, "পরিমাণ", area ? `${area} (${areaUnit})` : "");

    // ৩. 📑 মালিকানা তথ্য (দাগ নং এর সাথে ইউনিট/টাইপ)
    if (data.category === 'বিক্রয়' && data.owner) {
        document.getElementById('section-owner').style.display = 'block';
        const ownT = 'table-owner';
        document.getElementById(ownT).innerHTML = "";
        addRow(ownT, "দাতার নাম", data.owner.donorName);
        // দাগ নং (এসএ/আরএস/বিএস ইত্যাদি ব্র্যাকেটে)
        let dag = data.owner.dagNo;
        let dagType = data.owner.dagNoType || "";
        addRow(ownT, "দাগ নং", dag ? `${dag} (${dagType})` : "");
        addRow(ownT, "মৌজা", data.owner.mouja);
    }

    // ৪. 📍 অবস্থান (থানা সহ)
    const locT = 'table-location';
    document.getElementById(locT).innerHTML = "";
    addRow(locT, "জেলা", data.location?.district);
    addRow(locT, "উপজেলা", data.location?.upazila);
    addRow(locT, "থানা", data.location?.thana);
    addRow(locT, "ইউনিয়ন", data.location?.union);
    addRow(locT, "ওয়ার্ড নম্বর", data.location?.wardNo);
    addRow(locT, "গ্রাম/এলাকা", data.location?.village);
    addRow(locT, "রাস্তা", data.location?.road);

    if (data.googleMap) {
        const m = document.getElementById('p-map');
        m.href = data.googleMap;
        m.style.display = 'flex';
    }

    // ৫. 📞 যোগাযোগ
    const conT = 'table-contact';
    document.getElementById(conT).innerHTML = "";
    addRow(conT, "প্রাথমিক ফোন", data.phoneNumber);
    addRow(conT, "অতিরিক্ত ফোন", data.secondaryPhone);
    document.getElementById('p-call').href = `tel:${data.phoneNumber}`;
}

// সম্পর্কিত পোস্ট লজিক (আগের মতোই থাকবে)
async function loadRelatedPosts(currentData) {
    const list = document.getElementById('related-list');
    const seeMoreBox = document.getElementById('see-more-box');
    
    try {
        const snapshot = await db.collection('properties')
            .where('category', '==', currentData.category)
            .limit(50) 
            .get();

        let allPosts = [];
        snapshot.forEach(doc => {
            if (doc.id !== postId) allPosts.push({ id: doc.id, ...doc.data() });
        });

        allPosts.sort((a, b) => {
            const aVillage = a.location?.village === currentData.location?.village ? 1 : 0;
            const bVillage = b.location?.village === currentData.location?.village ? 1 : 0;
            if (aVillage !== bVillage) return bVillage - aVillage;

            const aThana = a.location?.thana === currentData.location?.thana ? 1 : 0;
            const bThana = b.location?.thana === currentData.location?.thana ? 1 : 0;
            if (aThana !== bThana) return bThana - aThana;

            return 0;
        });

        const displayPosts = allPosts.slice(0, 10);
        list.innerHTML = "";
        displayPosts.forEach(post => {
            let pAmt = post.category === 'বিক্রয়' ? post.price : post.monthlyRent;
            let pUnit = post.priceUnit || post.rentUnit || "";
            list.innerHTML += `
                <div class="rel-card" onclick="location.href='details.html?id=${post.id}'">
                    <img src="${post.images?.[0]?.url || post.images?.[0] || 'placeholder.jpg'}">
                    <div class="rel-info">
                        <h4 class="rel-title">${post.title}</h4>
                        <p class="rel-price">৳ ${pAmt} (${pUnit})</p>
                        <p class="rel-loc">${post.location?.village}, ${post.location?.thana}</p>
                    </div>
                </div>`;
        });

        if (allPosts.length > 10) seeMoreBox.style.display = 'block';
    } catch (e) { console.error(e); }
}

function openLightbox(url) {
    document.getElementById('lb-img').src = url;
    document.getElementById('lightbox').style.display = 'flex';
            }
