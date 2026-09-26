# BankFlow — 30s motion design film

A product film for **bankflow.bet**: 1920×1080, 16:9, 60 fps, H.264 + AAC. All on-screen copy is in European Portuguese.

- `bankflow-30s-1080p60.mp4` — the finished film
- `bankflow-audio.wav` — the soundtrack (48 kHz stereo, about −15 LUFS)

## Storyboard

| Time | Scene | Copy |
|---|---|---|
| 0–4s | **Hook.** Betting slips, Telegram messages and spreadsheet rows float in depth, then fly into place and become rows of the BankFlow bet history. The camera pushes into the first row, which unfolds into the betting slip. | "A tua banca tem uma história." → "Percebe o que os números dizem." |
| 4–7s | **Print + AI.** A screenshot flash and crop marks, then a scan beam reads the slip. Selections, odds, the total odd and the stake get bracketed. The fields fly into a structured "Registada na tua banca" card, which then drops into the history as the first row. | "Um print." / "A IA faz a leitura." · "Um boletim de cada vez" |
| 7–10s | **Batch import.** Four batches alternate between Telegram (chat bubbles) and Excel (sheet rows) and flow into the same history. The counter climbs to 49 bets (+12 per batch). | "Telegram ou Excel." / "Importa em lote." · "Várias apostas de uma vez" |
| 10–16s | **Control.** The camera pulls back and the history panel settles into the full dashboard. Saldo 1 240 €, P/L +240 €, ROI +18% and Acerto 57% count up while the balance chart draws with rises and dips. Each word lights up its panel. | "Registo. Saldo. Análise." → "Tudo numa única visão." |
| 16–24s | **Intelligence.** The insights panel grows out of the chart. Pre-match vs live comes first: "A funcionar: Pré-jogo · +11%" against "A corrigir: Ao vivo · −18%". Then by competition, then by odds range. | "Descobre onde ganhas." → "Percebe onde perdes." → "Conhece os teus padrões. Afina o teu método." |
| 24–30s | **Brand + CTA.** The interface converges into the BankFlow logo. Headline, CTA and URL follow. The frame is fully static from 27.4s to 30s. | "Analisa o teu jogo. Domina os teus números." · "Começar a registar →" · "bankflow.bet" |

A discreet "Dados ilustrativos" label is visible whenever numbers are on screen (7.3–23.5s). The AI copy only describes the user's own history. It makes no promise of profit and gives no picks.

### Illustrative data (kept consistent throughout)

- Bankroll 1 000 € → 1 240 € over 24 days: P/L +240 €, +24 % growth, ROI +18 %, win rate 57 %.
- Every result in the history is `stake × (odd − 1)` for wins and `−stake` for losses.
- The insights use the figures from the website: pre-match +11 % / live −18 %, Liga Portugal +14 % / Premier League −9 %, odds up to 1.90 +21 % / above 2.50 −9 %.

## Brand

| Role | Value |
|---|---|
| Background / alternate | `#0D1120` / `#101425` |
| Cards | `#13182B`, `#202539` |
| Text | `#EEF0FA` |
| Brand gradient | `#2E9EE6` → `#14D7C4` → `#8B5CF6` |
| CTA | `#5855E8` → `#783DEC`, white text |
| Results | positive `#35D581`, negative `#FF4567` |
| Imported content only | slip orange `#F3511D`, Telegram `#2AABEE`, Excel `#107C41` |

- **Logo:** `brand/logo.png`, cropped from the supplied transparent file (`brand/logo-original.png`). The letters are animated separately; the "ow" and the arrow draw on from left to right.
- **Fonts:** Space Grotesk for headlines and numbers, Inter for the UI. Both are under the SIL Open Font License and live in `fonts/`.

## Editing and rebuilding

Everything is code. `index.html` holds the whole film as a deterministic canvas timeline:
- Each scene is a function (`S1`–`S5`).
- The copy is in the `kLine(...)` calls.
- The data is at the top (`HISTORY`, `BATCHES`, `BANK`).
- The colours are in `P`.

Open `index.html` through any local web server for a live preview; click to play it with the audio.

```bash
# full build (soundtrack + 4 parallel render chunks + final encode)
FFMPEG=/path/to/ffmpeg ./build.sh

# inspect individual frames (seconds)
SUB=1 node render.mjs stills 1920 1080 ./stills 2.6,5.1,8.4,12.4,17.4,28
```

`audio.mjs` synthesises the music and every sound effect. The music is 120 BPM, Dm9 – B♭maj7 – Fmaj7 – C, resolving to Fmaj9 on the end card. The sound effects are timed to the scan, the detections, each import batch, the metric reveals and the transitions. The mix is ducked during the insights section so it stays calm and readable.
