#!/usr/bin/env bash
set -euo pipefail

# Move to this script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Pick python interpreter (prefer python3)
if command -v python3 >/dev/null 2>&1; then
  PY=python3
elif command -v python >/dev/null 2>&1; then
  PY=python
else
  echo "Python이 설치되어 있지 않습니다. Homebrew 등으로 python3를 설치하세요." >&2
  exit 1
fi

# Activate virtual environment if found
if [[ -f ".venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source ".venv/bin/activate"
elif [[ -f "venv/bin/activate" ]]; then
  # shellcheck disable=SC1091
  source "venv/bin/activate"
fi

# Runtime network options (override via env)
PY_HOST="${PY_HOST:-127.0.0.1}"
PY_PORT="${PY_PORT:-${PORT:-8000}}"

# If arguments provided, run them with python (pass-through)
if [[ $# -gt 0 ]]; then
  "$PY" "$@"
  exit $?
fi

# If no args, try influx_api.py with uvicorn, then main.py, else open REPL
if [[ -f "influx_api.py" ]]; then
  "$PY" -m uvicorn influx_api:app --host "${PY_HOST}" --port "${PY_PORT}" --reload
elif [[ -f "main.py" ]]; then
  "$PY" main.py
else
  echo "No script argument provided and neither influx_api.py nor main.py found."
  echo "Starting Python REPL..."
  "$PY"
fi


