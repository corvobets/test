// CORVO BETS 15s V4 (vertical): shared timeline for picture and sound.
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
  // V4: the recording is re-timed to one smooth, confident move (≈2.3× the original pace): an eased start,
  // a constant speed at which one green "Ganho" row passes the centre every dotted 8th (0.375 s, the riff's
  // 3-3-2 feel), an eased stop on the last selection, a short hold, then a fast return to the top of the slip.
  // Every output frame shows the recorded frame at that scroll position; rows around it come from the strip.
  const STEP = 0.375, RAMP = 0.42, GRID0 = 3.0;
  function makeScroll(meta) {
    const F = meta.frames, n = F.length, last = F[n - 1].off, B = meta.badges.map(b => (b[1] + b[3]) / 2);
    const SP = B[1] - B[0], V = SP / STEP, T = last / V + RAMP, play1 = EV.play0 + T;
    const ramp = u => RAMP * (u * u * u - u * u * u * u / 2);        // ∫ smoothstep-velocity
    const d = tau => tau <= 0 ? 0 : tau >= T ? last : tau < RAMP ? V * ramp(tau / RAMP) : tau > T - RAMP ? last - V * ramp((T - tau) / RAMP) : V * (tau - RAMP / 2);
    const e5 = x => x <= 0 ? 0 : x >= 1 ? 1 : x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2;
    const frameAt = off => { let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (F[m].off <= off + 1e-6) lo = m; else hi = m - 1; } return lo; };
    const at = t => {
      if (t < EV.top) { const off = d(t - EV.play0); return { off, frame: frameAt(off) }; }
      const p = e5((t - EV.top) / (EV.topEnd - EV.top));
      return { off: last * (1 - p), frame: p >= 1 ? 0 : null };
    };
    // reference line (strip rows below the screen's content top) where rows cross on the grid
    let R = B[0] - V * (GRID0 - EV.play0 - RAMP / 2);
    while (R < 820) R += SP; while (R >= 820 + SP) R -= SP;
    const cross = [];
    B.forEach((b, i) => { const off = b - R; if (off <= 0 || off >= last) return;
      let lo = EV.play0, hi = play1; for (let k = 0; k < 50; k++) { const m = (lo + hi) / 2; if (d(m - EV.play0) < off) lo = m; else hi = m; }
      cross.push({ t: +lo.toFixed(4), i }); });
    at.R = R; at.cross = cross; at.play1 = play1; at.badges = meta.badges;
    return at;
  }
  const TL = { BPM, BEAT, BAR, b, EV, DUR: 15, makeScroll };
  if (typeof module !== 'undefined' && module.exports) module.exports = TL; else root.TL = TL;
})(typeof window !== 'undefined' ? window : globalThis);
