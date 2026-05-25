// ============================================================
// DOOMINIKS STORE - Products Module
// ============================================================

import { db } from './firebase.js';
import {
  collection, query, where, orderBy, limit,
  getDocs, getDoc, doc, onSnapshot,
  addDoc, updateDoc, deleteDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { renderSkeletons, formatRupiah } from './ui.js';

let productsUnsubscribe = null;

// ── Init Products ─────────────────────────────────────────────
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
  productsUnsubscribe = onSnapshot(q, (snap) => {
    if (snap.empty) { grid.innerHTML = emptyState(); return; }
    renderProductCards(snap.docs.map(d => ({ id: d.id, ...d.data() })), grid);
  }, () => { grid.innerHTML = emptyState(); });
}

function renderProductCards(products, container) {
  container.innerHTML = products.map(p => `
    <div class="product-card reveal-up reveal-child" data-id="${p.id}">
      ${p.badge   ? `<span class="badge badge-${p.badge.toLowerCase()}">${p.badge}</span>` : ''}
      ${p.popular ? `<span class="badge badge-hot" style="top:12px;left:${p.badge?'70px':'12px'}">🔥 HOT</span>` : ''}
      <div class="product-img-wrap">
        <img src="${p.image || 'https://placehold.co/300x200/0f0f0f/ff004c?text=GAME'}"
             alt="${p.title}" class="product-img" loading="lazy"
             onerror="this.src='https://placehold.co/300x200/0f0f0f/ff004c?text=GAME'">
        <div class="product-img-overlay"></div>
      </div>
      <div class="product-body">
        <div class="product-category">${p.category || 'Game'}</div>
        <h3 class="product-title">${p.title}</h3>
        <p class="product-desc">${(p.description||'').slice(0,60)}${(p.description?.length||0)>60?'...':''}</p>
        <div class="product-footer">
          <div>
            <span class="product-price">${formatRupiah(p.price)}</span>
            ${p.originalPrice ? `<span class="product-original">${formatRupiah(p.originalPrice)}</span>` : ''}
          </div>
          <div class="stock-indicator ${p.stock<=5?'stock-low':'stock-ok'}">
            ${p.stock<=0 ? '❌ Habis' : p.stock<=5 ? `⚠️ ${p.stock} tersisa` : '✅ Ready'}
          </div>
        </div>
        <button class="btn-buy btn-ripple ${p.stock<=0?'btn-disabled':''}"
                onclick="window.buyProduct('${p.id}')"
                ${p.stock<=0?'disabled':''}>
          ${p.stock<=0 ? 'Stok Habis' : '⚡ Beli Sekarang'}
        </button>
      </div>
    </div>
  `).join('');
  requestAnimationFrame(() => { if (window.reinitReveal) window.reinitReveal(); });
}

function emptyState() {
  return `<div class="empty-state col-span-full"><div class="empty-icon">🎮</div><p>Belum ada produk tersedia</p></div>`;
}

export async function getProduct(id) {
  const snap = await getDoc(doc(db, 'products', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function searchProducts(keyword, category = '') {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;
  renderSkeletons('productsGrid', 6);
  const snap = await getDocs(query(collection(db, 'products'), where('active','==',true)));
  const kw   = keyword.toLowerCase();
  const res  = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .filter(p => (!kw || p.title?.toLowerCase().includes(kw)) && (!category || p.category === category));
  renderProductCards(res, grid);
}

// ── Admin CRUD ────────────────────────────────────────────────
export const adminAddProduct    = (data) => addDoc(collection(db, 'products'), { ...data, sold: 0, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
export const adminUpdateProduct = (id, data) => updateDoc(doc(db, 'products', id), { ...data, updatedAt: serverTimestamp() });
export const adminDeleteProduct = (id) => deleteDoc(doc(db, 'products', id));
export const adminListenProducts = (cb) => onSnapshot(query(collection(db, 'products'), orderBy('createdAt','desc')), snap => cb(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
