// post.js - Fixed with Client-Side Image Compression (KB size) & Fast Parallel Uploads
const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// এডিট মুড ট্র্যাক করার জন্য গ্লোবাল ভেরিয়েবল
let isEditMode = false;
let editPostId = null;

// ⚡ ম্যাজিক ফাংশন: ক্যানভাস (Canvas API) দিয়ে ক্লায়েন্ট-সাইডেই ছবি কম্প্রেস করে KB সাইজে আনা
const compressImage = (file, maxWidth = 1200, quality = 0.7) => {
    return new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            return resolve(file);
        }

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob((blob) => {
                    if (!blob) {
                        return reject(new Error('ইমেজ কম্প্রেস করতে সমস্যা হয়েছে।'));
                    }
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                }, 'image/jpeg', quality);
            };
        };
        reader.onerror = (error) => reject(error);
    });
};

// আপলোড প্রোগ্রেস ট্র্যাক করবে এবং কলব্যাক ফাংশনে পার্সেন্টেজ পাঠাবে
const uploadStagedImage = (file, index, userId, docType = 'main', onProgress) => {
    return new Promise((resolve, reject) => {
        const baseDir = docType === 'main' ? 'staging/images' : `staging/documents/${docType}`;
        const filePath = `${baseDir}/${userId}/${Date.now()}_${index}_${file.name}`;
        const imageRef = storage.ref().child(filePath);
        
        const uploadTask = imageRef.put(file);
        
        uploadTask.on('state_changed', 
            (snapshot) => {
                const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                if (onProgress) onProgress(progress); 
            }, 
            (error) => {
                reject(error);
            }, 
            async () => {
                const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                resolve({
                    fileName: file.name,
                    fileMimeType: file.type,
                    storagePath: filePath,
                    url: downloadURL
                });
            }
        );
    });
};

document.addEventListener('DOMContentLoaded', function() {
    const postCategorySelect = document.getElementById('post-category');
    const dynamicFieldsContainer = document.getElementById('dynamic-fields-container');
    const propertyForm = document.getElementById('property-form');
    const submitBtn = document.querySelector('#property-form button[type="submit"]');
    
    const messageButton = document.getElementById('messageButton');
    const notificationButton = document.getElementById('notificationButton'); // ফিক্সড: ডিক্লেয়ার করা হলো
    const profileImageWrapper = document.getElementById('profileImageWrapper');

    
    // ভৌগোলিক অবজেক্ট
    const BD_GEOGRAPHY = {
        "ঢাকা বিভাগ": {
            "ঢাকা": {
                "সিটি কর্পোরেশন": ["মিরপুর", "উত্তরা", "ধানমন্ডি", "গুলশান", "পল্টন", "মতিঝিল", "শাহবাগ", "মোহাম্মদপুর", "তেজগাঁও", "রমনা", "খিলগাঁও", "বাড্ডা", "মিরপুর মডেল", "কাফরুল", "পল্লবী", "দারুস সালাম", "শাহ আলী", "তুরাগ", "উত্তরখান", "দক্ষিণখান", "খিলক্ষেত", "ভাটারা", "রামপুরা", "সবুজবাগ", "মতিঝিল", "চকবাজার", "কোতোয়ালী", "বংশাল", "সূত্রাপুর", "হাজারীবাগ", "ধানমন্ডি", "কলাবাগান", "তেজগাঁও শিল্পাঞ্চল", "শেরেবাংলা নগর", "হাতিরঝিল", "কদমতলী", "যাত্রাবাড়ী", "শ্যামপুর", "ডেমরা", "ওয়ারী", "গেন্ডারিয়া", "লালবাগ", "কামরাঙ্গীরচর"],
                "উপজেলা": ["সাভার", "ধামরাই", "কেরানীগঞ্জ", "দোহার", "নবাবগঞ্জ"]
            },
            "গাজীপুর": {
                "সিটি কর্পোরেশন": ["গাজীপুর সদর", "কোনাবাড়ী", "বাসন", "গাছা", "টঙ্গী পূর্ব", "টঙ্গী পশ্চিম", "পূবাইল", "কাশিয়াপুর"],
                "উপজেলা": ["কালিয়াকৈর", "কালীগঞ্জ", "শ্রীপুর", "কাপাসিয়া"]
            },
            "নারায়ণগঞ্জ": {
                "সিটি কর্পোরেশন": ["নারায়ণগঞ্জ সদর", "সিদ্ধিরগঞ্জ", "বন্দর"],
                "উপজেলা": ["আড়াইহাজার", "রূপগঞ্জ", "সোনারগাঁও"]
            },
            "টাঙ্গাইল": { "উপজেলা": ["টাঙ্গাইল সদর", "কালিহাতী", "घाटাইল", "মির্জাপুর", "মধুপুর", "গোপালপুর", "সখিপুর", "ভূঞাপুর", "বাসাইল", "দেলদুয়ার", "নাগরপুর", "ধনবাড়ী"] },
            "ফریدপুর": { "উপজেলা": ["ফریدপুর সদর", "কমলগঞ্জ", "বোয়ালমারী", "আলফাডাঙ্গা", "নগরকান্দা", "ভাঙ্গা", "সদরপুর", "চরভদ্রাসন", "সালথা"] },
            "মানিকগঞ্জ": { "উপজেলা": ["মানিকগঞ্জ সদর", "সিংগাইর", "শিবালয়", "ঘিওর", "হরিরামপুর", "সাটুরিয়া", "দৌলতপুর"] },
            "মুন্সীগঞ্জ": { "উপজেলা": ["মুন্সীগঞ্জ সদর", "টংগিবাড়ী", "শ্রীনগর", "লৌহজং", "গজারিয়া", "সিরাজদিখান"] },
            "নরসিংদী": { "উপজেলা": ["নরসিংদী সদর", "পলাশ", "শিবপুর", "মনোহরদী", "বেলাবো", "রায়পুরা"] },
            "مাদারীপুর": { "উপজেলা": ["مাদারীপুর সদর", "শিবচর", "কালকিনি", "রাজৈর", "ডাসার"] },
            "গোপালগঞ্জ": { "উপজেলা": ["গোপালগঞ্জ সদর", "টুঙ্গিপাড়া", "কোটালীপাড়া", "কাশিয়ানী", "মুকসুদপুর"] },
            "রাজবাড়ী": { "উপজেলা": ["রাজবাড়ী সদর", "গোয়ালন্দ", "পাংশা", "বালিয়াকান্দি", "কালুখালী"] },
            "শরীয়তপুর": { "উপজেলা": ["শরীয়তপুর সদর", "ডামুড্যা", "নড়িয়া", "জাজিরা", "ভেদরগঞ্জ", "গোসাইরহাট"] },
            "কিশোরগঞ্জ": { "উপজেলা": ["কিশোরগঞ্জ সদর", "করিমগঞ্জ", "তাড়াইল", "হোসেনপুর", "পাকুন্দিয়া", "কটিয়াদী", "বাজিতপুর", "কুলিয়ারচর", "ভৈরব", "নিকলী", "মিঠামইন", "ইটনা", "অষ্টগ্রাম"] }
        },
        "চট্টগ্রাম বিভাগ": {
            "চট্টগ্রাম": {
                "সিটি কর্পোরেশন": ["কোতোয়ালী", "ডবলমুরিং", "পাঁচলাইশ", "খুলশী", "চান্দগাঁও", "পতেঙ্গা", "পাহাড়তলী", "বন্দর", "বাকলিয়া", "বায়োজিদ বোস্তামী", "হালিশহর", "আকবর শাহ", "কর্ণফুলী", "চকবাজার", "সদরঘাট"],
                "উপজেলা": ["হাটহাজারী", "সীতাকুণ্ড", "মিরসরাই", "পটিয়া", "রাউজান", "রঙ্গুনিয়া", "বোয়ালখালী", "আনোয়ারা", "চন্দনাইশ", "বাঁশখালী", "সাতকানিয়া", "লোহাগাড়া", "সন্দীপ", "ফটিকছড়ি"]
            },
            "কুমিল্লা": {
                "সিটি কর্পোরেশন": ["কুমিল্লা সদর", "কোতোয়ালী মেট্রো", "সদর দক্ষিণ"],
                "উপজেলা": ["লাকসাম", "চৌদ্দগ্রাম", "লাঙ্গলকোট", "বরুড়া", "চান্দিনা", "বুড়িচং", "ব্রাহ্মণপাড়া", "দেবীদ্বার", "মুরাদনগর", "দাউদকান্দি", "হোমনা", "তিতাস", "মেঘনা", "মনোহরগঞ্জ"]
            },
            "কক্সবাজার": { "উপজেলা": ["কক্সবাজার সদর", "উখিয়া", "টেকনাফ", "রামু", "চকরিয়া", "মহেশখালী", "পেকুয়া", "কুতুবদিয়া", "ঈদগাঁও"] },
            "ফেনী": { "উপজেলা": ["ফেনী সদর", "দাগনভূঞা", "ছাগলনাইয়া", "পরশুরাম", "ফুলগাজী", "সোনাগাজী"] },
            "ব্রাহ্মণবাড়িয়া": { "উপজেলা": ["ব্রাহ্মণবাড়িয়া সদর", "আশুগঞ্জ", "সরাইল", "নাসিরনগর", "নবীনগর", "বাঞ্ছারামপুর", "কসবা", "আখাউড়া", "বিজয়নগর"] },
            "নোয়াখালী": { "উপজেলা": ["নোয়াখালী সদর", "কোম্পানীগঞ্জ", "বেগমগঞ্জ", "চাটখিল", "সেনবাগ", "হাতিয়া", "চৌমুহনী", "subarnachar", "कबीरহাট"] },
            "লক্ষ্মীপুর": { "উপজেলা": ["লক্ষ্মীপুর সদর", "রায়পুর", "রামগঞ্জ", "রামগতি", "কমলনগর"] },
            "চাঁদপুর": { "উপজেলা": ["চাঁদপুর সদর", "হাজীগঞ্জ", "কচুয়া", "ফরিদগঞ্জ", "মতলব উত্তর", "মতলব দক্ষিণ", "হাইমচর", "শাহরাস্তি"] },
            "খাগড়াছড়ি": { "উপজেলা": ["খাগড়াছড়ি সদর", "দীঘিনালা", "পানছড়ি", "মাটিরাঙ্গা", "মহালছড়ি", "মানিকছড়ি", "রামগড়", "গুইমারা", "লক্ষ্মীছড়ি"] },
            "রাঙ্গামাটি": { "উপজেলা": ["রাঙ্গামাটি সদর", "কাপ্তাই", "কাউখালী", "বাঘাইছড়ি", "লংগদু", "রাজস্থলী", "জুরাছড়ি", "বলাইছড়ি", "নানিয়ারচর", "বরকল"] },
            "বান্দরবান": { "উপজেলা": ["বান্দরবান সদর", "লামা", "আলীকদম", "নাইক্ষ্যংছড়ি", "রুমা", "থানচি", "রোয়াংছড়ি"] }
        },
        "খুলনা বিভাগ": {
            "খুলনা": {
                "সিটি কর্পোরেশন": ["খুলনা সদর", "দৌলতপুর", "খালিশপুর", "خانজাহান আলী", "লবণচরা", "হরিণটানা", "আড়ংঘাটা", "সোনাডাঙ্গা"],
                "উপজেলা": ["বটিয়াঘাটা", "দাকোপ", "ডুমুরিয়া", "دیغلیয়া", "কয়রা", "পাইকগাছা", "ফুলতলা", "রূপসা", "তেরখাদা"]
            },
            "যশোর": { "উপজেলা": ["যশোর সদর", "অভয়নগর", "বাঘেরপাড়া", "চৌগাছা", "ঝিকরগাছা", "কেশবপুর", "مণিরামপুর", "শার্শা"] },
            "কুষ্টিয়া": { "উপজেলা": ["কুষ্টিয়া সদর", "কুমারখালী", "খোকসা", "মিরপুর", "ভেড়ামারা", "দৌলতপুর"] },
            "বাগেরহাট": { "উপজেলা": ["বাগেরহাট সদর", "চিতলমারী", "ফকিরহাট", "কচুয়া", "مোল্লাহাট", "মংলা", "মোরেলগঞ্জ", "রামপাল", "শরণখোলা"] },
            "সাতক্ষীরা": { "উপজেলা": ["সাতক্ষীরা সদর", "কলারোয়া", "তালা", "দেবহাটা", "কালীগঞ্জ", "শ্যামনগর", "আশাশুনি"] },
            "ঝিনাইদহ": { "উপজেলা": ["ঝিনাইদহ সদর", "শৈলকুপা", "হরিণাকুণ্ডু", "কালীগঞ্জ", "কোটচাঁদপুর", "মহেশপুর"] },
            "মাগুরা": { "উপজেলা": ["মাগুরা সদর", "শ্রীপুর", "মহম্মদপুর", "শালিখা"] },
            "নড়াইল": { "उपजেলা": ["নড়াইল সদর", "লোহাগড়া", "কালিয়া"] },
            "মেহেরপুর": { "উপজেলা": ["মেহেরপুর সদর", "গাংনী", "মুজিবনগর"] },
            "চুয়াডাঙ্গা": { "উপজেলা": ["চুয়াডাঙ্গা সদর", "আলমডাঙ্গা", "দামুড়হুদা", "জীবননগর"] }
        },
        "রাজশাহী বিভাগ": {
            "রাজশাহী": {
                "সিটি কর্পোরেশন": ["বোয়ালিয়া", "রাজপাড়া", "মতিহার", "শাহ মখদুম", "চন্দ্রিমা", "কাটাখালী"],
                "উপজেলা": ["পবা", "গোদাগাড়ী", "তানোর", "মোহনপুর", "বাগমারা", "দুর্গাপুর", "পুট্টিয়া", "চারঘাট", "বাঘা"]
            },
            "বগুড়া": { "উপজেলা": ["বগুড়া সদর", "শাজাহানপুর", "শেরপুর", "ধুনট", "গাবতলী", "সারিয়াকান্দি", "নন্দীগ্রাম", "কাহালু", "আदमদিঘী", "দুপচাঁচিয়া", "শিবগঞ্জ", "সোনাতলা"] },
            "পাবনা": { "উপজেলা": ["পাবনা সদর", "ঈশ্বরদী", "আটঘরিয়া", "চাটমোহর", "ভাঙ্গুড়া", "ফریدপুর", "সুজানগর", "বেড়া", "সাঁথিয়া"] },
            "নাটোর": { "উপজেলা": ["নাটোর সদর", "সিংড়া", "বড়াইগ্রাম", "গুরুদাসপুর", "লালপুর", "বাগাতিপাড়া", "নলডাঙ্গা"] },
            "নওগাঁ": { "উপজেলা": ["নওগাঁ সদর", "রানীনগর", "আত্রাই", "মহাদেবপুর", "बদলগাছী", "পত্নীতলা", "ধামইরহাট", "নিয়ামতপুর", "পোরশা", "সাপাহার", "মান্দা"] },
            "জয়পুরহাট": { "উপজেলা": ["জয়পুরহাট সদর", "পাঁচবিবি", "আক্কেলপুর", "ক্ষেতলাল", "কালাই"] },
            "সিরাজগঞ্জ": { "উপজেলা": ["সিরাজগঞ্জ সদর", "বেলকুచి", "চৌহালী", "কামারখন্দ", "কাজীপুর", "রায়গঞ্জ", "শাহজাদপুর", "তাড়াশ", "উল্লাপাড়া"] },
            "চাঁপাইনবাবগঞ্জ": { "উপজেলা": ["চাঁপাইনবাবগঞ্জ সদর", "শিবগঞ্জ", "গোমস্তাপুর", "নাচোল", "ভোলাহাট"] }
        },
        "বরিশাল বিভাগ": {
            "বরিশাল": {
                "সিটি কর্পোরেশন": ["কোতোয়ালী মেট্রো", "কাউনিয়া", "বন্দর মেট্রো", "এয়ারপোর্ট মেট্রো"],
                "উপজেলা": ["বরিশাল সদর", "বাকেরগঞ্জ", "বাবুগঞ্জ", "উজিরপুর", "বানারীপাড়া", "গৌরনদী", "আগৈলঝারা", "মেহেন্দিগঞ্জ", "মুলাদী", "হিজলা"]
            },
            "পটুয়াখালী": { "উপজেলা": ["পটুয়াখালী সদর", "বাউফল", "গলাচিপা", "দশমিনা", "কলাপাড়া", "মির্জাগঞ্জ", "দুমকী", "রঙ্গাবালী"] },
            "ভোলা": { "উপজেলা": ["ভোলা সদর", "দৌলতখান", "বোরহানউদ্দিন", "তজুমদ্দিন", "লালমোহন", "চরফ্যাশন", "মনপুরা"] },
            "পিরোজপুর": { "উপজেলা": ["পিরোজপুর সদর", "নাজিরপুর", "নেছারাবাদ", "কাউখালী", "ভাণ্ডারিয়া", "مঠবাড়িয়া", "ইন্দুরকানী"] },
            "বরগুনা": { "উপজেলা": ["বরগুনা সদর", "আমতলী", "তালতলী", "বামনা", "পাথরঘাটা", "বেতাগী"] },
            "ঝালকাঠি": { "উপজেলা": ["ঝালকাঠি সদর", "নলছিটি", "রাজাপুর", "কাঠালিয়া"] }
        },
        "সিলেট বিভাগ": {
            "সিলেট": {
                "সিটি কর্পোরেশন": ["কোতোয়ালী", "শাহপরান", "এয়ারপোর্ট", "মোগলাবাজার", "দক্ষিণ সুরমা"],
                "উপজেলা": ["সিলেট সদর", "গোলাপগঞ্জ", "বিয়ানীবাজার", "জৈنتাপুর", "গোয়াইনঘাট", "কানাইঘাট", "কোম্পানীগঞ্জ", "বালাগঞ্জ", "বিশ্বনাথ", "ফেঞ্চুগঞ্জ", "জকিগঞ্জ", "ওসমানীনগর"]
            },
            "সুনামগঞ্জ": { "উপজেলা": ["সুনামগঞ্জ সদর", "দক্ষিণ সুনামগঞ্জ", "দোয়ারাবাজার", "ছাতক", "জগন্নাথপুর", "দিরাই", "শালল্লা", "ধর্মপাশা", "তাহিরপুর", "বিশ্বম্ভরপুর", "মধ্যনগর"] },
            "হবিগঞ্জ": { "উপজেলা": ["হবিগঞ্জ সদর", "শায়েস্তাগঞ্জ", "নবীগঞ্জ", "বাহুবল", "আজমিরীগঞ্জ", "বানিয়াচং", "লাখাই", "চুনারুঘাট", "মাধবপুর"] },
            "مৌলভীবাজার": { "উপজেলা": ["مৌলভীবাজার সদর", "শ্রীমঙ্গল", "কমলগঞ্জ", "রাজনগর", "কুলাউড়া", "জুড়ী", "বড়লেখা"] }
        },
        "রংপুর বিভাগ": {
            "রংপুর": {
                "সিটি কর্পোরেশন": ["কোতোয়ালী মেট্রো", "পরশুরাম", "তাজহাট", "মাহিগঞ্জ", "হারাগাছ"],
                "উপজেলা": ["রংপুর সদর", "মিঠাপুকুর", "পীরগঞ্জ", "পীরগাছা", "কাউনিয়া", "গঙ্গাচড়া", "তারাগঞ্জ", "বদরগঞ্জ"]
            },
            "দিনাজপুর": { "উপজেলা": ["দিনাজপুর সদর", "বিরল", "বোচাগঞ্জ", "কাহারোল", "বীরগঞ্জ", "চিরিরবন্দর", "পার্বতীপুর", "ফুলবাড়ী", "নবাবগঞ্জ", "বিরামপুর", "হাকিমপুর", "ঘোড়াঘাট", "খানসামা"] },
            "গাইবান্ধা": { "উপজেলা": ["গাইবান্ধা সদর", "সাদুল্লাপুর", "পলাশবাড়ী", "গোবিন্দগঞ্জ", "সুন্দরগঞ্জ", "সাঘাটা", "ফুলছড়ি"] },
            "কুড়িগ্রাম": { "উপজেলা": ["কুড়িগ্রাম সদর", "রাজারহাট", "উলিপুর", "চিলমারী", "রৌমারী", "চর রাজিবপুর", "নাগেশ্বরী", "ভুরুঙ্গামারী", "ফুলবাড়ী"] },
            "নীলফামারী": { "উপজেলা": ["নীলফামারী সদর", "সৈয়দপুর", "ডোমার", "ডিমলা", "জলঢাকা", "কিশোরগঞ্জ"] },
            "লালমনিরহাট": { "উপজেলা": ["লালমনিরহাট সদর", "মহেন্দ্রনগর", "আদিতমারী", "কালীগঞ্জ", "হাতীবান্থা", "পাটগ্রাম"] },
            "পঞ্চগড়": { "উপজেলা": ["পঞ্চগড় সদর", "বোদা", "দেবীগঞ্জ", "অটোয়ারী", "তেঁতুলিয়া"] },
            "ঠাকুরগাঁও": { "উপজেলা": ["ঠাকুরগাঁও সদর", "বালীয়াডাঙ্গী", "পীরগঞ্জ", "রাণীশংকৈল", "হরিপুর"] }
        },
        "ময়মনসিংহ বিভাগ": {
            "ময়মনসিংহ": {
                "সিটি কর্পোরেশন": ["ময়মনসিংহ সদর মেট্রো", "কোতোয়ালী"],
                "উপজেলা": ["ময়মনসিংহ সদর", "মুক্তাগাছা", "ফুলবাড়ীয়া", "ত্রিশাল", "ভালুকা", "গফরগাঁও", "নন্দাইল", "ঈশ্বরগঞ্জ", "গৌরীপুর", "হালুয়াঘাট", "ধোবাউড়া", "ফুলপুর", "তারাকান্দা"]
            },
            "নেত্রকোনা": { "উপজেলা": ["নেত্রকোনা সদর", "বারহাট্টা", "কলমাকান্দা", "দুগাপুর", "পূর্বধলা", "মোহনগঞ্জ", "আটপাড়া", "মদন", "খালিয়াজুরী", "কেন্দুয়া"] },
            "জামালপুর": { "উপজেলা": ["জামালপুর সদর", "মেলান্দহ", "ইসলামপুর", "দেওয়ানগঞ্জ", "বকশীগঞ্জ", "মাদারগঞ্জ", "সরিষাবাড়ী"] },
            "শেরপুর": { "উপজেলা": ["শেরপুর সদর", "নালিতাবাড়ী", "শ্রীবরদী", "ঝিনাইগাতী", "নকলা"] }
        }
    };

    function loadStagedData() {
        const stagedDataString = sessionStorage.getItem('stagedPropertyData');
        const stagedMetadataString = sessionStorage.getItem('stagedImageMetadata');
        
        if (!stagedDataString) return; 

        try {
            const stagedData = JSON.parse(stagedDataString);
            const stagedMetadata = stagedMetadataString ? JSON.parse(stagedMetadataString) : {};

            if (document.getElementById('lister-type')) {
                document.getElementById('lister-type').value = stagedData.listerType || '';
            }
            if (postCategorySelect) {
                postCategorySelect.value = stagedData.category || '';
            }

            if (stagedData.category) {
                generateTypeDropdown(stagedData.category);
                
                setTimeout(() => {
                    const postTypeSelect = document.getElementById('post-type');
                    if (postTypeSelect && stagedData.type) {
                        postTypeSelect.value = stagedData.type;
                        generateSpecificFields(stagedData.category, stagedData.type, stagedData, stagedMetadata); 
                    }
                }, 100); 
            }
        } catch (error) {
            console.error('Error loading staged data:', error);
            sessionStorage.removeItem('stagedPropertyData');
            sessionStorage.removeItem('stagedImageMetadata');
        }
    }

    function generateTypeDropdown(category) {
        let options = [];
        if (category === 'বিক্রয়') {
            options = ['জমি', 'প্লট', 'বাড়ি', 'ফ্ল্যাট', 'দোকান', 'অফিস']; 
        } else if (category === 'ভাড়া') {
            options = ['বাড়ি', 'ফ্ল্যাট', 'অফিস', 'দোকান']; 
        }

        const typeSelectHTML = `
            <div class="form-section category-selection-section">
                <h3>প্রপার্টির ধরন</h3>
                <div class="input-group">
                    <label for="post-type">প্রপার্টির ধরন নির্বাচন করুন:</label>
                    <select id="post-type" required class="full-width-select">
                        <option value="">-- নির্বাচন করুন --</option>
                        ${options.map(option => `<option value="${option}">${option}</option>`).join('')}
                    </select>
                </div>
            </div>
            <div id="specific-fields-container"></div>
        `;
        dynamicFieldsContainer.innerHTML = typeSelectHTML;

        const postTypeSelect = document.getElementById('post-type');
        if (postTypeSelect) {
            postTypeSelect.addEventListener('change', (e) => generateSpecificFields(category, e.target.value));
        }
    }
    
    function generateSpecificFields(category, type, stagedData = null, stagedMetadata = null) {
        const specificFieldsContainer = document.getElementById('specific-fields-container');
        let fieldsHTML = '';
        
        if (!type) {
             specificFieldsContainer.innerHTML = '';
             return;
        }

        let categoryDescriptionText = category === 'ভাড়া' ? 'ভাড়ার বিবরণ' : `${category}ের বিবরণ`;
        
        let maxMainImages = category === 'বিক্রয়' ? 3 : 5;
        let imageLabelText = category === 'বিক্রয়' ? `প্রপার্টি ছবি (সর্বোচ্চ ৩টি):` : `প্রপার্টি ছবি (সর্বোচ্চ ৫টি):`;

        let descriptionHTML = `
            <div class="form-section property-details-section">
                <h3>${type} ${categoryDescriptionText}</h3>
                
                <div class="input-group">
                    <label>${imageLabelText}</label>
                    <div class="custom-upload-box" onclick="document.getElementById('images').click()">
                        <i class="material-icons upload-icon-cloud">cloud_upload</i>
                        <div class="upload-text-main">ছবি আপলোড করুন</div>
                        <div class="upload-text-sub">এখানে ফাইল ড্রাগ করুন অথবা চাপুন</div>
                        <div class="upload-btn-fake">Choose File</div>
                    </div>
                    <input type="file" id="images" accept="image/*" multiple style="display: none;">
                    <div class="image-preview-area" id="image-preview-area"></div>
                </div>

                <div class="input-group">
                    <label for="property-title">শিরোনাম:</label>
                    <input type="text" id="property-title" required value="${stagedData?.title || ''}">
                </div>
        `;
        
        if (type !== 'জমি' && type !== 'প্লট') {
            descriptionHTML += `
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="facing">প্রপার্টির দিক:</label>
                        <select id="facing">
                            <option value="">-- নির্বাচন করুন (ঐচ্ছিক) --</option>
                            <option value="উত্তর" ${stagedData?.facing === 'উত্তর' ? 'selected' : ''}>উত্তর</option>
                            <option value="দক্ষিণ" ${stagedData?.facing === 'দক্ষিণ' ? 'selected' : ''}>দক্ষিণ</option>
                            <option value="পূর্ব" ${stagedData?.facing === 'পূর্ব' ? 'selected' : ''}>পূর্ব</option>
                            <option value="পশ্চিম" ${stagedData?.facing === 'পশ্চিম' ? 'selected' : ''}>পশ্চিম</option>
                            <option value="উত্তর-পূর্ব" ${stagedData?.facing === 'উত্তর-পূর্ব' ? 'selected' : ''}>উত্তর-পূর্ব</option>
                            <option value="উত্তর-পশ্চিম" ${stagedData?.facing === 'উত্তর-পশ্চিম' ? 'selected' : ''}>উত্তর-পশ্চিম</option>
                            <option value="দক্ষিণ-পূর্ব" ${stagedData?.facing === 'দক্ষিণ-পূর্ব' ? 'selected' : ''}>দক্ষিণ-পূর্ব</option>
                            <option value="দক্ষিণ-পশ্চিম" ${stagedData?.facing === 'দক্ষিণ-পশ্চিম' ? 'selected' : ''}>দক্ষিণ-পশ্চিম</option>
                        </select>
                    </div>
                </div>
                <div class="input-group">
                    <label>অন্যান্য সুবিধা:</label>
                    <div class="radio-group utility-checkbox-group" style="display: flex; flex-wrap: wrap; gap: 15px;">
                        ${(type === 'ফ্লাট' || type === 'অফিস' || type === 'বাড়ি') ? `<label><input type="checkbox" name="utility" value="লিফট" ${stagedData?.utilities?.includes('লিফট') ? 'checked' : ''}> লিফট</label>` : ''}
                        ${(type === 'ফ্লাট' || type === 'অফিস' || type === 'বাড়ি') ? `<label><input type="checkbox" name="utility" value="পার্কিং সুবিধা" ${stagedData?.utilities?.includes('পার্কিং সুবিধা') ? 'checked' : ''}> পার্কিং সুবিধা</label>` : ''}
                        <label><input type="checkbox" name="utility" value="সিকিউরিটি গার্ড" ${stagedData?.utilities?.includes('সিকিউরিটি গার্ড') ? 'checked' : ''}> সিকিউরিটি গার্ড</label>
                        <label><input type="checkbox" name="utility" value="সিসিটিভি" ${stagedData?.utilities?.includes('সিসিটিভি') ? 'checked' : ''}> সিসিটিভি</label>
                        <label><input type="checkbox" name="utility" value="গ্যাস সংযোগ" ${stagedData?.utilities?.includes('গ্যাস সংযোগ') ? 'checked' : ''}>ガス সংযোগ</label>
                        <label><input type="checkbox" name="utility" value="জেনারেটর" ${stagedData?.utilities?.includes('জেনারেটর') ? 'checked' : ''}> জেনারেটর</label>
                        <label><input type="checkbox" name="utility" value="ওয়াসা পানি" ${stagedData?.utilities?.includes('ওয়াসা পানি') ? 'checked' : ''}> ওয়াসা পানি</label>
                    </div>
                </div>
            `;
        }

        if (type === 'জমি' || type === 'প্লট') {
            descriptionHTML += `
                <div class="input-group">
                    <label for="road-width">চলাচলের রাস্তা (ফিট):</label>
                    <input type="number" id="road-width" required value="${stagedData?.roadWidth || ''}">
                </div>
                <div class="input-group">
                    <label for="land-type">জমির ধরন:</label>
                    <select id="land-type" required>
                        <option value="">-- নির্বাচন করুন --</option>
                        <option value="আবাসিক" ${stagedData?.landType === 'আবাসিক' ? 'selected' : ''}>আবাসিক</option>
                        <option value="বিলান" ${stagedData?.landType === 'বিলান' ? 'selected' : ''}>বিলান</option>
                        <option value="বাস্ত" ${stagedData?.landType === 'বাস্ত' ? 'selected' : ''}>বাস্ত</option>
                        <option value="ভিটা" ${stagedData?.landType === 'ভিটা' ? 'selected' : ''}>ভিটা</option>
                        <option value="ডোবা" ${stagedData?.landType === 'ডোবা' ? 'selected' : ''}>ডোবা</option>
                        <option value="পुकুর" ${stagedData?.landType === 'পুকুর' ? 'selected' : ''}>পুকুর</option>
                    </select>
                </div>
            `;
            if (type === 'প্লট') {
                 descriptionHTML += `<div class="input-group"><label for="plot-no">প্লট নং (ঐচ্ছিক):</label><input type="text" id="plot-no" value="${stagedData?.plotNo || ''}"></div>`;
            }
        } else {
            if (type === 'বাড়ি' || type === 'ফ্লাট') {
                descriptionHTML += `
                    <div class="input-group">
                        <label for="property-age">প্রপার্টির বয়স (বছর):</label>
                        <input type="number" id="property-age" min="0" required value="${stagedData?.propertyAge || ''}">
                    </div>
                    <div class="input-group">
                        <label for="road-width">চলাচলের রাস্তা (ফিট):</label>
                        <input type="number" id="road-width" required value="${stagedData?.roadWidth || ''}">
                    </div>
                    <div class="input-group"><label for="dining">ডাইনিং:</label><input type="number" id="dining" required value="${stagedData?.dining || ''}"></div>
                    <div class="input-group"><label for="balcony">বেলকনি:</label><input type="number" id="balcony" required value="${stagedData?.balcony || ''}"></div>
                `;
            }

            if (type === 'বাড়ি') {
                 descriptionHTML += `<div class="input-group"><label for="floors">তলা সংখ্যা (ঐচ্ছিক):</label><input type="number" id="floors" value="${stagedData?.floors || ''}"></div>`;
            } else if (type === 'ফ্লাট' || type === 'অফিস') {
                descriptionHTML += `<div class="input-group"><label for="floor-no">ফ্লোর নং:</label><input type="number" id="floor-no" required value="${stagedData?.floorNo || ''}"></div>`;
            }

            if (type !== 'দোকান') {
                descriptionHTML += `
                    <div class="input-inline-group">
                        <div class="input-group"><label for="rooms">রুম সংখ্যা:</label><input type="number" id="rooms" required value="${stagedData?.rooms || ''}"></div>
                        <div class="input-group"><label for="bathrooms">বাথরুম সংখ্যা:</label><input type="number" id="bathrooms" required value="${stagedData?.bathrooms || ''}"></div>
                        ${(type === 'বাড়ি' || type === 'ফ্লাট') ? `<div class="input-group"><label for="kitchen">কিচেন সংখ্যা:</label><input type="number" id="kitchen" required value="${stagedData?.kitchen || ''}"></div>` : ''}
                    </div>
                `;
            } else {
                descriptionHTML += `<div class="input-group"><label for="shop-count">দোকান সংখ্যা:</label><input type="number" id="shop-count" required value="${stagedData?.shopCount || ''}"></div>`;
            }
        }
        
        descriptionHTML += '</div>';
        fieldsHTML += descriptionHTML;
        
        if (category === 'বিক্রয়') {
            let ownershipHTML = `
                <div class="form-section ownership-section">
                    <h3>مালিকানা বিবরণ</h3>
                    <div class="input-group"><label for="donor-name">দাতার নাম:</label><input type="text" id="donor-name" required value="${stagedData?.owner?.donorName || ''}"></div>
                    
                    <div class="input-inline-group">
                        <div class="input-group" style="flex: 1;">
                            <label for="khotian-no-type-select">খতিয়ান (ধরন):</label>
                            <select id="khotian-no-type-select" required>
                                <option value="">-- নির্বাচন করুন --</option>
                                <option value="RS" ${stagedData?.owner?.khotianNoType === 'RS' ? 'selected' : ''}>RS</option>
                                <option value="BRS" ${stagedData?.owner?.khotianNoType === 'BRS' ? 'selected' : ''}>BRS</option>
                                <option value="নামজারি" ${stagedData?.owner?.khotianNoType === 'নামজারি' ? 'selected' : ''}>নামজারি</option>
                            </select>
                        </div>
                        <div class="input-group" style="flex: 2;">
                            <label for="khotian-no-input">খতিয়ান নং:</label>
                            <input type="text" id="khotian-no-input" required value="${stagedData?.owner?.khotianNo || ''}">
                        </div>
                    </div>

                    <div class="input-group" style="flex: 3;">
                        <label for="dag-no-input">দাগ নং:</label>
                        <input type="text" id="dag-no-input" required value="${stagedData?.owner?.dagNo || ''}">
                    </div>

                    <div class="input-group"><label for="mouja-owner">মৌজা:</label><input type="text" id="mouja-owner" required value="${stagedData?.owner?.mouja || ''}"></div>
                    
                    <div class="input-group">
                        <label>সর্বশেষ খতিয়ানের ছবি (১টি):</label>
                        <div class="custom-upload-box" onclick="document.getElementById('khotian-image').click()">
                            <i class="material-icons upload-icon-cloud">description</i>
                            <div class="upload-text-main">খতিয়ানের ফাইল সিলেক্ট করুন</div>
                            <div class="upload-btn-fake">Choose File</div>
                        </div>
                        <input type="file" id="khotian-image" accept="image/*" style="display: none;">
                        <div class="image-preview-area" id="khotian-preview-area"></div>
                    </div>

                    <div class="input-group">
                        <label>প্রপার্টি স্কেস বা হস্তান্তর নকশা ছবি (১টি):</label>
                        <div class="custom-upload-box" onclick="document.getElementById('sketch-image').click()">
                            <i class="material-icons upload-icon-cloud">map</i>
                            <div class="upload-text-main">স্কেস/নকশার ফাইল সিলেক্ট করুন</div>
                            <div class="upload-btn-fake">Choose File</div>
                        </div>
                        <input type="file" id="sketch-image" accept="image/*" style="display: none;">
                        <div class="image-preview-area" id="sketch-preview-area"></div>
                    </div>
                </div>
            `;
            fieldsHTML += ownershipHTML;
        }

        let priceRentHTML = '<div class="form-section price-rent-section"><h3>পরিমাণ ও দাম </h3>';
        
        if (type === 'জমি' || type === 'প্লট') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="land-area">পরিমাণ:</label>
                    <input type="number" id="land-area" required value="${stagedData?.landArea || ''}">
                    <select id="land-area-unit" class="unit-select" required>
                        <option value="শতক" ${stagedData?.landAreaUnit === 'শতক' ? 'selected' : ''}>শতক</option>
                        <option value="একর" ${stagedData?.landAreaUnit === 'একর' ? 'selected' : ''}>একর</option>
                    </select>
                </div>
            `;
        } else if (type === 'বাড়ি') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="house-area">পরিমাণ (জমির):</label>
                    <input type="number" id="house-area" required value="${stagedData?.houseArea || ''}">
                    <select id="house-area-unit" class="unit-select" required>
                        <option value="শতক" ${stagedData?.houseAreaUnit === 'শতক' ? 'selected' : ''}>শতক</option>
                        <option value="স্কয়ার ফিট" ${stagedData?.houseAreaUnit === 'স্কয়ার ফিট' ? 'selected' : ''}>স্কয়ার ফিট</option>
                    </select>
                </div>
            `;
        } else if (type === 'ফ্লাট') {
            priceRentHTML += `
                <div class="input-group">
                    <label for="flat-area-sqft">পরিমাণ (স্কয়ার ফিট):</label>
                    <input type="number" id="flat-area-sqft" required value="${stagedData?.areaSqft || ''}">
                    <select id="area-sqft-unit" class="unit-select" required>
                        <option value="স্কয়ার ফিট" ${stagedData?.areaSqftUnit === 'স্কয়ার ফিট' ? 'selected' : ''}>স্কয়ার ফিট</option>
                    </select>
                </div>
            `;
        } else if (type === 'দোকান' || type === 'অফিস') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="commercial-area">পরিমাণ:</label>
                    <input type="number" id="commercial-area" required value="${stagedData?.commercialArea || ''}">
                    <select id="commercial-area-unit" class="unit-select" required>
                        <option value="শতক" ${stagedData?.commercialAreaUnit === 'শতক' ? 'selected' : ''}>শতক</option>
                        <option value="স্কয়ার ফিট" ${stagedData?.commercialAreaUnit === 'স্কয়ার ফিট' ? 'selected' : ''}>স্কয়ার ফিট</option>
                    </select>
                </div>
            `;
        }

        if (category === 'বিক্রয়') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="price">দাম:</label>
                    <input type="number" id="price" required value="${stagedData?.price || ''}">
                    <select id="price-unit" class="unit-select" required>
                        <option value="মোট" ${stagedData?.priceUnit === 'মোট' ? 'selected' : ''}>মোট (টাকায়)</option>
                        <option value="শতক প্রতি" ${stagedData?.priceUnit === 'শতক প্রতি' ? 'selected' : ''}>শতক প্রতি (টাকায়)</option>
                        <option value="স্কয়ার ফিট প্রতি" ${stagedData?.priceUnit === 'স্কয়ার ফিট প্রতি' ? 'selected' : ''}>স্কয়ার ফিট প্রতি (টাকায়)</option>
                    </select>
                </div>
            `;
        } else if (category === 'ভাড়া') {
            priceRentHTML += `
                <div class="input-group input-inline-unit">
                    <label for="monthly-rent">মাসিক ভাড়া (টাকায়):</label>
                    <input type="number" id="monthly-rent" required value="${stagedData?.monthlyRent || ''}">
                    <select id="price-unit" class="unit-select" required>
                        <option value="মাসিক" ${stagedData?.priceUnit === 'মাসিক' ? 'selected' : ''}>মাসিক (টাকায়)</option>
                        <option value="স্কয়ার ফিট" ${stagedData?.priceUnit === 'স্কয়ার ফিট' ? 'selected' : ''}>স্কয়ার ফিট (টাকায়)</option>
                    </select>
                </div>
                <div class="input-group advance-group">
                    <label for="advance">এডভান্স / জামানত </label>
                    <input type="number" id="advance" required value="${stagedData?.advance || ''}">
                </div>
            `;
            if (type === 'বাড়ি' || type === 'ফ্লাট') {
                priceRentHTML += `
                    <div class="input-group">
                        <label for="rent-type">ভাড়ার ধরন:</label>
                        <select id="rent-type" required>
                            <option value="">-- নির্বাচন করুন --</option>
                            <option value="ফ্যামিলি" ${stagedData?.rentType === 'ফ্যামিলি' ? 'selected' : ''}>ফ্যামিলি</option>
                            <option value="ব্যাচেলর" ${stagedData?.rentType === 'ব্যাচেলর' ? 'selected' : ''}>ব্যাচেলর</option>
                            <option value="সকল" ${stagedData?.rentType === 'সকল' ? 'selected' : ''}>সকল</option>
                        </select>
                    </div>
                `;
            }
            priceRentHTML += `<div class="input-group"><label for="move-in-date">ওঠার তারিখ:</label><input type="date" id="move-in-date" required value="${stagedData?.moveInDate || ''}"></div>`;
        }
        
        priceRentHTML += '</div>';
        fieldsHTML += priceRentHTML;

        let addressHTML = `
            <div class="form-section address-section">
                <h3>ঠিকানা ও অবস্থান</h3>
                
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="division-select">বিভাগ:</label>
                        <select id="division-select" required>
                            <option value="">-- বিভাগ নির্বাচন করুন --</option>
                            ${Object.keys(BD_GEOGRAPHY).map(div => `<option value="${div}">${div}</option>`).join('')}
                        </select>
                    </div>
                    <div class="input-group">
                        <label for="district-select">জেলা:</label>
                        <select id="district-select" required disabled>
                            <option value="">-- প্রথমে বিভাগ নির্বাচন করুন --</option>
                        </select>
                    </div>
                </div>

                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="area-type-select">এলাকার ধরন:</label>
                        <select id="area-type-select" required disabled>
                            <option value="">-- এরিয়া ধরন --</option>
                        </select>
                    </div>
                    <div class="input-group">
                        <label id="thana-upazila-label" for="thana-upazila-select">থানা / উপজেলা:</label>
                        <select id="thana-upazila-select" required disabled>
                            <option value="">-- নির্বাচন করুন --</option>
                        </select>
                    </div>
                </div>

                <div id="sub-address-fields"></div>

                <div class="form-group">
                    <label for="googleMap">Google ম্যাপ লোকেশন (পিন করুন):</label>
                    <input type="hidden" id="lat" value="${stagedData?.location?.lat || ''}">
                    <input type="hidden" id="lng" value="${stagedData?.location?.lng || ''}">
                    <div id="map-container" style="height: 300px; width: 100%; margin-top: 10px; border-radius: 8px; border: 1px solid #ddd; z-index: 1;"></div>
                </div>
            </div>
        `;
        fieldsHTML += addressHTML;

        let contactHTML = `
            <div class="form-section contact-section">
                <h3>যোগাযোগের তথ্য</h3>
                <div class="input-inline-group">
                    <div class="input-group"><label for="primary-phone">ফোন নম্বর (লিখুন):</label><input type="tel" id="primary-phone" required value="${stagedData?.phoneNumber || ''}"></div>
                    <div class="input-group"><label for="secondary-phone">অতিরিক্ত ফোন নম্বর (ঐচ্ছিক):</label><input type="tel" id="secondary-phone" value="${stagedData?.secondaryPhone || ''}"></div>
                </div>
                <div class="input-group"><label for="description">বিস্তারিত বর্ণনা (ঐচ্ছিক):</label><textarea id="description" rows="5">${stagedData?.description || ''}</textarea></div>
            </div>
        `;
        fieldsHTML += contactHTML;
        specificFieldsContainer.innerHTML = fieldsHTML;

        // চেইন ড্রপডাউন ইভেন্ট লিসেনার
        setTimeout(() => {
            const divSelect = document.getElementById('division-select');
            const distSelect = document.getElementById('district-select');
            const areaTypeSelect = document.getElementById('area-type-select');
            const thanaSelect = document.getElementById('thana-upazila-select');

            divSelect?.addEventListener('change', function() {
                const selectedDiv = this.value;
                distSelect.innerHTML = '<option value="">-- জেলা নির্বাচন করুন --</option>';
                distSelect.disabled = true;
                areaTypeSelect.innerHTML = '<option value="">-- এরিয়া ধরন --</option>';
                areaTypeSelect.disabled = true;
                thanaSelect.innerHTML = '<option value="">-- নির্বাচন করুন --</option>';
                thanaSelect.disabled = true;
                document.getElementById('sub-address-fields').innerHTML = '';

                if (selectedDiv && BD_GEOGRAPHY[selectedDiv]) {
                    distSelect.disabled = false;
                    Object.keys(BD_GEOGRAPHY[selectedDiv]).forEach(dist => {
                        distSelect.options.add(new Option(dist, dist));
                    });
                }
            });

            distSelect?.addEventListener('change', function() {
                const selectedDiv = divSelect.value;
                const selectedDist = this.value;

                areaTypeSelect.innerHTML = '<option value="">-- এরিয়া ধরন --</option>';
                areaTypeSelect.disabled = true;
                thanaSelect.innerHTML = '<option value="">-- নির্বাচন করুন --</option>';
                thanaSelect.disabled = true;
                document.getElementById('sub-address-fields').innerHTML = '';

                if (selectedDist && BD_GEOGRAPHY[selectedDiv]?.[selectedDist]) {
                    areaTypeSelect.disabled = false;
                    const availableTypes = Object.keys(BD_GEOGRAPHY[selectedDiv][selectedDist]);
                    availableTypes.forEach(type => {
                        areaTypeSelect.options.add(new Option(type, type));
                    });
                }
            });

            areaTypeSelect?.addEventListener('change', function() {
                const selectedDiv = divSelect.value;
                const selectedDist = distSelect.value;
                const selectedType = this.value;

                thanaSelect.innerHTML = '<option value="">-- নির্বাচন করুন --</option>';
                thanaSelect.disabled = true;

                if (selectedType && BD_GEOGRAPHY[selectedDiv]?.[selectedDist]?.[selectedType]) {
                    thanaSelect.disabled = false;
                    document.getElementById('thana-upazila-label').textContent = selectedType === 'সিটি কর্পোরেশন' ? "মেট্রোপলিটন থানা:" : "উপজেলা:";

                    const places = BD_GEOGRAPHY[selectedDiv][selectedDist][selectedType];
                    places.forEach(place => {
                        thanaSelect.options.add(new Option(place, place));
                    });

                    renderTextInputs(selectedType, stagedData);
                } else {
                    document.getElementById('sub-address-fields').innerHTML = '';
                }
            });

            // প্রি-লোডেড এড্রেস সেট করার জন্য (যদি স্টেজড ডেটা থাকে)
            if (stagedData?.location?.division) {
                divSelect.value = stagedData.location.division;
                divSelect.dispatchEvent(new Event('change'));
                if (stagedData.location.district) {
                    distSelect.value = stagedData.location.district;
                    distSelect.dispatchEvent(new Event('change'));
                    if (stagedData.location.areaType) {
                        areaTypeSelect.value = stagedData.location.areaType;
                        areaTypeSelect.dispatchEvent(new Event('change'));
                        if (stagedData.location.thana || stagedData.location.upazila) {
                            thanaSelect.value = stagedData.location.areaType === 'সিটি কর্পোরেশন' ? stagedData.location.thana : stagedData.location.upazila;
                        }
                    }
                }
            }

        }, 200);

        // ওপেনস্ট্রিটম্যাপ রেন্ডারিং (লাইভ লোকেশন ও লাইভ কোঅর্ডিনেট ডিসপ্লে সহ)
        setTimeout(() => {
            const mapElement = document.getElementById('map-container');
            if (mapElement) {
                // ১. ম্যাপের ওপরে Lat/Lng দেখানোর জন্য একটি সুন্দর ছোট বক্স বাবল তৈরি করা
                let coordinateDisplay = document.getElementById('map-coordinate-badge');
                if (!coordinateDisplay) {
                    coordinateDisplay = document.createElement('div');
                    coordinateDisplay.id = 'map-coordinate-badge';
                    // সিএসএস স্টাইল (ইনলাইন) যাতে ম্যাপের ঠিক ওপরে সুন্দর করে ভাসে
                    coordinateDisplay.style.cssText = `
                        position: absolute;
                        top: 10px;
                        right: 10px;
                        background: rgba(255, 255, 255, 0.9);
                        padding: 6px 12px;
                        border-radius: 20px;
                        font-size: 12px;
                        font-weight: bold;
                        color: #333;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
                        z-index: 1000;
                        pointer-events: none;
                    `;
                    mapElement.style.position = 'relative'; // প্যারেন্ট পজিশন ঠিক করা
                    mapElement.appendChild(coordinateDisplay);
                }

                let defaultLat = parseFloat(document.getElementById('lat').value) || 23.8103;
                let defaultLng = parseFloat(document.getElementById('lng').value) || 90.4125;
                
                var map = L.map('map-container').setView([defaultLat, defaultLng], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap'
                }).addTo(map);

                var marker;

                // ফাংশন: ইনপুট ও ডিসপ্লে আপডেট করা
                function updateLocationInputs(lat, lng) {
                    document.getElementById('lat').value = lat;
                    document.getElementById('lng').value = lng;
                    coordinateDisplay.textContent = `Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`;
                }

                // ৩. ব্যবহারকারীর ব্রাউজার থেকে লাইভ লোকেশন (Geolocation API) নেওয়া
                if (navigator.geolocation && !document.getElementById('lat').value) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const liveLat = position.coords.latitude;
                            const liveLng = position.coords.longitude;
                            
                            // ম্যাপকে লাইভ লোকেশনে ফোকাস করা
                            map.setView([liveLat, liveLng], 15);
                            
                            // পিন বসানো
                            if (marker) map.removeLayer(marker);
                            marker = L.marker([liveLat, liveLng]).addTo(map);
                            
                            // ডাটা আপডেট
                            updateLocationInputs(liveLat, liveLng);
                        },
                        (error) => {
                            console.log("লাইভ লোকেশন অ্যাক্সেস পাওয়া যায়নি, ডিফল্ট লোকেশন দেখানো হচ্ছে।");
                            // আগের জমানো বা ডিফল্ট পিন রেন্ডার
                            if (document.getElementById('lat').value && document.getElementById('lng').value) {
                                marker = L.marker([defaultLat, defaultLng]).addTo(map);
                                updateLocationInputs(defaultLat, defaultLng);
                            }
                        }
                    );
                } else if (document.getElementById('lat').value && document.getElementById('lng').value) {
                    // যদি অলরেডি সেশন/স্টেজড ডাটা থাকে তবে সেটাই দেখাবে
                    marker = L.marker([defaultLat, defaultLng]).addTo(map);
                    updateLocationInputs(defaultLat, defaultLng);
                }

                // ২. ম্যাপে ক্লিক করে পিন পরিবর্তনের সাথে সাথে আপডেট
                map.on('click', function(e) {
                    const lat = e.latlng.lat;
                    const lng = e.latlng.lng;
                    if (marker) map.removeLayer(marker);
                    marker = L.marker([lat, lng]).addTo(map);
                    
                    // ডাটা ও ডিসপ্লে আপডেট
                    updateLocationInputs(lat, lng);
                });
            }
        }, 100);

        if (stagedMetadata) {
            const imgArea = document.getElementById('image-preview-area');
            if (imgArea && (stagedMetadata.images || []).length > 0) {
                stagedMetadata.images.forEach(meta => renderExistingPreview(imgArea, meta.id, meta.url, 'main'));
            }
            const khotianArea = document.getElementById('khotian-preview-area');
            if (khotianArea && stagedMetadata.khotian) {
                renderExistingPreview(khotianArea, stagedMetadata.khotian.id, stagedMetadata.khotian.url, 'khotian');
            }
            const sketchArea = document.getElementById('sketch-preview-area');
            if (sketchArea && stagedMetadata.sketch) {
                renderExistingPreview(sketchArea, stagedMetadata.sketch.id, stagedMetadata.sketch.url, 'sketch');
            }
        }

        document.getElementById('images')?.addEventListener('change', (e) => handleImageUploadAndPreview(e, 'image-preview-area', maxMainImages, 'main'));
        document.getElementById('khotian-image')?.addEventListener('change', (e) => handleImageUploadAndPreview(e, 'khotian-preview-area', 1, 'khotian'));
        document.getElementById('sketch-image')?.addEventListener('change', (e) => handleImageUploadAndPreview(e, 'sketch-preview-area', 1, 'sketch'));
    } 

    // লিখিত এড্রেস ফিল্ড জেনারেটর (ফিক্সড)
    function renderTextInputs(areaType, stagedData = null) {
        const container = document.getElementById('sub-address-fields');
        let inputHTML = '';
        
        if (areaType === 'উপজেলা') {
            inputHTML += `
                <div class="input-inline-group">
                    <div class="input-group">
                        <label for="union-input">ইউনিয়ন (লিখিত):</label>
                        <input type="text" id="union-input" placeholder="যেমন: ১ নং আটরা গিলাতলা" required value="${stagedData?.location?.union || ''}">
                    </div>
                    <div class="input-group">
                        <label for="ward-input">ওয়ার্ড নম্বর (লিখিত):</label>
                        <input type="text" id="ward-input" placeholder="যেমন: ৫ নং ওয়ার্ড" required value="${stagedData?.location?.wardNo || ''}">
                    </div>
                </div>
            `;
        } else {
            inputHTML += `
                <div class="form-group">
                    <label for="ward-input">ওয়ার্ড নম্বর (লিখিত):</label>
                    <input type="text" id="ward-input" placeholder="যেমন: ২৪ নং ওয়ার্ড" required value="${stagedData?.location?.wardNo || ''}">
                </div>
            `;
        }

        inputHTML += `
            <div class="input-inline-group">
                <div class="input-group">
                    <label for="village-input">গ্রাম / মহল্লা (লিখিত):</label>
                    <input type="text" id="village-input" placeholder="যেমন: বসুপাড়া / গ্রাম লিখুন" required value="${stagedData?.location?.village || ''}">
                </div>
                <div class="input-group">
                    <label for="road-input">রাস্তা / রোড / বাড়ি নং (লিখিত):</label>
                    <input type="text" id="road-input" placeholder="যেমন: রোড নং ৪, বাড়ি নং ১০" required value="${stagedData?.location?.road || ''}">
                </div>
            </div>
        `;

        container.innerHTML = inputHTML;
    }

    function renderExistingPreview(previewArea, fileId, url, docType) {
        const placeholder = previewArea.querySelector('.placeholder-text');
        if (placeholder) placeholder.remove();
        
        const wrapper = document.createElement('div');
        wrapper.className = 'image-preview-wrapper';
        wrapper.id = `box-${fileId}`;

        const img = document.createElement('img');
        img.className = 'preview-image';
        img.src = url;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-image-btn';
        removeBtn.innerHTML = '&times;';
        removeBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            let currentMeta = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
            if (docType === 'main') {
                currentMeta.images = (currentMeta.images || []).filter(m => m.id !== fileId);
            } else {
                delete currentMeta[docType];
            }
            sessionStorage.setItem('stagedImageMetadata', JSON.stringify(currentMeta));
            wrapper.remove();
        };

        wrapper.appendChild(img);
        wrapper.appendChild(removeBtn);
        previewArea.appendChild(wrapper);
    }

    async function handleImageUploadAndPreview(event, previewAreaId, maxFiles, docType = 'main') {
        const previewArea = document.getElementById(previewAreaId);
        const files = event.target.files;
        if (files.length === 0) return;

        let stagedMetadata = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
        let imagesToStore = stagedMetadata.images || [];

        if (docType === 'main' && (imagesToStore.length + files.length) > maxFiles) {
            alert(`আপনি প্রপার্টির জন্য সর্বোচ্চ ${maxFiles}টি ছবি আপলোড করতে পারবেন।`);
            event.target.value = '';
            return;
        }

        if (maxFiles === 1) {
            previewArea.innerHTML = '';
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'ছবি সাইজ অপ্টিমাইজ ও আপলোড হচ্ছে...';

        const user = auth.currentUser;
        const userId = user ? user.uid : 'anonymous';

        const uploadPromises = Array.from(files).map(async (file, i) => {
            const uniqueFileId = Date.now() + '_' + i;
            const localImgUrl = URL.createObjectURL(file);
            
            const wrapper = document.createElement('div');
            wrapper.className = 'image-preview-wrapper uploading'; 
            wrapper.id = `box-${uniqueFileId}`;
            wrapper.innerHTML = `
                <img class="preview-image" src="${localImgUrl}">
                <div class="upload-progress-overlay" id="progress-${uniqueFileId}">
                    <div class="circular-spinner"></div>
                    <span class="pct-text">0%</span>
                </div>
            `;
            previewArea.appendChild(wrapper);

            try {
                const compressedFile = await compressImage(file);
                
                const uploadResult = await uploadStagedImage(compressedFile, i, userId, docType, (percent) => {
                    const progressOverlay = document.getElementById(`progress-${uniqueFileId}`);
                    if (progressOverlay) {
                        progressOverlay.querySelector('.pct-text').textContent = `${percent}%`;
                    }
                });

                wrapper.classList.remove('uploading');
                const overlay = document.getElementById(`progress-${uniqueFileId}`);
                if (overlay) overlay.remove();

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-image-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    let currentMeta = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
                    if (docType === 'main') {
                        currentMeta.images = (currentMeta.images || []).filter(m => m.id !== uniqueFileId);
                    } else {
                        delete currentMeta[docType];
                    }
                    sessionStorage.setItem('stagedImageMetadata', JSON.stringify(currentMeta));
                    wrapper.remove();
                };
                wrapper.appendChild(removeBtn);

                uploadResult.id = uniqueFileId;
                return { success: true, result: uploadResult, fileId: uniqueFileId };

            } catch (error) {
                console.error("ফাইল প্রোসেস বা আপলোডে সমস্যা:", error);
                wrapper.remove(); 
                return { success: false, fileName: file.name };
            }
        });

        const uploadedResults = await Promise.all(uploadPromises);

        uploadedResults.forEach(res => {
            if (res.success) {
                if (docType === 'main') {
                    imagesToStore.push(res.result);
                } else {
                    stagedMetadata[docType] = res.result;
                }
            } else {
                alert(`ফাইল আপলোড ব্যর্থ হয়েছে: ${res.fileName}`);
            }
        });

        if (docType === 'main') {
            stagedMetadata.images = imagesToStore;
        }

        sessionStorage.setItem('stagedImageMetadata', JSON.stringify(stagedMetadata));
        event.target.value = ''; 
        submitBtn.disabled = false;
        submitBtn.textContent = 'প্রিভিউ দেখুন ও পোস্ট করুন';
    }

    if (postCategorySelect) {
        postCategorySelect.addEventListener('change', (e) => {
            if (e.target.value) generateTypeDropdown(e.target.value);
            else dynamicFieldsContainer.innerHTML = '';
        });
    }

    propertyForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const stagedMetadata = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
        
        if (!stagedMetadata.images || stagedMetadata.images.length === 0) {
            alert("অনুগ্রহ করে কমপক্ষে একটি ছবি আপলোড করুন।");
            return;
        }

        const getValue = (id) => document.getElementById(id)?.value || '';
        const category = getValue('post-category');
        const type = getValue('post-type');

        if (category === 'বিক্রয়') {
            if (!stagedMetadata.khotian || !stagedMetadata.sketch) {
                alert("বিক্রয়ের জন্য খতিয়ান এবং স্কেস/হস্ত নকশার ছবি আপলোড করা বাধ্যতামূলক।");
                return;
            }
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'ডেটা প্রক্রিয়াকরণ হচ্ছে...';

        try {
            const user = auth.currentUser;
            if (!user) {
                alert("পোস্ট করার আগে লগইন করুন!");
                submitBtn.disabled = false;
                submitBtn.textContent = 'প্রিভিউ দেখুন ও পোস্ট করুন';
                return;
            }

            const areaTypeVal = document.getElementById('area-type-select')?.value || '';

            const propertyData = {
                category,
                type,
                title: getValue('property-title'),
                description: getValue('description'),
                phoneNumber: getValue('primary-phone'), 
                secondaryPhone: getValue('secondary-phone'),
                userId: user.uid,
                status: 'pending',
                listerType: getValue('lister-type'),
                isEditMode: isEditMode,   // ফিক্সড: অবজেক্টের অংশ করা হলো
                editPostId: editPostId,   // ফিক্সড: অবজেক্টের অংশ করা হলো
                location: {
                    division: document.getElementById('division-select')?.value || '',
                    district: document.getElementById('district-select')?.value || '',
                    areaType: areaTypeVal,
                    thana: areaTypeVal === 'সিটি কর্পোরেশন' ? document.getElementById('thana-upazila-select')?.value || '' : '',
                    upazila: areaTypeVal === 'উপজেলা' ? document.getElementById('thana-upazila-select')?.value || '' : '',
                    union: areaTypeVal === 'উপজেলা' ? (document.getElementById('union-input')?.value || '') : 'N/A',
                    wardNo: document.getElementById('ward-input')?.value || '',
                    village: document.getElementById('village-input')?.value || '',
                    road: document.getElementById('road-input')?.value || '',
                    lat: parseFloat(document.getElementById('lat').value) || null,
                    lng: parseFloat(document.getElementById('lng').value) || null
                }
            };

            if (type !== 'জমি' && type !== 'প্লট') {
                propertyData.facing = getValue('facing');
                const checkboxes = document.querySelectorAll('input[name="utility"]:checked');
                const utilities = [];
                checkboxes.forEach((cb) => utilities.push(cb.value));
                propertyData.utilities = utilities;
            }

            if (type === 'জমি' || type === 'প্লট') {
                propertyData.landArea = getValue('land-area');
                propertyData.landAreaUnit = getValue('land-area-unit');
                propertyData.roadWidth = getValue('road-width');
                propertyData.landType = getValue('land-type');
                if (type === 'প্লট') propertyData.plotNo = getValue('plot-no');
            } else {
                if (type === 'বাড়ি' || type === 'ফ্লাট') {
                    propertyData.propertyAge = getValue('property-age');
                    propertyData.roadWidth = getValue('road-width');
                    propertyData.dining = getValue('dining');
                    propertyData.balcony = getValue('balcony');
                }
                if (type === 'বাড়ি') propertyData.floors = getValue('floors');
                if (type === 'ফ্লাট' || type === 'অফিস') propertyData.floorNo = getValue('floor-no');
                if (type !== 'দোকান') {
                    propertyData.rooms = getValue('rooms');
                    propertyData.bathrooms = getValue('bathrooms');
                    if (type === 'বাড়ি' || type === 'ফ্লাট') propertyData.kitchen = getValue('kitchen');
                } else {
                    propertyData.shopCount = getValue('shop-count');
                }
            }

            if (type === 'বাড়ি') {
                propertyData.houseArea = getValue('house-area');
                propertyData.houseAreaUnit = getValue('house-area-unit');
            } else if (type === 'ফ্লাট') {
                propertyData.areaSqft = getValue('flat-area-sqft');
                propertyData.areaSqftUnit = getValue('area-sqft-unit');
            } else if (type === 'দোকান' || type === 'অফিস') {
                propertyData.commercialArea = getValue('commercial-area');
                propertyData.commercialAreaUnit = getValue('commercial-area-unit');
            }

            if (category === 'বিক্রয়') {
                propertyData.owner = {
                    donorName: getValue('donor-name'),
                    khotianNoType: getValue('khotian-no-type-select'),
                    khotianNo: getValue('khotian-no-input'),
                    dagNoType: getValue('dag-no-type-select'),
                    dagNo: getValue('dag-no-input'),
                    mouja: getValue('mouja-owner')
                };
                propertyData.price = getValue('price');
                propertyData.priceUnit = getValue('price-unit');
            } 
            else if (category === 'ভাড়া') {
                propertyData.monthlyRent = getValue('monthly-rent');
                propertyData.priceUnit = getValue('price-unit');
                propertyData.advance = getValue('advance');
                if (type === 'বাড়ি' || type === 'ফ্লাট') {
                    propertyData.rentType = getValue('rent-type');
                }
                propertyData.moveInDate = getValue('move-in-date');
            }

            sessionStorage.setItem('stagedPropertyData', JSON.stringify(propertyData));
            window.location.href = 'preview.html';

        } catch (error) {
            console.error("ফর্ম সাবমিশনে ট্রাবল:", error);
            submitBtn.disabled = false;
            submitBtn.textContent = 'প্রিভিউ দেখুন ও পোস্ট করুন';
        }
    });

    
    if (typeof auth !== 'undefined' && auth.onAuthStateChanged) {

        // ইউআরএল (URL) থেকে এডিট আইডি চেক করা
const urlParams = new URLSearchParams(window.location.search);
editPostId = urlParams.get('edit');

if (editPostId) {
    isEditMode = true;
    
    const pageTitle = document.getElementById('page-title') || document.querySelector('.post-form-container h2'); // ফিক্সড: আপনার HTML এ ক্লাস '.post-form-container h2'[cite: 11]
    const localSubmitBtn = document.getElementById('submit-btn') || document.querySelector('.submit-button'); // ফিক্সড: আপনার HTML এ ক্লাস '.submit-button'[cite: 11]
    
    if (pageTitle) pageTitle.textContent = 'পোস্ট সংশোধন করুন';
    if (localSubmitBtn) localSubmitBtn.textContent = 'সংশোধন ও প্রিভিউ দেখুন';

    // ফায়ারস্টোর থেকে ওই নির্দিষ্ট পোস্টের ডেটা আনা
    firebase.firestore().collection('posts').doc(editPostId).get()
        .then((doc) => {
            if (doc.exists) {
                const postData = doc.data();
                console.log("সংশোধনের জন্য ডেটা লোড হয়েছে:", postData);

                // ম্যাজিক ট্রিক: ফায়ারস্টোরের ডেটা সরাসরি সেশন স্টোরেজে স্টেজড ডেটা হিসেবে সেভ করা
                sessionStorage.setItem('stagedPropertyData', JSON.stringify(postData));
                
                // যদি পোস্টে আগে থেকে ইমেজ থাকে, সেগুলোর মেটাডেটাও সেশনে পুশ করে রাখা (ঐচ্ছিক কিন্তু নিরাপদ)
                if (postData.images || postData.owner) {
                    const existingMeta = {
                        images: postData.images || [],
                        khotian: postData.khotian || null,
                        sketch: postData.sketch || null
                    };
                    sessionStorage.setItem('stagedImageMetadata', JSON.stringify(existingMeta));
                }

                // এবার স্টেজড ডেটা লোড করার মেইন ফাংশনটি কল করুন, যা অটোমেটিক সব ডাইনামিক ফিল্ড তৈরি করে ভ্যালু বসিয়ে দেবে
                loadStagedData();

            } else {
                alert("দুঃখিত! এই পোস্টটি খুঁজে পাওয়া যায়নি।");
            }
        })
        .catch((error) => {
            console.error("ডেটা লোড করতে সমস্যা হয়েছে:", error);
        });
                        }

        
        auth.onAuthStateChanged(user => {
            const authWarningMessage = document.getElementById('auth-warning-message');
            const propertyFormDisplay = document.getElementById('property-form');
            const primaryPhoneInput = document.getElementById('primary-phone');
            const headerProfileImg = document.querySelector('#profileImageWrapper img');

            if (user) {
                if (propertyFormDisplay) propertyFormDisplay.style.display = 'block';
                if (authWarningMessage) authWarningMessage.style.display = 'none';

                db.collection('users').doc(user.uid).get().then(doc => {
                    const userData = doc.data();
                    if (primaryPhoneInput && userData?.phoneNumber) {
                        primaryPhoneInput.value = userData.phoneNumber;
                        primaryPhoneInput.disabled = true; 
                    }
                    if (headerProfileImg && userData) {
                        headerProfileImg.src = userData.profilePic || user.photoURL || 'assets/images/default-avatar.png';
                    }
                    loadStagedData();
                }).catch(() => loadStagedData());
            } else {
                if (propertyFormDisplay) propertyFormDisplay.style.display = 'none';
                if (authWarningMessage) authWarningMessage.style.display = 'block';
                if (headerProfileImg) headerProfileImg.src = 'assets/images/default-avatar.png';
            }
        });
    }

    if (notificationButton) {
        notificationButton.addEventListener('click', () => {
             window.location.href = 'notifications.html'; 
        });
    }
    
    if (messageButton) {
        messageButton.addEventListener('click', () => {
             window.location.href = 'messages.html';
        });
    }
    
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }

    // ... আপনার আগের বিদ্যমান কোড (DOMContentLoaded এর শেষ দিক)
    if (profileImageWrapper) {
        profileImageWrapper.addEventListener('click', () => {
             window.location.href = 'profile.html'; 
        });
    }

   // ==========================================================
// 🎯 প্রপার্টি ছবি, খতিয়ান ও স্কেচ লোড হওয়ার ১০০% চূড়ান্ত ফিক্সড কোড:
// ==========================================================
const urlParams = new URLSearchParams(window.location.search);
editPostId = urlParams.get('edit');

if (editPostId) {
    isEditMode = true;
    
    const pageTitle = document.getElementById('page-title') || document.querySelector('.post-form-container h2');
    const localSubmitBtn = document.getElementById('submit-btn') || document.querySelector('.submit-button');
    
    if (pageTitle) pageTitle.textContent = 'পোস্ট সংশোধন করুন';
    if (localSubmitBtn) localSubmitBtn.textContent = 'সংশোধন ও প্রিভিউ দেখুন';

    db.collection('properties').doc(editPostId).get()
        .then((doc) => {
            if (doc.exists) {
                const postData = doc.data();
                console.log("সংশোধনের জন্য ডেটা লোড হয়েছে:", postData);

                // ১. মূল ডেটা সেশন স্টোরেজে ব্যাকআপ রাখা (প্রিভিউ পেজের জন্য)
                sessionStorage.setItem('stagedPropertyData', JSON.stringify(postData));

                // ২. ক্যাটাগরি ও টাইপ ড্রপডাউন সিলেক্ট করা এবং ইভেন্ট ফায়ার করা
                const catEl = document.getElementById('post-category');
                if (catEl && postData.category) {
                    catEl.value = postData.category;
                    catEl.dispatchEvent(new Event('change', { bubbles: true }));
                }

                setTimeout(() => {
                    const typeEl = document.getElementById('post-type'); // ফিক্সড: আপনার আইডি 'post-type'
                    if (typeEl && postData.type) {
                        typeEl.value = postData.type;
                        typeEl.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                }, 100);

                // ৩. টেক্সট ইনপুট ফিল্ডগুলোতে ভ্যালু বসানো (একটু পর্যাপ্ত সময় দিয়ে যাতে DOM তৈরি হয়)
                setTimeout(() => {
                    if (document.getElementById('property-title')) document.getElementById('property-title').value = postData.title || '';
                    if (document.getElementById('description')) document.getElementById('description').value = postData.description || '';
                    if (document.getElementById('price')) document.getElementById('price').value = postData.price || '';
                    if (document.getElementById('donor-name')) document.getElementById('donor-name').value = postData.owner?.donorName || '';
                    if (document.getElementById('khotian-no-type-select')) document.getElementById('khotian-no-type-select').value = postData.owner?.khotianNoType || '';
                    if (document.getElementById('khotian-no-input')) document.getElementById('khotian-no-input').value = postData.owner?.khotianNo || '';
                    if (document.getElementById('dag-no-input')) document.getElementById('dag-no-input').value = postData.owner?.dagNo || '';
                    if (document.getElementById('mouja-owner')) document.getElementById('mouja-owner').value = postData.owner?.mouja || '';
                    if (document.getElementById('road-width')) document.getElementById('road-width').value = postData.roadWidth || '';
                    if (document.getElementById('land-area')) document.getElementById('land-area').value = postData.landArea || '';
                    if (document.getElementById('land-area-unit')) document.getElementById('land-area-unit').value = postData.landAreaUnit || '';
                    if (document.getElementById('price-unit')) document.getElementById('price-unit').value = postData.priceUnit || '';

                    // ====================================================
                    // 🖼️ 🌟 ছবি, খতিয়ান ও স্কেচ রেন্ডারিং (সঠিক HTML আইডি সহ):
                    // ====================================================
                    
                    // (ক) মূল প্রপার্টির ছবি ফিক্স:
const previewContainer = document.getElementById('image-preview-area'); // ফিক্সড আইডি
if (previewContainer && postData.images && postData.images.length > 0) {
    previewContainer.innerHTML = '';
    
    postData.images.forEach((imgItem, index) => {
        // ফিক্স: যদি imgItem সরাসরি স্ট্রিং হয় তবে তাই ব্যবহার করবে, আর অবজেক্ট হলে .url প্রপার্টি নিবে
        const imgUrl = (typeof imgItem === 'string') ? imgItem : (imgItem && imgItem.url ? imgItem.url : '');
        
        if (!imgUrl) return; // ইউআরএল না থাকলে স্কিপ করবে

        const fileId = `existing_main_${index}`;
        const card = document.createElement('div');
        card.className = 'image-preview-wrapper';
        card.id = `box-${fileId}`;
        card.innerHTML = `
            <img src="${imgUrl}" class="preview-image" alt="Property Image">
            <button class="remove-image-btn">&times;</button>
        `;
        
        card.querySelector('.remove-image-btn').addEventListener('click', (e) => {
            e.preventDefault();
            card.remove();
            let currentMeta = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
            currentMeta.images = (currentMeta.images || []).filter(m => m.url !== imgUrl);
            sessionStorage.setItem('stagedImageMetadata', JSON.stringify(currentMeta));
        });
        previewContainer.appendChild(card);
    });
}

                    // (খ) খতিয়ান ছবি ফিক্স:
                    const khotianContainer = document.getElementById('khotian-preview-area'); // ফিক্সড আইডি
                    if (khotianContainer && postData.owner?.khotianPic || postData.khotian) {
                        const khotianUrl = postData.owner?.khotianPic || postData.khotian;
                        khotianContainer.innerHTML = `
                            <div class="image-preview-wrapper" id="box-existing_khotian">
                                <img src="${khotianUrl}" class="preview-image">
                                <button class="remove-image-btn">&times;</button>
                            </div>
                        `;
                        khotianContainer.querySelector('.remove-image-btn').addEventListener('click', (e) => {
                            e.preventDefault();
                            khotianContainer.innerHTML = '';
                            let currentMeta = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
                            delete currentMeta.khotian;
                            sessionStorage.setItem('stagedImageMetadata', JSON.stringify(currentMeta));
                        });
                    }

                    // (গ) স্কেচ ছবি ফিক্স:
                    const sketchContainer = document.getElementById('sketch-preview-area'); // ফিক্সড আইডি
                    if (sketchContainer && postData.owner?.sketchPic || postData.sketch) {
                        const sketchUrl = postData.owner?.sketchPic || postData.sketch;
                        sketchContainer.innerHTML = `
                            <div class="image-preview-wrapper" id="box-existing_sketch">
                                <img src="${sketchUrl}" class="preview-image">
                                <button class="remove-image-btn">&times;</button>
                            </div>
                        `;
                        sketchContainer.querySelector('.remove-image-btn').addEventListener('click', (e) => {
                            e.preventDefault();
                            sketchContainer.innerHTML = '';
                            let currentMeta = JSON.parse(sessionStorage.getItem('stagedImageMetadata') || '{}');
                            delete currentMeta.sketch;
                            sessionStorage.setItem('stagedImageMetadata', JSON.stringify(currentMeta));
                        });
                    }

                    // (ঘ) ইমেজ মেটাডেটা সেশন সিঙ্ক
const formattedImages = (postData.images || []).map((imgItem, idx) => {
    const imgUrl = (typeof imgItem === 'string') ? imgItem : (imgItem && imgItem.url ? imgItem.url : '');
    return {
        id: `existing_main_${idx}`,
        fileName: `image_${idx}.jpg`,
        fileMimeType: "image/jpeg",
        url: imgUrl
    };
}).filter(item => item.url !== ''); // খালি ইউআরএল বাদ দেওয়ার জন্য
                    
                    const khotianUrlFinal = postData.owner?.khotianPic || postData.khotian || null;
                    const sketchUrlFinal = postData.owner?.sketchPic || postData.sketch || null;

                    sessionStorage.setItem('stagedImageMetadata', JSON.stringify({
                        images: formattedImages,
                        khotian: khotianUrlFinal ? { id: 'existing_khotian', url: khotianUrlFinal } : null,
                        sketch: sketchUrlFinal ? { id: 'existing_sketch', url: sketchUrlFinal } : null
                    }));

                }, 500); // ফিল্ড জেনারেশনের জন্য ৫০০ms সময় দেওয়া হলো

            } else {
                alert("দুঃখিত! এই পোস্টটি খুঁজে পাওয়া যায়নি।");
            }
        })
        .catch((error) => {
            console.error("ফায়ারস্টোর থেকে ডেটা লোড করতে সমস্যা হয়েছে:", error);
        });
                                              }
    
});
