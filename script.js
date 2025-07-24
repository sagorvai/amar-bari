/* style.css - সাধারণ স্টাইল */

/* ফন্ট ইম্পোর্ট */
body {
    font-family: 'Inter', sans-serif;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    background-color: #f0f2f5; /* হালকা ধূসর ব্যাকগ্রাউন্ড */
    color: #333;
    line-height: 1.6;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 20px;
}

/* ফ্লেক্সবক্স ইউটিলিটি ক্লাস */
.flex {
    display: flex;
}

.justify-between {
    justify-content: space-between;
}

.items-center {
    align-items: center;
}

.text-center {
    text-align: center;
}

/* হেডার স্টাইল */
.header {
    background-color: #ffffff;
    padding: 15px 0;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.logo {
    font-size: 1.8em;
    font-weight: 700;
    color: #0070f3;
    text-decoration: none;
}

.nav-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    gap: 20px;
}

.nav-link {
    text-decoration: none;
    color: #555;
    font-weight: 600;
    transition: color 0.3s ease;
}

.nav-link:hover {
    color: #0070f3;
}

/* বাটন স্টাইল */
.button-primary {
    background-color: #0070f3;
    color: white;
    padding: 10px 20px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    font-weight: 600;
    transition: background-color 0.3s ease;
    text-decoration: none; /* অ্যাঙ্কর ট্যাগের জন্য */
    display: inline-block; /* অ্যাঙ্কর ট্যাগের জন্য */
    text-align: center;
}

.button-primary:hover {
    background-color: #005bb5;
}

.button-secondary {
    background-color: #e0e0e0;
    color: #333;
    padding: 10px 20px;
    border: 1px solid #ccc;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    font-weight: 600;
    transition: background-color 0.3s ease, color 0.3s ease;
    text-decoration: none; /* অ্যাঙ্কর ট্যাগের জন্য */
    display: inline-block; /* অ্যাঙ্কর ট্যাগের জন্য */
    text-align: center;
}

.button-secondary:hover {
    background-color: #d0d0d0;
    color: #000;
}

/* নতুন বাটন: ডিলিট বাটন */
.button-danger {
    background-color: #dc3545; /* লাল রঙ */
    color: white;
    padding: 8px 15px;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 600;
    transition: background-color 0.3s ease;
}

.button-danger:hover {
    background-color: #c82333;
}


/* হিরো সেকশন */
.hero {
    background-color: #e6f2ff; /* হালকা নীল ব্যাকগ্রাউন্ড */
    padding: 80px 0;
    margin-bottom: 40px;
}

.hero-title {
    font-size: 3.5em;
    color: #0070f3;
    margin-bottom: 20px;
}

.hero-description {
    font-size: 1.2em;
    color: #555;
    margin-bottom: 40px;
}

.search-bar {
    display: flex;
    justify-content: center;
    gap: 10px;
    max-width: 600px;
    margin: 0 auto;
}

.search-input {
    flex-grow: 1;
    padding: 12px 15px;
    border: 1px solid #ccc;
    border-radius: 5px;
    font-size: 1em;
}

.search-button {
    padding: 12px 25px;
    background-color: #0070f3;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    font-size: 1em;
    font-weight: 600;
    transition: background-color 0.3s ease;
}

.search-button:hover {
    background-color: #005bb5;
}

/* বৈশিষ্ট্যযুক্ত সম্পত্তি সেকশন */
.featured-properties {
    padding: 40px 0;
}

.section-title {
    font-size: 2.5em;
    color: #333;
    text-align: center;
    margin-bottom: 40px;
}

.property-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 30px;
}

.property-card {
    background-color: #ffffff;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    overflow: hidden;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.property-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12);
}

.property-image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
}

.property-info {
    padding: 20px;
}

.property-title {
    font-size: 1.5em;
    color: #0070f3;
    margin-top: 0;
    margin-bottom: 10px;
}

.property-location {
    color: #777;
    font-size: 0.9em;
    margin-bottom: 5px;
}

.property-price {
    font-size: 1.2em;
    font-weight: 700;
    color: #333;
    margin-bottom: 15px;
}

/* ফুটার স্টাইল */
.footer {
    background-color: #333;
    color: white;
    padding: 30px 0;
    margin-top: 50px;
}

.footer-link {
    color: #a0a0a0;
    text-decoration: none;
    margin: 0 10px;
    transition: color 0.3s ease;
}

.footer-link:hover {
    color: white;
}

/* নতুন পেজগুলোর জন্য স্টাইল */
.main-content {
    padding-top: 40px; /* হেডার থেকে একটু নিচে নামানোর জন্য */
}

.search-results-section {
    padding: 40px 0;
}

.search-bar-inner {
    display: flex;
    justify-content: center;
    gap: 10px;
    max-width: 800px;
    margin: 0 auto 50px auto; /* নিচে একটু মার্জিন */
}

/* প্রপার্টি ডিটেইলস পেজ স্টাইল */
.property-detail-section {
    background-color: #ffffff;
    padding: 30px;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    margin-bottom: 50px;
}

.property-detail-title {
    font-size: 2.8em;
    color: #0070f3;
    text-align: center;
    margin-bottom: 30px;
}

.property-detail-image {
    text-align: center;
    margin-bottom: 30px;
}

.property-detail-image img {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.property-detail-info {
    font-size: 1.1em;
    line-height: 1.8;
}

.detail-label {
    font-weight: 700;
    color: #0070f3;
    margin-top: 15px;
    margin-bottom: 5px;
}

.detail-value {
    color: #555;
    margin-bottom: 10px;
}

.contact-button {
    margin-top: 30px;
    padding: 12px 30px;
    font-size: 1.1em;
}

/* ড্যাশবোর্ড স্টাইল */
.dashboard-section {
    padding: 40px 0;
}

.dashboard-actions {
    margin-bottom: 30px;
}

.property-list {
    background-color: #ffffff;
    border-radius: 10px;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
    overflow: hidden;
}

.property-item {
    display: flex;
    align-items: center;
    padding: 20px;
    border-bottom: 1px solid #eee;
}

.property-item:last-child {
    border-bottom: none;
}

.property-list-image {
    width: 120px;
    height: 80px;
    object-fit: cover;
    border-radius: 5px;
    margin-right: 20px;
}

.property-list-info {
    flex-grow: 1;
}

.property-list-title {
    font-size: 1.3em;
    color: #0070f3;
    margin-top: 0;
    margin-bottom: 5px;
}

.property-list-location, .property-list-price {
    font-size: 0.9em;
    color: #777;
    margin-bottom: 5px;
}

.property-list-price {
    font-weight: 700;
    color: #333;
}

.property-list-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap; /* ছোট স্ক্রিনে বাটনগুলো নিচে নামানোর জন্য */
}

/* রেসপনসিভনেস */
@media (max-width: 768px) {
    .header .nav-list {
        flex-direction: column;
        align-items: center;
        gap: 10px;
    }

    .header .flex {
        flex-direction: column;
        gap: 15px;
    }

    .hero-title {
        font-size: 2.5em;
    }

    .hero-description {
        font-size: 1em;
    }

    .search-bar, .search-bar-inner {
        flex-direction: column;
        gap: 10px;
    }

    .search-input, .search-button {
        width: 100%;
    }

    .property-grid {
        grid-template-columns: 1fr;
    }

    .property-detail-title {
        font-size: 2em;
    }

    .property-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 15px;
    }

    .property-list-image {
        margin-right: 0;
        margin-bottom: 10px;
    }

    .property-list-actions {
        width: 100%;
        justify-content: flex-start;
    }
}

@media (max-width: 480px) {
    .hero-title {
        font-size: 2em;
    }
    .section-title {
        font-size: 2em;
    }
    .property-detail-title {
        font-size: 1.8em;
    }
    .property-detail-info {
        font-size: 1em;
    }
    .property-list-title {
        font-size: 1.1em;
    }
}
