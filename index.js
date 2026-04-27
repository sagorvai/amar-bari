// Firebase SDKs
const db = firebase.firestore();
const auth = firebase.auth();

// UI elements
const propertyG = document.querySelector('.property-grid');
const navButtons = document.querySelectorAll('.nav-filters .nav-button');
const globalSearchInput = document.getElementById('globalSearchInput');

// ১. প্রপার্টি ফেচ করার ফাংশন (আপনার ডাটাবেস ও স্ক্রিনশট অনুযায়ী)
async function fetchAndDisplayProperties(category, searchText = '') {
    propertyG.innerHTML = '<p class="loading-message">লোড হচ্ছে...</p>';

    try {
        // আপনার স্ক্রিনশট অনুযায়ী 'Published' (বড় হাতের P) ব্যবহার করা হয়েছে
        let query = db.collection('properties')
                      .where('category', '==', category)
                      .where('status', '==', 'Published'); 

        const querySnapshot = await query.get();
        propertyG.innerHTML = '';

        if (querySnapshot.empty) {
            propertyG.innerHTML = '<p class="no-results-message">বর্তমানে এই ক্যাটাগরিতে কোনো প্রপার্টি নেই।</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const id = doc.id;
            
            // সার্চ ফিল্টার
            if (searchText && !data.title.toLowerCase().includes(searchText.toLowerCase())) {
                return; 
            }

            const card = document.createElement('div');
            card.className = 'property-card';
            card.innerHTML = createPropertyCardHTML(id, data);
            propertyG.appendChild(card);
        });
    } catch (error) {
        console.error("Error fetching properties: ", error);
        propertyG.innerHTML = '<p class="error-box">ডেটা লোড করতে সমস্যা হয়েছে। দয়া করে কনসোল চেক করুন।</p>';
    }
}

// ২. কার্ড এইচটিএমএল (আপনার style.css এবং ডাটাবেস ফিল্ড অনুযায়ী)
function createPropertyCardHTML(id, data) {
    const price = data.category === 'বিক্রয়' ? `৳ ${data.price}` : `৳ ${data.monthlyRent}/মাস`;
    
    // ইমেজ চেক: সরাসরি লিঙ্ক বা অবজেক্ট দুটোর জন্যই ব্যাকআপ রাখা হয়েছে
    let imageUrl = 'placeholder.jpg'; // ডিফল্ট ছবি
    if (data.images && data.images.length > 0) {
        imageUrl = typeof data.images[0] === 'object' ? data.images[0].url : data.images[0];
    }

    return `
        <div onclick="location.href='details.html?id=${id}'">
            <div class="property-image-container">
                <div class="image-slider">
                    <div class="slider-item" style="background-image: url('${imageUrl}'); display: block;"></div>
                </div>
                <div class="property-category">${data.category}</div>
            </div>
            <div class="property-details">
                <h3 class="property-title">${data.title}</h3>
                <p class="property-location"><i class="material-icons">place</i> ${data.address || 'ঠিকানা নেই'}</p>
                
                <div class="property-specs">
                    ${data.plotNumber ? `<span><i class="material-icons">straighten</i> ${data.plotNumber}</span>` : ''}
                    ${data.floorCount ? `<span><i class="material-icons">layers</i> ${data.floorCount} তলা</span>` : ''}
                    ${data.advanceAmount ? `<span><i class="material-icons">payments</i> অগ্রিম: ${data.advanceAmount}</span>` : ''}
                </div>

                <div class="property-price">
                    ${price}
                    ${data.priceUnit ? `<span class="unit">${data.priceUnit}</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

// ৩. ইভেন্ট লিসেনার সেটআপ
document.addEventListener('DOMContentLoaded', () => {
    // ডিফল্টভাবে বিক্রয় ক্যাটাগরি দেখাবে
    fetchAndDisplayProperties('বিক্রয়');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            const category = button.getAttribute('data-category');
            fetchAndDisplayProperties(category);
        });
    });

    if (globalSearchInput) {
        globalSearchInput.addEventListener('input', (e) => {
            const activeCategory = document.querySelector('.nav-button.active').getAttribute('data-category');
            fetchAndDisplayProperties(activeCategory, e.target.value);
        });
    }
});
