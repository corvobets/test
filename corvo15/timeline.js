// Shared timeline for picture and sound (both formats). 120 BPM → 1 beat = 0.5 s = 30 frames @ 60 fps. 15 s = 30 beats.
(function (root) {
  const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;
  const b = n => n * BEAT;
  const EV = {
    // 0 – 3  HOOK: impact, headline, logo, phone
    hit: b(0), w2: b(1), logo: b(2), phoneIn: b(2.5), phoneLand: b(4), fill: b(5),
    // 3 – 9  TELEGRAM HERO: scroll + three real confirmations
    s2: b(6), gratis: b(7), card1: b(7.5), card2: b(11), card3: b(14.5), build: b(15.5), cardsOut: b(17.5),
    // 9 – 11  SHIRT SHOT + social proof
    s3: b(18), corvo: b(19), footOut: b(20.8), pause: b(21.5),
    // 11 – 15  FINAL
    final: b(22), head2: b(22.5), cta: b(24), stinger: b(28), end: b(30),
  };
  const TL = { BPM, BEAT, BAR, b, EV, DUR: 15 };
  if (typeof module !== 'undefined' && module.exports) module.exports = TL; else root.TL = TL;
})(typeof window !== 'undefined' ? window : globalThis);
