# Visor

Visor is a concise, mobile-first library for Swedish and international songs. It uses a React/TypeScript/Vite client and a FastAPI service, with human-editable YAML as its database.

## Repository layout

```text
frontend/        React, TypeScript, Vite, and frontend tests
backend/         FastAPI, Python dependencies, and backend tests
data/            Song schema, song catalogue, and playlists
.orc/            Orc service contract
run.sh           Production build and service entry point
iteration*.md    Product specifications and implementation history
```

## Data

- [`data/songs.yaml`](data/songs.yaml) is the song catalogue.
- [`data/songs.schema.yaml`](data/songs.schema.yaml) is its JSON Schema, written as YAML.
- [`data/playlists.yaml`](data/playlists.yaml) stores both hand-authored and in-app playlists.

The API reads and validates the song file for every catalogue request, so editing `songs.yaml` only requires a browser reload. The file is a flat YAML list—each top-level `-` starts a song. Invalid YAML or schema violations are displayed in the app with paths and validation messages. Every song needs `id`, `title`, and `language`, plus at least one of `video` or `lyrics`.

Lyrics may use Markdown. Chords use ChordPro's compact inline form and are rendered above the following word:

```yaml
lyrics: |
  [C]Imse vimse spindel [G7]klättrar upp för [C]trå'n.
```

Selecting a rendered chord opens guitar and piano diagrams. Common open guitar shapes are built in; piano notes are derived for major, minor, seventh, and major-seventh chord names.

The query language derives its available field names from the schema. Plain text performs a case-insensitive substring search across all fields. Structured queries support `=`, `~=`, `in`, `AND`, `OR`, and parentheses; values must be double quoted:

```text
artist = "Wolfgang Amadeus Mozart"
universe ~= "classical" AND tags in ("piano", "calm")
(language = "Swedish" OR language = "Instrumental") AND title ~= "star"
```

The home catalogue defaults to a compact table. Its menu contains faceted filters and sorting, while the view control retains an optional card layout. Selection mode can select individual songs or all visible filtered results and add them to a new or existing YAML-backed playlist.

## Development

```sh
cd frontend && npm install && cd ..
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
```

Run the API after building the frontend:

```sh
(cd frontend && npm run build)
backend/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 5194
```

Or run Vite and FastAPI separately for frontend hot reload:

```sh
backend/.venv/bin/uvicorn backend.main:app --host 127.0.0.1 --port 8000
(cd frontend && npm run dev)
```

Tests and production build:

```sh
(cd frontend && npm test && npm run build)
backend/.venv/bin/python -m unittest discover -s backend/tests -v
```

## Orc

`run.sh` installs missing local dependencies, builds using `ORC_BASE_PATH`, and starts FastAPI in the foreground. The Orc app definition uses that script. Restart from this repository with:

```sh
(cd ../orc && ./orc.sh restart visor)
```

Visor links to YouTube rather than storing recordings. Only public-domain or original sample lyrics are included.
