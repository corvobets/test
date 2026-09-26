// Renders index.html frame-by-frame with headless Chromium and encodes with ffmpeg.
// Usage:
//   node render.mjs chunk  <w> <h> <out.mp4> <startFrame> <endFrame>   (high-quality intermediate, no audio)
//   node render.mjs stills <w> <h> <outDir> <t1,t2,...>
import { createRequire } from 'node:module';
import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); }
catch { ({ chromium } = require(execSync('npm root -g').toString().trim() + '/playwright')); }

const [mode, w, h, target, extra, extra2] = process.argv.slice(2);
const W = +w, H = +h;
const ROOT = path.dirname(new URL(import.meta.url).pathname);
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const TYPES = { ".png": "image/png", '.html': 'text/html', '.woff2': 'font/woff2', '.wav': 'audio/wav', '.mjs': 'text/javascript' };

const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => { console.error('[pageerror]', e); process.exit(1); });
const sub = process.env.SUB || 3;
await page.goto(`http://localhost:${port}/index.html?render&w=${W}&h=${H}&sub=${sub}`);
await page.evaluate(() => window.ready);
const { FPS, DUR } = await page.evaluate(() => window.META);

async function grab(t) {
  const b64 = await page.evaluate(t => { window.renderFrame(t); return document.getElementById('cv').toDataURL('image/png').slice(22); }, t);
  return Buffer.from(b64, 'base64');
}

if (mode === 'stills') {
  fs.mkdirSync(target, { recursive: true });
  for (const t of extra.split(',').map(Number)) {
    fs.writeFileSync(path.join(target, `t${t.toFixed(2)}.png`), await grab(t));
  }
} else {
  const start = +extra, end = +extra2;
  const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '8', '-pix_fmt', 'yuv420p', target];
  const ff = spawn(FFMPEG, args, { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = start; i < end; i++) {
    const buf = await grab(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if ((i - start) % 60 === 0) console.log(`frame ${i} (${start}-${end})`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
}
await browser.close();
server.close();
