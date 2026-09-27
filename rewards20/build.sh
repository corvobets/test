#!/usr/bin/env bash
# Full build: soundtrack → frames (headless Chromium, 4 parallel chunks per format) → 60 fps H.264, 19.2 s:
#   CorvoBetsRewards_20s_Vertical.mp4   1080×1920 (vertical.html)
#   CorvoBetsRewards_20s_Horizontal.mp4 1920×1080 (horizontal.html)
# Requires: node, playwright (global), ffmpeg with libx264 (FFMPEG=/path/to/ffmpeg if not on PATH).
# Licensed music (optional): MUSIC=/path/track.mp3 MUSIC_START=0 ./build.sh   (the synthesised score is then replaced; SFX stay)
# ./build.sh [vertical|horizontal]  (default: both)   ./build.sh audio → soundtrack only   MUX=1 → re-encode from the last chunks
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG="${FFMPEG:-ffmpeg}"
TMP="${TMPDIR:-/tmp}/rewards20-build"; mkdir -p "$TMP"
AUDIO_ARGS=()
if [ -n "${MUSIC:-}" ]; then
  "$FFMPEG" -y -loglevel error -i "$MUSIC" -ar 48000 -ac 2 -c:a pcm_s16le "$TMP/licensed.wav"
  AUDIO_ARGS=(--music "$TMP/licensed.wav" --music-start "${MUSIC_START:-0}" --music-gain "${MUSIC_GAIN:-0}")
fi
node audio.mjs rewards-audio.wav "${AUDIO_ARGS[@]}"
[ "${1:-}" = audio ] && exit 0
FRAMES=1152; JOBS=${JOBS:-4}; STEP=$((FRAMES / JOBS))
for FMT in ${1:-vertical horizontal}; do
  if [ -z "${MUX:-}" ]; then
    for j in $(seq 0 $((JOBS - 1))); do
      SUB=${SUB:-5} node render.mjs $FMT.html chunk "$TMP/$FMT$j.mp4" $((j * STEP)) $(((j + 1) * STEP)) > "$TMP/$FMT$j.log" 2>&1 &
    done
    wait
  fi
  : > "$TMP/$FMT.txt"; for j in $(seq 0 $((JOBS - 1))); do echo "file '$TMP/$FMT$j.mp4'" >> "$TMP/$FMT.txt"; done
  OUT=CorvoBetsRewards_20s_$([ $FMT = vertical ] && echo Vertical || echo Horizontal).mp4
  "$FFMPEG" -y -loglevel error -f concat -safe 0 -i "$TMP/$FMT.txt" -i rewards-audio.wav \
    -c:v libx264 -preset slow -crf 15 -maxrate 14M -bufsize 28M -pix_fmt yuv420p -profile:v high -level 4.2 \
    -r 60 -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
    -c:a aac -b:a 320k -shortest -movflags +faststart "$OUT"
  ls -la "$OUT"
done
