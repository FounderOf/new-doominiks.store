// ============================================================
// DOOMINIKS STORE - Admin Module
// Analytics, Product CRUD, Order Management, Broadcasting
// ============================================================

import { db } from '../public/firebase.js';
import {
  collection, query, orderBy, limit, onSnapshot,
  getDocs, getDoc, doc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, where, getCountFromServer
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { adminAddProduct, adminUpdateProduct, adminDeleteProduct, adminListenProducts } from '../public/products.js';
import { adminListenOrders, adminUpdateOrderStatus, getStatusBadge } from '../public/orders.js';
import { showToast, formatRupiah, timeAgo } from '../public/ui.js';

let ordersUnsubscribe = null;
let productsUnsubscribe = null;
let analyticsInterval = null;

// ══════════════════════════════════════════════════════════════
// DASHBOARD ANALYTICS
// ══════════════════════════════════════════════════════════════
export async function loadAnalytics() {
  try {
    // Counts
    const [usersSnap, ordersSnap, productsSnap] = await Promise.all([
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(collection(db, 'orders')),
      getCountFromServer(collection(db, 'products'))
    ]);

    setEl('statTotalUsers',    usersSnap.data().count.toLocaleString('id-ID'));
    setEl('statTotalProducts', productsSnap.data().count.toLocaleString('id-ID'));
    setEl('statTotalOrders',   ordersSnap.data().count.toLocaleString('id-ID'));

    // Revenue from completed orders
    const completedQ = query(collection(db, 'orders'), where('status', '==', 'completed'));
    const completedSnap = await getDocs(completedQ);
    const revenue = completedSnap.docs.reduce((sum, d) => sum + (d.data().totalPrice || 0), 0);
    setEl('statRevenue', formatRupiah(revenue));

    // Waiting orders badge
    const waitingQ = query(collection(db, 'orders'), where('status', '==', 'waiting'));
    const waitingSnap = await getDocs(waitingQ);
    const waitBadge = document.getElementById('waitingOrdersBadge');
    if (waitBadge) {
      waitBadge.textContent = waitingSnap.size;
      waitBadge.style.display = waitingSnap.size > 0 ? 'inline-flex' : 'none';
    }

    // Recent activity
    await loadRecentActivity();
  } catch (err) {
    console.error('Analytics error:', err);
  }
}

async function loadRecentActivity() {
  const container = document.getElementById('recentActivity');
  if (!container) return;

  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(8));
  const snap = await getDocs(q);

  if (snap.empty) {
    container.innerHTML = '<div class="admin-empty">Belum ada aktivitas</div>';
    return;
  }

  container.innerHTML = snap.docs.map(d => {
    const o = d.data();
    return `
      <div class="activity-item">
        <div class="activity-icon">📦</div>
        <div class="activity-body">
          <div class="activity-title"><strong>${o.username}</strong> memesan <em>${o.productName}</em></div>
          <div class="activity-meta">${formatRupiah(o.totalPrice)} · ${timeAgo(o.createdAt)}</div>
        </div>
        ${getStatusBadge(o.status)}
      </div>
    `;
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// ORDERS MANAGEMENT
// ══════════════════════════════════════════════════════════════
export function initOrdersTab(statusFilter = '') {
  const container = document.getElementById('adminOrdersList');
  if (!container) return;
  container.innerHTML = '<div class="admin-loading">Memuat pesanan...</div>';

  if (ordersUnsubscribe) ordersUnsubscribe();
  ordersUnsubscribe = adminListenOrders((orders) => {
    renderAdminOrders(orders, container);
  }, statusFilter);
}

function renderAdminOrders(orders, container) {
  if (!orders.length) {
    container.innerHTML = '<div class="admin-empty">Tidak ada pesanan ditemukan</div>';
    return;
  }

  const search = document.getElementById('orderSearchInput')?.value?.toLowerCase() || '';
  const filtered = search
    ? orders.filter(o =>
        o.orderId?.toLowerCase().includes(search) ||
        o.username?.toLowerCase().includes(search) ||
        o.productName?.toLowerCase().includes(search))
    : orders;

  container.innerHTML = filtered.map(o => `
    <div class="admin-order-card" id="order-${o.id}">
      <div class="aoc-header">
        <div class="aoc-id">#${o.orderId}</div>
        ${getStatusBadge(o.status)}
        <span class="aoc-time">${timeAgo(o.createdAt)}</span>
      </div>
      <div class="aoc-body">
        <div class="aoc-row">
          <span class="aoc-label">👤 Pembeli</span>
          <span>${o.username}</span>
        </div>
        <div class="aoc-row">
          <span class="aoc-label">🎮 Produk</span>
          <span>${o.productName} ×${o.quantity}</span>
        </div>
        <div class="aoc-row">
          <span class="aoc-label">💰 Total</span>
          <span style="color:var(--red-light);font-weight:700">${formatRupiah(o.totalPrice)}</span>
        </div>
        <div class="aoc-row">
          <span class="aoc-label">💳 Metode</span>
          <span>${o.paymentMethod?.toUpperCase()}</span>
        </div>
        ${o.notes ? `<div class="aoc-row"><span class="aoc-label">📝 Catatan</span><span>${o.notes}</span></div>` : ''}
      </div>
      ${o.paymentProof ? `
        <div class="aoc-proof" onclick="openProofModal('${o.id}')">
          <img src="${o.paymentProof}" alt="Bukti" class="proof-thumb">
          <span>Lihat Bukti Pembayaran</span>
        </div>
      ` : ''}
      <div class="aoc-actions">
        ${o.status === 'waiting' ? `
          <button class="aoc-btn aoc-btn-approve" onclick="adminChangeStatus('${o.id}','paid')">✅ Konfirmasi Bayar</button>
        ` : ''}
        ${o.status === 'paid' ? `
          <button class="aoc-btn aoc-btn-process" onclick="adminChangeStatus('${o.id}','processing')">⚙️ Proses</button>
        ` : ''}
        ${o.status === 'processing' ? `
          <button class="aoc-btn aoc-btn-complete" onclick="adminChangeStatus('${o.id}','completed')">✅ Selesaikan</button>
        ` : ''}
        ${(o.status !== 'completed' && o.status !== 'cancelled') ? `
          <button class="aoc-btn aoc-btn-cancel" onclick="adminChangeStatus('${o.id}','cancelled')">❌ Batalkan</button>
        ` : ''}
        ${o.status === 'completed' || o.status === 'cancelled' ? `
          <span style="font-size:0.8rem;color:var(--gray-500)">Pesanan sudah final</span>
        ` : ''}
      </div>
    </div>
  `).join('');
}

window.adminChangeStatus = async (orderId, status) => {
  try {
    await adminUpdateOrderStatus(orderId, status);
    showToast(`✅ Status diubah ke: ${status}`, 'success');

    // Add notification if completed
    if (status === 'completed') {
      const orderDoc = await getDoc(doc(db, 'orders', orderId));
      if (orderDoc.exists()) {
        const o = orderDoc.data();
        await addDoc(collection(db, 'notifications'), {
          title: '✅ Pesanan Selesai',
          message: `Top up ${o.productName} kamu telah berhasil diproses!`,
          type: 'order',
          uid: o.uid,
          createdAt: serverTimestamp(),
          readBy: []
        });
      }
    }
  } catch (err) {
    showToast('❌ Gagal ubah status: ' + err.message, 'error');
  }
};

window.openProofModal = (orderId) => {
  // Show proof in large modal
  const modal = document.getElementById('proofViewModal');
  const img = document.getElementById('proofViewImg');
  if (!modal || !img) return;
  // Get from rendered card
  const card = document.getElementById('order-' + orderId);
  const src = card?.querySelector('.proof-thumb')?.src;
  if (src) { img.src = src; modal.classList.add('modal-active'); }
};

// ══════════════════════════════════════════════════════════════
// PRODUCTS MANAGEMENT
// ══════════════════════════════════════════════════════════════
export function initProductsTab() {
  const container = document.getElementById('adminProductsList');
  if (!container) return;
  container.innerHTML = '<div class="admin-loading">Memuat produk...</div>';

  if (productsUnsubscribe) productsUnsubscribe();
  productsUnsubscribe = adminListenProducts((products) => {
    renderAdminProducts(products, container);
  });
}

function renderAdminProducts(products, container) {
  if (!products.length) {
    container.innerHTML = '<div class="admin-empty">Belum ada produk</div>';
    return;
  }
  container.innerHTML = products.map(p => `
    <div class="admin-product-row">
      <img src="${p.image || 'https://placehold.co/60x60/0f0f0f/ff004c?text=P'}"
           class="ap-img" alt="${p.title}"
           onerror="this.src='https://placehold.co/60x60/0f0f0f/ff004c?text=P'">
      <div class="ap-info">
        <div class="ap-title">${p.title}</div>
        <div class="ap-meta">${p.category || '-'} · Terjual: ${p.sold || 0}</div>
      </div>
      <div class="ap-price">${formatRupiah(p.price)}</div>
      <div class="ap-stock ${p.stock <= 5 ? 'low' : ''}">${p.stock}</div>
      <div class="ap-status">
        <span class="toggle-pill ${p.active ? 'on' : 'off'}" onclick="adminToggleProduct('${p.id}',${!p.active})">
          ${p.active ? '✅' : '⛔'}
        </span>
      </div>
      <div class="ap-actions">
        <button class="ap-btn-edit" onclick="openEditProductModal('${p.id}')">✏️</button>
        <button class="ap-btn-del" onclick="confirmDeleteProduct('${p.id}','${p.title.replace(/'/g,'')}')">🗑️</button>
      </div>
    </div>
  `).join('');
}

window.adminToggleProduct = async (id, state) => {
  try {
    await adminUpdateProduct(id, { active: state });
    showToast(state ? '✅ Produk diaktifkan' : '⛔ Produk dinonaktifkan', 'success');
  } catch (err) {
    showToast('❌ Gagal: ' + err.message, 'error');
  }
};

window.confirmDeleteProduct = (id, name) => {
  if (confirm(`Hapus produk "${name}"? Tindakan ini tidak dapat dibatalkan.`)) {
    adminDeleteProduct(id)
      .then(() => showToast('🗑️ Produk dihapus', 'success'))
      .catch(err => showToast('❌ Gagal hapus: ' + err.message, 'error'));
  }
};

// ── Product Form ──────────────────────────────────────────────
let editingProductId = null;

window.openAddProductModal = () => {
  editingProductId = null;
  resetProductForm();
  document.getElementById('productModalTitle').textContent = '➕ Tambah Produk';
  document.getElementById('productModal').classList.add('modal-active');
};

window.openEditProductModal = async (id) => {
  editingProductId = id;
  const snap = await getDoc(doc(db, 'products', id));
  if (!snap.exists()) return;
  const p = snap.data();
  fillProductForm(p);
  document.getElementById('productModalTitle').textContent = '✏️ Edit Produk';
  document.getElementById('productModal').classList.add('modal-active');
};

function fillProductForm(p) {
  setFormVal('pTitle', p.title || '');
  setFormVal('pDesc', p.description || '');
  setFormVal('pPrice', p.price || '');
  setFormVal('pOrigPrice', p.originalPrice || '');
  setFormVal('pStock', p.stock || '');
  setFormVal('pCategory', p.category || '');
  setFormVal('pImage', p.image || '');
  setFormVal('pBadge', p.badge || '');
  document.getElementById('pActive').checked = p.active !== false;
  document.getElementById('pFeatured').checked = !!p.featured;
  document.getElementById('pPopular').checked = !!p.popular;
}

function resetProductForm() {
  ['pTitle','pDesc','pPrice','pOrigPrice','pStock','pCategory','pImage','pBadge'].forEach(id => setFormVal(id, ''));
  document.getElementById('pActive').checked = true;
  document.getElementById('pFeatured').checked = false;
  document.getElementById('pPopular').checked = false;
}

window.submitProductForm = async () => {
  const btn = document.getElementById('productSubmitBtn');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  try {
    const data = {
      title:         getFormVal('pTitle'),
      description:   getFormVal('pDesc'),
      price:         parseFloat(getFormVal('pPrice')) || 0,
      originalPrice: parseFloat(getFormVal('pOrigPrice')) || null,
      stock:         parseInt(getFormVal('pStock')) || 0,
      category:      getFormVal('pCategory'),
      image:         getFormVal('pImage'),
      badge:         getFormVal('pBadge'),
      active:        document.getElementById('pActive').checked,
      featured:      document.getElementById('pFeatured').checked,
      popular:       document.getElementById('pPopular').checked
    };

    if (!data.title || !data.price) {
      showToast('⚠️ Judul dan harga wajib diisi', 'warning');
      return;
    }

    if (editingProductId) {
      await adminUpdateProduct(editingProductId, data);
      showToast('✅ Produk diperbarui!', 'success');
    } else {
      await adminAddProduct(data);
      showToast('✅ Produk berhasil ditambahkan!', 'success');
    }

    document.getElementById('productModal').classList.remove('modal-active');
  } catch (err) {
    showToast('❌ Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Simpan Produk';
  }
};

// ══════════════════════════════════════════════════════════════
// USERS MANAGEMENT
// ══════════════════════════════════════════════════════════════
export function initUsersTab() {
  const container = document.getElementById('adminUsersList');
  if (!container) return;
  container.innerHTML = '<div class="admin-loading">Memuat pengguna...</div>';

  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(50));
  onSnapshot(q, (snap) => {
    if (snap.empty) { container.innerHTML = '<div class="admin-empty">Belum ada pengguna</div>'; return; }
    container.innerHTML = snap.docs.map(d => {
      const u = d.data();
      return `
        <div class="admin-user-row">
          <img src="${u.avatar || 'https://ui-avatars.com/api/?name=U&background=ff004c&color=fff'}" class="au-avatar" alt="${u.username}">
          <div class="au-info">
            <div class="au-name">${u.username || 'Unknown'}</div>
            <div class="au-email">${u.email || '-'}</div>
          </div>
          <div class="au-role ${u.role === 'admin' ? 'role-admin' : 'role-user'}">${u.role === 'admin' ? '👑 Admin' : '🎮 User'}</div>
          <div class="au-orders">${u.totalOrders || 0} order</div>
          <div class="au-balance">${formatRupiah(u.balance || 0)}</div>
          <div class="au-actions">
            ${u.role !== 'admin' ? `<button class="au-btn-promote" onclick="adminSetRole('${d.id}','admin')">👑</button>` : `<button class="au-btn-demote" onclick="adminSetRole('${d.id}','user')">↓</button>`}
            <button class="au-btn-ban ${u.banned ? 'banned' : ''}" onclick="adminToggleBan('${d.id}',${!u.banned})">${u.banned ? '🔓' : '🔒'}</button>
          </div>
        </div>
      `;
    }).join('');
  });
}

window.adminSetRole = async (uid, role) => {
  if (!confirm(`Ubah role user ini menjadi ${role}?`)) return;
  try {
    await updateDoc(doc(db, 'users', uid), { role });
    showToast(`✅ Role diubah ke ${role}`, 'success');
  } catch (err) { showToast('❌ ' + err.message, 'error'); }
};

window.adminToggleBan = async (uid, state) => {
  if (!confirm(`${state ? 'Ban' : 'Unban'} user ini?`)) return;
  try {
    await updateDoc(doc(db, 'users', uid), { banned: state });
    showToast(state ? '🔒 User dibanned' : '🔓 User di-unban', state ? 'warning' : 'success');
  } catch (err) { showToast('❌ ' + err.message, 'error'); }
};

// ══════════════════════════════════════════════════════════════
// BROADCAST NOTIFICATION
// ══════════════════════════════════════════════════════════════
window.broadcastNotification = async () => {
  const title = document.getElementById('broadcastTitle')?.value?.trim();
  const message = document.getElementById('broadcastMessage')?.value?.trim();
  const type = document.getElementById('broadcastType')?.value || 'promo';

  if (!title || !message) {
    showToast('⚠️ Judul dan pesan wajib diisi', 'warning');
    return;
  }

  try {
    await addDoc(collection(db, 'notifications'), {
      title, message, type,
      createdAt: serverTimestamp(),
      readBy: [],
      global: true
    });
    showToast('📢 Broadcast berhasil dikirim!', 'success');
    document.getElementById('broadcastTitle').value = '';
    document.getElementById('broadcastMessage').value = '';
  } catch (err) {
    showToast('❌ Gagal broadcast: ' + err.message, 'error');
  }
};

// ══════════════════════════════════════════════════════════════
// SETTINGS
// ══════════════════════════════════════════════════════════════
export async function loadSettings() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'global'));
    if (!snap.exists()) return;
    const s = snap.data();
    setFormVal('settingStoreName', s.storeName || 'Doominiks Store');
    setFormVal('settingWhatsapp', s.whatsapp || '');
    setFormVal('settingMaintenanceMsg', s.maintenanceMessage || '');
    if (document.getElementById('settingMaintenance'))
      document.getElementById('settingMaintenance').checked = !!s.maintenanceMode;
  } catch {}
}

window.saveSettings = async () => {
  const btn = document.getElementById('saveSettingsBtn');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  try {
    await updateDoc(doc(db, 'settings', 'global'), {
      storeName: getFormVal('settingStoreName'),
      whatsapp: getFormVal('settingWhatsapp'),
      maintenanceMode: document.getElementById('settingMaintenance')?.checked || false,
      maintenanceMessage: getFormVal('settingMaintenanceMsg'),
      updatedAt: serverTimestamp()
    });
    showToast('✅ Pengaturan disimpan', 'success');
  } catch (err) {
    showToast('❌ Gagal simpan: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Simpan Pengaturan';
  }
};

// ══════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function getFormVal(id) {
  return document.getElementById(id)?.value || '';
}
function setFormVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

export function cleanupAdmin() {
  if (ordersUnsubscribe) ordersUnsubscribe();
  if (productsUnsubscribe) productsUnsubscribe();
  if (analyticsInterval) clearInterval(analyticsInterval);
}
