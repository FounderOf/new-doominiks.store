// ============================================================
// DOOMINIKS STORE - Auth Module
// ============================================================

import { auth, db } from './firebase.js';
import {
  GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { showToast, setNavUser, clearNavUser } from './ui.js';

export let currentUser     = null;
export let currentUserData = null;

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// ── Login Google ──────────────────────────────────────────────
export async function loginWithGoogle() {
  try {
    showAuthLoading(true);
    const result = await signInWithPopup(auth, provider);
    await syncUserToFirestore(result.user);
    closeAuthModal();
    showToast('✅ Login berhasil! Selamat datang ' + result.user.displayName, 'success');
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showToast('❌ Login gagal: ' + err.message, 'error');
    }
  } finally {
    showAuthLoading(false);
  }
}

// ── Logout ────────────────────────────────────────────────────
export async function logout() {
  await signOut(auth);
  currentUser = null;
  currentUserData = null;
  clearNavUser();
  showToast('👋 Sampai jumpa!', 'info');
}

// ── Sync Firestore ────────────────────────────────────────────
export async function syncUserToFirestore(user) {
  const ref  = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      username: user.displayName || 'Gamer',
      email: user.email,
      avatar: user.photoURL || '',
      role: 'user',
      balance: 0,
      totalOrders: 0,
      loyaltyPoints: 0,
      referralCode: 'DMK' + user.uid.slice(0,6).toUpperCase(),
      banned: false,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    });
  } else {
    await updateDoc(ref, { lastLogin: serverTimestamp(), avatar: user.photoURL || '' });
  }
  const updated    = await getDoc(ref);
  currentUserData  = updated.data();
}

// ── Auth Observer ─────────────────────────────────────────────
export function initAuthObserver(onLogin, onLogout) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      const snap  = await getDoc(doc(db, 'users', user.uid));
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
    } else {
      currentUser = null; currentUserData = null;
      clearNavUser();
      if (onLogout) onLogout();
    }
  });
}

export const isAdmin = () => currentUserData?.role === 'admin';

export function openAuthModal()  { document.getElementById('authModal')?.classList.add('active'); }
export function closeAuthModal() { document.getElementById('authModal')?.classList.remove('active'); }

function showAuthLoading(state) {
  const btn = document.getElementById('googleLoginBtn');
  if (!btn) return;
  btn.disabled = state;
  btn.innerHTML = state
    ? '<span class="spinner-sm"></span> Menghubungkan...'
    : '<img src="https://www.svgrepo.com/show/475656/google-color.svg" class="google-icon" alt="G"> Lanjutkan dengan Google';
}
