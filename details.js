// ⚠️ এখানে firebase.initializeApp থাকবে না

const db = firebase.firestore();
const id = new URLSearchParams(window.location.search).get("id");

let index = 0;

function slide(dir) {
  const slides = document.getElementById("slides");
  const total = slides.children.length;
  if (!total) return;
  index = (index + dir + total) % total;
  slides.style.transform = `translateX(-${index * 100}%)`;
}

function row(label, value) {
  if (!value) return "";
  return `<div class="row"><strong>${label}</strong><span>${value}</span></div>`;
}

if (!id) {
  document.body.innerHTML = "Invalid Post";
  throw new Error("No ID");
}

db.collection("properties").doc(id).get().then(doc => {
  if (!doc.exists) {
    document.body.innerHTML = "Post not found";
    return;
  }

  const d = doc.data();

  /* ---------- Title & Price ---------- */
  document.getElementById("title").innerText = d.title || "";
  document.getElementById("price").innerText =
    d.category === "বিক্রয়"
      ? `${d.price || ""} টাকা`
      : `${d.monthlyRent || ""} টাকা / মাস`;

  /* ---------- Images ---------- */
  const slides = document.getElementById("slides");
  slides.innerHTML = "";

  (d.images || []).forEach((img, i) => {
    if (!img.url) return;
    slides.innerHTML += `
      <div style="min-width:100%">
        <img src="${img.url}">
      </div>`;
  });

  /* ---------- Details ---------- */
  let html = "";

  html += `<div class="section"><h3>📌 পোস্টকারী ধরন</h3>`;
  html += row("ধরন", d.listerType);
  html += `</div>`;

  html += `<div class="section"><h3>🏷️ পোস্টের ক্যাটাগরি</h3>`;
  html += row("ক্যাটাগরি", d.category);
  html += row("টাইপ", d.type);
  html += `</div>`;

  html += `<div class="section"><h3>🏠 প্রপার্টি বিবরণ</h3>`;
  html += row("রুম", d.rooms);
  html += row("বাথরুম", d.bathrooms);
  html += row("ফ্লোর", d.floorNo);
  html += row("জমির পরিমাণ", d.landArea);
  html += `</div>`;

  if (d.category === "বিক্রয়") {
    html += `<div class="section"><h3>📄 মালিকানা বিবরণ</h3>`;
    html += row("দাগ নং", d.dagNo);
    html += row("মৌজা", d.mouja);
    html += `</div>`;
  }

  html += `<div class="section"><h3>📍 ঠিকানা</h3>`;
  html += row("জেলা", d.location?.district);
  html += row("থানা", d.location?.thana);
  html += row("রোড", d.location?.road);
  html += `</div>`;

  html += `<div class="section"><h3>☎️ যোগাযোগ</h3>`;
  html += row("ফোন", d.phoneNumber);
  html += row("অতিরিক্ত ফোন", d.secondaryPhone);
  html += `</div>`;

  html += `<div class="section"><h3>📝 বিস্তারিত বর্ণনা</h3>
            <p>${d.description || "উল্লেখ নেই"}</p>
          </div>`;

  document.getElementById("details").innerHTML = html;

}).catch(err => {
  console.error(err);
  document.body.innerHTML = "Error loading post";
});
