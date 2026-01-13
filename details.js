// Firebase Initialization Check
const statusEl = document.getElementById("status");
const contentArea = document.getElementById("content-area");
const titleEl = document.getElementById("title");
const priceEl = document.getElementById("price");
const detailsEl = document.getElementById("details");
const slidesEl = document.getElementById("slides");

const db = firebase.firestore();

// URL থেকে ID সংগ্রহ করা
const urlParams = new URLSearchParams(window.location.search);
const id = urlParams.get("id");

if (!id) {
    statusEl.innerText = "❌ URL-এ কোনো পোস্ট আইডি (ID) পাওয়া যায়নি।";
} else {
    // Firestore থেকে ডাটা ফেচ করা
    db.collection("properties").doc(id).get()
    .then(doc => {
        if (!doc.exists) {
            statusEl.innerText = "❌ এই পোস্টটি খুঁজে পাওয়া যায়নি। আইডিটি সঠিক কিনা যাচাই করুন।";
            return;
        }

        const d = doc.data();
        console.log("Fetched Data:", d); // ব্রাউজার কনসোলে ডাটা চেক করার জন্য

        // লোডিং স্ট্যাটাস সরিয়ে কন্টেন্ট দেখানো
        statusEl.style.display = "none";
        if(contentArea) contentArea.style.display = "block";

        // ১. শিরোনাম ও মূল্য সেট করা
        titleEl.innerText = d.title || "শিরোনাম নেই";
        
        if (d.category === "ভাড়া") {
            priceEl.innerText = d.monthlyRent ? `৳ ${d.monthlyRent} / মাস` : "ভাড়া উল্লেখ নেই";
        } else {
            priceEl.innerText = d.price ? `৳ ${d.price}` : "মূল্য উল্লেখ নেই";
        }

        // ২. ইমেজ স্লাইডার হ্যান্ডেলিং
        if (d.images && Array.isArray(d.images) && d.images.length > 0) {
            slidesEl.innerHTML = d.images.map(img => {
                const src = (typeof img === 'object') ? img.url : img;
                return `<div style="min-width:100%"><img src="${src}" style="width:100%; height:300px; object-fit:contain; background:#000;"></div>`;
            }).join('');
        } else {
            slidesEl.innerHTML = `<div style="width:100%; height:200px; display:flex; align-items:center; justify-content:center; color:#ccc;">ছবি নেই</div>`;
        }

        // ৩. তথ্য প্রদর্শনের জন্য রো তৈরি (Helper Function)
        const row = (label, value) => {
            if (!value) return "";
            return `<div class="row"><strong>${label}</strong><span>${value}</span></div>`;
        };

        // ৪. সেকশন ভিত্তিক ডিটেইলস তৈরি
        let html = "";

        // প্রপার্টি বিবরণ
        html += `<div class="section"><h3>🏠 প্রপার্টি বিবরণ</h3>`;
        html += row("ক্যাটাগরি", d.category);
        html += row("টাইপ", d.type);
        html += row("লিস্টার", d.listerType);
        html += `</div>`;

        // ঠিকানা
        if (d.location) {
            html += `<div class="section"><h3>📍 ঠিকানা ও অবস্থান</h3>`;
            html += row("বিভাগ", d.location.division);
            html += row("জেলা", d.location.district);
            html += row("থানা", d.location.thana);
            html += row("গ্রাম/ওয়ার্ড", d.location.village || d.location.wardNo);
            html += `</div>`;
        }

        // যোগাযোগ
        html += `<div class="section"><h3>☎️ যোগাযোগ</h3>`;
        html += row("ফোন", d.phoneNumber);
        html += row("অন্যান্য", d.secondaryPhone);
        html += `</div>`;

        // বর্ণনা
        html += `<div class="section"><h3>📝 বিস্তারিত বর্ণনা</h3>
                  <p style="white-space: pre-line; color:#555;">${d.description || "কোনো বর্ণনা দেওয়া হয়নি।"}</p>
                </div>`;

        detailsEl.innerHTML = html;

    })
    .catch(error => {
        console.error("Firestore Error:", error);
        statusEl.innerText = "❌ ডেটা লোড করতে সমস্যা হয়েছে: " + error.message;
    });
}
