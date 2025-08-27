// এটি আপনার প্রপার্টির একটি নমুনা ডেটাবেজ। ভবিষ্যতে এটি ব্যাকএন্ড থেকে আসবে।
const properties = [
    {
        image: "https://via.placeholder.com/400x250?text=New+House+1",
        title: "সুন্দর বাড়ি, খুলনা",
        price: "৫০,০০,০০০",
        location: "খুলনা"
    },
    {
        image: "https://via.placeholder.com/400x250?text=Flat+for+Rent",
        title: "ভাড়ার জন্য ফ্ল্যাট",
        price: "১৫,০০০/মাস",
        location: "খুলনা"
    },
    {
        image: "https://via.placeholder.com/400x250?text=Plot+of+Land",
        title: "একটি প্লট বিক্রি হবে",
        price: "৮,০০,০০০",
        location: "খুলনা"
    },
    {
        image: "https://via.placeholder.com/400x250?text=Commercial+Property",
        title: "বাণিজ্যিক প্রপার্টি",
        price: "১,২০,০০,০০০",
        location: "খুলনা"
    }
];

// এই ফাংশনটি HTML থেকে প্রপার্টি কার্ড তৈরি করবে
function createPropertyCard(property) {
    const card = document.createElement('div');
    card.classList.add('property-card');

    card.innerHTML = `
        <img src="${property.image}" alt="${property.title}">
        <div class="property-card-content">
            <h4>${property.title}</h4>
            <p class="location">${property.location}</p>
            <p class="price">৳ ${property.price}</p>
        </div>
    `;

    return card;
}

// এই ফাংশনটি সব প্রপার্টি কার্ড তৈরি করে ওয়েবসাইটে যুক্ত করবে
function renderProperties() {
    const propertyGrid = document.querySelector('.property-grid');
    if (propertyGrid) {
        propertyGrid.innerHTML = ''; // পুরোনো ডেটা মুছে ফেলে

        properties.forEach(property => {
            const card = createPropertyCard(property);
            propertyGrid.appendChild(card);
        });
    }
}

// যখন পেজ লোড হবে, তখন এই ফাংশনটি রান হবে
document.addEventListener('DOMContentLoaded', renderProperties);