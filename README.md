# Visor

A mobile-first song library for finding Swedish children's music by author, composer, story universe, performer, mood, theme, and media availability.

Iteration 0 is a working catalogue prototype with structured sample metadata, query filtering, song details, a public-domain Web Audio demo, YouTube search links, and ephemeral playlists stored in the browser.

## Run locally

```sh
npm start
```

Open <http://127.0.0.1:5194>. No dependency install or build step is required.

## Test

```sh
npm test
```

## Orc

The repository follows the contract in `.orc/app.yaml`: it binds to `127.0.0.1`, reads `PORT` and `ORC_BASE_PATH`, stays in the foreground, and handles assets under a routed base path. From `../orc`:

```sh
./orc.sh restart visor
./orc.sh logs visor
```

The catalogue currently contains metadata and discovery links, not copyrighted lyrics, scores, or recordings. Those fields are represented in the model for later licensed or user-owned material.
