const db = firebase.firestore();
const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get('id');

let currentIndex = 0;

// স্লাইডার ফাংশন
function slide(dir) {
    const slides = document.getElementById('slides');
    const total = slides.children.length;
    currentIndex = (currentIndex + dir + total) % total;
    slides.style.transform = `translateX(-${currentIndex * 100}%)`;
}

// ডাটা লোড করা
if (id) {
    db.collection('properties').doc(id).get().then(doc => {
        if (!doc.exists) {
            alert("দুঃখিত, তথ্য পাওয়া যায়নি!");
            return;
        }

        const d = doc.data();
        
        // শিরোনাম ও মূল্য
        document.getElementById('title').innerText = d.title;
        const price = d.category === 'বিক্রয়' ? `${d.price} টাকা` : `${d.monthlyRent} টাকা (মাসিক)`;
        document.getElementById('price').innerText = price;

        // ৫টি ছবি প্রদর্শন (৩টি প্রপার্টি, ১টি খতিয়ান, ১টি নকশা)
        const slides = document.getElementById('slides');
        const labels = ["প্রপার্টি ছবি ১", "প্রপার্টি ছবি ২", "প্রপার্টি ছবি ৩", "খতিয়ানের ছবি", "হস্ত নকশা/স্কেচ"];
        
        (d.images || []).forEach((img, idx) => {
            const div = document.createElement('div');
            div.style.minWidth = "100%";
            div.style.position = "relative";
            div.innerHTML = `
                <img src="${img.url}">
                <span class="img-label">${labels[idx] || 'ছবি'}</span>
            `;
            slides.appendChild(div);
        });

        // ডাইনামিক ফিল্ড প্রদর্শন (জমি, বাড়ি, ফ্ল্যাট ইত্যাদি অনুযায়ী)
        let detailHTML = `<div class="section"><h3>🏠 প্রপার্টি তথ্য</h3>`;
        
        const fields = {
            "টাইপ": d.type,
            "ক্যাটাগরি": d.category,
            "জমির পরিমাণ": d.landArea,
            "জমির ধরন": d.landType,
            "রুম": d.rooms,
            "বাথরুম": d.bathrooms,
            "ফ্লোর লেভেল": d.floorLevel,
            "ফেসিং": d.facing,
            "নির্মাণ বছর": d.buildYear,
            "সুবিধা": (d.utilities || []).join(', ')
        };

        for (let key in fields) {
            if (fields[key]) {
                detailHTML += `<div class="row"><strong>${key}:</strong> <span>${fields[key]}</span></div>`;
            }
        }
        detailHTML += `<div class="row" style="flex-direction:column; border:none; margin-top:10px;">
                        <strong>বর্ণনা:</strong><p>${d.description || 'নেই'}</p></div></div>`;
        
        document.getElementById('dynamicDetails').innerHTML = detailHTML;

        // অবস্থান ও ম্যাপ
        document.getElementById('locationText').innerHTML = `
            <p>${d.location.district}, ${d.location.village || d.location.wardNo}, ${d.location.road}</p>
        `;

        if (d.mapLink) {
            // গুগল ম্যাপ এমবেড ভিউ তৈরি
            let mapId = d.mapLink.split('src="')[1]?.split('"')[0] || d.mapLink;
            document.getElementById('mapView').innerHTML = `<iframe src="${mapId}"></iframe>`;
        } else {
            document.getElementById('mapView').style.display = 'none';
        }

        // কন্টাক্ট অ্যাকশন
        document.getElementById('callBtn').href = `tel:${d.phoneNumber}`;
        document.getElementById('chatBtn').href = `https://wa.me/88${d.phoneNumber}?text=আপনার ${d.title} পোস্টটি নিয়ে আমি আগ্রহী।`;

    }).catch(err => console.error("Error fetching doc:", err));
}

// শেয়ার ফাংশন
function shareProperty() {
    if (navigator.share) {
        navigator.share({
            title: document.getElementById('title').innerText,
            url: window.location.href
        });
    } else {
        alert("লিঙ্কটি কপি করুন: " + window.location.href);
    }
}

// সেভ/সংরক্ষণ ফাংশন (Local Storage ব্যবহার করে)
function saveProperty() {
    let saved = JSON.parse(localStorage.getItem('saved_properties') || '[]');
    if (!saved.includes(id)) {
        saved.push(id);
        localStorage.setItem('saved_properties', JSON.stringify(saved));
        document.getElementById('saveIcon').classList.replace('far', 'fas');
        alert("সংরক্ষণ করা হয়েছে!");
    } else {
        alert("ইতিমধ্যেই সংরক্ষিত আছে।");
    }
              }
