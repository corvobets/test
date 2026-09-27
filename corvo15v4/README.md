# CORVO BETS — 15s vertical, V4 (the winning bet, refined)

**Deliverable:** `CorvoBets_15s_Vertical_V4.mp4`. 1080×1920, 9:16, 60 fps, exactly 15 s, H.264 High with AAC 320 kbps. For Stories and Reels.

This is a separate project. V3 (`../corvo15v3/`) and the earlier 15s project (`../corvo15/`) are unchanged.

## What changed from V3

- **Speed**
  - The recording is re-timed into one smooth, confident scroll, about 2.3× the original pace. It no longer follows the uneven speed of the original finger drags.
  - The scroll has an eased start, a constant cruise and an eased stop on the last selection. Every output frame shows the recorded frame at that exact scroll position.
  - At cruise speed, one green "Ganho" row crosses the centre of the screen every dotted 8th (0.375 s), locked to the beat.
- **Video quality**
  - Recording frames are kept at their native 1320 px width, with a single resample onto the canvas, so the text is sharper.
  - Motion blur uses 5 sub-frames, and up to 12 on the fast moves.
  - Encoded at CRF 14.
- **Animation**
  - The hook slams harder, with a colour bloom, lime shockwave rings and a short camera shake on the heavy hits.
  - The phone lands with a spring.
  - Each "Ganho" row pulses with a lime ring as it crosses the centre.
  - The card lifts with a spring and rotation settle. Controlled camera moves then zoom onto "Ganho", the return and the odds in turn.
  - On the end card, the CTA pulses on the beat, with a shockwave on its entry and on the stinger, and the logo glints on the stinger.
- **Sound design**
  - A tick and a tiny low tap for each "Ganho" row crossing, and soft scroll air that follows the phone's speed.
  - Sub drops under every heavy hit, and a glass tap on the phone landing.
  - Swishes on each camera move and on the underline swipes, and a glide whoosh into the end card.
  - A CTA sub hit, shine swishes, and reverse air into the stinger.
- **Fix:** a canvas state leak in the V3 hook exit, where one `restore()` was lost.

## Structure (120 BPM, 1 beat = 0.5 s; bar lines on odd seconds)

| Time | What happens | Copy |
|---|---|---|
| 0.0 | **Impact.** The logo is already on screen and shines. "25 €" slams in and a bold lime arrow shoots out. | "25 € →" |
| 0.5 | The return slams in, in lime. | "2 110,75 €" |
| 1.0 | A violet slanted tag wipes in. The phone rises from below, tilted, already showing the real slip. | "APOSTA GANHA" |
| 2.0 | The hook clears. The phone flattens and grows to the hero size, 900 px screen width. | "14 SELEÇÕES." · "TUDO GREEN." (2.5) |
| 2.25–5.8 | **The actual recording, re-timed** to one smooth scroll (≈2.3×). One "Ganho" row crosses the centre on every dotted 8th, with a lime pulse and tick. The move ends with a hold on the last selection. | — |
| 6.4–6.9 | A fast, motion-blurred scroll back to the top of the slip, over a snare roll and riser, then a hard musical gap. | — |
| 7.0 | **Main impact.** The real summary card (IMG_1132) lifts out of the phone's header, with a lime rim and cast shadow. It settles large across the canvas while the phone drops back and dims. | — |
| 7.5 | A lime ring pulses around the real "Ganho" badge. | — |
| 7.6–8.5 | Each of the 14 bars catches the light in turn, with 14 tight ticks. | — |
| 9.0 / 9.5 | The return, then the odds, get a lime underline and a ring. A tom and snare fill leads into 9.0. | — |
| 10.75 | The music drops out for half a beat, and the card glides to its final position. | — |
| 11.0–15.0 | **Invitation.** Big hit, then the logo reveal, headline, supporting line and lime CTA, with the card as the supporting element. Complete by about 12.6 s, so the full composition holds for about 2.4 s. A decisive stinger at 14.0 s. | "PROGNÓSTICOS" · "NO TELEGRAM." · "ACESSO GRATUITO." · "ENTRAR NO CORVO BETS" · "18+ \| Joga com responsabilidade." |

**Safe placement.**
- Essential text, logo and CTA sit between y ≈ 260 and 1400, and between x ≈ 60 and 1000.
- That keeps them clear of the top bar, the caption and username area at the bottom, and the right-hand action rail.
- The CTA is at most 820 px wide.

## Assets and how they were used

- **Screen recording** (`source/ScreenRecording_12-24-2025_00-24-21_1.mov`, 1320×2076, 9.9 s, audio muted)
  - `tools/prep_recording.py` measures the scroll offset of every frame. It uses exhaustive vertical block matching; the mean residual is about 0.1 grey levels, because the recording is a pure scroll.
  - It exports one frame per distinct scroll position, at native resolution: 478 frames.
  - `timeline.js` (`makeScroll`) re-times the scroll and picks, for every output frame, the recorded frame at that position.
  - It also assembles `strip.jpg`, the whole slip as one strip, from the recording's own frames. It is used only where the phone screen is taller than the recording, and for the scroll back to the top. Nothing is redrawn, regenerated or stretched.
  - A plain white inset sits above the recording where a status bar would be; no invented status-bar content.
- **Summary card** (`source/IMG_1132.jpeg`)
  - Drawn at a uniform scale only: about 1.08× during the reveal and 0.9× on the end card.
  - Only the plain page margin outside the card's own rounded edge is masked.
  - Values shown are the originals:
    - 14 selections;
    - "Ganho";
    - € 25 → € 2110.75 (the return, stake included);
    - odds 84.42.
  - The on-screen headline uses the European Portuguese format of the same values, "25 € → 2 110,75 €". No profit figure is stated or calculated.
- **Logo** (`brand/`): the authentic lockup (vector reconstruction); the raven appears only inside the logo.
- **Removed:** all people, footage of people, portraits and cut-outs; all flying-raven footage and bird animation; the Telegram screenshot.

## Soundtrack (`audio.mjs`)

### Licensed music

This environment's network policy blocks the stock-music libraries (Pixabay, Incompetech, Free Music Archive, Bensound, Uppbeat, archive.org and ccMixter), so no licensed track could be downloaded or auditioned here.

The delivered mix is an original score written for this cut. A licensed track drops in without touching the picture:

```bash
MUSIC=track.mp3 MUSIC_START=31.5 FFMPEG=/path/to/ffmpeg ./build.sh
```

- `MUSIC_START` is the point in the track that should land on the ad's 0.0 s.
- Pick a 15 s section of the track that fits the ad's grid:
  - it opens on a hit;
  - its downbeats fall on 1, 3, 5 … 13 s (120 BPM, or 60 or 240);
  - its biggest accent is at 7.0 s;
  - it has a lift or drop at 11.0 s.
- All the sound design is kept, with ducking under the big hits and the same master: clicks, whooshes, low hits, the 14 ticks and the CTA click.

### Original score

The score is dark and driving, in F minor at 120 BPM, and contains no toy-like ostinato or melody.

- **Drums**
  - Punchy saturated kick in a syncopated pattern.
  - Heavy snare and clap backbeat, and taiko-style low drums.
  - Half-time weight under the reveal.
  - Snare-roll builds and tom fills.
- **Bass**
  - Driven 8th-note reese bass with a sub layer and a growl layer, so it carries on phone speakers.
  - 808 hits on the big moments.
- **Motif:** low brass-style stabs in a 3-3-2 rhythm on F – D♭ – E♭ – F, the track's memorable figure.
- **Accents:** trailer braams and impacts at 0, 7, 11 and 14 s.
- **Sound design:** restrained metallic accents on the type, precise whooshes, low impacts and tight clicks. There are no jingles, cash-register sounds or coin effects.
- **Master**
  - Kick sidechain, bus compression and a phone-speaker EQ (mids forward, sub trimmed), then a true-peak limiter.
  - About −11.4 LUFS integrated, with a limiter ceiling of −2.3 dBTP.
  - On a simulated phone speaker (350 Hz–9 kHz), the reveal and the final section are the loudest parts after the hook.
  - Every accent lands within about 5 ms of its picture event.

## Editing and rebuilding

- **`timeline.js`** holds every event time, shared by picture and sound. It also holds the scroll mapping of the recording (`makeScroll`).
- **`engine.js`** holds:
  - helpers, the stage and the logo;
  - the phone whose screen plays the recording (`buildScreen`, `drawPhone`);
  - the summary card and its highlights (`drawSummary`, `ringAround`, `underline`);
  - post-processing and the render loop.
- **`comp-vertical.js`** holds the layout, motion paths and copy.
- **Live preview:** open `vertical.html` through any local web server, then click to play with sound. Add `?t=7.4` to hold a frame.

```bash
FFMPEG=/path/to/ffmpeg ./build.sh                    # full build (~15 min on 4 cores)
./build.sh audio                                     # soundtrack only
SUB=1 node render.mjs vertical.html stills ./stills 0.6,4.0,8.0,13.0
python3 tools/prep_recording.py source/ScreenRecording_12-24-2025_00-24-21_1.mov   # rebuild assets/rec (ffmpeg, numpy, pillow)
```

Fonts: Montserrat (SIL Open Font License), in `fonts/`.
