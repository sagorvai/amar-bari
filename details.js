// details.js
// Initialize Firestore
const db = firebase.firestore();

// Slider functions (adapted from W3Schools slideshow example):contentReference[oaicite:9]{index=9}.
let slideIndex = 1;
function showSlides(n) {
  const slides = document.getElementsByClassName("mySlides");
  if (slides.length === 0) return;
  if (n > slides.length) { slideIndex = 1; }
  if (n < 1) { slideIndex = slides.length; }
  for (let slide of slides) {
    slide.style.display = "none";
  }
  slides[slideIndex - 1].style.display = "block";
}
function plusSlides(n) { showSlides(slideIndex += n); }

// On DOM ready, fetch listing data
document.addEventListener('DOMContentLoaded', async () => {
  // Get listing ID from URL (e.g. details.html?id=DOCID)
  const params = new URLSearchParams(window.location.search);
  const id = params.get('id');
  if (!id) return;

  // Fetch document from Firestore
  const docRef = db.collection('properties').doc(id);
  const docSnap = await docRef.get();
  if (!docSnap.exists) {
    console.error("Listing not found");
    return;
  }
  const data = docSnap.data();

  // Title and Description
  document.getElementById('propertyTitle').textContent = data.title || '';
  document.getElementById('description').textContent = data.description || '';

  // Update and display view count (Firestore increment):contentReference[oaicite:10]{index=10}
  const viewEl = document.getElementById('viewCount');
  const currentCount = data.viewCount || 0;
  docRef.update({ viewCount: firebase.firestore.FieldValue.increment(1) });
  viewEl.textContent = `👁️ দেখা হয়েছে: ${currentCount + 1} জন`;

  // Call button
  if (data.phoneNumber) {
    const callBtn = document.getElementById('callBtn');
    callBtn.href = `tel:${data.phoneNumber}`;
    callBtn.innerHTML = '📞 কল করুন';
  }

  // Chat button (pass owner/user ID to chat page)
  const chatBtn = document.getElementById('chatBtn');
  chatBtn.href = `chat.html?user=${data.userId || ''}`;
  chatBtn.textContent = '💬 চ্যাট করুন';

  // Populate dynamic details
  const dl = document.getElementById('detailsList');
  function addDetail(label, value) {
    if (!value) return;
    const dt = document.createElement('dt');
    const dd = document.createElement('dd');
    dt.textContent = label;
    dd.textContent = value;
    dl.appendChild(dt);
    dl.appendChild(dd);
  }

  // Category and Type
  addDetail('বিজ্ঞাপনের ধরণ:', data.category);
  addDetail('প্রকার:', data.type);

  // Price or Rent
  if (data.category === 'বিক্রয়') {
    let priceStr = data.price ? `${data.price} টাকা` : '';
    if (data.priceUnit) priceStr += ` (${data.priceUnit})`;
    addDetail('দাম:', priceStr);
  }
  if (data.category === 'ভাড়া') {
    addDetail('মাসিক ভাড়া:', data.monthlyRent ? `${data.monthlyRent} টাকা` : '');
    addDetail('জামানত / এডভান্স:', data.advance ? `${data.advance} টাকা` : '');
    if (data.moveInDate) addDetail('পরিচলন তারিখ:', data.moveInDate);
  }

  // Owner details (for sale)
  if (data.category === 'বিক্রয়' && data.owner) {
    addDetail('মালিকের নাম:', data.owner.donorName);
    addDetail('দাগ নম্বর:', `${data.owner.dagNoType || ''} ${data.owner.dagNo || ''}`);
    addDetail('মৌজা:', data.owner.mouja);
  }

  // Location fields
  if (data.location) {
    let addressParts = [
      data.location.upazila, data.location.union, data.location.thana,
      data.location.wardNo, data.location.village, data.location.road
    ].filter(Boolean);
    let addrText = addressParts.join(', ');
    if (data.location.areaType) addrText = `${data.location.areaType}: ` + addrText;
    addrText += ` (${data.location.district || ''}, ${data.location.division || ''})`;

    // Google Maps link (if coordinates available in data.googleMap)
    if (data.googleMap) {
      const [lat, lng] = data.googleMap.split(',').map(coord => coord.trim());
      if (lat && lng) {
        const mapLink = document.createElement('a');
        mapLink.href = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        mapLink.target = '_blank';
        mapLink.textContent = ' মানচিত্রে দেখুন';
        addrText += mapLink.outerHTML;
      }
    }
    addDetail('ঠিকানা:', addrText);
  }

  // Property-specific details
  if (['জমি','প্লট'].includes(data.type)) {
    addDetail('জমির পরিমাণ:', data.landArea ? `${data.landArea} ${data.landAreaUnit||''}` : '');
    addDetail('রোডের প্রস্থ:', data.roadWidth ? `${data.roadWidth} ফুট` : '');
    addDetail('জমির ধরন:', data.landType);
    if (data.type === 'প্লট') {
      addDetail('প্লট নং:', data.plotNo);
    }
  } else {
    // Built properties
    if (data.floors) addDetail('মালিকানার তলা:', data.floors);
    if (data.houseArea) addDetail('পরিমাণ (বাসা):', `${data.houseArea} ${data.houseAreaUnit||''}`);
    if (data.rooms) addDetail('রুম সংখ্যা:', data.rooms);
    if (data.bathrooms) addDetail('বাথরুম:', data.bathrooms);
    if (data.kitchen) addDetail('রান্নাঘর:', data.kitchen);
    if (data.areaSqft) addDetail('পরিমাণ (ফ্ল্যাট):', `${data.areaSqft} বর্গফুট`);
    if (data.floorNo) addDetail('মেঝে নম্বর:', data.floorNo);
    if (data.commercialArea) addDetail('ব্যবসায়িক পরিমাণ:', `${data.commercialArea} ${data.commercialAreaUnit||''}`);
    if (data.shopCount) addDetail('দোকানের সংখ্যা:', data.shopCount);
    // Property age and facing
    if (data.propertyAge) addDetail('প্রপার্টির বয়স:', `${data.propertyAge} বছর`);
    if (data.facing) addDetail('ফেসিং:', data.facing);
  }

  // Utilities (যদি থাকে)
  if (data.utilities) {
    const utils = [];
    for (let key in data.utilities) {
      if (data.utilities[key]) {
        // Convert utility key to Bengali label (e.g. "electricity":"বিদ্যুৎ")
        let label = key;
        if (key === 'electricity') label = 'বিদ্যুৎ'; 
        else if (key === 'gas') label = 'গ্যাস';
        else if (key === 'water') label = 'পানি';
        else if (key === 'sewage') label = 'পয়ঃনিষ্কাশন';
        utils.push(label);
      }
    }
    if (utils.length) addDetail('সুবিধাসমূহ:', utils.join(', '));
  }

  // Build Image Slider (3 main + khotian + sketch):contentReference[oaicite:11]{index=11}
  const slider = document.getElementById('slider');
  const imgUrls = [];
  if (Array.isArray(data.images)) imgUrls.push(...data.images);
  if (data.khotian) imgUrls.push(data.khotian);
  if (data.sketch) imgUrls.push(data.sketch);
  const totalSlides = imgUrls.length;
  imgUrls.forEach((url, i) => {
    const slideDiv = document.createElement('div');
    slideDiv.className = 'mySlides fade';
    slideDiv.innerHTML = `
      <div class="numbertext">${i+1} / ${totalSlides}</div>
      <img src="${url}" style="width:100%">
    `;
    slider.appendChild(slideDiv);
  });
  showSlides(slideIndex);  // display the first slide

  // Share button handler
  document.getElementById('shareBtn').addEventListener('click', () => {
    const shareData = {
      title: data.title || 'বিজ্ঞাপন',
      text: data.description || '',
      url: window.location.href
    };
    if (navigator.share) {
      navigator.share(shareData).catch(err => console.error(err));
    } else {
      // Fallback: copy URL
      navigator.clipboard.writeText(window.location.href)
        .then(() => alert('URL কপি হয়েছে'))
        .catch(err => console.error(err));
    }
  });

  // Related listings query:contentReference[oaicite:12]{index=12}
  db.collection('properties')
    .where('location.district', '==', data.location.district)
    .where('type', '==', data.type)
    .limit(5)
    .get().then(snap => {
      const ul = document.getElementById('relatedList');
      snap.forEach(doc => {
        if (doc.id === id) return;
        const item = doc.data();
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = `details.html?id=${doc.id}`;
        a.textContent = item.title || `${item.type} - ${item.location.district}`;
        li.appendChild(a);
        ul.appendChild(li);
      });
    }).catch(err => console.error(err));

}).catch(err => console.error(err));
