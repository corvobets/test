// BankFlow — procedural soundtrack + sound design, synced to index.html (120 BPM, 30 s).
// Usage: node audio.mjs bankflow-audio.wav
import fs from 'node:fs';

const SR = 48000, DUR = 30, N = SR * DUR, TAU = Math.PI * 2;
const dryL = new Float32Array(N), dryR = new Float32Array(N), sendL = new Float32Array(N), sendR = new Float32Array(N);
let seed = 77;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rnd() * 2 - 1;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
function put(i, l, r, send = 0) { if (i < 0 || i >= N) return; dryL[i] += l; dryR[i] += r; sendL[i] += l * send; sendR[i] += r * send; }
const pan = (s, p) => [s * Math.cos((p + 1) * Math.PI / 4) * 1.414, s * Math.sin((p + 1) * Math.PI / 4) * 1.414];

/* ---------------- harmony ---------------- */
const CH = {
  Dm9: { bass: 38, notes: [50, 53, 57, 60, 64] },
  Bb: { bass: 34, notes: [46, 50, 53, 57, 60] },
  F: { bass: 41, notes: [53, 57, 60, 64, 67] },
  C: { bass: 36, notes: [48, 52, 55, 62, 64] },
  F9: { bass: 41, notes: [53, 57, 60, 64, 67, 72] },
};
const PROG = [[0, 'Dm9'], [2, 'Bb'], [4, 'F'], [6, 'C'], [8, 'Dm9'], [10, 'Bb'], [12, 'F'], [14, 'C'], [16, 'Dm9'], [18, 'Bb'], [20, 'F'], [22, 'C'], [24, 'Bb'], [26, 'C'], [27, 'F9']];
const chordAt = t => { let c = PROG[0]; for (const p of PROG) if (t >= p[0]) c = p; return c; };

/* ---------------- instruments ---------------- */
// warm pad: detuned saws → 2-pole low-pass, slow attack
function pad(t0, t1, notes, amp, cutoff = 900, rel = 1.2) {
  const n0 = Math.round(t0 * SR), len = Math.round((t1 - t0 + rel) * SR), att = .6;
  notes.forEach((m, k) => {
    const f = mtof(m);
    const det = [-.09, 0, .08];
    const ph = det.map(() => rnd());
    let a1 = 0, a2 = 0, b1 = 0, b2 = 0;
    const p = (k / (notes.length - 1)) * 1.2 - .6;
    for (let i = 0; i < len; i++) {
      const t = i / SR;
      let sL = 0, sR = 0;
      det.forEach((d, j) => { ph[j] += f * Math.pow(2, d / 12) / SR; const saw = (ph[j] % 1) * 2 - 1; if (j !== 2) sL += saw; if (j !== 0) sR += saw; });
      const env = Math.min(1, t / att) * (t > t1 - t0 ? Math.max(0, 1 - (t - (t1 - t0)) / rel) : 1);
      const fc = cutoff * (1 + .15 * Math.sin((t0 + t) * .7));
      const k1 = 1 - Math.exp(-TAU * fc / SR);
      a1 += k1 * (sL - a1); a2 += k1 * (a1 - a2); b1 += k1 * (sR - b1); b2 += k1 * (b1 - b2);
      const g = env * amp * .22;
      put(n0 + i, a2 * g * (1 - p * .5), b2 * g * (1 + p * .5), .55);
    }
  });
}
function pluck(t0, m, amp, p = 0, dec = 9, bright = 3200) {
  const n0 = Math.round(t0 * SR), f = mtof(m), len = Math.round(.9 * SR);
  let ph = 0, lp = 0, lp2 = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; ph += f / SR;
    const s = ((ph % 1) * 2 - 1) * .6 + Math.sin(TAU * ph) * .6;
    const k = 1 - Math.exp(-TAU * (300 + bright * Math.exp(-t * 14)) / SR);
    lp += k * (s - lp); lp2 += k * (lp - lp2);
    const env = Math.min(1, t / .003) * Math.exp(-t * dec) * amp;
    const [l, r] = pan(lp2 * env, p);
    put(n0 + i, l, r, .38);
  }
}
function bell(t0, m, amp, p = 0) {
  const f = mtof(m), n0 = Math.round(t0 * SR);
  [[1, 1, 2.2], [2, .35, 4], [3.01, .18, 6], [4.2, .08, 9]].forEach(([mul, a, d]) => {
    for (let i = 0; i < SR * 2.2; i++) {
      const t = i / SR, s = Math.sin(TAU * f * mul * t) * a * Math.exp(-t * d) * Math.min(1, t / .002) * amp;
      const [l, r] = pan(s, p); put(n0 + i, l, r, .5);
    }
  });
}
function sub(t0, t1, m, amp, pumping = true) {
  const n0 = Math.round(t0 * SR), len = Math.round((t1 - t0) * SR), f = mtof(m);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR; ph += f / SR;
    const beat = ((t0 + t) % .5) / .5;
    const duck = pumping ? Math.min(1, .2 + beat * 2.6) : 1;
    const env = Math.min(1, t / .02) * Math.min(1, (len - i) / (SR * .05));
    const s = (Math.sin(TAU * ph) + .18 * Math.sin(2 * TAU * ph)) * env * duck * amp;
    put(n0 + i, s, s, 0);
  }
}
function kick(t0, amp = 1) {
  const n0 = Math.round(t0 * SR); let ph = 0;
  for (let i = 0; i < SR * .4; i++) {
    const t = i / SR, f = 48 + 95 * Math.exp(-t * 32); ph += f / SR;
    const s = Math.sin(TAU * ph) * Math.exp(-t * 9) * amp + noise() * Math.exp(-t * 300) * .08 * amp;
    put(n0 + i, s, s, .04);
  }
}
function hat(t0, amp = .06, dec = 60, p = .2) {
  const n0 = Math.round(t0 * SR); let x1 = 0, y1 = 0;
  for (let i = 0; i < SR * .12; i++) {
    const t = i / SR, n = noise(); const y = .92 * (y1 + n - x1); x1 = n; y1 = y;
    const [l, r] = pan(y * Math.exp(-t * dec) * amp, p); put(n0 + i, l, r, .15);
  }
}
function snap(t0, amp = .2) {       // soft clap / snap
  const n0 = Math.round(t0 * SR); let lp = 0;
  for (let i = 0; i < SR * .3; i++) {
    const t = i / SR, n = noise(); lp += .3 * (n - lp);
    const env = (Math.exp(-t * 40) + .5 * (t > .011) * Math.exp(-(t - .011) * 30)) * amp;
    put(n0 + i, (n - lp) * env, (n - lp) * env * .9, .35);
  }
}
function whoosh(t0, dur, amp = .3, rev = false, lo = 200, hi = 4000) {
  const n0 = Math.round(t0 * SR), len = Math.round(dur * SR);
  let a = 0, b = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len, x = rev ? p : Math.sin(p * Math.PI);
    const env = rev ? Math.pow(p, 2.4) * (p > .97 ? (1 - p) / .03 : 1) : Math.pow(x, 1.5);
    const fc = lo * Math.pow(hi / lo, rev ? p : .3 + .7 * Math.sin(p * Math.PI));
    const k = 1 - Math.exp(-TAU * fc / SR);
    const n = noise(); a += k * (n - a); b += k * (a - b);
    const bp = (a - b) * 2.2 * env * amp, pn = Math.sin(p * Math.PI * 2) * .6;
    const [l, r] = pan(bp, pn); put(n0 + i, l, r, .3);
  }
}
function thump(t0, amp = .5) {
  const n0 = Math.round(t0 * SR); let ph = 0, lp = 0;
  for (let i = 0; i < SR * 1.2; i++) {
    const t = i / SR, f = 40 + 60 * Math.exp(-t * 14); ph += f / SR;
    const n = noise(); lp += .03 * (n - lp);
    const s = (Math.sin(TAU * ph) * Math.exp(-t * 4) + lp * 2.5 * Math.exp(-t * 5)) * amp;
    put(n0 + i, s, s, .25);
  }
}
function blip(t0, m, amp = .08, p = 0) {
  const n0 = Math.round(t0 * SR), f = mtof(m);
  for (let i = 0; i < SR * .18; i++) {
    const t = i / SR, s = (Math.sin(TAU * f * t) + .3 * Math.sin(TAU * 2 * f * t)) * Math.exp(-t * 28) * Math.min(1, t / .002) * amp;
    const [l, r] = pan(s, p); put(n0 + i, l, r, .35);
  }
}
function tick(t0, amp = .05, p = 0) {
  const n0 = Math.round(t0 * SR);
  for (let i = 0; i < SR * .02; i++) { const t = i / SR, s = noise() * Math.exp(-t * 500) * amp + Math.sin(TAU * 3200 * t) * Math.exp(-t * 300) * amp; const [l, r] = pan(s, p); put(n0 + i, l, r, .1); }
}
function shutter(t0) {
  tick(t0, .25); tick(t0 + .05, .18);
  const n0 = Math.round(t0 * SR); let lp = 0;
  for (let i = 0; i < SR * .12; i++) { const t = i / SR, n = noise(); lp += .2 * (n - lp); const s = lp * Math.exp(-t * 40) * .35; put(n0 + i, s, s, .2); }
}
function scanSweep(t0, dur) {
  const n0 = Math.round(t0 * SR), len = Math.round(dur * SR); let a = 0, b = 0, ph = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len, env = Math.sin(p * Math.PI) ** .7;
    const fc = 800 * Math.pow(6, p), k = 1 - Math.exp(-TAU * fc / SR);
    const n = noise(); a += k * (n - a); b += k * (a - b);
    ph += (900 + 1400 * p) / SR;
    const shimmer = Math.sin(TAU * ph) * Math.sin(TAU * ph * 1.5) * .25;
    const s = ((a - b) * 1.4 + shimmer * .5) * env * .16;
    const [l, r] = pan(s, -0.6 + 1.2 * p); put(n0 + i, l, r, .4);
  }
}
function riser(t0, dur, amp = .25) {
  const n0 = Math.round(t0 * SR), len = Math.round(dur * SR); let a = 0, ph1 = 0, ph2 = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len, f = 220 * Math.pow(2, p * 1.5);
    ph1 += f / SR; ph2 += f * 1.006 / SR;
    const saw = ((ph1 % 1) + (ph2 % 1)) - 1;
    const k = 1 - Math.exp(-TAU * (300 + 5000 * p * p) / SR); a += k * (saw - a);
    const s = (a * .5 + noise() * p * p * .25) * Math.pow(p, 2) * amp;
    put(n0 + i, s * .9, s, .5);
  }
}

/* ---------------- arrangement ---------------- */
// PADS: whole piece, final chord rings out
for (let i = 0; i < PROG.length; i++) {
  const [t0, name] = PROG[i], t1 = PROG[i + 1]?.[0] ?? 30;
  const amp = t0 < 4 ? .55 : t0 < 16 ? .75 : t0 < 24 ? .62 : .8;
  const cut = t0 < 4 ? 650 : t0 < 16 ? 1100 : t0 < 24 ? 900 : 1300;
  pad(t0, name === 'F9' ? 29.2 : t1, CH[name].notes, amp, cut, name === 'F9' ? .8 : 1.0);
}
// ARPEGGIO
const ARP = [0, 2, 4, 3, 1, 3, 4, 2];
for (let s = 4.0; s < 27.0 - 1e-6; s += .125) {
  const inBreak = s >= 16 && s < 22, inRiser = s >= 22 && s < 24;
  if (inRiser) continue;
  const step = Math.round((s - 4) / .125);
  if (inBreak && step % 2) continue;
  const [, name] = chordAt(s), notes = CH[name].notes;
  const m = notes[ARP[step % 8] % notes.length] + 12;
  const acc = step % 4 === 0 ? 1 : .7;
  pluck(s, m, (inBreak ? .07 : .1) * acc, (step % 2 ? .35 : -.35), inBreak ? 7 : 10, inBreak ? 2000 : 3200);
}
// BASS
for (let i = 0; i < PROG.length; i++) {
  const [t0, name] = PROG[i], t1 = PROG[i + 1]?.[0] ?? 30;
  if (t0 < 4) continue;
  if (name === 'F9') { sub(27.0, 29.6, CH.F9.bass, .32, false); continue; }
  if (t0 >= 16 && t0 < 24) { sub(t0, t1, CH[name].bass, .2, false); continue; }
  sub(t0, t1, CH[name].bass, .34, true);
}
// DRUMS
for (let b = 4.0; b < 16.0 - 1e-6; b += .5) { kick(b, b === 4.0 || b === 10.0 ? .95 : .7); hat(b + .25, .05); }
for (let b = 10.0; b < 16.0 - 1e-6; b += 1) snap(b + .5, .14);
for (let s = 16.0; s < 22.0 - 1e-6; s += .25) hat(s, .018, 90, Math.sin(s * 3) * .5);
for (let b = 24.0; b < 27.0 - 1e-6; b += .5) { kick(b, .75); hat(b + .25, .05); }
for (let b = 25.0; b < 27.0 - 1e-6; b += 1) snap(b + .5, .12);

/* ---------------- sound design (synced to picture) ---------------- */
// hook
whoosh(0.0, 1.6, .12, false, 150, 1200);
[0.25, 0.4].forEach((t, i) => blip(t, 69 + i * 5, .04));
whoosh(1.6, .9, .18, false, 300, 5000);                   // organise
for (let i = 0; i < 7; i++) tick(2.65 + i * .05, .06, -0.5 + i * .15);
for (let i = 0; i < 3; i++) blip(2.25 + i * .1, 74 + [0, 3, 5][i], .035);
whoosh(3.05, .95, .3, true, 200, 6000);                    // push into the slip
thump(4.0, .35);
// print + scan
shutter(4.28);
scanSweep(4.5, 1.1);
const fieldsY = [272, 242, 438, 408, 578, 666];             // centres of detected fields (slip coords)
fieldsY.forEach((y, i) => { const tp = 4.5 + 1.1 * (Math.acos(1 - 2 * clamp(y / 790)) / Math.PI); blip(tp, 81 + (i % 3) * 2, .05, .4); });
bell(5.9, 76, .09, .2); bell(6.02, 81, .08, .3);            // "Registada na tua banca"
whoosh(6.4, .8, .18);
// batch imports
[7.55, 8.2, 8.85, 9.45].forEach((bt, bi) => {
  whoosh(bt - .1, .55, .1, false, 600, 7000);
  for (let i = 0; i < 4; i++) blip(bt + .45 + i * .06, 72 + [0, 2, 4, 7][i] + (bi % 2 ? 2 : 0), .05, bi % 2 ? -.4 : .4);
  tick(bt + .75, .08);
});
// control
whoosh(9.9, .9, .25, true, 150, 3000);
thump(10.3, .25);
[[11.0, 74], [11.6, 77], [12.2, 81]].forEach(([t, m]) => bell(t, m, .07, 0));
for (let i = 0; i < 16; i++) tick(11.0 + i * .1 * (1 + i * .03), .025, Math.sin(i) * .4);
thump(13.65, .2); bell(13.65, 69, .06);
// intelligence
whoosh(15.3, 1.0, .25, true, 200, 5000);
thump(16.0, .2);
bell(16.7, 79, .07, -.2); bell(16.82, 83, .05, .2);          // "onde ganhas"
tone(18.2, 50, .1);                                         // "onde perdes" — low, restrained
blip(19.85, 74, .04); blip(20.75, 76, .04);
whoosh(19.35, .8, .12);
riser(21.9, 2.1, .22);
blip(21.85, 69, .04); blip(22.45, 72, .04);
whoosh(23.55, .9, .3, true, 150, 6000);                    // converge
// brand
thump(24.45, .45);
bell(24.5, 81, .08, -.3); bell(24.62, 88, .05, .3);
for (let i = 0; i < 7; i++) tick(24.6 + i * .06, .02, -0.6 + i * .2);
blip(26.25, 84, .05); tick(26.25, .06);
bell(27.0, 77, .07, 0); bell(27.1, 84, .05, .2);

function tone(t0, m, amp) {
  const n0 = Math.round(t0 * SR), f = mtof(m); let lp = 0;
  for (let i = 0; i < SR * .9; i++) {
    const t = i / SR, sq = Math.sin(TAU * f * t) + .4 * Math.sin(TAU * f * 1.5 * t);
    lp += .05 * (sq - lp);
    const s = lp * Math.exp(-t * 4) * Math.min(1, t / .01) * amp; put(n0 + i, s, s, .4);
  }
}

/* ---------------- reverb (Freeverb-style) ---------------- */
function freeverb(inp, spread) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(d => ({ buf: new Float32Array(d + spread), i: 0, f: 0 }));
  const aps = [556, 441, 341, 225].map(d => ({ buf: new Float32Array(d + spread), i: 0 }));
  const outp = new Float32Array(N), fb = .86, damp = .28;
  for (let n = 0; n < N; n++) {
    const x = inp[n] * .015; let y = 0;
    for (const c of combs) { const o = c.buf[c.i]; c.f = o * (1 - damp) + c.f * damp; c.buf[c.i] = x + c.f * fb; c.i = (c.i + 1) % c.buf.length; y += o; }
    for (const a of aps) { const o = a.buf[a.i]; const v = -y + o; a.buf[a.i] = y + o * .5; a.i = (a.i + 1) % a.buf.length; y = v; }
    outp[n] = y;
  }
  return outp;
}
const wetL = freeverb(sendL, 0), wetR = freeverb(sendR, 23);

/* ---------------- master ---------------- */
const L = new Float32Array(N), R = new Float32Array(N);
let hpL = 0, hpR = 0, pxL = 0, pxR = 0;
for (let i = 0; i < N; i++) {
  let l = dryL[i] + wetL[i] * 1.6, r = dryR[i] + wetR[i] * 1.6;
  // DC / rumble high-pass (~25 Hz)
  const a = .9967; const yl = a * (hpL + l - pxL); pxL = l; hpL = yl; const yr = a * (hpR + r - pxR); pxR = r; hpR = yr;
  L[i] = yl; R[i] = yr;
}
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
const drive = 1.25 / peak;
const fadeIn = i => Math.min(1, i / (SR * .05)), fadeOut = i => Math.min(1, (N - i) / (SR * .6));
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const g = fadeIn(i) * fadeOut(i);
  buf.writeInt16LE(Math.round(Math.tanh(L[i] * drive) * .68 * g * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.tanh(R[i] * drive) * .68 * g * 32767), 46 + i * 4);
}
fs.writeFileSync(process.argv[2] || 'bankflow-audio.wav', buf);
console.log('written, raw peak', peak.toFixed(2));
