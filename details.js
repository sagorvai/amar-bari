import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  // তোমার config বসাবে
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const params = new URLSearchParams(window.location.search);
const propertyId = params.get("id");

if (!propertyId) {
  alert("Property ID missing");
}

function safeAdd(container, label, value) {
  if (!value) return;
  const div = document.createElement("div");
  div.innerHTML = `<strong>${label}:</strong> ${value}`;
  container.appendChild(div);
}

async function loadDetails() {
  const ref = doc(db, "properties", propertyId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("ডেটা পাওয়া যায়নি");
    return;
  }

  const p = snap.data();

  // title & price
  document.getElementById("title").innerText = p.title || "";
  document.getElementById("category").innerText = p.category || "";

  let priceText = "";
  if (p.category === "ভাড়া") {
    priceText = p.monthlyRent + " টাকা / মাস";
  } else {
    priceText = p.price + " টাকা";
  }
  document.getElementById("price").innerText = priceText;

  // images
  const slider = document.getElementById("imageSlider");
  if (p.images && p.images.length) {
    p.images.forEach(img => {
      const i = document.createElement("img");
      i.src = img.url;
      slider.appendChild(i);
    });
  }

  // location
  const loc = p.location || {};
  document.getElementById("location").innerText =
    `${loc.village || ""}, ${loc.thana || ""}, ${loc.district || ""}`;

  // quick info
  const qi = document.getElementById("quickInfo");
  safeAdd(qi, "টাইপ", p.type);
  safeAdd(qi, "রুম", p.rooms);
  safeAdd(qi, "বাথরুম", p.bathrooms);
  safeAdd(qi, "ফ্লোর", p.floorNo);
  safeAdd(qi, "ফেসিং", p.facing);
  safeAdd(qi, "রোড", p.roadWidth);
  safeAdd(qi, "জমির পরিমাণ", p.landArea ? p.landArea + " " + p.landAreaUnit : "");

  // utilities
  if (p.utilities && p.utilities.length) {
    document.getElementById("utilities").style.display = "block";
    p.utilities.forEach(u => {
      const li = document.createElement("li");
      li.innerText = u;
      document.getElementById("utilitiesList").appendChild(li);
    });
  }

  // description
  document.getElementById("description").innerText = p.description || "";

  // ownership
  if (p.owner) {
    document.getElementById("ownership").style.display = "block";
    const o = p.owner;
    document.getElementById("ownershipData").innerHTML = `
      দাতা: ${o.donorName || ""}<br>
      দাগ: ${o.dagNo || ""}<br>
      মৌজা: ${o.mouja || ""}
    `;
  }

  // map
  if (p.googleMap) {
    document.getElementById("map").style.display = "block";
    document.getElementById("map").innerHTML =
      `<iframe src="${p.googleMap}" width="100%" height="250" style="border:0"></iframe>`;
  }

  // contact
  document.getElementById("phone").innerText = p.phoneNumber || "";
  document.getElementById("callBtn").href = `tel:${p.phoneNumber}`;
}

loadDetails();
