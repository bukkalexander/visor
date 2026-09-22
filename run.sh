#!/bin/sh
set -eu
cd "$(dirname "$0")"

if [ ! -x .venv/bin/python ]; then python3 -m venv .venv; fi
.venv/bin/python -m pip install --disable-pip-version-check -q -r requirements.txt
npm install --no-audit --no-fund
npm run build
exec .venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port "${PORT:-5194}"
