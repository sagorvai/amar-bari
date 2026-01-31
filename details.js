// 1️⃣ URL থেকে ID
const urlParams = new URLSearchParams(window.location.search);
const propertyId = urlParams.get("id");

if (!propertyId) {
    alert("প্রপার্টি আইডি পাওয়া যায়নি!");
    location.href = "index.html";
}

// 2️⃣ Firestore থেকে ডেটা
async function loadFullDetails() {
    try {
        const snap = await db.collection("properties").doc(propertyId).get();

        if (!snap.exists) {
            document.body.innerHTML = "<h2 style='text-align:center;margin-top:50px'>বিজ্ঞাপন পাওয়া যায়নি</h2>";
            return;
        }

        renderCompleteUI(snap.data());
    } catch (err) {
        console.error(err);
        alert("ডেটা লোড করতে সমস্যা হয়েছে");
    }
}

// 3️⃣ UI Render
function renderCompleteUI(data) {

    // ===== BASIC INFO =====
    document.getElementById("title").innerText = data.title || "শিরোনাম নেই";
    document.getElementById("catTag").innerText = data.category || "General";

    // ===== PRICE =====
    let priceText = "আলোচনা সাপেক্ষ";
    if (data.price) priceText = `৳ ${data.price}`;
    if (data.monthlyRent) priceText = `৳ ${data.monthlyRent} / মাস`;
    document.getElementById("price").innerText = priceText;

    // ===== LOCATION LINE =====
    if (data.location) {
        const loc = [
            data.location.village,
            data.location.union,
            data.location.upazila,
            data.location.district
        ].filter(Boolean).join(", ");

        document.getElementById("location").innerHTML =
            `<i class="fas fa-map-marker-alt"></i> ${loc}`;
    }

    // ===== IMAGES =====
    const displayImg = document.getElementById("displayImg");
    const thumbList = document.getElementById("thumbList");

    if (Array.isArray(data.images) && data.images.length) {
        displayImg.src = data.images[0].url;
        thumbList.innerHTML = "";

        data.images.forEach((img, i) => {
            const t = document.createElement("img");
            t.src = img.url;
            if (i === 0) t.classList.add("active");
            t.onclick = () => {
                displayImg.src = img.url;
                document.querySelectorAll(".thumb-container img")
                    .forEach(x => x.classList.remove("active"));
                t.classList.add("active");
            };
            thumbList.appendChild(t);
        });
    }

    // ===== SPEC GRID =====
    const specGrid = document.getElementById("specGrid");
    specGrid.innerHTML = "";

    const labelMap = {
        posterType: "পোস্টকারীর ধরন",
        type: "প্রপার্টির ধরন",
        areaSize: "আয়তন",
        bedRooms: "বেডরুম",
        bathRooms: "বাথরুম",
        floorLevel: "তলা",
        facing: "ফেসিং",
        completionStatus: "অবস্থা"
    };

    addSectionHeader(specGrid, "📊 প্রপার্টি তথ্য");

    Object.keys(labelMap).forEach(key => {
        if (data[key]) {
            addSpecItem(specGrid, labelMap[key], data[key]);
        }
    });

    // ===== DESCRIPTION =====
    document.getElementById("descText").innerText =
        data.description || "কোনো বর্ণনা দেওয়া হয়নি";

    // ===== SELLER INFO =====
    document.getElementById("sellerName").innerText =
        data.ownerName || data.donorName || "বিজ্ঞাপনদাতা";

    const phone =
        data.phoneNumber ||
        data.owner?.phoneNumber ||
        data.contact?.phone;

    if (phone) {
        document.getElementById("callLink").href = `tel:${phone}`;
        document.getElementById("waLink").href = `https://wa.me/88${phone}`;
    }
}

// ===== HELPERS =====
function addSectionHeader(container, title) {
    const d = document.createElement("div");
    d.style = "grid-column:1/-1;font-weight:700;margin-top:20px";
    d.innerText = title;
    container.appendChild(d);
}

function addSpecItem(container, label, value) {
    const box = document.createElement("div");
    box.className = "spec-box";
    box.innerHTML = `<small>${label}</small><b>${value}</b>`;
    container.appendChild(box);
}

loadFullDetails();
