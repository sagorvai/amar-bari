// 🔥 Firebase config (তোমার config এখানে বসাবে)
firebase.initializeApp({
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID"
});

const db = firebase.firestore();

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

let currentIndex = 0;

/* ---------- Slider ---------- */
function slide(dir) {
  const slides = document.getElementById("slides");
  const total = slides.children.length;
  if (!total) return;
  currentIndex = (currentIndex + dir + total) % total;
  slides.style.transform = `translateX(-${currentIndex * 100}%)`;
}

/* ---------- Helper ---------- */
function row(label, value) {
  if (!value) return "";
  return `<div class="row"><strong>${label}</strong><span>${value}</span></div>`;
}

if (!id) {
  alert("Invalid post");
  location.href = "/";
}

/* ---------- Load Data ---------- */
db.collection("properties").doc(id).get().then(doc => {
  if (!doc.exists) {
    alert("পোস্ট পাওয়া যায়নি");
    return;
  }

  const d = doc.data();

  /* ---------- Title & Price ---------- */
  document.getElementById("title").innerText = d.title || "";
  document.getElementById("price").innerText =
    d.category === "বিক্রয়"
      ? `${d.price} টাকা`
      : `${d.monthlyRent} টাকা / মাস`;

  /* ---------- Images (5) ---------- */
  const slides = document.getElementById("slides");
  slides.innerHTML = "";

  const images = [
    ...(d.images || []),            // property images
    d.khotianImage,
    d.sketchImage
  ].filter(Boolean);

  images.forEach((src, i) => {
    slides.innerHTML += `
      <div style="min-width:100%;position:relative">
        <img src="${src}">
        <span class="img-label">ছবি ${i + 1}</span>
      </div>`;
  });

  /* ---------- Details Sections ---------- */
  let html = "";

  /* 1️⃣ পোস্টকারী ধরন */
  html += `<div class="section"><h3>📌 পোস্টকারী ধরন</h3>`;
  html += row("পোস্টকারী", d.listerType);
  html += `</div>`;

  /* 2️⃣ পোস্ট ক্যাটাগরি */
  html += `<div class="section"><h3>🏷️ পোস্টের ক্যাটাগরি</h3>`;
  html += row("ক্যাটাগরি", d.category);
  html += row("টাইপ", d.type);
  html += `</div>`;

  /* 3️⃣ বিক্রয় / ভাড়া বিবরণ */
  html += `<div class="section"><h3>🏠 ${d.category} বিবরণ</h3>`;
  html += row("মূল্য", d.price);
  html += row("মাসিক ভাড়া", d.monthlyRent);
  html += row("ভাড়ার ধরন", d.rentType);
  html += `</div>`;

  /* 4️⃣ মালিকানা (শুধু বিক্রয়) */
  if (d.category === "বিক্রয়") {
    html += `<div class="section"><h3>📄 মালিকানা বিবরণ</h3>`;
    html += row("মালিকের নাম", d.ownerName);
    html += row("দাগ নম্বর", d.dagNo);
    html += row("মৌজা", d.mouja);
    html += `</div>`;
  }

  /* 5️⃣ ঠিকানা */
  html += `<div class="section"><h3>📍 ঠিকানা ও অবস্থান</h3>`;
  html += row("বিভাগ", d.location?.division);
  html += row("জেলা", d.location?.district);
  html += row("থানা", d.location?.thana);
  html += row("রোড", d.location?.road);
  html += `</div>`;

  /* 6️⃣ যোগাযোগ */
  html += `<div class="section contact"><h3>☎️ যোগাযোগ</h3>`;
  html += row("ফোন", d.phoneNumber);
  html += row("অতিরিক্ত ফোন", d.secondaryPhone);
  html += `
    <a href="tel:${d.phoneNumber}">কল করুন</a>
    <a href="https://wa.me/88${d.phoneNumber}">WhatsApp</a>
  </div>`;

  /* 7️⃣ বিস্তারিত বর্ণনা */
  html += `<div class="section"><h3>📝 বিস্তারিত বর্ণনা</h3>
            <p>${d.description || "উল্লেখ নেই"}</p>
          </div>`;

  /* Map */
  if (d.googleMap) {
    html += `<div class="section"><h3>🗺️ ম্যাপ</h3>
              <iframe src="${d.googleMap}"></iframe>
            </div>`;
  }

  document.getElementById("detailsContainer").innerHTML = html;
});
