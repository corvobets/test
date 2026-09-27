// CORVO BETS REWARDS 19.2 s — original, modern, energetic 150 BPM track + synced sound design.
// Everything is synthesised here (no samples). Timing comes from timeline.js.
// Usage: node audio.mjs out.wav [--stems dir] [--music licensed.wav --music-start 0 --music-gain 0]
//   --music replaces the synthesised score with a licensed track (48 kHz 16-bit/float WAV, see build.sh);
//   the sound design, ducking and master stay the same.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const TL = require('./timeline.js');

const SR = 48000, DUR = TL.DUR, N = Math.round(SR * DUR), TAU = Math.PI * 2;
const { BEAT, EV } = TL, S16 = BEAT / 4, BAR = BEAT * 4;
const OUT = process.argv[2] || 'corvo-audio.wav';
const STEMS = process.argv.includes('--stems') ? process.argv[process.argv.indexOf('--stems') + 1] : null;

/* ============================== utilities ============================== */
let seed = 20260927;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rnd() * 2 - 1;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const dbToLin = d => Math.pow(10, d / 20);
const Bus = () => ({ L: new Float32Array(N), R: new Float32Array(N) });
const drums = Bus(), bass = Bus(), synth = Bus(), sfx = Bus(), rev = Bus(), dly = Bus();
function put(bus, i, l, r, revAmt = 0, dlyAmt = 0) {
  if (i < 0 || i >= N) return;
  bus.L[i] += l; bus.R[i] += r;
  if (revAmt) { rev.L[i] += l * revAmt; rev.R[i] += r * revAmt; }
  if (dlyAmt) { dly.L[i] += l * dlyAmt; dly.R[i] += r * dlyAmt; }
}
const panLR = (s, p) => [s * Math.cos((p + 1) * Math.PI / 4) * Math.SQRT2, s * Math.sin((p + 1) * Math.PI / 4) * Math.SQRT2];
const blep = (t, dt) => { if (t < dt) { t /= dt; return t + t - t * t - 1; } if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; } return 0; };

// Zavalishin TPT state-variable filter
class SVF {
  constructor() { this.s1 = 0; this.s2 = 0; this.set(1000); }
  set(fc, q = 0.707) {
    const g = Math.tan(Math.PI * clamp(fc, 10, SR * 0.45) / SR), k = 1 / q;
    this.k = k; this.a1 = 1 / (1 + g * (g + k)); this.a2 = g * this.a1; this.a3 = g * this.a2;
  }
  run(x) {
    const v3 = x - this.s2, v1 = this.a1 * this.s1 + this.a2 * v3, v2 = this.s2 + this.a2 * this.s1 + this.a3 * v3;
    this.s1 = 2 * v1 - this.s1; this.s2 = 2 * v2 - this.s2;
    this.lp = v2; this.bp = v1; this.hp = x - this.k * v1 - v2; return v2;
  }
}
// RBJ biquad (static)
function bq(type, f0, q = 0.707, gain = 0) {
  const A = Math.pow(10, gain / 40), w = TAU * f0 / SR, cs = Math.cos(w), sn = Math.sin(w), al = sn / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - cs) / 2; b1 = 1 - cs; b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + cs) / 2; b1 = -(1 + cs); b2 = b0; a0 = 1 + al; a1 = -2 * cs; a2 = 1 - al; }
  else if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * cs; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * cs; a2 = 1 - al / A; }
  else if (type === 'lowshelf') { const sq = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) - (A - 1) * cs + sq); b1 = 2 * A * ((A - 1) - (A + 1) * cs); b2 = A * ((A + 1) - (A - 1) * cs - sq); a0 = (A + 1) + (A - 1) * cs + sq; a1 = -2 * ((A - 1) + (A + 1) * cs); a2 = (A + 1) + (A - 1) * cs - sq; }
  else { const sq = 2 * Math.sqrt(A) * al; b0 = A * ((A + 1) + (A - 1) * cs + sq); b1 = -2 * A * ((A - 1) + (A + 1) * cs); b2 = A * ((A + 1) + (A - 1) * cs - sq); a0 = (A + 1) - (A - 1) * cs + sq; a1 = 2 * ((A - 1) - (A + 1) * cs); a2 = (A + 1) - (A - 1) * cs - sq; }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filt(arr, c) {
  const [b0, b1, b2, a1, a2] = c; let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < arr.length; i++) { const x = arr[i], y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; arr[i] = y; }
}
const eqBus = (bus, ...cs) => { for (const c of cs) { filt(bus.L, c); filt(bus.R, c); } };

/* ============================== drums ============================== */
const KICKS = [];   // for sidechain
function kick(t0, amp = 1, { pitch = 50, drive = 2.4, len = 0.45, click = 1 } = {}) {
  KICKS.push({ t: t0, a: amp });
  const n0 = Math.round(t0 * SR), n = Math.round(len * SR), hp = new SVF(), lpc = new SVF(); hp.set(2600, 0.8); lpc.set(9000, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = pitch + (240 - pitch) * Math.exp(-t * 40) + 60 * Math.exp(-t * 260);
    ph += f / SR;
    const body = Math.sin(TAU * ph) * (0.82 * Math.exp(-t * 6.2) + 0.18 * Math.exp(-t * 30)) * (t < 0.0012 ? t / 0.0012 : 1);
    hp.run(noise()); lpc.run(hp.hp);
    const s = Math.tanh((body * 1.1 + lpc.lp * Math.exp(-t * 380) * 0.7 * click) * drive) / Math.tanh(drive) * amp;
    const rel = i > n - 400 ? (n - i) / 400 : 1;
    put(drums, n0 + i, s * rel, s * rel, 0.02);
  }
}
function snare(t0, amp = 1, { tone = 190, len = 0.34, verb = 0.28, bright = 1 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round(len * SR);
  const bpL = new SVF(), bpR = new SVF(), hpL = new SVF(), hpR = new SVF();
  bpL.set(3600 * bright, 0.9); bpR.set(3900 * bright, 0.9); hpL.set(1300, 0.7); hpR.set(1400, 0.7);
  const oL = new SVF(), oR = new SVF(); oL.set(12500, 0.7); oR.set(12500, 0.7);
  let p1 = 0, p2 = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f1 = tone * (1 + 0.45 * Math.exp(-t * 55)), f2 = tone * 1.68;
    p1 += f1 / SR; p2 += f2 / SR;
    const body = (Math.sin(TAU * p1) * 0.7 + Math.sin(TAU * p2) * 0.3) * Math.exp(-t * 24);
    const nL = noise(), nR = noise();
    bpL.run(nL); bpR.run(nR); hpL.run(nL); hpR.run(nR);
    const ne = Math.exp(-t * 13) * (t < 0.001 ? t / 0.001 : 1);
    const l = Math.tanh((body * 0.9 + (bpL.bp * 1.3 + hpL.hp * 0.55) * ne) * 1.7) * amp;
    const r = Math.tanh((body * 0.9 + (bpR.bp * 1.3 + hpR.hp * 0.55) * ne) * 1.7) * amp;
    const rel = i > n - 300 ? (n - i) / 300 : 1;
    put(drums, n0 + i, oL.run(l) * rel, oR.run(r) * rel, verb);
  }
}
function clap(t0, amp = 1, verb = 0.35) {
  const n0 = Math.round(t0 * SR), n = Math.round(0.32 * SR), fL = new SVF(), fR = new SVF();
  fL.set(1250, 1.1); fR.set(1350, 1.1);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let env = 0;
    for (const o of [0, 0.009, 0.018, 0.026]) if (t >= o) env = Math.max(env, Math.exp(-(t - o) * (o === 0.026 ? 18 : 140)));
    fL.run(noise()); fR.run(noise());
    put(drums, n0 + i, fL.bp * env * 2.2 * amp, fR.bp * env * 2.2 * amp, verb);
  }
}
const HATF = [205.3, 304.4, 369.6, 522.7, 540, 800].map(f => f * 1.7);
function hat(t0, amp = 0.3, open = false, p = 0.25) {
  const n0 = Math.round(t0 * SR), n = Math.round((open ? 0.34 : 0.07) * SR), bp = new SVF(), hp = new SVF();
  bp.set(10500, 1.1); hp.set(7200, 0.7);
  const ph = HATF.map(() => rnd());
  for (let i = 0; i < n; i++) {
    const t = i / SR; let m = 0;
    for (let k = 0; k < 6; k++) { ph[k] += HATF[k] / SR; m += (ph[k] % 1) < 0.5 ? 1 : -1; }
    bp.run(m * 0.16 + noise() * 0.35); hp.run(bp.bp);
    const env = Math.exp(-t * (open ? 9 : 58)) * (t < 0.0006 ? t / 0.0006 : 1);
    const rel = i > n - 200 ? (n - i) / 200 : 1;
    const [l, r] = panLR(hp.hp * env * amp * rel, p);
    put(drums, n0 + i, l, r, 0.05);
  }
}
function tom(t0, midi, amp = 0.8, p = 0) {
  const n0 = Math.round(t0 * SR), n = Math.round(0.42 * SR), f0 = mtof(midi); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR; ph += f0 * (1 + 0.55 * Math.exp(-t * 22)) / SR;
    const s = Math.tanh((Math.sin(TAU * ph) * Math.exp(-t * 7.5) + noise() * Math.exp(-t * 90) * 0.25) * 1.8) * amp;
    const rel = i > n - 300 ? (n - i) / 300 : 1;
    const [l, r] = panLR(s * rel, p); put(drums, n0 + i, l, r, 0.18);
  }
}
function crash(t0, amp = 0.5, len = 2.4) {
  const n0 = Math.round(t0 * SR), n = Math.round(len * SR), hL = new SVF(), hR = new SVF();
  hL.set(4200, 0.6); hR.set(4600, 0.6);
  const ph = HATF.map(() => rnd());
  for (let i = 0; i < n; i++) {
    const t = i / SR; let m = 0;
    for (let k = 0; k < 6; k++) { ph[k] += HATF[k] * 1.13 / SR; m += (ph[k] % 1) < 0.5 ? 1 : -1; }
    hL.run(noise() + m * 0.05); hR.run(noise() + m * 0.05);
    const env = (0.65 * Math.exp(-t * 2.1) + 0.35 * Math.exp(-t * 9)) * (t < 0.002 ? t / 0.002 : 1) * Math.min(1, (n - i) / 2000);
    put(drums, n0 + i, hL.hp * env * amp, hR.hp * env * amp, 0.12);
  }
}
function reverseCrash(tEnd, dur = 1.2, amp = 0.35) {
  const n = Math.round(dur * SR), n0 = Math.round(tEnd * SR) - n, hL = new SVF(), hR = new SVF();
  hL.set(3500, 0.6); hR.set(3800, 0.6);
  for (let i = 0; i < n; i++) {
    const t = (n - i) / SR, env = Math.exp(-t * 2.6) * Math.min(1, i / 800) * Math.min(1, (n - i) / 200);
    hL.run(noise()); hR.run(noise());
    put(drums, n0 + i, hL.hp * env * amp, hR.hp * env * amp, 0.2);
  }
}
function impact(t0, amp = 1, { len = 2.0, crashAmt = 0.55 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round(len * SR), lp = new SVF(), lpn = new SVF(); lp.set(260, 0.8); lpn.set(5000, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = 34 + 70 * Math.exp(-t * 9);
    ph += f / SR;
    lp.run(noise()); lpn.run(noise());
    const s = Math.tanh((Math.sin(TAU * ph) * Math.exp(-t * 2.2) * 1.2 + lp.lp * 2.6 * Math.exp(-t * 5.5) + lpn.lp * 0.3 * Math.exp(-t * 40)) * 1.6) * amp;
    const rel = Math.min(1, (n - i) / 3000);
    put(drums, n0 + i, s * rel, s * rel, 0.25);
  }
  if (crashAmt) crash(t0, crashAmt * amp);
  kick(t0, 0.9 * amp, { drive: 3 });
}
function riser(t0, dur, amp = 0.35) {
  const n0 = Math.round(t0 * SR), n = Math.round(dur * SR), bL = new SVF(), bR = new SVF();
  const ph = [rnd(), rnd(), rnd()], lp = new SVF();
  for (let i = 0; i < n; i++) {
    const p = i / n, fc = 400 * Math.pow(22, p);
    if ((i & 15) === 0) { bL.set(fc, 1.4); bR.set(fc * 1.07, 1.4); lp.set(300 + 5500 * p * p, 0.9); }
    bL.run(noise()); bR.run(noise());
    const f = mtof(52) * Math.pow(4, p);
    let saw = 0; [0.995, 1, 1.006].forEach((d, k) => { ph[k] += f * d / SR; saw += ((ph[k] % 1) * 2 - 1); });
    lp.run(saw * 0.33);
    const trem = 0.75 + 0.25 * Math.sin(TAU * (4 + 20 * p * p) * p * dur);
    const env = Math.pow(p, 2.2) * amp * trem;
    put(synth, n0 + i, (bL.bp * 1.6 + lp.lp * 0.7) * env, (bR.bp * 1.6 + lp.lp * 0.7) * env, 0.35);
  }
}


/* ============================== sound design ============================== */
function whoosh(t0, dur, amp = 0.3, { lo = 300, hi = 5000, pan0 = -0.6, pan1 = 0.6, shape = 0.6, rev: rv = 0.15 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round(dur * SR), f = new SVF(), g = new SVF();
  for (let i = 0; i < n; i++) {
    const p = i / n, env = p < shape ? Math.pow(p / shape, 1.8) : Math.pow((1 - p) / (1 - shape), 1.3);
    if ((i & 15) === 0) { const fc = lo * Math.pow(hi / lo, p < shape ? p / shape : 1 - (p - shape) / (1 - shape) * 0.5); f.set(fc, 1.3); g.set(fc * 0.5, 0.7); }
    const x = noise(); f.run(x); g.run(x);
    const [l, r] = panLR((f.bp * 1.4 + g.lp * 0.35) * env * amp, pan0 + (pan1 - pan0) * p);
    put(sfx, n0 + i, l, r, rv);
  }
}
function click(t0, amp = 0.22, p = 0, pitch = 2400) {
  const n0 = Math.round(t0 * SR), hp = new SVF(); hp.set(3000, 0.7);
  for (let i = 0; i < SR * 0.05; i++) {
    const t = i / SR; hp.run(noise());
    const s = (hp.hp * Math.exp(-t * 900) * 0.9 + Math.sin(TAU * pitch * t) * Math.exp(-t * 160) * 0.6 + Math.sin(TAU * pitch * 0.28 * t) * Math.exp(-t * 90) * 0.5) * amp;
    const [l, r] = panLR(s, p); put(sfx, n0 + i, l, r, 0.08);
  }
}
function suck(tEnd, dur = 0.45, amp = 0.3) {
  const n = Math.round(dur * SR), n0 = Math.round(tEnd * SR) - n, f = new SVF();
  for (let i = 0; i < n; i++) {
    const p = i / n; if ((i & 15) === 0) f.set(300 * Math.pow(20, p), 1.2);
    f.run(noise());
    const s = f.bp * Math.pow(p, 3) * amp * 1.6 * Math.min(1, (n - i) / 200), [l, r] = panLR(s, Math.sin(p * 9) * 0.4);
    put(sfx, n0 + i, l, r, 0.2);
  }
}
function thud(t0, amp = 0.35) {
  const n0 = Math.round(t0 * SR); let ph = 0; const lp = new SVF(); lp.set(180, 0.7);
  for (let i = 0; i < SR * 0.5; i++) {
    const t = i / SR; ph += (48 + 50 * Math.exp(-t * 20)) / SR; lp.run(noise());
    const s = (Math.sin(TAU * ph) * Math.exp(-t * 8) + lp.lp * 2 * Math.exp(-t * 12)) * amp;
    put(sfx, n0 + i, s, s, 0.1);
  }
}
function tickRoll(t0, t1, count = 22, amp = 0.09) {
  for (let k = 0; k < count; k++) { const p = k / (count - 1), t = t0 + (t1 - t0) * (1 - Math.pow(1 - p, 1.8)); click(t, amp * (0.6 + 0.4 * p), (k % 2 ? 0.25 : -0.25), 2000 + 900 * p); }
}


/* ============================== dark tonal instruments ============================== */
const saw = (ph, dt) => 2 * ph - 1 - blep(ph, dt);
// 808: saturated sine with pitch punch and optional glide; harmonics carry it on phone speakers
function bass808(t0, dur, m, amp = 0.8, { from = null, glide = 0.07, drive = 2.6, rel = 0.05 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round((dur + rel) * SR), f1 = mtof(m), f0 = from == null ? f1 : mtof(from);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, gl = from == null ? 1 : Math.exp(-t / glide);
    const f = (f1 + (f0 - f1) * gl) * (1 + 0.9 * Math.exp(-t * 90));
    ph += f / SR;
    const env = (t < 0.002 ? t / 0.002 : 1) * (0.55 + 0.45 * Math.exp(-t * 2.2)) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / rel));
    const s = Math.tanh(Math.sin(TAU * ph) * drive) / Math.tanh(drive) * env * amp;
    put(bass, n0 + i, s, s);
  }
}
// growl: distorted, band-limited mid layer an octave above the 808 (the "phone speaker" bass)
function growl(t0, dur, m, amp = 0.25, { cut = 1100, from = null, glide = 0.07 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round((dur + 0.04) * SR), f1 = mtof(m + 12), f0 = from == null ? f1 : mtof(from + 12);
  const lp = new SVF(), hp = new SVF(); hp.set(160, 0.7);
  let a = rnd(), b2 = rnd();
  for (let i = 0; i < n; i++) {
    const t = i / SR, f = f1 + (f0 - f1) * (from == null ? 0 : Math.exp(-t / glide)), dt = f / SR;
    a = (a + dt) % 1; b2 = (b2 + dt * 1.007) % 1;
    if ((i & 15) === 0) lp.set(cut * (0.6 + 0.9 * Math.exp(-t * 7)) * (1 + 0.15 * Math.sin(TAU * 3 * t)), 1.3);
    const x = Math.tanh((saw(a, dt) + saw(b2, dt * 1.007)) * 2.2);
    lp.run(x); hp.run(lp.lp);
    const env = (t < 0.004 ? t / 0.004 : 1) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.04));
    const s = hp.hp * env * amp;
    put(bass, n0 + i, s * 0.95, s);
  }
}
// braam: huge distorted low brass/synth blast (trailer-style), filter opens then closes
function braam(t0, root, amp = 0.5, { len = 1.6, bright = 1 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round(len * SR);
  const notes = [root - 12, root, root + 7, root + 12], det = [-0.14, -0.05, 0.05, 0.14];
  const ph = notes.map(() => det.map(() => rnd()));
  const fL = [new SVF(), new SVF()], fR = [new SVF(), new SVF()], nz = new SVF(); nz.set(900, 0.8);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if ((i & 15) === 0) {
      const fc = (180 + 2400 * bright * (1 - Math.exp(-t * 40)) * Math.exp(-t * 2.4) + 220 * Math.exp(-t * 0.8));
      fL[0].set(fc, 0.9); fL[1].set(fc * 1.1, 0.7); fR[0].set(fc * 1.05, 0.9); fR[1].set(fc * 1.15, 0.7);
    }
    let l = 0, r = 0;
    notes.forEach((m, j) => det.forEach((d, k) => {
      const fk = mtof(m + d) * (1 + 0.012 * Math.exp(-t * 6)), dt = fk / SR;
      ph[j][k] = (ph[j][k] + dt) % 1;
      const s = saw(ph[j][k], dt) * (j === 0 ? 1.1 : j === 3 ? 0.55 : 0.8);
      if (k % 2) l += s; else r += s;
    }));
    nz.run(noise());
    const blat = nz.bp * Math.exp(-t * 18) * 1.5;
    const env = (t < 0.012 ? t / 0.012 : 1) * (0.35 + 0.65 * Math.exp(-t * 1.6)) * Math.min(1, (n - i) / (0.35 * SR)) * amp;
    const ol = fL[1].run(fL[0].run(Math.tanh((l * 0.16 + blat) * 2.4))) * env;
    const or = fR[1].run(fR[0].run(Math.tanh((r * 0.16 + blat) * 2.4))) * env;
    put(synth, n0 + i, ol, or, 0.35, 0.0);
  }
}
// dark low drone (fills the low-mids, never melodic)
function drone(t0, t1, notes, amp = 0.05, cut = 520) {
  const n0 = Math.round(t0 * SR), n = Math.round((t1 - t0) * SR), rl = 0.25 * SR;
  notes.forEach((m, j) => {
    const f = mtof(m), fl = new SVF(), fr = new SVF(); let a = rnd(), b2 = rnd();
    for (let i = 0; i < n; i++) {
      const t = i / SR, dt = f / SR;
      if ((i & 31) === 0) { const fc = cut * (1 + 0.25 * Math.sin(TAU * 0.4 * (t0 + t) + j)); fl.set(fc, 0.8); fr.set(fc * 1.06, 0.8); }
      a = (a + dt * 0.998) % 1; b2 = (b2 + dt * 1.002) % 1;
      const env = Math.min(1, t / 0.08) * Math.min(1, (n - i) / rl) * amp;
      put(synth, n0 + i, fl.run(saw(a, dt)) * env, fr.run(saw(b2, dt)) * env, 0.3);
    }
  });
}
/* ---------- precise sound design ---------- */
// metallic accent: tight inharmonic clank + low thump (typography hits)
function metal(t0, amp = 0.4, { f = 170, pan = 0, verb = 0.3 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round(0.7 * SR), bp = new SVF(); bp.set(2600, 1.4);
  const parts = [[1, 1, 9], [2.76, 0.7, 14], [5.40, 0.45, 20], [8.93, 0.3, 28], [13.3, 0.18, 36]];
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR; let m = 0;
    for (const [r, a, d] of parts) m += Math.sin(TAU * f * r * t + r) * a * Math.exp(-t * d);
    bp.run(noise()); ph += (60 + 40 * Math.exp(-t * 30)) / SR;
    const s = (Math.tanh(m * 1.6) * 0.55 + bp.bp * Math.exp(-t * 70) * 0.9 + Math.sin(TAU * ph) * Math.exp(-t * 14) * 0.8) * amp * Math.min(1, t / 0.0008);
    const [l, r] = panLR(s, pan); put(sfx, n0 + i, l, r, verb);
  }
}
// low impact: sub boom + dark body, no cymbal (for UI moments)
function lowHit(t0, amp = 0.4, { len = 0.9, f0 = 44 } = {}) {
  if (process.argv.includes('--music')) amp *= 0.55;           // under a full song: lighter body, the song's own kick leads
  const n0 = Math.round(t0 * SR), n = Math.round(len * SR), lp = new SVF(); lp.set(220, 0.8); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR; ph += (f0 + 55 * Math.exp(-t * 18)) / SR; lp.run(noise());
    const s = Math.tanh((Math.sin(TAU * ph) * Math.exp(-t * 4.5) + lp.lp * 2.2 * Math.exp(-t * 16)) * 1.8) * amp * Math.min(1, (n - i) / 2000);
    put(sfx, n0 + i, s, s, 0.12);
  }
}
// card lift: fast upward air + tight tick at the top
function liftSwipe(t0, amp = 0.2, pan = 0) {
  whoosh(t0 - 0.16, 0.3, amp, { lo: 500, hi: 6500, pan0: pan - 0.3, pan1: pan + 0.3, shape: 0.72, rev: 0.06 });
  click(t0 + 0.12, amp * 0.9, pan, 2100);
}

/* ============================== V3 instruments ============================== */
// low brass stab: detuned saw stack (power chord), fast filter "bite", driven — dark, not melodic
function brassStab(t0, root, amp = 0.5, { len = 0.34, bite = 1, verb = 0.22 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round((len + 0.08) * SR);
  const notes = [root, root + 7, root + 12], det = [-0.09, 0, 0.09];
  const ph = notes.map(() => det.map(() => rnd()));
  const fL = new SVF(), fR = new SVF(), nz = new SVF(); nz.set(1100, 0.9);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if ((i & 7) === 0) { const fc = 260 + 2600 * bite * Math.exp(-t * 14) * (1 - Math.exp(-t * 400)) + 380 * Math.exp(-t * 3); fL.set(fc, 1.1); fR.set(fc * 1.06, 1.1); }
    let l = 0, r = 0;
    notes.forEach((m, j) => det.forEach((d, k) => {
      const f = mtof(m + d) * (1 - 0.02 * Math.exp(-t * 30)), dt = f / SR;
      ph[j][k] = (ph[j][k] + dt) % 1; const s = saw(ph[j][k], dt) * (j === 0 ? 1 : 0.7);
      if (k === 0) l += s; else if (k === 2) r += s; else { l += s * 0.7; r += s * 0.7; }
    }));
    nz.run(noise());
    const env = (t < 0.006 ? t / 0.006 : 1) * (0.4 + 0.6 * Math.exp(-t * 7)) * (t < len ? 1 : Math.max(0, 1 - (t - len) / 0.08)) * amp;
    const ol = fL.run(Math.tanh((l * 0.2 + nz.bp * Math.exp(-t * 40)) * 2.6)), or = fR.run(Math.tanh((r * 0.2 + nz.bp * Math.exp(-t * 40)) * 2.6));
    put(synth, n0 + i, ol * env, or * env, verb, 0.04);
  }
}
// reese: two detuned saws, driven + low-passed, one note per 8th — the driving bass line
function reese(t0, dur, m, amp = 0.3, { cut = 700 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round((dur + 0.02) * SR), f = mtof(m);
  const lp = new SVF(), hp = new SVF(); hp.set(90, 0.7); let a = rnd(), b2 = rnd(), sub = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, dt = f / SR;
    a = (a + dt * 0.992) % 1; b2 = (b2 + dt * 1.008) % 1; sub += f / SR;
    if ((i & 15) === 0) lp.set(cut * (0.7 + 0.9 * Math.exp(-t * 18)), 1.2);
    const x = Math.tanh((saw(a, dt * 0.992) + saw(b2, dt * 1.008)) * 1.8);
    lp.run(x); hp.run(lp.lp);
    const env = (t < 0.003 ? t / 0.003 : 1) * (0.7 + 0.3 * Math.exp(-t * 10)) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.02)) * amp;
    const s = hp.hp * env, sb = Math.sin(TAU * sub * 0.5) * env * 0.9;       // sub an octave down
    put(bass, n0 + i, s * 0.95 + sb, s + sb);
  }
}
// taiko-style low drum: deep body + skin noise, big room
function taiko(t0, amp = 0.7, { f0 = 62, pan = 0, verb = 0.32 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round(0.7 * SR), bp = new SVF(); bp.set(900, 0.8); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR; ph += f0 * (1 + 0.6 * Math.exp(-t * 28)) / SR; bp.run(noise());
    const s = Math.tanh((Math.sin(TAU * ph) * Math.exp(-t * 6) + bp.bp * Math.exp(-t * 45) * 0.9) * 2) * amp * Math.min(1, (n - i) / 800);
    const [l, r] = panLR(s, pan); put(drums, n0 + i, l, r, verb);
  }
}


const LICENSED_MODE = process.argv.includes('--music');
// sub drop: a sine sweeping down under the heavy hits (weight without mud)
function subDrop(t0, amp = 0.5, { f0 = 95, f1 = 30, len = 0.9 } = {}) {
  if (LICENSED_MODE) amp *= 0.5;
  const n0 = Math.round(t0 * SR), n = Math.round(len * SR); let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, p = i / n; ph += (f1 + (f0 - f1) * Math.pow(1 - p, 2.2)) / SR;
    const s = Math.tanh(Math.sin(TAU * ph) * 1.6) * amp * Math.min(1, t / 0.004) * Math.pow(1 - p, 1.3);
    put(sfx, n0 + i, s, s, 0);
  }
}

/* ============================== REWARDS instruments ============================== */
// supersaw chord stab: 7 detuned saws per note, filter bite, stereo spread (modern, bright but minor)
function superStab(t0, notes, amp = 0.3, { len = 0.16, cut = 3200, verb = 0.18, dly = 0.08 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round((len + 0.12) * SR), det = [-0.22, -0.13, -0.05, 0, 0.05, 0.13, 0.22];
  const ph = notes.map(() => det.map(() => rnd())), fL = new SVF(), fR = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if ((i & 7) === 0) { const fc = 300 + cut * Math.exp(-t * 16) + 500 * Math.exp(-t * 4); fL.set(fc, 0.9); fR.set(fc * 1.04, 0.9); }
    let l = 0, r = 0;
    notes.forEach((m, j) => det.forEach((d, k) => { const f = mtof(m + d), dt = f / SR; ph[j][k] = (ph[j][k] + dt) % 1; const s = saw(ph[j][k], dt); if (k < 3) l += s; else if (k > 3) r += s; else { l += s * 0.7; r += s * 0.7; } }));
    const env = (t < 0.004 ? t / 0.004 : 1) * (t < len ? 1 - 0.35 * t / len : Math.max(0, 0.65 * (1 - (t - len) / 0.12))) * amp;
    put(synth, n0 + i, fL.run(l * 0.09) * env, fR.run(r * 0.09) * env, verb, dly);
  }
}
// soft sustained pad (breakdown)
function pad(t0, t1, notes, amp = 0.05, cut = 1400) {
  const n0 = Math.round(t0 * SR), n = Math.round((t1 - t0) * SR);
  notes.forEach(m => { const f = mtof(m), fl = new SVF(), fr = new SVF(); let a = rnd(), b2 = rnd();
    for (let i = 0; i < n; i++) { const t = i / SR, dt = f / SR; if ((i & 31) === 0) { fl.set(cut, 0.7); fr.set(cut * 1.05, 0.7); }
      a = (a + dt * 0.996) % 1; b2 = (b2 + dt * 1.004) % 1; const env = Math.min(1, t / 0.25) * Math.min(1, (n - i) / (0.2 * SR)) * amp;
      put(synth, n0 + i, fl.run(saw(a, dt)) * env, fr.run(saw(b2, dt)) * env, 0.4); } });
}
// glitch zap: bit-crushed, sample-held noise + falling square (transitions)
function zap(t0, amp = 0.22, { len = 0.11, f0 = 1800, pan = 0 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round(len * SR); let hold = 0, v = 0, ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR, p = i / n; if (hold-- <= 0) { v = Math.round(noise() * 4) / 4; hold = 20 + Math.floor(rnd() * 90); }
    ph += f0 * Math.pow(0.18, p) / SR; const sq = (ph % 1) < 0.5 ? 1 : -1;
    const s = (v * 0.6 + sq * 0.4) * amp * (1 - p) * Math.min(1, t / 0.002), [l, r] = panLR(s, pan + (rnd() - 0.5) * 0.6);
    put(sfx, n0 + i, l, r, 0.05);
  }
}

/* ============================== arrangement ============================== */
// 150 BPM, G minor. Pickup 0 – 0.8, bar lines every 1.6 s from 0.8. Progression i – VI – III – VII (Gm Eb Bb F).
const S = BEAT / 4, barAt = k => 0.8 + k * BAR;
const G = 31;                                                   // G1 (808)
const PROG = [[G, [55, 58, 62]], [G - 4, [55, 58, 63]], [G + 3, [53, 58, 62]], [G - 2, [53, 57, 60]]];   // [808 root, stab voicing]
const chordAt = t => PROG[((Math.floor((t - 0.8) / BAR) % 4) + 4) % 4];
const KP = [[0, 1], [6, 0.85], [10, 0.9], [14, 0.6]];              // kick (16ths)
function groove(k, { from = 0, to = 16, lp = 0, stabs = true, hats = true, amp = 1 } = {}) {
  const t0 = barAt(k);
  KP.forEach(([s, a]) => { if (s >= from && s < to) { kick(t0 + s * S, a * amp, { pitch: 48, drive: 3.2 }); const [r] = chordAt(t0 + s * S); const nx = KP.find(q => q[0] > s); bass808(t0 + s * S, ((nx ? nx[0] : 16) - s) * S - 0.02, r, 0.62 * a * amp); growl(t0 + s * S, ((nx ? nx[0] : 16) - s) * S - 0.04, r, 0.22 * a * amp, { cut: 1300 }); } });
  [4, 12].forEach(s => { if (s >= from && s < to) { snare(t0 + s * S, 0.8 * amp, { tone: 200, verb: 0.25, bright: 1.05 }); clap(t0 + s * S, 0.6 * amp, 0.35); } });
  if (hats) for (let s = from; s < to; s++) { if (s % 2 && !(s >= 13 && k % 2)) continue; hat(t0 + s * S, (s % 4 === 2 ? 0.16 : 0.1) * amp, s === 6 || s === 14, s % 4 ? 0.3 : -0.2); }
  if (hats && k % 2) for (let j = 0; j < 6; j++) hat(t0 + (13 + j * 0.5) * S, 0.07 + 0.02 * j, false, 0.4 - j * 0.12);   // hat roll into the next bar
  if (stabs) [2, 5, 8, 11, 14].forEach(s => { if (s >= from && s < to) superStab(t0 + s * S, chordAt(t0 + s * S)[1], 0.36 * amp * (s === 2 || s === 8 ? 1 : 0.8), { cut: lp ? 900 : 3200 }); });
}
const dropHit = (t, amp = 1) => { impact(t, 1.1 * amp, { len: 1.8, crashAmt: 0.5 }); superStab(t, chordAt(t + 0.01)[1].concat([chordAt(t + 0.01)[1][0] + 12]), 0.4 * amp, { len: 0.5 }); subDrop(t, 0.45 * amp); };
// ---- 0 – 2.4 · hook: hits on the words, filtered groove, build, gap
dropHit(EV.hit, 0.9); bass808(EV.hit, 0.7, G, 0.9); metal(EV.hit, 0.35, { f: 160 });
[EV.h2, EV.h3, EV.h4].forEach((t, i) => { kick(t, 0.95, { pitch: 48, drive: 3 }); metal(t, 0.35 + 0.05 * i, { f: [190, 150, 130][i], pan: [-0.2, 0.2, 0][i] }); });
superStab(EV.h3, [55, 58, 62, 67], 0.3, { len: 0.3 }); superStab(EV.h4, [55, 58, 62, 67], 0.34, { len: 0.3 });
groove(0, { from: 1, to: 10, stabs: false, lp: 1, amp: 0.8 });
bass808(EV.h2, 0.36, G, 0.8); bass808(EV.h3, 0.36, G, 0.85); bass808(EV.h4, 0.36, G, 0.9);
{ const t0 = EV.build; for (let s = 0; s < 4; s++) snare(t0 + s * S, 0.35 + 0.1 * s, { len: 0.1, verb: 0.2 }); for (let s = 0; s < 6; s++) snare(t0 + 0.2 + s * S / 2, 0.55 + 0.05 * s, { len: 0.07, verb: 0.2 });
  riser(EV.h3, EV.drop - EV.h3 - 0.04, 0.18); reverseCrash(EV.drop, 0.7, 0.28); zap(EV.build, 0.16, { len: 0.2, f0: 900 }); }
// ---- 2.4 – 8.8 · drop through the first features
dropHit(EV.drop, 1.1);
for (let k = 1; k <= 4; k++) groove(k, { from: k === 1 ? 1 : 0 });
drone(EV.drop, 8.8, [G + 24, G + 31], 0.022, 700);
// ---- 8.8 – 11.2 · the wheel: half-time breakdown under the spin, snare-roll build, hard gap, JACKPOT drop
{
  const t5 = barAt(5), t6 = barAt(6);
  pad(EV.wheel, EV.jackpot - 0.04, [55, 58, 62, 67], 0.035, 1100);
  [0, 8].forEach(s => kick(t5 + s * S, s ? 0.8 : 1, { pitch: 48, drive: 3 })); bass808(t5, 0.75, G, 0.85); bass808(t5 + 8 * S, 0.75, G - 4, 0.8);
  snare(t5 + 8 * S, 0.8, { tone: 190, verb: 0.45, len: 0.4 }); clap(t5 + 8 * S, 0.55, 0.5);
  superStab(t5, PROG[0][1], 0.26, { len: 0.3 }); superStab(t5 + 8 * S, PROG[1][1], 0.24, { len: 0.3 });
  for (let s = 0; s < 16; s += 2) hat(t5 + s * S, 0.09, false, s % 4 ? 0.3 : -0.3);
  for (let s = 0; s < 4; s++) snare(t6 + s * S, 0.2 + 0.05 * s, { len: 0.1, verb: 0.2 });
  for (let s = 0; s < 7; s++) snare(t6 + 0.4 + s * S / 2, 0.33 + 0.04 * s, { len: 0.06, verb: 0.2 });
  kick(t6, 0.9, { pitch: 48, drive: 3 }); bass808(t6, 0.75, G + 3, 0.8, { from: G - 2, glide: 0.5 });
  riser(EV.spin, EV.jackpot - EV.spin - 0.05, 0.13); reverseCrash(EV.jackpot, 0.9, 0.22);
}
dropHit(EV.jackpot, 1.3); braam(EV.jackpot, G + 12, 0.4, { len: 1.2, bright: 1.2 });
groove(6, { from: 8 });
// ---- 12.0 – 13.6 · giveaways
dropHit(EV.give, 0.75); groove(7, { from: 1 });
// ---- 13.6 – 15.2 · recap: one hit per word, then a short lift into the close
[0, 1, 2, 3].forEach(i => { const t = EV.recap + i * BEAT; kick(t, 1, { pitch: 48, drive: 3.2 }); snare(t, 0.55, { tone: 200, verb: 0.3 }); superStab(t, chordAt(t)[1], 0.3, { len: 0.2 }); bass808(t, 0.36, chordAt(t)[0], 0.85); metal(t, 0.3, { f: 170 + 20 * i, pan: -0.3 + 0.2 * i }); });
riser(EV.recap + 4 * BEAT, 0.75, 0.16); reverseCrash(EV.close, 0.6, 0.26);
for (let s = 0; s < 6; s++) snare(EV.close - 0.4 + s * S * 0.65, 0.4 + 0.07 * s, { len: 0.07, verb: 0.2 });
// ---- 15.2 – 19.2 · close
dropHit(EV.close, 1.15);
groove(9, { from: 1 }); groove(10);
dropHit(EV.final, 1.1); braam(EV.final, G + 12, 0.35, { len: EV.end - EV.final, bright: 1 }); bass808(EV.final, 0.7, G, 1, { rel: 0.2 });
// ---- sound design on the picture
[EV.h2, EV.h4, EV.pts, EV.cash, EV.lead, EV.wheel, EV.give, EV.recap].forEach((t, i) => zap(t - 0.01, 0.13, { pan: i % 2 ? 0.4 : -0.4, f0: 1400 + 200 * (i % 3) }));
whoosh(EV.drop - 0.25, 0.4, 0.26, { lo: 300, hi: 8000, pan0: 0, pan1: 0, shape: 0.7 });
[EV.t1, EV.t2].forEach((t, i) => { whoosh(t - 0.05, 0.3, 0.14, { lo: 500, hi: 6000, pan0: i ? 0.6 : -0.6, pan1: 0, shape: 0.5 }); click(t + 0.2, 0.14, i ? 0.3 : -0.3, 2200); });
whoosh(EV.cash + 0.05, 0.4, 0.16, { lo: 300, hi: 5000, pan0: -0.6, pan1: 0.2, shape: 0.6 });
click(EV.press, 0.3, 0.2, 1700); lowHit(EV.press + 0.01, 0.35, { len: 0.5, f0: 52 });
for (let i = 0; i < 5; i++) click(EV.lead + 0.12 + i * 0.05, 0.1, 0.5 - 0.1 * i, 2400 + 150 * i);
tickRoll(EV.lead + 0.4, EV.lead + 1.1, 14, 0.06);
whoosh(EV.wheel, 0.4, 0.16, { lo: 250, hi: 4000, pan0: 0.5, pan1: -0.2, shape: 0.7 });
click(EV.spin, 0.3, 0, 1500); lowHit(EV.spin + 0.01, 0.3, { len: 0.5, f0: 50 });
// wheel ticks: one per segment boundary under the pointer, from the same rotation curve as the picture
{
  const FINAL = 360 * 5 + (360 - (15 + 30 * 9)), rot = t => { const u = clamp((t - EV.spin) / (EV.jackpot - EV.spin), 0, 1); return FINAL * (1 - Math.pow(1 - u, 4.2)); };
  let last = 0, lastT = -1;
  for (let t = EV.spin; t < EV.jackpot; t += 1 / SR * 24) { const k = Math.floor(rot(t) / 30); if (k > last) { if (t - lastT > 0.028) { const v = (rot(t + 0.01) - rot(t)) / 0.01; click(t, 0.09 + 0.1 * clamp(1 - v / 1500, 0, 1), 0, 2600 + 400 * clamp(v / 3000, 0, 1)); lastT = t; } last = k; } }
}
metal(EV.jackpot, 0.5, { f: 140 }); thud(EV.jackpot, 0.4);
whoosh(EV.whip - 0.02, EV.give - EV.whip + 0.08, 0.3, { lo: 200, hi: 9000, pan0: -0.3, pan1: 0.3, shape: 0.85 });
[EV.give + 0.2, EV.give + 0.4, EV.give + 0.8].forEach((t, i) => { lowHit(t + 0.28, 0.28, { len: 0.4, f0: 55 + 6 * i }); click(t + 0.28, 0.1, [-0.2, -0.5, 0.5][i], 1800); });
click(EV.cta, 0.28, 0, 1700); lowHit(EV.cta + 0.01, 0.35, { len: 0.6, f0: 48 });
whoosh(EV.cta - 0.1, 0.35, 0.14, { lo: 400, hi: 7000, pan0: -0.5, pan1: 0.5, shape: 0.6 });

/* ============================== mixing ============================== */
const argv = process.argv, arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;
const LICENSED = arg('--music', null), MUSIC_START = +arg('--music-start', 0), MUSIC_GAIN = +arg('--music-gain', 0);
function readWav(file) {            // PCM 16-bit or float32, stereo or mono, must be 48 kHz
  const b = fs.readFileSync(file); let p = 12, fmt = null, data = null;
  while (p < b.length - 8) { const id = b.toString('ascii', p, p + 4), sz = b.readUInt32LE(p + 4); if (id === 'fmt ') fmt = { tag: b.readUInt16LE(p + 8), ch: b.readUInt16LE(p + 10), sr: b.readUInt32LE(p + 12), bits: b.readUInt16LE(p + 22) }; if (id === 'data') data = [p + 8, sz]; p += 8 + sz + (sz & 1); }
  if (!fmt || !data || fmt.sr !== SR) throw new Error('need a 48 kHz WAV: ' + file);
  const bps = fmt.bits / 8, n = Math.floor(data[1] / (bps * fmt.ch)), L = new Float32Array(n), R = new Float32Array(n);
  const rd = o => fmt.bits === 16 ? b.readInt16LE(o) / 32768 : b.readFloatLE(o);
  for (let i = 0; i < n; i++) { const o = data[0] + i * bps * fmt.ch; L[i] = rd(o); R[i] = fmt.ch > 1 ? rd(o + bps) : L[i]; }
  return { L, R };
}
// sidechain gain from kick triggers
function sidechainGain(depth, rel = 0.11) {
  const g = new Float32Array(N).fill(1);
  for (const k of KICKS) {
    const n0 = Math.round(k.t * SR), att = Math.round(0.004 * SR), len = Math.round(rel * 4 * SR);
    for (let i = -att; i < len; i++) {
      const j = n0 + i; if (j < 0 || j >= N) continue;
      const e = i < 0 ? (i + att) / att : Math.exp(-i / (rel * SR));
      g[j] = Math.min(g[j], 1 - depth * clamp(k.a, 0, 1.1) * e);
    }
  }
  return g;
}
function applyGain(bus, g) { for (let i = 0; i < N; i++) { bus.L[i] *= g[i]; bus.R[i] *= g[i]; } }
function compressor(bus, { thr = -18, ratio = 3, att = 0.006, rel = 0.12, makeup = 0, sc = null, mix = 1 } = {}) {
  const aA = Math.exp(-1 / (att * SR)), aR = Math.exp(-1 / (rel * SR)); let env = 0;
  for (let i = 0; i < N; i++) {
    const x = sc ? Math.abs(sc[i]) : Math.max(Math.abs(bus.L[i]), Math.abs(bus.R[i]));
    env = x > env ? aA * env + (1 - aA) * x : aR * env + (1 - aR) * x;
    const lev = 20 * Math.log10(env + 1e-9), over = lev - thr;
    const gr = over > 0 ? over * (1 - 1 / ratio) : 0;
    const g = dbToLin(makeup - gr);
    bus.L[i] = bus.L[i] * (1 - mix) + bus.L[i] * g * mix; bus.R[i] = bus.R[i] * (1 - mix) + bus.R[i] * g * mix;
  }
}
function freeverb(inL, inR, { room = 0.84, damp = 0.3, wet = 1, pre = 0.022 } = {}) {
  const mk = (sizes, sp) => sizes.map(d => ({ b: new Float32Array(Math.round((d + sp) * SR / 44100)), i: 0, f: 0 }));
  const cL = mk([1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], 0), cR = mk([1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], 23);
  const aL = mk([556, 441, 341, 225], 0), aR = mk([556, 441, 341, 225], 23);
  const pd = Math.round(pre * SR), oL = new Float32Array(N), oR = new Float32Array(N);
  const proc = (x, combs, aps) => {
    let y = 0;
    for (const c of combs) { const o = c.b[c.i]; c.f = o * (1 - damp) + c.f * damp; c.b[c.i] = x + c.f * room; c.i = (c.i + 1) % c.b.length; y += o; }
    for (const a of aps) { const o = a.b[a.i]; const v = -y + o; a.b[a.i] = y + o * 0.5; a.i = (a.i + 1) % a.b.length; y = v; }
    return y;
  };
  for (let i = 0; i < N; i++) {
    const x = ((i >= pd ? inL[i - pd] : 0) + (i >= pd ? inR[i - pd] : 0)) * 0.015;
    oL[i] = proc(x, cL, aL) * wet; oR[i] = proc(x, cR, aR) * wet;
  }
  return { L: oL, R: oR };
}
function pingpong(inL, inR, time = BEAT * 0.75, fb = 0.34) {
  const d = Math.round(time * SR), oL = new Float32Array(N), oR = new Float32Array(N); let lpL = 0, lpR = 0;
  for (let i = 0; i < N; i++) {
    const xL = i >= d ? inL[i - d] + oR[i - d] * fb : 0, xR = i >= d ? inR[i - d] + oL[i - d] * fb : 0;
    lpL += 0.35 * (xL - lpL); lpR += 0.35 * (xR - lpR);
    oL[i] = lpL; oR[i] = lpR;
  }
  return { L: oL, R: oR };
}

const music = Bus();
if (!LICENSED) {
  const scBass = sidechainGain(0.5, 0.09), scSynth = sidechainGain(0.4, 0.1);
  applyGain(bass, scBass); applyGain(synth, scSynth);
  eqBus(bass, bq('hp', 30, 0.7), bq('peak', 110, 0.9, 1.5), bq('peak', 700, 0.8, 2.5), bq('lp', 4200, 0.7));
  eqBus(synth, bq('hp', 80, 0.7), bq('peak', 350, 1.0, -1.5), bq('peak', 1400, 0.8, 1.5), bq('highshelf', 8000, 0.7, -3));
  eqBus(drums, bq('hp', 30, 0.7), bq('lowshelf', 70, 0.7, -2.0), bq('peak', 200, 1.0, 1.5), bq('peak', 3200, 0.8, 1.2), bq('highshelf', 8500, 0.7, -3.5));
  const dCopy = { L: Float32Array.from(drums.L), R: Float32Array.from(drums.R) };
  compressor(dCopy, { thr: -26, ratio: 6, att: 0.003, rel: 0.08, makeup: 9 });
  for (let i = 0; i < N; i++) { drums.L[i] += dCopy.L[i] * 0.45; drums.R[i] += dCopy.R[i] * 0.45; }
  const verb = freeverb(rev.L, rev.R, { room: 0.8, damp: 0.45 });
  const echo = pingpong(dly.L, dly.R, BEAT * 0.75, 0.25);
  applyGain(verb, scSynth);
  for (let i = 0; i < N; i++) {
    music.L[i] = drums.L[i] * 0.8 + bass.L[i] * 0.85 + synth.L[i] * 2.2 + verb.L[i] * 0.45 + echo.L[i] * 0.35;
    music.R[i] = drums.R[i] * 0.8 + bass.R[i] * 0.85 + synth.R[i] * 2.2 + verb.R[i] * 0.45 + echo.R[i] * 0.35;
  }
} else {
  const trk = readWav(LICENSED), off = Math.round(MUSIC_START * SR), g = dbToLin(MUSIC_GAIN);
  for (let i = 0; i < N; i++) { const j = i + off; if (j >= 0 && j < trk.L.length) { music.L[i] = trk.L[j] * g; music.R[i] = trk.R[j] * g; } }
  // the sound design's own reverb send still goes through the room
  const verb = freeverb(rev.L, rev.R, { room: 0.8, damp: 0.45 });
  for (let i = 0; i < N; i++) { sfx.L[i] += verb.L[i] * 0.15; sfx.R[i] += verb.R[i] * 0.15; }
}
// hard gaps: just before the main reveal hit and before the final hit (music only; sound design continues)
function gap(t0, t1) {
  const a = Math.round(t0 * SR), bnd = Math.round((t1 - 0.004) * SR), r = Math.round(0.015 * SR);
  for (let i = a - r; i < bnd; i++) { const g = i < a ? 1 - (i - (a - r)) / r : 0; music.L[i] *= g; music.R[i] *= g; }
}
// section dynamics: the scroll sits a touch lower so the reveal and the final land harder
function sections(K) {
  for (let i = 0; i < N; i++) {
    const t = i / SR; let g = K[K.length - 1][1];
    for (let k = 1; k < K.length; k++) if (t <= K[k][0]) { const [t0, g0] = K[k - 1], [t1, g1] = K[k]; g = g0 + (g1 - g0) * (t - t0) / Math.max(1e-6, t1 - t0); break; }
    music.L[i] *= g; music.R[i] *= g;
  }
}
if (!LICENSED) {
  gap(EV.drop - 0.05, EV.drop); gap(EV.jackpot - 0.05, EV.jackpot); gap(EV.close - 0.04, EV.close);
  sections([[0, 0.95], [EV.drop - 0.05, 0.95], [EV.drop, 1.05], [EV.wheel, 0.95], [EV.jackpot - 0.3, 0.85], [EV.jackpot - 0.01, 0.9], [EV.jackpot, 1.12], [EV.give, 1.05], [EV.close - 0.01, 1.05], [EV.close, 1.14], [DUR, 1.14]]);
} else {
  sections([[0, 1], [DUR, 1]]);
}
compressor(music, { thr: -12, ratio: 2, att: 0.012, rel: 0.16, makeup: 0.5 });
const sfxEnv = new Float32Array(N); { let e = 0; const a = Math.exp(-1 / (0.005 * SR)), rr = Math.exp(-1 / (0.2 * SR));
  for (let i = 0; i < N; i++) { const x = Math.max(Math.abs(sfx.L[i]), Math.abs(sfx.R[i])); e = x > e ? a * e + (1 - a) * x : rr * e + (1 - rr) * x; sfxEnv[i] = e; } }
for (let i = 0; i < N; i++) { const g = 1 - 0.2 * clamp(sfxEnv[i] / 0.35, 0, 1); music.L[i] *= g; music.R[i] *= g; }
eqBus(sfx, bq('hp', 40, 0.7));

/* ============================== master ============================== */
function kWeightedLoudness(L, R) {
  const k1 = [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585];
  const k2 = [1.0, -2.0, 1.0, -1.99004745483398, 0.99007225036621];
  const l = Float32Array.from(L), r = Float32Array.from(R); filt(l, k1); filt(l, k2); filt(r, k1); filt(r, k2);
  const blk = Math.round(0.4 * SR), hop = Math.round(0.1 * SR), z = [];
  for (let s = 0; s + blk <= N; s += hop) { let a = 0; for (let i = s; i < s + blk; i++) a += l[i] * l[i] + r[i] * r[i]; z.push(a / blk); }
  const Lk = z.map(v => -0.691 + 10 * Math.log10(v + 1e-12));
  const g1 = z.filter((v, i) => Lk[i] > -70); const I1 = -0.691 + 10 * Math.log10(g1.reduce((a, b) => a + b, 0) / g1.length);
  const g2 = z.filter((v, i) => Lk[i] > I1 - 10); return -0.691 + 10 * Math.log10(g2.reduce((a, b) => a + b, 0) / g2.length);
}
function limiter(L, R, ceilDb = -1.3, la = 0.005, rel = 0.07) {
  const c = dbToLin(ceilDb), n = Math.round(la * SR), gt = new Float32Array(N);
  // true-peak detection: sample peaks + 4x windowed-sinc interpolated peaks
  const taps = 16, rows = [1, 2, 3].map(p => { const r = []; for (let k = -taps / 2; k < taps / 2; k++) { const x = k - p / 4; r.push(Math.sin(Math.PI * x) / (Math.PI * x) * (0.5 + 0.5 * Math.cos(Math.PI * x / (taps / 2)))); } return r; });
  for (let i = 0; i < N; i++) {
    let p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    if (i >= taps && i < N - taps) for (const ch of [L, R]) for (const row of rows) { let v = 0; for (let k = 0; k < taps; k++) v += ch[i + k - taps / 2] * row[k]; if (Math.abs(v) > p) p = Math.abs(v); }
    gt[i] = p > c ? c / p : 1;
  }
  // forward min over window (deque)
  const g1 = new Float32Array(N), dq = []; let head = 0;
  for (let i = N - 1; i >= 0; i--) {
    while (dq.length > head && gt[dq[dq.length - 1]] >= gt[i]) dq.pop();
    dq.push(i); while (dq[head] > i + n) head++;
    g1[i] = gt[dq[head]];
  }
  // smooth attack: moving average over previous n samples (never exceeds requirement)
  const g2 = new Float32Array(N); let acc = 0;
  for (let i = 0; i < N; i++) { acc += g1[i]; if (i >= n) acc -= g1[i - n]; g2[i] = acc / Math.min(i + 1, n); }
  const aR = Math.exp(-1 / (rel * SR)); let g = 1;
  for (let i = 0; i < N; i++) { g = g2[i] < g ? g2[i] : aR * g + (1 - aR) * g2[i]; g = Math.min(g, g2[i]); L[i] *= g; R[i] *= g; }
}
function truePeak(L, R) {    // 4x oversampled peak estimate (windowed sinc)
  const taps = 32, os = 4, h = [];
  for (let p = 0; p < os; p++) { const row = []; for (let k = -taps / 2; k < taps / 2; k++) { const x = k - p / os; const w = 0.5 + 0.5 * Math.cos(Math.PI * x / (taps / 2)); row.push(x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x) * w); } h.push(row); }
  let m = 0;
  for (const ch of [L, R]) for (let i = taps; i < N - taps; i++) for (let p = 1; p < os; p++) { let s = 0; const row = h[p]; for (let k = 0; k < taps; k++) s += ch[i + k - taps / 2] * row[k]; if (Math.abs(s) > m) m = Math.abs(s); }
  for (const ch of [L, R]) for (let i = 0; i < N; i++) if (Math.abs(ch[i]) > m) m = Math.abs(ch[i]);
  return 20 * Math.log10(m);
}
const TARGET = -11.3, SFX_GAIN = LICENSED ? 0.82 : 1.0;
function master(gainDb) {
  const L = new Float32Array(N), R = new Float32Array(N), g = dbToLin(gainDb);
  for (let i = 0; i < N; i++) { L[i] = (music.L[i] + sfx.L[i] * SFX_GAIN) * g; R[i] = (music.R[i] + sfx.R[i] * SFX_GAIN) * g; }
  for (const c of [bq('hp', 28, 0.7), bq('lowshelf', 100, 0.7, -5.5), bq('peak', 1000, 0.8, 2.2), bq('peak', 2800, 0.9, 3.0), bq('highshelf', 9500, 0.7, 1.0), bq('lp', 18000, 0.54), bq('lp', 18000, 1.31)]) { filt(L, c); filt(R, c); }
  // gentle soft clip before the limiter (adds density, catches transients)
  for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 0.9) / 0.9; R[i] = Math.tanh(R[i] * 0.9) / 0.9; }
  const lp1 = bq('lp', 18500, 0.54), lp2 = bq('lp', 18500, 1.31); filt(L, lp1); filt(L, lp2); filt(R, lp1); filt(R, lp2);
  limiter(L, R, -2.3);
  // fades
  const fi = Math.round(0.004 * SR), fo = Math.round((LICENSED ? 0.6 : 0.35) * SR);
  for (let i = 0; i < fi; i++) { L[i] *= i / fi; R[i] *= i / fi; }
  for (let i = 0; i < fo; i++) { const k = N - 1 - i, g2 = i / fo; L[k] *= g2; R[k] *= g2; }
  return { L, R };
}
let gainDb = -6, out;
for (let it = 0; it < 4; it++) {
  out = master(gainDb);
  const I = kWeightedLoudness(out.L, out.R);
  console.log(`pass ${it}: gain ${gainDb.toFixed(2)} dB → ${I.toFixed(2)} LUFS`);
  if (Math.abs(I - TARGET) < 0.15) break;
  gainDb += (TARGET - I) * 0.95;
}
console.log('true peak ≈', truePeak(out.L, out.R).toFixed(2), 'dBTP');

/* ============================== write ============================== */
function writeWav(file, L, R) {
  const buf = Buffer.alloc(44 + N * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
  let dither = 0;
  for (let i = 0; i < N; i++) {
    const d1 = (rnd() - rnd()) / 32768, d2 = (rnd() - rnd()) / 32768;
    buf.writeInt16LE(Math.round(clamp(L[i] + d1, -1, 1) * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(clamp(R[i] + d2, -1, 1) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, buf);
}
writeWav(OUT, out.L, out.R);
if (STEMS) {
  fs.mkdirSync(STEMS, { recursive: true });
  const g = dbToLin(gainDb);
  const norm = b => ({ L: b.L.map(x => x * g * 0.7), R: b.R.map(x => x * g * 0.7) });
  for (const [n, b] of Object.entries({ drums, bass, synth, sfx, music })) { const s = norm(b); writeWav(path.join(STEMS, n + '.wav'), s.L, s.R); }
}
console.log('written', OUT);

