// Procedural soundtrack synced to the video timeline (120 BPM, beat = 0.5 s).
// Usage: node audio.mjs out.wav
import fs from 'node:fs';

const SR = 48000, DUR = 15, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 1234;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const noise = () => rnd() * 2 - 1;
const add = (i, l, r = l) => { if (i >= 0 && i < N) { L[i] += l; R[i] += r; } };
const TAU = Math.PI * 2;

function kick(t0, amp = 1) {
  let ph = 0;
  for (let i = 0; i < SR * .45; i++) {
    const t = i / SR, f = 45 + 120 * Math.exp(-t * 28);
    ph += TAU * f / SR;
    const env = Math.exp(-t * 7) * (t < .002 ? t / .002 : 1);
    const click = Math.exp(-t * 400) * noise() * .3;
    add(Math.round(t0 * SR) + i, amp * (Math.sin(ph) * env + click));
  }
}
function hat(t0, amp = .12, dec = 45) {
  let prev = 0;
  for (let i = 0; i < SR * .08; i++) {
    const n = noise(), hp = n - prev; prev = n;
    const e = Math.exp(-i / SR * dec) * amp * hp;
    add(Math.round(t0 * SR) + i, e * .8, e);
  }
}
function clap(t0, amp = .35) {
  let lp = 0;
  for (let i = 0; i < SR * .25; i++) {
    const t = i / SR;
    const env = (Math.exp(-t * 25) + .6 * Math.exp(-Math.max(0, t - .012) * 30) * (t > .012) + .5 * Math.exp(-Math.max(0, t - .024) * 18) * (t > .024)) * amp;
    const n = noise(); lp += .35 * (n - lp);
    add(Math.round(t0 * SR) + i, (n - lp) * env, (n - lp) * env * .9);
  }
}
function impact(t0, amp = 1) {             // boom + noise crash
  let ph = 0, lp = 0;
  for (let i = 0; i < SR * 2.2; i++) {
    const t = i / SR, f = 32 + 90 * Math.exp(-t * 12);
    ph += TAU * f / SR;
    const n = noise(); lp += .08 * (n - lp);
    const s = Math.sin(ph) * Math.exp(-t * 2.2) * 1.1 + lp * Math.exp(-t * 3) * 1.6 + n * Math.exp(-t * 9) * .25;
    add(Math.round(t0 * SR) + i, amp * s, amp * (s * .95 + n * Math.exp(-t * 9) * .05));
  }
}
function whoosh(t0, dur, amp = .5, rev = false) {  // band-swept noise swell
  let a = 0, b = 0;
  const n0 = Math.round(t0 * SR), len = Math.round(dur * SR);
  for (let i = 0; i < len; i++) {
    const p = i / len, x = rev ? 1 - p : p;
    const env = Math.pow(x, 2.2) * (rev ? 1 : (p > .96 ? (1 - p) / .04 : 1));
    const k = .01 + .25 * x;
    const n = noise(); a += k * (n - a); b += k * (a - b);
    const pan = Math.sin(p * Math.PI * 1.5) * .5;
    add(n0 + i, (a - b) * env * amp * 3 * (1 - pan), (a - b) * env * amp * 3 * (1 + pan));
  }
}
function tone(t0, dur, f, amp, { type = 'sine', att = .005, dec = 4, pan = 0, vib = 0 } = {}) {
  let ph = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR;
    ph += TAU * f * (1 + vib * Math.sin(t * 30)) / SR;
    let s;
    if (type === 'sine') s = Math.sin(ph);
    else if (type === 'saw') s = ((ph / TAU) % 1) * 2 - 1;
    else s = Math.sin(ph) + .3 * Math.sin(2 * ph) + .15 * Math.sin(3 * ph);
    const env = Math.min(1, t / att) * Math.exp(-t * dec);
    add(Math.round(t0 * SR) + i, s * env * amp * (1 - pan), s * env * amp * (1 + pan));
  }
}
function bell(t0, f, amp = .2) {
  [[1, 1, 3], [2.76, .5, 5], [5.4, .25, 8], [8.93, .12, 11]].forEach(([m, a, d]) => tone(t0, 2.5, f * m, amp * a, { dec: d }));
}
function riser(t0, dur, amp = .35) {
  let ph1 = 0, ph2 = 0, lp = 0;
  for (let i = 0; i < dur * SR; i++) {
    const p = i / (dur * SR), f = 110 * Math.pow(2, p * 3);
    ph1 += TAU * f / SR; ph2 += TAU * f * 1.007 / SR;
    const saw = ((ph1 / TAU) % 1) * 2 - 1 + ((ph2 / TAU) % 1) * 2 - 1;
    lp += (.02 + .3 * p) * (saw - lp);
    const n = noise() * p * p * .5;
    const env = Math.pow(p, 1.6) * amp;
    add(Math.round(t0 * SR) + i, (lp * .5 + n) * env, (lp * .5 - n * .6) * env);
  }
}
function sub(t0, dur, f, amp = .45) {
  let ph = 0;
  for (let i = 0; i < dur * SR; i++) {
    const t = i / SR; ph += TAU * f / SR;
    const beatPos = ((t0 + t) % .5) / .5;                 // sidechain pump
    const duck = Math.min(1, .15 + beatPos * 3.2);
    const env = Math.min(1, t / .01) * Math.min(1, (dur - t) / .02);
    const s = Math.tanh(Math.sin(ph) * 1.6) * env * duck * amp;
    add(Math.round(t0 * SR) + i, s);
  }
}

/* ---------------- arrangement ---------------- */
// Intro: drone + shimmer, ignition, logo impact
tone(0, 2.0, 55, .18, { type: 'organ', att: .6, dec: .4 });
tone(0, 2.0, 82.4, .08, { type: 'organ', att: .8, dec: .5, pan: .3 });
whoosh(0.05, .6, .25, true);
whoosh(0.35, .6, .35);
impact(0.95, .7);
bell(0.95, 659.25, .18); bell(1.0, 987.77, .1);
for (let i = 0; i < 10; i++) hat(1.02 + i * .035, .05, 80);    // letter ticks
whoosh(1.45, .55, .5);                                         // zoom through

// Beat section 2.0 – 11.0
const BASS = [[2.0, 55], [4.0, 55], [5.5, 43.65], [7.5, 49], [9.5, 41.2]];
for (let b = 0; b < BASS.length; b++) sub(BASS[b][0], (BASS[b + 1]?.[0] ?? 11.0) - BASS[b][0], BASS[b][1]);
for (let t = 2.0; t < 11.0 - 1e-6; t += .5) {
  kick(t, t === 2.0 ? 1.1 : .9);
  hat(t + .25, .14);
  if (t >= 4.0) { hat(t + .125, .05); hat(t + .375, .05); }
  if (Math.round((t - 2) / .5) % 2 === 1) clap(t, .28);
}
impact(2.0, .9);
[2.0, 2.5, 3.0, 3.5].forEach((t, i) => tone(t, .45, [220, 261.6, 329.6, 392][i], .12, { type: 'organ', dec: 7, pan: i % 2 ? .4 : -.4 }));
whoosh(3.5, .5, .55);                                          // shard wipe
// counter ticks 4.12 – 5.4 (slowing)
for (let i = 0; i < 26; i++) { const p = i / 25; const t = 4.12 + (1 - Math.pow(1 - p, 2.2)) * 1.26; hat(t, .07, 120); tone(t, .03, 2400 + p * 1600, .03, { dec: 60 }); }
impact(5.4, 1.0);
bell(5.4, 880, .22); bell(5.45, 1318.5, .12);
for (let i = 0; i < 14; i++) tone(5.45 + i * .045, .25, 1800 + rnd() * 2400, .025, { dec: 18, pan: rnd() - .5 });  // coins
whoosh(6.85, .65, .55);                                        // bars wipe
impact(7.5, .45);
for (let i = 0; i < 10; i++) hat(7.75 + i * .045, .06, 70);    // rows landing
// climb 9.0 – 10.25: nine ascending blips
const SCALE = [440, 493.9, 554.4, 587.3, 659.3, 740, 830.6, 880, 987.8];
for (let i = 0; i < 9; i++) tone(9.0 + (i + .5) * (1.25 / 9), .18, SCALE[i], .09, { type: 'organ', dec: 14, pan: (i % 2 ? .25 : -.25) });
impact(10.3, .85);
bell(10.3, 1046.5, .2);
whoosh(10.5, .5, .4);
// Riser section 11.0 – 12.5
impact(11.0, .4);
riser(11.0, 1.5, .4);
for (let i = 0; i < 12; i++) hat(11.0 + i * .125 * (1 - i / 30), .08 + i * .006, 60);
kick(11.0, .8); kick(11.5, .8); kick(12.0, .8); kick(12.25, .7); kick(12.375, .6);
// Drop / end card
impact(12.5, 1.25);
kick(12.5, 1.1);
[110, 164.8, 220, 277.2, 329.6, 440].forEach((f, i) => tone(12.5, 2.5, f, .07, { type: 'organ', att: .01, dec: .9, pan: (i % 3 - 1) * .4, vib: .003 }));
bell(12.55, 659.25, .2); bell(13.25, 987.77, .14); bell(13.6, 1318.5, .1);
for (let i = 0; i < 20; i++) hat(13.5 + i * .03, .03, 150);     // url typing
for (const t of [13.0, 13.5, 14.0, 14.5]) hat(t + .25, .06);

/* ---------------- master ---------------- */
// simple stereo reverb-ish: a few feedback delays
const taps = [[.031, .22], [.047, .18], [.071, .14], [.113, .1]];
const Lw = Float32Array.from(L), Rw = Float32Array.from(R);
for (const [d, g] of taps) { const k = Math.round(d * SR); for (let i = k; i < N; i++) { Lw[i] += Rw[i - k] * g * .6; Rw[i] += Lw[i - k] * g * .6; } }
let peak = 0; for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(Lw[i]), Math.abs(Rw[i]));
const gain = 1.6 / peak;
const fadeOut = i => Math.min(1, (N - i) / (SR * .25));
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVE', 8); buf.write('fmt ', 12);
buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const f = fadeOut(i);
  buf.writeInt16LE(Math.round(Math.tanh(Lw[i] * gain) * .89 * f * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.tanh(Rw[i] * gain) * .89 * f * 32767), 46 + i * 4);
}
fs.writeFileSync(process.argv[2] || 'audio.wav', buf);
console.log('peak', peak.toFixed(2), 'written');
