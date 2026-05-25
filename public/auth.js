// ============================================================
// DOOMINIKS STORE - Authentication Module
// Firebase Auth + Firestore user sync
// ============================================================

import { auth, db } from './firebase.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast, setNavUser, clearNavUser } from './ui.js';

export let currentUser = null;
export let currentUserData = null;

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// ── Login with Google ────────────────────────────────────────
export async function loginWithGoogle() {
  try {
    showAuthLoading(true);
    const result = await signInWithPopup(auth, provider);
    await syncUserToFirestore(result.user);
    closeAuthModal();
    showToast('✅ Login berhasil! Selamat datang ' + result.user.displayName, 'success');
  } catch (err) {
    console.error('Login error:', err);
    if (err.code !== 'auth/popup-closed-by-user') {
      showToast('❌ Login gagal: ' + err.message, 'error');
    }
  } finally {
    showAuthLoading(false);
  }
}

// ── Logout ───────────────────────────────────────────────────
export async function logout() {
  try {
    await signOut(auth);
    currentUser = null;
    currentUserData = null;
    clearNavUser();
    showToast('👋 Sampai jumpa!', 'info');
    window.location.hash = '';
  } catch (err) {
    showToast('❌ Logout gagal', 'error');
  }
}

// ── Sync User to Firestore ───────────────────────────────────
export async function syncUserToFirestore(user) {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    // New user - create document
    await setDoc(userRef, {
      uid: user.uid,
      username: user.displayName || 'Gamer',
      email: user.email,
      avatar: user.photoURL || '',
      role: 'user',
      balance: 0,
      totalOrders: 0,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      banned: false,
      referralCode: generateReferralCode(user.uid),
      loyaltyPoints: 0,
      totalSpent: 0
    });
  } else {
    // Existing user - update last login
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      avatar: user.photoURL || snap.data().avatar || ''
    });
  }

  // Load user data into memory
  const updated = await getDoc(userRef);
  currentUserData = updated.data();
}

// ── Auth State Observer ──────────────────────────────────────
export function initAuthObserver(onLogin, onLogout) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      try {
        const userRef = doc(db, 'users', user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          currentUserData = snap.data();
          if (currentUserData.banned) {
            await signOut(auth);
            showToast('🚫 Akun Anda telah dibanned', 'error');
            return;
          }
        }
        setNavUser(user, currentUserData);
        if (onLogin) onLogin(user, currentUserData);
      } catch (e) {
        console.error('Auth observer error:', e);
      }
    } else {
      currentUser = null;
      currentUserData = null;
      clearNavUser();
      if (onLogout) onLogout();
    }
  });
}

// ── Check Admin ──────────────────────────────────────────────
export function isAdmin() {
  return currentUserData?.role === 'admin';
}

// ── Open / Close Auth Modal ──────────────────────────────────
export function openAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) {
    modal.classList.add('active');
    modal.querySelector('.auth-modal-inner')?.classList.add('pop-in');
  }
}

export function closeAuthModal() {
  const modal = document.getElementById('authModal');
  if (modal) modal.classList.remove('active');
}

function showAuthLoading(state) {
  const btn = document.getElementById('googleLoginBtn');
  if (btn) {
    btn.disabled = state;
    btn.innerHTML = state
      ? '<span class="spinner-sm"></span> Menghubungkan...'
      : '<img src="https://www.svgrepo.com/show/475656/google-color.svg" class="google-icon" alt="G"> Lanjutkan dengan Google';
  }
}

// ── Helpers ──────────────────────────────────────────────────
function generateReferralCode(uid) {
  return 'DMK' + uid.slice(0, 6).toUpperCase();
}
