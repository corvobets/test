/* =====================================================================
   CORVO BETS 15s — shared engine (both formats)
   Helpers, brand stage, logo, premium phone mockup built from the real
   Telegram screenshot (IMG_7046), lifted message cards, footage store,
   post-processing and the deterministic render loop.
   The composition files (comp-horizontal.js / comp-vertical.js) define
   drawScene(t) and call boot().
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

const P = { lime: '#C8F000', purple: '#0E0934', surface: '#17133C', dark: '#090A10', violet: '#9641FD', white: '#FFFFFF', cta: '#0A0A0F', outline: '#2F2B50' };
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
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// keyframes: [[t, value], ...] (value may be a number or an object of numbers)
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
    c.save(); c.globalAlpha *= a;
    c.beginPath(); c.rect(x0 - size, y - size * 1.02, wd + size * 2, size * 1.3); c.clip();
    c.fillStyle = col; c.textAlign = 'left';
    c.fillText(s, x0, y + (1 - pin) * size * 1.15 - pout * size * 1.25);
    c.restore();
  }
  c.letterSpacing = '0px';
  return wd;
}
// fit a font size so that the text is at most maxW wide
function fitSize(s, maxW, size, w = 900, lsK = -0.02) { const m = tw(s, size, w, size * lsK); return m > maxW ? size * maxW / m : size; }

/* ---------- assets ---------- */
const IMG = {}, CLIPS = {};
async function loadJSON(u) { return (await fetch(u)).json(); }
function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => im.decode().then(() => res(im), () => res(im)); im.onerror = rej; im.src = src; }); }
const FS = {                  // footage frame store with LRU + miss tracking
  cache: new Map(), misses: new Set(), limit: 40,
  get(clip, kind, i) {
    const m = CLIPS[clip]; if (!m) return null;
    i = clamp(Math.round(i), 0, m.count - 1);
    const key = `assets/${clip}/${kind}_${String(i).padStart(4, '0')}.${kind === 'plate' ? 'jpg' : 'webp'}`;
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

/* ---------- stage: deep purple + banner-style light columns ---------- */
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
// hit energy: decays after each musical accent (drives stage-light bursts and the camera punch)
const HITS = [[EV.hit, 1], [EV.w2, 0.5], [EV.logo, 0.45], [EV.s2, 0.35], [EV.s3, 0.9], [EV.corvo, 0.45], [EV.final, 1], [EV.cta, 0.35], [EV.stinger, 0.6]];
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
// a copy of the stage over [0,y0] (solid) fading out to y1 — lets content scroll "under" the stage.
// y0 > y1 fades upward (bottom overlay).
const STAGE_CV = mk(), stx = STAGE_CV.getContext('2d');
function stageOverlay(t, y0, y1, o = {}) {
  const save = c; c = stx; reset(stx); stage(t, o); c = save;
  stx.globalCompositeOperation = 'destination-in';
  const g = stx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  stx.fillStyle = g; stx.fillRect(0, 0, W, H); stx.globalCompositeOperation = 'source-over';
  c.drawImage(STAGE_CV, 0, 0);
}
// additive lime flash (hits)
function limeFlash(t, t0, amt = 0.5, dur = 0.28) {
  const p = prog(t, t0, t0 + dur); if (p <= 0 || p >= 1) return;
  // screen-blended lime: stays vivid on the purple (additive lime turns olive/grey)
  c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = amt * Math.pow(1 - p, 3); c.fillStyle = P.lime; c.fillRect(0, 0, W, H); c.restore();
}

/* ---------- logo ---------- */
const LOGO_W = 769, LOGO_H = 183;
function logoAt(cx, cy, w, o = {}) { const h = w * LOGO_H / LOGO_W; CorvoLogo.draw(c, cx - w / 2, cy - h / 2, w, o); }
// clean reveal: symbol scales in, wordmark wipes from the left, tag slides
function logoReveal(cx, cy, w, t, t0, o = {}) {
  const { a = 1 } = o;
  const h = w * LOGO_H / LOGO_W, x0 = cx - w / 2, y0 = cy - h / 2;
  const ps = eOutExpo(prog(t, t0, t0 + 0.45)), pw = eOutExpo(prog(t, t0 + 0.08, t0 + 0.6)), pt = eOutExpo(prog(t, t0 + 0.18, t0 + 0.62));
  if (ps <= 0 || a <= 0) return;
  c.save(); c.globalAlpha *= a;
  const symCx = x0 + 0.13 * w, symCy = cy;
  c.save(); c.translate(symCx, symCy); const sc = lerp(1.5, 1, ps); c.scale(sc, sc); c.translate(-symCx, -symCy); c.globalAlpha *= clamp(ps * 3);
  CorvoLogo.draw(c, x0, y0, w, { word: 0, tag: 0 }); c.restore();
  c.save(); c.beginPath(); c.rect(x0 + 0.24 * w, y0 - 20, (w * 0.8) * pw, h + 40); c.clip(); CorvoLogo.draw(c, x0, y0, w, { symbol: 0, tag: 0 }); c.restore();
  c.save(); c.translate((1 - pt) * w * 0.06, 0); c.globalAlpha *= clamp(pt * 2); CorvoLogo.draw(c, x0, y0, w, { symbol: 0, word: 0 }); c.restore();
  c.restore();
  logoShine(cx, cy, w, prog(t, t0 + 0.35, t0 + 1.05));
}
const SHINE_C = mk(2000, 520), sctx = SHINE_C.getContext('2d');
function logoShine(cx, cy, w, p) {
  if (p <= 0 || p >= 1) return;
  const h = w * LOGO_H / LOGO_W, ow = Math.ceil(w + 40), oh = Math.ceil(h + 40);
  sctx.setTransform(1, 0, 0, 1, 0, 0); sctx.globalCompositeOperation = 'source-over'; sctx.clearRect(0, 0, SHINE_C.width, SHINE_C.height);
  CorvoLogo.draw(sctx, 20, 20, w);
  sctx.globalCompositeOperation = 'source-in';
  const x = lerp(-w * 0.2, w * 1.2, eInOutSine(p)) + 20, g = sctx.createLinearGradient(x - 90, 0, x + 90, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  sctx.fillStyle = g; sctx.fillRect(0, 0, ow, oh);
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.5; c.drawImage(SHINE_C, 0, 0, ow, oh, cx - w / 2 - 20, cy - h / 2 - 20, ow, oh); c.restore();
}

/* ---------- icons ---------- */
function tgPlane(cx, cy, s, col) {
  c.save(); c.translate(cx, cy); c.scale(s / 100, s / 100); c.fillStyle = col;
  c.beginPath(); c.moveTo(-48, -2); c.lineTo(42, -38); c.quadraticCurveTo(48, -40, 46, -33); c.lineTo(30, 40); c.quadraticCurveTo(28, 46, 22, 42);
  c.lineTo(0, 26); c.lineTo(-12, 38); c.quadraticCurveTo(-16, 41, -16, 36); c.lineTo(-14, 18); c.lineTo(28, -22); c.lineTo(-20, 12); c.lineTo(-46, 4); c.quadraticCurveTo(-52, 1, -48, -2); c.closePath(); c.fill();
  c.restore();
}

/* =====================================================================
   PHONE MOCKUP — screen texture built from the real screenshot
   Crop: status bar, subscriber count (37 743, outdated), pinned giveaway and
   bottom controls are excluded. Title + avatar are taken from the screenshot.
   ===================================================================== */
const SHOT = {
  contentY0: 328, contentY1: 1872,           // source rows kept (messages only)
  title: [368, 126, 212, 44],               // "Corvo Bets" (x, y, w, h) — the count line below is not used
  avatar: [890.5, 167.5, 41],               // real channel avatar (cx, cy, r)
  // message bubbles in source px (x0, y0, x1, y1) and the ✅ centre
  cards: [
    { name: 'Pavlidis', r: [22, 340, 812, 632], chk: [433.5, 519.5] },
    { name: 'Kane', r: [22, 637, 812, 896], chk: [387.5, 783] },
    { name: 'Salah', r: [22, 901, 812, 1159], chk: [396.5, 1046.5] },
  ],
  radius: 30,
};
const SW = 944, SH = 1900, HEAD = 236, OFF = HEAD - SHOT.contentY0;   // screen texture size; source → screen y offset
const SCR = mk(SW, SH), scx = SCR.getContext('2d');
const CARD_IMG = [];
function buildScreen() {
  const im = IMG.shot, X = scx;
  X.fillStyle = '#D6E2EE'; X.fillRect(0, 0, SW, SH);
  X.drawImage(im, 0, SHOT.contentY0, SW, SHOT.contentY1 - SHOT.contentY0, 0, HEAD, SW, SHOT.contentY1 - SHOT.contentY0);
  // soft fade of the chat background below the last message (no system controls)
  const yEnd = SHOT.contentY1 + OFF, g = X.createLinearGradient(0, yEnd - 6, 0, SH);
  g.addColorStop(0, 'rgba(214,226,238,0)'); g.addColorStop(0.15, 'rgba(214,226,238,1)'); g.addColorStop(1, 'rgba(206,218,232,1)');
  X.fillStyle = g; X.fillRect(0, yEnd - 6, SW, SH - yEnd + 6);
  // header (rebuilt background; title + avatar pixels from the screenshot)
  X.fillStyle = '#F0EFF0'; X.fillRect(0, 0, SW, HEAD);
  X.fillStyle = '#D3D2D6'; X.fillRect(0, HEAD - 2, SW, 2);
  const [tx, ty, tw2, th] = SHOT.title, hy = 150 - 30;          // centre the title vertically in the header
  X.drawImage(im, tx, ty, tw2, th, (SW - tw2) / 2, hy, tw2, th);
  const [ax, ay, ar] = SHOT.avatar, acy = hy + th / 2 + 3;
  X.save(); X.beginPath(); X.arc(SW - 60, acy, ar, 0, 7); X.clip(); X.drawImage(im, ax - ar, ay - ar, ar * 2, ar * 2, SW - 60 - ar, acy - ar, ar * 2, ar * 2); X.restore();
  X.strokeStyle = '#2F7CF6'; X.lineWidth = 7; X.lineCap = 'round'; X.lineJoin = 'round';
  X.beginPath(); X.moveTo(46, acy - 24); X.lineTo(24, acy); X.lineTo(46, acy + 24); X.stroke();
  // lifted-card sources: exact bubble crops with a rounded mask
  SHOT.cards.forEach((cd, k) => {
    const [x0, y0, x1, y1] = cd.r, w = x1 - x0, h = y1 - y0, pad = 2;
    const k2 = mk(w + pad * 2, h + pad * 2), X2 = k2.getContext('2d');
    X2.beginPath(); X2.roundRect(pad, pad, w, h, SHOT.radius); X2.clip();
    X2.drawImage(im, x0, y0, w, h, pad, pad, w, h);
    CARD_IMG[k] = k2;
  });
}
const cardScreen = k => { const [x0, y0, x1, y1] = SHOT.cards[k].r; return { x: x0, y: y0 + OFF, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 + OFF }; };

function rot3(v, ax, ay, az) {
  let [x, y, z] = v;
  let c1 = Math.cos(ax), s1 = Math.sin(ax); [y, z] = [y * c1 - z * s1, y * s1 + z * c1];
  c1 = Math.cos(ay); s1 = Math.sin(ay); [x, z] = [x * c1 + z * s1, -x * s1 + z * c1];
  c1 = Math.cos(az); s1 = Math.sin(az); [x, y] = [x * c1 - y * s1, x * s1 + y * c1];
  return [x, y, z];
}
// phone state: {cx, cy, s, rx, ry, rz}; phone-local coords are centred on the screen
function projector(o) {
  const { cx, cy, s, rx = 0, ry = 0, rz = 0, D = 3600 } = o;
  return (x, y, z = 0) => { const [X, Y, Z] = rot3([x, y, z], rx, ry, rz); const k = D / (D + Z); return [cx + X * s * k, cy + Y * s * k, Z]; };
}
const phonePt = (ph, u, v) => projector(ph)(u - SW / 2, v - SH / 2, 0);
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
const BEZ = 30, PHW = SW + BEZ * 2, PHH = SH + BEZ * 2, PHR = 150, SCRR = 122, DEPTH = 40;
const OUTLINE = roundedOutline(PHW, PHH, PHR), INNER = roundedOutline(PHW - 10, PHH - 10, PHR - 5), SCREEN_OUT = roundedOutline(SW, SH, SCRR);
function convexHull(pts) {
  pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const poly = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
// o: phone state; opts.dim (0..1) darkens the screen, opts.slot = card index shown as a lifted-out hole
function drawPhone(o, opts = {}) {
  const { dim = 0, slot = -1, slotA = 0, a = 1, shadow = 1 } = opts;
  if (a <= 0) return;
  const proj = projector(o);
  c.save(); c.globalAlpha *= a;
  const front = OUTLINE.map(([x, y]) => proj(x, y, -DEPTH / 2)), back = OUTLINE.map(([x, y]) => proj(x, y, DEPTH / 2));
  // contact shadow
  if (shadow > 0) {
    c.save(); c.globalAlpha *= 0.55 * shadow; c.shadowColor = 'rgba(0,0,0,0.9)'; c.shadowBlur = 90 * o.s; c.shadowOffsetY = 50 * o.s;
    c.fillStyle = '#05040C'; poly(front); c.fill(); c.restore();
  }
  // titanium frame: side hull + polished rim with a violet/lime rim light
  const hull = convexHull(front.concat(back).map(p => [p[0], p[1]]));
  const g = c.createLinearGradient(o.cx - PHW * 0.5 * o.s, o.cy - PHH * 0.5 * o.s, o.cx + PHW * 0.5 * o.s, o.cy + PHH * 0.5 * o.s);
  g.addColorStop(0, '#6B5BD6'); g.addColorStop(0.3, '#2B2548'); g.addColorStop(0.55, '#1A1730'); g.addColorStop(0.85, '#3B3370'); g.addColorStop(1, '#9A86FF');
  c.fillStyle = g; poly(hull); c.fill();
  c.fillStyle = '#0B0A12'; poly(front); c.fill();
  const inner = INNER.map(([x, y]) => proj(x, y, -DEPTH / 2 - 0.2));
  c.strokeStyle = 'rgba(190,170,255,0.35)'; c.lineWidth = Math.max(1, 3 * o.s); poly(front); c.stroke();
  c.fillStyle = '#000'; poly(inner); c.fill();
  // side buttons
  [[-1, -560, 90], [-1, -400, 150], [-1, -220, 150], [1, -420, 230]].forEach(([side, y, h]) => {
    const x = side * (PHW / 2 + 5), q = [[x - 6, y], [x + 6, y], [x + 6, y + h], [x - 6, y + h]].map(([u, v]) => proj(u, v, 0));
    c.fillStyle = '#2A2445'; poly(q); c.fill();
  });
  // screen
  const sp = SCREEN_OUT.map(([x, y]) => proj(x, y, -DEPTH / 2 - 0.5));
  c.save(); poly(sp); c.clip();
  const flat = Math.abs(o.rx || 0) + Math.abs(o.ry || 0) < 1e-3;
  if (flat) {
    const k = 3600 / (3600 - DEPTH / 2 - 0.5), s = o.s * k;
    c.save(); c.translate(o.cx, o.cy); c.rotate(o.rz || 0); c.scale(s, s); c.drawImage(SCR, -SW / 2, -SH / 2); c.restore();
  } else drawTexMesh(SCR, (u, v) => proj(u - SW / 2, v - SH / 2, -DEPTH / 2 - 0.5), SW, SH);
  if (dim > 0) { c.fillStyle = `rgba(8,6,28,${0.5 * dim})`; c.fillRect(0, 0, W, H); }
  if (slot >= 0 && slotA > 0) {    // the hole the lifted card leaves behind
    const r = cardScreen(slot), q = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]].map(([u, v]) => proj(u - SW / 2, v - SH / 2, -DEPTH / 2 - 0.6));
    c.save(); c.globalAlpha *= slotA; c.fillStyle = 'rgba(14,9,52,0.55)'; poly(q); c.fill();
    c.strokeStyle = rgba(P.lime, 0.5); c.lineWidth = 2; c.setLineDash([8, 8]); poly(q); c.stroke(); c.restore();
  }
  // glass reflection
  const gl = c.createLinearGradient(sp[0][0], sp[0][1] - 200 * o.s, sp[Math.floor(sp.length / 2)][0], sp[Math.floor(sp.length / 2)][1]);
  gl.addColorStop(0, 'rgba(255,255,255,0.16)'); gl.addColorStop(.32, 'rgba(255,255,255,0.03)'); gl.addColorStop(.33, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = gl; c.fillRect(0, 0, W, H);
  c.restore();
  // dynamic island
  const di = roundedOutline(250, 72, 36, 6).map(([x, y]) => proj(x, y - SH / 2 + 62, -DEPTH / 2 - 1));
  c.fillStyle = '#000'; poly(di); c.fill();
  c.restore();
}
// lifted card: from its spot on the phone (e = 0) to a floating target (e = 1)
// tgt: {cx, cy, s (canvas px per source px), rot}
function drawLiftedCard(k, ph, tgt, e, o = {}) {
  const { a = 1, glow = 1, t = 0 } = o;
  if (e <= 0.001 || a <= 0) return;
  const r = cardScreen(k), [px, py] = phonePt(ph, r.cx, r.cy);
  const cx = lerp(px, tgt.cx, e), cy = lerp(py, tgt.cy, e), s = lerp(ph.s, tgt.s, e), rot = lerp(ph.rz || 0, tgt.rot || 0, e);
  const img = CARD_IMG[k], w = img.width * s, h = img.height * s, lift = e;
  c.save(); c.globalAlpha *= a;
  // cast shadow on the phone, grows with the lift
  c.save(); c.translate(cx + 30 * lift * s, cy + 70 * lift * s); c.rotate(rot);
  c.shadowColor = 'rgba(4,2,20,0.85)'; c.shadowBlur = 80 * lift; c.fillStyle = 'rgba(4,2,20,0.6)';
  rr(-w / 2 + 10, -h / 2 + 10, w - 20, h - 20, SHOT.radius * s); c.fill(); c.restore();
  c.translate(cx, cy); c.rotate(rot);
  // lime rim light
  if (glow > 0) {
    c.save(); c.shadowColor = rgba(P.lime, 0.55 * glow * lift); c.shadowBlur = 34 * lift;
    c.strokeStyle = rgba(P.lime, 0.9 * glow * lift); c.lineWidth = Math.max(2, 2.2 * s); rr(-w / 2, -h / 2, w, h, SHOT.radius * s); c.stroke(); c.restore();
  }
  c.drawImage(img, -w / 2, -h / 2, w, h);
  // soft specular sweep as it settles
  const sweep = prog(e, 0.55, 1);
  if (sweep > 0 && sweep < 1) {
    c.save(); rr(-w / 2, -h / 2, w, h, SHOT.radius * s); c.clip();
    const x = lerp(-w * 0.7, w * 0.7, eInOutSine(sweep)), g = c.createLinearGradient(x - 160, 0, x + 160, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h); c.restore();
  }
  c.restore();
  return { cx, cy, s, rot, w, h };
}
// subtle lime pulse ring around the real ✅ on a lifted card
function checkHighlight(k, lc, p) {
  if (!lc || p <= 0 || p >= 1) return;
  const cd = SHOT.cards[k], [x0, y0] = cd.r, img = CARD_IMG[k];
  const u = cd.chk[0] - x0 + 2 - img.width / 2, v = cd.chk[1] - y0 + 2 - img.height / 2;
  c.save(); c.translate(lc.cx, lc.cy); c.rotate(lc.rot);
  const x = u * lc.s, y = v * lc.s, rad = lerp(26, 70, eOutCubic(p)) * lc.s;
  c.strokeStyle = rgba(P.lime, 0.9 * (1 - p)); c.lineWidth = 4 * lc.s * (1 - p * 0.5);
  c.beginPath(); c.arc(x, y, rad, 0, 7); c.stroke();
  c.restore();
}

/* ---------- footage (shirt shot) ---------- */
function footFrame(i, kind) { return FS.get('shirt', kind, i); }
function drawFootage(i, x, y, s, { plateA = 1, cutA = 1, grade = 0.55, clip = null } = {}) {
  const pl = footFrame(i, 'plate'), ct = footFrame(i, 'cut'); if (!pl || !ct) return;
  const m = CLIPS.shirt, w = m.w * s, h = m.h * s;
  c.save();
  if (clip) { clip(); c.clip(); }
  if (plateA > 0) {
    c.globalAlpha = plateA; c.drawImage(pl, x, y, w, h);
    // brand grade on the background: deep purple multiply + violet lift
    c.globalCompositeOperation = 'multiply'; c.globalAlpha = grade; c.fillStyle = '#3A1E9A'; c.fillRect(x, y, w, h);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = grade * 0.55; c.fillStyle = P.purple; c.fillRect(x, y, w, h);
  }
  c.restore();
  if (cutA > 0) { c.save(); c.globalAlpha = cutA; c.drawImage(ct, x, y, w, h); c.restore(); }
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
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)');
  out.fillStyle = v; out.fillRect(0, 0, W, H);
  const f = Math.floor(Math.min(t, EV.cta + 0.6) * FPS);
  out.globalCompositeOperation = 'overlay'; out.globalAlpha = 0.06;
  out.fillStyle = out.createPattern(NOISE[f % 3], 'repeat'); out.save(); out.translate((f * 37) % 256, (f * 91) % 256); out.fillRect(-256, -256, W + 512, H + 512); out.restore();
  reset(out);
}

/* ---------- render loop ---------- */
let prefetchP = null;
async function renderFrame(t) {
  if (prefetchP) { await prefetchP; prefetchP = null; }
  const n = SUB;
  const times = Array.from({ length: n }, (_, i) => t + (n > 1 ? (i / n) * (SHUTTER / FPS) : 0));
  for (let pass = 0; pass < 3; pass++) {
    FS.misses.clear(); reset(out);
    times.forEach((ts, i) => {
      reset(c); drawScene(ts); out.globalAlpha = 1 / (i + 1);
      const k = 1 + 0.028 * Math.min(1, hitK(ts));          // camera punch on the hits
      out.drawImage(FRAME_CV, -W * (k - 1) / 2, -H * (k - 1) / 2, W * k, H * k);
    });
    out.globalAlpha = 1;
    if (!FS.misses.size) break;
    await FS.fill();
  }
  post(t);
  FS.misses.clear(); reset(c); drawScene(t + 1 / FPS);
  if (FS.misses.size) prefetchP = FS.fill();
}
function boot() {
  window.renderFrame = renderFrame;
  window.META = { W, H, FPS, DUR };
  window.ready = (async () => {
    await Promise.all(['900 40px Montserrat', 'italic 900 40px Montserrat', '800 40px Montserrat', '700 40px Montserrat', '600 40px Montserrat', '500 40px Montserrat'].map(f => document.fonts.load(f)));
    await CorvoLogo.load('brand/logo-paths.json');
    IMG.shot = await loadImage('source/IMG_7046.png');
    buildScreen();
    CLIPS.shirt = await loadJSON('assets/shirt/meta.json');
    if (window.COMP_READY) await window.COMP_READY();
    return true;
  })();
  if (!RENDER) {
    const audio = new Audio('corvo15-audio.wav');
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
