import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  GripVertical,
  ListMusic,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { SortableCollection } from "@lab/react-components";
import "@lab/react-components/styles.css";
import { api } from "./api";
import Artwork from "./Artwork";
import SongTable from "./SongTable";
import { videoId } from "./media";
import { resolvePlaylist } from "./playlistLogic";
import { searchSongs } from "./query";
import type { Playlist, Schema, Song } from "./types";
import "./Playlists.css";

type Props = {
  navigation?: ReactNode;
  songs: Song[];
  schema: Schema;
  playlists: Playlist[];
  reload: () => Promise<void>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  createSignal: number;
  onPlay: (songs: Song[], name: string, startId?: string) => void;
  onOpen: (song: Song) => void;
  onAdd: (songs: Song[]) => void;
  currentSongId?: string;
};

type Draft = {
  id?: string;
  name: string;
  description: string;
  type: "manual" | "dynamic";
  song_ids: string[];
  query: string;
};
type Resolved = { songs: Song[]; error: string };
type ViewOptions = { query: string; sort: "order" | "title" | "artist" };
const NEW_DRAFT = "@new";
const newDraft = (): Draft => ({
  name: "",
  description: "",
  type: "manual",
  song_ids: [],
  query: "",
});
const draftOf = (list: Playlist): Draft => ({
  id: list.id,
  name: list.name,
  description: list.description || "",
  type: list.type === "dynamic" ? "dynamic" : "manual",
  song_ids: list.song_ids || [],
  query: list.query || "",
});
const artistOf = (song: Song) =>
  song.artist?.join(", ") ||
  (song.composer?.length
    ? `Musik: ${song.composer.join(", ")}`
    : "Artist saknas");
const compare = (left: string, right: string) =>
  left.localeCompare(right, "sv", { numeric: true, sensitivity: "base" });
const errorMessage = (caught: unknown) =>
  caught instanceof Error
    ? caught.message
    : "Det gick inte att spara ändringen. Försök igen.";

export default function Playlists({
  navigation,
  songs,
  schema,
  playlists,
  reload,
  selectedId,
  onSelect,
  createSignal,
  onPlay,
  onOpen,
  onAdd,
  currentSongId,
}: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"name" | "count">("name");
  const [filter, setFilter] = useState<"all" | "manual" | "dynamic">("all");
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [songQuery, setSongQuery] = useState("");
  const [sortEditing, setSortEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [viewOptions, setViewOptions] = useState<Record<string, ViewOptions>>(
    {},
  );
  const previousCreate = useRef(createSignal);
  const previousSelection = useRef(selectedId);
  const fields = useMemo(() => Object.keys(schema.items.properties), [schema]);
  const draft = editingKey ? drafts[editingKey] : undefined;
  const selected = playlists.find((list) => list.id === selectedId);

  const resolved = useMemo(() => {
    const resolve = (list: Playlist): Resolved => {
      try {
        return { songs: resolvePlaylist(list, songs, fields), error: "" };
      } catch (caught) {
        return { songs: [], error: errorMessage(caught) };
      }
    };
    return new Map(playlists.map((list) => [list.id, resolve(list)]));
  }, [playlists, songs, fields]);

  useEffect(() => {
    if (previousSelection.current !== selectedId) {
      previousSelection.current = selectedId;
      setEditingKey(null);
      setSortEditing(false);
      setError("");
    }
  }, [selectedId]);

  const create = () => {
    setDrafts((current) =>
      current[NEW_DRAFT] ? current : { ...current, [NEW_DRAFT]: newDraft() },
    );
    setEditingKey(NEW_DRAFT);
    setSortEditing(false);
    setSongQuery("");
    setError("");
    setNotice("");
  };

  useEffect(() => {
    if (createSignal !== previousCreate.current) {
      previousCreate.current = createSignal;
      create();
    }
  }, [createSignal]);

  const edit = (list: Playlist) => {
    setDrafts((current) =>
      current[list.id] ? current : { ...current, [list.id]: draftOf(list) },
    );
    setEditingKey(list.id);
    setSortEditing(false);
    setSongQuery("");
    setError("");
    setNotice("");
  };
  const updateDraft = (patch: Partial<Draft>) => {
    if (!editingKey || busy) return;
    setDrafts((current) => ({
      ...current,
      [editingKey]: { ...current[editingKey], ...patch },
    }));
  };
  const forgetDraft = (key: string) =>
    setDrafts((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

  const draftResolution = useMemo<Resolved>(() => {
    if (!draft) return { songs: [], error: "" };
    try {
      return {
        songs: resolvePlaylist(
          { ...draft, id: draft.id || "new" },
          songs,
          fields,
        ),
        error: "",
      };
    } catch (caught) {
      return { songs: [], error: errorMessage(caught) };
    }
  }, [draft, songs, fields]);

  // Keep this array stable during a drag; unrelated player updates must not cancel it.
  const orderedRows = useMemo(() => {
    const occurrences = new Map<string, number>();
    return (draft?.song_ids || []).map((songId, index) => {
      const occurrence = occurrences.get(songId) || 0;
      occurrences.set(songId, occurrence + 1);
      return {
        id: `${songId}:${occurrence}`,
        songId,
        song: songs.find((song) => song.id === songId),
        index,
      };
    });
  }, [draft?.song_ids, songs]);
  const availableSongs = useMemo<Resolved>(() => {
    try {
      return {
        songs: searchSongs(songs, songQuery, fields).filter(
          (song) => !draft?.song_ids.includes(song.id),
        ),
        error: "",
      };
    } catch (caught) {
      return { songs: [], error: errorMessage(caught) };
    }
  }, [songs, songQuery, fields, draft?.song_ids]);

  const save = async () => {
    if (
      !draft ||
      !editingKey ||
      busy ||
      !draft.name.trim() ||
      draftResolution.error
    )
      return;
    const key = editingKey;
    setBusy(true);
    setError("");
    try {
      const payload: Playlist =
        draft.type === "dynamic"
          ? {
              id: draft.id || "",
              name: draft.name.trim(),
              description: draft.description.trim(),
              type: "dynamic",
              query: draft.query,
            }
          : {
              id: draft.id || "",
              name: draft.name.trim(),
              description: draft.description.trim(),
              type: "manual",
              song_ids: draft.song_ids,
            };
      const saved = draft.id
        ? await api.updatePlaylist(payload)
        : await api.createPlaylist(payload);
      // If refreshing fails after creation, retrying updates this record instead of creating a duplicate.
      setDrafts((current) => ({
        ...current,
        [key]: { ...current[key], id: saved.id },
      }));
      await reload();
      forgetDraft(key);
      setEditingKey(null);
      setSortEditing(false);
      onSelect(saved.id);
      setNotice("Spellistan är sparad.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const removePlaylist = async (list: Playlist) => {
    if (
      busy ||
      !window.confirm(
        `Ta bort ”${list.name}”? Låtarna finns kvar i biblioteket.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api.deletePlaylist(list.id);
      forgetDraft(list.id);
      await reload();
      onSelect(null);
      setNotice("Spellistan är borttagen.");
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const move = (index: number, direction: -1 | 1) => {
    if (!draft) return;
    const next = [...draft.song_ids];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateDraft({ song_ids: next });
  };

  const resumeDraft = (key: string) => {
    setEditingKey(key);
    setSortEditing(false);
    setError("");
  };
  const draftBanner = Object.entries(drafts).length > 0 && (
    <aside className="playlist-drafts" aria-label="Pågående redigering">
      {Object.entries(drafts).map(([key, value]) => (
        <button key={key} onClick={() => resumeDraft(key)}>
          <Pencil size={17} />
          <span>
            Fortsätt redigera <strong>{value.name || "Ny spellista"}</strong>
          </span>
          <ChevronRight size={18} />
        </button>
      ))}
    </aside>
  );

  if (draft)
    return (
      <section className="page playlists-view playlist-editor">
        <header className="page-heading playlist-editor-heading">
          <button
            className="icon-button"
            disabled={busy}
            onClick={() => {
              setEditingKey(null);
              setSortEditing(false);
            }}
            aria-label="Tillbaka, behåll utkast"
          >
            <ArrowLeft />
          </button>
          <div>
            <span className="eyebrow">
              {draft.id ? "Redigera spellista" : "Ny spellista"}
            </span>
            <h1>{draft.name || "Din nästa spellista"}</h1>
          </div>
          <button
            className="primary-action"
            disabled={busy || !draft.name.trim() || !!draftResolution.error}
            onClick={save}
          >
            <Check size={18} />
            {busy ? "Sparar…" : "Spara"}
          </button>
        </header>
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <fieldset className="playlist-editor-fields" disabled={busy}>
          <Artwork
            title={draft.name || "Ny spellista"}
            kind="playlist"
            size="large"
          />
          <div className="playlist-editor-info">
            <label className="field">
              <span>Namn</span>
              <input
                value={draft.name}
                placeholder="Ge spellistan ett namn"
                onChange={(event) => updateDraft({ name: event.target.value })}
                maxLength={200}
              />
            </label>
            <label className="field">
              <span>
                Beskrivning <small>(valfritt)</small>
              </span>
              <textarea
                value={draft.description}
                placeholder="Vad passar den här listan till?"
                onChange={(event) =>
                  updateDraft({ description: event.target.value })
                }
                rows={2}
              />
            </label>
          </div>
        </fieldset>
        <div
          className="playlist-type-filter"
          role="group"
          aria-label="Typ av spellista"
        >
          <button
            disabled={busy}
            aria-pressed={draft.type === "manual"}
            onClick={() => {
              updateDraft({ type: "manual" });
              setSortEditing(false);
            }}
          >
            <ListMusic size={17} />
            Valda låtar
          </button>
          <button
            disabled={busy}
            aria-pressed={draft.type === "dynamic"}
            onClick={() => {
              updateDraft({ type: "dynamic" });
              setSortEditing(false);
            }}
          >
            <Sparkles size={17} />
            Sparad sökning
          </button>
        </div>
        {draft.type === "dynamic" ? (
          <section className="playlist-query-editor">
            <label className="field">
              <span>Sökning</span>
              <input
                disabled={busy}
                value={draft.query}
                onChange={(event) => updateDraft({ query: event.target.value })}
                placeholder='artist = "Artistnamn"'
              />
              <small>
                Listan uppdateras när biblioteket ändras. Tom sökning tar med
                alla låtar.
              </small>
            </label>
            <details className="playlist-query-help">
              <summary>Sökhjälp</summary>
              <p>
                Sök med vanliga ord eller kombinera filter:{" "}
                <code>tags = "sommar" and year = "1970"</code>. Använd{" "}
                <code>~=</code> för ”innehåller” och <code>or</code> för
                alternativ.
              </p>
              <p>Sökbara fält: {fields.join(", ")}.</p>
            </details>
            {draftResolution.error ? (
              <p className="inline-error" role="alert">
                Kontrollera sökningen: {draftResolution.error}
              </p>
            ) : (
              <>
                <div className="playlist-section-heading">
                  <h2>Förhandsvisning</h2>
                  <span>{draftResolution.songs.length} låtar</span>
                </div>
                {draftResolution.songs.length ? (
                  <SongTable
                    songs={draftResolution.songs}
                    onPlay={(song, list) =>
                      onPlay(list, draft.name || "Förhandsvisning", song.id)
                    }
                    onOpen={onOpen}
                    onAdd={onAdd}
                    currentSongId={currentSongId}
                  />
                ) : (
                  <p className="empty-state">
                    Inga låtar matchar sökningen. Ändra sökningen för att hitta
                    fler.
                  </p>
                )}
              </>
            )}
          </section>
        ) : (
          <>
            <div className="playlist-section-heading">
              <h2>Låtar</h2>
              <span>{draft.song_ids.length} låtar</span>
            </div>
            {orderedRows.length ? (
              <div
                className="playlist-sortable"
                data-editing={sortEditing}
                aria-busy={busy}
              >
                <div className="playlist-sort-done" hidden={!sortEditing}>
                  <button
                    className="primary-action"
                    data-sort-edit-exempt
                    onClick={() => setSortEditing(false)}
                  >
                    Klar
                  </button>
                </div>
                <SortableCollection
                  items={orderedRows}
                  getId={(row) => row.id}
                  layout="list"
                  editing={sortEditing}
                  onEditingChange={(value) => !busy && setSortEditing(value)}
                  onItemsChange={(rows) =>
                    updateDraft({ song_ids: rows.map((row) => row.songId) })
                  }
                  onRemove={(row) =>
                    updateDraft({
                      song_ids: draft.song_ids.filter(
                        (_, index) => index !== row.index,
                      ),
                    })
                  }
                  removeLabel={(row) =>
                    `Ta bort ${row.song?.title || "saknad låt"}`
                  }
                  renderItem={(row) => (
                    <article className="playlist-edit-row">
                      <span className="playlist-grip" aria-hidden="true">
                        <GripVertical size={19} />
                      </span>
                      <span className="playlist-row-number">
                        {row.index + 1}
                      </span>
                      <div className="playlist-row-title">
                        <strong>
                          {row.song?.title || "Låt saknas i biblioteket"}
                        </strong>
                        <small>
                          {row.song ? artistOf(row.song) : row.songId}
                        </small>
                      </div>
                      <div className="playlist-row-controls">
                        <button
                          className="icon-button"
                          disabled={busy || row.index === 0}
                          aria-label={`Flytta upp ${row.song?.title || "låt"}`}
                          onClick={() => move(row.index, -1)}
                        >
                          <ArrowUp size={18} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={
                            busy || row.index === draft.song_ids.length - 1
                          }
                          aria-label={`Flytta ner ${row.song?.title || "låt"}`}
                          onClick={() => move(row.index, 1)}
                        >
                          <ArrowDown size={18} />
                        </button>
                        <button
                          className="icon-button"
                          disabled={busy}
                          aria-label={`Ta bort ${row.song?.title || "låt"} från spellistan`}
                          onClick={() =>
                            updateDraft({
                              song_ids: draft.song_ids.filter(
                                (_, index) => index !== row.index,
                              ),
                            })
                          }
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </article>
                  )}
                />
              </div>
            ) : (
              <div className="empty-state playlist-empty-tracks">
                <ListMusic />
                <p>Bygg din spellista med låtarna nedan.</p>
              </div>
            )}
            <section className="playlist-add-songs">
              <div className="playlist-section-heading">
                <h2>Hitta fler låtar</h2>
              </div>
              <label className="search-box">
                <Search size={20} />
                <input
                  value={songQuery}
                  onChange={(event) => setSongQuery(event.target.value)}
                  placeholder="Sök låtar eller artister"
                  aria-label="Sök låtar att lägga till"
                />
                {songQuery && (
                  <button
                    className="icon-button"
                    onClick={() => setSongQuery("")}
                    aria-label="Rensa låtsökning"
                  >
                    <X size={16} />
                  </button>
                )}
              </label>
              {availableSongs.error ? (
                <p className="inline-error" role="alert">
                  Kontrollera sökningen: {availableSongs.error}
                </p>
              ) : (
                <div className="playlist-song-results">
                  {availableSongs.songs.slice(0, 50).map((song) => (
                    <div className="playlist-add-row" key={song.id}>
                      <Artwork title={song.title} kind="song" size="small" />
                      <button
                        className="playlist-song-info"
                        disabled={busy}
                        onClick={() => onOpen(song)}
                      >
                        <strong>{song.title}</strong>
                        <small>{artistOf(song)}</small>
                      </button>
                      <button
                        className="secondary-action"
                        disabled={busy}
                        aria-label={`Lägg till ${song.title}`}
                        onClick={() =>
                          updateDraft({
                            song_ids: [...draft.song_ids, song.id],
                          })
                        }
                      >
                        <Plus size={17} />
                        <span>Lägg till</span>
                      </button>
                    </div>
                  ))}
                  {!availableSongs.songs.length && (
                    <p className="empty-state">
                      {songQuery
                        ? "Inga fler låtar matchar din sökning."
                        : "Alla låtar i biblioteket finns redan i spellistan."}
                    </p>
                  )}
                  {availableSongs.songs.length > 50 && (
                    <p className="playlist-result-note">
                      Visar 50 av {availableSongs.songs.length} låtar. Sök för
                      att hitta fler.
                    </p>
                  )}
                </div>
              )}
            </section>
          </>
        )}
        <footer className="playlist-editor-footer">
          <p>Utkastet finns kvar när du bläddrar vidare i appen.</p>
          <button
            className="secondary-action"
            disabled={busy}
            onClick={() => {
              if (window.confirm("Kasta de osparade ändringarna?")) {
                forgetDraft(editingKey!);
                setEditingKey(null);
                setSortEditing(false);
                setError("");
              }
            }}
          >
            Kasta utkast
          </button>
        </footer>
      </section>
    );

  if (selected) {
    const result = resolved.get(selected.id)!;
    const options = viewOptions[selected.id] || { query: "", sort: "order" };
    const visibleSongs = result.songs.filter((song) =>
      `${song.title} ${artistOf(song)}`
        .toLocaleLowerCase("sv")
        .includes(options.query.toLocaleLowerCase("sv")),
    );
    if (options.sort !== "order")
      visibleSongs.sort((a, b) =>
        compare(
          options.sort === "artist" ? artistOf(a) : a.title,
          options.sort === "artist" ? artistOf(b) : b.title,
        ),
      );
    const playableCount = result.songs.filter((song) =>
      videoId(song.video),
    ).length;
    const setOptions = (patch: Partial<ViewOptions>) =>
      setViewOptions((current) => ({
        ...current,
        [selected.id]: { ...options, ...patch },
      }));
    return (
      <section className="page playlists-view playlist-detail">
        <button
          className="playlist-back secondary-action"
          onClick={() => onSelect(null)}
        >
          <ArrowLeft size={18} />
          Alla spellistor
        </button>
        {notice && (
          <p className="playlist-notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        <header className="collection-hero playlist-hero">
          <Artwork title={selected.name} kind="playlist" size="large" />
          <div>
            <span className="eyebrow">
              {selected.type === "dynamic" ? "Sparad sökning" : "Spellista"}
            </span>
            <h1>{selected.name}</h1>
            {selected.description && <p>{selected.description}</p>}
            <span className="playlist-count">
              {result.songs.length} låtar
              {playableCount !== result.songs.length && result.songs.length > 0
                ? ` · ${playableCount} med video`
                : ""}
            </span>
          </div>
        </header>
        <div className="playlist-detail-actions">
          <button
            className="primary-action"
            disabled={!playableCount || !!result.error}
            onClick={() => onPlay(result.songs, selected.name)}
          >
            <Play fill="currentColor" size={20} />
            Spela
          </button>
          <button className="secondary-action" onClick={() => edit(selected)}>
            <Pencil size={17} />
            {drafts[selected.id] ? "Fortsätt redigera" : "Redigera"}
          </button>
          <button
            className="icon-button playlist-delete"
            disabled={busy}
            onClick={() => removePlaylist(selected)}
            aria-label={`Ta bort spellistan ${selected.name}`}
          >
            <Trash2 size={19} />
          </button>
        </div>
        {selected.type === "dynamic" && (
          <p className="playlist-saved-query">
            <Sparkles size={16} />
            <span>{selected.query || "Alla låtar i biblioteket"}</span>
          </p>
        )}
        {result.error ? (
          <div className="inline-error" role="alert">
            <strong>Spellistans sökning behöver ändras.</strong>
            <p>{result.error}</p>
            <button className="secondary-action" onClick={() => edit(selected)}>
              Ändra sökningen
            </button>
          </div>
        ) : result.songs.length ? (
          <>
            <div className="playlist-track-tools">
              <label className="search-box">
                <Search size={18} />
                <input
                  value={options.query}
                  onChange={(event) =>
                    setOptions({ query: event.target.value })
                  }
                  placeholder="Sök i spellistan"
                  aria-label="Sök i spellistan"
                />
                {options.query && (
                  <button
                    className="icon-button"
                    onClick={() => setOptions({ query: "" })}
                    aria-label="Rensa sökning i spellistan"
                  >
                    <X size={16} />
                  </button>
                )}
              </label>
              <label className="playlist-sort-label">
                <span>Sortera</span>
                <select
                  value={options.sort}
                  onChange={(event) =>
                    setOptions({
                      sort: event.target.value as ViewOptions["sort"],
                    })
                  }
                >
                  <option value="order">Spellistans ordning</option>
                  <option value="title">Titel</option>
                  <option value="artist">Artist</option>
                </select>
              </label>
            </div>
            {visibleSongs.length ? (
              <SongTable
                songs={visibleSongs}
                onPlay={(song, list) => onPlay(list, selected.name, song.id)}
                onOpen={onOpen}
                onAdd={onAdd}
                currentSongId={currentSongId}
                selectable
              />
            ) : (
              <p className="empty-state">
                Inga låtar matchar din sökning i spellistan.
              </p>
            )}
            {!playableCount && (
              <p className="playlist-result-note">
                Låtarna i den här spellistan saknar spelbara videolänkar. Du kan
                fortfarande öppna dem och läsa texterna.
              </p>
            )}
          </>
        ) : (
          <section className="empty-state">
            <ListMusic size={36} />
            <h2>
              {selected.type === "dynamic"
                ? "Inga låtar matchar sökningen"
                : "Låt spellistan ta form"}
            </h2>
            <p>
              {selected.type === "dynamic"
                ? "Prova en bredare sökning för att hitta fler låtar."
                : "Lägg till dina favoriter och ordna dem som du vill."}
            </p>
            <button className="secondary-action" onClick={() => edit(selected)}>
              <Plus size={18} />
              {selected.type === "dynamic"
                ? "Ändra sökning"
                : "Lägg till låtar"}
            </button>
          </section>
        )}
      </section>
    );
  }

  const visibleLists = playlists
    .filter(
      (list) =>
        (filter === "all" || (list.type || "manual") === filter) &&
        `${list.name} ${list.description || ""}`
          .toLocaleLowerCase("sv")
          .includes(query.toLocaleLowerCase("sv")),
    )
    .sort((a, b) =>
      sort === "count"
        ? (resolved.get(b.id)?.songs.length || 0) -
            (resolved.get(a.id)?.songs.length || 0) || compare(a.name, b.name)
        : compare(a.name, b.name),
    );
  return (
    <section className="page playlists-view">
      <header className="page-heading">
        <div>
          <span className="eyebrow">Ditt bibliotek</span>
          <h1>Spellistor</h1>
        </div>
        <button className="primary-action" onClick={create}>
          <Plus size={18} />
          Ny spellista
        </button>
      </header>
      {navigation}
      {notice && (
        <p className="playlist-notice" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="inline-error" role="alert">
          {error}
        </p>
      )}
      {draftBanner}
      {playlists.length > 0 && (
        <>
          <div
            className="playlist-type-filter"
            role="group"
            aria-label="Visa spellistor"
          >
            {(
              [
                ["all", "Alla"],
                ["manual", "Valda låtar"],
                ["dynamic", "Sparade sökningar"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="playlist-browse-tools">
            <label className="search-box">
              <Search size={19} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Hitta en spellista"
                aria-label="Sök spellistor"
              />
              {query && (
                <button
                  className="icon-button"
                  onClick={() => setQuery("")}
                  aria-label="Rensa spellistesökning"
                >
                  <X size={16} />
                </button>
              )}
            </label>
            <label className="playlist-sort-label">
              <span>Sortera</span>
              <select
                value={sort}
                onChange={(event) =>
                  setSort(event.target.value as "name" | "count")
                }
              >
                <option value="name">Namn</option>
                <option value="count">Antal låtar</option>
              </select>
            </label>
          </div>
        </>
      )}
      {visibleLists.length ? (
        <section
          className="collection-grid playlist-card-grid"
          aria-label="Spellistor"
        >
          {visibleLists.map((list) => {
            const result = resolved.get(list.id)!;
            return (
              <article className="playlist-card" key={list.id}>
                <button
                  className="collection-card playlist-card-open"
                  onClick={() => {
                    setError("");
                    setNotice("");
                    onSelect(list.id);
                  }}
                  aria-label={`Öppna spellistan ${list.name}`}
                >
                  <Artwork title={list.name} kind="playlist" />
                  <h2>{list.name}</h2>
                  <p>
                    {result.error
                      ? "Sökningen behöver ändras"
                      : `${result.songs.length} låtar${list.type === "dynamic" ? " · Sparad sökning" : ""}`}
                  </p>
                  {list.description && (
                    <span className="playlist-card-description">
                      {list.description}
                    </span>
                  )}
                </button>
                <button
                  className="playlist-card-play"
                  disabled={
                    !!result.error ||
                    !result.songs.some((song) => videoId(song.video))
                  }
                  onClick={() => onPlay(result.songs, list.name)}
                  aria-label={`Spela spellistan ${list.name}`}
                >
                  <Play size={21} fill="currentColor" />
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="empty-state">
          <ListMusic size={40} />
          <h2>
            {playlists.length
              ? "Inga spellistor hittades"
              : "Musik för varje tillfälle"}
          </h2>
          <p>
            {playlists.length
              ? "Prova ett annat namn eller filter."
              : "Samla låtar du vill återvända till, eller låt en sparad sökning hålla listan uppdaterad."}
          </p>
          {playlists.length ? (
            <button
              className="secondary-action"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
            >
              Visa alla spellistor
            </button>
          ) : (
            <button className="primary-action" onClick={create}>
              <Plus size={18} />
              Skapa din första spellista
            </button>
          )}
        </section>
      )}
    </section>
  );
}
