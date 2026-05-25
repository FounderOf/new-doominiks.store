// ============================================================
// DOOMINIKS STORE - Main App Entry Point
// Router, Dashboard, Notifications, Init
// ============================================================

import { initAuthObserver, loginWithGoogle, logout, openAuthModal, isAdmin, currentUser, currentUserData } from './auth.js';
import { showToast, openModal, closeModal, initRipples, initSmoothScroll, initNavbarScroll, hideLoadingScreen, formatRupiah, timeAgo, setMobileNavActive } from './ui.js';
import { ParticleSystem, createAmbientLights, initScrollReveal, initMagneticButtons, startLivePurchaseFeed, initNeonFlicker, initStatCounters, initGlitchEffect, initTestimonialSlider, initFlashSaleCountdown } from './animations.js';
import { initProductsSection, searchProducts } from './products.js';
import { submitOrder, listenUserOrders, getStatusBadge } from './orders.js';
import { db } from './firebase.js';
import {
  doc, getDoc, updateDoc, onSnapshot,
  collection, query, orderBy, limit, getDocs, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let particleSystem = null;
let userOrdersUnsubscribe = null;
let notifUnsubscribe = null;
let fakeVisitors = Math.floor(Math.random() * 200) + 50;

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  // Init particle canvas
  particleSystem = new ParticleSystem('particleCanvas');
  createAmbientLights('heroAmbient');
  initGlitchEffect();
  initNavbarScroll();
  initSmoothScroll();
  initNeonFlicker();
  initStatCounters();
  initTestimonialSlider();
  startLivePurchaseFeed();
  initMagneticButtons();
  initScrollReveal();
  initRipples();
  registerGlobals();
  initFakeVisitors();
  initEventHandlers();
  initFlashSaleCountdown(Date.now() + 6 * 3600 * 1000);

  // Auth observer
  initAuthObserver(
    (user, userData) => onUserLogin(user, userData),
    () => onUserLogout()
  );

  // Load products
  initProductsSection();

  // Load testimonials
  loadTestimonials();

  // Register SW
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }

  // Hide loader
  hideLoadingScreen();

  // Check PWA install
  initPWAInstall();

  // Daily reward popup
  setTimeout(showDailyRewardPopup, 5000);
});

// ══════════════════════════════════════════════════════════════
// AUTH EVENTS
// ══════════════════════════════════════════════════════════════
function onUserLogin(user, userData) {
  listenNotifications(user.uid);
  listenUserDashboard(user.uid);
  // If on admin page, handle separately
}

function onUserLogout() {
  if (userOrdersUnsubscribe) { userOrdersUnsubscribe(); userOrdersUnsubscribe = null; }
  if (notifUnsubscribe) { notifUnsubscribe(); notifUnsubscribe = null; }
  closeAllDashboard();
}

// ══════════════════════════════════════════════════════════════
// USER DASHBOARD
// ══════════════════════════════════════════════════════════════
function openDashboard() {
  if (!currentUser) { openAuthModal(); return; }
  renderDashboard();
  openModal('dashboardModal');
}

function renderDashboard() {
  const ud = currentUserData;
  if (!ud) return;

  document.getElementById('dashUsername').textContent = ud.username || 'Gamer';
  document.getElementById('dashEmail').textContent = ud.email || '';
  document.getElementById('dashAvatar').src = ud.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(ud.username || 'U') + '&background=ff004c&color=fff';
  document.getElementById('dashBalance').textContent = formatRupiah(ud.balance || 0);
  document.getElementById('dashTotalOrders').textContent = ud.totalOrders || 0;
  document.getElementById('dashLoyalty').textContent = (ud.loyaltyPoints || 0) + ' pts';
  document.getElementById('dashReferral').textContent = ud.referralCode || '-';
  document.getElementById('dashRole').textContent = ud.role === 'admin' ? '👑 Admin' : '🎮 Member';

  // Show admin link if admin
  const adminLink = document.getElementById('dashAdminLink');
  if (adminLink) adminLink.style.display = ud.role === 'admin' ? 'flex' : 'none';

  // Load orders
  loadDashboardOrders();
}

function loadDashboardOrders() {
  const container = document.getElementById('dashOrders');
  if (!container || !currentUser) return;
  container.innerHTML = '<div class="loading-small">Memuat...</div>';

  if (userOrdersUnsubscribe) userOrdersUnsubscribe();
  userOrdersUnsubscribe = listenUserOrders(currentUser.uid, (orders) => {
    if (!orders.length) {
      container.innerHTML = '<div class="empty-orders">Belum ada pesanan</div>';
      return;
    }
    container.innerHTML = orders.slice(0, 10).map(o => `
      <div class="order-item">
        <div class="order-item-info">
          <span class="order-item-name">${o.productName}</span>
          <span class="order-item-id">#${o.orderId}</span>
        </div>
        <div class="order-item-right">
          ${getStatusBadge(o.status)}
          <span class="order-item-price">${formatRupiah(o.totalPrice)}</span>
        </div>
      </div>
    `).join('');
  });
}

function listenUserDashboard(uid) {
  // Listen for realtime balance updates
  onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      // Update nav balance if shown
      const balEl = document.getElementById('navBalance');
      if (balEl) balEl.textContent = formatRupiah(data.balance || 0);
    }
  });
}

function closeAllDashboard() {
  closeModal('dashboardModal');
}

// ══════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════════════════════
function listenNotifications(uid) {
  const q = query(
    collection(db, 'notifications'),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  if (notifUnsubscribe) notifUnsubscribe();
  notifUnsubscribe = onSnapshot(q, (snap) => {
    const notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const unread = notifs.filter(n => !n.readBy?.includes(uid)).length;
    updateNotifBadge(unread);
    renderNotifications(notifs, uid);
  });
}

function updateNotifBadge(count) {
  const badge = document.getElementById('notifBadge');
  if (badge) {
    badge.textContent = count > 0 ? (count > 9 ? '9+' : count) : '';
    badge.style.display = count > 0 ? 'flex' : 'none';
  }
}

function renderNotifications(notifs, uid) {
  const list = document.getElementById('notifList');
  if (!list) return;
  if (!notifs.length) {
    list.innerHTML = '<div class="notif-empty">Tidak ada notifikasi</div>';
    return;
  }
  list.innerHTML = notifs.map(n => `
    <div class="notif-item ${!n.readBy?.includes(uid) ? 'unread' : ''}">
      <div class="notif-icon">${n.type === 'order' ? '📦' : n.type === 'promo' ? '🎉' : '📢'}</div>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-msg">${n.message}</div>
        <div class="notif-time">${timeAgo(n.createdAt)}</div>
      </div>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════════════
// TESTIMONIALS
// ══════════════════════════════════════════════════════════════
async function loadTestimonials() {
  const track = document.getElementById('testimonialTrack');
  if (!track) return;

  // Fallback testimonials
  const fallbackTestimonials = [
    { name: 'Reza Firmansyah', avatar: '🎮', rating: 5, text: 'Top up cepat banget! Gak nyampe 2 menit diamonds udah masuk. Recommended banget!', product: 'Mobile Legends' },
    { name: 'Sakura Chan', avatar: '🌸', rating: 5, text: 'Admin ramah, proses cepat, harga terjangkau. Udah langganan disini dari 2023!', product: 'Genshin Impact' },
    { name: 'DragonSlayer99', avatar: '🐉', rating: 5, text: 'Paling suka promo flashsale-nya. Bisa hemat lumayan buat top up rutin.', product: 'Free Fire' },
    { name: 'NinjaXx', avatar: '⚔️', rating: 4, text: 'UC langsung masuk, terpercaya. Bakal balik lagi pasti.', product: 'PUBG Mobile' },
    { name: 'LunaEdge', avatar: '🌙', rating: 5, text: 'Beli VP buat Valorant disini udah berkali-kali. Aman dan terpercaya!', product: 'Valorant' },
    { name: 'ShadowKing', avatar: '👑', rating: 5, text: 'Harga paling murah se-Indonesia menurutku. Worth it abis!', product: 'Honor of Kings' }
  ];

  try {
    const snap = await getDocs(collection(db, 'testimonials'));
    const data = snap.empty ? fallbackTestimonials : snap.docs.map(d => d.data());
    renderTestimonialsTrack(track, data);
  } catch {
    renderTestimonialsTrack(track, fallbackTestimonials);
  }
}

function renderTestimonialsTrack(track, data) {
  track.innerHTML = [...data, ...data].map(t => `
    <div class="testimonial-card reveal-child">
      <div class="test-header">
        <div class="test-avatar">${t.avatar || t.name?.charAt(0)}</div>
        <div>
          <div class="test-name">${t.name}</div>
          <div class="test-product">${t.product}</div>
        </div>
        <div class="test-stars">${'⭐'.repeat(t.rating || 5)}</div>
      </div>
      <p class="test-text">"${t.text}"</p>
    </div>
  `).join('');
}

// ══════════════════════════════════════════════════════════════
// FAKE VISITORS
// ══════════════════════════════════════════════════════════════
function initFakeVisitors() {
  const el = document.getElementById('liveVisitors');
  if (!el) return;
  el.textContent = fakeVisitors;
  setInterval(() => {
    const delta = Math.floor(Math.random() * 7) - 3;
    fakeVisitors = Math.max(30, Math.min(500, fakeVisitors + delta));
    el.textContent = fakeVisitors;
  }, 5000);
}

// ══════════════════════════════════════════════════════════════
// DAILY REWARD
// ══════════════════════════════════════════════════════════════
function showDailyRewardPopup() {
  if (!currentUser) return;
  const key = 'dmk_daily_' + new Date().toDateString();
  if (localStorage.getItem(key)) return;
  openModal('dailyRewardModal');
}

window.claimDailyReward = async () => {
  if (!currentUser) return;
  const key = 'dmk_daily_' + new Date().toDateString();
  localStorage.setItem(key, '1');
  try {
    await updateDoc(doc(db, 'users', currentUser.uid), {
      loyaltyPoints: (currentUserData?.loyaltyPoints || 0) + 10
    });
    showToast('🎁 +10 Loyalty Points diklaim!', 'success');
  } catch {}
  closeModal('dailyRewardModal');
};

// ══════════════════════════════════════════════════════════════
// PWA INSTALL
// ══════════════════════════════════════════════════════════════
let deferredInstallPrompt = null;

function initPWAInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) setTimeout(() => banner.classList.add('visible'), 3000);
  });
}

window.installPWA = async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('pwaInstallBanner')?.classList.remove('visible');
  if (result.outcome === 'accepted') showToast('✅ Aplikasi berhasil diinstall!', 'success');
};

// ══════════════════════════════════════════════════════════════
// SCROLL REVEAL RE-INIT
// ══════════════════════════════════════════════════════════════
window.reinitReveal = () => {
  initScrollReveal();
  initRipples();
  initMagneticButtons();
};

// ══════════════════════════════════════════════════════════════
// EVENT HANDLERS
// ══════════════════════════════════════════════════════════════
function initEventHandlers() {
  // Search
  const searchInput = document.getElementById('productSearch');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => searchProducts(e.target.value), 400);
    });
  }

  // Category filter
  document.querySelectorAll('.category-chip').forEach(chip => {
    chip.addEventListener('click', function() {
      document.querySelectorAll('.category-chip').forEach(c => c.classList.remove('active'));
      this.classList.add('active');
      searchProducts('', this.dataset.category || '');
    });
  });

  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', function() {
      const item = this.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });

  // Mobile nav
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.addEventListener('click', function() {
      const page = this.dataset.page;
      handleMobileNav(page);
    });
  });

  // Hamburger
  const hamburger = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
    });
  }
}

function handleMobileNav(page) {
  setMobileNavActive(page);
  switch(page) {
    case 'home':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'products':
      document.getElementById('productsSection')?.scrollIntoView({ behavior: 'smooth' });
      break;
    case 'orders':
      openDashboard();
      break;
    case 'profile':
      openDashboard();
      break;
  }
}

// ══════════════════════════════════════════════════════════════
// GLOBAL EXPORTS
// ══════════════════════════════════════════════════════════════
function registerGlobals() {
  window.loginWithGoogle = loginWithGoogle;
  window.logout = logout;
  window.openAuthModal = openAuthModal;
  window.openDashboard = openDashboard;
  window.closeModal = closeModal;
  window.submitOrder = submitOrder;
  window.openModal = openModal;
}
