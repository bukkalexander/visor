from pathlib import Path
import os

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .store import CatalogError, delete_playlist, load_catalog, load_playlists, save_playlist

app = FastAPI(title="Visor API", docs_url="/api/docs", openapi_url="/api/openapi.json")
ROOT = Path(__file__).resolve().parent.parent
DIST = ROOT / "dist"


class PlaylistPayload(BaseModel):
    name: str
    description: str = ""
    song_ids: list[str] = Field(default_factory=list)


def catalog_error(error: CatalogError) -> JSONResponse:
    return JSONResponse(status_code=422, content={"error": str(error), "details": error.details})


@app.get("/api/health")
def health():
    return {"ok": True}


@app.get("/api/catalog")
def catalog():
    try:
        return load_catalog()
    except CatalogError as error:
        return catalog_error(error)


@app.get("/api/playlists")
def playlists():
    try:
        return {"playlists": load_playlists()}
    except CatalogError as error:
        return catalog_error(error)


@app.post("/api/playlists", status_code=201)
def create_playlist(payload: PlaylistPayload):
    try:
        return save_playlist(payload.model_dump())
    except CatalogError as error:
        raise HTTPException(status_code=422, detail={"error": str(error), "details": error.details}) from error


@app.put("/api/playlists/{playlist_id}")
def update_playlist(playlist_id: str, payload: PlaylistPayload):
    try:
        return save_playlist(payload.model_dump(), playlist_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Playlist not found") from error
    except CatalogError as error:
        raise HTTPException(status_code=422, detail={"error": str(error), "details": error.details}) from error


@app.delete("/api/playlists/{playlist_id}", status_code=204)
def remove_playlist(playlist_id: str):
    try:
        delete_playlist(playlist_id)
    except KeyError as error:
        raise HTTPException(status_code=404, detail="Playlist not found") from error


if DIST.exists():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    candidate = (DIST / path).resolve()
    if path and candidate.is_relative_to(DIST) and candidate.is_file():
        return FileResponse(candidate)
    index = DIST / "index.html"
    if index.exists():
        return FileResponse(index)
    raise HTTPException(status_code=503, detail="Frontend has not been built")
