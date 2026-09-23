from __future__ import annotations

from copy import deepcopy
from pathlib import Path
import re
import tempfile
from typing import Any

import yaml
from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
SONGS_FILE = DATA / "songs.yaml"
SCHEMA_FILE = DATA / "songs.schema.yaml"
PLAYLISTS_FILE = DATA / "playlists.yaml"


class CatalogError(Exception):
    def __init__(self, message: str, details: list[str] | None = None):
        super().__init__(message)
        self.details = details or []


def read_yaml(path: Path) -> Any:
    try:
        return yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as error:
        mark = getattr(error, "problem_mark", None)
        location = f" at line {mark.line + 1}, column {mark.column + 1}" if mark else ""
        raise CatalogError(f"Invalid YAML{location}", [str(error).splitlines()[0]]) from error
    except OSError as error:
        raise CatalogError(f"Could not read {path.name}", [str(error)]) from error


def load_catalog() -> dict[str, Any]:
    schema = read_yaml(SCHEMA_FILE)
    catalog = read_yaml(SONGS_FILE)
    errors = sorted(Draft202012Validator(schema).iter_errors(catalog), key=lambda item: list(item.absolute_path))
    if errors:
        details = []
        for error in errors:
            path = ".".join(str(part) for part in error.absolute_path) or "root"
            details.append(f"{path}: {error.message}")
        raise CatalogError("Song database does not match its schema", details)
    return {"songs": catalog, "schema": schema}


def load_playlists() -> list[dict[str, Any]]:
    value = read_yaml(PLAYLISTS_FILE)
    if not isinstance(value, dict) or not isinstance(value.get("playlists"), list):
        raise CatalogError("playlists.yaml must contain a playlists list")
    return value["playlists"]


def write_playlists(playlists: list[dict[str, Any]]) -> None:
    PLAYLISTS_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = yaml.safe_dump({"playlists": playlists}, allow_unicode=True, sort_keys=False, width=100)
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=PLAYLISTS_FILE.parent, delete=False) as handle:
        handle.write(payload)
        temporary = Path(handle.name)
    temporary.replace(PLAYLISTS_FILE)


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "playlist"


def save_playlist(payload: dict[str, Any], playlist_id: str | None = None) -> dict[str, Any]:
    playlists = load_playlists()
    name = str(payload.get("name", "")).strip()
    song_ids = payload.get("song_ids", [])
    if not name:
        raise CatalogError("Playlist name is required")
    if not isinstance(song_ids, list) or any(not isinstance(item, str) for item in song_ids):
        raise CatalogError("song_ids must be a list of strings")
    catalog_ids = {song["id"] for song in load_catalog()["songs"]}
    unknown = [item for item in song_ids if item not in catalog_ids]
    if unknown:
        raise CatalogError("Playlist contains unknown songs", unknown)
    if playlist_id is None:
        base = slugify(name)
        used = {item["id"] for item in playlists}
        playlist_id = base
        counter = 2
        while playlist_id in used:
            playlist_id = f"{base}-{counter}"
            counter += 1
        record = {"id": playlist_id, "name": name, "description": str(payload.get("description", "")).strip(), "song_ids": song_ids}
        playlists.append(record)
    else:
        index = next((i for i, item in enumerate(playlists) if item["id"] == playlist_id), None)
        if index is None:
            raise KeyError(playlist_id)
        record = {**deepcopy(playlists[index]), "name": name, "description": str(payload.get("description", "")).strip(), "song_ids": song_ids}
        playlists[index] = record
    write_playlists(playlists)
    return record


def delete_playlist(playlist_id: str) -> None:
    playlists = load_playlists()
    filtered = [item for item in playlists if item["id"] != playlist_id]
    if len(filtered) == len(playlists):
        raise KeyError(playlist_id)
    write_playlists(filtered)
