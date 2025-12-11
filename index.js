// index.js (fetchAndDisplayProperties ফাংশনের নতুন ভার্সন - পরীক্ষামূলক)

// ... (অন্যান্য কোড অপরিবর্তিত) ...

// --- প্রধান ফাংশন: প্রপার্টি লোড ও প্রদর্শন (পরীক্ষামূলক: সব ইনডেক্স বাইপাস) ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    
    // লোডিং মেসেজ দেখান
    propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';
    
    // ⭐⭐ পরীক্ষামূলক কোড: শুধুমাত্র কালেকশন থেকে প্রথম ১০টি ডকুমেন্ট আনুন ⭐⭐
    let query = db.collection('properties');

    try {
        // কোনো where() বা orderBy() ব্যবহার করা হচ্ছে না।
        // এটি যেকোনো ফায়ারবেস ডেটাবেস থেকে ডেটা লোড করতে পারার কথা।
        const snapshot = await query.limit(10).get(); 
        
        propertyG.innerHTML = ''; // লোডিং মেসেজ মুছে দিন
        
        if (snapshot.empty) {
            // যদি ডেটাবেসে কোনো প্রপার্টি না থাকে বা সব প্রপার্টির সংখ্যা ১০ এর কম হয়।
            propertyG.innerHTML = `<p class="empty-message">ডেটাবেসে কোনো পোস্ট খুঁজে পাওয়া যায়নি (অথবা প্রথম ১০টি লোড হয়নি)।</p>`;
            return;
        }

        let htmlContent = ''; 
        
        // ৫. ডেটা রেন্ডারিং
        snapshot.forEach(doc => {
            const data = doc.data();
            
            const imageUrl = (data.images && data.images.length > 0 && data.images[0].url) ? data.images[0].url : 'placeholder.jpg';
            
            let priceText = '';
            if (data.price) {
                priceText = `${data.price}`;
            } else if (data.monthlyRent) {
                priceText = `${data.monthlyRent}/মাস`;
            } else {
                priceText = 'দাম আলোচনা সাপেক্ষ';
            }
            
            const finalPriceText = priceText.includes('আলোচনা সাপেক্ষ') ? priceText : `৳ ${priceText}`;
            
            const cardHtml = `
                <div class="property-card" data-id="${doc.id}" onclick="window.location.href='details.html?id=${doc.id}'">
                    <img src="${imageUrl}" alt="${data.title}">
                    <div class="card-info">
                        <h3>${data.title}</h3>
                        <p class="location"><i class="material-icons">location_on</i> ${data.location && data.location.district ? data.location.district : 'অজানা জেলা'}</p>
                        <p class="price">${finalPriceText}</p>
                    </div>
                </div>
            `;
            htmlContent += cardHtml; 
        });
        
        propertyG.innerHTML = htmlContent; 
        
    } catch (error) {
        console.error("প্রপার্টি লোড করতে ব্যর্থ হয়েছে:", error);
        
        // এই মেসেজটি এখন শুধুমাত্র প্রকৃত ব্যর্থতা দেখালে আসবে।
        propertyG.innerHTML = '<p class="error-message" style="color: red;">পোস্ট লোড করা যায়নি। অনুগ্রহ করে ব্রাউজারের কনসোল (F12) চেক করুন। ফায়ারবেস সংযোগে সমস্যা থাকতে পারে।</p>';
    }
}
// --- প্রধান ফাংশন শেষ ---

// ... (বাকি কোড অপরিবর্তিত থাকবে) ...
