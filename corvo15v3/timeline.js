// CORVO BETS 15s V3 (vertical): shared timeline for picture and sound.
// 120 BPM → 1 beat = 0.5 s = 30 frames @ 60 fps. Bar lines on odd seconds (1, 3, 5 … 13); 0 – 1 is a two-beat pickup.
(function (root) {
  const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;
  const b = n => n * BEAT;
  const EV = {
    // 0 – 2  HOOK: impact, logo, "25 € → 2 110,75 €", APOSTA GANHA, phone enters
    hit: 0, num: b(1), tag: b(2), phoneIn: b(2), phoneLand: b(3.5),
    // 2 – 7  THE ACTUAL BET: the phone plays the real recording at 2×, then snaps back to the top
    s2: b(4), head2: b(5), play0: b(4.5), top: b(12.75), topEnd: b(13.75),
    // 7 – 11  RESULT: the real summary card lifts out of the phone (strongest accent)
    reveal: b(14), ganho: b(15), bars: b(15.25), barsEnd: b(17), ret: b(18), odds: b(19), pause: b(21.5),
    // 11 – 15  INVITATION
    final: b(22), head: b(22.5), gratis: b(23.5), cta: b(24), stinger: b(28), end: b(30),
  };
  // Scroll of the real recording inside the phone (px of the prepared strip, see tools/prep_recording.py).
  // 0 before playback → the recording's own offsets frame by frame (every 2nd source frame = 2×) → hold →
  // fast return to the top of the slip, where the summary card lifts out.
  function makeScroll(meta) {
    const F = meta.frames, n = F.length, last = F[n - 1].off;
    const e = x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2;
    return t => {
      const k = Math.floor((t - EV.play0) * 60 + 1e-6);
      if (k < 0) return { off: 0, frame: 0 };
      if (k < n) return { off: F[k].off, frame: k };
      if (t < EV.top) return { off: last, frame: n - 1 };
      const p = e((t - EV.top) / (EV.topEnd - EV.top));
      return { off: last * (1 - p), frame: p >= 1 ? 0 : null };
    };
  }
  const TL = { BPM, BEAT, BAR, b, EV, DUR: 15, makeScroll };
  if (typeof module !== 'undefined' && module.exports) module.exports = TL; else root.TL = TL;
})(typeof window !== 'undefined' ? window : globalThis);
