// ===== Background fallback chain: webp -> original png -> world-hero =====
const bg = document.getElementById('bg');
const bgChain = ['assets/bg-town.webp', 'assets/world-hero.png'];
bg.addEventListener('error', () => { const next = bgChain.shift(); if (next) bg.src = next; });

// ===== Panel switching via top menu =====
const panels = document.querySelectorAll('.panel');
const buttons = document.querySelectorAll('[data-panel]');
const menu = document.getElementById('menu');
const menuToggle = document.getElementById('menuToggle');

function show(name) {
  panels.forEach(p => {
    const on = p.id === 'panel-' + name;
    p.classList.toggle('is-active', on);
    p.hidden = !on;
  });
  document.querySelectorAll('.menu-btn').forEach(b => b.classList.toggle('is-active', b.dataset.panel === name));
  closeMenu();
}
buttons.forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); show(b.dataset.panel); }));

// ===== Mobile menu =====
function closeMenu() { menu.classList.remove('open'); menuToggle.classList.remove('open'); menuToggle.setAttribute('aria-expanded', 'false'); }
menuToggle.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  menuToggle.classList.toggle('open', open);
  menuToggle.setAttribute('aria-expanded', String(open));
});

// ===== Looping pop-up mascots =====
const layer = document.getElementById('mascotLayer');
const MASCOTS = ['MAGU_face01','MAGU_face02','MAGU_face03','MAGU_face04','MAGU_face05','MAGU_face06']
  .map(n => 'assets/' + n + '.png');
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = innerWidth < 700;
const MAX = isMobile ? 5 : 14;   // concurrent mascots (fewer on mobile to keep taps responsive)
let recentBox = null;

const MOTIONS = ['m-bob', 'm-wiggle', 'm-hop', 'm-sway', 'm-spin'];
function spawn() {
  if (reduce || document.hidden || layer.childElementCount >= MAX) return;
  const wrap = document.createElement('div');
  wrap.className = 'pop';                            // handles pop-in / pop-out lifecycle
  const img = document.createElement('img');
  img.alt = '';
  img.src = MASCOTS[(Math.random() * MASCOTS.length) | 0];
  img.className = 'pop-img ' + MOTIONS[(Math.random() * MOTIONS.length) | 0];
  img.style.animationDuration = (0.7 + Math.random() * 0.9) + 's';  // lively motion
  wrap.appendChild(img);
  const size = 22 + Math.random() * 24;             // 22–46px (≈2× previous)
  const life = 3200 + Math.random() * 2600;         // 3.2–5.8s on screen
  wrap.style.width = size + 'px';
  wrap.style.setProperty('--life', life + 'ms');
  // keep within viewport, bias toward the edges so the center card stays clear
  const vw = innerWidth, vh = innerHeight;
  let x = Math.random() * (vw - size);
  let y = 70 + Math.random() * (vh - size - 90);
  const cx = vw / 2, cy = vh / 2, clearX = Math.min(320, vw * 0.32), clearY = Math.min(260, vh * 0.3);
  if (Math.abs(x + size / 2 - cx) < clearX && Math.abs(y + size / 2 - cy) < clearY) {
    x = (x < cx) ? Math.max(0, x - clearX) : Math.min(vw - size, x + clearX);
  }
  wrap.style.left = x + 'px';
  wrap.style.top = y + 'px';
  wrap.addEventListener('animationend', () => wrap.remove());
  layer.appendChild(wrap);
}

function loop() {
  spawn();
  setTimeout(loop, (isMobile ? 900 : 250) + Math.random() * 450);   // slower spawn on mobile
}
if (!reduce) { for (let i = 0; i < 3; i++) setTimeout(spawn, i * 400); loop(); }

// ===== Day / Night toggle =====
const bgBlur = document.querySelector('.bg-blur');
const dn = document.getElementById('dayNight');
const root = document.documentElement;
const BG_DAY = 'assets/bg-town2.webp';
const BG_NIGHT = 'assets/bg-town2_night.webp';
const skyShift = document.getElementById('skyShift');
let skyT1 = 0, skyT2 = 0;
function applyMode(on) {
  root.classList.toggle('night', on);
  dn.setAttribute('aria-checked', String(on));
  const src = on ? BG_NIGHT : BG_DAY;
  bg.src = src; bgBlur.src = src;
  if (on) startFireworks(); else stopFireworks();
  try { localStorage.setItem('magu-night', on ? '1' : '0'); } catch (e) {}
}
function setNight(on, animate) {
  if (animate === false || reduce) { applyMode(on); return; }
  clearTimeout(skyT1); clearTimeout(skyT2);
  // dusk sweeps in (sunset) or dawn glow rises (sunrise), the scene changes behind it, then it clears
  skyShift.className = on ? 'sky-sunset' : 'sky-sunrise';
  void skyShift.offsetWidth;            // restart transition
  skyShift.style.opacity = '0.97';
  skyT1 = setTimeout(function () { applyMode(on); }, 820);   // swap at the deepest point
  skyT2 = setTimeout(function () { skyShift.style.opacity = '0'; }, 980); // clear into the new time of day
}
dn.addEventListener('click', () => setNight(!root.classList.contains('night'), true));

// ===== Fireworks (night) — launching rockets + varied glowing bursts =====
let fwCanvas, fwCtx, fwW = 0, fwH = 0, fwParticles = [], fwRockets = [], fwRunning = false, fwRAF = 0, fwLast = 0;
function fwResize() { if (!fwCanvas) return; fwW = fwCanvas.width = innerWidth; fwH = fwCanvas.height = innerHeight; }
function fwRocket() {
  fwRockets.push({
    x: fwW * (0.12 + Math.random() * 0.76), y: fwH + 8,
    vx: (Math.random() - 0.5) * 0.8, vy: -(8.4 + Math.random() * 2.6),
    targetY: fwH * (0.1 + Math.random() * 0.3), hue: (Math.random() * 360) | 0
  });
}
function fwAdd(x, y, vx, vy, hue, light, decay, grav, drag, size, flick) {
  fwParticles.push({ x, y, vx, vy, hue, light, life: 1, decay, grav, drag, size, flick });
}
function fwBurst(x, y, hue) {
  const k = Math.random();
  // decay values are low so bursts linger and trail off like real fireworks
  if (k < 0.2) {                                   // crisp ring
    const n = 56, sp = 4.8 + Math.random() * 1.8, h = (hue + 30) | 0;
    for (let i = 0; i < n; i++) { const a = 6.2832 * i / n; fwAdd(x, y, Math.cos(a) * sp, Math.sin(a) * sp, h, 66, 0.0044, 0.022, 0.99, 2.2, false); }
  } else if (k < 0.42) {                            // golden willow (long, drooping tails)
    const n = 88; for (let i = 0; i < n; i++) { const a = Math.random() * 6.2832, sp = 1 + Math.random() * 3.4; fwAdd(x, y, Math.cos(a) * sp, Math.sin(a) * sp, 42 + Math.random() * 14, 62, 0.0024, 0.05, 0.992, 2.6, true); }
  } else if (k < 0.6) {                             // double ring, two hues
    const h2 = (hue + 130 + Math.random() * 90) | 0;
    [[3.4, hue], [5.8, h2]].forEach(function (r) { for (let i = 0; i < 50; i++) { const a = 6.2832 * i / 50; fwAdd(x, y, Math.cos(a) * r[0], Math.sin(a) * r[0], r[1], 66, 0.0046, 0.022, 0.99, 2.2, false); } });
  } else {                                          // grand peony / chrysanthemum
    const n = 130 + (Math.random() * 64 | 0), base = hue + (Math.random() * 40 - 20);
    for (let i = 0; i < n; i++) { const a = Math.random() * 6.2832, sp = 1.4 + Math.random() * 6.6; fwAdd(x, y, Math.cos(a) * sp, Math.sin(a) * sp, base + (Math.random() * 30 - 15), 64, 0.0038 + Math.random() * 0.004, 0.03, 0.99, 1.8 + Math.random() * 1.6, Math.random() < 0.35); }
  }
  // lingering glitter embers that twinkle as they fade
  for (let i = 0; i < 28; i++) { const a = Math.random() * 6.2832, sp = Math.random() * 4.2; fwAdd(x, y, Math.cos(a) * sp, Math.sin(a) * sp, hue, 82, 0.004 + Math.random() * 0.006, 0.03, 0.986, 1.5, true); }
  // bright core flash
  for (let i = 0; i < 16; i++) { const a = Math.random() * 6.2832, sp = Math.random() * 1.5; fwAdd(x, y, Math.cos(a) * sp, Math.sin(a) * sp, hue, 96, 0.04, 0.01, 0.9, 3.2, false); }
}
function fwTick(t) {
  if (!fwRunning) return;
  fwCtx.clearRect(0, 0, fwW, fwH);
  fwCtx.globalCompositeOperation = 'lighter';
  fwCtx.lineCap = 'round';
  for (let i = fwRockets.length - 1; i >= 0; i--) {
    const r = fwRockets[i], px = r.x, py = r.y;
    r.vy += 0.12; r.x += r.vx; r.y += r.vy;
    fwCtx.strokeStyle = 'hsla(' + r.hue + ',90%,82%,.9)'; fwCtx.lineWidth = 2.4;
    fwCtx.beginPath(); fwCtx.moveTo(px, py); fwCtx.lineTo(r.x, r.y); fwCtx.stroke();
    if (r.vy >= -1.2 || r.y <= r.targetY) { fwBurst(r.x, r.y, r.hue); fwRockets.splice(i, 1); }
  }
  for (let i = fwParticles.length - 1; i >= 0; i--) {
    const p = fwParticles[i], px = p.x, py = p.y;
    p.vx *= p.drag; p.vy = p.vy * p.drag + p.grav; p.x += p.vx; p.y += p.vy; p.life -= p.decay;
    if (p.life <= 0) { fwParticles.splice(i, 1); continue; }
    let a = p.life; if (p.flick || p.life < 0.34) a *= 0.42 + 0.58 * Math.random();
    fwCtx.beginPath(); fwCtx.moveTo(px, py); fwCtx.lineTo(p.x, p.y);
    fwCtx.strokeStyle = 'hsla(' + p.hue + ',100%,' + p.light + '%,' + (a * 0.22) + ')'; fwCtx.lineWidth = p.size * 2.6; fwCtx.stroke();   // glow
    fwCtx.beginPath(); fwCtx.moveTo(px, py); fwCtx.lineTo(p.x, p.y);
    fwCtx.strokeStyle = 'hsla(' + p.hue + ',100%,' + Math.min(96, p.light + 26) + '%,' + a + ')'; fwCtx.lineWidth = p.size; fwCtx.stroke(); // core
  }
  fwCtx.globalCompositeOperation = 'source-over';
  if (!document.hidden && t - fwLast > (isMobile ? 850 : 500) + Math.random() * 520 && fwParticles.length < (isMobile ? 700 : 2600)) { fwRocket(); fwLast = t; }
  fwRAF = requestAnimationFrame(fwTick);
}
function startFireworks() {
  if (reduce || fwRunning) return;
  if (!fwCanvas) { fwCanvas = document.getElementById('fireworks'); fwCtx = fwCanvas.getContext('2d'); addEventListener('resize', fwResize); }
  fwResize(); fwRunning = true; fwLast = 0; fwRocket(); fwRocket(); fwRAF = requestAnimationFrame(fwTick);
}
function stopFireworks() {
  fwRunning = false; cancelAnimationFrame(fwRAF); fwParticles = []; fwRockets = [];
  if (fwCtx) fwCtx.clearRect(0, 0, fwW, fwH);
}
// restore last choice
try { if (localStorage.getItem('magu-night') === '1') setNight(true, false); } catch (e) {}

// ===== Background: sparkles + rising balloons =====
(function () {
  if (reduce) return;
  const fx = document.getElementById('fx');
  const balloons = document.getElementById('balloons');
  // sparkles — bigger, brighter, more of them
  const sCols = ['#ffd23f', '#ff8fab', '#5ad1a9', '#5bc2f0', '#b3a4ee', '#ff9f45'];
  const N = isMobile ? 28 : 80;
  for (let i = 0; i < N; i++) {
    const sz = 20 + Math.random() * 30, c = sCols[(Math.random() * sCols.length) | 0];
    const s = document.createElement('span');
    s.className = 'spk';
    s.innerHTML = '<svg width="' + sz + '" height="' + sz + '" viewBox="0 0 24 24"><path d="M12 1.5c.5 5 2.5 7 9 7.5-6.5.5-8.5 2.5-9 9-.5-6.5-2.5-8.5-9-9 6.5-.5 8.5-2.5 9-7.5Z" fill="' + c + '"/></svg>';
    s.style.cssText = 'left:' + (Math.random() * 100) + '%;top:' + (Math.random() * 100) + '%;animation-delay:' + (Math.random() * 3) + 's;animation-duration:' + (2.4 + Math.random() * 2.4) + 's';
    fx.appendChild(s);
  }
  // balloons — more, larger, faster, with strings
  const bCols = ['#ff8fab', '#ffd23f', '#5bc2f0', '#b3a4ee', '#5ad1a9', '#ff9f45'];
  const B = isMobile ? 6 : 16;
  for (let k = 0; k < B; k++) {
    const col = bCols[k % bCols.length], size = 56 + Math.random() * 46;   // ≈2/3 of previous
    const dur = 13 + Math.random() * 9;
    const b = document.createElement('div');
    b.className = 'bln';
    // even horizontal lanes (one balloon per slot + small jitter) so they don't bunch in the middle;
    // negative delay => start mid-flight, so balloons are vertically spread from the first frame
    const leftPct = ((k + 0.5) / B + (Math.random() - 0.5) * 0.7 / B) * 96;
    b.style.cssText = 'left:' + leftPct.toFixed(2) + '%;--sx:' + (Math.random() * 50 - 25) + 'px;animation-duration:' + dur + 's;animation-delay:-' + (Math.random() * dur) + 's';
    b.innerHTML = '<svg width="' + size + '" height="' + (size * 1.6) + '" viewBox="0 0 40 64"><ellipse cx="20" cy="22" rx="18" ry="21" fill="' + col + '"/><ellipse cx="13" cy="14" rx="5" ry="7" fill="rgba(255,255,255,.6)"/><path d="M20 43 l-3 5h6Z" fill="' + col + '"/><path d="M20 48 q5 7 -1 15" stroke="rgba(90,90,90,.38)" stroke-width="1.1" fill="none"/></svg>';
    balloons.appendChild(b);
  }
})();

// ===== Contact form (front-end only demo) =====
const form = document.getElementById('contactForm');
const formMsg = document.getElementById('formMsg');
// Web3Forms access key — get a free key for info@magumagic.net at https://web3forms.com
// (enter that address, the key is emailed instantly) and paste it below. Submissions are
// then delivered straight to that inbox. The key is safe to expose in client code.
const WEB3FORMS_KEY = 'ea4415b9-5faf-439d-960a-1c29218c240a';
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    formMsg.textContent = '必須項目をご入力ください。';
    formMsg.className = 'form-msg err';
    form.reportValidity();
    return;
  }
  const f = new FormData(form);
  const submitBtn = form.querySelector('.submit-btn');
  submitBtn.disabled = true;
  formMsg.textContent = '送信中…'; formMsg.className = 'form-msg';
  try {
    const res = await fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: '【MAGU MAGIC お問い合わせ】' + (f.get('topic') || ''),
        from_name: 'MAGU MAGIC サイト',
        お名前: f.get('name'),
        email: f.get('email'),
        ご用件: f.get('topic'),
        内容: f.get('message')
      })
    });
    const data = await res.json();
    if (data.success) {
      formMsg.textContent = 'お問い合わせを送信しました。ありがとうございます。';
      formMsg.className = 'form-msg ok';
      form.reset();
    } else {
      throw new Error(data.message || 'failed');
    }
  } catch (err) {
    formMsg.textContent = '送信に失敗しました。お手数ですが info@magumagic.net まで直接ご連絡ください。';
    formMsg.className = 'form-msg err';
  } finally {
    submitBtn.disabled = false;
  }
});
