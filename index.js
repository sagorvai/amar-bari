// index.js

// ... (অন্যান্য কোড অপরিবর্তিত) ...

// --- প্রধান ফাংশন: প্রপার্টি লোড ও প্রদর্শন (সার্চ লজিক সহ ফিক্স) ---
async function fetchAndDisplayProperties(category, searchTerm = '') {
    
    // লোডিং মেসেজ দেখান
    propertyG.innerHTML = '<p class="loading-message">প্রপার্টি লোড হচ্ছে...</p>';
    
    let query = db.collection('properties');
    
    // ১. ক্যাটাগরি ফিল্টার:
    if (category && category !== 'সকল' && category !== '' && category !== 'map') {
        query = query.where('category', '==', category);
    }
    
    // ২. স্ট্যাটাস ফিল্টার:
    query = query.where('status', '==', 'published');
    
    let finalQuery;

    try {
        // ৩. সার্চ টার্ম ফিল্টার (যদি থাকে)
        if (searchTerm) {
            // যদি সার্চ টার্ম থাকে, আমরা location.district এর উপর ভিত্তি করে রেঞ্জ কোয়েরি ব্যবহার করব।
            // এই কোয়েরির জন্য একটি নতুন ইনডেক্স (category, status, location.district) তৈরি করতে হবে।
            const searchLower = searchTerm.toLowerCase();
            
            finalQuery = query
                // district এর ওপর প্রিফিক্স সার্চ
                .where('location.district', '>=', searchLower) 
                .where('location.district', '<=', searchLower + '\uf8ff') 
                .orderBy('location.district', 'asc'); // সার্চ ক্যোয়ারির জন্য orderBy পরিবর্তন
                
        } else {
            // ৪. কোনো সার্চ টার্ম না থাকলে, আপনার তৈরি করা ইনডেক্স (category, status, createdAt) ব্যবহার করে সাজানো হবে।
            finalQuery = query.orderBy('createdAt', 'desc');
        }

        // ✅ কোয়েরি চালান
        const snapshot = await finalQuery.get();
        
        // লোডিং মেসেজ মুছে দিন
        propertyG.innerHTML = '';
        
        if (snapshot.empty) {
            propertyG.innerHTML = `<p class="empty-message">এই ফিল্টার বা খোঁজে কোনো প্রপার্টি খুঁজে পাওয়া যায়নি।</p>`;
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
        // যদি ফায়ারবেস ইনডেক্সিং এর ত্রুটি থাকে, তা কনসোলে দেখাবে।
        console.error("প্রপার্টি লোড করতে ব্যর্থ হয়েছে:", error);
        
        // ফায়ারবেস একটি লিংক দেবে যেখানে গিয়ে নতুন ইনডেক্স তৈরি করতে হবে।
        propertyG.innerHTML = '<p class="error-message" style="color: red;">প্রপার্টি লোড করতে সমস্যা হয়েছে। অনুগ্রহ করে ব্রাউজারের কনসোল (Console) চেক করুন। (যদি নতুন সার্চ ফিচার ব্যবহার করতে চান, তবে সম্ভবত ফায়ারবেসে অতিরিক্ত ইনডেক্স দরকার।)</p>';
    }
}
// --- প্রধান ফাংশন শেষ ---

// ... (অন্যান্য কোড অপরিবর্তিত) ...
