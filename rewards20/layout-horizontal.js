/* Corvo Bets Rewards — HORIZONTAL layout (1920×1080, 16:9).
   Title block on the left third, visuals on the right; essential copy inside x ≈ 110 – 1810, y ≈ 90 – 990. */
window.LY = {
  name: 'horizontal', tunnelY: 540, zoomC: [960, 540],
  hook: { split: false, y: [330, 470, 690], maxW: [1500, 1300, 1700], size: [200, 104, 210], pill: 790 },
  value: { logo: { y0: 480, y1: 225, w0: 820, w1: 560 }, y: [500, 625, 800], maxW: [1500, 1600], size: [118, 170] },
  head: { x: 130, eb: 300, l1: 440, l2: 565, sub1: 510, sub2: 635, maxW: 760, size: 124, sub: 36 },
  points: { tiles: [[1000, 150, 0.9], [1430, 150, 0.9]], chart: [1010, 1820, 900, 210], sub: [134, 720, 'left', 30] },
  cash: { cx: 1360, cy: 560, s: 0.96 },
  lead: { x: 960, y0: 250, w: 860, rh: 112, gap: 14 },
  wheel: { cx: 1370, cy: 560, s: 0.88, jack: { x: 130, y: 470, size: 150, align: 'left', cy: 610 } },
  give: { podiums: [[1010, 880, 340], [1730, 880, 340], [1370, 960, 480]], prizes: [['prize_iphone', 1370, 965, 420, 0], ['prize_ps5', 1010, 885, 270, 1], ['prize_gta6', 1730, 885, 290, 2]] },
  recap: { cx: 960, y0: 330, dy: 150, maxW: 1500, size: 124 },
  close: { logo: [960, 235, 560], lines: [['JUNTA-TE À CORVO BETS', 490], ['REWARDS.', 645, 1]], maxW: 1600, size: [112, 160], cta: 720, legal: 950 },
};
