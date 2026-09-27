# CORVO BETS — 30s promo film

**Deliverable:** `corvo-bets-30s-1080p60.mp4` (1920×1080, 16:9, 60 fps, H.264 High + AAC 320 kbps).
**Language:** all on-screen copy is in European Portuguese.
**Goal:** get sports fans to join the free Corvo Bets Telegram community.

## Film structure (144 BPM — one beat = 25 frames, 18 bars = 30 s)

| Time | Section | What happens | Copy |
|---|---|---|---|
| 0.00–3.33 | **Stop the scroll** | At frame 0, a huge keyed raven (lime feather streaks) flies past the lens and wipes the frame open onto the purple light stage. The question lands word by word on the music's hits. A second raven glides behind the words. At 2.5 s the question becomes a header and the official logo slams in. | "VIVES O DESPORTO?" |
| 3.33–8.33 | **Community** | Match cut: the logo's raven becomes the Telegram avatar. The camera pulls back to reveal a 3D phone showing the rebuilt channel page (from the supplied screenshot, in European Portuguese). The subscriber counter rolls to **41 162**. The camera dives into the number, and the "41" lifts out of the phone to become the headline. | "MAIS DE 41 MIL" · "NUMA SÓ COMUNIDADE." |
| 8.33–10.83 | **Why join 1** | Whip transition to a perspective wall of Telegram channel posts. They are generic placeholders with no invented tips, odds or results. | "PROGNÓSTICOS DESPORTIVOS." |
| 10.83–13.33 | **Why join 2** | A 3D football flies across and wipes to the pitch footage. The footage is graded to the brand, with a speed ramp into slow motion on the gesture toward the lens. | "PAIXÃO PELO JOGO." |
| 13.33–16.67 | **Why join 3** | A lime band wipe (the BETS-tag angle) opens on three people in the purple shirts, framed in slanted panels. The panels flash on the beat through the build, then everything collapses into the drop. | "UMA COMUNIDADE CONTIGO." |
| 16.67–21.67 | **Brand energy (drop)** | The raven flies at the camera in slow motion, then accelerates into the lens and fills the frame. Match cut to the model by the goal, then beat cuts through the other shirts. A spinning 3D football flies in and becomes the ball of the logo. | "O DESPORTO" · "JUNTA-NOS." · logo |
| 21.67–25.00 | **Conversion** | A Telegram paper plane flies in and lands as the Telegram icon. Then a massive "É GRÁTIS." slams in, with the poster's "SEM QUALQUER CUSTO ↗" marquees. At 24.58 s the music stops for one beat. | "ENTRA NO TELEGRAM." · "É GRÁTIS." |
| 25.00–30.00 | **Final CTA** | Final hit: the logo, a social-proof pill, a large lime CTA with the Telegram symbol, the supporting line and the 18+ notice. Complete by about 26.3 s and **held for more than 3.5 s**. | "Mais de 41 mil subscritores" · "ADERIR À COMUNIDADE" · "O teu lugar é aqui." · "18+ \| Joga com responsabilidade." |

No Telegram URL or QR code is shown, because no channel link was supplied.

## Assets and how they were used

- **Logo** (`brand/`)
  - The raven symbol is vectorised from the high-resolution emblem.
  - The **CORVO** wordmark is traced from the banner, which holds the largest copy of the logo.
  - The **BETS** tag is rebuilt geometrically. Its letters match Montserrat Black Italic, verified by overlay against the original.
  - The logo colours are sampled from the original: lime `#C7FD42`, white, navy `#0A0732`.
  - `brand/logo.svg` is a standalone vector version.
- **Raven video**
  - Three short excerpts only, from 1.30–1.70 s, 1.58–2.43 s and 9.13–9.97 s.
  - The raven is cut out with rembg (isnet), so no landmarks or scenery remain. The bridge tower and cables are removed from the matte, and orange lens-flare bokeh is suppressed.
  - It is motion-interpolated to 48 fps and composited with a violet/lime rim light.
- **Pitch video**
  - Three excerpts: 0–0.96 s, 2.3–4.34 s and 9.0–9.96 s.
  - Interpolated to 96/48 fps for smooth 60 fps playback and slow-motion ramps.
  - Graded toward the brand. The person is cut out so the background can be graded purple while skin and shirt stay natural.
- **Shirt photos**
  - Split into two portraits. The semi-transparent "1"/"2" labels are removed: un-blended on the hair, rebuilt from the sky.
  - The people are cut out for the drop section.
- **Twitter banner**
  - The reference for the purple light-column stage used throughout, rebuilt procedurally.
- **Poster**
  - The "SEM QUALQUER CUSTO ↗" marquee, the typography (Montserrat, which matches the poster lettering) and the glossy purple footballs, rebuilt as real 3D truncated icosahedra.
- **Telegram screenshot**
  - The factual reference for the rebuilt channel page (name, 41 162 subscribers, description, join button).
  - The UI text is localised to European Portuguese: "subscritores", "ADERIR AO CANAL".
- The fixture artwork and the "Feedbacks da comunidade" artwork are not used. No quotes, reviews, winning slips or profit figures appear anywhere.

## Soundtrack (`audio.mjs`)

The soundtrack is original and synthesised entirely in code, so it needs no licence. It runs at 144 BPM in E minor, as a sports-trailer hybrid.

- **Drums**
  - Punchy saturated kicks, so their harmonics carry on phone speakers.
  - Layered snare and claps, with a stadium "boom-boom-CLAP" groove in the community section.
- **Harmony and hook**
  - A distorted riff bass with a clean sub underneath.
  - Brass-like supersaw stabs play the rhythmic hook, and a lead motif carries it.
- **Arrangement**
  - An impact on frame 0 and stab hits on every headline word.
  - A snare-roll and riser build into a full drop at 16.67 s.
  - A half-time bar for "ENTRA NO TELEGRAM.".
  - A one-beat silence before the final hit, and a short tail.
- **Sound design, synced to picture**
  - Wing sweeps with feather flutter, tight whooshes, UI clicks and counter ticks.
  - A phone "glass" landing, football kicks, the paper-plane whoosh, shimmer on logo reveals and low impacts.
  - The music ducks slightly under the effects so both stay clear.
- **Master**
  - Bus compression and kick sidechain.
  - An 18 kHz ultrasonic clean-up and a **true-peak** limiter.
  - About −11 LUFS integrated, true peak ≤ −1.4 dBTP. The drop is the loudest section, and there is no clipping.

## Editing and rebuilding

- `index.html` holds the whole film as a deterministic canvas timeline:
  - Every time comes from `timeline.js`, which is shared with the audio.
  - Scenes are `sceneA`…`sceneE`, and the copy is inside each scene.
  - Colours are in `P`.
  - Open it through any local web server for a live preview; click to play it with sound.
- `audio.mjs` → `corvo-audio.wav`
- `render.mjs` renders frames in headless Chromium (Playwright). `build.sh` renders 4 chunks in parallel and encodes the final MP4.
- `tools/prep_assets.py` rebuilds everything in `assets/` from the original clips in `source/`. It uses ffmpeg, rembg, onnxruntime, scipy and pillow.

```bash
FFMPEG=/path/to/ffmpeg ./build.sh                         # full film (~10 min on 4 cores)
SUB=1 node render.mjs stills 1920 1080 ./stills 1.2,5.9,12.3,17.6,26.5   # inspect frames
node audio.mjs corvo-audio.wav                             # soundtrack only
```

Fonts: Montserrat and Roboto (SIL Open Font License / Apache 2.0), included in `fonts/`.
