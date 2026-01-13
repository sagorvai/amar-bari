const statusEl = document.getElementById("status");
const contentArea = document.getElementById("content-area");
const titleEl = document.getElementById("title");
const priceEl = document.getElementById("price");
const detailsEl = document.getElementById("details");
const slidesEl = document.getElementById("slides");

// Firebase চেক
if (typeof firebase === "undefined") {
  statusEl.innerText = "❌ Firebase SDK লোড হয়নি!";
} else {
  const db = firebase.firestore();

  // URL থেকে ID নেওয়া
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  if (!id) {
    statusEl.innerText = "❌ URL-এ কোনো পোস্ট ID পাওয়া যায়নি।";
  } else {
    // Firestore থেকে ডেটা আনা
    db.collection("properties").doc(id).get()
    .then(doc => {
      if (!doc.exists) {
        statusEl.innerText = "❌ দুঃখিত, এই পোস্টটি খুঁজে পাওয়া যায়নি।";
        return;
      }

      const d = doc.data();
      statusEl.style.display = "none";
      contentArea.style.display = "block";

      // শিরোনাম ও মূল্য সেট করা
      titleEl.innerText = d.title || "শিরোনামহীন";
      if (d.category === "ভাড়া") {
        priceEl.innerText = `৳ ${d.monthlyRent || '0'} / মাস`;
      } else {
        priceEl.innerText = `৳ ${d.price || '0'}`;
      }

      // ইমেজ স্লাইডার সেট করা
      if (d.images && Array.isArray(d.images) && d.images.length > 0) {
        slidesEl.innerHTML = d.images.map(img => `
          <div style="min-width:100%; display:flex; justify-content:center;">
            <img src="${img.url || img}" alt="Property Image">
          </div>
        `).join('');
      } else {
        slidesEl.innerHTML = `<div style="min-width:100%; color:#fff; display:flex; align-items:center; justify-content:center;">ছবি নেই</div>`;
      }

      // তথ্য প্রদর্শনের জন্য হেল্পার ফাংশন
      const createRow = (label, value) => {
        if (!value) return "";
        return `<div class="row"><strong>${label}</strong><span>${value}</span></div>`;
      };

      // ডিটেইলস সেকশন তৈরি
      let html = "";

      html += `<div class="section"><h3>📌 বেসিক তথ্য</h3>`;
      html += createRow("ক্যাটাগরি", d.category);
      html += createRow("টাইপ", d.type);
      html += createRow("লিস্টার টাইপ", d.listerType);
      html += `</div>`;

      if (d.category === "বিক্রয়") {
        html += `<div class="section"><h3>📄 মালিকানা বিবরণ</h3>`;
        html += createRow("মালিকের নাম", d.ownerName);
        html += createRow("দাগ নম্বর", d.dagNo);
        html += createRow("মৌজা", d.mouja);
        html += `</div>`;
      }

      html += `<div class="section"><h3>📍 ঠিকানা ও অবস্থান</h3>`;
      html += createRow("বিভাগ", d.location?.division);
      html += createRow("জেলা", d.location?.district);
      html += createRow("থানা", d.location?.thana);
      html += createRow("গ্রাম/ওয়ার্ড", d.location?.village || d.location?.wardNo);
      html += `</div>`;

      html += `<div class="section"><h3>☎️ যোগাযোগ</h3>`;
      html += createRow("ফোন", d.phoneNumber);
      html += createRow("অন্যান্য", d.secondaryPhone);
      html += `</div>`;

      html += `<div class="section"><h3>📝 বিস্তারিত বর্ণনা</h3>
                <p class="description-text">${d.description || "কোনো বর্ণনা দেওয়া হয়নি।"}</p>
              </div>`;

      detailsEl.innerHTML = html;

    })
    .catch(err => {
      console.error("Error fetching data:", err);
      statusEl.innerText = "❌ ডেটা লোড করতে সমস্যা হয়েছে। দয়া করে আপনার ইন্টারনেট কানেকশন বা Firebase পারমিশন চেক করুন।";
    });
  }
}
