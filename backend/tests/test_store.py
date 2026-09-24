import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import yaml

from backend import store


class StoreTests(unittest.TestCase):
    def test_catalog_matches_schema(self):
        catalog = store.load_catalog()
        self.assertGreaterEqual(len(catalog["songs"]), 4)

    def test_schema_requires_video_or_lyrics(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "songs.yaml"
            path.write_text(yaml.safe_dump([{"id": "empty", "title": "Empty", "language": "English"}]))
            with patch.object(store, "SONGS_FILE", path), self.assertRaises(store.CatalogError) as result:
                store.load_catalog()
            self.assertIn("schema", str(result.exception))

    def test_playlist_crud_uses_yaml(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "playlists.yaml"
            path.write_text("playlists: []\n")
            with patch.object(store, "PLAYLISTS_FILE", path):
                created = store.save_playlist({"name": "Test list", "song_ids": ["imse-vimse-spindel"]})
                self.assertEqual(store.load_playlists()[0]["id"], "test-list")
                store.delete_playlist(created["id"])
                self.assertEqual(store.load_playlists(), [])

    def test_dynamic_playlist_stores_empty_query_without_song_ids(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "playlists.yaml"
            path.write_text("playlists: []\n")
            with patch.object(store, "PLAYLISTS_FILE", path):
                created = store.save_playlist({"name": "All songs", "type": "dynamic", "query": "", "song_ids": []})
                self.assertEqual(created["type"], "dynamic")
                self.assertEqual(created["query"], "")
                self.assertNotIn("song_ids", created)


if __name__ == "__main__":
    unittest.main()
