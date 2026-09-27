#!/usr/bin/env python3
"""Prepare the real screen recording for the V3 phone mockup.

  python3 tools/prep_recording.py source/ScreenRecording_12-24-2025_00-24-21_1.mov

Outputs (assets/rec/):
  f_XXXX.webp    one source frame per distinct scroll position (native resolution, pixels untouched);
                 the composition re-times the scroll and shows, for every output frame, the recorded frame
                 at that scroll position
  strip.jpg      the full bet slip as one tall strip, assembled from the recording's own frames at their
                 measured scroll offsets (used only where the phone screen is taller than the recording and
                 for the final scroll back to the top). Nothing is redrawn.
  meta.json      frame list with source time + scroll offset (px, scaled), strip size, badge rows

Scroll offsets are measured by exhaustive vertical block matching between consecutive frames
(the recording is a pure vertical scroll; mean residual after matching is ~0.1 grey levels).
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from PIL import Image

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'rec')
FFMPEG = os.environ.get('FFMPEG', 'ffmpeg')
SCALE = 1.0             # native 1320 px width (one resample only, straight onto the canvas)
Q = 92

os.makedirs(OUT, exist_ok=True)
tmp = tempfile.mkdtemp()
subprocess.run([FFMPEG, '-v', 'error', '-i', SRC, '-an', '-vsync', 'passthrough', '-c:v', 'png', f'{tmp}/%04d.png'], check=True)
info = subprocess.run([FFMPEG, '-i', SRC, '-an', '-vf', 'showinfo', '-f', 'null', '-'], capture_output=True, text=True).stderr
pts = [float(l.split('pts_time:')[1].split()[0]) for l in info.splitlines() if 'pts_time:' in l]
files = sorted(f for f in os.listdir(tmp) if f.endswith('.png'))
N = len(files)
assert N == len(pts), (N, len(pts))
load = lambda i: np.asarray(Image.open(f'{tmp}/{files[i]}').convert('L'), dtype=np.float32)

# ---- scroll offsets (source px): cur[y] == prev[y + s]
H = load(0).shape[0]
offs, prev, cols = [0], load(0), slice(20, 1300)
for i in range(1, N):
    cur = load(i); best = (1e9, 0)
    for s in range(-8, 400):
        if H - abs(s) < 1500: break
        d = (np.abs(prev[s:s + 1400:3, cols] - cur[0:1400:3, cols]) if s >= 0 else np.abs(prev[0:1400:3, cols] - cur[-s:-s + 1400:3, cols])).mean()
        if d < best[0]: best = (d, s)
        if best[0] < 0.05 and s > best[1] + 60: break
    offs.append(offs[-1] + best[1]); prev = cur
offs = np.array(offs)
kmax = int(np.argmax(offs))                   # end of the scroll (before the rubber-band bounce)

# ---- tall strip: frame 0, then rows revealed by later frames (only rows not yet covered)
rgb = lambda i: np.asarray(Image.open(f'{tmp}/{files[i]}').convert('RGB'))
Wd = rgb(0).shape[1]
Hs = int(offs[kmax]) + H
strip = np.zeros((Hs, Wd, 3), np.uint8); filled = 0
for i in range(0, kmax + 1):
    o = int(offs[i]); top = o + H
    if top > filled:
        # take the new rows from the lower-middle of the frame (away from the header marquee and the edges)
        a = max(filled, o + 200)
        strip[a:top] = rgb(i)[a - o:H]
        filled = top
strip[:H] = rgb(0)
sw, sh = round(Wd * SCALE), round(Hs * SCALE)
Image.fromarray(strip).resize((sw, sh), Image.LANCZOS).save(f'{OUT}/strip.jpg', quality=Q, subsampling=0)

# ---- green "Ganho" badges in the strip: centre row + box (for the rhythm pulses and ticks)
arr = strip.astype(np.int16)
g = (arr[:, :, 1] > 150) & (arr[:, :, 0] < 120) & (arr[:, :, 2] < 150)
g[:, :Wd // 2] = False
rows = g.sum(1) > 40
badges, y = [], 0
while y < Hs:
    if rows[y]:
        y0 = y
        while y < Hs and rows[y]: y += 1
        if y - y0 > 20:
            xs = np.where(g[y0:y].any(0))[0]
            badges.append([round(float(xs.min()) * SCALE, 1), round(y0 * SCALE, 1), round(float(xs.max()) * SCALE, 1), round(y * SCALE, 1)])
    y += 1

# ---- playback frames: the first frame of every distinct scroll position, from the first movement to the end
k0 = int(np.argmax(offs > 0)) - 1
sel, seen = [], set()
for i in range(max(0, k0), kmax + 1):
    if int(offs[i]) in seen: continue
    seen.add(int(offs[i])); sel.append(i)
frames = []
for j, i in enumerate(sel):
    im = Image.open(f'{tmp}/{files[i]}').convert('RGB')
    if SCALE != 1: im = im.resize((sw, round(H * SCALE)), Image.LANCZOS)
    im.save(f'{OUT}/f_{j:04d}.webp', quality=90, method=5)
    frames.append({'src': i, 't': round(pts[i], 4), 'off': round(float(offs[i]) * SCALE, 2)})
meta = {'w': sw, 'h': round(H * SCALE), 'stripH': sh, 'scale': SCALE, 'count': len(frames), 'frames': frames,
        'badges': badges, 'srcFrames': N, 'srcDur': pts[-1]}
json.dump(meta, open(f'{OUT}/meta.json', 'w'))
print(f'{N} source frames, scroll {offs[kmax]} px, {len(frames)} playback frames, strip {sw}x{sh}, {len(badges)} badges')
