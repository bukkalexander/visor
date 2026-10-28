import { describe, expect, it } from "vitest";
import {
  albumCollections,
  artistCollections,
  collectionForAlbum,
} from "./catalogLogic";
import type { Song } from "./types";

const song = (id: string, metadata: Partial<Song> = {}): Song => ({
  id,
  title: id,
  lyrics: "Original lyrics",
  ...metadata,
});

describe("artist browsing", () => {
  it("includes each credited artist once and normalizes case and whitespace", () => {
    const duet = song("duet", {
      artist: ["  First  Artist ", "SECOND ARTIST", "first artist", ""],
    });
    const solo = song("solo", { artist: ["First Artist"] });
    const collections = artistCollections([duet, solo]);
    expect(collections.map((collection) => collection.id)).toEqual([
      "first artist",
      "second artist",
    ]);
    expect(collections[0]).toMatchObject({
      name: "First Artist",
      subtitle: "2 låtar",
      kind: "artist",
    });
    expect(collections[0].songs).toEqual([duet, solo]);
    expect(collections[1].songs).toEqual([duet]);
  });

  it("does not present authors or composers as recording artists", () => {
    expect(
      artistCollections([
        song("composition", { composer: ["Composer"], author: ["Author"] }),
      ]),
    ).toEqual([]);
  });
});

describe("album browsing", () => {
  it("never invents albums from universe, tags, or titles", () => {
    const source = song("unassigned", {
      universe: ["A collection"],
      tags: ["Album"],
      artist: ["Artist"],
    });
    expect(albumCollections([source, song("blank", { album: "  " })])).toEqual(
      [],
    );
    expect(collectionForAlbum(source)).toBe("");
    expect(albumCollections([])).toEqual([]);
  });

  it("groups normalized album names and multi-artist credits regardless of credit order", () => {
    const first = song("first", {
      album: "  My  Album ",
      artist: ["Alice", "Bob"],
    });
    const second = song("second", {
      album: "my album",
      artist: [" BOB ", "alice", "Alice"],
    });
    const collections = albumCollections([first, second]);
    expect(collectionForAlbum(first)).toBe(collectionForAlbum(second));
    expect(collections).toHaveLength(1);
    expect(collections[0]).toMatchObject({
      name: "My Album",
      subtitle: "Alice · Bob",
      songs: [first, second],
      kind: "album",
    });
  });

  it("keeps different artists with the same album title separate, including missing credits", () => {
    const first = song("first", { album: "Greatest Hits", artist: ["Alice"] });
    const second = song("second", { album: "Greatest Hits", artist: ["Bob"] });
    const uncredited = song("third", { album: "Greatest Hits" });
    expect(albumCollections([first, second, uncredited])).toHaveLength(3);
    expect(collectionForAlbum(first)).not.toBe(collectionForAlbum(second));
    expect(albumCollections([uncredited])[0].subtitle).toBe("Artist saknas");
  });

  it("uses collision-safe album identities for punctuation in names", () => {
    expect(
      collectionForAlbum(song("one", { album: "A|B", artist: ["C"] })),
    ).not.toBe(
      collectionForAlbum(song("two", { album: "A", artist: ["B|C"] })),
    );
  });

  it("sorts numbered tracks first and breaks ties by title without changing input order", () => {
    const source = [
      song("z", { album: "Album", title: "Zebra" }),
      song("two-z", { album: "Album", track_number: 2, title: "Zebra" }),
      song("two-a", { album: "Album", track_number: 2, title: "Apple" }),
      song("one", { album: "Album", track_number: 1, title: "First" }),
      song("a", { album: "Album", title: "Apple" }),
    ];
    const original = [...source];
    expect(albumCollections(source)[0].songs.map((item) => item.id)).toEqual([
      "one",
      "two-a",
      "two-z",
      "a",
      "z",
    ]);
    expect(source).toEqual(original);
  });
});
