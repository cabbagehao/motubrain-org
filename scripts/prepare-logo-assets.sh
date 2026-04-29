#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_PATH="${1:-$ROOT_DIR/public/logo.png}"
PUBLIC_DIR="$ROOT_DIR/public"
ICONS_DIR="$PUBLIC_DIR/icons"
MAIN_MAX_WIDTH="${MAIN_MAX_WIDTH:-768}"

if [[ ! -f "$SOURCE_PATH" ]]; then
  echo "Source image not found: $SOURCE_PATH" >&2
  exit 1
fi

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to prepare logo assets." >&2
  exit 1
fi

mkdir -p "$ICONS_DIR"

main_tmp="$(mktemp "${TMPDIR:-/tmp}/hermes-logo-main.XXXXXX.png")"
favicon_tmp="$(mktemp "${TMPDIR:-/tmp}/hermes-favicon.XXXXXX.ico")"

cleanup() {
  rm -f "$main_tmp" "$favicon_tmp"
}
trap cleanup EXIT

render_square_icon() {
  local size="$1"
  local output_path="$2"

  ffmpeg -hide_banner -loglevel error -y \
    -i "$SOURCE_PATH" \
    -vf "scale=${size}:${size}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:white" \
    -frames:v 1 \
    -update 1 \
    "$output_path"
}

ffmpeg -hide_banner -loglevel error -y \
  -i "$SOURCE_PATH" \
  -vf "scale='min(${MAIN_MAX_WIDTH},iw)':-1:flags=lanczos" \
  -frames:v 1 \
  -update 1 \
  "$main_tmp"

mv "$main_tmp" "$PUBLIC_DIR/logo.png"
chmod 644 "$PUBLIC_DIR/logo.png"

render_square_icon 16 "$ICONS_DIR/favicon-16x16.png"
render_square_icon 32 "$ICONS_DIR/favicon-32x32.png"
render_square_icon 180 "$ICONS_DIR/apple-touch-icon.png"
render_square_icon 192 "$ICONS_DIR/icon-192.png"
render_square_icon 512 "$ICONS_DIR/icon-512.png"

ffmpeg -hide_banner -loglevel error -y \
  -i "$SOURCE_PATH" \
  -vf "scale=32:32:force_original_aspect_ratio=decrease:flags=lanczos,pad=32:32:(ow-iw)/2:(oh-ih)/2:white" \
  -frames:v 1 \
  -update 1 \
  "$favicon_tmp"

mv "$favicon_tmp" "$PUBLIC_DIR/favicon.ico"
chmod 644 "$PUBLIC_DIR/favicon.ico"

echo "Prepared logo assets from $SOURCE_PATH"
echo "Main logo: $PUBLIC_DIR/logo.png"
echo "Icons: $ICONS_DIR"
