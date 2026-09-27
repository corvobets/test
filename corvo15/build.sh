#!/usr/bin/env bash
# Full build: soundtrack → frames (headless Chromium, 4 parallel chunks per format) → H.264 MP4s @ 60 fps.
#   CorvoBets_15s_Horizontal.mp4  1920×1080 (horizontal.html)
#   CorvoBets_15s_Vertical.mp4    1080×1920 (vertical.html)
# Requires: node, playwright (global), ffmpeg with libx264 (FFMPEG=/path/to/ffmpeg if not on PATH).
# Usage: ./build.sh [horizontal|vertical]   (default: both)
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG="${FFMPEG:-ffmpeg}"
TMP="${TMPDIR:-/tmp}/corvo15-build"; mkdir -p "$TMP"
node audio.mjs corvo15-audio.wav
FRAMES=900; JOBS=${JOBS:-4}; STEP=$((FRAMES / JOBS))
for FMT in ${1:-horizontal vertical}; do
  for j in $(seq 0 $((JOBS - 1))); do
    SUB=${SUB:-3} node render.mjs $FMT.html chunk "$TMP/$FMT$j.mp4" $((j * STEP)) $(((j + 1) * STEP)) > "$TMP/$FMT$j.log" 2>&1 &
  done
  wait
  : > "$TMP/$FMT.txt"; for j in $(seq 0 $((JOBS - 1))); do echo "file '$TMP/$FMT$j.mp4'" >> "$TMP/$FMT.txt"; done
  OUT=CorvoBets_15s_$([ $FMT = horizontal ] && echo Horizontal || echo Vertical).mp4
  "$FFMPEG" -y -loglevel error -f concat -safe 0 -i "$TMP/$FMT.txt" -i corvo15-audio.wav \
    -c:v libx264 -preset slow -crf 16 -maxrate 24M -bufsize 48M -pix_fmt yuv420p -profile:v high -level 4.2 \
    -r 60 -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a 320k -shortest -movflags +faststart "$OUT"
  ls -la "$OUT"
done
