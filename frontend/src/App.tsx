import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Disc3,
  Home,
  Library,
  ListMusic,
  Music2,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
  RefreshCw,
} from "lucide-react";
import { api } from "./api";
import Artwork from "./Artwork";
import SongTable, { songCredit } from "./SongTable";
import SongDetail from "./SongDetail";
import Player, { type PlaybackRequest } from "./Player";
import Playlists from "./Playlists";
import {
  albumCollections,
  artistCollections,
  collectionForAlbum,
  type MusicCollection,
} from "./catalogLogic";
import { resolvePlaylist } from "./playlistLogic";
import { searchSongs } from "./query";
import { videoId } from "./media";
import { useDialogFocus } from "./useDialogFocus";
import type { Song, Playlist, Schema } from "./types";

type Tab = "songs" | "artists" | "albums" | "playlists";
type View = {
  page: "home" | "search" | "library";
  tab: Tab;
  collection?: { kind: "artist" | "album"; id: string };
  playlistId?: string | null;
};
type Location = { view: View; scroll: number };
const tabs: [Tab, string, typeof Music2][] = [
  ["songs", "Låtar", Music2],
  ["artists", "Artister", UserRound],
  ["albums", "Album", Disc3],
  ["playlists", "Spellistor", ListMusic],
];
const filterKeys: (keyof Song)[] = ["artist", "composer", "universe", "tags"];
const fieldLabel = (field: string) =>
  ({
    artist: "Artist",
    composer: "Kompositör",
    universe: "Universum",
    tags: "Taggar",
  })[field] || field;
const values = (song: Song, key: keyof Song): string[] => {
  const v = song[key];
  return Array.isArray(v) ? v : v == null ? [] : [String(v)];
};

function CollectionCard({
  collection,
  onOpen,
  onPlay,
}: {
  collection: MusicCollection;
  onOpen: () => void;
  onPlay: () => void;
}) {
  return (
    <article className={`collection-card ${collection.kind}-card`}>
      <button className="collection-open" onClick={onOpen}>
        <Artwork title={collection.name} kind={collection.kind} />
        <h3>{collection.name}</h3>
        <p>{collection.subtitle}</p>
      </button>
      <button
        className="card-play"
        disabled={!collection.songs.some((song) => videoId(song.video))}
        aria-label={`Spela ${collection.name}`}
        onClick={onPlay}
      >
        <Play fill="currentColor" />
      </button>
    </article>
  );
}

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [schema, setSchema] = useState<Schema>();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [playlistError, setPlaylistError] = useState("");
  const [view, setView] = useState<View>({ page: "home", tab: "songs" });
  const [past, setPast] = useState<Location[]>([]);
  const [future, setFuture] = useState<Location[]>([]);
  const scrollPositions = useRef(new Map<string, number>());
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("title");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedSong, setSelectedSong] = useState<Song>();
  const [request, setRequest] = useState<PlaybackRequest>();
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [currentSong, setCurrentSong] = useState<Song>();
  const [createSignal, setCreateSignal] = useState(0);
  const [addingSongs, setAddingSongs] = useState<Song[]>([]);
  const [addName, setAddName] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const playerScroll = useRef(0);
  const searchInput = useRef<HTMLInputElement>(null);

  const loadPlaylists = useCallback(async () => {
    try {
      setPlaylists((await api.playlists()).playlists);
      setPlaylistError("");
    } catch (caught) {
      setPlaylistError((caught as Error).message);
      throw caught;
    }
  }, []);
  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.catalog();
      setSongs(result.songs);
      setSchema(result.schema);
    } catch (caught) {
      const err = caught as Error & { details?: string[] };
      setError([err.message, ...(err.details || [])].join("\n"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void loadCatalog();
    void loadPlaylists().catch(() => undefined);
  }, [loadCatalog, loadPlaylists]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useDialogFocus(filterOpen, ".filter-dialog", () => setFilterOpen(false));
  useDialogFocus(addingSongs.length > 0, ".add-playlist-dialog", () => {
    if (!adding) setAddingSongs([]);
  });

  const navigate = (next: View) => {
    setPlayerExpanded(false);
    if (JSON.stringify(next) === JSON.stringify(view)) return;
    scrollPositions.current.set(JSON.stringify(view), window.scrollY);
    setPast((current) => [...current, { view, scroll: window.scrollY }]);
    setFuture([]);
    setView(next);
    requestAnimationFrame(() =>
      window.scrollTo(
        0,
        scrollPositions.current.get(JSON.stringify(next)) || 0,
      ),
    );
  };
  const travel = (direction: -1 | 1) => {
    const history = direction === -1 ? past : future;
    const target = history.at(-1);
    if (!target) return;
    const current = { view, scroll: window.scrollY };
    if (direction === -1) {
      setPast(past.slice(0, -1));
      setFuture([...future, current]);
    } else {
      setFuture(future.slice(0, -1));
      setPast([...past, current]);
    }
    setView(target.view);
    setPlayerExpanded(false);
    requestAnimationFrame(() => window.scrollTo(0, target.scroll));
  };
  const browse = (tab: Tab) =>
    navigate({ page: "library", tab, playlistId: null });
  const openPlaylist = (id: string) =>
    navigate({ page: "library", tab: "playlists", playlistId: id });
  const openCollection = (collection: MusicCollection) =>
    navigate({
      page: "library",
      tab: collection.kind === "album" ? "albums" : "artists",
      collection: { kind: collection.kind, id: collection.id },
    });
  const newPlaylist = () => {
    navigate({ page: "library", tab: "playlists", playlistId: null });
    setCreateSignal((value) => value + 1);
  };
  const play = (queue: Song[], name: string, startId?: string) => {
    if (!queue.some((song) => videoId(song.video))) return;
    setRequest((previous) => ({
      key: (previous?.key || 0) + 1,
      songs: queue,
      name,
      startId,
    }));
  };
  const addToList = (selected: Song[]) => {
    setAddError("");
    setListQuery("");
    setAddingSongs(selected);
  };
  const saveAdd = async (list?: Playlist) => {
    setAdding(true);
    setAddError("");
    try {
      const ids = addingSongs.map((song) => song.id);
      if (list)
        await api.updatePlaylist({
          ...list,
          song_ids: [...new Set([...(list.song_ids || []), ...ids])],
        });
      else
        await api.createPlaylist({
          name: addName.trim(),
          type: "manual",
          song_ids: ids,
        });
      setNotice(`Tillagt i ${list?.name || addName.trim()}`);
      setAddingSongs([]);
      setAddName("");
      await loadPlaylists();
    } catch (caught) {
      setAddError((caught as Error).message);
    } finally {
      setAdding(false);
    }
  };
  const fields = useMemo(
    () => Object.keys(schema?.items.properties || {}),
    [schema],
  );
  const artists = useMemo(() => artistCollections(songs), [songs]);
  const albums = useMemo(() => albumCollections(songs), [songs]);
  const collection = (
    view.collection?.kind === "artist" ? artists : albums
  ).find((item) => item.id === view.collection?.id);
  const facets = useMemo(
    () =>
      Object.fromEntries(
        filterKeys.map((key) => [
          key,
          [...new Set(songs.flatMap((song) => values(song, key)))].sort(
            (a, b) => a.localeCompare(b, "sv"),
          ),
        ]),
      ),
    [songs],
  );
  const result = useMemo(() => {
    try {
      const found = searchSongs(
        songs,
        view.page === "search" ? query : "",
        fields,
      ).filter((song) =>
        Object.entries(filters).every(
          ([key, selected]) =>
            !selected.length ||
            selected.some((value) =>
              values(song, key as keyof Song).includes(value),
            ),
        ),
      );
      return {
        songs: [...found].sort((a, b) =>
          sort === "year"
            ? (b.year || 0) - (a.year || 0)
            : String(a[sort as keyof Song] || "").localeCompare(
                String(b[sort as keyof Song] || ""),
                "sv",
              ),
        ),
        error: "",
      };
    } catch (caught) {
      return { songs: [], error: (caught as Error).message };
    }
  }, [songs, fields, query, filters, sort, view.page]);
  const visibleArtists =
    view.page === "search" ? artistCollections(result.songs) : artists;
  const visibleAlbums =
    view.page === "search" ? albumCollections(result.songs) : albums;
  const matchingPlaylists = playlists.filter((list) =>
    `${list.name} ${list.description || ""}`
      .toLocaleLowerCase("sv")
      .includes(query.trim().toLocaleLowerCase("sv")),
  );
  const activeFilters = Object.values(filters).reduce(
    (count, selected) => count + selected.length,
    0,
  );
  const resolve = (list: Playlist) => {
    try {
      return resolvePlaylist(list, songs, fields);
    } catch {
      return [];
    }
  };
  const openArtist = (name: string) => {
    const id = name
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("sv");
    const artist = artists.find((item) => item.id === id);
    if (artist) openCollection(artist);
  };
  const openAlbum = (song: Song) => {
    const album = albums.find((item) => item.id === collectionForAlbum(song));
    if (album) openCollection(album);
  };
  const tableProps = {
    onOpen: setSelectedSong,
    onAdd: addToList,
    currentSongId: currentSong?.id,
    onArtist: openArtist,
    onAlbum: openAlbum,
  };
  const activeTab = view.tab;
  const collectionGrid = (items: MusicCollection[]) => (
    <div className="collection-grid">
      {items.map((item) => (
        <CollectionCard
          key={item.id}
          collection={item}
          onOpen={() => openCollection(item)}
          onPlay={() => play(item.songs, item.name)}
        />
      ))}
    </div>
  );

  const libraryTabs = (
    <div
      className="browse-tabs"
      role="tablist"
      aria-label="Visa biblioteket"
      onKeyDown={(event) => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key))
          return;
        event.preventDefault();
        const buttons = [
          ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
            '[role="tab"]',
          ),
        ];
        const index = buttons.indexOf(
          document.activeElement as HTMLButtonElement,
        );
        const next =
          event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : (index +
                  (event.key === "ArrowRight" ? 1 : -1) +
                  buttons.length) %
                buttons.length;
        buttons[next]?.click();
        requestAnimationFrame(() => {
          const active = [
            ...document.querySelectorAll<HTMLButtonElement>(
              '[role="tab"][aria-selected="true"]',
            ),
          ].find((button) => button.getClientRects().length > 0);
          active?.focus();
        });
      }}
    >
      {tabs.map(([tab, label]) => (
        <button
          key={tab}
          role="tab"
          tabIndex={activeTab === tab ? 0 : -1}
          aria-selected={activeTab === tab}
          className={activeTab === tab ? "active" : ""}
          onClick={() => navigate({ page: view.page, tab })}
        >
          {label}
          <span>
            {tab === "songs"
              ? result.songs.length
              : tab === "artists"
                ? visibleArtists.length
                : tab === "albums"
                  ? visibleAlbums.length
                  : view.page === "search"
                    ? matchingPlaylists.length
                    : playlists.length}
          </span>
        </button>
      ))}
    </div>
  );

  if (loading)
    return (
      <main className="loading-state" role="status">
        <Music2 />
        <p>Laddar ditt visarkiv…</p>
      </main>
    );
  if (!schema || error)
    return (
      <main className="empty-state fatal">
        <h1>Visarkivet kunde inte laddas</h1>
        <pre>{error}</pre>
        <button className="primary-action" onClick={loadCatalog}>
          <RefreshCw /> Försök igen
        </button>
      </main>
    );
  return (
    <div
      className={`app-shell ${request ? "has-player" : ""} ${playerExpanded ? "player-is-expanded" : ""}`}
    >
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate({ page: "home", tab: "songs" })}
        >
          <span>
            <Music2 />
          </span>
          <strong>
            visor<span>Ditt eget soundtrack</span>
          </strong>
        </button>
        <nav aria-label="Huvudnavigation" className="desktop-navigation">
          <button
            className={view.page === "home" ? "active" : ""}
            aria-current={view.page === "home" ? "page" : undefined}
            onClick={() => navigate({ page: "home", tab: "songs" })}
          >
            <Home /> Hem
          </button>
          <button
            className={view.page === "search" ? "active" : ""}
            aria-current={view.page === "search" ? "page" : undefined}
            onClick={() => {
              navigate({ page: "search", tab: "songs" });
              searchInput.current?.focus();
            }}
          >
            <Search /> Sök
          </button>
        </nav>
        <div className="sidebar-library-head">
          <button onClick={() => browse("playlists")}>
            <Library /> Ditt bibliotek
          </button>
          <button
            className="icon-button"
            aria-label="Skapa spellista"
            onClick={newPlaylist}
          >
            <Plus />
          </button>
        </div>
        <div className="sidebar-chips">
          <button
            onClick={() => browse("playlists")}
            className={
              view.page === "library" && activeTab === "playlists"
                ? "active"
                : ""
            }
          >
            Spellistor
          </button>
          <button
            onClick={() => browse("artists")}
            className={
              view.page === "library" && activeTab === "artists" ? "active" : ""
            }
          >
            Artister
          </button>
          <button
            onClick={() => browse("albums")}
            className={
              view.page === "library" && activeTab === "albums" ? "active" : ""
            }
          >
            Album
          </button>
        </div>
        <div className="sidebar-lists">
          <button
            className={`sidebar-list ${view.page === "library" && activeTab === "songs" ? "active" : ""}`}
            onClick={() => browse("songs")}
          >
            <Artwork title="Alla låtar" size="small" />
            <span>
              <strong>Alla låtar</strong>
              <small>{songs.length} låtar i ditt arkiv</small>
            </span>
          </button>
          {playlists.map((list) => (
            <button
              key={list.id}
              className={`sidebar-list ${view.playlistId === list.id && view.page === "library" ? "active" : ""}`}
              onClick={() => openPlaylist(list.id)}
            >
              <Artwork title={list.name} kind="playlist" size="small" />
              <span>
                <strong>{list.name}</strong>
                <small>
                  {list.type === "dynamic" ? "Sparad sökning" : "Spellista"} ·{" "}
                  {resolve(list).length} låtar
                </small>
              </span>
            </button>
          ))}
          {!playlists.length && (
            <div className="sidebar-empty">
              <p>Samla dina favoriter.</p>
              <button className="secondary-action" onClick={newPlaylist}>
                <Plus /> Skapa spellista
              </button>
            </div>
          )}
        </div>
        <div className="sidebar-footer">
          <Music2 />
          <span>Musik, text & ackord</span>
        </div>
      </aside>
      <div className="main-shell" hidden={playerExpanded}>
        <header className="topbar">
          <div className="history-controls">
            <button
              className="icon-button"
              onClick={() => travel(-1)}
              disabled={!past.length}
              aria-label="Tillbaka"
            >
              <ArrowLeft />
            </button>
            <button
              className="icon-button"
              onClick={() => travel(1)}
              disabled={!future.length}
              aria-label="Framåt"
            >
              <ArrowRight />
            </button>
          </div>
          <label className="search-box global-search">
            <Search />
            <input
              ref={searchInput}
              type="search"
              aria-label="Sök i hela biblioteket"
              placeholder="Vad vill du lyssna på?"
              value={query}
              onFocus={() => {
                if (view.page !== "search")
                  navigate({ page: "search", tab: "songs" });
              }}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                className="icon-button"
                onClick={() => {
                  setQuery("");
                  searchInput.current?.focus();
                }}
                aria-label="Rensa sökning"
              >
                <X />
              </button>
            )}
          </label>
          <span className="topbar-label">VISARKIVET</span>
        </header>
        <main className="main-content" id="main-content">
          {playlistError && (
            <div className="inline-error" role="alert">
              <span>Spellistorna kunde inte laddas. {playlistError}</span>
              <button
                onClick={() => void loadPlaylists().catch(() => undefined)}
              >
                Försök igen
              </button>
            </div>
          )}
          <div hidden={view.page !== "home"} className="home-view">
            <div className="browse-chips" aria-label="Bläddra i biblioteket">
              {tabs.map(([tab, label, Icon]) => (
                <button key={tab} onClick={() => browse(tab)}>
                  <Icon />
                  {label}
                </button>
              ))}
            </div>
            <section className="home-feature">
              <div>
                <span className="eyebrow">DITT VISARKIV</span>
                <h1>Musik att återvända till.</h1>
                <p>
                  Alla dina låtar, texter och ackord.
                  <br />
                  Hitta en favorit och låt nästa ta vid.
                </p>
                <button
                  className="primary-action"
                  onClick={() => play(songs, "Alla låtar")}
                  disabled={!songs.some((song) => videoId(song.video))}
                >
                  <Play fill="currentColor" /> Spela från arkivet
                </button>
              </div>
              <div className="hero-record" aria-hidden="true">
                <div>
                  <Music2 />
                </div>
              </div>
            </section>
            {!!playlists.length && (
              <section className="home-section">
                <header className="section-heading">
                  <h2>Dina spellistor</h2>
                  <button
                    className="text-action"
                    onClick={() => browse("playlists")}
                  >
                    Visa alla <ArrowRight />
                  </button>
                </header>
                <div className="quick-playlists">
                  {playlists.slice(0, 6).map((list) => (
                    <button key={list.id} onClick={() => openPlaylist(list.id)}>
                      <Artwork title={list.name} kind="playlist" />
                      <span>{list.name}</span>
                      <ArrowRight />
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section className="home-section">
              <header className="section-heading">
                <div>
                  <h2>Från ditt arkiv</h2>
                  <p>En låt för varje stund.</p>
                </div>
                <button className="text-action" onClick={() => browse("songs")}>
                  Alla låtar <ArrowRight />
                </button>
              </header>
              <div className="song-shelf">
                {songs.slice(0, 6).map((song) => (
                  <article className="collection-card" key={song.id}>
                    <button
                      className="collection-open"
                      onClick={() => setSelectedSong(song)}
                    >
                      <Artwork title={song.title} />
                      <h3>{song.title}</h3>
                      <p>{songCredit(song)}</p>
                    </button>
                    <button
                      className="card-play"
                      disabled={!videoId(song.video)}
                      aria-label={`Spela ${song.title}`}
                      onClick={() => play(songs, "Alla låtar", song.id)}
                    >
                      <Play fill="currentColor" />
                    </button>
                  </article>
                ))}
              </div>
            </section>
            {!!artists.length && (
              <section className="home-section">
                <header className="section-heading">
                  <h2>Artister i biblioteket</h2>
                  <button
                    className="text-action"
                    onClick={() => browse("artists")}
                  >
                    Visa alla <ArrowRight />
                  </button>
                </header>
                {collectionGrid(artists.slice(0, 5))}
              </section>
            )}
          </div>
          <div
            hidden={
              view.page === "home" ||
              (activeTab === "playlists" && view.page === "library")
            }
            className="browse-view"
          >
            {collection ? (
              <>
                <button
                  className="text-action back-to-collection"
                  onClick={() =>
                    browse(collection.kind === "album" ? "albums" : "artists")
                  }
                >
                  <ArrowLeft />{" "}
                  {collection.kind === "album" ? "Alla album" : "Alla artister"}
                </button>
                <header className={`collection-hero ${collection.kind}-hero`}>
                  <Artwork
                    title={collection.name}
                    kind={collection.kind}
                    size="large"
                  />
                  <div>
                    <span className="eyebrow">
                      {collection.kind === "album" ? "Album" : "Artist"}
                    </span>
                    <h1>{collection.name}</h1>
                    <p>
                      {collection.kind === "album" && (
                        <>{collection.subtitle} · </>
                      )}
                      {collection.songs.length} låtar
                    </p>
                  </div>
                </header>
                <div className="collection-actions">
                  <button
                    className="primary-action"
                    disabled={
                      !collection.songs.some((song) => videoId(song.video))
                    }
                    onClick={() => play(collection.songs, collection.name)}
                  >
                    <Play fill="currentColor" /> Spela
                  </button>
                  <button
                    className="secondary-action"
                    onClick={() => addToList(collection.songs)}
                  >
                    <Plus /> Lägg till i spellista
                  </button>
                </div>
                <SongTable
                  songs={collection.songs}
                  onPlay={(song, queue) =>
                    play(queue, collection.name, song.id)
                  }
                  {...tableProps}
                />
                {collection.kind === "artist" &&
                  !!albums.filter((album) =>
                    album.songs.some((song) =>
                      collection.songs.some((track) => track.id === song.id),
                    ),
                  ).length && (
                    <section className="home-section">
                      <h2>Album</h2>
                      {collectionGrid(
                        albums.filter((album) =>
                          album.songs.some((song) =>
                            collection.songs.some(
                              (track) => track.id === song.id,
                            ),
                          ),
                        ),
                      )}
                    </section>
                  )}
              </>
            ) : (
              <>
                <header className="page-heading">
                  <div>
                    <span className="eyebrow">
                      {view.page === "search"
                        ? "Hitta din nästa låt"
                        : "Din musik, samlad"}
                    </span>
                    <h1>
                      {view.page === "search"
                        ? query
                          ? `Resultat för ”${query}”`
                          : "Sök & upptäck"
                        : "Ditt bibliotek"}
                    </h1>
                  </div>
                  {view.page === "library" && (
                    <button className="secondary-action" onClick={newPlaylist}>
                      <Plus /> Ny spellista
                    </button>
                  )}
                </header>
                {libraryTabs}
                {result.error && (
                  <div className="inline-error" role="alert">
                    Ogiltig sökning: {result.error}
                  </div>
                )}
                {activeTab === "songs" && (
                  <>
                    <div className="catalog-tools">
                      <span>{result.songs.length} låtar</span>
                      <button
                        className={`secondary-action ${activeFilters ? "active" : ""}`}
                        onClick={() => setFilterOpen(true)}
                      >
                        <SlidersHorizontal /> Filter{" "}
                        {activeFilters > 0 && `(${activeFilters})`}
                      </button>
                      <label className="sort-control">
                        <span className="sr-only">Sortera låtar</span>
                        <select
                          aria-label="Sortera låtar"
                          value={sort}
                          onChange={(event) => setSort(event.target.value)}
                        >
                          <option value="title">Titel</option>
                          <option value="artist">Artist</option>
                          <option value="year">Nyaste år först</option>
                        </select>
                      </label>
                    </div>
                    {activeFilters > 0 && (
                      <div className="active-filters">
                        {Object.entries(filters).flatMap(([field, entries]) =>
                          entries.map((value) => (
                            <button
                              key={`${field}-${value}`}
                              onClick={() =>
                                setFilters((current) => ({
                                  ...current,
                                  [field]: current[field].filter(
                                    (item) => item !== value,
                                  ),
                                }))
                              }
                            >
                              {fieldLabel(field)}: {value}
                              <X />
                            </button>
                          )),
                        )}
                        <button
                          className="text-action"
                          onClick={() => setFilters({})}
                        >
                          Rensa alla
                        </button>
                      </div>
                    )}
                    <SongTable
                      songs={result.songs}
                      onPlay={(song, queue) =>
                        play(
                          queue,
                          view.page === "search" ? "Sökresultat" : "Alla låtar",
                          song.id,
                        )
                      }
                      selectable
                      {...tableProps}
                    />
                  </>
                )}
                {activeTab === "playlists" &&
                  view.page === "search" &&
                  (matchingPlaylists.length ? (
                    <div className="collection-grid">
                      {matchingPlaylists.map((list) => (
                        <article className="collection-card" key={list.id}>
                          <button
                            className="collection-open"
                            onClick={() => openPlaylist(list.id)}
                          >
                            <Artwork title={list.name} kind="playlist" />
                            <h3>{list.name}</h3>
                            <p>{resolve(list).length} låtar</p>
                          </button>
                          <button
                            className="card-play"
                            disabled={
                              !resolve(list).some((song) => videoId(song.video))
                            }
                            onClick={() => play(resolve(list), list.name)}
                            aria-label={`Spela spellistan ${list.name}`}
                          >
                            <Play fill="currentColor" />
                          </button>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <ListMusic />
                      <h2>Inga matchande spellistor</h2>
                      <p>Prova ett annat namn eller skapa en egen spellista.</p>
                      <button
                        className="secondary-action"
                        onClick={newPlaylist}
                      >
                        <Plus /> Ny spellista
                      </button>
                    </div>
                  ))}
                {activeTab === "artists" &&
                  (visibleArtists.length ? (
                    collectionGrid(visibleArtists)
                  ) : (
                    <div className="empty-state">
                      <UserRound />
                      <h2>Inga artister att visa</h2>
                      <p>Artister visas när de finns angivna på låtarna.</p>
                    </div>
                  ))}
                {activeTab === "albums" &&
                  (visibleAlbums.length ? (
                    collectionGrid(visibleAlbums)
                  ) : (
                    <div className="empty-state album-empty">
                      <Disc3 />
                      <h2>
                        {query && view.page === "search"
                          ? "Inga matchande album"
                          : "Dina album börjar här"}
                      </h2>
                      <p>
                        {albums.length
                          ? "Prova att söka på ett annat album eller en artist."
                          : "Inga låtar har album angivet ännu. När album läggs till i låtinformationen samlas de här."}
                      </p>
                      <button
                        className="secondary-action"
                        onClick={() => browse("songs")}
                      >
                        Bläddra bland alla låtar
                      </button>
                    </div>
                  ))}
              </>
            )}
          </div>
          <div hidden={view.page !== "library" || activeTab !== "playlists"}>
            <Playlists
              navigation={libraryTabs}
              songs={songs}
              schema={schema}
              playlists={playlists}
              reload={loadPlaylists}
              selectedId={view.playlistId || null}
              onSelect={(id) =>
                navigate({ page: "library", tab: "playlists", playlistId: id })
              }
              createSignal={createSignal}
              onPlay={play}
              onOpen={setSelectedSong}
              onAdd={addToList}
              currentSongId={currentSong?.id}
            />
          </div>
        </main>
      </div>
      {request && (
        <Player
          request={request}
          expanded={playerExpanded}
          onExpand={() => {
            if (!playerExpanded) {
              playerScroll.current = window.scrollY;
              setPlayerExpanded(true);
              window.scrollTo(0, 0);
            }
          }}
          onClose={() => {
            setRequest(undefined);
            setCurrentSong(undefined);
            setPlayerExpanded(false);
          }}
          onCollapse={() => {
            setPlayerExpanded(false);
            requestAnimationFrame(() =>
              window.scrollTo(0, playerScroll.current),
            );
          }}
          onAdd={(song) => addToList([song])}
          onOpen={setSelectedSong}
          onTrackChange={setCurrentSong}
        />
      )}
      <nav className="mobile-navigation" aria-label="Mobilnavigation">
        <button
          aria-current={view.page === "home" ? "page" : undefined}
          onClick={() => navigate({ page: "home", tab: "songs" })}
        >
          <Home />
          <span>Hem</span>
        </button>
        <button
          aria-current={view.page === "search" ? "page" : undefined}
          onClick={() => {
            navigate({ page: "search", tab: "songs" });
            searchInput.current?.focus();
          }}
        >
          <Search />
          <span>Sök</span>
        </button>
        <button
          aria-current={view.page === "library" ? "page" : undefined}
          onClick={() => browse("playlists")}
        >
          <Library />
          <span>Bibliotek</span>
        </button>
      </nav>
      {filterOpen && (
        <div className="modal-backdrop" onClick={() => setFilterOpen(false)}>
          <section
            className="filter-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Filtrera låtar"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="dialog-heading">
              <h2>Filtrera låtar</h2>
              <button
                className="icon-button"
                onClick={() => setFilterOpen(false)}
                aria-label="Stäng filter"
              >
                <X />
              </button>
            </header>
            {filterKeys.map((field) => (
              <details key={field} open={field === "artist"}>
                <summary>
                  {fieldLabel(field)}{" "}
                  {filters[field]?.length ? `(${filters[field].length})` : ""}
                </summary>
                <div>
                  {facets[field].map((value) => (
                    <label className="check-control" key={value}>
                      <input
                        type="checkbox"
                        checked={filters[field]?.includes(value) || false}
                        onChange={() =>
                          setFilters((current) => ({
                            ...current,
                            [field]: current[field]?.includes(value)
                              ? current[field].filter((item) => item !== value)
                              : [...(current[field] || []), value],
                          }))
                        }
                      />
                      {value}
                    </label>
                  ))}
                  {!facets[field].length && (
                    <p className="muted">Inga värden ännu.</p>
                  )}
                </div>
              </details>
            ))}
            <footer>
              <button
                className="secondary-action"
                onClick={() => setFilters({})}
              >
                Rensa filter
              </button>
              <button
                className="primary-action"
                onClick={() => setFilterOpen(false)}
              >
                Visa {result.songs.length} låtar
              </button>
            </footer>
          </section>
        </div>
      )}
      {selectedSong && (
        <SongDetail
          song={selectedSong}
          onClose={() => setSelectedSong(undefined)}
          onPlay={() => play([selectedSong], selectedSong.title)}
          onAdd={() => addToList([selectedSong])}
        />
      )}
      {!!addingSongs.length && (
        <div
          className="modal-backdrop add-backdrop"
          onClick={() => {
            if (!adding) setAddingSongs([]);
          }}
        >
          <section
            className="add-playlist-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Lägg till i spellista"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="dialog-heading">
              <div>
                <h2>Lägg till i spellista</h2>
                <p>
                  {addingSongs.length === 1
                    ? addingSongs[0].title
                    : `${addingSongs.length} valda låtar`}
                </p>
              </div>
              <button
                disabled={adding}
                className="icon-button"
                onClick={() => setAddingSongs([])}
                aria-label="Stäng spellisteval"
              >
                <X />
              </button>
            </header>
            {addError && (
              <p className="inline-error" role="alert">
                {addError}
              </p>
            )}
            <label className="search-box">
              <Search />
              <input
                placeholder="Hitta en spellista"
                aria-label="Hitta en spellista"
                value={listQuery}
                onChange={(event) => setListQuery(event.target.value)}
              />
            </label>
            <div className="add-playlist-options">
              {playlists
                .filter(
                  (list) =>
                    list.type !== "dynamic" &&
                    list.name
                      .toLocaleLowerCase()
                      .includes(listQuery.toLocaleLowerCase()),
                )
                .map((list) => (
                  <button
                    disabled={adding}
                    key={list.id}
                    onClick={() => saveAdd(list)}
                  >
                    <Artwork title={list.name} kind="playlist" size="small" />
                    <span>
                      <strong>{list.name}</strong>
                      <small>{list.song_ids?.length || 0} låtar</small>
                    </span>
                    <Plus />
                  </button>
                ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (addName.trim() && !adding) void saveAdd();
              }}
            >
              <label className="field">
                <span>Ny spellista</span>
                <input
                  value={addName}
                  onChange={(event) => setAddName(event.target.value)}
                  placeholder="Ge spellistan ett namn"
                />
              </label>
              <button
                className="primary-action"
                disabled={adding || !addName.trim()}
                type="submit"
              >
                <Plus />
                {adding ? "Sparar…" : "Skapa och lägg till"}
              </button>
            </form>
          </section>
        </div>
      )}
      <div className="toast-region" role="status">
        {notice && <div className="toast">{notice}</div>}
      </div>
    </div>
  );
}
