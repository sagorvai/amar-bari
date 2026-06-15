const firebaseConfig = {
    apiKey: "AIzaSyBrGpbFoGmPhWv5i6Nzc4s1duDn7-uE4zA",
    authDomain: "amar-bari-website.firebaseapp.com",
    projectId: "amar-bari-website",
    storageBucket: "amar-bari-website.firebasestorage.app",
    messagingSenderId: "719084789035",
    appId: "1:719084789035:web:f4da765290b3519d0e82fe"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const sUrlParams = new URLSearchParams(window.location.search);
const targetUserId = sUrlParams.get('userId');

document.addEventListener('DOMContentLoaded', () => {
    if (!targetUserId) {
        alert("ভুল ব্যবহারকারী আইডি!");
        window.history.back();
        return;
    }
    loadSellerProfileData();
    loadSellerProperties();
    setupInteractiveProfileRating();
});

// ১. বিক্রেতার ডাটা ফায়ারবেস থেকে পড়া এবং স্ক্রিনে রিডাইরেক্ট করা
function loadSellerProfileData() {
    db.collection('users').doc(targetUserId).get().then(doc => {
        if (doc.exists) {
            const uData = doc.data();
            
            // নাম সেটআপ
            document.getElementById('s-name').textContent = uData.fullName || uData.name || "সম্মানিত বিক্রেতা";
            
            // বায়ো ও ডেসক্রিপশন
            document.getElementById('s-bio').textContent = uData.bio || "এই ব্যবহারকারী এখনও কোনো বায়ো লেখেননি।";
            
            // কন্টাক্ট ইনফো ও পরিচিতি
            document.getElementById('s-profession').textContent = uData.profession || "যুক্ত করা নেই";
            document.getElementById('s-location').textContent = uData.location || "যুক্ত করা নেই";
            document.getElementById('s-phone').textContent = uData.phoneNumber || "গোপন রাখা হয়েছে";
            document.getElementById('s-email').textContent = uData.email || "...";
            
            // অফিস ফিল্ড চেক
            if(uData.office) {
                document.getElementById('s-office').textContent = uData.office;
                document.getElementById('s-office-item').style.display = 'flex';
            }

            // প্রোফাইল ফটো পরিবর্তন
            if(uData.profilePic) {
                document.getElementById('s-avatar').src = uData.profilePic;
            }

            // চ্যাট বাটনের ডাইরেক্ট লিংক তৈরি (UserId প্যারামিটার পাস করে)
            document.getElementById('s-chat-direct-btn').href = `messages.html?chatWith=${targetUserId}`;
            
        } else {
            console.log("No such user found!");
        }
    }).catch(err => console.error("Error fetching user data:", err));
}

// ২. বিক্রেতার সব প্রপার্টি লিস্টিং ফিল্টার করে আনা
function loadSellerProperties() {
    const listGrid = document.getElementById('seller-properties-list');
    const emptyMsg = document.getElementById('s-empty-message');
    const totalPostsLabel = document.getElementById('s-total-posts');

    db.collection('properties')
      .where('uid', '==', targetUserId)
      .get()
      .then(snapshot => {
          totalPostsLabel.textContent = snapshot.size;
          
          if(snapshot.empty) {
              emptyMsg.style.display = 'block';
              return;
          }

          emptyMsg.style.display = 'none';
          listGrid.innerHTML = "";

          snapshot.forEach(doc => {
              const p = doc.data();
              const pId = doc.id;
              
              const itemCard = document.createElement('div');
              itemCard.className = "property-card";
              itemCard.style.cursor = "pointer";
              itemCard.onclick = () => {
                  window.location.href = `property-details.html?id=${pId}`;
              };

              const imgUrl = (p.images && p.images.length > 0) ? p.images[0] : 'https://via.placeholder.com/150';

              itemCard.innerHTML = `
                  <img src="${imgUrl}" style="width:100%; height:110px; object-fit:cover;">
                  <div style="padding:8px;">
                      <h4 style="margin:0 0 4px 0; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.title || 'শিরোনামহীন'}</h4>
                      <p style="margin:0; font-size:12px; color:var(--primary); font-weight:bold;">৳ ${p.price || 'আলোচনা সাপেক্ষ'}</p>
                      <p style="margin:4px 0 0 0; font-size:10px; color:var(--gray);"><i class="material-icons" style="font-size:10px; vertical-align:middle;">location_on</i> ${p.city || ''}</p>
                  </div>
              `;
              listGrid.appendChild(itemCard);
          });
      })
      .catch(err => console.error("Error loading properties:", err));
}

// ৩. রিয়েলটাইম প্রোফাইল রেটিং এবং ভোট গণনার লজিক
function setupInteractiveProfileRating() {
    const stars = document.querySelectorAll('#interactiveStarsRow i');
    
    // ডাটাবেজ থেকে রেটিং স্ট্যাটাস লাইভ ট্র্যাক করা
    db.collection('users').doc(targetUserId).collection('ratings').onSnapshot(snapshot => {
        let count = snapshot.size;
        let sum = 0;
        
        snapshot.forEach(doc => {
            sum += doc.data().rating || 0;
        });

        displayCalculatedRating(count, sum);
        
        // কারেন্ট লগইন করা ইউজার আগে ভোট দিয়েছে কিনা চেক
        firebase.auth().onAuthStateChanged(user => {
            if(user) {
                const myVoteDoc = snapshot.docs.find(d => d.id === user.uid);
                if(myVoteDoc) {
                    highlightStars(myVoteDoc.data().rating);
                }
            }
        });
    });

    // স্টার ক্লিকে ভোট ফায়ারবেসে সেভ করা
    stars.forEach(star => {
        star.addEventListener('click', () => {
            const user = firebase.auth().currentUser;
            if(!user) {
                alert("রেটিং দিতে প্রথমে লগইন করুন!");
                return;
            }
            if(user.uid === targetUserId) {
                alert("আপনি নিজেকে রেটিং দিতে পারবেন না!");
                return;
            }

            const activeRatingValue = parseInt(star.getAttribute('data-value'));
            
            db.collection('users').doc(targetUserId).collection('ratings').doc(user.uid).set({
                rating: activeRatingValue,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            }).then(() => {
                alert("আপনার রেটিং সফলভাবে জমা হয়েছে!");
            }).catch(e => console.error("Rating post error:", e));
        });
    });
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('#interactiveStarsRow i');
    stars.forEach(s => {
        const v = parseInt(s.getAttribute('data-value'));
        if(v <= rating) {
            s.textContent = "star";
            s.classList.add('selected');
        } else {
            s.textContent = "star_border";
            s.classList.remove('selected');
        }
    });
}

function displayCalculatedRating(count, sum) {
    const label = document.getElementById('ratingStatsLabel');
    const globalScoreEl = document.getElementById('s-rating-score');
    
    if (count === 0) {
        label.textContent = "গড় রেটিং: ০.০ (০টি ভোট)";
        if(globalScoreEl) globalScoreEl.textContent = "⭐ ০.০";
        return;
    }
    let average = (sum / count).toFixed(1);
    label.textContent = `গড় রেটিং: ⭐ ${average} (${count}টি ভোট)`;
    if(globalScoreEl) globalScoreEl.textContent = `⭐ ${average}`;
}

// 🆕 লগইন করা ইউজারের প্রোফাইল পিকচার হেডারে দেখানোর লজিক
firebase.auth().onAuthStateChanged(async (user) => {
    const headerProfileImg = document.querySelector('#profileImageWrapper img');
    
    if (user && headerProfileImg) {
        try {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists && userDoc.data().profilePic) {
                headerProfileImg.src = userDoc.data().profilePic;
            } else if (user.photoURL) {
                headerProfileImg.src = user.photoURL;
            } else {
                headerProfileImg.src = 'https://www.w3schools.com/howto/img_avatar.png';
            }
        } catch (error) {
            console.error("হেডার প্রোফাইল পিকচার লোড করতে ব্যর্থ:", error);
        }
    }
});
