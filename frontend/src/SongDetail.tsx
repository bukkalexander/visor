import ReactMarkdown from "react-markdown";
import { ExternalLink, Play, Plus, X } from "lucide-react";
import { ChordLyrics } from "./chords";
import Artwork from "./Artwork";
import { songCredit } from "./SongTable";
import { videoId } from "./media";
import { useDialogFocus } from "./useDialogFocus";
import type { Song } from "./types";

export default function SongDetail({
  song,
  onClose,
  onPlay,
  onAdd,
}: {
  song: Song;
  onClose: () => void;
  onPlay: () => void;
  onAdd: () => void;
}) {
  useDialogFocus(true, ".song-detail-dialog", onClose);
  const metadata = [
    ["Artist", song.artist?.join(", ")],
    ["Album", song.album],
    ["Textförfattare", song.author?.join(", ")],
    ["Kompositör", song.composer?.join(", ")],
    ["Universum", song.universe?.join(", ")],
    ["År", song.year],
    ["Andra titlar", song.alternate_titles?.join(", ")],
  ];
  return (
    <div className="modal-backdrop song-detail-backdrop" onClick={onClose}>
      <section
        className="song-detail-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`${song.title} – låttext och information`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dialog-heading">
          <span>Låttext & information</span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Stäng låttext"
          >
            <X />
          </button>
        </header>
        <div className="song-detail-title">
          <Artwork title={song.title} />
          <div>
            <span className="eyebrow">Låt</span>
            <h1>{song.title}</h1>
            <p>{songCredit(song)}</p>
          </div>
        </div>
        <div className="detail-actions">
          <button
            className="primary-action"
            disabled={!videoId(song.video)}
            onClick={onPlay}
          >
            <Play fill="currentColor" /> Spela
          </button>
          <button className="secondary-action" onClick={onAdd}>
            <Plus /> Spellista
          </button>
          {videoId(song.video) && (
            <a
              className="text-action"
              href={song.video}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink /> YouTube
            </a>
          )}
        </div>
        {song.description && (
          <div className="markdown">
            <ReactMarkdown>{song.description}</ReactMarkdown>
          </div>
        )}
        <section className="lyrics">
          <h2>Låttext</h2>
          {song.lyrics ? (
            /\[[A-G][^\]]*]/.test(song.lyrics) ? (
              <ChordLyrics lyrics={song.lyrics} />
            ) : (
              <ReactMarkdown>{song.lyrics}</ReactMarkdown>
            )
          ) : (
            <p className="muted">Ingen låttext finns för den här låten ännu.</p>
          )}
        </section>
        <dl className="metadata">
          {metadata
            .filter(([, value]) => value)
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
        {!!song.tags?.length && (
          <div className="tag-list">
            {song.tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
