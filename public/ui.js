// ============================================================
// DOOMINIKS STORE - UI Module
// Toast, Modal, Nav, Skeleton, Ripple, Transitions
// ============================================================

// ── Toast Notification ───────────────────────────────────────
const TOAST_TYPES = {
  success: { icon: '✅', class: 'toast-success' },
  error:   { icon: '❌', class: 'toast-error' },
  info:    { icon: '💡', class: 'toast-info' },
  warning: { icon: '⚠️', class: 'toast-warning' },
  live:    { icon: '🔴', class: 'toast-live' }
};

export function showToast(message, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer') || createToastContainer();
  const { icon, class: cls } = TOAST_TYPES[type] || TOAST_TYPES.info;

  const toast = document.createElement('div');
  toast.className = `toast-item ${cls}`;
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 400);
  }, duration);
}

function createToastContainer() {
  const c = document.createElement('div');
  c.id = 'toastContainer';
  document.body.appendChild(c);
  return c;
}

// ── Nav User ─────────────────────────────────────────────────
export function setNavUser(user, userData) {
  const navLogin = document.getElementById('navLoginBtn');
  const navProfile = document.getElementById('navProfile');
  const navAvatar = document.getElementById('navAvatar');
  const navUsername = document.getElementById('navUsername');
  const mobileNavProfile = document.getElementById('mobileNavProfile');

  if (navLogin) navLogin.classList.add('hidden');
  if (navProfile) navProfile.classList.remove('hidden');
  if (navAvatar && user.photoURL) navAvatar.src = user.photoURL;
  if (navUsername) navUsername.textContent = userData?.username || user.displayName;
  if (mobileNavProfile) {
    mobileNavProfile.innerHTML = `<img src="${user.photoURL || ''}" class="mobile-avatar" alt="profile">`;
  }
}

export function clearNavUser() {
  const navLogin = document.getElementById('navLoginBtn');
  const navProfile = document.getElementById('navProfile');
  if (navLogin) navLogin.classList.remove('hidden');
  if (navProfile) navProfile.classList.add('hidden');
}

// ── Skeleton Loading ─────────────────────────────────────────
export function renderSkeletons(containerId, count = 6) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array(count).fill(`
    <div class="skeleton-card">
      <div class="skeleton-img skel"></div>
      <div class="skeleton-line skel" style="width:80%;height:16px;margin:12px 0 8px"></div>
      <div class="skeleton-line skel" style="width:50%;height:12px"></div>
      <div class="skeleton-line skel" style="width:60%;height:28px;margin-top:12px"></div>
    </div>
  `).join('');
}

// ── Modal System ─────────────────────────────────────────────
export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('modal-active');
  document.body.style.overflow = 'hidden';
  const inner = modal.querySelector('.modal-inner');
  if (inner) { inner.style.transform = 'scale(0.85)'; inner.style.opacity = '0'; }
  requestAnimationFrame(() => {
    if (inner) { inner.style.transform = 'scale(1)'; inner.style.opacity = '1'; }
  });
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('modal-active');
  document.body.style.overflow = '';
}

// Close modal on backdrop click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    const id = e.target.id || e.target.closest('[id]')?.id;
    if (id) closeModal(id);
  }
});

// ── Ripple Effect ─────────────────────────────────────────────
export function addRipple(el) {
  el.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple-effect';
    const rect = this.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

export function initRipples() {
  document.querySelectorAll('.btn-ripple, .product-card, .nav-btn').forEach(addRipple);
}

// ── Loading Screen ────────────────────────────────────────────
export function hideLoadingScreen() {
  const screen = document.getElementById('loadingScreen');
  if (screen) {
    setTimeout(() => {
      screen.style.opacity = '0';
      setTimeout(() => screen.remove(), 600);
    }, 1200);
  }
}

// ── Smooth Scroll ─────────────────────────────────────────────
export function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

// ── Counter Animation ─────────────────────────────────────────
export function animateCounter(el, target, duration = 2000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) { current = target; clearInterval(timer); }
    el.textContent = Math.floor(current).toLocaleString('id-ID');
  }, 16);
}

// ── Page Transition ───────────────────────────────────────────
export function pageTransition(cb) {
  const overlay = document.getElementById('pageTransitionOverlay');
  if (!overlay) { cb(); return; }
  overlay.classList.add('active');
  setTimeout(() => {
    cb();
    setTimeout(() => overlay.classList.remove('active'), 400);
  }, 300);
}

// ── Navbar Scroll ─────────────────────────────────────────────
export function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) navbar.classList.add('scrolled');
    else navbar.classList.remove('scrolled');
  }, { passive: true });
}

// ── Format Currency ───────────────────────────────────────────
export function formatRupiah(amount) {
  return 'Rp ' + Number(amount).toLocaleString('id-ID');
}

// ── Ago Time ─────────────────────────────────────────────────
export function timeAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return diff + 'd lalu';
  if (diff < 3600) return Math.floor(diff/60) + 'm lalu';
  if (diff < 86400) return Math.floor(diff/3600) + 'j lalu';
  return Math.floor(diff/86400) + 'h lalu';
}

// ── Mobile Bottom Nav Active ──────────────────────────────────
export function setMobileNavActive(page) {
  document.querySelectorAll('.bottom-nav-item').forEach(item => {
    item.classList.toggle('active', item.dataset.page === page);
  });
}
