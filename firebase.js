// ============================================================
// DOOMINIKS STORE - Firebase Configuration
// ⚠️ GANTI DENGAN CONFIG FIREBASE PROJECT KAMU
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ⚠️ WAJIB DIGANTI — Ambil dari Firebase Console > Project Settings > Your Apps > Web
const firebaseConfig = {
  apiKey:            "AIzaSyAL-_NogoNyUWkLEYj6PXdqD9-SjHsusu0",
  authDomain:        "doominiks-new-store.firebaseapp.com",
  projectId:         "doominiks-new-store",
  storageBucket:     "doominiks-new-store.firebasestorage.app",
  messagingSenderId: "369118847145",
  appId:             "1:369118847145:web:33b56aae2ee031eb8489b8"
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

export default app;
