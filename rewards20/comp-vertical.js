/* =====================================================================
   CORVO BETS REWARDS — 19.2 s vertical composition (1080×1920)
   Essential copy, logo and CTA stay inside x ≈ 70 – 1000, y ≈ 280 – 1460
   (clear of the Stories/Reels UI at the top, bottom and right rail).
   All values shown come from the site (rates, reward card, August 2026
   leaderboard, wheel segments). Nothing is invented.
   ===================================================================== */
const CX = W / 2;
const T = EV;

/* ---------- background: deep purple, light columns, bokeh ---------- */
const BOKEH = (() => { const r = mulberry32(21); return Array.from({ length: 26 }, () => ({
  x: r() * W, y: r() * H, rad: 20 + Math.pow(r(), 2) * 120, col: r() < 0.55 ? P.lime : P.violet, a: 0.08 + r() * 0.22, sp: (r() - 0.5) * 40, ph: r() * 6, z: 0.3 + r() })); })();
const BOKEH_SPR = (() => { const s = mk(256, 256), x = s.getContext('2d'); const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); return s; })();
const TINT = {};
function tinted(col) { if (TINT[col]) return TINT[col]; const s = mk(256, 256), x = s.getContext('2d'); x.drawImage(BOKEH_SPR, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, 256, 256); return (TINT[col] = s); }
function bg(t, o = {}) {
  const { light = 0.8, bokeh = 1, dark = 0 } = o;
  stage(t, { light, glowY: o.glowY ?? 0.55 });
  if (dark > 0) { c.fillStyle = rgba(P.dark, dark); c.fillRect(0, 0, W, H); }
  if (bokeh > 0) {
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const k of BOKEH) {
      const y = ((k.y - t * k.sp * k.z) % (H + 300) + H + 300) % (H + 300) - 150, x = k.x + Math.sin(t * 0.7 + k.ph) * 30;
      c.globalAlpha = k.a * bokeh * (0.8 + 0.2 * Math.sin(t * 2 + k.ph)); const r = k.rad * (0.8 + k.z * 0.5);
      c.drawImage(tinted(k.col), x - r, y - r, r * 2, r * 2);
    }
    c.restore();
  }
}

/* ---------- type ---------- */
// italic Black title with a glitch slam: scale-in, RGB (violet/lime) split and slice jitter that settle in ~0.2 s
function slam(s, x, y, size, t, t0, o = {}) {
  const { col = P.white, align = 'center', a = 1, out = null, outDur = 0.18, it = true, ls = -size * 0.015, from = 1.35 } = o;
  if (t < t0 || a <= 0) return 0;
  const p = prog(t, t0, t0 + 0.22), e = eOutExpo(p), po = out == null ? 0 : eInCubic(prog(t, out, out + outDur));
  if (po >= 1) return 0;
  M(size, 900, it); c.letterSpacing = ls + 'px';
  const wd = c.measureText(s).width, x0 = align === 'center' ? x - wd / 2 : align === 'right' ? x - wd : x;
  const sc = lerp(from, 1, e), split = (1 - e) * 16 + po * 22;
  c.save(); c.globalAlpha *= a * (1 - po);
  c.translate(x0 + wd / 2, y - size * 0.35); c.scale(sc, sc * (1 - po * 0.6)); c.translate(-wd / 2, size * 0.35);
  if (split > 0.5) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha *= 0.75;
    c.fillStyle = P.violet; c.fillText(s, -split, 0); c.fillStyle = col === P.lime ? P.white : P.lime; c.fillText(s, split * 0.8, 0); c.restore();
  }
  c.fillStyle = col; c.fillText(s, 0, 0);
  c.restore(); c.letterSpacing = '0px';
  return wd;
}
function inter(s, x, y, size, o = {}) { const { w = 600, col = P.sub, align = 'left', a = 1, ls = 0 } = o; if (a <= 0) return; I(size, w); c.letterSpacing = ls + 'px'; c.textAlign = align; c.fillStyle = col; const g = c.globalAlpha; c.globalAlpha *= a; c.fillText(s, x, y); c.globalAlpha = g; c.textAlign = 'left'; c.letterSpacing = '0px'; }
// support line that wipes in from the left
function subLine(s, x, y, size, t, t0, o = {}) {
  const p = eOutExpo(prog(t, t0, t0 + 0.4)); if (p <= 0) return;
  I(size, o.w || 600); const wd = c.measureText(s).width, x0 = o.align === 'center' ? x - wd / 2 : x;
  c.save(); c.beginPath(); c.rect(x0 - 10, y - size * 1.1, (wd + 20) * p, size * 1.5); c.clip();
  inter(s, x0, y + (1 - p) * 10, size, { ...o, align: 'left' }); c.restore();
}
// eyebrow: raven symbol + "01/04" counter
function eyebrow(label, x, y, t, t0, a = 1) {
  const p = eOutExpo(prog(t, t0, t0 + 0.35)); if (p <= 0 || a <= 0) return;
  c.save(); c.globalAlpha *= p * a; c.translate((1 - p) * -30, 0);
  CorvoLogo.draw(c, x - 8, y - 46, 260, { word: 0, tag: 0 });
  inter(label, x + 78, y - 6, 30, { w: 800, col: P.lime, ls: 4 });
  c.restore();
}

/* ---------- logo lockup: CORVO BETS + REWARDS bar ---------- */
function rewardsLogo(cx, cy, w, t, t0, o = {}) {
  const { a = 1 } = o; if (t < t0 || a <= 0) return;
  const h = w * LOGO_H / LOGO_W, x0 = cx - w / 2, y0 = cy - h / 2 - w * 0.03;
  logoReveal(cx, cy - w * 0.03, w, t, t0, { a });
  const p = eOutExpo(prog(t, t0 + 0.2, t0 + 0.6)); if (p <= 0) return;
  // REWARDS bar under the wordmark (violet, BETS-tag slant), as on the site header
  const bx = x0 + 0.25 * w, bw = 0.7 * w, bh = 0.13 * w, by = y0 + h * 0.98, sl = bh * SLANT;
  c.save(); c.globalAlpha *= a;
  c.beginPath(); c.moveTo(bx + sl, by); c.lineTo(bx + sl + bw * p, by); c.lineTo(bx - sl + bw * p, by + bh); c.lineTo(bx - sl, by + bh); c.closePath();
  c.fillStyle = P.violet; c.fill(); c.clip();
  const q = eOutExpo(prog(t, t0 + 0.3, t0 + 0.7));
  inter('REWARDS', bx + bw / 2 + bh * 0.09, by + bh * 0.74 + (1 - q) * bh, bh * 0.62, { w: 800, col: P.white, align: 'center', ls: bh * 0.18 });
  c.restore();
}

/* ---------- CP coin (site style) ---------- */
function coin(cx, cy, r, o = {}) {
  const { a = 1, spin = 0 } = o; if (a <= 0) return;
  const sx = Math.max(0.08, Math.abs(Math.cos(spin)));
  c.save(); c.globalAlpha *= a; c.translate(cx, cy); c.scale(sx, 1);
  const g = c.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, '#FFE58A'); g.addColorStop(0.6, '#F5B81C'); g.addColorStop(1, '#C98A06');
  c.fillStyle = '#A86F00'; c.beginPath(); c.arc(0, r * 0.08, r, 0, 7); c.fill();
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
  c.strokeStyle = 'rgba(140,90,0,0.55)'; c.lineWidth = r * 0.09; c.beginPath(); c.arc(0, 0, r * 0.78, 0, 7); c.stroke();
  M(r * 0.62, 900); c.textAlign = 'center'; c.fillStyle = '#8A5A00'; c.fillText('CP', 0, r * 0.22); c.textAlign = 'left';
  c.restore();
}
const COINS = (() => { const r = mulberry32(8); return Array.from({ length: 16 }, () => ({ x: r() * W, y: r() * H, z: 0.35 + r() * 1.1, vy: -60 - r() * 160, sp: r() * 6, vr: 2 + r() * 5 })); })();
function coinField(t, t0, t1, a = 1) {
  const f = clamp(prog(t, t0, t0 + 0.3)) * (1 - prog(t, t1 - 0.2, t1)); if (f <= 0) return;
  for (const k of [...COINS].sort((p, q) => p.z - q.z)) {
    const u = t - t0, y = ((k.y + k.vy * u * k.z) % (H + 300) + H + 300) % (H + 300) - 150;
    c.save(); if (k.z < 0.7) c.filter = `blur(${((0.7 - k.z) * 10).toFixed(1)}px)`;
    coin(k.x, y, 34 * k.z, { a: f * a * (0.35 + 0.5 * k.z), spin: k.sp + u * k.vr }); c.restore();
  }
}

/* ---------- transitions ---------- */
// glitch cut: slice displacement + colour split for ~0.12 s after each cut
const CUTS = [T.h2, T.h4, T.pts, T.cash, T.lead, T.wheel, T.give, T.recap, T.close];
const GL_CV = mk(), glx = GL_CV.getContext('2d');
function glitchPost(t) {
  let k = 0; for (const ct of CUTS) { const u = t - ct; if (u >= -0.03 && u < 0.14) k = Math.max(k, u < 0 ? 0.5 : 1 - u / 0.14); }
  if (T.build <= t && t < T.drop) k = Math.max(k, 0.25 + 0.75 * prog(t, T.build, T.drop));
  if (k <= 0.02) return;
  glx.setTransform(1, 0, 0, 1, 0, 0); glx.globalCompositeOperation = 'copy'; glx.drawImage(FRAME_CV, 0, 0); glx.globalCompositeOperation = 'source-over';
  const r = mulberry32(Math.floor(t * 60) * 7 + 3);
  for (let i = 0; i < 9; i++) {
    const y = r() * H, h = 12 + r() * 90 * k, dx = (r() - 0.5) * 120 * k;
    c.drawImage(GL_CV, 0, y, W, h, dx, y, W, h);
  }
  c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.28 * k;
  c.drawImage(GL_CV, -14 * k, 0); c.fillStyle = rgba(P.violet, 0.0); c.restore();
  c.save(); c.globalCompositeOperation = 'multiply'; c.globalAlpha = 0.25 * k; c.fillStyle = P.violet; c.fillRect(0, 0, W, H); c.restore();
}
// light-streak tunnel (the drop)
const STREAKS = (() => { const r = mulberry32(44); return Array.from({ length: 150 }, () => ({ a: r() * Math.PI * 2, d: r(), col: r() < 0.45 ? P.lime : r() < 0.7 ? P.violet : P.white, w: 2 + r() * 9, l: 0.08 + r() * 0.3 })); })();
function tunnel(t, t0, t1) {
  const f = clamp(prog(t, t0, t0 + 0.08)) * (1 - prog(t, t1 - 0.25, t1)); if (f <= 0) return;
  const u = t - t0, R = Math.hypot(W, H) * 0.62;
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  for (const s of STREAKS) {
    const d = ((s.d + u * 1.6) % 1), z = Math.pow(d, 2.2), r0 = 40 + z * R, r1 = r0 + (s.l + z * 0.5) * R * 0.5;
    const ang = s.a + u * 0.9;
    c.strokeStyle = s.col; c.globalAlpha = f * Math.min(1, z * 3) * 0.85; c.lineWidth = s.w * (0.3 + z * 1.6);
    c.beginPath(); c.moveTo(CX + Math.cos(ang) * r0, 900 + Math.sin(ang) * r0); c.lineTo(CX + Math.cos(ang) * r1, 900 + Math.sin(ang) * r1); c.stroke();
  }
  const g = c.createRadialGradient(CX, 900, 0, CX, 900, 420); g.addColorStop(0, `rgba(200,240,0,${0.5 * f})`); g.addColorStop(1, 'rgba(200,240,0,0)');
  c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.restore();
}
function flash(t, t0, col = P.white, amt = 0.7, dur = 0.16) { const p = prog(t, t0, t0 + dur); if (p <= 0 || p >= 1) return; c.save(); c.globalCompositeOperation = 'screen'; c.globalAlpha = amt * Math.pow(1 - p, 2); c.fillStyle = col; c.fillRect(0, 0, W, H); c.restore(); }

/* =============================== SCENES =============================== */

/* ---------- A · 0 – 2.4 : hook ---------- */
let HS = {};
function sceneHook(t) {
  bg(t, { light: 0.35, bokeh: 0.6, dark: 0.35 });
  const shakeK = prog(t, T.build, T.drop);
  c.save(); if (shakeK > 0) { const s = 1 + 0.06 * eInCubic(shakeK); c.translate(CX, 900); c.scale(s, s); c.translate(-CX, -900); }
  slam('APOSTAS…', CX, 720, HS.a, t, T.hit, { from: 1.25 });
  slam('E NÃO RECEBES', CX, 860, HS.b, t, T.h2);
  slam('NADA', CX, 1060, HS.c, t, T.h3, { col: P.lime });
  slam('EXTRA?', CX, 1250, HS.c, t, T.h4, { col: P.lime });
  // the site's balance pill, stuck at 0
  const p = eOutBack(prog(t, T.h4 + 0.1, T.h4 + 0.45), 1.8);
  if (p > 0) {
    const w = 300, h = 112, x = CX - w / 2, y = 1340 + (1 - p) * 60, j = Math.sin(t * 90) * 7 * Math.exp(-(t - T.h4 - 0.1) * 5);
    c.save(); c.globalAlpha *= clamp(p); c.translate(j, 0);
    c.fillStyle = P.card; rr(x, y, w, h, h / 2); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 2; c.stroke();
    coin(x + 66, y + h / 2, 36); M(62, 900); c.fillStyle = P.white; c.fillText('0', x + 130, y + h / 2 + 22);
    inter('CP', x + 188, y + h / 2 + 16, 40, { w: 700, col: P.sub });
    c.restore();
  }
  c.restore();
}

/* ---------- B · 2.4 – 4.0 : value proposition ---------- */
let VS = 118, VR = 150, AUTO_S = 120, RODA_S = 110, LEAD_S = 118;
function sceneValue(t) {
  bg(t, { light: 1.1, bokeh: 1 });
  tunnel(t, T.drop - 0.05, T.v1 + 0.2);
  flash(t, T.drop, P.lime, 0.55, 0.22);
  const up = eInOutQuart(prog(t, T.v1 - 0.1, T.v1 + 0.3));
  rewardsLogo(CX, lerp(820, 470, up), lerp(900, 700, up), t, T.drop);
  slam('AS TUAS APOSTAS', CX, 880, VS, t, T.v1);
  slam('AGORA DÃO', CX, 1010, VS, t, T.v2);
  slam('RECOMPENSAS.', CX, 1175, VR, t, T.v3, { col: P.lime });
  shockRing(CX, 820, t, T.drop, { r1: 900, w: 14 });
}

/* ---------- C · 4.0 – 5.6 : points from partner houses ---------- */
const CHART = [55, 2, 92, 2, 2, 2, 8, 2, 2, 12, 2, 50, 2, 10, 14, 58, 52, 22, 2, 2, 2, 2, 2, 20, 22, 2, 2, 2, 2, 2];
function tile(x, y, w, h, t, t0, icon, label, rate, note) {
  const p = eOutExpo(prog(t, t0, t0 + 0.5)); if (p <= 0) return;
  c.save(); c.globalAlpha *= clamp(p * 1.4);
  c.translate(x + w / 2, y + h / 2 + (1 - p) * 120); c.scale(lerp(0.75, 1, p), lerp(0.75, 1, p)); c.translate(-w / 2, -h / 2);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 40; c.shadowOffsetY = 20;
  c.fillStyle = P.card; rr(0, 0, w, h, 34); c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
  c.strokeStyle = 'rgba(184,180,204,0.18)'; c.lineWidth = 2; rr(0, 0, w, h, 34); c.stroke();
  // icon disc
  c.fillStyle = '#2A2410'; c.beginPath(); c.arc(w / 2, 92, 52, 0, 7); c.fill(); c.strokeStyle = rgba(P.lime, 0.35); c.lineWidth = 2; c.stroke();
  c.strokeStyle = '#E8C547'; c.lineWidth = 6; c.lineJoin = 'round';
  if (icon === 'wallet') { rr(w / 2 - 28, 70, 56, 44, 8); c.stroke(); c.beginPath(); c.moveTo(w / 2 + 6, 92); c.lineTo(w / 2 + 28, 92); c.stroke(); }
  else { c.beginPath(); [[-20, 112, 96], [-4, 112, 80], [12, 112, 70]].forEach(([dx, y1, y0]) => { c.moveTo(w / 2 + dx, y1); c.lineTo(w / 2 + dx, y0); }); c.stroke(); }
  inter(label, w / 2, 200, 30, { w: 800, col: P.sub, align: 'center', ls: 3 });
  inter(rate, w / 2, 262, 34, { w: 800, col: P.lime, align: 'center' });
  inter(note[0], w / 2, 318, 30, { w: 500, col: P.sub, align: 'center' });
  if (note[1]) inter(note[1], w / 2, 358, 30, { w: 500, col: P.sub, align: 'center' });
  c.restore();
}
function scenePoints(t) {
  bg(t, { light: 0.9 });
  eyebrow('COMO FUNCIONA', 80, 330, t, T.pts);
  slam('PONTOS', 80, 470, 128, t, T.pts, { align: 'left' });
  slam('AUTOMÁTICOS.', 80, 600, AUTO_S, t, T.pts + 0.2, { align: 'left', col: P.lime });
  tile(70, 690, 455, 400, t, T.t1, 'wallet', 'DEPÓSITOS', '1€ DEPOSITADO = 10 CP', ['em todas as casas', 'parceiras']);
  tile(555, 690, 455, 400, t, T.t2, 'bars', 'APOSTAS', '1€ APOSTADO = 1,5 CP', ['só apostas desportivas']);
  // points line (the site's "Evolução dos pontos" chart) draws across
  const p = eInOutCubic(prog(t, T.t2 + 0.1, T.cash - 0.2)); if (p > 0) {
    const x0 = 90, x1 = 990, yb = 1400, hh = 220, n = CHART.length, pts = CHART.map((v, i) => [x0 + (x1 - x0) * i / (n - 1), yb - v / 100 * hh]);
    const upto = p * (n - 1);
    c.save(); c.strokeStyle = 'rgba(184,180,204,0.12)'; c.lineWidth = 1; for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(x0, yb - k * hh / 3); c.lineTo(x1, yb - k * hh / 3); c.stroke(); }
    c.shadowColor = rgba(P.lime, 0.8); c.shadowBlur = 16; c.strokeStyle = P.lime; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath();
    for (let i = 0; i <= Math.floor(upto); i++) i ? c.lineTo(...pts[i]) : c.moveTo(...pts[i]);
    const f = upto % 1, i0 = Math.floor(upto); if (i0 < n - 1) c.lineTo(lerp(pts[i0][0], pts[i0 + 1][0], f), lerp(pts[i0][1], pts[i0 + 1][1], f));
    c.stroke(); c.shadowBlur = 0; c.fillStyle = P.lime;
    for (let i = 0; i <= i0; i++) { c.beginPath(); c.arc(pts[i][0], pts[i][1], 7, 0, 7); c.fill(); }
    c.restore();
  }
  subLine('As tuas apostas nas casas parceiras dão Corvo Points.', CX, 1460, 31, t, T.t2 + 0.3, { align: 'center', col: P.white, w: 600 });
}

/* ---------- feature header ---------- */
function featureHead(t, t0, n, l1, l2, sub, o = {}) {
  eyebrow(`${n}/04`, 80, 330, t, t0);
  slam(l1, 80, 470, o.s1 || 128, t, t0 + 0.02, { align: 'left', col: l2 ? P.white : P.lime });
  if (l2) slam(l2, 80, 600, o.s2 || 128, t, t0 + 0.14, { align: 'left', col: P.lime });
  subLine(sub, 84, l2 ? 668 : 540, 38, t, t0 + 0.25, { col: P.sub, w: 600 });
}

/* ---------- D · 5.6 – 7.2 : cashback (the site's "Depósito 20€" reward card) ---------- */
function sceneCash(t) {
  bg(t, { light: 1 });
  coinField(t, T.cash, T.lead);
  featureHead(t, T.cash, '01', 'CASHBACK.', null, 'Troca os teus pontos por depósitos.');
  const p = eOutBack(prog(t, T.cash + 0.1, T.cash + 0.6), 1.2), w = 920, h = 380, x = CX - w / 2, y = 820;
  if (p <= 0) return;
  const rotY = lerp(0.9, 0, clamp(p)), sx = Math.cos(rotY);
  c.save(); c.translate(CX, y + h / 2); c.scale(sx * lerp(0.8, 1, clamp(p)), lerp(0.8, 1, clamp(p))); c.rotate(-0.03 * (1 - clamp(p))); c.translate(-CX, -(y + h / 2));
  c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 60; c.shadowOffsetY = 30; c.fillStyle = '#16151F'; rr(x, y, w, h, 40); c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
  c.strokeStyle = 'rgba(255,255,255,0.08)'; c.lineWidth = 2; rr(x, y, w, h, 40); c.stroke();
  // the real thumbnail from the shop card
  c.save(); rr(x + 30, y + 30, 320, 320, 26); c.clip(); c.drawImage(IMG.thumb_twenty, x + 30, y + 30, 320, 320); c.restore();
  inter('Depósito 20€', x + 390, y + 100, 52, { w: 800, col: P.white });
  coin(x + 414, y + 170, 24); inter('40 021 CPs', x + 452, y + 190, 56, { w: 800, col: P.lime });
  // RESGATAR button, pressed on the beat
  const bx = x + 390, by = y + 238, bw = 500, bh = 100, pr = prog(t, T.press, T.press + 0.25), sq = 1 - 0.06 * Math.sin(Math.PI * pr);
  c.save(); c.translate(bx + bw / 2, by + bh / 2); c.scale(sq, sq); c.translate(-(bx + bw / 2), -(by + bh / 2));
  c.shadowColor = rgba(P.lime, 0.5 * (t > T.press ? 1 : 0.3)); c.shadowBlur = 30; c.fillStyle = P.lime; rr(bx, by, bw, bh, 26); c.fill(); c.shadowBlur = 0;
  M(40, 900, false); c.textAlign = 'center'; c.fillStyle = P.cta; c.letterSpacing = '1px'; c.fillText('RESGATAR', bx + bw / 2, by + 64); c.letterSpacing = '0px'; c.textAlign = 'left';
  c.restore();
  // tap ripple + pointer
  const rp = prog(t, T.press, T.press + 0.5);
  if (rp > 0 && rp < 1) { c.strokeStyle = rgba(P.white, 0.8 * (1 - rp)); c.lineWidth = 4; c.beginPath(); c.arc(bx + bw * 0.62, by + bh * 0.55, 20 + 120 * eOutCubic(rp), 0, 7); c.stroke(); }
  const hp = eInOutCubic(prog(t, T.press - 0.45, T.press)), hx = lerp(bx + bw + 160, bx + bw * 0.62, hp), hy = lerp(by + 300, by + bh * 0.55, hp);
  if (t > T.press - 0.5 && t < T.lead) { c.save(); c.translate(hx, hy); c.scale(t > T.press && t < T.press + 0.15 ? 0.9 : 1, t > T.press && t < T.press + 0.15 ? 0.9 : 1);
    c.fillStyle = P.white; c.strokeStyle = P.cta; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 22, 0, 7); c.fill(); c.stroke(); c.restore(); }
  c.restore();
  shockRing(bx + bw * 0.62, by + bh * 0.55, t, T.press, { r0: 30, r1: 420, w: 8, a: 0.7 });
}

/* ---------- E · 7.2 – 8.8 : monthly leaderboard (August 2026, from the site) ---------- */
const LB = [['chin**ax', 1013724, '€500'], ['jhon**99', 997888, '€180'], ['band**ra', 943645, '€100'], ['dubb**el', 535123, '€70'], ['nels**co', 278778, '€50']];
// live-count: points count up at different paces, rows re-sort continuously and settle in the real final order
const LB_DELAY = [0.26, 0.05, 0.16, 0.0, 0.1], LB_DUR = [0.95, 0.75, 0.85, 0.55, 0.6];
const lbVal = (i, t) => LB[i][1] * eOutCubic(prog(t, T.lead + 0.15 + LB_DELAY[i], T.lead + 0.15 + LB_DELAY[i] + LB_DUR[i]));
function lbSlot(i, t) { const v = LB.map((_, j) => lbVal(j, t) + (5 - j) * 1e-3); return v.filter(x => x > v[i]).length; }
const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
function sceneLead(t) {
  bg(t, { light: 0.9 });
  featureHead(t, T.lead, '02', 'LEADERBOARD', 'MENSAL.', 'Um novo ranking todos os meses.', { s1: LEAD_S });
  const x = 70, w = 940, rh = 124, y0 = 760;
  const hp = eOutExpo(prog(t, T.lead + 0.05, T.lead + 0.4)); if (hp <= 0) return;
  c.save(); c.globalAlpha *= hp;
  inter('ENCERRADO · AGOSTO DE 2026', x + 20, y0 - 22, 26, { w: 800, col: P.sub, ls: 3 });
  c.restore();
  LB.forEach((row, i) => {
    const ep = eOutExpo(prog(t, T.lead + 0.05 + i * 0.05, T.lead + 0.45 + i * 0.05)); if (ep <= 0) return;
    // smoothed slot (averaged over the last ~0.15 s) → rows glide past each other
    let s = 0; for (let k = 0; k < 6; k++) s += lbSlot(i, t - k * 0.03); s /= 6;
    const y = y0 + s * (rh + 14), top = s < 0.5 && t > T.lead + 1.15, rank = Math.round(s) + 1;
    c.save(); c.globalAlpha *= clamp(ep * 1.3); c.translate((1 - ep) * 600, 0);
    c.fillStyle = top ? '#1F2410' : P.card; rr(x, y, w, rh, 26); c.fill();
    c.strokeStyle = top ? rgba(P.lime, 0.9) : 'rgba(184,180,204,0.14)'; c.lineWidth = top ? 3 : 2; rr(x, y, w, rh, 26); c.stroke();
    M(46, 900, true); c.fillStyle = rank <= 3 ? P.lime : P.sub; c.fillText(`${rank}º`, x + 30, y + 78);
    c.fillStyle = '#2B2650'; c.beginPath(); c.arc(x + 160, y + rh / 2, 32, 0, 7); c.fill();
    c.fillStyle = P.sub; c.beginPath(); c.arc(x + 160, y + rh / 2 - 8, 11, 0, 7); c.fill(); c.beginPath(); c.arc(x + 160, y + rh / 2 + 22, 20, Math.PI, 0); c.fill();
    inter(row[0], x + 212, y + 76, 38, { w: 700, col: P.white });
    inter(fmt(lbVal(i, t)), x + 690, y + 76, 36, { w: 800, col: P.white, align: 'right' });
    coin(x + 722, y + rh / 2, 17);
    inter(row[2], x + w - 34, y + 76, 42, { w: 800, col: P.lime, align: 'right' });
    c.restore();
  });
  // crown pulse on the winner once the order settles
  const cp = prog(t, T.lead + 1.15, T.lead + 1.6);
  if (cp > 0 && cp < 1) { c.save(); c.strokeStyle = rgba(P.lime, 1 - cp); c.lineWidth = 4; rr(x - 14 * cp, y0 - 14 * cp, w + 28 * cp, rh + 28 * cp, 30); c.stroke(); c.restore(); }
}

/* ---------- F · 8.8 – 12.0 : daily wheel → jackpot → whip ---------- */
// segments clockwise from the pointer (top), as on the site; 30° each
const SEG = [['10', 'd'], ['25', 'l'], ['50', 'd'], ['100', 'l'], ['CAP', 'p'], ['250', 'l'], ['500', 'd'], ['1 000', 'l'], ['2 500', 'd'], ['JACKPOT', 'j'], ['5 000', 'd'], ['750', 'l']];
const JACK = 9, SPIN_TURNS = 5;
// rotation (deg): lands the jackpot segment centre (15 + 30·9 = 285° from the pointer line) under the pointer
const FINAL_ROT = 360 * SPIN_TURNS + (360 - (15 + 30 * JACK));
function wheelRot(t) {
  const u = prog(t, T.spin, T.jackpot); if (u <= 0) return 0;
  // fast start, long confident deceleration (ease-out quint), lands exactly on the beat
  return FINAL_ROT * (1 - Math.pow(1 - u, 4.2));
}
const WHEEL_CV = mk(1000, 1000), wx = WHEEL_CV.getContext('2d');
function buildWheel() {
  const R = 470, X = wx; X.clearRect(0, 0, 1000, 1000); X.save(); X.translate(500, 500);
  X.fillStyle = '#141024'; X.beginPath(); X.arc(0, 0, R + 24, 0, 7); X.fill();
  X.strokeStyle = '#3C4410'; X.lineWidth = 10; X.beginPath(); X.arc(0, 0, R + 14, 0, 7); X.stroke();
  SEG.forEach(([lab, k], i) => {
    const a0 = (-90 + i * 30) * Math.PI / 180, a1 = a0 + Math.PI / 6, am = (a0 + a1) / 2;
    let fill = k === 'd' ? '#1C1838' : P.lime;
    if (k === 'j') { const g = X.createLinearGradient(Math.cos(am) * R, Math.sin(am) * R, 0, 0); g.addColorStop(0, '#FF8A00'); g.addColorStop(1, '#FFC21A'); fill = g; }
    if (k === 'p') { const g = X.createLinearGradient(Math.cos(am) * R, Math.sin(am) * R, 0, 0); g.addColorStop(0, '#F4FFC8'); g.addColorStop(1, '#D8F25A'); fill = g; }
    X.fillStyle = fill; X.beginPath(); X.moveTo(0, 0); X.arc(0, 0, R, a0, a1); X.closePath(); X.fill();
    X.strokeStyle = 'rgba(10,10,15,0.35)'; X.lineWidth = 3; X.stroke();
    X.save(); X.rotate(am); X.translate(R * 0.66, 0); X.rotate(Math.PI / 2);
    const dark = k === 'l' || k === 'p' || k === 'j';
    X.textAlign = 'center'; X.fillStyle = dark ? '#0A0A0F' : P.white;
    if (k === 'j') { X.font = '900 38px Montserrat'; X.fillText('JACKPOT', 0, -14); X.font = '900 46px Montserrat'; X.fillText('10 000', 0, 34); X.font = '800 24px Inter'; X.fillText('CP', 0, 64); }
    else if (k === 'p') { X.drawImage(IMG.cut_cap, -52, -40, 104, 64); }
    else { X.font = `900 ${lab.length > 3 ? 50 : 58}px Montserrat`; X.fillText(lab, 0, 0); X.font = '700 26px Inter'; X.fillText('CP', 0, 34); }
    X.restore();
  });
  X.restore();
}
function drawWheel(cx, cy, s, rot, o = {}) {
  const { tilt = 0, glowJ = 0, blur = 0 } = o;
  c.save(); c.translate(cx, cy); c.scale(s, s * (1 - tilt));
  c.shadowColor = rgba(P.lime, 0.35); c.shadowBlur = 80; c.fillStyle = '#141024'; c.beginPath(); c.arc(0, 0, 494, 0, 7); c.fill(); c.shadowBlur = 0;
  // rotational motion blur: several copies over the angular travel of half a frame
  const n = blur > 0.5 ? Math.min(9, 2 + Math.round(blur / 3)) : 1;
  for (let k = 0; k < n; k++) {
    c.save(); c.rotate((rot - (n > 1 ? blur * k / (n - 1) : 0)) * Math.PI / 180); c.globalAlpha = 1 / (k + 1);
    c.drawImage(WHEEL_CV, -500, -500); c.restore();
  }
  if (glowJ > 0) {     // the jackpot segment lights up under the pointer
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = glowJ; c.fillStyle = 'rgba(255,190,40,0.55)';
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 470, (-90 - 15) * Math.PI / 180, (-90 + 15) * Math.PI / 180); c.closePath(); c.fill(); c.restore();
  }
  // hub: GIRAR
  c.fillStyle = '#0E0A20'; c.beginPath(); c.arc(0, 0, 120, 0, 7); c.fill(); c.strokeStyle = P.lime; c.lineWidth = 8; c.stroke();
  M(46, 900); c.textAlign = 'center'; c.fillStyle = P.white; c.fillText('GIRAR', 0, 16); c.textAlign = 'left';
  c.restore();
}
function pointer(cx, cy, s, kick) {
  c.save(); c.translate(cx, cy); c.scale(s, s); c.rotate(kick);
  c.shadowColor = 'rgba(0,0,0,0.5)'; c.shadowBlur = 12; c.fillStyle = P.lime;
  c.beginPath(); c.moveTo(-40, -30); c.lineTo(40, -30); c.lineTo(0, 60); c.closePath(); c.fill(); c.shadowBlur = 0;
  c.fillStyle = '#0A0A0F'; c.beginPath(); c.arc(0, -8, 9, 0, 7); c.fill(); c.restore();
}
const JP = (() => { const r = mulberry32(77); return Array.from({ length: 70 }, () => ({ a: r() * Math.PI * 2, v: 500 + r() * 1300, s: 6 + r() * 16, col: r() < 0.5 ? '#FFC21A' : r() < 0.7 ? P.lime : P.white, g: r() })); })();
function sceneWheel(t) {
  bg(t, { light: t > T.jackpot ? 1.4 : 0.8, glowY: 0.5 });
  const headOut = t > T.jackpot - 0.05 ? 1 - prog(t, T.jackpot - 0.05, T.jackpot + 0.1) : 1;
  c.save(); c.globalAlpha *= headOut; featureHead(t, T.wheel, '03', 'RODA DA SORTE', 'DIÁRIA.', 'Gira todos os dias.', { s1: RODA_S }); c.restore();
  const e = eOutBack(prog(t, T.wheel + 0.05, T.wheel + 0.6), 1.1), cy = 1130;
  const rot = wheelRot(t), rotPrev = wheelRot(t - 0.5 / 60), vel = rot - rotPrev;
  const jk = t >= T.jackpot ? 1 : 0, zoomJ = eOutExpo(prog(t, T.jackpot, T.jackpot + 0.3));
  // whip into the next scene: spin away + punch in
  const wp = eInExpo(prog(t, T.whip, T.give));
  const s = lerp(0.2, 0.86, clamp(e)) * (1 + 0.08 * zoomJ) * (1 + 2.2 * wp), extra = wp * 540;
  const press = prog(t, T.spin - 0.08, T.spin + 0.12), hubSq = 1 - 0.1 * Math.sin(Math.PI * press);
  drawWheel(CX, cy - 60 * zoomJ, s * hubSq, rot + extra, { tilt: (1 - clamp(e)) * 0.6, glowJ: jk * (0.5 + 0.5 * Math.sin((t - T.jackpot) * 30)) * (1 - wp), blur: Math.abs(vel) + wp * 60 });
  // pointer kicks on each segment boundary
  const seg = Math.floor((rot + 0.0001) / 30), since = (rot % 30) / Math.max(1e-3, Math.abs(vel)) * 0.5 / 60;
  const kick = t > T.spin && t < T.jackpot + 0.05 ? -0.35 * Math.exp(-since * 40) : 0;
  pointer(CX, cy - 60 * zoomJ - 494 * s + 6, Math.min(1, s * 1.1), kick);
  if (t >= T.spin - 0.1 && t < T.spin + 0.5) shockRing(CX, cy, t, T.spin, { r0: 100, r1: 520, w: 8, a: 0.6 });
  // JACKPOT burst + type
  if (t >= T.jackpot) {
    const u = t - T.jackpot;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const k of JP) { const d = k.v * u * (1 - Math.min(0.6, u * 0.4)); c.globalAlpha = Math.max(0, 1 - u * 1.1) * (1 - wp); c.fillStyle = k.col; c.beginPath(); c.arc(CX + Math.cos(k.a) * d, cy - 480 + Math.sin(k.a) * d + 300 * u * u * k.g, k.s * (1 - u * 0.6), 0, 7); c.fill(); }
    c.restore();
    flash(t, T.jackpot, '#FFC21A', 0.5, 0.2);
    shockRing(CX, cy - 60, t, T.jackpot, { r0: 120, r1: 1000, w: 16, a: 0.9 });
    c.save(); c.globalAlpha *= 1 - wp;
    slam('JACKPOT!', CX, 520, 190, t, T.jackpot, { col: '#FFC21A', from: 1.6 });
    const q = eOutBack(prog(t, T.jackpot + 0.12, T.jackpot + 0.4), 1.6);
    if (q > 0) { c.save(); c.translate(CX, 640); c.scale(q, q); coin(-210, -22, 40); M(84, 900, true); c.fillStyle = P.white; c.textAlign = 'center'; c.fillText('10 000 CP', 40, 8); c.textAlign = 'left'; c.restore(); }
    c.restore();
  }
}

/* ---------- G · 12.0 – 13.6 : giveaways (real prizes from the site) ---------- */
function podium(cx, cy, w, t, t0) {
  const p = eOutExpo(prog(t, t0, t0 + 0.4)); if (p <= 0) return;
  const h = w * 0.26;
  c.save(); c.globalAlpha *= p; c.translate(0, (1 - p) * 120);
  const g = c.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0); g.addColorStop(0, '#0B0A18'); g.addColorStop(0.5, '#2A2A48'); g.addColorStop(1, '#0B0A18');
  c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy + h, w / 2, w * 0.12, 0, 0, 7); c.fill(); c.fillRect(cx - w / 2, cy, w, h);
  c.fillStyle = '#1A1830'; c.beginPath(); c.ellipse(cx, cy, w / 2, w * 0.12, 0, 0, 7); c.fill();
  c.shadowColor = P.lime; c.shadowBlur = 24; c.strokeStyle = P.lime; c.lineWidth = 4;
  c.beginPath(); c.ellipse(cx, cy, w / 2 - 4, w * 0.12 - 3, 0, 0, 7); c.stroke();
  c.beginPath(); c.ellipse(cx, cy + h * 0.55, w / 2, w * 0.12, 0, 0, Math.PI); c.stroke();
  c.restore();
}
function prize(img, cx, bottom, w, t, t0) {
  const p = prog(t, t0, t0 + 0.42); if (p <= 0) return;
  const drop = p < 1 ? (1 - eOutBack(p, 1.6)) : 0, h = w * img.height / img.width, fl = Math.sin((t - t0) * 3) * 8 * clamp(p);
  c.save(); c.globalAlpha *= clamp(p * 4);
  c.shadowColor = rgba(P.lime, 0.45); c.shadowBlur = 40;
  c.drawImage(img, cx - w / 2, bottom - h - drop * 500 + fl, w, h); c.restore();
  shockRing(cx, bottom, t, t0 + 0.28, { r0: 20, r1: w * 0.8, w: 6, a: 0.7, dur: 0.4 });
}
function sceneGive(t) {
  bg(t, { light: 1.2, glowY: 0.7 });
  // light beams from above
  c.save(); c.globalCompositeOperation = 'lighter';
  [[330, 0.5], [540, 0.8], [760, 0.5]].forEach(([x, a]) => { const g = c.createLinearGradient(x, 700, x, 1500); g.addColorStop(0, `rgba(200,240,0,0)`); g.addColorStop(1, `rgba(200,240,0,${0.16 * a})`);
    c.fillStyle = g; c.beginPath(); c.moveTo(x - 30, 650); c.lineTo(x + 30, 650); c.lineTo(x + 170, 1500); c.lineTo(x - 170, 1500); c.closePath(); c.fill(); });
  c.restore();
  featureHead(t, T.give, '04', 'GIVEAWAYS.', null, 'Prémios reais.');
  podium(215, 1250, 360, t, T.give + 0.05); podium(865, 1250, 360, t, T.give + 0.1); podium(540, 1360, 500, t, T.give);
  prize(IMG.cut_phones, 215, 1255, 250, t, T.give + 0.4);
  prize(IMG.cut_cap, 865, 1250, 360, t, T.give + 0.8);
  prize(IMG.cut_jersey, 540, 1365, 560, t, T.give + 0.2);
}

/* ---------- H · 13.6 – 15.2 : recap, one word per beat ---------- */
let RS = 120;
function sceneRecap(t) {
  bg(t, { light: 0.4, bokeh: 0.5, dark: 0.5 });
  const L = [['CASHBACK.', P.white], ['LEADERBOARD.', P.white], ['RODA DA SORTE.', P.white], ['GIVEAWAYS.', P.lime]];
  L.forEach(([s, col], i) => slam(s, CX, 640 + i * 170, RS, t, T.recap + i * BEAT, { col }));
  subLine('Tudo ligado às tuas apostas nas casas parceiras.', CX, 1400, 34, t, T.recap + 3 * BEAT + 0.1, { align: 'center', col: P.sub });
}

/* ---------- I · 15.2 – 19.2 : close + CTA ---------- */
let JS = 110, JR = 140;
function ctaPill(cx, y, t, t0) {
  const label = 'corvobetsrewards.com', fs = 56, h = 140;
  M(fs, 900, false); const lw = c.measureText(label).width, w = lw + 150;
  const p = eOutExpo(prog(t, t0, t0 + 0.5)); if (p <= 0) return;
  let pulse = 0; for (let k = 0; T.cta + 1 + k * BEAT <= T.end; k++) { const bt = T.cta + 0.8 + k * BEAT; if (t >= bt) pulse = Math.max(pulse, (k % 4 === 0 ? 0.04 : 0.018) * Math.exp(-(t - bt) * 9)); }
  const x = cx - w / 2, wp = w * p;
  c.save(); c.translate(cx, y + h / 2); c.scale(1 + pulse, 1 + pulse); c.translate(-cx, -(y + h / 2));
  c.shadowColor = rgba(P.lime, 0.5); c.shadowBlur = 60; c.fillStyle = P.lime; rr(cx - wp / 2, y, wp, h, h / 2); c.fill(); c.shadowBlur = 0;
  c.beginPath(); c.roundRect(cx - wp / 2, y, wp, h, h / 2); c.clip();
  const q = eOutExpo(prog(t, t0 + 0.12, t0 + 0.5)); c.globalAlpha = q;
  M(fs, 900, false); c.fillStyle = P.cta; c.fillText(label, x + 50, y + h / 2 + fs * 0.36 + (1 - q) * 20);
  // arrow
  const ax = x + 50 + lw + 30, ay = y + h / 2; c.strokeStyle = P.cta; c.lineWidth = 8; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(ax, ay); c.lineTo(ax + 44, ay); c.moveTo(ax + 26, ay - 18); c.lineTo(ax + 44, ay); c.lineTo(ax + 26, ay + 18); c.stroke();
  const sp = ((t - t0 - 0.7) % 1.6) / 0.7;
  if (t > t0 + 0.7 && sp < 1) { const sx = lerp(x - 200, x + w + 200, eInOutSine(sp)), g = c.createLinearGradient(sx - 120, 0, sx + 120, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,0.5)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.globalAlpha = 1; c.fillStyle = g; c.fillRect(x, y, w, h); }
  c.restore();
  shockRing(cx, y + h / 2, t, t0, { r0: 60, r1: 600, w: 8, a: 0.6 });
  shockRing(cx, y + h / 2, t, T.final, { r0: 100, r1: 700, w: 8, a: 0.7 });
}
function sceneClose(t) {
  bg(t, { light: 1.1, glowY: 0.45 });
  tunnel(t, T.close - 0.05, T.close + 0.55);
  flash(t, T.close, P.lime, 0.5, 0.2);
  rewardsLogo(CX, 450, 720, t, T.close);
  logoShine(CX, 450 - 22, 720, prog(t, T.final, T.final + 0.7));
  slam('JUNTA-TE À', CX, 790, JS, t, T.join2);
  slam('CORVO BETS', CX, 920, JS, t, T.join2 + 0.1);
  slam('REWARDS.', CX, 1075, JR, t, T.join2 + 0.2, { col: P.lime });
  ctaPill(CX, 1160, t, T.cta);
  subLine('18+ | Joga com responsabilidade.', CX, 1400, 28, t, T.cta + 0.3, { align: 'center', col: 'rgba(255,255,255,0.72)', w: 500 });
}

/* ---------- scene switcher ---------- */
function drawScene(t) {
  reset(c);
  if (t < T.drop) sceneHook(t);
  else if (t < T.pts) sceneValue(t);
  else if (t < T.cash) scenePoints(t);
  else if (t < T.lead) sceneCash(t);
  else if (t < T.wheel) sceneLead(t);
  else if (t < T.give) sceneWheel(t);
  else if (t < T.recap) sceneGive(t);
  else if (t < T.close) sceneRecap(t);
  else sceneClose(t);
  reset(c); glitchPost(t);
}
window.SUB_AT = t => (t > T.spin && t < T.jackpot) || (t > T.whip && t < T.give + 0.05) || (t > T.drop - 0.05 && t < T.v1) ? 8 : 1;
window.COMP_READY = async () => {
  HS = { a: fitSize('APOSTAS…', 960, 230, 900), b: fitSize('E NÃO RECEBES', 940, 120, 900), c: fitSize('EXTRA?', 960, 230, 900) };
  RODA_S = Math.min(fitSize('RODA DA SORTE', 890, 124, 900), 124); LEAD_S = Math.min(fitSize('LEADERBOARD', 890, 128, 900), 128);
  AUTO_S = Math.min(fitSize('AUTOMÁTICOS.', 900, 128, 900), 128);
  VS = Math.min(fitSize('AS TUAS APOSTAS', 940, 124, 900), 124); VR = fitSize('RECOMPENSAS.', 950, 170, 900);
  RS = Math.min(fitSize('RODA DA SORTE.', 940, 130, 900), fitSize('LEADERBOARD.', 940, 130, 900));
  JS = Math.min(fitSize('CORVO BETS', 940, 130, 900), 130); JR = fitSize('REWARDS.', 940, 170, 900);
  buildWheel();
};
boot();
