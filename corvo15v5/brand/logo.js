// CORVO BETS logo — vector reconstruction (see brand/README in project README).
// Coordinates are in the banner-crop space (769 × 183). drawCorvoLogo(ctx, x, y, width, opts)
// draws the lockup with its top-left at (x, y). opts.parts selects {symbol, word, tag} and per-part alpha/progress.
window.CorvoLogo = (() => {
  let P = null;
  const COL = { lime: '#C7FD42', white: '#FFFFFF', navy: '#0A0732' };
  async function load(url = 'brand/logo-paths.json') {
    const d = await (await fetch(url)).json();
    P = { ...d, symbolP: new Path2D(d.symbol), symbolFillP: new Path2D(d.symbolFill), whiteP: new Path2D(d.white) };
    return P;
  }
  function tag(ctx, a = 1) {
    const [tl, tr, br, bl] = P.tagQuad;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.fillStyle = COL.lime; ctx.beginPath(); ctx.moveTo(...tl); ctx.lineTo(...tr); ctx.lineTo(...br); ctx.lineTo(...bl); ctx.closePath(); ctx.fill();
    const [x0, x1, y0, y1] = P.betsBox;
    ctx.font = 'italic 900 100px "Montserrat"';
    const m = ctx.measureText('BETS');
    const asc = m.actualBoundingBoxAscent, left = m.actualBoundingBoxLeft, w = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    ctx.translate(x0, y1); ctx.scale((x1 - x0) / w, (y1 - y0) / asc);
    ctx.fillStyle = COL.navy; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.letterSpacing = '0px';
    ctx.fillText('BETS', left, 0);
    ctx.restore();
  }
  function draw(ctx, x, y, width, o = {}) {
    if (!P) return;
    const s = width / P.w;
    const a = o.alpha ?? 1, sa = o.symbol ?? 1, wa = o.word ?? 1, ta = o.tag ?? 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= a;
    if (sa > 0) { ctx.save(); ctx.globalAlpha *= sa; ctx.fillStyle = COL.navy; ctx.fill(P.symbolFillP); ctx.fillStyle = COL.lime; ctx.fill(P.symbolP, 'evenodd'); ctx.restore(); }
    if (wa > 0) { ctx.save(); ctx.globalAlpha *= wa; ctx.fillStyle = COL.white; ctx.fill(P.whiteP, 'evenodd'); ctx.restore(); }
    if (ta > 0) tag(ctx, ta);
    ctx.restore();
  }
  return { load, draw, get data() { return P; }, COL };
})();
