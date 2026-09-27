/* =====================================================================
   CORVO BETS REWARDS — engine (vertical 1080×1920)
   Helpers, brand stage, logo, hit energy / camera shake, post-processing
   and the deterministic render loop (motion blur by sub-frames).
   comp-vertical.js defines drawScene(t) and calls boot().
   ===================================================================== */
const Q = new URLSearchParams(location.search);
const W = window.FORMAT.w, H = window.FORMAT.h, FPS = 60, DUR = TL.DUR;
const SUB = +(Q.get('sub') || 5), SHUTTER = 0.5;
const RENDER = Q.has('render');
if (RENDER) document.body.classList.add('render');
const { EV, BEAT } = TL;

const cv = document.getElementById('cv'); cv.width = W; cv.height = H;
const out = cv.getContext('2d');
const mk = (w = W, h = H) => { const k = document.createElement('canvas'); k.width = w; k.height = h; return k; };
const FRAME_CV = mk();
let c = FRAME_CV.getContext('2d');

const P = { lime: '#C8F000', purple: '#0E0934', card: '#17133C', dark: '#090A10', violet: '#9641FD', white: '#FFFFFF', sub: '#B8B4CC', cta: '#0A0A0F', gold: '#F5B81C' };
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
function I(size, w = 600, ctx = c) { ctx.font = `${w} ${size}px Inter`; }
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
function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => im.decode().then(() => res(im), () => res(im)); im.onerror = rej; im.src = src; }); }
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
const HITS = [[EV.hit, 1], [EV.h4, 0.5], [EV.drop, 1.1], [EV.pts, 0.4], [EV.cash, 0.5], [EV.press, 0.4], [EV.lead, 0.5], [EV.wheel, 0.5], [EV.jackpot, 1.2], [EV.give, 0.6], [EV.recap, 0.4], [EV.close, 1], [EV.cta, 0.35], [EV.final, 0.6]];
const hitK = t => HITS.reduce((a, [h, w]) => a + (t >= h ? w * Math.exp(-(t - h) * 9) : 0), 0);
// short, decaying camera shake on the heavy hits (deterministic)
const SHAKES = [[EV.hit, 14], [EV.drop, 16], [EV.jackpot, 20], [EV.give, 8], [EV.close, 14], [EV.final, 8]];
function shake(t) {
  let x = 0, y = 0;
  for (const [h, a] of SHAKES) { const u = t - h; if (u < 0 || u > 0.35) continue; const e = a * Math.exp(-u * 16); x += e * Math.sin(u * 97 + h); y += e * Math.cos(u * 83 + 2 * h); }
  return [x, y];
}
// lime shockwave ring (hits)
function shockRing(cx, cy, t, t0, { r0 = 60, r1 = 620, dur = 0.55, w = 10, a = 0.8 } = {}) {
  const p = prog(t, t0, t0 + dur); if (p <= 0 || p >= 1) return;
  const e = eOutCubic(p);
  c.save(); c.strokeStyle = rgba(P.lime, a * Math.pow(1 - p, 1.6)); c.lineWidth = w * (1 - p * 0.8);
  c.beginPath(); c.arc(cx, cy, lerp(r0, r1, e), 0, 7); c.stroke(); c.restore();
}
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

const FS = { misses: new Set(), async fill() {} };

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
      const k = 1 + 0.026 * Math.min(1, hitK(ts)), [sx, sy] = shake(ts);   // camera punch + shake on the hits
      out.drawImage(FRAME_CV, -W * (k - 1) / 2 + sx, -H * (k - 1) / 2 + sy, W * k, H * k);
    });
    out.globalAlpha = 1;
    if (!FS.misses.size) break;
    await FS.fill();
  }
  post(t);
  // prefetch the frames the next few output frames need
}
function boot() {
  window.renderFrame = renderFrame;
  window.META = { W, H, FPS, DUR };
  window.ready = (async () => {
    await Promise.all(['900 40px Montserrat', 'italic 900 40px Montserrat', '800 40px Montserrat', '700 40px Montserrat', '600 40px Montserrat', '500 40px Montserrat', '500 40px Inter', '600 40px Inter', '700 40px Inter', '800 40px Inter'].map(f => document.fonts.load(f)));
    await CorvoLogo.load('brand/logo-paths.json');
    await Promise.all(['cut_phones', 'cut_jersey', 'cut_cap', 'cut_hoodie', 'thumb_twenty'].map(async n => { IMG[n] = await loadImage(`assets/${n}.png`); }));
    if (window.COMP_READY) await window.COMP_READY();
    return true;
  })();
  if (!RENDER) {
    const audio = new Audio('rewards-audio.wav');
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
