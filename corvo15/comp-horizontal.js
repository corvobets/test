/* =====================================================================
   CORVO BETS 15s — HORIZONTAL composition (1920×1080)
   Typography left, phone right; lifted cards float into the centre.
   ===================================================================== */
const X0 = 112;                                   // left text margin
const CARD_CY = SHOT.cards.map((_, k) => cardScreen(k).cy - SH / 2);   // card centre relative to screen centre
const LIFT = [EV.card1, EV.card2, EV.card3];

/* ---------- phone path ---------- */
const PH_LAND = { cx: 1430, cy: 560, s: 0.44, rx: 0.07, ry: -0.34, rz: 0.0 };
const PH_FOCUS = k => ({ cx: 1430, cy: 610 - CARD_CY[k] * 0.68, s: 0.68, rx: 0, ry: 0, rz: 0 });
const PH_END = { cx: 1500, cy: 560, s: 0.45, rx: 0.05, ry: -0.24, rz: 0 };
function phoneState(t) {
  if (t < EV.s2) {
    const e = eOutExpo(prog(t, EV.phoneIn, EV.phoneLand + 0.1));
    const drift = prog(t, EV.phoneLand, EV.s2);
    return { cx: lerp(1560, PH_LAND.cx, e), cy: lerp(1780, PH_LAND.cy, e) - drift * 14, s: PH_LAND.s, rx: lerp(0.55, PH_LAND.rx, e), ry: lerp(-0.62, PH_LAND.ry, e) + drift * 0.04, rz: lerp(0.12, 0, e) };
  }
  const f = [PH_FOCUS(0), PH_FOCUS(1), PH_FOCUS(2)];
  const hold = (k, t0, t1) => ({ ...f[k], cy: f[k].cy - 16 * prog(t, t0, t1) });
  return kf(t, [
    [EV.s2, { ...PH_LAND, ry: PH_LAND.ry + 0.04, cy: PH_LAND.cy - 14 }],
    [LIFT[0] - 0.05, f[0], eInOutQuart],
    [LIFT[1] - 0.4, hold(0, LIFT[0], LIFT[1] - 0.4)],
    [LIFT[1] + 0.02, f[1], eInOutQuart],
    [LIFT[2] - 0.4, hold(1, LIFT[1], LIFT[2] - 0.4)],
    [LIFT[2] + 0.02, f[2], eInOutQuart],
    [EV.cardsOut, hold(2, LIFT[2], EV.cardsOut)],
  ]);
}
const liftE = (k, t) => {
  const inn = eOutExpo(prog(t, LIFT[k], LIFT[k] + 0.55));
  const back = k < 2 ? eInOutCubic(prog(t, LIFT[k + 1] - 0.36, LIFT[k + 1] - 0.02)) : 0;
  return inn * (1 - back);
};
const CARD_TGT = { cx: 800, cy: 650, s: 1.36, rot: -0.018 };

/* ---------- A · 0 – 3 : hook ---------- */
const HOOK = ['PROGNÓSTICOS', 'DESPORTIVOS.'];
let HOOK_S = 170;
function hookText(t) {
  const move = eInOutExpo(prog(t, EV.logo, EV.logo + 0.55)), sc = lerp(1, 0.5, move);
  HOOK.forEach((s, i) => {
    const t0 = i ? EV.w2 : EV.hit, p = prog(t, t0, t0 + 0.4); if (p <= 0) return;
    const size = HOOK_S, ls = -size * 0.02, wd = tw(s, size, 900, ls);
    const y0 = 500 + i * size * 1.02, y1 = 612 + i * size * 1.02 * 0.5;
    const x = lerp(W / 2 - wd / 2, X0, move), y = lerp(y0, y1, move);
    const slamS = lerp(1.22, 1, eOutExpo(p)), outP = eInCubic(prog(t, EV.s2 - 0.22, EV.s2 + 0.04));
    c.save(); c.translate(x + wd * sc / 2, y - size * sc * 0.36); c.scale(sc * slamS, sc * slamS); c.translate(-wd / 2, size * 0.36);
    c.globalAlpha *= (i ? clamp(p * 12) : 1) * (1 - outP);
    c.translate(0, -outP * size * 0.8);
    M(size); c.letterSpacing = ls + 'px'; c.fillStyle = P.white; c.fillText(s, 0, 0); c.letterSpacing = '0px';
    c.restore();
  });
}
function sceneA(t) { stage(t); if (t >= EV.phoneIn) drawPhone(phoneState(t)); overlayA(t); }
function overlayA(t) {
  hookText(t);
  const la = 1 - eInCubic(prog(t, EV.s2 - 0.24, EV.s2 + 0.04));
  c.save(); c.translate(0, -eInCubic(prog(t, EV.s2 - 0.24, EV.s2 + 0.04)) * 60);
  logoReveal(X0 + 280, 408, 560, t, EV.logo, { a: la });
  c.restore();
}

/* ---------- B · 3 – 9 : Telegram hero ---------- */
function headlineB(t, a = 1) {
  lineRise('NO TELEGRAM.', X0, 222, 120, t, EV.s2, null, { a });
  lineRise('GRÁTIS.', X0, 350, 120, t, EV.gratis, null, { col: P.lime, a });
}
function sceneB(t, whip = 0) {
  stage(t, { glowY: 0.55 });
  c.save(); c.translate(-whip * 900, 0);
  const ph = phoneState(t);
  let k = -1, e = 0;
  for (let j = 0; j < 3; j++) { const ej = liftE(j, t); if (ej > e) { e = ej; k = j; } }
  drawPhone(ph, { dim: e * 0.55, slot: k, slotA: e });
  if (k >= 0) {
    const lc = drawLiftedCard(k, ph, CARD_TGT, e, { t });
    checkHighlight(k, lc, prog(t, LIFT[k] + 0.4, LIFT[k] + 1.1));
  }
  c.restore();
  headlineB(t, 1 - whip);
}

/* ---------- C · 9 – 11 : shirt shot ---------- */
const EDGE_TOP = 900;                                   // slanted panel edge (BETS-tag angle)
const edgeX = (y, off = 0) => EDGE_TOP - y * SLANT + off;
const footIdx = t => lerp(20, 85, prog(t, EV.s3, EV.footOut));
function footagePanel(t, off = 0) {
  const push = lerp(1.0, 1.05, prog(t, EV.s3 - 0.3, EV.footOut)), s = push;
  const x = 440 - (1920 * (s - 1)) / 2 + 60, y = -(1080 * (s - 1)) / 2;
  const clip = () => { c.beginPath(); c.moveTo(edgeX(0, off), 0); c.lineTo(W + 10, 0); c.lineTo(W + 10, H); c.lineTo(edgeX(H, off), H); c.closePath(); };
  drawFootage(Math.round(footIdx(t)), x, y, s, { clip, grade: 0.62 });
  // cut-out stays inside the panel
  c.save(); clip(); c.clip(); const ct = footFrame(Math.round(footIdx(t)), 'cut'); if (ct) c.drawImage(ct, x, y, 1920 * s, 1080 * s); c.restore();
  c.fillStyle = P.lime; c.beginPath(); c.moveTo(edgeX(0, off) - 14, 0); c.lineTo(edgeX(0, off), 0); c.lineTo(edgeX(H, off), H); c.lineTo(edgeX(H, off) - 14, H); c.closePath(); c.fill();
}
function textC(t, a = 1) {
  const sBig = fitSize('41 MIL', 780, 240);
  lineRise('MAIS DE', X0, 400, 104, t, EV.s3, null, { a });
  const p = prog(t, EV.s3 + 0.06, EV.s3 + 0.46);
  if (p > 0) {
    c.save(); const sc = lerp(1.18, 1, eOutExpo(p)); c.translate(X0, 620); c.scale(sc, sc); c.globalAlpha *= clamp(p * 4) * a;
    M(sBig); c.letterSpacing = -sBig * 0.03 + 'px'; c.fillStyle = P.white; c.fillText('41 MIL', 0, 0); c.letterSpacing = '0px'; c.restore();
  }
  lineRise('NO CORVO.', X0, 770, 104, t, EV.corvo, null, { col: P.lime, a });
}
function sceneC(t) {
  stage(t, { glowY: 0.5, light: 0.8 });
  const out = eInOutCubic(prog(t, EV.footOut - 0.05, EV.pause));
  if (out < 1) footagePanel(t, out * (W - EDGE_TOP + 300));
  const suck = eInCubic(prog(t, EV.pause, EV.final));
  c.save(); c.translate(X0, 560); c.scale(1 - suck * 0.06, 1 - suck * 0.06); c.translate(-X0, -560);
  textC(t, 1 - prog(t, EV.final - 0.06, EV.final));
  c.restore();
}

/* ---------- D · 11 – 15 : final ---------- */
const FINAL = { logoCy: 214, logoW: 540, head: ['OS PRÓXIMOS', 'PROGNÓSTICOS', ['ESTÃO NO ', 'TELEGRAM.']], y0: 0, ctaY: 0 };
let FS_HEAD = 96;
function ctaPill(x, y, t, t0) {
  const p = eOutExpo(prog(t, t0, t0 + 0.55)); if (p <= 0) return;
  const label = 'ENTRAR NO CORVO BETS', fs = 58, lw = tw(label, fs, 900, 0.5), h = 146, iconD = 98, w = 36 + iconD + 26 + lw + 58;
  c.save();
  c.shadowColor = rgba(P.lime, 0.45); c.shadowBlur = 50;
  c.fillStyle = P.lime; rr(x, y, w * p, h, h / 2); c.fill(); c.shadowBlur = 0;
  c.beginPath(); c.roundRect(x, y, w * p, h, h / 2); c.clip();
  const q = eOutExpo(prog(t, t0 + 0.12, t0 + 0.55));
  c.globalAlpha = q;
  c.fillStyle = P.cta; c.beginPath(); c.arc(x + 22 + iconD / 2, y + h / 2, iconD / 2, 0, 7); c.fill();
  tgPlane(x + 22 + iconD / 2 - 3, y + h / 2 + 1, iconD * 0.62, P.lime);
  c.translate(0, (1 - q) * 20);
  M(fs); c.letterSpacing = '0.5px'; c.fillStyle = P.cta; c.fillText(label, x + 36 + iconD + 22, y + h / 2 + fs * 0.36); c.letterSpacing = '0px';
  // periodic sheen once settled
  const sp = ((t - t0 - 0.8) % 1.6) / 0.7;
  if (t > t0 + 0.8 && sp < 1) {
    const sx = lerp(x - 200, x + w + 200, eInOutSine(sp)), g = c.createLinearGradient(sx - 120, 0, sx + 120, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha = 1; c.fillStyle = g; c.fillRect(x, y, w, h);
  }
  c.restore();
  return w;
}
function sceneD(t) {
  const push = 1 + 0.02 * eInOutSine(prog(t, EV.final, EV.end));
  stage(t, { glowY: 0.6 });
  c.save(); c.translate(W / 2, H / 2); c.scale(push, push); c.translate(-W / 2, -H / 2);
  // phone slides in from the right
  const e = eOutExpo(prog(t, EV.final + 0.05, EV.final + 0.9));
  const ph = { ...PH_END, cx: lerp(2350, PH_END.cx, e), ry: lerp(-0.6, PH_END.ry, e), rz: lerp(0.08, 0, e), cy: PH_END.cy - 10 * prog(t, EV.final + 0.9, EV.end) };
  drawPhone(ph);
  logoReveal(X0 + FINAL.logoW / 2, FINAL.logoCy, FINAL.logoW, t, EV.final);
  const fs = FS_HEAD, lh = fs * 1.06;
  FINAL.head.forEach((ln, i) => {
    const y = FINAL.y0 + i * lh, t0 = EV.head2 + i * 0.1;
    if (Array.isArray(ln)) {
      const w1 = lineRise(ln[0], X0, y, fs, t, t0); lineRise(ln[1], X0 + w1, y, fs, t, t0 + 0.05, null, { col: P.lime });
    } else lineRise(ln, X0, y, fs, t, t0);
  });
  ctaPill(X0, FINAL.y0 + 2 * lh + 82, t, EV.cta);
  txt('18+ | Joga com responsabilidade.', X0, 1010, 25, { w: 600, col: 'rgba(255,255,255,0.72)', a: eOutCubic(prog(t, EV.cta + 0.2, EV.cta + 0.6)) });
  c.restore();
}

/* ---------- scene switcher + transitions ---------- */
function drawScene(t) {
  reset(c);
  c.fillStyle = P.purple; c.fillRect(0, 0, W, H);
  if (t < EV.s2) sceneA(t);
  if (t >= EV.s2 - 0.001 && t < EV.s3 + 0.2) {
    // A → B handover happens in place (phone continues, headline swaps)
    if (t < EV.s2 + 0.06 && t >= EV.s2) { sceneB(t); overlayA(t); }
    else if (t >= EV.s2) {
      const w = prog(t, EV.cardsOut, EV.s3 + 0.08);
      if (w < 1) sceneB(t, eInCubic(w));
      if (w > 0) {   // slanted lime band wipe into the shirt shot
        const p = eInOutCubic(w), x = lerp(W + 500, -700, p);
        c.save(); c.beginPath(); c.moveTo(x + 340, -20); c.lineTo(W + 800, -20); c.lineTo(W + 800, H + 20); c.lineTo(x + 340 - (H + 40) * SLANT, H + 20); c.closePath(); c.clip(); sceneC(t); c.restore();
        c.fillStyle = P.lime; c.beginPath(); c.moveTo(x, -20); c.lineTo(x + 340, -20); c.lineTo(x + 340 - (H + 40) * SLANT, H + 20); c.lineTo(x - (H + 40) * SLANT, H + 20); c.closePath(); c.fill();
      }
      if (w >= 1) sceneC(t);
    }
  } else if (t >= EV.s3 + 0.2 && t < EV.final) sceneC(t);
  else if (t >= EV.final) sceneD(t);
  // hit flashes
}
window.COMP_READY = async () => {
  HOOK_S = Math.min(fitSize(HOOK[0], 1680, 176), fitSize(HOOK[1], 1680, 176));
  FS_HEAD = Math.min(108, fitSize('ESTÃO NO TELEGRAM.', 1120, 108), fitSize('PROGNÓSTICOS', 1120, 108));
  FINAL.y0 = 350 + FS_HEAD * 0.78;
};
boot();
