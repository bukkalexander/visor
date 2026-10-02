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

<!-- app-workflow:begin -->
## Shared app workflow

Read `.agents/workflow.json` and use the `app-workflow` skill at `/home/bukka/work/agents/skills/app-workflow/SKILL.md`.
A bare `N.md` means implement `.iterations/N.md`. Read the requested specification and relevant earlier requirements; preserve later unrequested specs. Missing files are errors, not a request to select another iteration.
An implementation request authorizes the complete test/build/backup/deploy/verify/commit/push flow unless the user limits it. Run `/home/bukka/work/agents/agent.sh deliver --iteration N.md` after implementation. Include all existing non-secret repository changes, preserve user work, use main, and never force-push.
Review, explanation, planning, and conversation do not authorize delivery. During ordinary code edits, start or reuse `/home/bukka/work/agents/agent.sh dev start`; publish production only when requested. Report the dev URL.
Production runs from deployed snapshots. Never restore production databases on pull or deployment; restoration is explicit. Only configured production data snapshots belong in `backups/production/`; uploaded files remain excluded.
New web apps default to Vite, React, TypeScript, FastAPI, and SQLite, including SQLite JSON/key-value tables when suitable. Existing app stacks remain supported. Authentication is optional for trusted private-tailnet apps.
<!-- app-workflow:end -->
