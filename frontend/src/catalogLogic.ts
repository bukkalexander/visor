import type { Song } from "./types";

export type MusicCollection = {
  id: string;
  name: string;
  subtitle: string;
  songs: Song[];
  kind: "album" | "artist";
};

const titleOrder = new Intl.Collator("sv", {
  sensitivity: "base",
  numeric: true,
});
const clean = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, " ");
const normalized = (value: string) => clean(value).toLocaleLowerCase("sv");

function artistsFor(song: Song): Map<string, string> {
  const artists = new Map<string, string>();
  for (const credit of song.artist ?? []) {
    const name = clean(credit);
    if (name && !artists.has(normalized(name)))
      artists.set(normalized(name), name);
  }
  return artists;
}

function compareSongs(left: Song, right: Song): number {
  return (
    titleOrder.compare(left.title, right.title) ||
    titleOrder.compare(left.id, right.id)
  );
}

function trackPosition(song: Song): number {
  return Number.isInteger(song.track_number) && song.track_number! > 0
    ? song.track_number!
    : Infinity;
}

/** The same credited artists in a different order still identify the same album. */
export function collectionForAlbum(song: Song): string {
  const album = normalized(song.album ?? "");
  return album
    ? `album:${JSON.stringify([album, [...artistsFor(song).keys()].sort()])}`
    : "";
}

export function artistCollections(songs: Song[]): MusicCollection[] {
  const collections = new Map<string, MusicCollection>();
  for (const song of songs) {
    for (const [id, name] of artistsFor(song)) {
      let collection = collections.get(id);
      if (!collection) {
        collection = { id, name, subtitle: "", songs: [], kind: "artist" };
        collections.set(id, collection);
      }
      collection.songs.push(song);
    }
  }
  return [...collections.values()]
    .map((collection) => ({
      ...collection,
      songs: collection.songs.sort(compareSongs),
      subtitle: `${collection.songs.length} ${collection.songs.length === 1 ? "låt" : "låtar"}`,
    }))
    .sort((left, right) => titleOrder.compare(left.name, right.name));
}

export function albumCollections(songs: Song[]): MusicCollection[] {
  const collections = new Map<string, MusicCollection>();
  for (const song of songs) {
    const id = collectionForAlbum(song);
    if (!id) continue;
    let collection = collections.get(id);
    if (!collection) {
      const artists = [...artistsFor(song).values()].sort(titleOrder.compare);
      collection = {
        id,
        name: clean(song.album!),
        subtitle: artists.join(" · ") || "Artist saknas",
        songs: [],
        kind: "album",
      };
      collections.set(id, collection);
    }
    collection.songs.push(song);
  }
  return [...collections.values()]
    .map((collection) => ({
      ...collection,
      songs: collection.songs.sort(
        (left, right) =>
          trackPosition(left) - trackPosition(right) ||
          compareSongs(left, right),
      ),
    }))
    .sort(
      (left, right) =>
        titleOrder.compare(left.name, right.name) ||
        titleOrder.compare(left.subtitle, right.subtitle),
    );
}
