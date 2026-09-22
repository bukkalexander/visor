# Iteration 0 — mobile catalogue prototype

## Goal

Prove that Visor works within Orc and establish a useful information architecture for a Swedish children's-song library.

## Scope

- Create a warm, playful, mobile-first catalogue home page.
- Seed representative records from the Pippi and Emil universes plus one public-domain traditional song.
- Model author, lyricist, composer, universe, source work, performer, language, themes, mood, age range, occasion, media availability, rights status, and provenance independently.
- Provide free-text search, visible filter chips, and a compact Jira-like query field supporting expressions such as `universe:Pippi AND composer:"Georg Riedel"`.
- Show clear song detail views without copying copyrighted lyrics or scores.
- Link to YouTube discovery searches and demonstrate in-browser playback only with a public-domain melody.
- Let users assemble and reorder an ephemeral playlist and copy its query. Persist it locally on the device.
- Include empty states and short query examples.
- Serve correctly both at `/` and beneath Orc's `ORC_BASE_PATH`.

## Acceptance checks

- `npm test` passes.
- The app responds locally and through the Orc service.
- The primary search, query filters, detail sheet, audio demo, and playlist work at a phone-sized viewport.
- No copyrighted lyrics, scores, audio files, or unverified performer credits are included.
