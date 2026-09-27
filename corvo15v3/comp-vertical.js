/* =====================================================================
   CORVO BETS 15s V3 — VERTICAL composition (1080×1920, Stories / Reels)
   Essential text, logo and CTA stay inside x ≈ 60 – 1000, y ≈ 250 – 1420:
   clear of the platform UI at the top, the bottom and the right-hand rail.
   ===================================================================== */
const CX = W / 2;
// the recording's bet-slip header inside the screen texture (px): where the summary card lifts from
const HEADER = { u0: 12, u1: 978, v0: STATUS + 8, v1: STATUS + 209 };

/* ---------- phone path ---------- */
const S_HERO = 0.905;
const PH_HOOK = { cx: 560, cy: 1745, s: 0.6, rx: 0.3, ry: -0.2, rz: 0.035 };
const PH_HERO = { cx: 540, cy: 580 + (SH / 2) * S_HERO, s: S_HERO, rx: 0, ry: 0, rz: 0 };
const PH_DOWN = { cx: 540, cy: 1180 + (SH / 2) * 0.74, s: 0.74, rx: 0.16, ry: 0, rz: 0 };
function phoneState(t) {
  if (t < EV.s2) {
    const e = eOutExpo(prog(t, EV.phoneIn, EV.phoneLand + 0.15)), drift = prog(t, EV.phoneLand, EV.s2);
    return { ...PH_HOOK, cy: lerp(2900, PH_HOOK.cy, e) - drift * 14, rx: lerp(0.75, PH_HOOK.rx, e), ry: lerp(-0.45, PH_HOOK.ry, e) + drift * 0.03, rz: lerp(0.12, PH_HOOK.rz, e) };
  }
  const hookEnd = { ...PH_HOOK, cy: PH_HOOK.cy - 14, ry: PH_HOOK.ry + 0.03 };
  const hero = (p) => ({ ...PH_HERO, cy: PH_HERO.cy - 26 * p, s: PH_HERO.s * (1 + 0.025 * p) });
  const pd = prog(t, EV.s2 + 0.6, EV.top);
  return kf(t, [
    [EV.s2, hookEnd],
    [EV.s2 + 0.6, hero(0), eInOutQuart],
    [EV.top, hero(1), eInOutSine],
    [EV.reveal, { ...hero(1), cy: hero(1).cy + 30 }, eInOutCubic],
    [EV.reveal + 0.7, PH_DOWN, eInOutQuart],
    [EV.pause, { ...PH_DOWN, cy: PH_DOWN.cy + 40 }, eInOutSine],
    [EV.final + 0.25, { ...PH_DOWN, cy: PH_DOWN.cy + 1200, rx: 0.4 }, eInCubic],
  ]);
}

/* ---------- A · 0 – 2 : hook ---------- */
let S25 = 160, SNUM = 190;
function slamLine(s, y, size, t, t0, col, outP, arrow = 0) {
  if (t < t0) return; const p = prog(t, t0, t0 + 0.42);
  const ls = -size * 0.025, tw0 = tw(s, size, 900, ls), aw = arrow ? size * 0.95 : 0, gap = arrow ? size * 0.26 : 0, wd = tw0 + gap + aw, sc = lerp(1.25, 1, eOutExpo(p));
  c.save(); c.translate(CX, y - size * 0.36); c.scale(sc, sc); c.translate(-wd / 2, size * 0.36);
  c.globalAlpha *= (t0 > 0 ? clamp(p * 10) : 1) * (1 - outP); c.translate(0, -outP * size * 0.9);
  M(size); c.letterSpacing = ls + 'px'; c.fillStyle = col; c.fillText(s, 0, 0); c.letterSpacing = '0px';
  if (arrow) {                                   // bold drawn arrow (the font's → is too thin at this size)
    const ax = tw0 + gap, ay = -size * 0.36, th = size * 0.15, hw = size * 0.36, hl = size * 0.4, q = eOutExpo(prog(t, t0 + 0.08, t0 + 0.5));
    c.save(); c.translate(ax - (1 - q) * size * 0.3, ay); c.globalAlpha *= q; c.fillStyle = P.lime;
    c.beginPath(); c.moveTo(0, -th / 2); c.lineTo(aw - hl, -th / 2); c.lineTo(aw - hl, -hw); c.lineTo(aw, 0); c.lineTo(aw - hl, hw); c.lineTo(aw - hl, th / 2); c.lineTo(0, th / 2); c.closePath(); c.fill();
    c.restore();
  }
  c.restore();
}
function tagBox(label, cy, t, t0, outP) {       // slanted violet tag with the BETS-tag angle
  const p = eOutExpo(prog(t, t0, t0 + 0.45)); if (p <= 0) return;
  const fs = 56, ls = 7, lw = tw(label, fs, 900, ls), h = 96, w = lw + 96, sl = h * SLANT;
  c.save(); c.globalAlpha *= 1 - outP; c.translate(CX, cy - outP * 80);
  c.beginPath(); c.moveTo(-w / 2 + sl, -h / 2); c.lineTo(w / 2 + sl, -h / 2); c.lineTo(w / 2 - sl, h / 2); c.lineTo(-w / 2 - sl, h / 2); c.closePath();
  c.save(); c.clip(); c.fillStyle = P.violet; c.fillRect(-w / 2 - sl, -h / 2, (w + sl * 2) * p, h); c.restore();
  const q = eOutExpo(prog(t, t0 + 0.1, t0 + 0.5));
  c.beginPath(); c.rect(-w / 2 - sl, -h / 2, w + 2 * sl, h); c.clip();
  M(fs); c.letterSpacing = ls + 'px'; c.fillStyle = P.white; c.textAlign = 'center'; c.fillText(label, 3, fs * 0.36 + (1 - q) * h); c.letterSpacing = '0px';
  c.restore();
}
function overlayA(t) {
  const outP = eInCubic(prog(t, EV.s2 - 0.2, EV.s2 + 0.02));
  if (outP >= 1) return;
  c.save(); c.translate(0, -outP * 70); logoReveal(CX, 360, 560, t, EV.hit - 0.4, { a: 1 - outP });   // already on screen at frame 0 c.restore();
  slamLine('25 €', 640, S25, t, EV.hit, P.white, outP, 1);
  slamLine('2 110,75 €', 640 + SNUM * 1.08, SNUM, t, EV.num, P.lime, outP);
  tagBox('APOSTA GANHA', 1000, t, EV.tag, outP);
}

/* ---------- B · 2 – 7 : the actual bet ---------- */
let HB = 118;
const HB_Y = [352, 480];
function headlineB(t) {
  const out = EV.reveal + 3.6;
  lineRise('14 SELEÇÕES.', CX, HB_Y[0], HB, t, EV.s2 + 0.04, out, { align: 'center' });
  lineRise('TUDO GREEN.', CX, HB_Y[1], HB, t, EV.head2, out + 0.06, { align: 'center', col: P.lime });
}

/* ---------- C · 7 – 11 : the summary card lifts out ---------- */
const CARD_UP = { cx: 540, cy: 820, s: 1.075 };
const CARD_END = { cx: 540, cy: 975, s: 0.9 };
function cardState(t, ph) {
  // start: over the recording's own header, same width
  const [ax, ay] = phonePt(ph, (HEADER.u0 + HEADER.u1) / 2, (HEADER.v0 + HEADER.v1) / 2);
  const s0 = (HEADER.u1 - HEADER.u0) / SUM_W * ph.s;
  const e = eOutExpo(prog(t, EV.reveal, EV.reveal + 0.7));
  const push = eInOutSine(prog(t, EV.reveal + 0.7, EV.pause));
  const up = { cx: CARD_UP.cx, cy: CARD_UP.cy - 10 * push, s: CARD_UP.s * (1 + 0.03 * push) };
  const f = eInOutQuart(prog(t, EV.pause - 0.1, EV.final + 0.5));
  const cx = lerp(lerp(ax, up.cx, e), CARD_END.cx, f), cy = lerp(lerp(ay, up.cy, e), CARD_END.cy, f), s = lerp(lerp(s0, up.s, e), CARD_END.s, f);
  return { cx, cy, s, e, rot: lerp(-0.012, 0, e) * (1 - f), a: clamp(prog(t, EV.reveal, EV.reveal + 0.08)) };
}
function drawCard(t, ph) {
  if (t < EV.reveal) return;
  const k = cardState(t, ph);
  const m = drawSummary(k.cx, k.cy, k.s, { a: k.a, lift: k.e, rim: k.e * (1 - 0.4 * prog(t, EV.final, EV.final + 0.6)), rot: k.rot });
  // specular sweep across the card as it settles
  const sw = prog(t, EV.reveal + 0.3, EV.reveal + 1.0);
  if (m && sw > 0 && sw < 1) {
    const w = SUM_W * k.s, h = SUM_H * k.s;
    c.save(); c.translate(k.cx, k.cy); c.rotate(k.rot); rr(-w / 2, -h / 2, w, h, SUM.r * k.s); c.clip();
    const x = lerp(-w * 0.75, w * 0.75, eInOutSine(sw)), g = c.createLinearGradient(x - 170, 0, x + 170, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(-w / 2, -h / 2, w, h); c.restore();
  }
  // highlights on the real elements
  ringAround(m, SUM.badge, prog(t, EV.ganho, EV.ganho + 0.7), { pad: 8 });
  ringAround(m, SUM.badge, prog(t, EV.ganho + 0.14, EV.ganho + 0.84), { pad: 8 });
  SUM.segs.forEach(([u0, u1], i) => {          // each of the 14 bars catches the light in turn
    const t0 = EV.bars + i * (EV.barsEnd - EV.bars) / 14, p = prog(t, t0, t0 + 0.22);
    if (p <= 0 || p >= 1 || !m) return;
    const [x, y] = m.map((u0 + u1) / 2, (SUM.bars[1] + SUM.bars[3]) / 2), w = (u1 - u0) * m.s, h = (SUM.bars[3] - SUM.bars[1]) * m.s;
    c.save(); c.translate(x, y); c.rotate(m.rot); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.55 * Math.sin(Math.PI * p);
    c.fillStyle = '#FFFFFF'; rr(-w / 2, -h / 2, w, h, h / 2); c.fill(); c.restore();
  });
  const fade = 1 - prog(t, EV.pause - 0.1, EV.pause + 0.15);
  underline(m, SUM.ret, prog(t, EV.ret, EV.ret + 0.45), { gap: 9, th: 6, a: fade });
  ringAround(m, SUM.ret, prog(t, EV.ret, EV.ret + 0.7), { pad: 10 });
  underline(m, SUM.odds, prog(t, EV.odds, EV.odds + 0.45), { gap: 9, th: 6, a: fade });
  ringAround(m, SUM.odds, prog(t, EV.odds, EV.odds + 0.7), { pad: 10 });
}

/* ---------- D · 11 – 15 : invitation ---------- */
let FS_HEAD = 120, CTA_FS = 50;
function ctaPill(cx, y, t, t0) {
  const label = 'ENTRAR NO CORVO BETS', fs = CTA_FS, lw = tw(label, fs, 900, 0.5), h = 140, iconD = 96, w = 24 + iconD + 24 + lw + 48;
  const p = eOutExpo(prog(t, t0, t0 + 0.55)); if (p <= 0) return;
  const x = cx - w / 2, wp = w * p, xp = cx - wp / 2;
  c.save();
  c.shadowColor = rgba(P.lime, 0.45); c.shadowBlur = 56;
  c.fillStyle = P.lime; rr(xp, y, wp, h, h / 2); c.fill(); c.shadowBlur = 0;
  c.beginPath(); c.roundRect(xp, y, wp, h, h / 2); c.clip();
  const q = eOutExpo(prog(t, t0 + 0.12, t0 + 0.55));
  c.globalAlpha = q;
  c.fillStyle = P.cta; c.beginPath(); c.arc(x + 22 + iconD / 2, y + h / 2, iconD / 2, 0, 7); c.fill();
  tgPlane(x + 22 + iconD / 2 - 3, y + h / 2 + 1, iconD * 0.62, P.lime);
  c.translate(0, (1 - q) * 20);
  M(fs); c.letterSpacing = '0.5px'; c.fillStyle = P.cta; c.fillText(label, x + 24 + iconD + 22, y + h / 2 + fs * 0.36); c.letterSpacing = '0px';
  const sp = ((t - t0 - 0.8) % 1.6) / 0.7;
  if (t > t0 + 0.8 && sp < 1) {
    const sx = lerp(x - 200, x + w + 200, eInOutSine(sp)), g = c.createLinearGradient(sx - 120, 0, sx + 120, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha = 1; c.fillStyle = g; c.fillRect(x, y, w, h);
  }
  c.restore();
}
function finalType(t) {
  logoReveal(CX, 335, 590, t, EV.final);
  lineRise('PROGNÓSTICOS', CX, 560, FS_HEAD, t, EV.head, null, { align: 'center' });
  lineRise('NO TELEGRAM.', CX, 560 + FS_HEAD * 1.06, FS_HEAD, t, EV.head + 0.1, null, { align: 'center', col: P.lime });
  lineRise('ACESSO GRATUITO.', CX, 560 + FS_HEAD * 1.06 + 92, 46, t, EV.gratis, null, { align: 'center', w: 800, ls: 7 });
  ctaPill(CX, 1168, t, EV.cta);
  txt('18+ | Joga com responsabilidade.', CX, 1392, 27, { w: 600, align: 'center', col: 'rgba(255,255,255,0.72)', a: eOutCubic(prog(t, EV.cta + 0.25, EV.cta + 0.65)) });
}

/* ---------- scene ---------- */
function drawScene(t) {
  reset(c);
  stage(t, { glowY: t < EV.final ? 0.62 : 0.66 });
  const st = SCROLL(t);
  const ph = phoneState(t);
  const lifted = t >= EV.reveal ? eOutExpo(prog(t, EV.reveal, EV.reveal + 0.5)) : 0;
  if (t >= EV.phoneIn && ph.cy - PHH / 2 * ph.s < H + 40) {
    buildScreen(st);
    const dim = lifted * 0.85 * (1 - 0.0 * prog(t, EV.final, EV.final + 0.4));
    drawPhone(ph, { dim, slot: [HEADER.u0, HEADER.v0, HEADER.u1, HEADER.v1], slotA: lifted });
  }
  if (t < EV.s2 + 0.2) overlayA(t);
  if (t >= EV.s2) headlineB(t);
  drawCard(t, ph);
  if (t >= EV.final) finalType(t);
}
// extra motion-blur sub-frames where things move fast
window.SUB_AT = t => (t > EV.top && t < EV.topEnd + 0.05) ? 10 : (t > EV.reveal && t < EV.reveal + 0.35) || (t > EV.s2 && t < EV.s2 + 0.5) ? 6 : 1;
window.COMP_READY = async () => {
  S25 = 170;
  SNUM = fitSize('2 110,75 €', 950, 210);
  HB = Math.min(fitSize('14 SELEÇÕES.', 940, 124), fitSize('TUDO GREEN.', 940, 124));
  FS_HEAD = Math.min(fitSize('PROGNÓSTICOS', 920, 124), fitSize('NO TELEGRAM.', 920, 124));
  CTA_FS = fitSize('ENTRAR NO CORVO BETS', 820 - (24 + 96 + 24 + 48), 52, 900, 0.5 / 52);
};
boot();
