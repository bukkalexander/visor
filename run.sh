#!/bin/sh
set -eu
cd "$(dirname "$0")"
exec backend/.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port "${PORT:-5194}"
