/* =====================================================================
   CORVO BETS 15s — VERTICAL composition (1080×1920, Stories / Reels)
   Stacked, centred typography; a larger phone and larger lifted cards.
   Essential text and the CTA stay inside y ≈ 280 – 1480 (clear of the
   platform UI at the top and bottom).
   ===================================================================== */
const CX = W / 2;
const CARD_CY = SHOT.cards.map((_, k) => cardScreen(k).cy - SH / 2);
const LIFT = [EV.card1, EV.card2, EV.card3];

/* ---------- phone path ---------- */
const PH_LAND = { cx: 540, cy: 1360, s: 0.5, rx: 0.1, ry: 0.16, rz: 0 };
const PH_FOCUS = k => ({ cx: 540, cy: 1060 - CARD_CY[k] * 0.84, s: 0.84, rx: 0, ry: 0, rz: 0 });
const PH_END = { cx: 540, cy: 1000 + 0.5 * PHH * 0.5, s: 0.5, rx: 0.1, ry: 0.0, rz: 0 };
function phoneState(t) {
  if (t < EV.s2) {
    const e = eOutExpo(prog(t, EV.phoneIn, EV.phoneLand + 0.1)), drift = prog(t, EV.phoneLand, EV.s2);
    return { cx: lerp(620, PH_LAND.cx, e), cy: lerp(2700, PH_LAND.cy, e) - drift * 16, s: PH_LAND.s, rx: lerp(0.7, PH_LAND.rx, e), ry: lerp(0.45, PH_LAND.ry, e) - drift * 0.04, rz: lerp(-0.1, 0, e) };
  }
  const f = [PH_FOCUS(0), PH_FOCUS(1), PH_FOCUS(2)];
  const hold = (k, t0, t1) => ({ ...f[k], cy: f[k].cy - 18 * prog(t, t0, t1) });
  return kf(t, [
    [EV.s2, { ...PH_LAND, ry: PH_LAND.ry - 0.04, cy: PH_LAND.cy - 16 }],
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
const CARD_TGT = { cx: 540, cy: 1010, s: 1.25, rot: -0.014 };

/* ---------- A · 0 – 3 : hook ---------- */
const HOOK = ['PROGNÓSTICOS', 'DESPORTIVOS.'];
let HOOK_S = 110;
function hookText(t) {
  const move = eInOutExpo(prog(t, EV.logo, EV.logo + 0.55)), sc = lerp(1, 0.84, move);
  HOOK.forEach((s, i) => {
    const t0 = i ? EV.w2 : EV.hit, p = prog(t, t0, t0 + 0.4); if (p <= 0) return;
    const size = HOOK_S, ls = -size * 0.02, wd = tw(s, size, 900, ls);
    const y = lerp(900 + i * size * 1.04, 640 + i * size * 1.04 * sc, move);
    const slamS = lerp(1.22, 1, eOutExpo(p)), outP = eInCubic(prog(t, EV.s2 - 0.22, EV.s2 + 0.04));
    c.save(); c.translate(CX, y - size * sc * 0.36); c.scale(sc * slamS, sc * slamS); c.translate(-wd / 2, size * 0.36);
    c.globalAlpha *= clamp(p * 5) * (1 - outP);
    c.translate(0, -outP * size * 0.8);
    M(size); c.letterSpacing = ls + 'px'; c.fillStyle = P.white; c.fillText(s, 0, 0); c.letterSpacing = '0px';
    c.restore();
  });
}
function sceneA(t) { stage(t, { glowY: 0.7 }); if (t >= EV.phoneIn) drawPhone(phoneState(t)); overlayA(t); }
function overlayA(t) {
  hookText(t);
  const o = eInCubic(prog(t, EV.s2 - 0.24, EV.s2 + 0.04));
  c.save(); c.translate(0, -o * 60);
  logoReveal(CX, 440, 660, t, EV.logo, { a: 1 - o });
  c.restore();
}

/* ---------- B · 3 – 9 : Telegram hero ---------- */
let HB = 122;
function headlineB(t, a = 1) {
  lineRise('NO TELEGRAM.', CX, 400, HB, t, EV.s2, null, { a, align: 'center' });
  lineRise('GRÁTIS.', CX, 400 + HB * 1.05, HB, t, EV.gratis, null, { col: P.lime, a, align: 'center' });
}
function sceneB(t, whip = 0) {
  stage(t, { glowY: 0.6 });
  c.save(); c.translate(-whip * 700, 0);
  const ph = phoneState(t);
  let k = -1, e = 0;
  for (let j = 0; j < 3; j++) { const ej = liftE(j, t); if (ej > e) { e = ej; k = j; } }
  drawPhone(ph, { dim: e * 0.55, slot: k, slotA: e });
  c.restore();
  // the phone scrolls under the headline: stage-coloured header fade
  stageOverlay(t, 540, 780, { glowY: 0.6 });
  headlineB(t, 1 - whip);
  c.save(); c.translate(-whip * 700, 0);
  if (k >= 0) {
    const lc = drawLiftedCard(k, ph, CARD_TGT, e, { t });
    checkHighlight(k, lc, prog(t, LIFT[k] + 0.4, LIFT[k] + 1.1));
  }
  c.restore();
}

/* ---------- C · 9 – 11 : shirt shot, reframed around the person ---------- */
const FOOT_S = 1.9, FOOT_Y = 150;
const footIdx = t => lerp(20, 85, prog(t, EV.s3, EV.footOut));
function footageFull(t, off = 0) {
  const i = Math.round(footIdx(t)), m = CLIPS.shirt.frames[i] || {};
  const push = lerp(1.0, 1.04, prog(t, EV.s3 - 0.3, EV.footOut)), s = FOOT_S * push;
  // keep the person centred (smoothed centroid), never distort — uniform scale only
  const cxSrc = lerp(950, (m.c ? m.c[0] : 950), 0.5);
  const x = CX - cxSrc * s, y = FOOT_Y - (1080 * s - 1080 * FOOT_S) * 0.3;
  const clip = () => { c.beginPath(); c.moveTo(off, 0); c.lineTo(W + 10 + off, 0); c.lineTo(W + 10 + off, H); c.lineTo(off - H * SLANT, H); c.closePath(); };
  drawFootage(i, x, y, s, { clip, grade: 0.6 });
  c.save(); clip(); c.clip();
  const ct = footFrame(i, 'cut'); if (ct) c.drawImage(ct, x, y, 1920 * s, 1080 * s);
  // blend the top edge into the stage and darken the lower third for the type
  let g = c.createLinearGradient(0, y, 0, y + 260); g.addColorStop(0, rgba(P.purple, 1)); g.addColorStop(1, rgba(P.purple, 0));
  c.fillStyle = g; c.fillRect(0, 0, W, y + 260); c.fillStyle = P.purple; c.fillRect(0, 0, W, y);
  g = c.createLinearGradient(0, 880, 0, 1560); g.addColorStop(0, rgba(P.purple, 0)); g.addColorStop(1, rgba(P.purple, 0.92));
  c.fillStyle = g; c.fillRect(0, 880, W, H - 880);
  c.restore();
  // lime edge follows the slanted exit
  if (off > 0) { c.fillStyle = P.lime; c.beginPath(); c.moveTo(off - 16, 0); c.lineTo(off, 0); c.lineTo(off - H * SLANT, H); c.lineTo(off - 16 - H * SLANT, H); c.closePath(); c.fill(); }
}
let S41 = 240;
function textC(t, a = 1) {
  lineRise('MAIS DE', CX, 1090, 100, t, EV.s3, null, { a, align: 'center' });
  const p = prog(t, EV.s3 + 0.06, EV.s3 + 0.46);
  if (p > 0) {
    const wd = tw('41 MIL', S41, 900, -S41 * 0.03);
    c.save(); const sc = lerp(1.18, 1, eOutExpo(p)); c.translate(CX, 1300 - S41 * 0.36); c.scale(sc, sc); c.translate(-wd / 2, S41 * 0.36); c.globalAlpha *= clamp(p * 4) * a;
    M(S41); c.letterSpacing = -S41 * 0.03 + 'px'; c.fillStyle = P.white; c.fillText('41 MIL', 0, 0); c.letterSpacing = '0px'; c.restore();
  }
  lineRise('NO CORVO.', CX, 1430, 100, t, EV.corvo, null, { col: P.lime, a, align: 'center' });
}
function sceneC(t) {
  stage(t, { glowY: 0.6, light: 0.8 });
  const out = eInOutCubic(prog(t, EV.footOut - 0.05, EV.pause));
  if (out < 1) footageFull(t, out * (W + H * SLANT + 40));
  const suck = eInCubic(prog(t, EV.pause, EV.final));
  c.save(); c.translate(CX, 1260); c.scale(1 - suck * 0.06, 1 - suck * 0.06); c.translate(-CX, -1260);
  textC(t, 1 - prog(t, EV.final - 0.06, EV.final));
  c.restore();
}

/* ---------- D · 11 – 15 : final ---------- */
const FINAL = { logoCy: 350, logoW: 640, head: ['OS PRÓXIMOS', 'PROGNÓSTICOS', 'ESTÃO NO', 'TELEGRAM.'], y0: 0 };
let FS_HEAD = 118;
function ctaPill(cx, y, t, t0) {
  const label = 'ENTRAR NO CORVO BETS', fs = 54, lw = tw(label, fs, 900, 0.5), h = 150, iconD = 100, w = 30 + iconD + 24 + lw + 52;
  const p = eOutExpo(prog(t, t0, t0 + 0.55)); if (p <= 0) return;
  const x = cx - w / 2, wp = w * p, xp = cx - wp / 2;
  c.save();
  c.shadowColor = rgba(P.lime, 0.45); c.shadowBlur = 56;
  c.fillStyle = P.lime; rr(xp, y, wp, h, h / 2); c.fill(); c.shadowBlur = 0;
  c.beginPath(); c.roundRect(xp, y, wp, h, h / 2); c.clip();
  const q = eOutExpo(prog(t, t0 + 0.12, t0 + 0.55));
  c.globalAlpha = q;
  c.fillStyle = P.cta; c.beginPath(); c.arc(x + 25 + iconD / 2, y + h / 2, iconD / 2, 0, 7); c.fill();
  tgPlane(x + 25 + iconD / 2 - 3, y + h / 2 + 1, iconD * 0.62, P.lime);
  c.translate(0, (1 - q) * 20);
  M(fs); c.letterSpacing = '0.5px'; c.fillStyle = P.cta; c.fillText(label, x + 30 + iconD + 22, y + h / 2 + fs * 0.36); c.letterSpacing = '0px';
  const sp = ((t - t0 - 0.8) % 1.6) / 0.7;
  if (t > t0 + 0.8 && sp < 1) {
    const sx = lerp(x - 200, x + w + 200, eInOutSine(sp)), g = c.createLinearGradient(sx - 120, 0, sx + 120, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha = 1; c.fillStyle = g; c.fillRect(x, y, w, h);
  }
  c.restore();
}
function sceneD(t) {
  const push = 1 + 0.02 * eInOutSine(prog(t, EV.final, EV.end));
  stage(t, { glowY: 0.72 });
  c.save(); c.translate(W / 2, H * 0.45); c.scale(push, push); c.translate(-W / 2, -H * 0.45);
  const e = eOutExpo(prog(t, EV.final + 0.05, EV.final + 0.9));
  const ph = { ...PH_END, cy: lerp(PH_END.cy + 900, PH_END.cy, e) - 10 * prog(t, EV.final + 0.9, EV.end), rx: lerp(0.5, PH_END.rx, e) };
  drawPhone(ph);
  // the phone fades into the stage towards the bottom (platform UI area)
  stageOverlay(t, 1450, 1250, { glowY: 0.72 });
  logoReveal(CX, FINAL.logoCy, FINAL.logoW, t, EV.final);
  const fs = FS_HEAD, lh = fs * 1.04;
  FINAL.head.forEach((ln, i) => lineRise(ln, CX, FINAL.y0 + i * lh, fs, t, EV.head2 + i * 0.08, null, { align: 'center', col: i === 3 ? P.lime : P.white }));
  ctaPill(CX, 1262, t, EV.cta);
  txt('18+ | Joga com responsabilidade.', CX, 1476, 27, { w: 600, align: 'center', col: 'rgba(255,255,255,0.75)', a: eOutCubic(prog(t, EV.cta + 0.2, EV.cta + 0.6)) });
  c.restore();
}

/* ---------- scene switcher + transitions ---------- */
function drawScene(t) {
  reset(c);
  c.fillStyle = P.purple; c.fillRect(0, 0, W, H);
  if (t < EV.s2) sceneA(t);
  else if (t < EV.s3 + 0.2) {
    if (t < EV.s2 + 0.06) { sceneB(t); overlayA(t); }
    else {
      const w = prog(t, EV.cardsOut, EV.s3 + 0.08);
      if (w < 1) sceneB(t, eInCubic(w));
      if (w > 0) {   // slanted lime band wipe into the shirt shot
        const d = (H + 40) * SLANT, p = eInOutCubic(w), x = lerp(W + 300 + d, -600, p);
        c.save(); c.beginPath(); c.moveTo(x + 300, -20); c.lineTo(W + 1200, -20); c.lineTo(W + 1200, H + 20); c.lineTo(x + 300 - d, H + 20); c.closePath(); c.clip(); sceneC(t); c.restore();
        c.fillStyle = P.lime; c.beginPath(); c.moveTo(x, -20); c.lineTo(x + 300, -20); c.lineTo(x + 300 - d, H + 20); c.lineTo(x - d, H + 20); c.closePath(); c.fill();
      }
      if (w >= 1) sceneC(t);
    }
  } else if (t < EV.final) sceneC(t);
  else sceneD(t);
  limeFlash(t, EV.hit, 0.35, 0.3); limeFlash(t, EV.s3, 0.3, 0.25); limeFlash(t, EV.final, 0.55, 0.35); limeFlash(t, EV.stinger, 0.14, 0.4);
}
window.COMP_READY = async () => {
  HOOK_S = Math.min(fitSize(HOOK[0], 940, 130), fitSize(HOOK[1], 940, 130));
  HB = Math.min(fitSize('NO TELEGRAM.', 930, 128), 128);
  S41 = fitSize('41 MIL', 900, 250, 900, -0.03);
  FS_HEAD = Math.min(fitSize('PROGNÓSTICOS', 930, 124), fitSize('OS PRÓXIMOS', 930, 124));
  FINAL.y0 = 480 + FS_HEAD * 0.74;
};
boot();
