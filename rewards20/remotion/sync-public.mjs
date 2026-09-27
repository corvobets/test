// Copies the shared scene files from rewards20/ into public/ so Remotion can serve them.
// Edit the originals in rewards20/ (comp.js, layout-*.js, timeline.js…); this runs before studio/render.
import { cpSync, rmSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..'), pub = join(here, 'public');
const FILES = ['vertical.html', 'horizontal.html', 'timeline.js', 'engine.js', 'comp.js',
  'layout-vertical.js', 'layout-horizontal.js', 'rewards-audio.wav', 'assets', 'fonts', 'brand'];

rmSync(pub, { recursive: true, force: true });
mkdirSync(pub);
for (const f of FILES) cpSync(join(src, f), join(pub, f), { recursive: true });
console.log(`public/ synced from ${src}`);
