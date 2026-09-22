# Orc integration

The production process must stay in the foreground, stop cleanly on SIGTERM, bind to `127.0.0.1`, read its port from `PORT`, and serve frontend assets/API calls below `ORC_BASE_PATH`. Persistent data must remain inside the repository or a path declared by the app.
