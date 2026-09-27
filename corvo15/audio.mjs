// CORVO BETS 15s — original dark, driving 120 BPM soundtrack + synced sound design.
// Everything is synthesised here (no samples, no licensing). Timing comes from timeline.js.
// Usage: node audio.mjs corvo-audio.wav [--stems dir]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const TL = require('./timeline.js');

const SR = 48000, DUR = TL.DUR, N = SR * DUR, TAU = Math.PI * 2;
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
// ostinato: tight low 16th pulse (the track's rhythmic signature)
function pulseNote(t0, m, amp = 0.3, { len = 0.1, cut = 900, pan = 0 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round((len + 0.03) * SR), f = mtof(m);
  const fl = new SVF(), fr = new SVF(); let a = rnd(), b2 = rnd(), q = rnd();
  for (let i = 0; i < n; i++) {
    const t = i / SR, dt = f / SR;
    if ((i & 7) === 0) { const fc = cut * (0.5 + 1.2 * Math.exp(-t * 38)); fl.set(fc, 1.6); fr.set(fc * 1.04, 1.6); }
    a = (a + dt * 0.997) % 1; b2 = (b2 + dt * 1.003) % 1; q = (q + dt * 0.5) % 1;
    const sq = ((q < 0.5 ? 1 : -1) + blep(q, dt * 0.5) - blep((q + 0.5) % 1, dt * 0.5)) * 0.5;
    const env = (t < 0.0015 ? t / 0.0015 : 1) * Math.exp(-t * 16) * (t < len ? 1 : Math.max(0, 1 - (t - len) / 0.03)) * amp;
    const l = fl.run(saw(a, dt * 0.997) + sq * 0.6), r = fr.run(saw(b2, dt * 1.003) + sq * 0.6);
    const [pl, pr] = panLR(1, pan);
    put(synth, n0 + i, l * env * pl, r * env * pr, 0.08, 0.05);
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

/* ============================== arrangement ============================== */
// Bar lines sit on odd seconds (1, 3, 5 … 13); 0–1 is a two-beat pickup that opens on the impact.
const S = S16, barAt = k => 1 + k * BAR, st = (k, s) => barAt(k) + s * S;
const F = 29;          // F1 root (808); roots per half-second step for the pulse + bass
const ROOT = t => t < 5 ? F : t < 6 ? F - 4 : t < 7 ? F - 2 : t < 8 ? F : t < 9 ? F - 4 : t < 13 ? F : t < 14 ? F - 4 : F;
const PULSE = [[0, 1], [1, 0.55], [2, 0.6], [3, 0.95, 12], [4, 0.55], [5, 0.6], [6, 0.95, 3], [7, 0.55],
               [8, 1], [9, 0.55], [10, 0.6], [11, 0.95, 1], [12, 0.55], [13, 0.9, 7], [14, 0.6], [15, 0.7, -2]];
function pulseBar(t0, from, to, amp, cut) {         // 16th ostinato over [from, to) steps
  for (const [s, acc, iv = 0] of PULSE) {
    if (s < from || s >= to) continue;
    const t = t0 + s * S; pulseNote(t, ROOT(t) + 12 + iv, amp * acc, { cut: cut * (acc > 0.9 ? 1.5 : 1), pan: s % 2 ? 0.25 : -0.25 });
  }
}
const KPAT = [[0, 1], [3, 0.72], [7, 0.62], [8, 0.95], [10, 0.8]];
function groove(k, { hats16 = false, from = 0, to = 16, kAmp = 1 } = {}) {
  const t0 = barAt(k);
  KPAT.forEach(([s, a]) => { if (s >= from && s < to) kick(t0 + s * S, a * kAmp, { pitch: 46, drive: 3 }); });
  [4, 12].forEach(s => { if (s >= from && s < to) { snare(t0 + s * S, 0.72, { tone: 175, verb: 0.3, bright: 0.85 }); clap(t0 + s * S, 0.5, 0.4); } });
  for (let s = from; s < to; s++) {
    if (!hats16 && s % 2) continue;
    hat(t0 + s * S, s % 4 === 0 ? 0.16 : s % 2 ? 0.08 : 0.12, s === 14, s % 2 ? 0.3 : -0.15);
  }
}
function bassBar(k, from = 0, to = 16, amp = 0.8) {   // 808 follows the kick, sustains to the next hit
  const t0 = barAt(k), hits = KPAT.map(p => p[0]).filter(s => s >= from && s < to);
  hits.forEach((s, j) => {
    const t = t0 + s * S, next = j + 1 < hits.length ? hits[j + 1] : to, d = (next - s) * S - 0.02;
    bass808(t, d, ROOT(t), amp * (s === 0 || s === 8 ? 0.85 : 0.68)); growl(t, d, ROOT(t), 0.34, { cut: 1150 });
  });
}

// ---- 0 – 1 · pickup: immediate impact
impact(EV.hit, 1.0, { len: 2.2, crashAmt: 0.45 });
braam(EV.hit, F + 12, 0.55, { len: 1.1 });
bass808(EV.hit, 0.46, F, 0.85); growl(EV.hit, 0.46, F, 0.34);
metal(EV.w2, 0.5, { f: 150 }); kick(EV.w2, 0.9, { pitch: 46, drive: 3 }); snare(EV.w2, 0.75, { tone: 175, verb: 0.35 });
bass808(EV.w2, 0.46, F, 0.85); growl(EV.w2, 0.46, F, 0.2);
for (let s = 0; s < 8; s++) pulseNote(s * S, F + 12 + (s === 3 ? 12 : s === 6 ? 3 : 0), 0.26 * (s % 3 === 0 ? 1 : 0.6), { cut: 700 });
hat(0.25, 0.1); hat(0.75, 0.1); hat(0.875, 0.08);
drone(0, 3, [F + 12, F + 19, F + 24], 0.035, 450);

// ---- bar 0 (1 – 3): logo + phone
lowHit(EV.logo, 0.55, { len: 1.2, f0: 40 });
groove(0, { to: 12 }); bassBar(0, 0, 12); pulseBar(barAt(0), 0, 12, 0.34, 1000);
whoosh(EV.phoneIn, EV.phoneLand - EV.phoneIn + 0.05, 0.2, { lo: 180, hi: 3600, pan0: 0.2, pan1: 0, shape: 0.85, rev: 0.05 });
lowHit(EV.phoneLand, 0.42, { len: 0.6, f0: 52 }); click(EV.phoneLand + 0.01, 0.2, 0, 1600);
[0, 1, 2, 3].forEach(j => tom(EV.fill + j * S, [45, 41, 38, 34][j], 0.75, [0.5, 0.15, -0.15, -0.5][j]));
snare(EV.fill + 2 * S, 0.45, { len: 0.18 }); snare(EV.fill + 3 * S, 0.6, { len: 0.2 });
reverseCrash(EV.s2, 0.7, 0.22);

// ---- bars 1 – 3 (3 – 9): Telegram hero
impact(EV.s2, 0.75, { crashAmt: 0.35 });
drone(EV.s2, 8.0, [F + 12, F + 19], 0.03, 520);
for (let k = 1; k <= 3; k++) {
  const last = k === 3;
  groove(k, { hats16: true, to: last ? 8 : 16 });
  bassBar(k, 0, last ? 8 : 16);
  pulseBar(barAt(k), 0, last ? 8 : 16, 0.34, 1150);
}
metal(EV.gratis, 0.42, { f: 190, pan: 0.1 });
[EV.card1, EV.card2, EV.card3].forEach((t, j) => { liftSwipe(t, 0.2, [-0.3, 0.3, -0.1][j]); lowHit(t + 0.14, 0.3, { len: 0.5, f0: 50 }); });
tickRoll(EV.s2 + 0.1, EV.card1 - 0.05, 6, 0.05); tickRoll(EV.card1 + 1.35, EV.card2 - 0.04, 5, 0.05); tickRoll(EV.card2 + 1.35, EV.card3 - 0.04, 5, 0.05);
// build (8 – 9): snare roll + rising pulse + riser, kick on the beat
{
  const t0 = barAt(3) + 8 * S;
  [0, 4].forEach(s => kick(t0 + s * S, 0.85, { pitch: 46, drive: 3 }));
  for (let s = 0; s < 8; s++) { const v = 0.2 + 0.28 * s / 8; snare(t0 + s * S, v, { len: 0.16, verb: 0.2 }); if (s >= 4) snare(t0 + (s + 0.5) * S, v * 0.85, { len: 0.12, verb: 0.2 }); }
  for (let s = 0; s < 8; s++) pulseNote(t0 + s * S, F + 12 + (s % 2 ? 12 : 0) + Math.floor(s / 2), 0.3 + 0.1 * s / 8, { cut: 900 + 1600 * s / 8 });
  bass808(t0, 0.98, F, 0.8, { from: F - 5, glide: 0.4 }); growl(t0, 0.98, F, 0.18, { cut: 600 });
  riser(t0 - 0.25, 1.2, 0.13);
  whoosh(EV.cardsOut - 0.05, 0.35, 0.26, { lo: 300, hi: 7000, pan0: 0.6, pan1: -0.8, shape: 0.6, rev: 0.05 });
}

// ---- bar 4 (9 – 11): shirt shot, half-time weight
impact(EV.s3, 1.0, { len: 2.0, crashAmt: 0.45 });
braam(EV.s3, F + 12, 0.45, { len: 1.3, bright: 0.8 });
bass808(EV.s3, 0.98, F, 0.85, { from: F + 12, glide: 0.05 }); growl(EV.s3, 0.98, F, 0.34);
metal(EV.corvo, 0.5, { f: 150 }); kick(EV.corvo, 0.9, { pitch: 46, drive: 3 });
bass808(EV.corvo, 0.5, F, 0.8); growl(EV.corvo, 0.5, F, 0.2);
snare(EV.s3 + 1.0, 0.8, { tone: 170, verb: 0.45 }); clap(EV.s3 + 1.0, 0.55, 0.5);
for (let s = 0; s < 12; s++) hat(EV.s3 + s * S, s % 2 ? 0.07 : 0.12, false, s % 2 ? 0.3 : -0.2);
for (let s = 0; s < 11; s++) pulseNote(EV.s3 + s * S, F + 12 + (s === 3 ? 12 : s === 6 ? 3 : 0), 0.26 * (s % 3 === 0 ? 1 : 0.6), { cut: 800 });
whoosh(EV.footOut - 0.12, 0.34, 0.2, { lo: 400, hi: 6000, pan0: -0.5, pan1: 0.7, shape: 0.55 });
suck(EV.pause + 0.2, 0.42, 0.22);
reverseCrash(EV.final, 0.55, 0.2);

// ---- bars 5 – 6 (11 – 15): final payoff
impact(EV.final, 1.15, { len: 2.4, crashAmt: 0.55 });
braam(EV.final, F + 12, 0.6, { len: 1.6, bright: 1.1 });
drone(EV.final, EV.stinger, [F + 12, F + 19, F + 24], 0.035, 600);
groove(5, { hats16: true, from: 0 }); bassBar(5); pulseBar(barAt(5), 1, 16, 0.42, 1500);
drone(EV.final, EV.stinger, [F + 12, F + 19, F + 24, F + 31], 0.05, 1500);
groove(6, { hats16: true, to: 6 }); bassBar(6, 0, 6); pulseBar(barAt(6), 0, 6, 0.42, 1600);
metal(EV.head2, 0.28, { f: 210, pan: -0.2 });
click(EV.cta, 0.26, 0, 1700); lowHit(EV.cta + 0.01, 0.4, { len: 0.7, f0: 48 });
snare(EV.stinger - 2 * S, 0.5, { len: 0.18 }); snare(EV.stinger - S, 0.65, { len: 0.2 }); tom(EV.stinger - S, 36, 0.7);
impact(EV.stinger, 1.1, { len: 1.0 + (EV.end - EV.stinger), crashAmt: 0.5 });
braam(EV.stinger, F + 12, 0.55, { len: EV.end - EV.stinger, bright: 0.9 });
bass808(EV.stinger, 0.8, F, 1.0, { rel: 0.2 }); growl(EV.stinger, 0.7, F, 0.2);

/* ============================== mixing ============================== */
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

const scBass = sidechainGain(0.5, 0.09), scSynth = sidechainGain(0.45, 0.1);
applyGain(bass, scBass); applyGain(synth, scSynth);
eqBus(bass, bq('hp', 30, 0.7), bq('peak', 110, 0.9, 1.5), bq('peak', 700, 0.8, 2.5), bq('lp', 4200, 0.7));
eqBus(synth, bq('hp', 80, 0.7), bq('peak', 350, 1.0, -1.0), bq('peak', 1400, 0.8, 1.5), bq('highshelf', 8000, 0.7, -3));
eqBus(drums, bq('hp', 30, 0.7), bq('lowshelf', 70, 0.7, -2.0), bq('peak', 200, 1.0, 1.5), bq('peak', 3200, 0.8, 1.2), bq('highshelf', 8500, 0.7, -3.5));
const dCopy = { L: Float32Array.from(drums.L), R: Float32Array.from(drums.R) };
compressor(dCopy, { thr: -26, ratio: 6, att: 0.003, rel: 0.08, makeup: 9 });
for (let i = 0; i < N; i++) { drums.L[i] += dCopy.L[i] * 0.4; drums.R[i] += dCopy.R[i] * 0.4; }
const verb = freeverb(rev.L, rev.R, { room: 0.8, damp: 0.45 });
const echo = pingpong(dly.L, dly.R, BEAT * 0.75, 0.25);
applyGain(verb, scSynth);
const music = Bus();
for (let i = 0; i < N; i++) {
  music.L[i] = drums.L[i] * 0.72 + bass.L[i] * 1.25 + synth.L[i] * 1.6 + verb.L[i] * 0.45 + echo.L[i] * 0.4;
  music.R[i] = drums.R[i] * 0.72 + bass.R[i] * 1.25 + synth.R[i] * 1.6 + verb.R[i] * 0.45 + echo.R[i] * 0.4;
}
// the gap before the final hit: hard mute of the music bus with short ramps
{
  const a = Math.round((EV.pause + 0.02) * SR), bnd = Math.round((EV.final - 0.004) * SR), r = Math.round(0.015 * SR);
  for (let i = a - r; i < bnd; i++) { const g = i < a ? 1 - (i - (a - r)) / r : 0; music.L[i] *= g; music.R[i] *= g; }
}
// section dynamics: the Telegram section sits a touch lower so the shirt hit and the final land harder
{
  const K = [[0, 1.0], [EV.s2 - 0.02, 1.0], [EV.s2 + 0.03, 0.88], [EV.build - 0.02, 0.88], [EV.s3 - 0.05, 0.98], [EV.s3 + 0.02, 1.02],
             [EV.final - 0.02, 1.02], [EV.final + 0.02, 1.1], [DUR, 1.1]];
  for (let i = 0; i < N; i++) {
    const t = i / SR; let g = K[K.length - 1][1];
    for (let k = 1; k < K.length; k++) if (t <= K[k][0]) { const [t0, g0] = K[k - 1], [t1, g1] = K[k]; g = g0 + (g1 - g0) * (t - t0) / Math.max(1e-6, t1 - t0); break; }
    music.L[i] *= g; music.R[i] *= g;
  }
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
const TARGET = -11.3;
function master(gainDb) {
  const L = new Float32Array(N), R = new Float32Array(N), g = dbToLin(gainDb);
  for (let i = 0; i < N; i++) { L[i] = (music.L[i] + sfx.L[i] * 1.0) * g; R[i] = (music.R[i] + sfx.R[i] * 1.0) * g; }
  for (const c of [bq('hp', 28, 0.7), bq('lowshelf', 70, 0.7, -3.0), bq('peak', 900, 0.8, 1.5), bq('peak', 2800, 0.9, 2.6), bq('highshelf', 9500, 0.7, 1.0), bq('lp', 18000, 0.54), bq('lp', 18000, 1.31)]) { filt(L, c); filt(R, c); }
  // gentle soft clip before the limiter (adds density, catches transients)
  for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 0.9) / 0.9; R[i] = Math.tanh(R[i] * 0.9) / 0.9; }
  const lp1 = bq('lp', 18500, 0.54), lp2 = bq('lp', 18500, 1.31); filt(L, lp1); filt(L, lp2); filt(R, lp1); filt(R, lp2);
  limiter(L, R, -2.3);
  // fades
  const fi = Math.round(0.004 * SR), fo = Math.round(0.35 * SR);
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

