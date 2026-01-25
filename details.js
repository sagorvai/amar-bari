// Firebase কনফিগারেশন (আপনার আগের ফাইলের মতো)
const db = firebase.firestore();

// URL থেকে প্রপার্টি ID নেওয়া (যেমন: details.html?id=12345)
const urlParams = new URLSearchParams(window.location.search);
const propertyId = urlParams.get('id');

if (!propertyId) {
    alert("প্রপার্টি খুঁজে পাওয়া যায়নি!");
    window.location.href = 'index.html';
}

async function fetchPropertyDetails() {
    try {
        const doc = await db.collection('properties').doc(propertyId).get();
        if (doc.exists) {
            const data = doc.data();
            renderDetails(data);
        } else {
            console.log("No such document!");
        }
    } catch (error) {
        console.error("Error getting document:", error);
    }
}

function renderDetails(data) {
    // বেসিক তথ্য সেট করা
    document.getElementById('propertyTitle').innerText = data.title;
    document.getElementById('propertyPrice').innerText = data.price || data.monthlyRent || 'আলোচনা সাপেক্ষ';
    document.getElementById('propertyLocation').innerText = `${data.location.district}, ${data.location.upazila}`;
    document.getElementById('categoryBadge').innerText = data.category;
    document.getElementById('propertyDescription').innerText = data.description || 'কোনো বর্ণনা দেওয়া হয়নি।';

    // ইমেজ গ্যালারি সেটআপ
    const images = data.images || [];
    const mainImg = document.getElementById('mainImage');
    const thumbRow = document.getElementById('thumbnailRow');
    
    if (images.length > 0) {
        mainImg.src = images[0].url;
        images.forEach((img, index) => {
            const thumb = document.createElement('img');
            thumb.src = img.url;
            thumb.onclick = () => mainImg.src = img.url;
            thumbRow.appendChild(thumb);
        });
    }

    // ডাইনামিক ফিল্ড রেন্ডারিং (সবচেয়ে গুরুত্বপূর্ণ অংশ)
    const specsContainer = document.getElementById('dynamicSpecs');
    const excludeFields = ['title', 'description', 'images', 'location', 'category', 'phoneNumber', 'secondaryPhone'];

    for (const [key, value] of Object.entries(data)) {
        if (!excludeFields.includes(key) && value) {
            const specItem = document.createElement('div');
            specItem.className = 'spec-item';
            specItem.innerHTML = `
                <span class="label">${formatKey(key)}:</span>
                <span class="value">${value}</span>
            `;
            specsContainer.appendChild(specItem);
        }
    }

    // কন্টাক্ট বাটন সেটআপ
    document.getElementById('callBtn').href = `tel:${data.phoneNumber}`;
    document.getElementById('whatsappBtn').href = `https://wa.me/88${data.phoneNumber}`;
}

// কী-এর নামগুলো সুন্দর করার জন্য ফাংশন (যেমন: areaSize -> এরিয়া সাইজ)
function formatKey(key) {
    const translations = {
        type: 'ধরন',
        areaSize: 'আয়তন',
        landType: 'জমির ধরন',
        bedRooms: 'বেডরুম',
        bathRooms: 'বাথরুম',
        floorLevel: 'তলা',
        facing: 'মুখ',
        mouja: 'মৌজা'
    };
    return translations[key] || key;
}

fetchPropertyDetails();
