const db = firebase.firestore();
const params = new URLSearchParams(window.location.search);
const id = params.get('id');

let currentIndex = 0;

/* ---------------- SLIDER ---------------- */
function slide(dir) {
  const slides = document.getElementById("slides");
  const total = slides.children.length;
  if (!total) return;
  currentIndex = (currentIndex + dir + total) % total;
  slides.style.transform = `translateX(-${currentIndex * 100}%)`;
}

/* ---------------- LOAD DETAILS ---------------- */
if (!id) {
  alert("Invalid post");
  location.href = "index.html";
}

db.collection("properties").doc(id).get().then(doc => {
  if (!doc.exists) {
    alert("পোস্ট পাওয়া যায়নি");
    return;
  }

  const d = doc.data();

  /* -------- TITLE & PRICE -------- */
  document.getElementById("title").innerText = d.title;

  document.getElementById("price").innerText =
    d.category === "বিক্রয়"
      ? `${d.price} টাকা (${d.priceUnit})`
      : `${d.monthlyRent} টাকা / মাস`;

  /* -------- IMAGES (5 TOTAL) -------- */
  const slides = document.getElementById("slides");
  slides.innerHTML = "";

  const images = [
    ...(d.imageUrls || []),
    d.owner?.khotianUrl,
    d.owner?.sketchUrl
  ].filter(Boolean);

  images.forEach((url, i) => {
    slides.innerHTML += `
      <div style="min-width:100%;position:relative">
        <img src="${url}">
        <span class="img-label">ছবি ${i + 1}</span>
      </div>`;
  });

  /* -------- DETAILS (POST PAGE ORDER) -------- */
  let html = `<div class="section"><h3>🏠 প্রপার্টি বিবরণ</h3>`;

  const add = (label, val) => {
    if (val) html += `<div class="row"><strong>${label}</strong><span>${val}</span></div>`;
  };

  add("পোস্টের ধরন", d.category);
  add("প্রপার্টির টাইপ", d.type);
  add("লিস্টার টাইপ", d.listerType);

  add("প্রপার্টির বয়স", d.propertyAge ? `${d.propertyAge} বছর` : null);
  add("ফেসিং", d.facing);
  add("সুবিধা", d.utilities?.join(", "));

  /* ---- TYPE BASED ---- */
  if (d.type === "জমি" || d.type === "প্লট") {
    add("পরিমাণ", `${d.landArea} ${d.landAreaUnit}`);
    add("জমির ধরন", d.landType);
    add("রাস্তা (ফিট)", d.roadWidth);
    add("প্লট নং", d.plotNo);
  }

  if (["বাড়ি", "ফ্লাট"].includes(d.type)) {
    add("রুম", d.rooms);
    add("বাথরুম", d.bathrooms);
    add("কিচেন", d.kitchen);
    add("ফ্লোর", d.floorNo);
    add("তলা সংখ্যা", d.floors);
  }

  if (["অফিস", "দোকান"].includes(d.type)) {
    add("পরিমাণ", `${d.commercialArea} ${d.commercialAreaUnit}`);
    add("দোকান সংখ্যা", d.shopCount);
  }

  /* ---- RENT ---- */
  if (d.category === "ভাড়া") {
    add("ভাড়ার ধরন", d.rentType);
    add("ওঠার তারিখ", d.moveInDate);
    add("এডভান্স", d.advance);
  }

  /* ---- DESCRIPTION ---- */
  html += `
    <div class="row" style="flex-direction:column">
      <strong>বিস্তারিত</strong>
      <p>${d.description}</p>
    </div></div>`;

  document.getElementById("dynamicDetails").innerHTML = html;

  /* -------- LOCATION -------- */
  document.getElementById("locationText").innerText =
    `${d.location.district}, ${d.location.thana}, ${d.location.road}`;

  if (d.googleMap) {
    document.getElementById("mapView").innerHTML =
      `<iframe src="${d.googleMap}"></iframe>`;
  } else {
    document.getElementById("mapView").style.display = "none";
  }

  /* -------- CONTACT -------- */
  document.getElementById("callBtn").href = `tel:${d.phoneNumber}`;
  document.getElementById("chatBtn").href =
    `https://wa.me/88${d.phoneNumber}?text=${encodeURIComponent(d.title)}`;

  loadRelatedPosts(d.category, d.location.district);
});

/* ---------------- RELATED POSTS ---------------- */
function loadRelatedPosts(category, district) {
  db.collection("properties")
    .where("category", "==", category)
    .where("location.district", "==", district)
    .limit(4)
    .get()
    .then(snap => {
      let html = `<div class="section"><h3>🔗 সম্পর্কিত পোস্ট</h3><div class="grid">`;
      snap.forEach(doc => {
        const p = doc.data();
        html += `
          <a href="details.html?id=${doc.id}" class="card">
            <img src="${p.imageUrls?.[0]}">
            <h4>${p.title}</h4>
            <p>${p.price || p.monthlyRent} টাকা</p>
          </a>`;
      });
      html += `</div></div>`;
      document.querySelector("main").insertAdjacentHTML("beforeend", html);
    });
}
