#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

GODOT_BIN="${GODOT_BIN:-}"
if [[ -z "$GODOT_BIN" ]]; then
  if command -v godot4 >/dev/null 2>&1; then
    GODOT_BIN="$(command -v godot4)"
  elif command -v godot >/dev/null 2>&1; then
    GODOT_BIN="$(command -v godot)"
  else
    echo "Godot 4.2+ was not found."
    echo "Install it, or set GODOT_BIN to the Godot executable."
    exit 1
  fi
fi

RENDERING_ARGS=()
if [[ -z "${OMNIVERSE_RENDERING_ARGS:-}" ]]; then
  RENDERING_ARGS=(--rendering-driver opengl3)
else
  read -r -a RENDERING_ARGS <<< "$OMNIVERSE_RENDERING_ARGS"
fi

exec "$GODOT_BIN" "${RENDERING_ARGS[@]}" --path "$PWD" -- "$@"
