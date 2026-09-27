#!/usr/bin/env python3
"""Asset pipeline for the CORVO BETS 30s film.

Extracts short excerpts from the supplied footage, interpolates them to a smooth frame rate,
grades them, segments the subject (rembg) and exports web-friendly frame sequences:

  assets/<clip>/plate_####.jpg   graded full frame (footage clips)
  assets/<clip>/cut_####.webp    subject cut-out with alpha
  assets/<clip>/meta.json        fps, frame count, size, per-frame alpha bbox/centroid

Usage: python3 tools/prep_assets.py <raven.mp4> <pitch.mp4>
Needs: ffmpeg (FFMPEG env), rembg + onnxruntime, numpy, scipy, pillow, opencv-python-headless.
"""
import json, os, subprocess, sys, shutil, tempfile
import numpy as np
from PIL import Image
from scipy import ndimage as nd

FF = os.environ.get('FFMPEG', 'ffmpeg')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(ROOT, 'assets')
RAVEN, PITCH = sys.argv[1], sys.argv[2]

GRADE_PITCH = ("eq=contrast=1.18:saturation=1.0:gamma=0.92,"
               "huesaturation=colors=g+y:saturation=-0.55:intensity=-0.18,"
               "huesaturation=colors=c+b:hue=25:saturation=-0.2:intensity=-0.05,"
               "selectivecolor=greens=0 0 0.2 -0.1:yellows=0 0 0.15 0,"
               "colorbalance=rs=-0.04:gs=-0.06:bs=0.10:rm=0.03:gm=-0.07:bm=0.06:rh=0.03:gh=-0.02:bh=0.05")

CLIPS = [
    # name, source, start, dur, interpolate-to fps (None = native 24), grade, segment model
    ('ravenA', RAVEN, 1.30, 0.40, None, None, 'isnet-general-use'),
    ('ravenB', RAVEN, 1.58, 0.90, 48, None, 'isnet-general-use'),
    ('ravenC', RAVEN, 8.50, 1.62, 48, None, 'isnet-general-use'),
    ('pitchA', PITCH, 0.00, 0.96, 96, GRADE_PITCH, 'isnet-general-use'),
    ('pitchB', PITCH, 2.30, 2.06, 96, GRADE_PITCH, 'isnet-general-use'),
    ('pitchC', PITCH, 9.00, 0.96, 48, GRADE_PITCH, None),
]

_sessions = {}
def session(model):
    from rembg import new_session
    if model not in _sessions: _sessions[model] = new_session(model)
    return _sessions[model]

def run(cmd): subprocess.run(cmd, check=True)

def extract(src, start, dur, fps, vf_extra, outdir):
    vf = []
    if fps: vf.append(f"minterpolate=fps={fps}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1")
    if vf_extra: vf.append(vf_extra)
    cmd = [FF, '-y', '-loglevel', 'error', '-ss', f'{start}', '-t', f'{dur}', '-i', src]
    if vf: cmd += ['-vf', ','.join(vf)]
    cmd += [os.path.join(outdir, 'f_%04d.png')]
    run(cmd)
    return sorted(f for f in os.listdir(outdir) if f.startswith('f_'))

def suppress_orange(rgb, alpha):
    """Desaturate the AI lens-flare bokeh (orange) that sits on the raven, keep the lime streaks."""
    r, g, b = rgb[..., 0].astype(float), rgb[..., 1].astype(float), rgb[..., 2].astype(float)
    orange = np.clip((r - g - 12) / 50, 0, 1) * np.clip((r - b - 30) / 60, 0, 1)
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    dark = np.stack([lum * 0.35 + 8, lum * 0.33 + 8, lum * 0.42 + 12], -1)
    w = (orange * (alpha > 0))[..., None]
    return (rgb * (1 - w) + dark * w).clip(0, 255).astype(np.uint8)

def refine_raven_dark(rgb, m):
    """Raven C: the model also picks the bridge tower; keep only the dark plumage connected to the bird."""
    lum = rgb.astype(float) @ np.array([0.3, 0.59, 0.11])
    sat = rgb.max(-1).astype(float) - rgb.min(-1)
    darkish = np.clip((150 - lum) / 70, 0, 1) * np.clip((150 - sat) / 80, 0, 1)
    core = (m > 0.5) & (lum < 80)
    lab, n = nd.label(core)
    if n:
        sizes = nd.sum(core, lab, range(1, n + 1))
        keep = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 0.08 * sizes.max()])
        region = nd.binary_dilation(keep, iterations=10)
    else:
        region = np.zeros_like(core)
    return m * np.maximum(darkish, 0.0) * region

def main():
    meta_all = {}
    for name, src, start, dur, fps, grade, model in CLIPS:
        out = os.path.join(A, name)
        if os.path.isdir(out): shutil.rmtree(out)
        os.makedirs(out)
        tmp = tempfile.mkdtemp()
        raw = extract(src, start, dur, fps, None, tmp)
        graded_dir = None
        if grade:
            graded_dir = tempfile.mkdtemp()
            extract(src, start, dur, fps, grade, graded_dir)
        frames = []
        for i, f in enumerate(raw):
            im = np.array(Image.open(os.path.join(tmp, f)).convert('RGB'))
            gim = np.array(Image.open(os.path.join(graded_dir, f)).convert('RGB')) if graded_dir else im
            rec = {}
            if name.startswith('pitch'):
                Image.fromarray(gim).save(os.path.join(out, f'plate_{i:04d}.jpg'), quality=90)
            if model:
                from rembg import remove
                m = np.array(remove(Image.fromarray(im), session=session(model), only_mask=True)).astype(float) / 255
                if name == 'ravenC':
                    m = refine_raven_dark(im, m)
                # tidy edges: slight choke + feather
                m = nd.gaussian_filter(np.clip((m - 0.12) / 0.8, 0, 1), 0.7)
                rgb = gim
                if name.startswith('raven'):
                    rgb = suppress_orange(im, m)
                rgba = np.dstack([rgb, (m * 255).astype(np.uint8)])
                Image.fromarray(rgba, 'RGBA').save(os.path.join(out, f'cut_{i:04d}.webp'), quality=92, method=4)
                ys, xs = np.where(m > 0.35)
                if len(xs):
                    w = m[ys, xs]
                    rec = {'bbox': [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                           'c': [float((xs * w).sum() / w.sum()), float((ys * w).sum() / w.sum())],
                           'area': float(w.sum())}
            frames.append(rec)
            print(name, i + 1, '/', len(raw), flush=True)
        h, w = im.shape[:2]
        meta = {'fps': fps or 24, 'count': len(raw), 'w': w, 'h': h, 'start': start, 'frames': frames}
        json.dump(meta, open(os.path.join(out, 'meta.json'), 'w'))
        meta_all[name] = {k: meta[k] for k in ('fps', 'count', 'w', 'h', 'start')}
        shutil.rmtree(tmp)
        if graded_dir: shutil.rmtree(graded_dir)
    # photos
    from rembg import remove
    for n in ('photo1', 'photo2'):
        im = Image.open(os.path.join(A, f'{n}.png')).convert('RGB')
        m = np.array(remove(im, session=session('u2net_human_seg'), only_mask=True)).astype(float) / 255
        m = nd.gaussian_filter(np.clip((m - 0.12) / 0.8, 0, 1), 0.7)
        rgba = np.dstack([np.array(im), (m * 255).astype(np.uint8)])
        Image.fromarray(rgba, 'RGBA').save(os.path.join(A, f'{n}_cut.webp'), quality=94)
        im.save(os.path.join(A, f'{n}.jpg'), quality=94)
        meta_all[n] = {'w': im.width, 'h': im.height}
    json.dump(meta_all, open(os.path.join(A, 'clips.json'), 'w'), indent=1)
    print('done')

if __name__ == '__main__':
    main()
