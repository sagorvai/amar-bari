<script>
// ===============================
// 1. FIREBASE SAFE INIT
// ===============================
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
console.log("JS Loaded OK");

// ===============================
// 2. GET PROPERTY ID FROM URL
// ===============================
const urlParams = new URLSearchParams(window.location.search);
const propertyId = urlParams.get('id');

if (!propertyId) {
  alert("প্রপার্টি আইডি পাওয়া যায়নি!");
  window.location.href = "index.html";
}

// ===============================
// 3. LOADING UI
// ===============================
document.body.innerHTML = `
<div id="loading" style="text-align:center;margin-top:80px;font-size:18px;">
  ⏳ তথ্য লোড হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন...
</div>
`;

// ===============================
// 4. LOAD DATA FROM FIRESTORE
// ===============================
async function loadFullDetails() {
  try {
    const doc = await db.collection("properties").doc(propertyId).get();

    if (!doc.exists) {
      document.body.innerHTML = `
        <h2 style="text-align:center;margin-top:50px;">
          😔 দুঃখিত! এই বিজ্ঞাপনটি পাওয়া যায়নি।
        </h2>`;
      return;
    }

    renderCompleteUI(doc.data());

  } catch (err) {
    console.error(err);
    document.body.innerHTML = `
      <h2 style="text-align:center;margin-top:50px;color:red;">
        ⚠️ ডেটা লোড করা যায়নি। আবার চেষ্টা করুন।
      </h2>`;
  }
}

// ===============================
// 5. RENDER FULL UI
// ===============================
function renderCompleteUI(data) {

  document.body.innerHTML = document.getElementById("pageTemplate").innerHTML;

  // ---------- HEADER ----------
  title.innerText = data.title || "শিরোনাম নেই";
  price.innerText = `৳ ${data.price || data.monthlyRent || "আলোচনা সাপেক্ষ"}`;
  catTag.innerText = data.category || "General";

  // ---------- IMAGE GALLERY ----------
  if (Array.isArray(data.images) && data.images.length) {
    displayImg.src = data.images[0].url || data.images[0];
    thumbList.innerHTML = "";

    data.images.forEach((img, idx) => {
      const t = document.createElement("img");
      t.src = img.url || img;
      if (idx === 0) t.classList.add("active");
      t.onclick = () => {
        displayImg.src = t.src;
        document.querySelectorAll(".thumb-container img")
          .forEach(i => i.classList.remove("active"));
        t.classList.add("active");
      };
      thumbList.appendChild(t);
    });
  }

  // ---------- SPEC GRID ----------
  specGrid.innerHTML = "";

  const labelMap = {
    posterType: "পোস্টকারীর ধরন", category: "ক্যাটাগরি", type: "প্রপার্টির ধরন",
    areaSize: "আয়তন/সাইজ", bedRooms: "বেডরুম", bathRooms: "বাথরুম",
    floorLevel: "তলা/লেভেল", facing: "মুখ", completionStatus: "অবস্থা",
    monthlyRent: "মাসিক ভাড়া", price: "মোট মূল্য", bookingMoney: "বুকিং মানি",
    donorName: "দাতার নাম", mouja: "মৌজা", dagNo: "দাগ নম্বর",
    khotianNo: "খতিয়ান", district: "জেলা", upazila: "উপজেলা",
    union: "ইউনিয়ন", village: "গ্রাম", road: "রাস্তা",
    phoneNumber: "ফোন", secondaryPhone: "অতিরিক্ত ফোন", ownerName: "মালিক"
  };

  const skipFields = ["title","description","images","location","owner","timestamp","status"];

  addSectionHeader("📊 প্রপার্টির সকল তথ্য");
  Object.keys(data).forEach(k => {
    if (!skipFields.includes(k) && typeof data[k] !== "object" && data[k])
      addSpecItem(labelMap[k] || k, data[k]);
  });

  if (data.location) {
    addSectionHeader("📍 ঠিকানা");
    Object.keys(data.location).forEach(k => {
      if (data.location[k]) addSpecItem(labelMap[k] || k, data.location[k]);
    });
  }

  if (data.owner) {
    addSectionHeader("📑 মালিকানা");
    Object.keys(data.owner).forEach(k => {
      if (data.owner[k]) addSpecItem(labelMap[k] || k, data.owner[k]);
    });
  }

  descText.innerText = data.description || "কোনো বর্ণনা দেওয়া হয়নি";

  // ---------- CONTACT ----------
  const phone = String(data.phoneNumber || "").replace("+88","").replace("88","");
  callLink.href = `tel:${phone}`;
  waLink.href = `https://wa.me/88${phone}`;
}

// ===============================
// 6. HELPER FUNCTIONS
// ===============================
function addSectionHeader(title) {
  const h = document.createElement("div");
  h.style = "grid-column:1/-1;margin:20px 0;padding:10px;background:#eef2f6;font-weight:700;border-left:4px solid #2563eb;border-radius:8px;";
  h.innerText = title;
  specGrid.appendChild(h);
}

function addSpecItem(label, value) {
  const box = document.createElement("div");
  box.style = "padding:12px;border:1px solid #e5e7eb;border-radius:10px;background:#fff;";
  box.innerHTML = `
    <small style="color:#64748b">${label}</small>
    <div style="font-weight:600">${String(value).replace(/</g,"&lt;")}</div>
  `;
  specGrid.appendChild(box);
}

// ===============================
loadFullDetails();
</script>
