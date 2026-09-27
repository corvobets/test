// CORVO BETS — original 144 BPM sports-trailer soundtrack + synced sound design.
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

/* ============================== tonal ============================== */
function supersawVoice(n0, n, f, amp, pan, fenv, aenv, sendR, sendD, bus = synth, voices = 7, spread = 0.22) {
  const det = Array.from({ length: voices }, (_, k) => (k / (voices - 1) - 0.5) * 2 * spread);
  const ph = det.map(() => rnd()), pans = det.map((d, k) => clamp(pan + (k / (voices - 1) - 0.5) * 1.2, -1, 1));
  const fL = [new SVF(), new SVF()], fR = [new SVF(), new SVF()];
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if ((i & 15) === 0) { const fc = fenv(t); fL[0].set(fc, 0.8); fL[1].set(fc, 0.6); fR[0].set(fc, 0.8); fR[1].set(fc, 0.6); }
    let l = 0, r = 0;
    for (let k = 0; k < voices; k++) {
      const fk = f * Math.pow(2, det[k] / 12), dt = fk / SR;
      ph[k] = (ph[k] + dt) % 1;
      const s = 2 * ph[k] - 1 - blep(ph[k], dt);
      const pk = pans[k]; l += s * (1 - pk) * 0.5; r += s * (1 + pk) * 0.5;
    }
    const e = aenv(t) * amp / voices * 2;
    const ol = fL[1].run(fL[0].run(l)) * e, or = fR[1].run(fR[0].run(r)) * e;
    put(bus, n0 + i, ol, or, sendR, sendD);
  }
}
// brass-like stab (power chord), short and punchy
function stab(t0, notes, amp = 0.5, { len = 0.42, bright = 1, verb = 0.3, echo = 0.18 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round((len + 0.25) * SR);
  const aenv = t => (t < 0.003 ? t / 0.003 : 1) * (t < len ? 0.35 + 0.65 * Math.exp(-t * 7) : (0.35 + 0.65 * Math.exp(-len * 7)) * Math.exp(-(t - len) * 22));
  const fenv = t => 380 + 5200 * bright * Math.exp(-t * 11) + 900 * bright;
  notes.forEach((m, k) => supersawVoice(n0, n, mtof(m), amp * (k === 0 ? 0.9 : 0.7), (k % 2 ? 0.35 : -0.35) * (k ? 1 : 0), fenv, aenv, verb, echo));
  // punch: square sub-octave of the root
  const f = mtof(notes[0] - 12); let ph = 0;
  for (let i = 0; i < Math.round(len * SR); i++) {
    const t = i / SR, dt = f / SR; ph = (ph + dt) % 1;
    const sq = ((ph < 0.5 ? 1 : -1) + blep(ph, dt) - blep((ph + 0.5) % 1, dt)) * 0.25 * amp * Math.exp(-t * 9) * (t < 0.003 ? t / 0.003 : 1);
    put(synth, n0 + i, sq, sq, 0.05);
  }
}
function lead(t0, dur, m, amp = 0.25) {
  const n0 = Math.round(t0 * SR), n = Math.round((dur + 0.12) * SR), f = mtof(m);
  const ph = [rnd(), rnd(), rnd()], fl = new SVF(), fr = new SVF();
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if ((i & 15) === 0) { const fc = 1400 + 3800 * Math.exp(-t * 9); fl.set(fc, 1.0); fr.set(fc * 1.02, 1.0); }
    const vib = 1 + (t > 0.14 ? 0.004 * Math.sin(TAU * 5.5 * t) : 0);
    let l = 0, r = 0;
    [[0.996, -0.5], [1.004, 0.5], [0.5, 0]].forEach(([d, p], k) => {
      const fk = f * d * vib, dt = fk / SR; ph[k] = (ph[k] + dt) % 1;
      const s = k === 2 ? ((ph[k] < 0.5 ? 1 : -1) + blep(ph[k], dt) - blep((ph[k] + 0.5) % 1, dt)) * 0.5 : 2 * ph[k] - 1 - blep(ph[k], dt);
      l += s * (1 - p) * 0.5; r += s * (1 + p) * 0.5;
    });
    const env = (t < 0.006 ? t / 0.006 : 1) * (t < dur ? 0.75 + 0.25 * Math.exp(-t * 6) : 0.75 * Math.exp(-(t - dur) * 30)) * amp;
    put(synth, n0 + i, fl.run(l) * env, fr.run(r) * env, 0.22, 0.28);
  }
}
function pad(t0, t1, notes, amp = 0.12, cut = 1400, { att = 0.35, rel = 0.8 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round((t1 - t0 + rel) * SR), hold = t1 - t0;
  notes.forEach((m, k) => supersawVoice(n0, n, mtof(m), amp, (k / Math.max(1, notes.length - 1)) * 1.4 - 0.7,
    t => cut * (1 + 0.12 * Math.sin(TAU * 0.3 * (t0 + t))),
    t => Math.min(1, t / att) * (t > hold ? Math.max(0, 1 - (t - hold) / rel) : 1), 0.45, 0.05, synth, 5, 0.16));
}
// distorted riff bass + clean sub
function bassNote(t0, dur, m, amp = 0.5, { drive = 3.2, cut = 900, sub = 0.55 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round((dur + 0.02) * SR), f = mtof(m);
  const f1 = new SVF(), f2 = new SVF(); let ph = 0, ph2 = rnd(), phs = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    if ((i & 15) === 0) { const fc = cut * (0.55 + 1.6 * Math.exp(-t * 16)); f1.set(fc, 1.1); f2.set(fc * 1.3, 0.7); }
    const dt = f / SR; ph = (ph + dt) % 1; ph2 = (ph2 + dt * 1.004) % 1; phs += f * 0.5 / SR;
    const saw = (2 * ph - 1 - blep(ph, dt)) * 0.6 + (2 * ph2 - 1 - blep(ph2, dt * 1.004)) * 0.4;
    const x = f2.run(f1.run(Math.tanh(saw * drive)));
    const env = (t < 0.004 ? t / 0.004 : 1) * (t < dur ? 1 : Math.max(0, 1 - (t - dur) / 0.02));
    const s = (x * 0.8 + Math.sin(TAU * phs * 2) * sub) * env * amp;
    put(bass, n0 + i, s, s, 0.0);
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
function wingSweep(t0, dur, amp = 0.45, { pan0 = 0.7, pan1 = -0.7, flap = 9, lo = 250, hi = 2600 } = {}) {
  const n0 = Math.round(t0 * SR), n = Math.round(dur * SR), f = new SVF(), g = new SVF(), air = new SVF();
  air.set(140, 0.8);
  for (let i = 0; i < n; i++) {
    const p = i / n, t = i / SR;
    const env = Math.sin(Math.PI * Math.pow(p, 0.8)) ** 1.4;
    if ((i & 15) === 0) { const fc = lo * Math.pow(hi / lo, Math.sin(Math.PI * p)); f.set(fc, 1.5); g.set(fc * 2.2, 2.0); }
    const x = noise(); f.run(x); g.run(x); air.run(noise());
    const flutter = 0.45 + 0.55 * Math.pow(0.5 + 0.5 * Math.sin(TAU * flap * t), 2);
    const s = (f.bp * 1.3 * flutter + g.bp * 0.5 * flutter + air.lp * 3.2 * Math.sin(Math.PI * p)) * env * amp;
    const [l, r] = panLR(s, pan0 + (pan1 - pan0) * p);
    put(sfx, n0 + i, l, r, 0.12);
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
function pop(t0, amp = 0.2, p = 0, base = 520) {
  const n0 = Math.round(t0 * SR); let ph = 0;
  for (let i = 0; i < SR * 0.12; i++) {
    const t = i / SR; ph += base * (1 + 1.8 * (1 - Math.exp(-t * 60))) / SR;
    const s = Math.sin(TAU * ph) * Math.exp(-t * 34) * Math.min(1, t / 0.002) * amp;
    const [l, r] = panLR(s, p); put(sfx, n0 + i, l, r, 0.15);
  }
}
function shimmer(t0, amp = 0.12, dur = 1.4) {
  for (let k = 0; k < 22; k++) {
    const st = t0 + rnd() * dur * 0.5, f = 2600 + rnd() * 5200, n0 = Math.round(st * SR), p = rnd() * 1.6 - 0.8;
    for (let i = 0; i < SR * 0.6; i++) {
      const t = i / SR, s = Math.sin(TAU * f * t) * Math.exp(-t * (6 + rnd() * 0.01)) * Math.min(1, t / 0.003) * amp * 0.35;
      const [l, r] = panLR(s, p); put(sfx, n0 + i, l, r, 0.5);
    }
  }
}
function ballKick(t0, amp = 0.6) {
  const n0 = Math.round(t0 * SR), bp = new SVF(); bp.set(1500, 1.2); let ph = 0;
  for (let i = 0; i < SR * 0.25; i++) {
    const t = i / SR; ph += (95 + 110 * Math.exp(-t * 45)) / SR; bp.run(noise());
    const s = Math.tanh((Math.sin(TAU * ph) * Math.exp(-t * 26) * 1.1 + bp.bp * Math.exp(-t * 120) * 1.5) * 1.5) * amp;
    put(sfx, n0 + i, s, s, 0.12);
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
function glassTing(t0, amp = 0.12) {
  [[2480, 1], [3730, 0.6], [5210, 0.35]].forEach(([f, a]) => {
    const n0 = Math.round(t0 * SR);
    for (let i = 0; i < SR * 0.9; i++) { const t = i / SR, s = Math.sin(TAU * f * t) * Math.exp(-t * 7) * a * amp * Math.min(1, t / 0.002); put(sfx, n0 + i, s * 0.8, s, 0.4); }
  });
}
function tickRoll(t0, t1, count = 22, amp = 0.09) {
  for (let k = 0; k < count; k++) { const p = k / (count - 1), t = t0 + (t1 - t0) * (1 - Math.pow(1 - p, 1.8)); click(t, amp * (0.6 + 0.4 * p), (k % 2 ? 0.25 : -0.25), 2000 + 900 * p); }
}

/* ============================== arrangement ============================== */
const CH = {
  Em: { r: 40, stab: [52, 59, 64, 67], pad: [52, 59, 64, 67, 71] },
  C: { r: 36, stab: [48, 55, 60, 64], pad: [48, 55, 60, 64, 67] },
  G: { r: 43, stab: [55, 62, 67, 71], pad: [55, 62, 67, 71, 74] },
  D: { r: 38, stab: [50, 57, 62, 66], pad: [50, 57, 62, 66, 69] },
  B: { r: 35, stab: [47, 54, 59, 66], pad: [47, 54, 59, 63, 66] },
};
const barT = k => k * BAR, st = (bar, s) => barT(bar) + s * S16;
const bt = TL.b;

// ---- HOOK (bars 0–1)
impact(EV.vives, 1.0, { len: 2.2, crashAmt: 0.6 });
stab(EV.vives, CH.Em.stab, 0.62, { len: 0.55 });
snare(EV.vives, 0.8); clap(EV.vives, 0.6);
stab(EV.o, CH.G.stab, 0.5, { len: 0.3 }); snare(EV.o, 0.65); tom(EV.o, 45, 0.6, 0.3);
stab(EV.desporto, CH.B.stab, 0.58, { len: 0.5 }); kick(EV.desporto, 0.9); snare(EV.desporto, 0.75); crash(EV.desporto, 0.28);
for (let s = 0; s < 32; s++) {               // palm-muted chug under the hook
  const t = s * S16; if (t >= EV.logo1 - 0.01 && t < EV.logo1 + BEAT) continue;
  const acc = s % 4 === 0 ? 1 : 0.62;
  bassNote(t, S16 * 0.55, 40, 0.34 * acc, { cut: 650, drive: 2.6 });
}
kick(bt(1.5), 0.7); kick(bt(4), 0.85); kick(bt(5.5), 0.7);
for (let s = 4; s < 30; s++) hat(s * S16, s % 2 ? 0.13 : 0.2, false, s % 2 ? 0.3 : -0.2);
impact(EV.logo1, 0.9, { crashAmt: 0.5 }); stab(EV.logo1, CH.Em.stab, 0.6, { len: 0.6 }); clap(EV.logo1, 0.6); snare(EV.logo1, 0.7);
[bt(7), bt(7.25), bt(7.5), bt(7.75)].forEach((t, k) => tom(t, [52, 48, 45, 40][k], 0.7, [0.5, 0.2, -0.2, -0.5][k]));
pad(0, bt(8), [40, 47, 52, 55, 59], 0.07, 900);

// ---- COMMUNITY (bars 2–4): stadium "boom-boom-CLAP"
const commChords = ['Em', 'C', 'D'];
for (let k = 0; k < 3; k++) {
  const bar = 2 + k, c = CH[commChords[k]];
  [0, 2, 8, 10].forEach(s => kick(st(bar, s), s % 8 === 0 ? 0.85 : 0.7));
  [4, 12].forEach(s => { snare(st(bar, s), 0.62, { verb: 0.32 }); clap(st(bar, s), 0.75, 0.4); });
  for (let s = 0; s < 16; s += 2) hat(st(bar, s + 1), 0.16, s === 14, 0.25);
  [[0, 0], [2, 0], [3, 12], [6, 0], [8, 0], [10, 0], [11, 12], [14, 7]].forEach(([s, iv]) => bassNote(st(bar, s), S16 * (s === 14 ? 1.8 : 1.4), c.r + iv, 0.42, { cut: 820 }));
  pad(barT(bar), barT(bar + 1), c.pad, 0.075, 1100);
}
stab(EV.phone, CH.Em.stab, 0.45, { len: 0.35 }); crash(EV.phone, 0.35);
stab(EV.mais41, CH.C.stab, 0.62, { len: 0.6 }); impact(EV.mais41, 0.75, { crashAmt: 0.45 });
stab(EV.comunidade, CH.D.stab, 0.62, { len: 0.6 }); impact(EV.comunidade, 0.7, { crashAmt: 0.4 });
reverseCrash(EV.m1, 0.8, 0.3);

// ---- WHY JOIN (bars 5–8): driving four-on-the-floor + hook stabs
const whyChords = ['Em', 'C', 'G', 'D'];
const HOOK_STEPS = [0, 3, 6, 10, 12];
const RIFF = [[0, 0], [2, 0], [3, 12], [5, 0], [6, 0], [8, 0], [10, 0], [11, 12], [13, 0], [14, 7]];
for (let k = 0; k < 4; k++) {
  const bar = 5 + k, c = CH[whyChords[k]];
  [0, 4, 8, 12].forEach(s => kick(st(bar, s), 0.85));
  if (k === 3) kick(st(bar, 14), 0.6);
  [4, 12].forEach(s => { snare(st(bar, s), 0.7); clap(st(bar, s), 0.55); });
  for (let s = 0; s < 16; s++) hat(st(bar, s), [0.1, 0.07, 0.18, 0.07][s % 4], s % 4 === 2, s % 2 ? 0.3 : -0.1);
  RIFF.forEach(([s, iv]) => bassNote(st(bar, s), S16 * 0.9, c.r + iv, 0.46, { cut: 950 }));
  HOOK_STEPS.forEach(s => stab(st(bar, s), c.stab, s === 0 ? 0.36 : 0.26, { len: 0.16, bright: 0.8, verb: 0.2, echo: 0.12 }));
  pad(barT(bar), barT(bar + 1), c.pad, 0.07, 1300);
}
impact(EV.m1, 0.85, { crashAmt: 0.5 }); stab(EV.m1, CH.Em.stab, 0.55, { len: 0.5 });
stab(EV.m1b, CH.Em.stab, 0.35, { len: 0.25 });
impact(EV.m2, 0.8, { crashAmt: 0.45 }); stab(EV.m2, CH.C.stab, 0.5, { len: 0.45 });
impact(EV.m3, 0.85, { crashAmt: 0.5 }); stab(EV.m3, CH.G.stab, 0.55, { len: 0.5 });
stab(EV.m3b, CH.G.stab, 0.4, { len: 0.3 });
// lead motif over bars 7–8 (introduces the hook melody)
const MEL = { Em: [76, 76, 79, 83, 81], C: [76, 76, 79, 84, 83], G: [74, 74, 79, 83, 81], D: [78, 78, 81, 86, 84] };
[['G', 7], ['D', 8]].forEach(([c, bar]) => HOOK_STEPS.forEach((s, j) => lead(st(bar, s), S16 * (j === 4 ? 3.5 : 2.2), MEL[c][j], 0.13)));

// ---- BUILD (bar 9)
const B9 = 9;
[0, 4, 8].forEach(s => kick(st(B9, s), 0.85)); [10, 12, 14].forEach(s => kick(st(B9, s), 0.75));
for (let s = 0; s < 14; s++) {                       // snare roll: 8ths → 16ths → 32nds
  if (s < 4 && s % 2) continue;
  const v = 0.22 + 0.36 * (s / 14);
  snare(st(B9, s), v, { len: 0.2, verb: 0.2 });
  if (s >= 8) snare(st(B9, s) + S16 / 2, v * 0.9, { len: 0.15, verb: 0.2 });
}
for (let s = 0; s < 14; s++) bassNote(st(B9, s), S16 * 0.8, CH.B.r + (s % 4 === 3 ? 12 : 0), 0.3 + 0.25 * s / 14, { cut: 400 + 1400 * s / 14 });
stab(st(B9, 0), CH.B.stab, 0.5, { len: 0.45 });
[8, 10, 12].forEach((s, j) => stab(st(B9, s), CH.B.stab.map(m => m + [0, 2, 4][j] * 0), 0.3 + 0.08 * j, { len: 0.12, bright: 1.2 }));
riser(barT(B9), BAR - S16 * 1.2, 0.26);
reverseCrash(EV.drop, 1.3, 0.28);
pad(barT(B9), barT(B9) + BAR * 0.88, CH.B.pad, 0.08, 800, { rel: 0.12 });

// ---- DROP (bars 10–12)
const dropChords = ['Em', 'C', 'D'];
for (let k = 0; k < 3; k++) {
  const bar = 10 + k, c = CH[dropChords[k]];
  [0, 4, 8, 12].forEach(s => kick(st(bar, s), 1.0, { drive: 2.8 }));
  if (k === 2) kick(st(bar, 14), 0.8);
  [4, 12].forEach(s => { snare(st(bar, s), 0.85, { verb: 0.3 }); clap(st(bar, s), 0.7); });
  for (let s = 0; s < 16; s++) hat(st(bar, s), [0.12, 0.08, 0.22, 0.08][s % 4], s % 4 === 2, s % 2 ? 0.35 : -0.15);
  RIFF.forEach(([s, iv]) => bassNote(st(bar, s), S16 * 0.9, c.r + iv, 0.62, { cut: 1300, drive: 4 }));
  HOOK_STEPS.forEach((s, j) => {
    stab(st(bar, s), c.stab, s === 0 ? 0.55 : 0.42, { len: j === 4 ? 0.3 : 0.18, bright: 1.1, verb: 0.25, echo: 0.15 });
    lead(st(bar, s), S16 * (j === 4 ? 3.5 : 2.2), MEL[dropChords[k]][j], 0.17);
  });
  pad(barT(bar), barT(bar + 1), c.pad, 0.085, 1900);
}
impact(EV.drop, 1.15, { len: 2.4, crashAmt: 0.7 });
impact(EV.juntanos, 0.95, { crashAmt: 0.55 });
impact(EV.logo2, 1.05, { crashAmt: 0.65 });
[bt(51), bt(51.25), bt(51.5), bt(51.75)].forEach((t, k) => tom(t, [55, 50, 47, 43][k], 0.75, [0.5, 0.15, -0.15, -0.5][k]));

// ---- TELEGRAM (bar 13): half-time
const b13 = 13;
[0, 10].forEach(s => kick(st(b13, s), 0.95)); snare(st(b13, 8), 0.95, { verb: 0.45, len: 0.45 }); clap(st(b13, 8), 0.8, 0.5);
for (let s = 0; s < 16; s += 2) hat(st(b13, s + 1), 0.14, s === 6, 0.25);
[[0, 0, 6], [6, 0, 2], [8, 0, 4], [12, 12, 2], [14, 7, 2]].forEach(([s, iv, d]) => bassNote(st(b13, s), S16 * d * 0.92, CH.Em.r + iv, 0.55, { cut: 900 }));
pad(barT(b13), barT(b13 + 1), CH.Em.pad, 0.085, 1500);
impact(EV.telegram, 0.8, { crashAmt: 0.45 }); stab(EV.telegram, CH.Em.stab, 0.55, { len: 0.5 });
stab(st(b13, 6), CH.Em.stab, 0.35, { len: 0.2 }); stab(st(b13, 12), CH.G.stab, 0.35, { len: 0.25 });

// ---- É GRÁTIS (bar 14) → pause → final hit
const b14 = 14;
impact(EV.gratis, 1.0, { crashAmt: 0.6 }); stab(EV.gratis, CH.C.stab, 0.62, { len: 0.45 });
[0, 4, 8].forEach(s => kick(st(b14, s), 0.95)); [4].forEach(s => { snare(st(b14, s), 0.8); clap(st(b14, s), 0.65); });
for (let s = 0; s < 10; s++) hat(st(b14, s), [0.12, 0.08, 0.2, 0.08][s % 4], s % 4 === 2, 0.2);
[[0, 0], [2, 0], [3, 12], [5, 0], [6, 0]].forEach(([s, iv]) => bassNote(st(b14, s), S16 * 0.9, CH.C.r + iv, 0.6, { cut: 1200, drive: 4 }));
[[8, 0], [10, 0]].forEach(([s, iv]) => bassNote(st(b14, s), S16 * 0.9, CH.D.r + iv, 0.6, { cut: 1300, drive: 4 }));
stab(st(b14, 3), CH.C.stab, 0.4, { len: 0.15 }); stab(st(b14, 6), CH.C.stab, 0.4, { len: 0.15 });
stab(st(b14, 8), CH.D.stab, 0.55, { len: 0.25 });
pad(barT(b14), EV.pause - 0.02, CH.C.pad, 0.08, 1700, { rel: 0.05 });
[10, 11].forEach((s, k) => snare(st(b14, s), 0.55 + 0.15 * k, { len: 0.14 }));
tom(st(b14, 10), 50, 0.6, 0.3); tom(st(b14, 11), 45, 0.65, -0.3);
// (b59 → b60: silence in the music)
// FINAL
impact(EV.final, 1.25, { len: 3.2, crashAmt: 0.8 });
stab(EV.final, CH.Em.stab, 0.72, { len: 1.3, verb: 0.45, echo: 0.3 });
stab(EV.final, CH.Em.stab.map(m => m + 12), 0.28, { len: 1.3, verb: 0.5, echo: 0.3 });
snare(EV.final, 0.9, { verb: 0.55, len: 0.5 }); clap(EV.final, 0.8, 0.6);
bassNote(EV.final, 1.6, 28, 0.55, { cut: 600, drive: 2.5, sub: 0.7 });
pad(EV.final, 28.6, [40, 47, 52, 55, 59, 66], 0.1, 1600, { att: 0.02, rel: 1.3 });
lead(EV.final + BEAT, BEAT * 1.5, 83, 0.1); lead(EV.final + BEAT * 2.5, BEAT * 3, 88, 0.08);

// ---- SOUND DESIGN
wingSweep(0, 0.5, 0.8, { pan0: 0.9, pan1: -0.9, flap: 7 });
whoosh(EV.o - 0.14, 0.24, 0.25, { lo: 900, hi: 7000, pan0: 0.4, pan1: -0.2, shape: 0.8 });
whoosh(EV.desporto - 0.16, 0.26, 0.3, { lo: 700, hi: 7000, pan0: -0.4, pan1: 0.3, shape: 0.8 });
wingSweep(EV.ravenFly, 1.1, 0.45, { pan0: 0.8, pan1: -0.8, flap: 6 });
shimmer(EV.logo1, 0.14, 1.2);
whoosh(EV.out1, EV.phone - EV.out1 + 0.1, 0.35, { lo: 200, hi: 6000, shape: 0.92 });
whoosh(EV.phone, 0.55, 0.3, { lo: 300, hi: 4000, pan0: 0.6, pan1: 0, shape: 0.3 }); glassTing(EV.phone + 0.42, 0.1); thud(EV.phone + 0.42, 0.25);
click(EV.avatar, 0.24, 0); pop(EV.avatar + 0.03, 0.12, 0, 700);
click(EV.name, 0.2, -0.1); click(EV.desc, 0.16, 0.1); click(EV.button, 0.24, 0.05); pop(EV.button + 0.03, 0.12, 0, 880);
tickRoll(EV.countStart, EV.countEnd, 26, 0.1);
whoosh(EV.push, EV.mais41 - EV.push, 0.28, { lo: 150, hi: 3500, pan0: 0, pan1: 0, shape: 0.95 });
whoosh(EV.comunidade - 0.15, 0.3, 0.26, { lo: 800, hi: 7000, shape: 0.75 });
whoosh(EV.out2, 0.3, 0.4, { lo: 500, hi: 9000, pan0: 0.8, pan1: -0.8, shape: 0.55 });
[0.5, 1.25, 2.0].forEach((d, k) => { whoosh(EV.m1 + d, 0.4, 0.12, { lo: 800, hi: 5000, pan0: -0.3, pan1: 0.3 }); click(EV.m1 + d + 0.3, 0.14, 0.2 - k * 0.2); });
ballKick(EV.ballWipe, 0.65); whoosh(EV.ballWipe, 0.45, 0.4, { lo: 400, hi: 8000, pan0: -0.9, pan1: 0.9, shape: 0.5 });
whoosh(EV.m2 + 0.6, 1.3, 0.14, { lo: 200, hi: 1200, pan0: 0, pan1: 0, shape: 0.5, rev: 0.4 });  // slow-mo air
whoosh(EV.out4, 0.3, 0.38, { lo: 500, hi: 9000, pan0: -0.8, pan1: 0.8, shape: 0.55 });
[0, 0.2, 0.4].forEach((d, k) => whoosh(EV.m3 + d, 0.35, 0.16, { lo: 500, hi: 6000, pan0: k - 1, pan1: 0 }));
for (let k = 0; k < 9; k++) pop(EV.m3 + 0.7 + k * 0.27, 0.07, (k % 3 - 1) * 0.5, 500 + (k % 4) * 90);
suck(EV.drop - 0.04, 0.5, 0.35);
wingSweep(EV.drop, 1.3, 0.75, { pan0: 0, pan1: 0, flap: 5, lo: 150, hi: 2000 });
whoosh(EV.ravenIn, EV.juntanos - EV.ravenIn, 0.55, { lo: 120, hi: 4000, pan0: 0, pan1: 0, shape: 0.98 });
whoosh(EV.photoFlash - 0.1, 0.3, 0.3, { lo: 600, hi: 8000, pan0: 0.7, pan1: -0.4 });
ballKick(EV.ball, 0.6); whoosh(EV.ball, EV.logo2 - EV.ball, 0.36, { lo: 300, hi: 6000, pan0: 0.8, pan1: 0, shape: 0.9 });
shimmer(EV.logo2, 0.16, 1.4);
whoosh(EV.out5, 0.35, 0.4, { lo: 300, hi: 8000, shape: 0.7 });
whoosh(EV.telegram - 0.25, 0.8, 0.42, { lo: 600, hi: 9000, pan0: -0.9, pan1: 0.4, shape: 0.45 });   // paper plane
pop(EV.telegram + 0.45, 0.12, 0.3, 900); pop(EV.telegram + 0.52, 0.1, 0.3, 1200);
whoosh(EV.gratis - 0.12, 0.25, 0.3, { lo: 900, hi: 8000, shape: 0.8 });
whoosh(EV.gratis + 0.2, EV.pause - EV.gratis - 0.3, 0.12, { lo: 1200, hi: 5000, pan0: -0.8, pan1: 0.8, shape: 0.5 });   // marquee
suck(EV.final, 0.22, 0.09);
shimmer(EV.final + 0.05, 0.16, 1.6);
click(EV.cta, 0.26, 0, 1800); pop(EV.cta + 0.04, 0.16, 0, 660); click(EV.sub, 0.12, 0.1);

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

const scBass = sidechainGain(0.62, 0.09), scSynth = sidechainGain(0.38, 0.12);
applyGain(bass, scBass); applyGain(synth, scSynth);
eqBus(bass, bq('hp', 34, 0.7), bq('peak', 180, 0.9, 2.0), bq('peak', 850, 0.9, 3.5), bq('lp', 5200, 0.7));
eqBus(synth, bq('hp', 140, 0.7), bq('peak', 1100, 0.8, 2.0), bq('peak', 330, 1.0, -1.5), bq('highshelf', 9000, 0.7, -2.5));
eqBus(drums, bq('hp', 32, 0.7), bq('lowshelf', 70, 0.7, -2.5), bq('peak', 3200, 0.8, 1.5), bq('highshelf', 7500, 0.7, -4.5), bq('peak', 130, 1.0, 1.0));
// parallel drum compression
const dCopy = { L: Float32Array.from(drums.L), R: Float32Array.from(drums.R) };
compressor(dCopy, { thr: -26, ratio: 6, att: 0.003, rel: 0.08, makeup: 9 });
for (let i = 0; i < N; i++) { drums.L[i] += dCopy.L[i] * 0.35; drums.R[i] += dCopy.R[i] * 0.35; }
// effects returns
const verb = freeverb(rev.L, rev.R, { room: 0.86, damp: 0.32 });
const echo = pingpong(dly.L, dly.R);
applyGain(verb, scSynth);
const music = Bus();
for (let i = 0; i < N; i++) {
  music.L[i] = drums.L[i] * 0.7 + bass.L[i] * 1.7 + synth.L[i] * 2.5 + verb.L[i] * 0.5 + echo.L[i] * 0.55;
  music.R[i] = drums.R[i] * 0.7 + bass.R[i] * 1.7 + synth.R[i] * 2.5 + verb.R[i] * 0.5 + echo.R[i] * 0.55;
}
// the pause before the final hit: hard mute of the music bus (tails included), short ramps
{
  const a = Math.round(EV.pause * SR), bnd = Math.round((EV.final - 0.004) * SR), r = Math.round(0.012 * SR);
  for (let i = a - r; i < bnd; i++) { if (i < 0) continue; const g = i < a ? 1 - (i - (a - r)) / r : 0; music.L[i] *= g; music.R[i] *= g; }
}
// section dynamics: leave room for the build and the drop to land harder
{
  const K = [[0, 1.0], [EV.phone - 0.02, 1.0], [EV.phone + 0.03, 0.7], [EV.m1 - 0.02, 0.72], [EV.m1 + 0.03, 0.8], [EV.build - 0.02, 0.86],
             [EV.build + 0.02, 0.66], [EV.drop - 0.25, 0.98], [EV.drop - 0.02, 0.98], [EV.drop + 0.02, 1.08], [EV.telegram - 0.02, 1.08], [EV.telegram + 0.03, 0.86],
             [EV.gratis - 0.02, 0.86], [EV.gratis + 0.03, 0.98], [EV.final - 0.02, 0.98], [EV.final + 0.02, 1.12], [DUR, 1.12]];
  for (let i = 0; i < N; i++) {
    const t = i / SR; let g = K[K.length - 1][1];
    for (let k = 1; k < K.length; k++) if (t <= K[k][0]) { const [t0, g0] = K[k - 1], [t1, g1] = K[k]; g = g0 + (g1 - g0) * (t - t0) / Math.max(1e-6, t1 - t0); break; }
    music.L[i] *= g; music.R[i] *= g;
  }
}
compressor(music, { thr: -11, ratio: 1.8, att: 0.015, rel: 0.18, makeup: 0.5 });
// SFX duck the music a touch so both stay clear
const sfxEnv = new Float32Array(N); { let e = 0; const a = Math.exp(-1 / (0.005 * SR)), rr = Math.exp(-1 / (0.2 * SR));
  for (let i = 0; i < N; i++) { const x = Math.max(Math.abs(sfx.L[i]), Math.abs(sfx.R[i])); e = x > e ? a * e + (1 - a) * x : rr * e + (1 - rr) * x; sfxEnv[i] = e; } }
for (let i = 0; i < N; i++) { const g = 1 - 0.22 * clamp(sfxEnv[i] / 0.35, 0, 1); music.L[i] *= g; music.R[i] *= g; }
eqBus(sfx, bq('hp', 60, 0.7));

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
  for (const c of [bq('hp', 26, 0.7), bq('lowshelf', 55, 0.7, -1.5), bq('peak', 2800, 0.9, 1.2), bq('highshelf', 9500, 0.7, 1.0), bq('lp', 18000, 0.54), bq('lp', 18000, 1.31)]) { filt(L, c); filt(R, c); }
  // gentle soft clip before the limiter (adds density, catches transients)
  for (let i = 0; i < N; i++) { L[i] = Math.tanh(L[i] * 0.9) / 0.9; R[i] = Math.tanh(R[i] * 0.9) / 0.9; }
  const lp1 = bq('lp', 18500, 0.54), lp2 = bq('lp', 18500, 1.31); filt(L, lp1); filt(L, lp2); filt(R, lp1); filt(R, lp2);
  limiter(L, R, -1.4);
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
