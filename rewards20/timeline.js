// CORVO BETS REWARDS — 19.2 s vertical. Shared timeline for picture and sound.
// 150 BPM → 1 beat = 0.4 s = 24 frames @ 60 fps. A two-beat pickup (0 – 0.8), then bar lines every 1.6 s
// at 0.8, 2.4, 4.0, 5.6, 7.2, 8.8, 10.4, 12.0, 13.6, 15.2, 16.8, 18.4. Every scene change sits on a bar line.
(function (root) {
  const BPM = 150, BEAT = 60 / BPM, BAR = BEAT * 4;
  const b = n => +(n * BEAT).toFixed(4);
  const EV = {
    // HOOK
    hit: 0, h2: b(2), h3: b(3), h4: b(4), build: b(5),
    // VALUE PROPOSITION (drop)
    drop: b(6), v1: b(7), v2: b(7.5), v3: b(8),
    // POINTS (partner houses)
    pts: b(10), t1: b(10.5), t2: b(11), chart: b(10),
    // FEATURES
    cash: b(14), press: b(16),
    lead: b(18),
    wheel: b(22), spin: b(23), jackpot: b(28), whip: b(29.5),
    give: b(30),
    recap: b(34),
    // CLOSE
    close: b(38), join2: b(38.5), cta: b(40), final: b(46), end: b(48),
  };
  const TL = { BPM, BEAT, BAR, b, EV, DUR: b(48) };
  if (typeof module !== 'undefined' && module.exports) module.exports = TL; else root.TL = TL;
})(typeof window !== 'undefined' ? window : globalThis);
