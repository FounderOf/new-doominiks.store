// ============================================================
// DOOMINIKS STORE - Animations Module
// Particles, Glow, Scroll Reveals, Cursor, Magnetic
// ============================================================

// ── Particle System ───────────────────────────────────────────
export class ParticleSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.animFrameId = null;
    this.resize();
    this.createParticles();
    this.animate();
    window.addEventListener('resize', () => this.resize(), { passive: true });
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  createParticles() {
    const count = Math.min(80, Math.floor(window.innerWidth / 15));
    this.particles = Array.from({ length: count }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6 + 0.1,
      color: Math.random() > 0.5 ? '#ff004c' : '#ff2d75',
      pulse: Math.random() * Math.PI * 2,
      pulseSpeed: 0.02 + Math.random() * 0.02
    }));
  }

  animate() {
    if (!this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.particles.forEach(p => {
      // Move
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += p.pulseSpeed;
      const pulsedOpacity = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));

      // Wrap
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Draw glow
      this.ctx.save();
      this.ctx.globalAlpha = pulsedOpacity * 0.3;
      const glow = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 8);
      glow.addColorStop(0, p.color);
      glow.addColorStop(1, 'transparent');
      this.ctx.fillStyle = glow;
      this.ctx.fillRect(p.x - p.size * 8, p.y - p.size * 8, p.size * 16, p.size * 16);

      // Draw core
      this.ctx.globalAlpha = pulsedOpacity;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 6;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    });

    // Draw connections
    this.drawConnections();
    this.animFrameId = requestAnimationFrame(() => this.animate());
  }

  drawConnections() {
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i], b = this.particles[j];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (dist < 120) {
          this.ctx.save();
          this.ctx.globalAlpha = (1 - dist / 120) * 0.15;
          this.ctx.strokeStyle = '#ff004c';
          this.ctx.lineWidth = 0.5;
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.stroke();
          this.ctx.restore();
        }
      }
    }
  }

  destroy() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }
}

// ── Floating Ambient Lights ───────────────────────────────────
export function createAmbientLights(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const lights = [
    { x: '15%', y: '20%', color: '#ff004c', size: 300, opacity: 0.12 },
    { x: '75%', y: '60%', color: '#ff2d75', size: 400, opacity: 0.09 },
    { x: '45%', y: '80%', color: '#ff4da6', size: 250, opacity: 0.07 },
    { x: '85%', y: '10%', color: '#ff004c', size: 200, opacity: 0.10 }
  ];

  lights.forEach((l, i) => {
    const div = document.createElement('div');
    div.className = 'ambient-light';
    div.style.cssText = `
      position:absolute;
      left:${l.x};top:${l.y};
      width:${l.size}px;height:${l.size}px;
      background:radial-gradient(circle,${l.color} 0%,transparent 70%);
      opacity:${l.opacity};
      transform:translate(-50%,-50%);
      animation:ambientFloat ${6 + i}s ease-in-out infinite alternate;
      pointer-events:none;
      border-radius:50%;
      filter:blur(40px);
    `;
    container.appendChild(div);
  });
}

// ── Scroll Reveal Observer ────────────────────────────────────
export function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        // Stagger children
        const children = entry.target.querySelectorAll('.reveal-child');
        children.forEach((child, i) => {
          child.style.transitionDelay = `${i * 0.1}s`;
          child.classList.add('revealed');
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal, .reveal-up, .reveal-fade, .reveal-scale').forEach(el => {
    observer.observe(el);
  });
}

// ── Magnetic Button ───────────────────────────────────────────
export function initMagneticButtons() {
  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.3;
      const dy = (e.clientY - cy) * 0.3;
      btn.style.transform = `translate(${dx}px, ${dy}px) scale(1.05)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0,0) scale(1)';
    });
  });
}

// ── Live Purchase Feed ────────────────────────────────────────
const FAKE_USERS = ['Reza_G4mer','NakamuraXx','SakuraChan','ZephyrSlayer','AkiraBlaze','NinjaStorm99','VixenPro','DragonFlame','PixelKnight','LunaEdge','ShadowRiftX','IceQueenVN','TurboKid88','OniSamurai'];
const FAKE_PRODUCTS = [
  { name: 'Mobile Legends 86 Diamonds', price: 'Rp 19.000' },
  { name: 'Free Fire 70 Diamond', price: 'Rp 15.000' },
  { name: 'PUBG Mobile 60 UC', price: 'Rp 18.000' },
  { name: 'Genshin Impact 980 Genesis Crystal', price: 'Rp 130.000' },
  { name: 'Valorant 475 VP', price: 'Rp 75.000' },
  { name: 'Honkai Star Rail 300 Stellar Jade', price: 'Rp 80.000' },
  { name: 'Netflix 1 Bulan', price: 'Rp 55.000' },
  { name: 'Spotify Premium 1 Bulan', price: 'Rp 35.000' },
  { name: 'Steam Wallet $10', price: 'Rp 158.000' },
];

export function startLivePurchaseFeed() {
  const container = document.getElementById('liveFeedContainer');
  if (!container) return;

  function push() {
    const user = FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
    const prod = FAKE_PRODUCTS[Math.floor(Math.random() * FAKE_PRODUCTS.length)];
    const toast = document.createElement('div');
    toast.className = 'live-purchase-toast';
    toast.innerHTML = `
      <div class="live-dot"></div>
      <div class="live-info">
        <strong>${user}</strong> baru saja membeli
        <span>${prod.name}</span>
        <em>${prod.price}</em>
      </div>
    `;
    container.prepend(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 500);
    }, 4000);
    if (container.children.length > 4) container.lastChild?.remove();
  }

  push();
  setInterval(push, 4500 + Math.random() * 3000);
}

// ── Neon Text Flicker ─────────────────────────────────────────
export function initNeonFlicker() {
  const elements = document.querySelectorAll('.neon-flicker');
  elements.forEach(el => {
    setInterval(() => {
      if (Math.random() > 0.97) {
        el.style.opacity = '0.4';
        setTimeout(() => el.style.opacity = '1', 80);
      }
    }, 500);
  });
}

// ── Number Ticker (Stats) ─────────────────────────────────────
export function initStatCounters() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count || '0');
        let current = 0;
        const step = target / 80;
        const timer = setInterval(() => {
          current = Math.min(current + step, target);
          el.textContent = Math.floor(current).toLocaleString('id-ID');
          if (current >= target) clearInterval(timer);
        }, 20);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
}

// ── Glitch Text Effect ────────────────────────────────────────
export function initGlitchEffect() {
  document.querySelectorAll('.glitch').forEach(el => {
    el.setAttribute('data-text', el.textContent);
  });
}

// ── Testimonial Slider ────────────────────────────────────────
export function initTestimonialSlider() {
  const track = document.getElementById('testimonialTrack');
  if (!track) return;
  let pos = 0;
  const cards = track.querySelectorAll('.testimonial-card');
  const total = cards.length;
  let current = 0;

  function slide() {
    current = (current + 1) % total;
    const cardW = cards[0]?.offsetWidth + 24 || 320;
    track.style.transform = `translateX(-${current * cardW}px)`;
  }

  setInterval(slide, 4000);
}

// ── Flash Sale Countdown ──────────────────────────────────────
export function initFlashSaleCountdown(endTime) {
  const el = document.getElementById('flashCountdown');
  if (!el) return;

  function update() {
    const now = Date.now();
    const diff = Math.max(0, endTime - now);
    const h = Math.floor(diff / 3600000).toString().padStart(2,'0');
    const m = Math.floor((diff % 3600000) / 60000).toString().padStart(2,'0');
    const s = Math.floor((diff % 60000) / 1000).toString().padStart(2,'0');
    el.innerHTML = `<span>${h}</span>:<span>${m}</span>:<span>${s}</span>`;
    if (diff === 0) { el.textContent = 'SELESAI'; clearInterval(timer); }
  }

  update();
  const timer = setInterval(update, 1000);
}
