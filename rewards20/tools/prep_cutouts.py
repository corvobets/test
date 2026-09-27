#!/usr/bin/env python3
"""Cut the real product renders out of the Corvo Bets Rewards site screenshots (source/site-*.png).

  python3 tools/prep_cutouts.py

Each region is upscaled 4× (Lanczos + light unsharp), then isolated with rembg (isnet-general-use).
Output: assets/cut_<name>.png (RGBA). Nothing is redrawn or recoloured.
The shop thumbnails (20€ deposit) are used whole, as rounded card images: assets/thumb_<name>.png.
"""
import os
from PIL import Image, ImageFilter
import numpy as np
from scipy import ndimage
from rembg import remove, new_session

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
REGIONS = {                       # source file, box (x0, y0, x1, y1) in screenshot px, alpha matting
    # only the cap is still used (inside the wheel's prize segment); the Giveaways prizes are the supplied hi-res renders
    'cap':    ('site-hero.png', (253, 448, 357, 534), False),
}
sess = new_session('isnet-general-use')
os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
for name, (src, box, matting) in REGIONS.items():
    im = Image.open(os.path.join(ROOT, 'source', src)).convert('RGB').crop(box)
    im = im.resize((im.width * 4, im.height * 4), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2.2, percent=70, threshold=2))
    cut = remove(im, session=sess, post_process_mask=not matting, alpha_matting=matting,
                 alpha_matting_foreground_threshold=220, alpha_matting_background_threshold=20)
    a = np.asarray(cut.getchannel('A')).copy()             # drop stray fragments (keep components ≥ 5 % of the largest)
    lab, n = ndimage.label(a > 24)
    if n > 1:
        sizes = ndimage.sum(np.ones_like(a), lab, range(1, n + 1)); keep = [i + 1 for i, s in enumerate(sizes) if s >= 0.05 * sizes.max()]
        a[~np.isin(lab, keep)] = 0; cut.putalpha(Image.fromarray(a))
    bb = cut.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    if bb: cut = cut.crop(bb)
    cut.save(os.path.join(ROOT, 'assets', f'cut_{name}.png'))
    print(name, cut.size)

# shop thumbnails used whole (their own podium + smoke), exactly as in the reward cards
for name, box in {'twenty': (28, 25, 142, 139)}.items():
    im = Image.open(os.path.join(ROOT, 'source', 'site-loja.png')).convert('RGB').crop(box)
    im.resize((im.width * 3, im.height * 3), Image.LANCZOS).save(os.path.join(ROOT, 'assets', f'thumb_{name}.png'))
    print('thumb', name)

# high-resolution prize renders supplied for the Giveaways scene (already transparent): trimmed to their alpha
for name in ['ps5', 'iphone', 'gta6']:
    im = Image.open(os.path.join(ROOT, 'source', 'prizes', f'{name}.webp')).convert('RGBA')
    bb = im.getchannel('A').point(lambda a: 255 if a > 12 else 0).getbbox()
    im.crop(bb).save(os.path.join(ROOT, 'assets', f'prize_{name}.png'))
    print('prize', name, im.crop(bb).size)
