// details.js
const db = firebase.firestore();

document.addEventListener('DOMContentLoaded', async () => {
    // ১. URL থেকে ID সংগ্রহ করা
    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('id');

    if (!propId) {
        alert("প্রপার্টি পাওয়া যায়নি!");
        window.location.href = 'index.html';
        return;
    }

    try {
        // ২. Firestore থেকে ডেটা রিড করা
        const doc = await db.collection('properties').doc(propId).get();

        if (!doc.exists) {
            document.getElementById('loader').innerText = "দুঃখিত, এই পোস্টটি খুঁজে পাওয়া যায়নি।";
            return;
        }

        const data = doc.data();

        // ৩. HTML এলিমেন্টে ডেটা সেট করা
        document.getElementById('displayTitle').innerText = data.title;
        document.getElementById('displayPrice').innerText = Number(data.price).toLocaleString('bn-BD');
        document.getElementById('displayLocation').innerText = data.location;
        document.getElementById('displayCategory').innerText = data.category;
        document.getElementById('displaySize').innerText = `${data.size} ${data.sizeUnit}`;
        document.getElementById('displayType').innerText = data.propertyType;
        document.getElementById('displayDescription').innerText = data.description;
        document.getElementById('displayOwner').innerText = data.ownerName || "তথ্য নেই";
        document.getElementById('callBtn').href = `tel:${data.ownerPhone}`;
        
        if (data.createdAt) {
            const date = data.createdAt.toDate();
            document.getElementById('displayDate').innerText = date.toLocaleDateString('bn-BD');
        }

        // ৪. ইমেজ গ্যালারি হ্যান্ডলিং
        const mainImage = document.getElementById('mainImage');
        const thumbGallery = document.getElementById('thumbGallery');

        if (data.images && data.images.length > 0) {
            mainImage.src = data.images[0].url;

            data.images.forEach((img, index) => {
                const thumb = document.createElement('img');
                thumb.src = img.url;
                if(index === 0) thumb.classList.add('active');
                
                thumb.onclick = () => {
                    mainImage.src = img.url;
                    document.querySelectorAll('.thumb-gallery img').forEach(i => i.classList.remove('active'));
                    thumb.classList.add('active');
                };
                thumbGallery.appendChild(thumb);
            });
        }

        // ৫. লোডার লুকিয়ে কন্টেন্ট দেখানো
        document.getElementById('loader').style.display = 'none';
        document.getElementById('property-details').style.display = 'block';

    } catch (error) {
        console.error("Error:", error);
        alert("তথ্য লোড করতে সমস্যা হয়েছে।");
    }
});
