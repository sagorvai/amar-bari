// script.js - জাভাস্ক্রিপ্ট লজিক

// Firebase সার্ভিস ইনিশিয়ালাইজেশন
let app;
let db;
let auth;
let userId = null; // বর্তমান ব্যবহারকারীর ID, শুরুতে null

// Firebase SDKs লোড হওয়ার পর DOMContentLoaded ইভেন্ট হ্যান্ডেল করা
document.addEventListener('DOMContentLoaded', async () => {
    // নিশ্চিত করুন যে Firebase SDKs HTML এ লোড হয়েছে
    if (typeof window.firebaseApp === 'undefined') {
        console.error("Firebase SDKs are not loaded. Please check your HTML script imports.");
        return;
    }

    // Firebase কনফিগারেশন এবং অ্যাপ আইডি Canvas পরিবেশ থেকে
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

    try {
        app = window.firebaseApp(firebaseConfig);
        db = window.firebaseFirestore(app);
        auth = window.firebaseAuth(app);

        // Firebase প্রমাণীকরণ অবস্থা পর্যবেক্ষণ
        window.firebaseOnAuthStateChanged(auth, async (user) => {
            if (user) {
                userId = user.uid;
                console.log("User is authenticated. User ID:", userId);
                updateNavigationUI(true); // লগইন করা ব্যবহারকারীর জন্য UI আপডেট
                document.getElementById('userIdDisplay').textContent = `ইউজার আইডি: ${userId}`;

                // ড্যাশবোর্ড পেজে থাকলে ব্যবহারকারীর সম্পত্তি লোড করুন
                if (window.location.pathname.includes('dashboard.html')) {
                    fetchPropertiesFromFirestore('myPropertiesList', true);
                }
            } else {
                userId = null;
                console.log("User is logged out or not authenticated.");
                updateNavigationUI(false); // লগআউট করা ব্যবহারকারীর জন্য UI আপডেট
                document.getElementById('userIdDisplay').textContent = '';

                // যদি ব্যবহারকারী লগআউট অবস্থায় ড্যাশবোর্ড পেজে থাকে, তাকে লগইন পেজে রিডাইরেক্ট করুন
                if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('add-property.html')) {
                    window.location.href = 'login.html';
                }
            }
        });

        // কাস্টম টোকেন দিয়ে সাইন ইন (Canvas পরিবেশের জন্য)
        if (initialAuthToken) {
            await window.firebaseSignInWithCustomToken(auth, initialAuthToken);
        } else {
            // যদি কোনো টোকেন না থাকে, অ্যানোনিমাসলি সাইন ইন করার চেষ্টা করুন
            // এটি নিশ্চিত করে যে Firestore নিয়মগুলো কাজ করবে
            await window.firebaseSignInAnonymously(auth);
        }

    } catch (error) {
        console.error("Error initializing Firebase or authenticating:", error);
        const mainContent = document.querySelector('main.main-content');
        if (mainContent) {
            mainContent.innerHTML = '<p class="error-message text-center">ওয়েবসাইট লোড হতে পারেনি। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ পরীক্ষা করুন বা পরে আবার চেষ্টা করুন।</p>';
        }
        return;
    }

    // নেভিগেশন UI আপডেট করার ফাংশন
    function updateNavigationUI(isLoggedIn) {
        const loggedInElements = document.querySelectorAll('.logged-in-only');
        const loggedOutElements = document.querySelectorAll('.logged-out-only');

        loggedInElements.forEach(el => el.style.display = isLoggedIn ? 'block' : 'none');
        loggedOutElements.forEach(el => el.style.display = isLoggedIn ? 'none' : 'block');
    }

    // প্রপার্টি কার্ড রেন্ডার করার ফাংশন
    function renderProperties(properties, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (properties.length === 0) {
            container.innerHTML = '<p class="text-center" style="grid-column: 1 / -1; color: #555; font-size: 1.2em;">কোনো সম্পত্তি খুঁজে পাওয়া যায়নি।</p>';
            return;
        }

        properties.forEach(property => {
            const propertyCard = document.createElement('div');
            propertyCard.className = 'property-card';
            propertyCard.innerHTML = `
                <img src="${property.image}" alt="${property.title}" class="property-image">
                <div class="property-info">
                    <h3 class="property-title">${property.title}</h3>
                    <p class="property-location">${property.location}</p>
                    <p class="property-price">${property.price}</p>
                    <a href="property-details.html?id=${property.id}" class="button-primary">বিস্তারিত দেখুন</a>
                </div>
            `;
            container.appendChild(propertyCard);
        });
    }

    // ড্যাশবোর্ডের জন্য সম্পত্তি রেন্ডার করার ফাংশন
    function renderDashboardProperties(properties, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';

        if (properties.length === 0) {
            container.innerHTML = '<p class="text-center" style="grid-column: 1 / -1; color: #555; font-size: 1.2em;">আপনার যোগ করা কোনো সম্পত্তি নেই।</p>';
            return;
        }

        properties.forEach(property => {
            const propertyItem = document.createElement('div');
            propertyItem.className = 'property-item';
            propertyItem.innerHTML = `
                <img src="${property.image}" alt="${property.title}" class="property-list-image">
                <div class="property-list-info">
                    <h3 class="property-list-title">${property.title}</h3>
                    <p class="property-list-location">${property.location}</p>
                    <p class="property-list-price">${property.price}</p>
                </div>
                <div class="property-list-actions">
                    <a href="property-details.html?id=${property.id}" class="button-secondary">বিস্তারিত</a>
                    <button class="button-primary edit-button" data-id="${property.id}">সম্পাদনা করুন</button>
                    <button class="button-danger delete-button" data-id="${property.id}">মুছে ফেলুন</button>
                </div>
            `;
            container.appendChild(propertyItem);
        });

        container.querySelectorAll('.delete-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const propertyIdToDelete = e.target.dataset.id;
                alert(`সম্পত্তি ${propertyIdToDelete} মুছে ফেলার চেষ্টা করা হয়েছে। (লজিক যোগ করা হয়নি)`);
            });
        });

        container.querySelectorAll('.edit-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const propertyIdToEdit = e.target.dataset.id;
                alert(`সম্পত্তি ${propertyIdToEdit} সম্পাদনা করার চেষ্টা করা হয়েছে। (লজিক যোগ করা হয়নি)`);
            });
        });
    }

    // Firestore থেকে সম্পত্তি লোড করার ফাংশন
    async function fetchPropertiesFromFirestore(containerId, isDashboard = false, searchTerm = '') {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '<p class="loading-text text-center">সম্পত্তি লোড হচ্ছে...</p>';

        let propertiesCollectionRef = window.firebaseCollection(db, `artifacts/${appId}/public/data/properties`);
        let q = propertiesCollectionRef;

        if (isDashboard && userId) {
            // ড্যাশবোর্ডের জন্য শুধুমাত্র বর্তমান ব্যবহারকারীর সম্পত্তি ফিল্টার করা
            q = window.firebaseQuery(propertiesCollectionRef, window.firebaseWhere("ownerId", "==", userId));
        }

        // onSnapshot ব্যবহার করে রিয়েল-টাইম আপডেট
        window.firebaseOnSnapshot(q, (snapshot) => {
            const propertiesList = [];
            snapshot.forEach(doc => {
                propertiesList.push({ id: doc.id, ...doc.data() });
            });

            let finalProperties = propertiesList;
            if (searchTerm) {
                const lowerCaseSearchTerm = searchTerm.toLowerCase();
                finalProperties = propertiesList.filter(property =>
                    (property.title && property.title.toLowerCase().includes(lowerCaseSearchTerm)) ||
                    (property.location && property.location.toLowerCase().includes(lowerCaseSearchTerm)) ||
                    (property.description && property.description.toLowerCase().includes(lowerCaseSearchTerm))
                );
            }

            if (isDashboard) {
                renderDashboardProperties(finalProperties, containerId);
            } else {
                renderProperties(finalProperties, containerId);
            }
        }, (error) => {
            console.error("Error fetching properties: ", error);
            container.innerHTML = '<p class="error-message text-center">সম্পত্তি লোড করা যায়নি।</p>';
        });
    }

    // বিস্তারিত সম্পত্তি লোড করার ফাংশন (Firestore থেকে)
    async function loadPropertyDetailsFromFirestore(propertyId) {
        const propertyDetailTitle = document.getElementById('propertyDetailTitle');
        const propertyDetailImage = document.getElementById('propertyDetailImage');
        const propertyDetailLocation = document.getElementById('propertyDetailLocation');
        const propertyDetailPrice = document.getElementById('propertyDetailPrice');
        const propertyDetailBedrooms = document.getElementById('propertyDetailBedrooms');
        const propertyDetailBathrooms = document.getElementById('propertyDetailBathrooms');
        const propertyDetailArea = document.getElementById('propertyDetailArea');
        const propertyDetailDescription = document.getElementById('propertyDetailDescription');

        if (!propertyDetailTitle) return;

        propertyDetailTitle.textContent = 'সম্পত্তির বিস্তারিত লোড হচ্ছে...';

        try {
            const propertyRef = window.firebaseDoc(db, `artifacts/${appId}/public/data/properties`, propertyId);
            const docSnap = await window.firebaseGetDoc(propertyRef);

            if (docSnap.exists()) {
                const property = docSnap.data();
                propertyDetailTitle.textContent = property.title + ' - বিস্তারিত';
                propertyDetailImage.src = property.image || 'https://placehold.co/800x500/A0A0A0/FFFFFF?text=No+Image';
                propertyDetailImage.alt = property.title;
                propertyDetailLocation.textContent = property.location;
                propertyDetailPrice.textContent = property.price;
                propertyDetailBedrooms.textContent = property.bedrooms || 'N/A';
                propertyDetailBathrooms.textContent = property.bathrooms || 'N/A';
                propertyDetailArea.textContent = property.area ? `${property.area} বর্গফুট` : 'N/A';
                propertyDetailDescription.textContent = property.description;
            } else {
                propertyDetailTitle.textContent = 'সম্পত্তি খুঁজে পাওয়া যায়নি!';
                propertyDetailImage.src = 'https://placehold.co/800x500/FF0000/FFFFFF?text=Not+Found';
                propertyDetailImage.alt = 'Property Not Found';
                propertyDetailLocation.textContent = 'N/A';
                propertyDetailPrice.textContent = 'N/A';
                propertyDetailBedrooms.textContent = 'N/A';
                propertyDetailBathrooms.textContent = 'N/A';
                propertyDetailArea.textContent = 'N/A';
                propertyDetailDescription.textContent = 'দুঃখিত, এই সম্পত্তির বিস্তারিত তথ্য পাওয়া যায়নি।';
            }
        } catch (error) {
            console.error("Error loading property details: ", error);
            propertyDetailTitle.textContent = 'সম্পত্তি লোড করার সময় একটি ত্রুটি হয়েছে।';
            propertyDetailImage.src = 'https://placehold.co/800x500/FF0000/FFFFFF?text=Error';
        }
    }


    // লগইন ফর্ম হ্যান্ডলিং
    const loginForm = document.getElementById('loginForm');
    const loginMessageDiv = document.createElement('div');
    if (loginForm) {
        loginForm.parentNode.insertBefore(loginMessageDiv, loginForm.nextSibling);

        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            loginMessageDiv.textContent = '';
            loginMessageDiv.className = '';

            const email = loginForm.email.value.trim();
            const password = loginForm.password.value.trim();

            if (!email || !password) {
                loginMessageDiv.textContent = 'অনুগ্রহ করে ইমেইল এবং পাসওয়ার্ড উভয়ই পূরণ করুন।';
                loginMessageDiv.className = 'error-message';
                return;
            }

            try {
                // Firebase ইমেল/পাসওয়ার্ড দিয়ে লগইন
                await window.firebaseSignInWithEmailAndPassword(auth, email, password);
                loginMessageDiv.textContent = 'লগইন সফল হয়েছে!';
                loginMessageDiv.className = 'success-message';
                setTimeout(() => {
                    window.location.href = 'dashboard.html'; // সফল হলে ড্যাশবোর্ড পেজে রিডাইরেক্ট
                }, 1000);
            } catch (error) {
                let errorMessage = 'লগইন ব্যর্থ হয়েছে।';
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage = 'ভুল ইমেইল বা পাসওয়ার্ড।';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'ইমেইল ফরম্যাট সঠিক নয়।';
                }
                loginMessageDiv.textContent = errorMessage;
                loginMessageDiv.className = 'error-message';
                console.error('Login error:', error);
            }
        });
    }

    // রেজিস্ট্রেশন ফর্ম হ্যান্ডলিং
    const registerForm = document.getElementById('registerForm');
    const registerMessageDiv = document.createElement('div');
    if (registerForm) {
        registerForm.parentNode.insertBefore(registerMessageDiv, registerForm.nextSibling);

        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            registerMessageDiv.textContent = '';
            registerMessageDiv.className = '';

            const name = registerForm.name.value.trim();
            const email = registerForm.email.value.trim();
            const password = registerForm.password.value.trim();
            const confirmPassword = registerForm.confirmPassword.value.trim();

            if (!name || !email || !password || !confirmPassword) {
                registerMessageDiv.textContent = 'অনুগ্রহ করে সকল ঘর পূরণ করুন।';
                registerMessageDiv.className = 'error-message';
                return;
            }

            if (password !== confirmPassword) {
                registerMessageDiv.textContent = 'পাসওয়ার্ড মিলছে না!';
                registerMessageDiv.className = 'error-message';
                return;
            }

            if (password.length < 6) {
                registerMessageDiv.textContent = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।';
                registerMessageDiv.className = 'error-message';
                return;
            }

            try {
                // Firebase ইমেল/পাসওয়ার্ড দিয়ে রেজিস্ট্রেশন
                const userCredential = await window.firebaseCreateUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // ব্যবহারকারীর অতিরিক্ত তথ্য Firestore-এ সংরক্ষণ (ঐচ্ছিক)
                await window.firebaseDoc(db, `artifacts/${appId}/users/${user.uid}/profile`, user.uid).set({
                    email: user.email,
                    name: name,
                    createdAt: window.firebaseFieldValue.serverTimestamp()
                });

                registerMessageDiv.textContent = 'রেজিস্ট্রেশন সফল হয়েছে! এখন লগইন করুন।';
                registerMessageDiv.className = 'success-message';
                registerForm.reset();
                setTimeout(() => {
                    window.location.href = 'login.html'; // সফল হলে লগইন পেজে রিডাইরেক্ট
                }, 1000);

            } catch (error) {
                let errorMessage = 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।';
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage = 'এই ইমেইল দিয়ে ইতিমধ্যেই একটি অ্যাকাউন্ট আছে।';
                } else if (error.code === 'auth/invalid-email') {
                    errorMessage = 'ইমেইল ফরম্যাট সঠিক নয়।';
                } else if (error.code === 'auth/weak-password') {
                    errorMessage = 'পাসওয়ার্ড খুব দুর্বল। আরও শক্তিশালী পাসওয়ার্ড দিন।';
                }
                registerMessageDiv.textContent = errorMessage;
                registerMessageDiv.className = 'error-message';
                console.error('Registration error:', error);
            }
        });
    }

    // লগআউট বাটন হ্যান্ডলিং
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                await window.firebaseSignOut(auth);
                console.log("User logged out.");
                window.location.href = 'index.html'; // লগআউট করে হোমপেজে রিডাইরেক্ট
            } catch (error) {
                console.error("Error logging out:", error);
                alert("লগআউট করার সময় একটি ত্রুটি হয়েছে।");
            }
        });
    }

    // হোমপেজের অনুসন্ধান বাটন হ্যান্ডলিং
    const homeSearchButton = document.getElementById('homeSearchButton');
    const homeSearchInput = document.getElementById('homeSearchInput');
    if (homeSearchButton && homeSearchInput) {
        homeSearchButton.addEventListener('click', () => {
            const searchTerm = homeSearchInput.value.trim();
            if (searchTerm) {
                window.location.href = `properties.html?search=${encodeURIComponent(searchTerm)}`;
            } else {
                window.location.href = 'properties.html';
            }
        });
    }

    // প্রপার্টিজ পেজের অনুসন্ধান বাটন হ্যান্ডলিং এবং ডেটা লোডিং
    const propertySearchButton = document.getElementById('propertySearchButton');
    const propertySearchInput = document.getElementById('propertySearchInput');
    const allPropertyGrid = document.getElementById('allPropertyGrid');

    if (allPropertyGrid) {
        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('search');

        if (searchTerm) {
            propertySearchInput.value = searchTerm;
        }
        // Firestore থেকে ডেটা লোড করা (সকল সম্পত্তি)
        fetchPropertiesFromFirestore('allPropertyGrid', false, searchTerm);

        if (propertySearchButton && propertySearchInput) {
            propertySearchButton.addEventListener('click', () => {
                const newSearchTerm = propertySearchInput.value.trim();
                if (newSearchTerm) {
                    window.location.href = `properties.html?search=${encodeURIComponent(newSearchTerm)}`;
                } else {
                    window.location.href = 'properties.html';
                }
            });
        }
    }

    // হোমপেজে বৈশিষ্ট্যযুক্ত সম্পত্তি লোড করা
    const featuredPropertyGrid = document.getElementById('featuredPropertyGrid');
    if (featuredPropertyGrid) {
        // Firestore থেকে ডেটা লোড করা (সকল সম্পত্তি, ডেমোর জন্য প্রথম ৩টি)
        fetchPropertiesFromFirestore('featuredPropertyGrid', false);
    }

    // প্রপার্টি ডিটেইলস পেজে ডেটা লোডিং
    const propertyDetailTitle = document.getElementById('propertyDetailTitle');
    if (propertyDetailTitle && window.location.pathname.includes('property-details.html')) {
        const urlParams = new URLSearchParams(window.location.search);
        const propertyId = urlParams.get('id');
        if (propertyId) {
            loadPropertyDetailsFromFirestore(propertyId);
        } else {
            propertyDetailTitle.textContent = 'সম্পত্তি আইডি খুঁজে পাওয়া যায়নি!';
        }
    }

    // ড্যাশবোর্ড পেজে সম্পত্তি লোড করা
    const myPropertiesList = document.getElementById('myPropertiesList');
    if (myPropertiesList && window.location.pathname.includes('dashboard.html')) {
        // ড্যাশবোর্ডে ব্যবহারকারীর সম্পত্তি লোড করা হবে onAuthStateChanged এর মাধ্যমে
        // এখানে সরাসরি কল না করে onAuthStateChanged এর লজিকের উপর নির্ভর করা হচ্ছে
        // যাতে userId নিশ্চিত হওয়ার পর লোড হয়।
    }


    // নতুন সম্পত্তি যোগ করার ফর্ম হ্যান্ডলিং (Firestore-এ ডেটা সংরক্ষণ)
    const addPropertyForm = document.getElementById('addPropertyForm');
    const addPropertyMessageDiv = document.createElement('div');
    if (addPropertyForm) {
        addPropertyForm.parentNode.insertBefore(addPropertyMessageDiv, addPropertyForm.nextSibling);

        addPropertyForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            addPropertyMessageDiv.textContent = '';
            addPropertyMessageDiv.className = '';

            if (!userId) {
                addPropertyMessageDiv.textContent = 'সম্পত্তি যোগ করার জন্য আপনাকে লগইন করতে হবে।';
                addPropertyMessageDiv.className = 'error-message';
                return;
            }

            const propertyTitle = addPropertyForm.propertyTitle.value.trim();
            const propertyLocation = addPropertyForm.propertyLocation.value.trim();
            const propertyPrice = addPropertyForm.propertyPrice.value.trim();
            const propertyBedrooms = addPropertyForm.propertyBedrooms.value.trim();
            const propertyBathrooms = addPropertyForm.propertyBathrooms.value.trim();
            const propertyArea = addPropertyForm.propertyArea.value.trim();
            const propertyDescription = document.getElementById('propertyDescription').value.trim(); // LLM থেকে আসা বিবরণ

            if (!propertyTitle || !propertyLocation || !propertyPrice || !propertyDescription) {
                addPropertyMessageDiv.textContent = 'অনুগ্রহ করে প্রয়োজনীয় সকল ঘর পূরণ করুন (শিরোনাম, অবস্থান, মূল্য, বিবরণ)।';
                addPropertyMessageDiv.className = 'error-message';
                return;
            }

            const propertyImage = 'https://placehold.co/400x250/E0E0E0/333333?text=New+Property'; // আপাতত ডামি ছবি

            const newPropertyData = {
                title: propertyTitle,
                location: propertyLocation,
                price: `৳ ${propertyPrice} লক্ষ`,
                bedrooms: propertyBedrooms ? parseInt(propertyBedrooms) : null,
                bathrooms: propertyBathrooms ? parseInt(propertyBathrooms) : null,
                area: propertyArea ? parseInt(propertyArea) : null,
                description: propertyDescription,
                image: propertyImage,
                ownerId: userId, // সম্পত্তি যোগকারী ব্যবহারকারীর ID
                createdAt: window.firebaseFirestore.FieldValue.serverTimestamp() // টাইমস্ট্যাম্প
            };

            try {
                const docRef = await window.firebaseAddDoc(window.firebaseCollection(db, `artifacts/${appId}/public/data/properties`), newPropertyData);
                console.log("Document written with ID: ", docRef.id);

                addPropertyMessageDiv.textContent = 'সম্পত্তি সফলভাবে যোগ করা হয়েছে!';
                addPropertyMessageDiv.className = 'success-message';
                addPropertyForm.reset();
            } catch (e) {
                console.error("Error adding document: ", e);
                addPropertyMessageDiv.textContent = 'সম্পত্তি যোগ করার সময় একটি ত্রুটি হয়েছে।';
                addPropertyMessageDiv.className = 'error-message';
            }
        });

        // LLM দ্বারা বিবরণ উন্নত করার কার্যকারিতা
        const enhanceDescriptionButton = document.getElementById('enhanceDescriptionButton');
        const propertyDescriptionTextarea = document.getElementById('propertyDescription');
        const descriptionLoadingSpinner = document.getElementById('descriptionLoading');

        if (enhanceDescriptionButton && propertyDescriptionTextarea && descriptionLoadingSpinner) {
            enhanceDescriptionButton.addEventListener('click', async () => {
                const title = addPropertyForm.propertyTitle.value.trim();
                const location = addPropertyForm.propertyLocation.value.trim();
                const currentDescription = propertyDescriptionTextarea.value.trim();

                if (!title && !location && !currentDescription) {
                    addPropertyMessageDiv.textContent = 'বিবরণ উন্নত করতে সম্পত্তির শিরোনাম, অবস্থান বা বর্তমান বিবরণ দিন।';
                    addPropertyMessageDiv.className = 'error-message';
                    return;
                }

                addPropertyMessageDiv.textContent = '';
                addPropertyMessageDiv.className = '';
                descriptionLoadingSpinner.style.display = 'block';
                enhanceDescriptionButton.disabled = true;

                let prompt = `একটি রিয়েল এস্টেট ওয়েবসাইটের জন্য একটি সম্পত্তির আকর্ষণীয় এবং বিস্তারিত বিবরণ তৈরি করুন।`;
                if (title) prompt += `\nশিরোনাম: ${title}`;
                if (location) prompt += `\nঅবস্থান: ${location}`;
                if (currentDescription) prompt += `\nবর্তমান বিবরণ: ${currentDescription}`;
                prompt += `\nবিবরণটি বাংলা ভাষায়, পেশাদার এবং আকর্ষণীয় হতে হবে, সম্ভাব্য ক্রেতাদের আকৃষ্ট করার জন্য।`;

                try {
                    let chatHistory = [];
                    chatHistory.push({ role: "user", parts: [{ text: prompt }] });
                    const payload = { contents: chatHistory };
                    const apiKey = "";
                    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

                    const response = await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });

                    const result = await response.json();

                    if (result.candidates && result.candidates.length > 0 &&
                        result.candidates[0].content && result.candidates[0].content.parts &&
                        result.candidates[0].content.parts.length > 0) {
                        const generatedText = result.candidates[0].content.parts[0].text;
                        propertyDescriptionTextarea.value = generatedText;
                        addPropertyMessageDiv.textContent = 'বিবরণ সফলভাবে উন্নত করা হয়েছে!';
                        addPropertyMessageDiv.className = 'success-message';
                    } else {
                        addPropertyMessageDiv.textContent = 'বিবরণ তৈরি করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।';
                        addPropertyMessageDiv.className = 'error-message';
                        console.error('Gemini API response structure unexpected:', result);
                    }
                } catch (error) {
                    addPropertyMessageDiv.textContent = 'বিবরণ উন্নত করার সময় একটি ত্রুটি হয়েছে।';
                    addPropertyMessageDiv.className = 'error-message';
                    console.error('Error calling Gemini API:', error);
                } finally {
                    descriptionLoadingSpinner.style.display = 'none';
                    enhanceDescriptionButton.disabled = false;
                }
            });
        }
    }
});
