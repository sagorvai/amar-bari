const db = firebase.firestore();
const auth = firebase.auth();

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const propId = urlParams.get('id');

    // হেডার ও সাইডবার লজিক (অরিজিনাল)
    const setupNav = () => {
        const menuBtn = document.getElementById('menuButton');
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        menuBtn?.addEventListener('click', () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); });
        overlay?.addEventListener('click', () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); });
    };
    setupNav();

    if (!propId) { window.location.href = 'index.html'; return; }

    try {
        const doc = await db.collection('properties').doc(propId).get();
        if (!doc.exists) { alert("পোস্টটি খুঁজে পাওয়া যায়নি!"); return; }

        const data = doc.data();

        // ১. ছবি লোড করা (৫টি ছবিই আসবে)
        const mainView = document.getElementById('main-view');
        const thumbBox = document.getElementById('image-thumbnails');
        
        if (data.images && data.images.length > 0) {
            mainView.src = data.images[0].url;
            data.images.forEach((imgObj, index) => {
                const img = document.createElement('img');
                img.src = imgObj.url;
                img.style = "width:65px; height:50px; object-fit:cover; border-radius:5px; cursor:pointer; border:1px solid #ddd;";
                img.onclick = () => { mainView.src = imgObj.url; };
                thumbBox.appendChild(img);
            });
        }

        // ২. সাধারণ তথ্য
        document.getElementById('d-title').innerText = data.title;
        document.getElementById('d-price').innerText = "৳ " + data.price;
        document.getElementById('d-location').innerText = data.location;
        document.getElementById('d-desc').innerText = data.description;
        document.getElementById('call-link').href = `tel:${data.ownerPhone}`;

        // ৩. ডাইনামিক ফিল্ডস (যা যা গ্রাহক ইনপুট দিয়েছে)
        const specsGrid = document.getElementById('specs-grid');
        const labelMap = {
            'category': 'ক্যাটাগরি',
            'propertyType': 'ধরণ',
            'size': 'আয়তন',
            'sizeUnit': 'ইউনিট',
            'bed': 'বেডরুম',
            'bath': 'বাথরুম',
            'floorLevel': 'তলার অবস্থান',
            'roadSize': 'রাস্তার আকার',
            'propertyFacing': 'প্রপার্টির দিক',
            'completionStatus': 'বর্তমান অবস্থা',
            'ownerName': 'বিজ্ঞাপনদাতা'
        };

        Object.keys(data).forEach(key => {
            if (labelMap[key] && data[key]) {
                const item = document.createElement('div');
                item.innerHTML = `<span style="color:#7f8c8d; display:block; font-size:12px;">${labelMap[key]}</span>
                                  <span style="font-weight:bold; color:#34495e;">${data[key]}</span>`;
                specsGrid.appendChild(item);
            }
        });

        document.getElementById('loading').style.display = 'none';
        document.getElementById('details-view').style.display = 'block';

        // প্রোফাইল ছবি লোড করা
        auth.onAuthStateChanged(user => {
            if (user) {
                db.collection('users').doc(user.uid).get().then(uDoc => {
                    if (uDoc.exists && uDoc.data().profilePicture) {
                        const pImg = document.getElementById('profileImage');
                        pImg.src = uDoc.data().profilePicture;
                        pImg.style.display = 'block';
                        document.getElementById('defaultProfileIcon').style.display = 'none';
                    }
                });
            }
        });

    } catch (e) { console.log(e); }
});
