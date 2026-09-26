# Corvo Bets Rewards — 15s motion graphics

A 15-second promo for **corvobetsrewards.com**. All on-screen text is in European Portuguese.

| File | Format |
|---|---|
| `corvo-bets-rewards-16x9.mp4` | 1920×1080, 30 fps, H.264 + AAC (YouTube, web, showreel) |
| `corvo-bets-rewards-9x16.mp4` | 1080×1920, 30 fps, H.264 + AAC (Reels, TikTok, Stories) |
| `corvo-bets-rewards-audio.wav` | Soundtrack, 48 kHz stereo |

## Storyboard (120 BPM, cuts on the beat)

| Time | Scene |
|---|---|
| 0.0–2.0 | **Ignition**: gold light line, the raven emblem is revealed, lens flare from the eye, "CORVO BETS" letters slam in, "REWARDS" tracks in, then the camera zooms through the title |
| 2.0–4.0 | **Kinetic type**: APOSTA. / SOBE. / GANHA. / REPETE., one word per beat with colour inversions and background echo type |
| 4.0–7.5 | **Prize**: a diagonal shard wipe opens on a counter that rolls to **1.000€ EM PRÉMIOS**, over the kicker "TODOS OS MESES". A coin burst, a shine sweep, then the pill "PARA O TOP 10" |
| 7.5–11.0 | **Leaderboard**: bar wipe to TOP 10. The "TU" row climbs from 10th to 1st, then the crown drops in with confetti. The copy changes to "SOBE NO RANKING. LEVA O PRÉMIO." |
| 11.0–12.5 | **CADA APOSTA CONTA.** over diagonal marquee bands, with a riser, then everything collapses to a point |
| 12.5–15.0 | **End card**: shockwave, emblem and badge ring, CTA "JUNTA-TE JÁ →", typed URL, "+18 · JOGA COM RESPONSABILIDADE" |

## How it works

- `index.html` is a deterministic canvas animation. `renderFrame(t)` draws the frame at time `t`, blending 5 sub-frames for real motion blur and adding grain, vignette and glitch passes. Opening it in a browser plays a live preview; click to start the audio.
  Query parameters: `?w=1080&h=1920` sets any resolution (the layout adapts to the aspect ratio).
- `render.mjs` renders every frame in headless Chromium (Playwright) and pipes the frames to ffmpeg.
- `audio.mjs` synthesises the soundtrack from code (kick, sub bass, hats, whooshes, impacts, riser, bells), synced to the cuts.

```bash
node audio.mjs corvo-bets-rewards-audio.wav
FFMPEG=/path/to/ffmpeg node render.mjs video 1920 1080 corvo-bets-rewards-16x9.mp4 corvo-bets-rewards-audio.wav
FFMPEG=/path/to/ffmpeg node render.mjs video 1080 1920 corvo-bets-rewards-9x16.mp4 corvo-bets-rewards-audio.wav
node render.mjs stills 1920 1080 ./stills 1.8,5.4,10.4,14.5   # inspect single frames
```

## Brand

- **Logo**: the official emblem (raven on a football). The original PNG is `brand/logo-original.png`. It is vectorised to `brand/logo.svg` so it stays sharp at any size. The same path is embedded in `index.html` (`LOGO`).
- **Palette** (`P` object in `index.html`):

| Role | HEX |
|---|---|
| Main colour: highlights, numbers, CTA | `#C8F000` lime |
| Base background | `#0E0934` deep purple |
| Cards and panels | `#17133C` |
| Hero / intro background | `#090A10` |
| Accent ("REWARDS", details) | `#9641FD` violet |
| Text | `#FFFFFF` |
| CTA text | `#0A0A0F` |
| Panel outlines | `#2F2B50` |

- **Website motifs** carried into the video: green light halos, lime particles, and a lit pedestal under the emblem.
- **Fonts**: Anton, Inter and JetBrains Mono (SIL Open Font License), in `fonts/`.
