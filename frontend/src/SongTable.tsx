import { useState } from "react";
import { Check, ListChecks, Play, Plus, X, AudioLines } from "lucide-react";
import Artwork from "./Artwork";
import { videoId } from "./media";
import type { Song } from "./types";

export const songCredit = (song: Song) =>
  song.artist?.join(", ") ||
  (song.composer?.length
    ? `Musik: ${song.composer.join(", ")}`
    : "Artist saknas");

export default function SongTable({
  songs,
  onPlay,
  onOpen,
  onAdd,
  currentSongId,
  onArtist,
  onAlbum,
  selectable = false,
}: {
  songs: Song[];
  onPlay: (song: Song, songs: Song[]) => void;
  onOpen: (song: Song) => void;
  onAdd: (songs: Song[]) => void;
  currentSongId?: string;
  onArtist?: (name: string) => void;
  onAlbum?: (song: Song) => void;
  selectable?: boolean;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Map<string, Song>>(new Map());
  const toggle = (song: Song) =>
    setSelected((current) => {
      const next = new Map(current);
      if (next.has(song.id)) next.delete(song.id);
      else next.set(song.id, song);
      return next;
    });
  const all = songs.length > 0 && songs.every((song) => selected.has(song.id));
  return (
    <div className="track-list">
      {selectable && (
        <div className="selection-tools">
          {selecting ? (
            <>
              <label className="check-control">
                <input
                  type="checkbox"
                  checked={all}
                  onChange={() =>
                    setSelected((current) => {
                      const next = new Map(current);
                      songs.forEach((song) =>
                        all ? next.delete(song.id) : next.set(song.id, song),
                      );
                      return next;
                    })
                  }
                />
                Alla visade
              </label>
              <span>{selected.size} valda</span>
              <button
                className="secondary-action"
                disabled={!selected.size}
                onClick={() => onAdd([...selected.values()])}
              >
                <Plus /> Lägg till i spellista
              </button>
              <button
                className="icon-button"
                aria-label="Avsluta markering"
                onClick={() => {
                  setSelecting(false);
                  setSelected(new Map());
                }}
              >
                <X />
              </button>
            </>
          ) : (
            <button className="text-action" onClick={() => setSelecting(true)}>
              <ListChecks /> Välj låtar
            </button>
          )}
        </div>
      )}
      {songs.length ? (
        <table className="song-table">
          <thead>
            <tr>
              <th scope="col" className="track-number">
                #
              </th>
              <th scope="col">Titel</th>
              <th scope="col" className="track-artist">
                Artist
              </th>
              <th scope="col" className="track-album">
                Album
              </th>
              <th scope="col" className="track-year">
                År
              </th>
              <th scope="col">
                <span className="sr-only">Åtgärder</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {songs.map((song, index) => (
              <tr
                key={`${song.id}-${index}`}
                className={`${currentSongId === song.id ? "current-track" : ""} ${selected.has(song.id) ? "selected-track" : ""}`}
              >
                <td className="track-number">
                  {selecting ? (
                    <label className="track-check">
                      <input
                        aria-label={`Välj ${song.title}`}
                        type="checkbox"
                        checked={selected.has(song.id)}
                        onChange={() => toggle(song)}
                      />
                      <Check />
                    </label>
                  ) : (
                    <button
                      className="row-play icon-button"
                      onClick={() => onPlay(song, songs)}
                      disabled={!videoId(song.video)}
                      aria-label={`Spela ${song.title}`}
                      title={
                        videoId(song.video)
                          ? `Spela ${song.title}`
                          : "Ingen spelbar video"
                      }
                    >
                      <span className="row-index">
                        {currentSongId === song.id ? <AudioLines /> : index + 1}
                      </span>
                      <Play className="row-play-icon" fill="currentColor" />
                    </button>
                  )}
                </td>
                <td>
                  <div className="track-identity">
                    <Artwork title={song.title} size="small" />
                    <button
                      className="track-title"
                      onClick={() => onOpen(song)}
                    >
                      <strong>{song.title}</strong>
                      <span className="track-credit">{songCredit(song)}</span>
                    </button>
                  </div>
                </td>
                <td className="track-artist">
                  {song.artist?.length ? (
                    song.artist.map((artist, artistIndex) => (
                      <span key={artist}>
                        {artistIndex > 0 && ", "}
                        {onArtist ? (
                          <button
                            className="text-link"
                            onClick={() => onArtist(artist)}
                          >
                            {artist}
                          </button>
                        ) : (
                          artist
                        )}
                      </span>
                    ))
                  ) : (
                    <span className="faint">—</span>
                  )}
                </td>
                <td className="track-album">
                  {song.album ? (
                    onAlbum ? (
                      <button
                        className="text-link"
                        onClick={() => onAlbum(song)}
                      >
                        {song.album}
                      </button>
                    ) : (
                      song.album
                    )
                  ) : (
                    <span className="faint">—</span>
                  )}
                </td>
                <td className="track-year">{song.year || "—"}</td>
                <td className="track-actions">
                  <button
                    className="icon-button"
                    aria-label={`Lägg till ${song.title} i spellista`}
                    onClick={() => onAdd([song])}
                  >
                    <Plus />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="empty-state">
          <MusicEmpty />
          <h3>Inga låtar att visa</h3>
          <p>Prova en annan sökning eller ändra dina filter.</p>
        </div>
      )}
    </div>
  );
}

function MusicEmpty() {
  return <ListChecks aria-hidden="true" />;
}
