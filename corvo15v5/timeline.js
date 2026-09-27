// CORVO BETS 15s V5 (vertical): shared timeline for picture and sound, locked to the music.
// Music: "Touch The Sky" from 2.32 s into the track (its opening horn hit lands on the ad's first frame).
// The song runs at 106.65 BPM: beats fall at g(k) = 0.2625 + 0.5626·k s of ad time; bar downbeats at k = 0, 4, 8 …
// (2.51, 7.01 and 11.51 s are the big hits after the song's short breaks.) Every event below sits on that grid.
(function (root) {
  const BEAT = 60 / 106.65, BAR = BEAT * 4, G0 = 0.2625, MUSIC_START = 2.32;
  const g = k => +(G0 + BEAT * k).toFixed(4);
  const b = g;
  const EV = {
    // 0 – 2.5  HOOK: the song's opening hit, logo, "25 € →", the number, APOSTA GANHA, phone enters
    hit: 0, num: g(1), tag: g(2), phoneIn: g(2), phoneLand: g(3),
    // 2.5 – 7  THE ACTUAL BET: big hit after the break → headline, re-timed recording, snap back to the top
    s2: g(4), head2: g(5), play0: 2.62, top: 6.56, topEnd: g(11.85),
    // 7 – 11.5  RESULT: the summary card lifts out on the next big hit
    reveal: g(12), ganho: g(13), bars: g(14), barsEnd: g(15.5), ret: g(16), odds: g(17), pause: g(18.95),
    // 11.5 – 15  INVITATION: the third big hit
    final: g(20), head: g(20.5), gratis: g(21), cta: g(21.5), stinger: g(24), end: 15,
  };
  // Scroll of the real recording inside the phone (px of the prepared strip, see tools/prep_recording.py).
  // V4: the recording is re-timed to one smooth, confident move (≈2.3× the original pace): an eased start,
  // a constant speed at which one green "Ganho" row passes the centre every dotted 8th of the song (0.42 s), an eased stop on the last selection, a short hold, then a fast return to the top of the slip.
  // Every output frame shows the recorded frame at that scroll position; rows around it come from the strip.
  const STEP = BEAT * 0.75, RAMP = 0.42, GRID0 = g(6);
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
  const TL = { BPM: 106.65, BEAT, BAR, b, g, G0, EV, DUR: 15, MUSIC_START, makeScroll };
  if (typeof module !== 'undefined' && module.exports) module.exports = TL; else root.TL = TL;
})(typeof window !== 'undefined' ? window : globalThis);
