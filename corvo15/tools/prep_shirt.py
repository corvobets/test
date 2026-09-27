#!/usr/bin/env python3
"""Shirt shot for the CORVO BETS 15s ad: one 1.5 s excerpt of the supplied pitch video.

  assets/shirt/plate_####.jpg  graded full frame (60 fps, motion-interpolated from 24 fps)
  assets/shirt/cut_####.webp   person cut-out with alpha (rembg, u2net_human_seg)
  assets/shirt/meta.json       fps, count, size, per-frame alpha bbox/centroid (for vertical reframing)

Usage: FFMPEG=/path/to/ffmpeg python3 tools/prep_shirt.py source/pitch-shirt.mp4
"""
import json, os, subprocess, sys, shutil, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage as nd

FF = os.environ.get('FFMPEG', 'ffmpeg')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'shirt')
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'source', 'pitch-shirt.mp4')
START, DUR, FPS = 2.95, 1.5, 60
GRADE = ("eq=contrast=1.12:saturation=1.05:gamma=0.96,"
         "colorbalance=rs=-0.03:gs=-0.05:bs=0.08:rm=0.02:gm=-0.05:bm=0.05:rh=0.02:gh=-0.02:bh=0.04")

def extract(vf, d):
    subprocess.run([FF, '-y', '-loglevel', 'error', '-ss', str(START), '-t', str(DUR), '-i', SRC, '-vf', vf,
                    os.path.join(d, 'f_%04d.png')], check=True)
    return sorted(os.listdir(d))

def main():
    from rembg import remove, new_session
    ses = new_session('u2net_human_seg')
    if os.path.isdir(OUT): shutil.rmtree(OUT)
    os.makedirs(OUT)
    raw, gr = tempfile.mkdtemp(), tempfile.mkdtemp()
    mi = f"minterpolate=fps={FPS}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"
    files = extract(mi, raw); extract(mi + ',' + GRADE, gr)
    frames = []
    for i, f in enumerate(files):
        im = Image.open(os.path.join(raw, f)).convert('RGB'); g = Image.open(os.path.join(gr, f)).convert('RGB')
        g.save(os.path.join(OUT, f'plate_{i:04d}.jpg'), quality=90)
        m = np.array(remove(im, session=ses, only_mask=True)).astype(float) / 255
        m = nd.gaussian_filter(np.clip((m - 0.12) / 0.8, 0, 1), 0.8)
        Image.fromarray(np.dstack([np.array(g), (m * 255).astype(np.uint8)]), 'RGBA').save(os.path.join(OUT, f'cut_{i:04d}.webp'), quality=90, method=4)
        ys, xs = np.where(m > 0.35); w = m[ys, xs]
        frames.append({'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                       'c': [float((xs * w).sum() / w.sum()), float((ys * w).sum() / w.sum())]} if len(xs) else {})
        print(i + 1, '/', len(files), flush=True)
    json.dump({'fps': FPS, 'count': len(files), 'w': g.width, 'h': g.height, 'start': START, 'frames': frames},
              open(os.path.join(OUT, 'meta.json'), 'w'))
    shutil.rmtree(raw); shutil.rmtree(gr)

if __name__ == '__main__':
    main()
