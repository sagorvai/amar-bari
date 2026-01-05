// ========================
// No firebase.initializeApp() here!
// assume it's already initialized elsewhere
// ========================

const db = firebase.firestore();

// Get ID from URL
const params = new URLSearchParams(window.location.search);
const id = params.get("id");

if (!id) {
  console.error("No ID in URL");
  document.getElementById("title").innerText = "Invalid Post";
  throw new Error("Missing id parameter");
}

// Debug
console.log("Details Page ID:", id);

// Slider index
let currentIndex = 0;

function slide(dir) {
  const slides = document.getElementById("slides");
  const total = slides.children.length;
  if (total <= 0) return;
  currentIndex = (currentIndex + dir + total) % total;
  slides.style.transform = `translateX(-${currentIndex * 100}%)`;
}

// Safe row helper
function row(label, val) {
  if (!val && val !== 0) return "";
  return `<div class="row"><strong>${label}</strong><span>${val}</span></div>`;
}

// Fetch data from Firestore
db.collection("properties").doc(id).get().then(doc => {
  if (!doc.exists) {
    console.error("Document not found!");
    document.getElementById("title").innerText = "Post Not Found";
    return;
  }

  const d = doc.data();

  // Debug print
  console.log("Firestore Data:", d);

  // Title
  document.getElementById("title").innerText = d.title || "Untitled";

  // Price
  if (d.category === "বিক্রয়") {
    document.getElementById("price").innerText = `${d.price || ""} টাকা`;
  } else {
    document.getElementById("price").innerText = `${d.monthlyRent || ""} টাকা / মাস`;
  }

  // Images Slider
  const slides = document.getElementById("slides");
  slides.innerHTML = "";

  const allImages = [];

  // property images array
  if (Array.isArray(d.images)) {
    d.images.forEach(item => {
      if (item && item.url) allImages.push(item.url);
    });
  }

  // khotian & sketch
  if (d.khotianImage) allImages.push(d.khotianImage);
  if (d.sketchImage) allImages.push(d.sketchImage);

  // Debug
  console.log("Images found:", allImages);

  allImages.forEach(src => {
    slides.innerHTML += `<div style="min-width:100%"><img src="${src}"></div>`;
  });

  // Details HTML build
  let html = "";

  // 1️⃣ পোস্টকারী ধরন
  html += `<div class="section"><h3>📌 পোস্টকারী ধরন</h3>`;
  html += row("লিস্টার টাইপ", d.listerType);
  html += `</div>`;

  // 2️⃣ ক্যাটাগরি
  html += `<div class="section"><h3>🏷️ পোস্টের ক্যাটাগরি</h3>`;
  html += row("ক্যাটাগরি", d.category);
  html += row("টাইপ", d.type);
  html += `</div>`;

  // 3️⃣ বিক্রয় / ভাড়া
  html += `<div class="section"><h3>🏠 মূল্য/ভাড়া বিবরণ</h3>`;
  html += row("মূল্য", d.price);
  html += row("মাসিক ভাড়া", d.monthlyRent);
  html += row("ভাড়ার ধরন", d.rentType);
  html += `</div>`;

  // 4️⃣ মালিকানা (শুধু বিক্রয়)
  if (d.category === "বিক্রয়") {
    html += `<div class="section"><h3>📄 মালিকানা বিবরণ</h3>`;
    html += row("মালিকের নাম", d.ownerName);
    html += row("দাগ নম্বর", d.dagNo);
    html += row("মৌজা", d.mouja);
    html += `</div>`;
  }

  // 5️⃣ ঠিকানা
  html += `<div class="section"><h3>📍 ঠিকানা ও অবস্থান</h3>`;
  html += row("বিভাগ", d.location?.division);
  html += row("জেলা", d.location?.district);
  html += row("থানা", d.location?.thana);
  html += row("ওয়ার্ড/গ্রাম", d.location?.wardNo || d.location?.village);
  html += row("রোড", d.location?.road);
  html += `</div>`;

  // 6️⃣ যোগাযোগ
  html += `<div class="section"><h3>☎️ যোগাযোগ</h3>`;
  html += row("প্রধান ফোন", d.phoneNumber);
  html += row("অতিরিক্ত ফোন", d.secondaryPhone);
  html += `</div>`;

  // 7️⃣ বিস্তারিত বর্ণনা
  html += `<div class="section"><h3>📝 বিস্তারিত বর্ণনা</h3>
            <p>${d.description || "উল্লেখ নেই"}</p>
          </div>`;

  // 8️⃣ Map
  if (d.googleMap) {
    html += `<div class="section"><h3>🗺️ অবস্থান (Map)</h3>
              <iframe src="${d.googleMap}"></iframe>
            </div>`;
  }

  document.getElementById("details").innerHTML = html;

}).catch(err => {
  console.error("Firestore Error:", err);
  document.getElementById("title").innerText = "Error Loading Data";
});
