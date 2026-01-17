<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <title>প্রপার্টি বিস্তারিত</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />

  <style>
    body {font-family: sans-serif; margin:0; background:#f7f7f7;}
    .container{max-width:1100px;margin:auto;padding:10px;}
    .card{background:#fff;border-radius:8px;padding:15px;margin-bottom:15px;}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
    .title{font-size:22px;font-weight:bold}
    .price{font-size:20px;color:#e91e63}
    .slider img{width:100%;border-radius:8px}
    .contact{background:#0d6efd;color:#fff;text-align:center}
    .contact a{color:#fff;text-decoration:none;font-weight:bold}
  </style>
</head>

<body>

<div class="container">

  <!-- Image slider -->
  <div class="card slider" id="imageSlider"></div>

  <!-- Title + price -->
  <div class="card">
    <div class="title" id="title"></div>
    <div class="price" id="price"></div>
    <div id="category"></div>
  </div>

  <!-- Location -->
  <div class="card" id="location"></div>

  <!-- Quick info -->
  <div class="card grid" id="quickInfo"></div>

  <!-- Utilities -->
  <div class="card" id="utilities" style="display:none">
    <h3>সুবিধাসমূহ</h3>
    <ul id="utilitiesList"></ul>
  </div>

  <!-- Description -->
  <div class="card">
    <h3>বর্ণনা</h3>
    <p id="description"></p>
  </div>

  <!-- Ownership -->
  <div class="card" id="ownership" style="display:none">
    <h3>মালিকানা তথ্য</h3>
    <div id="ownershipData"></div>
  </div>

  <!-- Map -->
  <div class="card" id="map" style="display:none"></div>

  <!-- Contact -->
  <div class="card contact">
    <div id="phone"></div>
    <a id="callBtn" href="#">📞 কল করুন</a>
  </div>

</div>

<script src="details.js"></script>
</body>
</html>
