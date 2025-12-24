const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', () => {
    // ১. ডেটা রিট্রাইভ করা (sessionStorage থেকে, যা post.js এ সেট করা হয়েছিল)
    const propertyData = JSON.parse(sessionStorage.getItem('stagedPropertyData'));
    const imageData = JSON.parse(sessionStorage.getItem('stagedImageMetadata'));

    if (!propertyData) {
        console.error("No property data found!");
        return;
    }

    // ২. ইমেজ গ্যালারি রেন্ডারিং
    const mainDisplay = document.getElementById('mainDisplay');
    const thumbStrip = document.getElementById('thumbStrip');

    if (imageData && imageData.images.length > 0) {
        mainDisplay.src = imageData.images[0].url;
        
        imageData.images.forEach((img, index) => {
            const thumb = document.createElement('img');
            thumb.src = img.url;
            thumb.className = `thumb ${index === 0 ? 'active' : ''}`;
            thumb.onclick = () => {
                mainDisplay.src = img.url;
                document.querySelectorAll('.thumb').forEach(t => t.classList.remove('active'));
                thumb.classList.add('active');
            };
            thumbStrip.appendChild(thumb);
        });
    }

    // ৩. টেক্সট ডেটা সেট করা
    document.getElementById('p-title').textContent = propertyData.title;
    document.getElementById('p-desc').textContent = propertyData.description || "বর্ণনা নেই।";
    
    // লোকেশন ফরম্যাট করা
    const loc = propertyData.location;
    document.getElementById('p-location').textContent = `${loc.village}, ${loc.upazila}, ${loc.district}`;

    // দাম ফরম্যাট করা
    const price = propertyData.category === 'ভাড়া' ? propertyData.monthlyRent : propertyData.price;
    document.getElementById('p-price').textContent = `৳ ${price} (${propertyData.priceUnit || 'ফিক্সড'})`;

    // ৪. ফিচার গ্রিড (Icons সহ)
    const specGrid = document.getElementById('p-specs');
    const specs = [
        { icon: 'square_foot', label: 'আয়তন', value: propertyData.landArea || propertyData.areaSqft },
        { icon: 'king_bed', label: 'বেডরুম', value: propertyData.rooms },
        { icon: 'bathtub', label: 'বাথরুম', value: propertyData.bathrooms },
        { icon: 'layers', label: 'তলা', value: propertyData.floorNo },
        { icon: 'explore', label: 'facing', value: propertyData.facing }
    ];

    specs.forEach(spec => {
        if (spec.value) {
            specGrid.innerHTML += `
                <div class="spec-item">
                    <i class="material-icons">${spec.icon}</i>
                    <div class="spec-info">
                        <span>${spec.label}</span>
                        <strong>${spec.value}</strong>
                    </div>
                </div>`;
        }
    });

    // ৫. কন্টাক্ট লজিক
    document.getElementById('callBtn').href = `tel:${propertyData.phoneNumber}`;
    
    // ৬. প্রোফাইল লোড লজিক (index.js থেকে কপি করা)
    auth.onAuthStateChanged(user => {
        if (user) {
            const profileImageWrapper = document.getElementById('profileImageWrapper');
            const profileImage = document.getElementById('profileImage');
            const defaultProfileIcon = document.getElementById('defaultProfileIcon');

            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists && doc.data().profilePicture) {
                    profileImage.src = doc.data().profilePicture;
                    profileImage.style.display = 'block';
                    defaultProfileIcon.style.display = 'none';
                }
            });
        }
    });
});
