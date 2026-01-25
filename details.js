// details.js (Smart Dynamic Version)

const urlParams = new URLSearchParams(window.location.search);
const propertyId = urlParams.get('id');

if (!propertyId) {
    alert("প্রপার্টি আইডি পাওয়া যায়নি!");
    window.location.href = 'index.html';
}

const db = firebase.firestore();

const container = document.getElementById('detailsContainer');

function createCard(title, value) {
    return `
        <div class="detail-card">
            <h4>${title}</h4>
            <p>${value}</p>
        </div>
    `;
}

function createTable(title, obj) {
    let rows = '';
    for (let key in obj) {
        rows += `
            <tr>
                <td>${key}</td>
                <td>${obj[key]}</td>
            </tr>
        `;
    }

    return `
        <div class="detail-table">
            <h4>${title}</h4>
            <table>
                ${rows}
            </table>
        </div>
    `;
}

function renderImages(images) {
    if (!images || images.length === 0) return '';

    const imgs = images.map(img => `
        <img src="${img}" alt="property image" />
    `).join('');

    return `
        <div class="image-gallery">
            ${imgs}
        </div>
    `;
}

async function loadFullDetails() {
    try {
        const doc = await db.collection('properties').doc(propertyId).get();

        if (!doc.exists) {
            document.body.innerHTML = "<h2>বিজ্ঞাপনটি খুঁজে পাওয়া যায়নি</h2>";
            return;
        }

        const data = doc.data();
        let html = '';

        // 🔥 Images first
        if (data.images) {
            html += renderImages(data.images);
        }

        // 🔁 Dynamic field render
        for (let key in data) {
            if (key === 'images') continue;

            const value = data[key];

            if (typeof value === 'string' || typeof value === 'number') {
                html += createCard(key, value);
            }
            else if (typeof value === 'boolean') {
                html += createCard(key, value ? 'হ্যাঁ' : 'না');
            }
            else if (Array.isArray(value)) {
                html += createCard(key, value.join(', '));
            }
            else if (typeof value === 'object') {
                // map link detect
                if (value.lat && value.lng) {
                    html += `
                        <div class="detail-card">
                            <h4>লোকেশন</h4>
                            <iframe 
                                src="https://www.google.com/maps?q=${value.lat},${value.lng}&output=embed"
                                width="100%" height="250" style="border:0;" loading="lazy">
                            </iframe>
                        </div>
                    `;
                } else {
                    html += createTable(key, value);
                }
            }
        }

        container.innerHTML = html;

    } catch (err) {
        console.error(err);
        container.innerHTML = "<h3>ডেটা লোড করতে সমস্যা হয়েছে</h3>";
    }
}

loadFullDetails();
