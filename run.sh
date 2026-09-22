#!/bin/sh
set -eu
cd "$(dirname "$0")"

if [ ! -x backend/.venv/bin/python ]; then python3 -m venv backend/.venv; fi
backend/.venv/bin/python -m pip install --disable-pip-version-check -q -r backend/requirements.txt
(cd frontend && npm install --no-audit --no-fund && npm run build)
exec backend/.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port "${PORT:-5194}"
