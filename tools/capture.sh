#!/usr/bin/env bash
set -euo pipefail

OUT_DIR=".studioigor/captures/hello"
QUERY="autostart=1&seed=1"
PORT=4173

while [[ $# -gt 0 ]]; do
  case "$1" in
    --out) OUT_DIR="$2"; shift 2 ;;
    --query) QUERY="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    *) shift ;;
  esac
done

mkdir -p "$OUT_DIR"

npx vite preview --port "$PORT" --host 127.0.0.1 --strictPort >/tmp/vite_capture.log 2>&1 &
SERVER_PID=$!

cleanup() {
  playwright-cli close >/dev/null 2>&1 || true
  kill "$SERVER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for _ in $(seq 1 30); do
  if curl -s "http://127.0.0.1:${PORT}/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

URL="http://127.0.0.1:${PORT}/?${QUERY}"
playwright-cli open --browser=chromium "$URL" >/dev/null
playwright-cli resize 1280 720 >/dev/null
sleep 0.6

playwright-cli screenshot --filename="${OUT_DIR}/frame_000.png" >/dev/null

# Exercise movement, jump, and bell chime
playwright-cli keydown KeyW >/dev/null
sleep 0.45
playwright-cli press Space >/dev/null
sleep 0.4
playwright-cli press KeyE >/dev/null
sleep 0.25
playwright-cli keyup KeyW >/dev/null

playwright-cli screenshot --filename="${OUT_DIR}/frame_001.png" >/dev/null

# Collect metrics JSON and console output
playwright-cli eval "JSON.stringify(window.__metrics || {})" > "${OUT_DIR}/metrics_raw.txt" 2>/dev/null || true
playwright-cli console > "${OUT_DIR}/console.log" 2>/dev/null || true

if command -v montage >/dev/null 2>&1; then
  montage "${OUT_DIR}/frame_000.png" "${OUT_DIR}/frame_001.png" -tile 2x1 -geometry 640x360+4+4 "${OUT_DIR}/sheet.png"
fi

# Fail if uncaught page errors exist in console log
if grep -qiE "(TypeError|ReferenceError|SyntaxError|Uncaught)" "${OUT_DIR}/console.log"; then
  echo "Console error detected during capture:"
  cat "${OUT_DIR}/console.log"
  exit 1
fi

echo "Capture saved to ${OUT_DIR}"
