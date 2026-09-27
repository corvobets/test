#!/usr/bin/env bash
# Full build: soundtrack → frames (headless Chromium, 4 parallel chunks) → CorvoBets_15s_Vertical_V4.mp4 (1080×1920, 60 fps).
# Requires: node, playwright (global), ffmpeg with libx264 (FFMPEG=/path/to/ffmpeg if not on PATH).
#
# Licensed music (optional): MUSIC=/path/track.mp3 MUSIC_START=12.5 MUSIC_GAIN=0 ./build.sh
#   MUSIC_START = where in the track the ad's 0.0 s should fall (pick the section whose downbeats land on
#   1, 3, 5 … 13 s and whose biggest hit lands on 7.0 s). The synthesised score is then replaced by the
#   track; all sound design, ducking and the master stay the same.
# Audio only: ./build.sh audio
set -euo pipefail
cd "$(dirname "$0")"
FFMPEG="${FFMPEG:-ffmpeg}"
TMP="${TMPDIR:-/tmp}/corvo15v4-build"; mkdir -p "$TMP"
AUDIO_ARGS=()
if [ -n "${MUSIC:-}" ]; then
  "$FFMPEG" -y -loglevel error -i "$MUSIC" -ar 48000 -ac 2 -c:a pcm_s16le "$TMP/licensed.wav"
  AUDIO_ARGS=(--music "$TMP/licensed.wav" --music-start "${MUSIC_START:-0}" --music-gain "${MUSIC_GAIN:-0}")
fi
node audio.mjs corvo15v4-audio.wav "${AUDIO_ARGS[@]}"
[ "${1:-}" = audio ] && exit 0
FRAMES=900; JOBS=${JOBS:-4}; STEP=$((FRAMES / JOBS))
if [ "${1:-}" != mux ]; then
  for j in $(seq 0 $((JOBS - 1))); do
    SUB=${SUB:-5} node render.mjs vertical.html chunk "$TMP/v$j.mp4" $((j * STEP)) $(((j + 1) * STEP)) > "$TMP/v$j.log" 2>&1 &
  done
  wait
fi
: > "$TMP/v.txt"; for j in $(seq 0 $((JOBS - 1))); do echo "file '$TMP/v$j.mp4'" >> "$TMP/v.txt"; done
OUT=CorvoBets_15s_Vertical_V4.mp4
"$FFMPEG" -y -loglevel error -f concat -safe 0 -i "$TMP/v.txt" -i corvo15v4-audio.wav \
  -c:v libx264 -preset slow -crf 14 -maxrate 30M -bufsize 60M -pix_fmt yuv420p -profile:v high -level 4.2 \
  -r 60 -color_primaries bt709 -color_trc bt709 -colorspace bt709 \
  -c:a aac -b:a 320k -shortest -movflags +faststart "$OUT"
ls -la "$OUT"
