// ============================================================
// DOOMINIKS STORE - Products Module
// Firestore CRUD + realtime listeners
// ============================================================

import { db } from './firebase.js';
import {
  collection, query, where, orderBy, limit,
  getDocs, getDoc, doc, onSnapshot,
  addDoc, updateDoc, deleteDoc, serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { renderSkeletons, formatRupiah } from './ui.js';
import { openCheckoutModal } from './orders.js';

let productsUnsubscribe = null;

// ── Render Products Grid ──────────────────────────────────────
export function initProductsSection() {
  renderSkeletons('productsGrid', 6);
  loadProductsRealtime();
}

export function loadProductsRealtime() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  const q = query(
    collection(db, 'products'),
    where('active', '==', true),
    orderBy('featured', 'desc'),
    orderBy('sold', 'desc'),
    limit(12)
  );

  if (productsUnsubscribe) productsUnsubscribe();
  productsUnsubscribe = onSnapshot(q, (snapshot) => {
    if (snapshot.empty) {
      grid.innerHTML = renderEmptyProducts();
      return;
    }
    const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProductCards(products, grid);
  }, (err) => {
    console.error('Products listener error:', err);
    grid.innerHTML = renderEmptyProducts();
  });
}

function renderProductCards(products, container) {
  container.innerHTML = products.map(p => `
    <div class="product-card reveal-up reveal-child" data-id="${p.id}">
      ${p.badge ? `<span class="badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
      ${p.popular ? '<span class="badge badge-hot">🔥 HOT</span>' : ''}
      <div class="product-img-wrap">
        <img src="${p.image || 'https://placehold.co/300x200/0f0f0f/ff004c?text=GAME'}"
             alt="${p.title}" class="product-img" loading="lazy"
             onerror="this.src='https://placehold.co/300x200/0f0f0f/ff004c?text=${encodeURIComponent(p.title)}'">
        <div class="product-img-overlay"></div>
      </div>
      <div class="product-body">
        <div class="product-category">${p.category || 'Game'}</div>
        <h3 class="product-title">${p.title}</h3>
        <p class="product-desc">${(p.description || '').slice(0, 60)}${p.description?.length > 60 ? '...' : ''}</p>
        <div class="product-footer">
          <div class="product-price-wrap">
            <span class="product-price">${formatRupiah(p.price)}</span>
            ${p.originalPrice ? `<span class="product-original">${formatRupiah(p.originalPrice)}</span>` : ''}
          </div>
          <div class="stock-indicator ${p.stock <= 5 ? 'stock-low' : 'stock-ok'}">
            ${p.stock <= 0 ? '❌ Habis' : p.stock <= 5 ? `⚠️ ${p.stock} tersisa` : `✅ Tersedia`}
          </div>
        </div>
        <button class="btn-buy btn-ripple ${p.stock <= 0 ? 'btn-disabled' : ''}"
                onclick="window.buyProduct('${p.id}')"
                ${p.stock <= 0 ? 'disabled' : ''}>
          ${p.stock <= 0 ? 'Stok Habis' : '⚡ Beli Sekarang'}
        </button>
      </div>
    </div>
  `).join('');

  // Reinit observers
  requestAnimationFrame(() => {
    if (window.reinitReveal) window.reinitReveal();
  });
}

function renderEmptyProducts() {
  return `<div class="empty-state col-span-full">
    <div class="empty-icon">🎮</div>
    <p>Belum ada produk tersedia</p>
  </div>`;
}

// ── Get Single Product ────────────────────────────────────────
export async function getProduct(productId) {
  const snap = await getDoc(doc(db, 'products', productId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ── Global buy handler ────────────────────────────────────────
window.buyProduct = async (productId) => {
  const product = await getProduct(productId);
  if (!product) return;
  openCheckoutModal(product);
};

// ── Search Products ───────────────────────────────────────────
export async function searchProducts(keyword, categoryFilter = '') {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  renderSkeletons('productsGrid', 6);

  let q = query(collection(db, 'products'), where('active', '==', true));
  const snap = await getDocs(q);
  const kw = keyword.toLowerCase();

  const results = snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(p =>
      (!keyword || p.title?.toLowerCase().includes(kw) || p.description?.toLowerCase().includes(kw)) &&
      (!categoryFilter || p.category === categoryFilter)
    );

  renderProductCards(results, grid);
}

// ── Admin: Add Product ────────────────────────────────────────
export async function adminAddProduct(data) {
  return await addDoc(collection(db, 'products'), {
    ...data,
    sold: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

// ── Admin: Update Product ─────────────────────────────────────
export async function adminUpdateProduct(id, data) {
  return await updateDoc(doc(db, 'products', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

// ── Admin: Delete Product ─────────────────────────────────────
export async function adminDeleteProduct(id) {
  return await deleteDoc(doc(db, 'products', id));
}

// ── Admin: Get All Products ───────────────────────────────────
export function adminListenProducts(callback) {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── Categories ────────────────────────────────────────────────
export async function getCategories() {
  const snap = await getDocs(collection(db, 'categories'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── Trending ─────────────────────────────────────────────────
export async function getTrendingProducts(limitCount = 6) {
  const q = query(
    collection(db, 'products'),
    where('active', '==', true),
    orderBy('sold', 'desc'),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
