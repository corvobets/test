/* =====================================================================
   CORVO BETS 15s V3 — engine (vertical, 1080×1920)
   Helpers, brand stage, logo, premium phone mockup whose screen plays the
   real screen recording (assets/rec), the real summary card (IMG_1132),
   post-processing and the deterministic render loop.
   comp-vertical.js defines drawScene(t) and calls boot().
   ===================================================================== */
const Q = new URLSearchParams(location.search);
const W = window.FORMAT.w, H = window.FORMAT.h, FPS = 60, DUR = TL.DUR;
const SUB = +(Q.get('sub') || 3), SHUTTER = 0.5;
const RENDER = Q.has('render');
if (RENDER) document.body.classList.add('render');
const { EV, BEAT } = TL;

const cv = document.getElementById('cv'); cv.width = W; cv.height = H;
const out = cv.getContext('2d');
const mk = (w = W, h = H) => { const k = document.createElement('canvas'); k.width = w; k.height = h; return k; };
const FRAME_CV = mk();
let c = FRAME_CV.getContext('2d');

const P = { lime: '#C8F000', purple: '#0E0934', violet: '#9641FD', white: '#FFFFFF', cta: '#0A0A0F' };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const prog = (t, a, b) => clamp((t - a) / (b - a));
const lerp = (a, b, t) => a + (b - a) * t;
const eOutExpo = x => x >= 1 ? 1 : 1 - Math.pow(2, -10 * x);
const eInExpo = x => x <= 0 ? 0 : Math.pow(2, 10 * x - 10);
const eInOutExpo = x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2;
const eOutCubic = x => 1 - Math.pow(1 - x, 3);
const eInCubic = x => x * x * x;
const eInOutCubic = x => x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const eInOutSine = x => -(Math.cos(Math.PI * x) - 1) / 2;
const eOutQuart = x => 1 - Math.pow(1 - x, 4);
const eInOutQuart = x => x < .5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2;
const eOutBack = (x, k = 1.4) => 1 + (k + 1) * Math.pow(x - 1, 3) + k * Math.pow(x - 1, 2);
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function kf(t, keys, ease = eInOutCubic) {
  const mix = (a, b, e) => typeof a === 'number' ? lerp(a, b, e) : Object.fromEntries(Object.keys(a).map(k => [k, lerp(a[k], b[k] ?? a[k], e)]));
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) { const [t0, v0] = keys[i - 1], [t1, v1, e2] = keys[i]; return mix(v0, v1, (e2 || ease)(prog(t, t0, t1))); }
  return keys[keys.length - 1][1];
}

/* ---------- drawing helpers ---------- */
function reset(ctx = c) {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.letterSpacing = '0px'; ctx.setLineDash([]); ctx.filter = 'none';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.imageSmoothingQuality = 'high';
}
function M(size, w = 900, it = false, ctx = c) { ctx.font = `${it ? 'italic ' : ''}${w} ${size}px Montserrat`; }
function tw(s, size, w = 900, ls = 0) { M(size, w); c.letterSpacing = ls + 'px'; const m = c.measureText(s).width; c.letterSpacing = '0px'; return m; }
function txt(s, x, y, size, o = {}) {
  const { w = 900, it = false, col = P.white, align = 'left', ls = 0, a = 1 } = o;
  if (a <= 0) return;
  M(size, w, it); c.letterSpacing = ls + 'px'; c.textAlign = align; c.fillStyle = col;
  const ga = c.globalAlpha; c.globalAlpha = ga * a; c.fillText(s, x, y); c.globalAlpha = ga; c.letterSpacing = '0px'; c.textAlign = 'left';
}
function rr(x, y, w, h, r, ctx = c) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
const SLANT = Math.tan(11.6 * Math.PI / 180);   // the BETS-tag angle
// one line of kinetic type: rises from a clipped baseline box, exits upward. Returns its width.
function lineRise(s, x, y, size, t, tIn, tOut = null, o = {}) {
  const { w = 900, col = P.white, align = 'left', ls = -size * 0.02, dur = 0.5, a = 1, outDur = 0.32 } = o;
  M(size, w); c.letterSpacing = ls + 'px';
  const wd = c.measureText(s).width, x0 = align === 'center' ? x - wd / 2 : align === 'right' ? x - wd : x;
  const pin = eOutExpo(prog(t, tIn, tIn + dur)), pout = tOut == null ? 0 : eInCubic(prog(t, tOut, tOut + outDur));
  if (pin > 0 && pout < 1 && a > 0) {
    c.save(); c.globalAlpha *= a * (1 - pout);
    c.beginPath(); c.rect(x0 - size, y - size * 1.02, wd + size * 2, size * 1.3); c.clip();
    c.fillStyle = col; c.textAlign = 'left';
    c.fillText(s, x0, y + (1 - pin) * size * 1.15 - pout * size * 1.25);
    c.restore();
  }
  c.letterSpacing = '0px';
  return wd;
}
function fitSize(s, maxW, size, w = 900, lsK = -0.02) { const m = tw(s, size, w, size * lsK); return m > maxW ? size * maxW / m : size; }

/* ---------- assets ---------- */
const IMG = {};
let REC = null, SCROLL = null;
async function loadJSON(u) { return (await fetch(u)).json(); }
function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => im.decode().then(() => res(im), () => res(im)); im.onerror = rej; im.src = src; }); }
const FS = {                  // recording frame store (LRU) + miss tracking for deterministic prefetch
  cache: new Map(), misses: new Set(), limit: 24,
  get(i) {
    if (!REC) return null;
    i = clamp(Math.round(i), 0, REC.count - 1);
    const key = `assets/rec/f_${String(i).padStart(4, '0')}.webp`;
    const hit = this.cache.get(key);
    if (hit) { this.cache.delete(key); this.cache.set(key, hit); return hit; }
    this.misses.add(key); return null;
  },
  async fill() {
    const keys = [...this.misses]; this.misses.clear();
    await Promise.all(keys.map(async k => { this.cache.set(k, await loadImage(k)); }));
    while (this.cache.size > this.limit) this.cache.delete(this.cache.keys().next().value);
  },
};

/* ---------- stage: deep purple + light columns ---------- */
const COL_SPRITE = (() => {
  const s = mk(64, 540), x = s.getContext('2d');
  for (let i = 0; i < 64; i++) {
    const d = (i - 31.5) / 32, a = Math.exp(-d * d * 5);
    const g = x.createLinearGradient(0, 0, 0, 540);
    g.addColorStop(0, `rgba(150,65,253,${a})`); g.addColorStop(.45, `rgba(120,50,240,${a * .3})`); g.addColorStop(.8, `rgba(140,60,250,${a * .5})`); g.addColorStop(1, `rgba(160,80,255,${a * .85})`);
    x.fillStyle = g; x.fillRect(i, 0, 1, 540);
  }
  return s;
})();
const COLS = (() => { const r = mulberry32(5); return Array.from({ length: 14 }, (_, k) => {
  const side = k % 2, x = side ? W - Math.pow(r(), 1.5) * W * 0.4 : Math.pow(r(), 1.5) * W * 0.4;
  return { x, w: (50 + r() * 200) * Math.max(W, H) / 1920, a: 0.16 + r() * 0.45, v: (r() - .5) * 18, ph: r() * 6 };
}); })();
// hit energy: decays after each musical accent (stage-light bursts + camera punch)
const HITS = [[EV.hit, 1], [EV.num, 0.6], [EV.tag, 0.35], [EV.s2, 0.3], [EV.reveal, 1.1], [EV.ret, 0.45], [EV.final, 1], [EV.cta, 0.3], [EV.stinger, 0.55]];
const hitK = t => HITS.reduce((a, [h, w]) => a + (t >= h ? w * Math.exp(-(t - h) * 9) : 0), 0);
function stage(t, o = {}) {
  const { glowY = 0.62, glow = 1 } = o, light = (o.light ?? 1) * (1 + 1.6 * hitK(t));
  c.fillStyle = P.purple; c.fillRect(-50, -50, W + 100, H + 100);
  if (light <= 0) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const k of COLS) {
    const x = k.x + k.v * t, fl = 0.85 + 0.15 * Math.sin(t * 1.1 + k.ph);
    c.globalAlpha = k.a * light * fl * 0.5; c.drawImage(COL_SPRITE, x - k.w / 2, -20, k.w, H + 40);
  }
  const R = Math.max(W, H) * 0.5, g = c.createRadialGradient(W / 2, H * glowY, 0, W / 2, H * glowY, R);
  g.addColorStop(0, `rgba(90,40,200,${0.32 * light * glow})`); g.addColorStop(1, 'rgba(90,40,200,0)');
  c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.restore();
}
// a copy of the stage over [0,y0] (solid) fading out to y1 — content passes "under" it. y0 > y1 fades upward.
const STAGE_CV = mk(), stx = STAGE_CV.getContext('2d');
function stageOverlay(t, y0, y1, o = {}) {
  const save = c; c = stx; reset(stx); stage(t, o); c = save;
  stx.globalCompositeOperation = 'destination-in';
  const g = stx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  stx.fillStyle = g; stx.fillRect(0, 0, W, H); stx.globalCompositeOperation = 'source-over';
  c.drawImage(STAGE_CV, 0, 0);
}

/* ---------- logo ---------- */
const LOGO_W = 769, LOGO_H = 183;
function logoAt(cx, cy, w, o = {}) { const h = w * LOGO_H / LOGO_W; CorvoLogo.draw(c, cx - w / 2, cy - h / 2, w, o); }
function logoReveal(cx, cy, w, t, t0, o = {}) {
  const { a = 1, shine = true } = o;
  const h = w * LOGO_H / LOGO_W, x0 = cx - w / 2, y0 = cy - h / 2;
  const ps = eOutExpo(prog(t, t0, t0 + 0.45)), pw = eOutExpo(prog(t, t0 + 0.06, t0 + 0.55)), pt = eOutExpo(prog(t, t0 + 0.16, t0 + 0.6));
  if (ps <= 0 || a <= 0) return;
  c.save(); c.globalAlpha *= a;
  const symCx = x0 + 0.13 * w, symCy = cy;
  c.save(); c.translate(symCx, symCy); const sc = lerp(1.5, 1, ps); c.scale(sc, sc); c.translate(-symCx, -symCy); c.globalAlpha *= clamp(ps * 3);
  CorvoLogo.draw(c, x0, y0, w, { word: 0, tag: 0 }); c.restore();
  c.save(); c.beginPath(); c.rect(x0 + 0.24 * w, y0 - 20, (w * 0.8) * pw, h + 40); c.clip(); CorvoLogo.draw(c, x0, y0, w, { symbol: 0, tag: 0 }); c.restore();
  c.save(); c.translate((1 - pt) * w * 0.06, 0); c.globalAlpha *= clamp(pt * 2); CorvoLogo.draw(c, x0, y0, w, { symbol: 0, word: 0 }); c.restore();
  c.restore();
  if (shine) logoShine(cx, cy, w, prog(t, t0 + 0.35, t0 + 1.05), a);
}
const SHINE_C = mk(2000, 520), sctx = SHINE_C.getContext('2d');
function logoShine(cx, cy, w, p, a = 1) {
  if (p <= 0 || p >= 1) return;
  const h = w * LOGO_H / LOGO_W, ow = Math.ceil(w + 40), oh = Math.ceil(h + 40);
  sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalCompositeOperation = 'source-over'; sctx.clearRect(0, 0, SHINE_C.width, SHINE_C.height);
  CorvoLogo.draw(sctx, 20, 20, w);
  sctx.globalCompositeOperation = 'source-in';
  const x = lerp(-w * 0.2, w * 1.2, eInOutSine(p)) + 20, g = sctx.createLinearGradient(x - 90, 0, x + 90, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = g; sctx.fillRect(0, 0, ow, oh);
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.5 * a; c.drawImage(SHINE_C, 0, 0, ow, oh, cx - w / 2 - 20, cy - h / 2 - 20, ow, oh); c.restore();
}
function tgPlane(cx, cy, s, col) {
  c.save(); c.translate(cx, cy); c.scale(s / 100, s / 100); c.fillStyle = col;
  c.beginPath(); c.moveTo(-48, -2); c.lineTo(42, -38); c.quadraticCurveTo(48, -40, 46, -33); c.lineTo(30, 40); c.quadraticCurveTo(28, 46, 22, 42);
  c.lineTo(0, 26); c.lineTo(-12, 38); c.quadraticCurveTo(-16, 41, -16, 36); c.lineTo(-14, 18); c.lineTo(28, -22); c.lineTo(-20, 12); c.lineTo(-46, 4); c.quadraticCurveTo(-52, 1, -48, -2); c.closePath(); c.fill();
  c.restore();
}

/* =====================================================================
   PHONE — the screen shows the real recording (assets/rec).
   Screen texture: 990 × 2145 (iPhone 19.5:9). A plain white top inset
   (no invented status-bar content), then the recording frame at its own
   scroll position; rows below the frame come from the strip assembled from
   the same recording (identical pixels), so the taller screen stays filled.
   ===================================================================== */
const SW = 990, SH = 2145, STATUS = 118;
const SCR = mk(SW, SH), scx = SCR.getContext('2d');
let SCR_KEY = null;
// st: {off, frame} from TL.makeScroll → returns false if a frame is still loading
function buildScreen(st) {
  const key = st.off.toFixed(2) + '|' + st.frame;
  if (key === SCR_KEY) return true;
  const X = scx, fr = st.frame == null ? null : FS.get(st.frame);
  if (st.frame != null && !fr) return false;
  X.setTransform(1, 0, 0, 1, 0, 0); X.imageSmoothingQuality = 'high';
  X.fillStyle = '#FFFFFF'; X.fillRect(0, 0, SW, SH);
  X.drawImage(IMG.strip, 0, STATUS - st.off);
  if (fr) X.drawImage(fr, 0, STATUS + REC.frames[st.frame].off - st.off);
  X.fillStyle = '#FFFFFF'; X.fillRect(0, 0, SW, STATUS);
  SCR_KEY = key; return true;
}
function rot3(v, ax, ay, az) {
  let [x, y, z] = v;
  let c1 = Math.cos(ax), s1 = Math.sin(ax); [y, z] = [y * c1 - z * s1, y * s1 + z * c1];
  c1 = Math.cos(ay); s1 = Math.sin(ay); [x, z] = [x * c1 + z * s1, -x * s1 + z * c1];
  c1 = Math.cos(az); s1 = Math.sin(az); [x, y] = [x * c1 - y * s1, x * s1 + y * c1];
  return [x, y, z];
}
function projector(o) {
  const { cx, cy, s, rx = 0, ry = 0, rz = 0, D = 3600 } = o;
  return (x, y, z = 0) => { const [X, Y, Z] = rot3([x, y, z], rx, ry, rz); const k = D / (D + Z); return [cx + X * s * k, cy + Y * s * k, Z]; };
}
const phonePt = (ph, u, v) => projector(ph)(u - SW / 2, v - SH / 2, -DEPTH / 2 - 0.5);
function drawTexMesh(tex, proj, uw, vh, nx = 6, ny = 12) {
  const pts = [];
  for (let j = 0; j <= ny; j++) { const row = []; for (let i = 0; i <= nx; i++) { const u = i / nx * uw, v = j / ny * vh; row.push({ u, v, p: proj(u, v) }); } pts.push(row); }
  const tri = (A, B, C2) => {
    const [x0, y0] = A.p, [x1, y1] = B.p, [x2, y2] = C2.p;
    const du1 = B.u - A.u, dv1 = B.v - A.v, du2 = C2.u - A.u, dv2 = C2.v - A.v, det = du1 * dv2 - du2 * dv1;
    if (Math.abs(det) < 1e-6) return;
    const a = ((x1 - x0) * dv2 - (x2 - x0) * dv1) / det, b = ((y1 - y0) * dv2 - (y2 - y0) * dv1) / det;
    const cc = ((x2 - x0) * du1 - (x1 - x0) * du2) / det, d = ((y2 - y0) * du1 - (y1 - y0) * du2) / det;
    const e = x0 - a * A.u - cc * A.v, f = y0 - b * A.u - d * A.v;
    const mx = (x0 + x1 + x2) / 3, my = (y0 + y1 + y2) / 3, ex = k => [k[0] + (k[0] - mx) * 0.02 + Math.sign(k[0] - mx) * 0.7, k[1] + (k[1] - my) * 0.02 + Math.sign(k[1] - my) * 0.7];
    c.save(); c.beginPath(); c.moveTo(...ex(A.p)); c.lineTo(...ex(B.p)); c.lineTo(...ex(C2.p)); c.closePath(); c.clip();
    c.transform(a, b, cc, d, e, f);
    const us = [A.u, B.u, C2.u], vs = [A.v, B.v, C2.v];
    const su = Math.max(0, Math.min(...us) - 2), sv = Math.max(0, Math.min(...vs) - 2), eu = Math.min(uw, Math.max(...us) + 2), ev = Math.min(vh, Math.max(...vs) + 2);
    c.drawImage(tex, su, sv, eu - su, ev - sv, su, sv, eu - su, ev - sv);
    c.restore();
  };
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { const A = pts[j][i], B = pts[j][i + 1], C2 = pts[j + 1][i], D2 = pts[j + 1][i + 1]; tri(A, B, D2); tri(A, D2, C2); }
}
function roundedOutline(w, h, r, n = 8) {
  const pts = [], corner = (cx, cy, a0) => { for (let k = 0; k <= n; k++) { const a = a0 + k / n * Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  corner(w / 2 - r, -h / 2 + r, -Math.PI / 2); corner(w / 2 - r, h / 2 - r, 0); corner(-w / 2 + r, h / 2 - r, Math.PI / 2); corner(-w / 2 + r, -h / 2 + r, Math.PI);
  return pts;
}
const BEZ = 32, PHW = SW + BEZ * 2, PHH = SH + BEZ * 2, PHR = 160, SCRR = 130, DEPTH = 42;
const OUTLINE = roundedOutline(PHW, PHH, PHR), INNER = roundedOutline(PHW - 10, PHH - 10, PHR - 5), SCREEN_OUT = roundedOutline(SW, SH, SCRR);
function convexHull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const poly = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
// o: phone state {cx, cy, s, rx, ry, rz}; opts.dim darkens the screen; opts.slot = [u0, v0, u1, v1] hole left by a lifted card
function drawPhone(o, opts = {}) {
  const { dim = 0, slot = null, slotA = 0, a = 1, shadow = 1 } = opts;
  if (a <= 0) return;
  const proj = projector(o);
  c.save(); c.globalAlpha *= a;
  const front = OUTLINE.map(([x, y]) => proj(x, y, -DEPTH / 2)), back = OUTLINE.map(([x, y]) => proj(x, y, DEPTH / 2));
  if (shadow > 0) {
    c.save(); c.globalAlpha *= 0.55 * shadow; c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = 90 * o.s; c.shadowOffsetY = 50 * o.s;
    c.fillStyle = '#05040C'; poly(front); c.fill(); c.restore();
  }
  const hull = convexHull(front.concat(back).map(p => [p[0], p[1]]));
  const g = c.createLinearGradient(o.cx - PHW * 0.5 * o.s, o.cy - PHH * 0.5 * o.s, o.cx + PHW * 0.5 * o.s, o.cy + PHH * 0.5 * o.s);
  g.addColorStop(0, '#6B5BD6'); g.addColorStop(0.3, '#2B2548'); g.addColorStop(0.55, '#1A1730'); g.addColorStop(0.85, '#3B3370'); g.addColorStop(1, '#9A86FF');
  c.fillStyle = g; poly(hull); c.fill();
  c.fillStyle = '#0B0A12'; poly(front); c.fill();
  const inner = INNER.map(([x, y]) => proj(x, y, -DEPTH / 2 - 0.2));
  c.strokeStyle = 'rgba(190,170,255,0.35)'; c.lineWidth = Math.max(1, 3 * o.s); poly(front); c.stroke();
  c.fillStyle = '#000'; poly(inner); c.fill();
  [[-1, -620, 96], [-1, -450, 160], [-1, -255, 160], [1, -470, 250]].forEach(([side, y, h]) => {
    const x = side * (PHW / 2 + 5), q = [[x - 6, y], [x + 6, y], [x + 6, y + h], [x - 6, y + h]].map(([u, v]) => proj(u, v, 0));
    c.fillStyle = '#2A2445'; poly(q); c.fill();
  });
  const sp = SCREEN_OUT.map(([x, y]) => proj(x, y, -DEPTH / 2 - 0.5));
  c.save(); poly(sp); c.clip();
  const flat = Math.abs(o.rx || 0) + Math.abs(o.ry || 0) < 1e-3;
  if (flat) {
    const k = 3600 / (3600 - DEPTH / 2 - 0.5), s = o.s * k;
    c.save(); c.translate(o.cx, o.cy); c.rotate(o.rz || 0); c.scale(s, s); c.drawImage(SCR, -SW / 2, -SH / 2); c.restore();
  } else drawTexMesh(SCR, (u, v) => proj(u - SW / 2, v - SH / 2, -DEPTH / 2 - 0.5), SW, SH);
  if (dim > 0) { c.fillStyle = `rgba(8,6,28,${0.62 * dim})`; c.fillRect(0, 0, W, H); }
  if (slot && slotA > 0) {
    const [u0, v0, u1, v1] = slot, q = [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => proj(u - SW / 2, v - SH / 2, -DEPTH / 2 - 0.6));
    c.save(); c.globalAlpha *= slotA; c.fillStyle = 'rgba(14,9,52,0.6)'; poly(q); c.fill();
    c.strokeStyle = rgba(P.lime, 0.55); c.lineWidth = 2; c.setLineDash([8, 8]); poly(q); c.stroke(); c.restore();
  }
  const gl = c.createLinearGradient(sp[0][0], sp[0][1] - 200 * o.s, sp[Math.floor(sp.length / 2)][0], sp[Math.floor(sp.length / 2)][1]);
  gl.addColorStop(0, 'rgba(255,255,255,0.14)'); gl.addColorStop(.32, 'rgba(255,255,255,0.03)'); gl.addColorStop(.33, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gl; c.fillRect(0, 0, W, H);
  c.restore();
  const di = roundedOutline(270, 78, 39, 6).map(([x, y]) => proj(x, y - SH / 2 + 58, -DEPTH / 2 - 1));
  c.fillStyle = '#000'; poly(di); c.fill();
  c.restore();
}

/* =====================================================================
   SUMMARY CARD — the supplied screenshot (IMG_1132), uniform scale only.
   Only the plain page margin outside the card's own rounded edge is masked.
   Element boxes in source px (measured from the image).
   ===================================================================== */
const SUM = {
  card: [12, 20, 921, 300], r: 26,
  badge: [771, 45, 894, 87], bars: [36, 160, 894, 178], ret: [38, 244, 261, 265], retNum: [169, 244, 261, 265], odds: [821, 244, 893, 265],
  segs: [[36, 86], [99, 148], [160, 211], [223, 272], [285, 335], [347, 397], [409, 459], [472, 521], [534, 584], [596, 646], [658, 707], [719, 769], [782, 832], [844, 894]],
};
const SUM_W = SUM.card[2] - SUM.card[0], SUM_H = SUM.card[3] - SUM.card[1];
// draw the card centred at (cx, cy), s = canvas px per source px. Returns a mapper source → canvas.
function drawSummary(cx, cy, s, o = {}) {
  const { a = 1, lift = 1, rim = 1, rot = 0, shadow = 1 } = o;
  if (a <= 0) return null;
  const [x0, y0] = SUM.card, w = SUM_W * s, h = SUM_H * s;
  c.save(); c.globalAlpha *= a; c.translate(cx, cy); c.rotate(rot);
  if (shadow > 0) {
    c.save(); c.shadowColor = 'rgba(4,2,20,0.9)'; c.shadowBlur = 90 * lift; c.shadowOffsetY = 60 * lift; c.fillStyle = 'rgba(4,2,20,0.7)';
    c.globalAlpha *= shadow; rr(-w / 2 + 16, -h / 2 + 16, w - 32, h - 32, SUM.r * s); c.fill(); c.restore();
  }
  if (rim > 0) {
    c.save(); c.shadowColor = rgba(P.lime, 0.5 * rim); c.shadowBlur = 40 * rim;
    c.strokeStyle = rgba(P.lime, 0.95 * rim); c.lineWidth = Math.max(2, 3 * s); rr(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2, SUM.r * s + 1); c.stroke(); c.restore();
  }
  c.save(); rr(-w / 2, -h / 2, w, h, SUM.r * s); c.clip();
  c.drawImage(IMG.sum, x0, y0, SUM_W, SUM_H, -w / 2, -h / 2, w, h);
  c.restore();
  c.restore();
  const cs = Math.cos(rot), sn = Math.sin(rot);
  return { s, rot, cx, cy, map: (u, v) => { const x = (u - x0 - SUM_W / 2) * s, y = (v - y0 - SUM_H / 2) * s; return [cx + x * cs - y * sn, cy + x * sn + y * cs]; } };
}
// highlight helpers on the real elements (never covering them)
function ringAround(m, box, p, o = {}) {
  if (!m || p <= 0 || p >= 1) return;
  const { pad = 10, col = P.lime } = o, [u0, v0, u1, v1] = box;
  const [cx, cy] = m.map((u0 + u1) / 2, (v0 + v1) / 2), w = (u1 - u0) * m.s, h = (v1 - v0) * m.s;
  const e = eOutCubic(p), grow = lerp(0, 26, e);
  c.save(); c.translate(cx, cy); c.rotate(m.rot);
  c.strokeStyle = rgba(col, 0.95 * (1 - p)); c.lineWidth = lerp(5, 2, e);
  rr(-w / 2 - pad - grow, -h / 2 - pad - grow, w + (pad + grow) * 2, h + (pad + grow) * 2, h / 2 + pad + grow); c.stroke();
  c.restore();
}
function underline(m, box, p, o = {}) {        // lime bar swiping in under an element
  if (!m || p <= 0) return;
  const { gap = 12, th = 7, a = 1 } = o, [u0, , u1, v1] = box;
  const [xa, ya] = m.map(u0, v1), [xb] = m.map(u1, v1), e = eOutExpo(p);
  c.save(); c.globalAlpha *= a; c.fillStyle = P.lime; c.shadowColor = rgba(P.lime, 0.7); c.shadowBlur = 16;
  rr(xa, ya + gap * m.s, (xb - xa) * e, th * m.s, th * m.s / 2); c.fill(); c.restore();
}

/* ---------- post: vignette + grain ---------- */
const NOISE = Array.from({ length: 3 }, (_, k) => {
  const g = mk(256, 256), gx = g.getContext('2d'), id = gx.createImageData(256, 256), r = mulberry32(k + 3);
  for (let i = 0; i < id.data.length; i += 4) { const v = r() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
  gx.putImageData(id, 0, 0); return g;
});
function post(t) {
  reset(out);
  const R = Math.hypot(W, H) / 2, v = out.createRadialGradient(W / 2, H / 2, R * 0.45, W / 2, H / 2, R * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.42)');
  out.fillStyle = v; out.fillRect(0, 0, W, H);
  const f = Math.floor(Math.min(t, EV.cta + 0.6) * FPS);
  out.globalCompositeOperation = 'overlay'; out.globalAlpha = 0.05;
  out.fillStyle = out.createPattern(NOISE[f % 3], 'repeat'); out.save(); out.translate((f * 37) % 256, (f * 91) % 256); out.fillRect(-256, -256, W + 512, H + 512); out.restore();
  reset(out);
}

/* ---------- render loop (motion blur: n sub-frames over half a frame; more during fast moves) ---------- */
let prefetchP = null;
async function renderFrame(t) {
  if (prefetchP) { await prefetchP; prefetchP = null; }
  const n = Math.max(SUB, SUB > 1 && window.SUB_AT ? window.SUB_AT(t) : 1);
  const times = Array.from({ length: n }, (_, i) => t + (n > 1 ? (i / n) * (SHUTTER / FPS) : 0));
  for (let pass = 0; pass < 3; pass++) {
    FS.misses.clear(); reset(out);
    times.forEach((ts, i) => {
      reset(c); drawScene(ts); out.globalAlpha = 1 / (i + 1);
      const k = 1 + 0.026 * Math.min(1, hitK(ts));          // camera punch on the hits
      out.drawImage(FRAME_CV, -W * (k - 1) / 2, -H * (k - 1) / 2, W * k, H * k);
    });
    out.globalAlpha = 1;
    if (!FS.misses.size) break;
    await FS.fill(); SCR_KEY = null;
  }
  post(t);
  // prefetch the frames the next few output frames need
  for (let j = 1; j <= 3; j++) { const st = SCROLL(t + j / FPS); if (st.frame != null) FS.get(st.frame); }
  if (FS.misses.size) prefetchP = FS.fill();
}
function boot() {
  window.renderFrame = renderFrame;
  window.META = { W, H, FPS, DUR };
  window.ready = (async () => {
    await Promise.all(['900 40px Montserrat', 'italic 900 40px Montserrat', '800 40px Montserrat', '700 40px Montserrat', '600 40px Montserrat', '500 40px Montserrat'].map(f => document.fonts.load(f)));
    await CorvoLogo.load('brand/logo-paths.json');
    REC = await loadJSON('assets/rec/meta.json');
    SCROLL = TL.makeScroll(REC);
    IMG.strip = await loadImage('assets/rec/strip.jpg');
    IMG.sum = await loadImage('source/IMG_1132.jpeg');
    if (window.COMP_READY) await window.COMP_READY();
    return true;
  })();
  if (!RENDER) {
    const audio = new Audio('corvo15v3-audio.wav');
    let t0 = null, busy = false, seek = Q.has('t') ? +Q.get('t') : null;
    window.ready.then(() => {
      const loop = async now => {
        if (t0 === null) t0 = now;
        if (!busy) { busy = true; await renderFrame(seek != null ? seek : ((now - t0) / 1000) % DUR); busy = false; }
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    });
    cv.addEventListener('click', () => { seek = null; t0 = null; audio.currentTime = 0; audio.play().catch(() => {}); });
  }
}
