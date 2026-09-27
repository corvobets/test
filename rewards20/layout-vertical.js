/* Corvo Bets Rewards — VERTICAL layout (1080×1920, Stories/Reels).
   Essential copy, logo and CTA inside x ≈ 70 – 1000, y ≈ 280 – 1460. */
window.LY = {
  name: 'vertical', tunnelY: 900, zoomC: [540, 900],
  hook: { split: true, y: [720, 860, 1060, 1250], maxW: [960, 940, 960], size: [230, 120, 230], pill: 1340 },
  value: { logo: { y0: 820, y1: 470, w0: 900, w1: 700 }, y: [880, 1010, 1175], maxW: [940, 950], size: [124, 170] },
  head: { x: 80, eb: 330, l1: 470, l2: 600, sub1: 540, sub2: 668, maxW: 890, size: 128, sub: 38 },
  points: { tiles: [[70, 690, 1], [555, 690, 1]], chart: [90, 990, 1400, 220], sub: [540, 1460, 'center', 31] },
  cash: { cx: 540, cy: 1010, s: 1 },
  lead: { x: 70, y0: 760, w: 940, rh: 124, gap: 14 },
  wheel: { cx: 540, cy: 1130, s: 0.86, jack: { x: 540, y: 520, size: 190, align: 'center', cy: 640 } },
  give: { podiums: [[190, 1250, 330], [890, 1250, 330], [540, 1380, 480]], prizes: [['prize_iphone', 540, 1385, 400, 0], ['prize_ps5', 190, 1255, 280, 1], ['prize_gta6', 890, 1255, 280, 2]] },
  recap: { cx: 540, y0: 640, dy: 170, maxW: 940, size: 130 },
  close: { logo: [540, 450, 720], lines: [['JUNTA-TE À', 790], ['CORVO BETS', 920], ['REWARDS.', 1075, 1]], maxW: 940, size: [130, 170], cta: 1160, legal: 1400 },
};
