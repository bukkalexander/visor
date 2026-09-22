# Agent workflow

## Iterations are the specification

The repository owner adds `iteration*.md` files. For each implementation request, read this file, then read every iteration document and treat the highest-numbered not-yet-implemented iteration as the primary specification. Preserve completed requirements from earlier iterations unless the new document explicitly replaces them. Record meaningful decisions in the relevant iteration document or README.

## Required completion loop

For every implementation step:

1. Inspect the repository and current Git status. Never overwrite unrelated owner changes.
2. Implement the current iteration completely, using mobile layouts as the default and progressively enhancing larger screens.
3. Run all available tests and a focused smoke test.
4. Rebuild if the stack has a build step.
5. Restart the service with `(cd ../orc && ./orc.sh restart visor)` and verify it through the Orc route or local service endpoint. Orc's launcher must run from its own repository. If the Orc registration or unit is missing, update `../orc/apps.yaml`, run the least-disruptive setup needed, then retry.
6. Commit the Visor repository with a concise message and push the completed commit to `origin main`.

Do not commit secrets, generated dependencies, copyrighted lyrics/scores/recordings without explicit rights, or changes in sibling repositories as part of the Visor commit. If push, service control, or verification fails, report the exact failure and leave the local commit intact.

## Product and engineering conventions

- Swedish UI copy is the product default; code and technical documentation may be English.
- Accessibility and touch ergonomics are requirements: semantic controls, visible focus, sufficient contrast, and 44px minimum targets.
- Treat authorship, composition, lyric writing, story universe, source work, performer, arrangement, language, themes, mood, age range, occasion, and available media as separate queryable metadata.
- Keep media provenance explicit. Prefer links and user-owned uploads; do not invent attribution or embed copyrighted material.
- Keep the app compatible with `PORT` and `ORC_BASE_PATH` as documented in `.orc/README.md`.

## Repository layout

- `frontend/` owns the Vite/React/TypeScript application, Node manifest, compiler configuration, and frontend tests.
- `backend/` owns FastAPI, Python requirements, its virtual environment, and backend tests.
- `data/` is the human-editable YAML database and schema. Do not place generated files there.
- Keep generated dependencies and build output inside their owning component: `frontend/node_modules`, `frontend/dist`, and `backend/.venv`.
