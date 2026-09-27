# CORVO BETS — 15s ad (horizontal + vertical)

**Deliverables**
- `CorvoBets_15s_Horizontal.mp4`: 1920×1080, 16:9, 60 fps, H.264 High + AAC 320 kbps.
- `CorvoBets_15s_Vertical.mp4`: 1080×1920, 9:16, 60 fps, for Stories and Reels.

Both share one narrative and one soundtrack (`timeline.js`). Each has its own composition: `comp-horizontal.js` and `comp-vertical.js`. All copy is in European Portuguese.

## Structure (120 BPM, one beat = 0.5 s = 30 frames)

| Time | Beat | What happens | Copy |
|---|---|---|---|
| 0.0 | 0 | **Impact.** First headline line slams in on a braam and sub hit. | "PROGNÓSTICOS" |
| 0.5 | 1 | Second line on a metallic hit. | "DESPORTIVOS." |
| 1.0 | 2 | The logo reveals (symbol, wordmark wipe, BETS tag, shine) while the headline settles. | — |
| 1.25–2.0 | 2.5–4 | The Telegram phone rises in with a 3D settle. It lands at 2.0 s on a low impact and click. | — |
| 3.0–9.0 | 6–18 | **Telegram hero.** The phone flattens and scrolls. The three real confirmations are lifted forward one at a time, each readable for about 1.5 s. Each lift has a lime rim, a cast shadow, a check-mark pulse and a lift whoosh. | "NO TELEGRAM." · "GRÁTIS." |
| 8.75–9.0 | 17.5–18 | Snare-roll build. A slanted lime band wipe (the BETS-tag angle) clears to the shirt shot. | — |
| 9.0–10.4 | 18–20.8 | **One shirt shot**, about 1.4 s long, from the original video. It is graded into the purple, with the person cut out over the graded plate. | "MAIS DE" · "41 MIL" · "NO CORVO." |
| 10.75–11.0 | 21.5–22 | The music stops for half a beat. | — |
| 11.0–15.0 | 22–30 | **Final.** Big hit, then the logo, headline, phone and a large lime CTA. Complete by about 12.4 s and held for about 2.6 s. A final stinger at 14.0 s rings out to the end. | "OS PRÓXIMOS PROGNÓSTICOS ESTÃO NO TELEGRAM." · "ENTRAR NO CORVO BETS" · "18+ \| Joga com responsabilidade." |

### Format adaptation

- **Horizontal**
  - Typography sits in the left column and the phone on the right.
  - Lifted cards float out of the phone into the centre at 1.36× the screenshot's pixel size.
  - The shirt shot sits in a slanted panel on the right, with the numbers on the purple beside it.
- **Vertical**
  - Headlines are stacked and centred, with deliberate line breaks.
  - The phone is much larger (0.84 scale while it is the hero) and scrolls under the headline.
  - Cards lift to almost the full width at 1.25×.
  - The shirt shot is reframed around the person with a uniform scale only, so nothing is distorted.
  - The final CTA sits at y ≈ 1262–1412.
  - All essential text and the CTA stay between y ≈ 280 and 1500, clear of the platform UI at the top and bottom.

## Assets and how they were used

- **Telegram screenshot** (`source/IMG_7046.png`)
  - It is the phone screen, used at its native pixel size.
  - Only the message area is used (source rows 328–1872), so the following are cropped out:
    - the iPhone status bar;
    - the old subscriber count ("37 743 inscritos");
    - the pinned giveaway;
    - the bottom controls.
  - The channel title and avatar in the mock header are taken from the screenshot itself. The header background and back chevron are redrawn.
  - Lifted cards are exact crops of the three real bubbles, with their original text, reactions, views and times:
    - "Pavlidis a marcar ✅"
    - "Kane a marcar ✅"
    - "Salah a marcar ✅"
  - Nothing is altered or added.
  - Crop coordinates are in `SHOT` in `engine.js`.
- **"Mais de 41 mil"** is based on the earlier channel screenshot (`source/telegram-screenshot.png`, 41 162 subscribers).
- **Shirt video** (`source/pitch-shirt.mp4`)
  - One excerpt only, 2.95–4.45 s in the source, prepared by `tools/prep_shirt.py`.
  - It is motion-interpolated to 60 fps and graded, and the person is cut out with rembg.
  - About 1.1 s of source is played over 1.4 s.
- **Logo** (`brand/`): the vector reconstruction from the earlier projects, with the raven symbol inside the logo only.
- **Removed:** there are no static portrait photos, no flying-raven footage, cut-outs or bird animations, no fixture artwork and no testimonials.

## Soundtrack (`audio.mjs`)

The soundtrack is original and synthesised entirely in code, so it needs no licence. It is dark and driving, in F minor (Phrygian colour) at 120 BPM, with no melody.

- **Drums**
  - Punchy saturated kicks in a syncopated pattern.
  - A dark snare and clap backbeat, and 16th-note hats.
  - Tom fills and a snare-roll build.
- **Bass**
  - A saturated 808 with glides.
  - A distorted "growl" layer an octave up, so the bass reads on phone speakers.
- **Identity**
  - A tight low 16th-note ostinato with 3-3-2 accents.
  - Distorted low braams on the big moments (0 s, 9 s, 11 s, 14 s).
  - A low drone for weight.
- **Sound design**
  - Metallic accents on typography, low impacts, tight clicks and precise whooshes.
  - The phone landing, card lifts, a tick-roll scroll, the wipe whoosh, a suck into the final and the CTA click.
  - There are no chimes or shimmer.
- **Master**
  - Kick sidechain, bus and parallel drum compression, and a mid-forward EQ for phone speakers.
  - An 18 kHz clean-up and a true-peak limiter.
  - About −11.4 LUFS integrated, with a limiter ceiling of −2.3 dBTP, so the AAC files stay at or below −1 dBTP.
  - The final section is the loudest, on full-range playback and on a simulated phone speaker.

## Editing and rebuilding

- `engine.js` holds the shared parts:
  - helpers, the stage and the logo;
  - the phone mockup built from the screenshot (`buildScreen`, `drawPhone`);
  - lifted cards (`drawLiftedCard`, `checkHighlight`);
  - footage, post-processing and the render loop.
- `comp-horizontal.js` and `comp-vertical.js` hold each format's layout, motion paths and scene switcher.
- `timeline.js` holds every event time, and is shared by picture and sound.
- Open `horizontal.html` or `vertical.html` through any local web server for a live preview. Click to play with sound, or add `?t=4.6` to hold a frame.

```bash
FFMPEG=/path/to/ffmpeg ./build.sh                  # both formats (~6 min each on 4 cores)
FFMPEG=/path/to/ffmpeg ./build.sh vertical         # one format
SUB=1 node render.mjs vertical.html stills ./stills 1.2,4.6,9.6,12.8   # inspect frames
node audio.mjs corvo15-audio.wav                   # soundtrack only
python3 tools/prep_shirt.py source/pitch-shirt.mp4 # rebuild the shirt shot (ffmpeg, rembg, scipy, pillow)
```

Fonts: Montserrat (SIL Open Font License), included in `fonts/`.
