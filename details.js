const statusEl = document.getElementById("status");
const titleEl = document.getElementById("title");
const priceEl = document.getElementById("price");
const detailsEl = document.getElementById("details");
const slidesEl = document.getElementById("slides");

// Step 1: Firebase check
if (typeof firebase === "undefined") {
  statusEl.innerText = "❌ Firebase লোড হয়নি";
  throw new Error("Firebase missing");
}

// Step 2: Firestore
const db = firebase.firestore();

// Step 3: URL id
const id = new URLSearchParams(window.location.search).get("id");
if (!id) {
  statusEl.innerText = "❌ URL এ id নেই";
  throw new Error("Missing id");
}

statusEl.innerText = "⏳ ডেটা লোড হচ্ছে…";

// Helper
function row(label, value) {
  if (!value && value !== 0) return "";
  return `<div class="row"><strong>${label}</strong><span>${value}</span></div>`;
}

// Fetch document
db.collection("properties").doc(id).get()
.then(doc => {
  if (!doc.exists) {
    statusEl.innerText = "❌ পোস্ট পাওয়া যায়নি";
    return;
  }

  const d = doc.data();
  console.log("DETAILS DATA:", d);

  statusEl.innerText = "";

  /* ---------- Title & Price ---------- */
  titleEl.innerText = d.title || "";
  priceEl.innerText =
    d.category === "বিক্রয়"
      ? `${d.price || ""} টাকা`
      : `${d.monthlyRent || ""} টাকা / মাস`;

  /* ---------- Images ---------- */
  slidesEl.innerHTML = "";

  if (Array.isArray(d.images)) {
    d.images.forEach(img => {
      if (img && img.url) {
        slidesEl.innerHTML += `
          <div style="min-width:100%">
            <img src="${img.url}">
          </div>`;
      }
    });
  }

  /* ---------- Details (ORDERED) ---------- */
  let html = "";

  html += `<div class="section"><h3>📌 পোস্টকারী ধরন</h3>`;
  html += row("লিস্টার টাইপ", d.listerType);
  html += `</div>`;

  html += `<div class="section"><h3>🏷️ পোস্টের ক্যাটাগরি</h3>`;
  html += row("ক্যাটাগরি", d.category);
  html += row("টাইপ", d.type);
  html += `</div>`;

  html += `<div class="section"><h3>🏠 বিক্রয় / ভাড়া বিবরণ</h3>`;
  html += row("মূল্য", d.price);
  html += row("মাসিক ভাড়া", d.monthlyRent);
  html += row("ভাড়ার ধরন", d.rentType);
  html += `</div>`;

  if (d.category === "বিক্রয়") {
    html += `<div class="section"><h3>📄 মালিকানা বিবরণ</h3>`;
    html += row("মালিকের নাম", d.ownerName);
    html += row("দাগ নম্বর", d.dagNo);
    html += row("মৌজা", d.mouja);
    html += `</div>`;
  }

  html += `<div class="section"><h3>📍 ঠিকানা ও অবস্থান</h3>`;
  html += row("বিভাগ", d.location?.division);
  html += row("জেলা", d.location?.district);
  html += row("থানা", d.location?.thana);
  html += row("গ্রাম / ওয়ার্ড", d.location?.village || d.location?.wardNo);
  html += row("রোড", d.location?.road);
  html += `</div>`;

  html += `<div class="section"><h3>☎️ যোগাযোগ</h3>`;
  html += row("ফোন", d.phoneNumber);
  html += row("অতিরিক্ত ফোন", d.secondaryPhone);
  html += `</div>`;

  html += `<div class="section"><h3>📝 প্রপার্টির বিস্তারিত বর্ণনা</h3>
            <p>${d.description || "উল্লেখ নেই"}</p>
          </div>`;

  detailsEl.innerHTML = html;

})
.catch(err => {
  console.error(err);
  statusEl.innerText = "❌ ডেটা লোড করতে সমস্যা হয়েছে";
});
