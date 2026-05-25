# 🔥 DOOMINIKS STORE — Setup & Deployment Guide

> **Platform**: Digital Store / Top Up Gaming / Jasa Digital  
> **Stack**: HTML5 + TailwindCSS + Vanilla JS (ESM) + Firebase v10  
> **Design**: Cyberpunk Anime · Dark Premium · Glassmorphism · Neon Red/Pink

---

## 📁 FOLDER STRUCTURE

```
doominiks-store/
├── public/
│   ├── index.html          ← Landing Page utama
│   ├── app.js              ← Entry point & router
│   ├── firebase.js         ← Firebase config & init
│   ├── auth.js             ← Authentication module
│   ├── products.js         ← Products CRUD & realtime
│   ├── orders.js           ← Checkout & orders
│   ├── admin.js            ← Admin panel logic
│   ├── ui.js               ← Toast, modal, skeleton, ripple
│   ├── animations.js       ← Particles, scroll reveal, counters
│   ├── style.css           ← Premium cyberpunk CSS
│   ├── manifest.json       ← PWA manifest
│   └── sw.js               ← Service Worker
├── admin/
│   └── index.html          ← Admin Panel UI
├── assets/
│   ├── images/
│   ├── icons/
│   └── audio/
├── firebase/
│   ├── firestore.rules     ← Security rules
│   └── firestore.indexes.json
├── firebase.json           ← Hosting config
└── README.md
```

---

## 🚀 LANGKAH 1 — BUAT FIREBASE PROJECT

1. Buka [console.firebase.google.com](https://console.firebase.google.com)
2. Klik **"Add project"** → beri nama: `doominiks-store`
3. Nonaktifkan Google Analytics (opsional)
4. Klik **Continue** → **Create project**

---

## 🔑 LANGKAH 2 — DAPATKAN FIREBASE CONFIG

1. Di Firebase Console, klik ⚙️ **Project Settings**
2. Scroll ke **Your apps** → klik **Web** `</>`
3. Daftarkan app dengan nama: `Doominiks Store Web`
4. Copy konfigurasi yang muncul

5. Buka file `public/firebase.js` dan **ganti** placeholder:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← ganti
  authDomain: "doominiks-xxx.firebaseapp.com",
  projectId: "doominiks-xxx",
  storageBucket: "doominiks-xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123...:web:abc...",
  measurementId: "G-XXXXXX"
};
```

---

## 🔐 LANGKAH 3 — AKTIFKAN FIREBASE AUTH

1. Di sidebar Firebase → **Authentication** → **Get started**
2. Klik tab **Sign-in method**
3. Enable **Google** provider
4. Masukkan **Project support email**
5. Klik **Save**

---

## 🗄️ LANGKAH 4 — SETUP FIRESTORE

1. Di sidebar Firebase → **Firestore Database** → **Create database**
2. Pilih **Start in production mode** (kita akan set rules manual)
3. Pilih region terdekat (misalnya: `asia-southeast1` untuk Singapore)
4. Klik **Done**

### Upload Security Rules:

Di Firebase Console → Firestore → **Rules** tab, paste isi dari `firebase/firestore.rules`

### Buat Index Manual (atau via CLI):

Di Firebase Console → Firestore → **Indexes** tab, buat composite index:
- Collection: `products`, Fields: `active ASC + sold DESC`
- Collection: `orders`, Fields: `uid ASC + createdAt DESC`
- Collection: `orders`, Fields: `status ASC + createdAt DESC`

---

## 📦 LANGKAH 5 — INSTALL FIREBASE CLI

```bash
# Install Node.js (https://nodejs.org) terlebih dahulu, lalu:
npm install -g firebase-tools

# Login ke Firebase
firebase login

# Verifikasi
firebase --version
```

---

## ⚙️ LANGKAH 6 — INIT PROJECT

```bash
# Di folder root doominiks-store/
firebase init

# Pilih fitur:
# ✅ Firestore
# ✅ Hosting

# Saat ditanya:
# - Use existing project → pilih doominiks-xxx
# - Firestore rules file: firebase/firestore.rules
# - Firestore indexes file: firebase/firestore.indexes.json
# - Public directory: public
# - Configure as SPA: Yes
# - Overwrite index.html: No
```

---

## 🚀 LANGKAH 7 — DEPLOY

```bash
# Deploy semuanya
firebase deploy

# Atau deploy hanya hosting
firebase deploy --only hosting

# Atau deploy hanya rules
firebase deploy --only firestore:rules
```

Setelah deploy, akan dapat URL:
```
https://doominiks-xxx.web.app
https://doominiks-xxx.firebaseapp.com
```

---

## 👑 LANGKAH 8 — SETUP AKUN ADMIN

### Cara 1 — Via Firebase Console:

1. Buka Firebase Console → **Firestore**
2. Klik koleksi `users`
3. Cari dokumen dengan UID kamu (login dulu di website)
4. Edit field `role` → ubah dari `"user"` ke `"admin"`
5. Save

### Cara 2 — Via Admin Script:

Buat file sementara `set-admin.html` dan jalankan di browser:

```javascript
// Setelah login, jalankan di console browser:
import { db } from '/firebase.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

await updateDoc(doc(db, 'users', 'YOUR_UID_HERE'), { role: 'admin' });
console.log('Admin role set!');
```

---

## 🎮 LANGKAH 9 — TAMBAH PRODUK PERTAMA

Setelah jadi admin:

1. Buka `https://yoursite.web.app/admin/`
2. Login dengan akun admin
3. Klik **"Produk"** di sidebar
4. Klik **"+ Tambah Produk"**
5. Isi form dan simpan

### Contoh Data Produk:

```json
{
  "title": "Mobile Legends 86 Diamonds",
  "description": "86 Diamonds + bonus event item",
  "price": 19000,
  "originalPrice": 25000,
  "stock": 999,
  "category": "Mobile Legends",
  "image": "https://...",
  "badge": "HOT",
  "active": true,
  "featured": true,
  "popular": true
}
```

---

## 🗃️ DATABASE SCHEMA

### `users/{uid}`
```json
{
  "uid": "string",
  "username": "string",
  "email": "string",
  "avatar": "url",
  "role": "user | admin",
  "balance": 0,
  "totalOrders": 0,
  "loyaltyPoints": 0,
  "referralCode": "DMKxxxxxx",
  "banned": false,
  "createdAt": "timestamp",
  "lastLogin": "timestamp"
}
```

### `products/{productId}`
```json
{
  "title": "string",
  "description": "string",
  "image": "url",
  "category": "string",
  "price": 19000,
  "originalPrice": 25000,
  "stock": 999,
  "sold": 0,
  "badge": "HOT | NEW | SALE | LIMITED",
  "active": true,
  "featured": true,
  "popular": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### `orders/{orderId}`
```json
{
  "orderId": "DMK-XXXXXXX",
  "uid": "string",
  "username": "string",
  "productId": "string",
  "productName": "string",
  "quantity": 1,
  "totalPrice": 19000,
  "paymentMethod": "qris | dana | ovo | gopay | bca | bni",
  "paymentProof": "base64_string",
  "status": "waiting | paid | processing | completed | cancelled",
  "notes": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### `notifications/{notifId}`
```json
{
  "title": "string",
  "message": "string",
  "type": "order | promo | info | system",
  "uid": "string (optional, for targeted)",
  "global": true,
  "readBy": ["uid1", "uid2"],
  "createdAt": "timestamp"
}
```

---

## 🌐 CUSTOM DOMAIN (Opsional)

1. Firebase Console → Hosting → **Add custom domain**
2. Masukkan domain: `doominiks.store`
3. Verifikasi kepemilikan dengan TXT record di DNS
4. Tambahkan A record yang diberikan Firebase
5. Tunggu SSL otomatis (~24 jam)

---

## 📱 ICONS PWA (Wajib)

Buat icons dengan ukuran berikut di `/assets/icons/`:
- `favicon.png` (32×32)
- `icon-72.png`
- `icon-96.png`
- `icon-128.png`
- `icon-144.png`
- `icon-152.png`
- `icon-192.png` ← paling penting
- `icon-384.png`
- `icon-512.png`

**Tool gratis**: [realfavicongenerator.net](https://realfavicongenerator.net) atau [pwabuilder.com](https://pwabuilder.com)

---

## 🔧 TROUBLESHOOTING

### ❌ "Firebase: Error (auth/unauthorized-domain)"
- Tambahkan domain kamu di Firebase Console → Authentication → Settings → **Authorized domains**

### ❌ Products tidak muncul
- Pastikan Firestore sudah dibuat
- Pastikan rules sudah di-deploy
- Pastikan ada produk dengan field `active: true`

### ❌ Admin panel tidak bisa diakses
- Pastikan role user diubah ke `admin` di Firestore
- Cek browser console untuk error detail

### ❌ Module import error
- Pastikan semua file .js ada di folder `/public/`
- Cek apakah `type="module"` ada di `<script>` tag

### ❌ CSS tidak termuat
- Pastikan path `/style.css` benar (relatif ke root `/public/`)

---

## 📊 MONITORING

- **Firebase Console** → Firestore → Usage tab
- **Firebase Console** → Authentication → Users
- **Firebase Console** → Hosting → Usage

---

## 🛡️ SECURITY CHECKLIST

- [x] Firestore rules: user hanya bisa edit datanya sendiri
- [x] Admin validation di frontend (auth.js) dan backend (rules)
- [x] Banned user tidak bisa order
- [x] Order status hanya bisa diubah admin
- [x] paymentProof: base64 (tidak butuh Storage bucket publik)
- [x] XSS protection headers di firebase.json

---

## 💡 TIPS OPTIMASI

1. **Produk Gambar** — Gunakan Cloudinary atau imgbb.com untuk hosting gambar
2. **Performa** — Firebase Hosting menggunakan CDN global otomatis
3. **Notifikasi Push** — Bisa dikembangkan dengan FCM (Firebase Cloud Messaging)
4. **Analytics** — Aktifkan Google Analytics di Firebase untuk tracking
5. **A/B Testing** — Gunakan Firebase Remote Config untuk experiment

---

## 📞 SUPPORT

- 💬 WhatsApp: 0812-XXXX-XXXX
- 📧 Email: admin@doominiks.store
- 🌐 Website: https://doominiks.store

---

**© 2024 Doominiks Store** | Made with ❤️ for Indonesian Gamers
