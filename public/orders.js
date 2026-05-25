// ============================================================
// DOOMINIKS STORE - Orders Module
// Checkout, Payment Proof, Realtime Status, Invoice
// ============================================================

import { db, storage } from './firebase.js';
import {
  collection, addDoc, doc, getDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { currentUser, currentUserData, openAuthModal } from './auth.js';
import { showToast, openModal, closeModal, formatRupiah, timeAgo } from './ui.js';

const PAYMENT_METHODS = [
  { id: 'qris',     name: 'QRIS',          icon: '📱', number: '007-3829-2991-QRIS' },
  { id: 'dana',     name: 'Dana',          icon: '💙', number: '0812-3456-7890' },
  { id: 'ovo',      name: 'OVO',           icon: '💜', number: '0812-3456-7890' },
  { id: 'gopay',    name: 'GoPay',         icon: '💚', number: '0812-3456-7890' },
  { id: 'bca',      name: 'BCA',           icon: '🏦', number: '1234567890 a.n. Doominiks Store' },
  { id: 'bni',      name: 'BNI',           icon: '🏦', number: '0987654321 a.n. Doominiks Store' },
];

let checkoutProduct = null;
let checkoutQty = 1;
let checkoutPayment = 'qris';
let checkoutTimer = null;
let proofBase64 = null;

// ── Open Checkout Modal ───────────────────────────────────────
export function openCheckoutModal(product) {
  if (!currentUser) {
    showToast('⚠️ Silakan login terlebih dahulu', 'warning');
    openAuthModal();
    return;
  }

  checkoutProduct = product;
  checkoutQty = 1;
  checkoutPayment = 'qris';
  proofBase64 = null;

  document.getElementById('checkoutProductName').textContent = product.title;
  document.getElementById('checkoutProductPrice').textContent = formatRupiah(product.price);
  document.getElementById('checkoutProductImg').src = product.image || 'https://placehold.co/80x80/0f0f0f/ff004c?text=IMG';
  updateCheckoutTotal();
  renderPaymentMethods();
  startCheckoutTimer(900); // 15 min

  openModal('checkoutModal');
}

function updateCheckoutTotal() {
  if (!checkoutProduct) return;
  const total = checkoutProduct.price * checkoutQty;
  document.getElementById('checkoutQty').textContent = checkoutQty;
  document.getElementById('checkoutTotal').textContent = formatRupiah(total);
}

function renderPaymentMethods() {
  const container = document.getElementById('paymentMethodList');
  if (!container) return;
  container.innerHTML = PAYMENT_METHODS.map(pm => `
    <div class="payment-method ${pm.id === checkoutPayment ? 'selected' : ''}"
         onclick="window.selectPayment('${pm.id}')">
      <span class="pm-icon">${pm.icon}</span>
      <span class="pm-name">${pm.name}</span>
      ${pm.id === checkoutPayment ? '<span class="pm-check">✓</span>' : ''}
    </div>
  `).join('');

  const pm = PAYMENT_METHODS.find(p => p.id === checkoutPayment);
  if (pm) {
    const infoEl = document.getElementById('paymentInfo');
    if (infoEl) infoEl.textContent = `Nomor Tujuan: ${pm.number}`;
  }
}

window.selectPayment = (pmId) => {
  checkoutPayment = pmId;
  renderPaymentMethods();
};

window.changeQty = (delta) => {
  checkoutQty = Math.max(1, Math.min(checkoutProduct?.stock || 99, checkoutQty + delta));
  updateCheckoutTotal();
};

// ── Payment Proof Upload ──────────────────────────────────────
window.handleProofUpload = (input) => {
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    showToast('❌ File terlalu besar (max 5MB)', 'error'); return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    proofBase64 = e.target.result;
    const preview = document.getElementById('proofPreview');
    if (preview) {
      preview.innerHTML = `<img src="${proofBase64}" class="proof-img" alt="Bukti">`;
      preview.classList.add('has-proof');
    }
    showToast('✅ Bukti bayar terupload', 'success');
  };
  reader.readAsDataURL(file);
};

// ── Submit Order ──────────────────────────────────────────────
export async function submitOrder() {
  if (!currentUser || !checkoutProduct) return;
  if (!proofBase64) {
    showToast('⚠️ Upload bukti pembayaran terlebih dahulu', 'warning');
    return;
  }

  const submitBtn = document.getElementById('submitOrderBtn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Memproses...'; }

  try {
    const total = checkoutProduct.price * checkoutQty;
    const orderId = 'DMK-' + Date.now().toString(36).toUpperCase();

    const orderData = {
      orderId,
      uid: currentUser.uid,
      username: currentUserData?.username || currentUser.displayName,
      productId: checkoutProduct.id,
      productName: checkoutProduct.title,
      quantity: checkoutQty,
      totalPrice: total,
      paymentMethod: checkoutPayment,
      paymentProof: proofBase64,
      status: 'waiting',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      notes: document.getElementById('orderNotes')?.value || ''
    };

    const ref = await addDoc(collection(db, 'orders'), orderData);

    // Update user stats
    await updateDoc(doc(db, 'users', currentUser.uid), {
      totalOrders: increment(1)
    });

    // Stop timer
    clearCheckoutTimer();
    closeModal('checkoutModal');

    // Show success
    showOrderSuccess({ ...orderData, firestoreId: ref.id });
    showToast('✅ Pesanan berhasil dibuat!', 'success');

  } catch (err) {
    console.error('Order error:', err);
    showToast('❌ Gagal membuat pesanan: ' + err.message, 'error');
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Konfirmasi Pesanan'; }
  }
}

// ── Order Success Animation ───────────────────────────────────
function showOrderSuccess(order) {
  const modal = document.getElementById('successModal');
  if (!modal) return;
  document.getElementById('successOrderId').textContent = order.orderId;
  document.getElementById('successProduct').textContent = order.productName;
  document.getElementById('successTotal').textContent = formatRupiah(order.totalPrice);
  document.getElementById('successMethod').textContent = order.paymentMethod.toUpperCase();
  openModal('successModal');
  launchConfetti();
}

// ── Confetti ──────────────────────────────────────────────────
function launchConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const pieces = Array.from({ length: 80 }, () => ({
    x: Math.random() * canvas.width,
    y: -20,
    vy: 3 + Math.random() * 3,
    vx: (Math.random() - 0.5) * 2,
    color: ['#ff004c','#ff2d75','#ff4da6','#fff','#ffcc00'][Math.floor(Math.random() * 5)],
    size: 6 + Math.random() * 6,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 5
  }));
  let frame = 0;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      p.y += p.vy; p.x += p.vx; p.rotation += p.rotSpeed;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
      ctx.restore();
    });
    frame++;
    if (frame < 150) requestAnimationFrame(draw);
    else { canvas.style.display = 'none'; ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }
  draw();
}

// ── Countdown Timer ───────────────────────────────────────────
function startCheckoutTimer(seconds) {
  clearCheckoutTimer();
  let remaining = seconds;
  const el = document.getElementById('checkoutTimer');
  function update() {
    if (!el) return;
    const m = Math.floor(remaining / 60).toString().padStart(2,'0');
    const s = (remaining % 60).toString().padStart(2,'0');
    el.textContent = `${m}:${s}`;
    if (remaining <= 0) {
      clearCheckoutTimer();
      closeModal('checkoutModal');
      showToast('⏰ Waktu pembayaran habis', 'warning');
    }
    remaining--;
  }
  update();
  checkoutTimer = setInterval(update, 1000);
}

function clearCheckoutTimer() {
  if (checkoutTimer) { clearInterval(checkoutTimer); checkoutTimer = null; }
}

// ── User: Listen Orders ───────────────────────────────────────
export function listenUserOrders(uid, callback) {
  const q = query(
    collection(db, 'orders'),
    where('uid', '==', uid),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── Admin: Listen All Orders ──────────────────────────────────
export function adminListenOrders(callback, statusFilter = '') {
  let q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  if (statusFilter) q = query(collection(db, 'orders'), where('status', '==', statusFilter), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── Admin: Update Order Status ────────────────────────────────
export async function adminUpdateOrderStatus(orderId, status) {
  await updateDoc(doc(db, 'orders', orderId), {
    status,
    updatedAt: serverTimestamp()
  });
}

// ── Order Status Badge ────────────────────────────────────────
export function getStatusBadge(status) {
  const map = {
    waiting:    { label: 'Menunggu', class: 'status-waiting', icon: '⏳' },
    paid:       { label: 'Dibayar', class: 'status-paid', icon: '💳' },
    processing: { label: 'Diproses', class: 'status-processing', icon: '⚙️' },
    completed:  { label: 'Selesai', class: 'status-completed', icon: '✅' },
    cancelled:  { label: 'Dibatalkan', class: 'status-cancelled', icon: '❌' }
  };
  const s = map[status] || map.waiting;
  return `<span class="status-badge ${s.class}">${s.icon} ${s.label}</span>`;
}
