#!/usr/bin/env bash
# Full build: soundtrack → 4 parallel frame chunks (headless Chromium) → final H.264 MP4 @ 1920×1080, 60 fps.
# Requires: node, playwright (global), ffmpeg with libx264 (set FFMPEG=/path/to/ffmpeg if not on PATH).
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG="${FFMPEG:-ffmpeg}"
TMP="${TMPDIR:-/tmp}/bankflow-build"; mkdir -p "$TMP"
node audio.mjs bankflow-audio.wav
FRAMES=1800; JOBS=4; STEP=$((FRAMES / JOBS))
for j in $(seq 0 $((JOBS - 1))); do
  node render.mjs chunk 1920 1080 "$TMP/chunk$j.mp4" $((j * STEP)) $(((j + 1) * STEP)) > "$TMP/chunk$j.log" 2>&1 &
done
wait
: > "$TMP/list.txt"; for j in $(seq 0 $((JOBS - 1))); do echo "file '$TMP/chunk$j.mp4'" >> "$TMP/list.txt"; done
"$FFMPEG" -y -loglevel error -f concat -safe 0 -i "$TMP/list.txt" -i bankflow-audio.wav \
  -c:v libx264 -preset slow -crf 16 -maxrate 20M -bufsize 40M -pix_fmt yuv420p -profile:v high -level 4.2 \
  -r 60 -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 256k -shortest -movflags +faststart bankflow-30s-1080p60.mp4
ls -la bankflow-30s-1080p60.mp4
