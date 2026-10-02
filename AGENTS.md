# Agent workflow

## Product and engineering conventions

- Swedish UI copy is the product default; code and technical documentation may be English.
- Accessibility and touch ergonomics are requirements: semantic controls, visible focus, sufficient contrast, and 44px minimum targets.
- Keep song metadata deliberately compact: title variants, description, lyrics, video, artist, author, composer, universe, tags, and year. Do not reintroduce language, source, or rights fields without a new iteration requiring them.
- Keep media provenance explicit. Prefer links and user-owned uploads; do not invent attribution or embed copyrighted material.
- Keep the app compatible with `PORT` and `ORC_BASE_PATH` as documented in `.orc/README.md`.

## Repository layout

- `frontend/` owns the Vite/React/TypeScript application, Node manifest, compiler configuration, and frontend tests.
- `backend/` owns FastAPI, Python requirements, its virtual environment, and backend tests.
- `data/` is the human-editable YAML database and schema. `songs.yaml` is a top-level list, lyrics may use ChordPro `[C]word` notation, and no generated files belong here.
- Playlist records are either `manual` with ordered `song_ids`, or `dynamic` with a saved `query`; an empty dynamic query intentionally matches the full catalogue.
- Keep generated dependencies and build output inside their owning component: `frontend/node_modules`, `frontend/dist`, and `backend/.venv`.

Workflow configuration: [`.agents/workflow.json`](.agents/workflow.json). Shared procedures: [app-workflow skill](../agents/skills/app-workflow/SKILL.md).
