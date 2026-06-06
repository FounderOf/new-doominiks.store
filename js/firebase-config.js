// ============================================================
// FIREBASE CONFIGURATION
// Ganti dengan config Firebase project kamu
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyAL-_NogoNyUWkLEYj6PXdqD9-SjHsusu0",
  authDomain: "doominiks-new-store.firebaseapp.com",
  projectId: "doominiks-new-store",
  storageBucket: "doominiks-new-store.firebasestorage.app",
  messagingSenderId: "369118847145",
  appId: "1:369118847145:web:33b56aae2ee031eb8489b8"
};

// Owner UIDs — tambahkan UID kamu setelah login pertama
const OWNER_UIDS = ["6b4IXcTviqU3Fg2MTmUF9Kv2q5g1"];

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
const googleProvider = new firebase.auth.GoogleAuthProvider();

// Helper: cek apakah user adalah owner
function isOwner(uid) {
  return OWNER_UIDS.includes(uid);
}

// Helper: format currency IDR
function formatIDR(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0
  }).format(amount);
}

// Helper: format tanggal
function formatDate(ts) {
  if (!ts) return "-";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  }).format(d);
}

// Helper: generate order ID
function generateOrderId() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "ORD-";
  for (let i = 0; i < 10; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}
