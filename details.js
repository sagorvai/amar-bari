// details.js
document.addEventListener('DOMContentLoaded', function() {
  const db = firebase.firestore();

  // Get post ID from query parameters
  const params = new URLSearchParams(window.location.search);
  const postId = params.get('id');
  if (!postId) {
    alert("Invalid post ID");
    return;
  }

  // Elements
  const titleEl = document.getElementById('propertyTitle');
  const sliderEl = document.getElementById('imageSlider');
  const detailsList = document.getElementById('detailsList');
  const mapLink = document.getElementById('mapLink');
  const callBtn = document.getElementById('callBtn');
  const chatBtn = document.getElementById('chatBtn');
  const saveBtn = document.getElementById('saveBtn');
  const shareBtn = document.getElementById('shareBtn');
  const viewCountSpan = document.getElementById('viewCount');
  const prevBtn = document.getElementById('prevSlideBtn');
  const nextBtn = document.getElementById('nextSlideBtn');
  const relatedPosts = document.getElementById('relatedPosts');

  // Load the property document
  const docRef = db.collection('properties').doc(postId);
  docRef.get().then(doc => {
    if (!doc.exists) {
      alert("পোস্ট পাওয়া যায়নি।");
      return;
    }
    const data = doc.data();

    // Set title
    titleEl.textContent = data.title || 'বিস্তারিত শিরোনাম নেই';

    // Prepare image URLs (৩টি property + খতিয়ান + স্কেচ)
    const imageUrls = [];
    if (Array.isArray(data.images)) {
      data.images.forEach(img => {
        if (typeof img === 'string') imageUrls.push(img);
        else if (img && img.url) imageUrls.push(img.url);
      });
    }
    if (data.khotian) {
      if (typeof data.khotian === 'string') imageUrls.push(data.khotian);
      else if (data.khotian.url) imageUrls.push(data.khotian.url);
    }
    if (data.sketch) {
      if (typeof data.sketch === 'string') imageUrls.push(data.sketch);
      else if (data.sketch.url) imageUrls.push(data.sketch.url);
    }

    // Populate slider images
    imageUrls.forEach((url, index) => {
      const img = document.createElement('img');
      img.src = url;
      if (index === 0) img.classList.add('active');
      sliderEl.appendChild(img);
    });
    let currentSlide = 0;
    const slides = sliderEl.querySelectorAll('img');
    function showSlide(n) {
      slides.forEach(img => img.classList.remove('active'));
      if (slides[n]) slides[n].classList.add('active');
    }
    prevBtn.onclick = () => {
      currentSlide = (currentSlide - 1 + slides.length) % slides.length;
      showSlide(currentSlide);
    };
    nextBtn.onclick = () => {
      currentSlide = (currentSlide + 1) % slides.length;
      showSlide(currentSlide);
    };
    if (slides.length === 0) {
      // Hide slider buttons if no images
      prevBtn.style.display = nextBtn.style.display = 'none';
    }

    // Map link
    if (data.googleMap) {
      mapLink.style.display = 'inline-block';
      mapLink.href = data.googleMap;
    }

    // Call and Chat buttons
    if (data.phoneNumber) {
      callBtn.href = `tel:${data.phoneNumber}`;
    } else {
      callBtn.style.display = 'none';
    }
    chatBtn.href = `chat.html?post=${encodeURIComponent(postId)}`;

    // Save button (simply toggles text/color here)
    let saved = false;
    saveBtn.onclick = () => {
      saved = !saved;
      saveBtn.style.color = saved ? 'red' : '';
    };

    // Share button
    shareBtn.onclick = () => {
      const shareData = { title: data.title || 'আমার বাড়ি.কম', text: data.title, url: window.location.href };
      if (navigator.share) {
        navigator.share(shareData).catch(err => console.error(err));
      } else {
        navigator.clipboard.writeText(window.location.href).then(() => {
          alert("URL কপি করা হয়েছে।");
        });
      }
    };

    // Increment and display view count
    const currentCount = data.viewCount || 0;
    docRef.update({ viewCount: firebase.firestore.FieldValue.increment(1) }); // atomic increment:contentReference[oaicite:1]{index=1}
    viewCountSpan.textContent = `👁️ ${currentCount + 1}`;

    // Display details fields
    function addDetail(label, value) {
      if (value !== undefined && value !== '') {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${label}:</strong> ${value}`;
        detailsList.appendChild(li);
      }
    }

    // Category and Type
    addDetail('ক্যাটাগরি', data.category);
    addDetail('টাইপ', data.type);

    // Owner type (লিস্টার)
    addDetail('বিক্রেতা/ভাড়াদাতা', data.listerType);

    // Price or Rent
    if (data.category === 'বিক্রয়') {
      let price = data.price ? data.price + ' ' + (data.priceUnit || '') : '';
      addDetail('দাম', price);
      if (data.owner) {
        addDetail('দাতা নাম', data.owner.donorName);
        addDetail('দাগ/এসএন', data.owner.dagNoType);
        addDetail('দাগ/এসএন নম্বর', data.owner.dagNo);
        addDetail('মৌজা', data.owner.mouja);
      }
    } else if (data.category === 'ভাড়া') {
      addDetail('মাসিক ভাড়া', data.monthlyRent ? data.monthlyRent + ' টাকা' : '');
      addDetail('এডভান্স', data.advance ? data.advance + ' টাকা' : '');
    }

    // Property-specific fields
    if (data.landArea) addDetail('জমির পরিমান', `${data.landArea} ${data.landAreaUnit||''}`);
    if (data.houseArea) addDetail('বাড়ির পরিমান', `${data.houseArea} ${data.houseAreaUnit||''}`);
    if (data.flatArea) addDetail('ফ্ল্যাটের পরিমান', `${data.areaSqft} বর্গফুট`);
    if (data.commercialArea) addDetail('বাণিজ্যিক পরিমান', `${data.commercialArea} ${data.commercialAreaUnit||''}`);
    if (data.rooms) addDetail('রুম সংখ্যা', data.rooms);
    if (data.bathrooms) addDetail('বাথরুম সংখ্যা', data.bathrooms);
    if (data.kitchen) addDetail('রান্নাঘর', data.kitchen);
    if (data.floors) addDetail('মেঝে সংখ্যা', data.floors);
    if (data.plotNo) addDetail('প্লট নম্বর', data.plotNo);
    if (data.shopCount) addDetail('দোকানের সংখ্যা', data.shopCount);

    // Additional info
    addDetail('বৈশিষ্ট্য', data.description);
    addDetail('বয়স', data.propertyAge);
    addDetail('দিক', data.facing);
    if (Array.isArray(data.utilities)) {
      addDetail('সুবিধাসমূহ', data.utilities.join(', '));
    }

    // Address/location fields
    if (data.location) {
      addDetail('বিভাগ', data.location.division);
      addDetail('জেলা', data.location.district);
      addDetail('এলাকার ধরন', data.location.areaType);
      addDetail('উপজেলা', data.location.upazila);
      addDetail('ইউনিয়ন/ওয়ার্ড', data.location.union || data.location.wardNo);
      addDetail('গ্রাম/মহল্লা', data.location.village);
      addDetail('পথ/রোড', data.location.road);
    }
    addDetail('প্রোফাইল ফোন', data.phoneNumber);
    addDetail('অতিরিক্ত ফোন', data.secondaryPhone);
    addDetail('বর্ণনা', data.description);

    // Related posts: same district and type
    db.collection('properties')
      .where('location.district', '==', data.location.district)
      .where('type', '==', data.type)
      .limit(5)
      .get()
      .then(snap => {
        snap.forEach(doc2 => {
          if (doc2.id !== postId) {
            const other = doc2.data();
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = `details.html?id=${doc2.id}`;
            a.textContent = other.title || "বিস্তারিত নেই";
            li.appendChild(a);
            relatedPosts.appendChild(li);
          }
        });
      });

  }).catch(err => {
    console.error("Error getting document:", err);
  });
});
