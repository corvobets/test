// Shared timeline for picture and sound. 144 BPM → 1 beat = 0.41667 s = 25 frames @ 60 fps; 18 bars = 30 s.
(function (root) {
  const BPM = 144, BEAT = 60 / BPM, BAR = BEAT * 4;
  const b = n => n * BEAT;
  const EV = {
    // 0 – 3.33  STOP THE SCROLL
    wipe: b(0), vives: b(0), o: b(2), desporto: b(3), ravenFly: b(4.5), logo1: b(6), out1: b(7.5),
    // 3.33 – 8.33  THE COMMUNITY
    phone: b(8), avatar: b(9), name: b(9.5), desc: b(10), countStart: b(10), countEnd: b(11.6), button: b(11),
    push: b(12), mais41: b(14), comunidade: b(16), out2: b(19.5),
    // 8.33 – 16.67  WHY JOIN
    m1: b(20), m1b: b(21), ballWipe: b(25.5), m2: b(26), m2b: b(27), out4: b(31.5),
    m3: b(32), m3b: b(34), build: b(36), suck: b(39.5),
    // 16.67 – 21.67  BRAND ENERGY (drop)
    drop: b(40), ravenIn: b(43), juntanos: b(44), photoFlash: b(46), ball: b(47), logo2: b(48), out5: b(51.5),
    // 21.67 – 30  CONVERSION
    telegram: b(52), gratis: b(56), fill: b(58.5), pause: b(59), final: b(60), cta: b(60.5), sub: b(61),
  };
  const TL = { BPM, BEAT, BAR, b, EV, DUR: 30 };
  if (typeof module !== 'undefined' && module.exports) module.exports = TL; else root.TL = TL;
})(typeof window !== 'undefined' ? window : globalThis);
