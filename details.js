const params = new URLSearchParams(location.search);
const id = params.get('id');
if (!id) location.href = 'index.html';

db.collection('properties').doc(id).get().then(doc => {
  if (!doc.exists) return alert('ডেটা পাওয়া যায়নি');
  const data = doc.data();
  renderAll(data);
});

function renderAll(data) {
  renderHeader(data);
  renderGallery(data.images || []);
  renderOverview(data);
  renderPriceTerms(data);
  renderLocation(data.location || {});
  renderPhysical(data);
  renderOwnership(data.owner || {});
  renderContact(data);
  document.getElementById('description').innerText = data.description || '';
}

/* ---------- HELPERS ---------- */

function addBox(parent, label, value) {
  if (!value) return;
  parent.innerHTML += `
    <div class="box">
      <div class="label">${label}</div>
      <div class="value">${value}</div>
    </div>`;
}

/* ---------- SECTIONS ---------- */

function renderHeader(d) {
  title.innerText = d.title || '';
  shortLocation.innerText = `${d.location?.district || ''}, ${d.location?.upazila || ''}`;
  price.innerText = d.price ? `৳ ${d.price}` : d.monthlyRent ? `৳ ${d.monthlyRent} / মাস` : '';
}

function renderGallery(images) {
  if (!images.length) return;
  displayImg.src = images[0].url;
  images.forEach(img => {
    thumbList.innerHTML += `<img src="${img.url}" onclick="displayImg.src='${img.url}'">`;
  });
}

function renderOverview(d) {
  const o = overview;
  addBox(o, 'প্রপার্টির ধরন', d.type);
  addBox(o, 'ক্যাটাগরি', d.category);
  addBox(o, 'বিজ্ঞাপনদাতা', d.listerType);
  addBox(o, 'ফেসিং', d.facing);
  addBox(o, 'প্রপার্টির বয়স', d.propertyAge);
  if (Array.isArray(d.utilities)) addBox(o, 'সুবিধাসমূহ', d.utilities.join(', '));
}

function renderPriceTerms(d) {
  const p = priceTerms;
  addBox(p, 'মূল্য', d.price);
  addBox(p, 'মাসিক ভাড়া', d.monthlyRent);
  addBox(p, 'অ্যাডভান্স', d.advance);
  addBox(p, 'বাসা ছাড়ার তারিখ', d.moveInDate);
}

function renderLocation(loc) {
  const l = locationInfo;
  Object.entries(loc).forEach(([k,v]) => addBox(l, k, v));
}

function renderPhysical(d) {
  const p = physicalDetails;
  ['rooms','bathrooms','kitchen','areaSqft','landArea','floors','commercialArea','roadWidth']
    .forEach(k => addBox(p, k, d[k]));
}

function renderOwnership(owner) {
  const o = ownership;
  if (!Object.keys(owner).length) {
    document.getElementById('legalSection').style.display='none';
    return;
  }
  Object.entries(owner).forEach(([k,v]) => addBox(o, k, v));
}

function renderContact(d) {
  posterType.innerText = d.listerType || '';
  sellerName.innerText = d.owner?.donorName || '';
  callBtn.href = `tel:${d.phoneNumber}`;
  waBtn.href = `https://wa.me/88${d.phoneNumber}`;
    }
