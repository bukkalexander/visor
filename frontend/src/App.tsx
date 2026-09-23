import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, BookOpen, Check, ChevronDown, ChevronUp, CirclePlay, Grid2X2, Home, List, ListMusic, Menu, Pause, Play, Plus, RefreshCw, Repeat, Repeat1, Search, Shuffle, SkipBack, SkipForward, Trash2, X } from 'lucide-react';
import { api } from './api';
import { ChordLyrics } from './chords';
import { nextTrackIndex, shuffledTrackIndex, shouldRecoverPlayback, type RepeatMode } from './playerLogic';
import { searchSongs } from './query';
import type { Page, Playlist, Schema, Song } from './types';

const videoId = (url?: string) => url?.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
const words = (values?: string[]) => values?.join(', ') || '—';

function SongCard({ song, onOpen, selecting, selected, onSelect }: { song: Song; onOpen: () => void; selecting: boolean; selected: boolean; onSelect: () => void }) {
  return <article className={`song-card ${selected ? 'selected' : ''}`}>
    {selecting && <label className="card-check"><input type="checkbox" checked={selected} onChange={onSelect}/><span><Check/></span></label>}
    <button className="song-card-open" onClick={selecting ? onSelect : onOpen}>
      <div className="cover"><span>{song.title.charAt(0)}</span><small>{song.language}</small></div>
      <div><h3>{song.title}</h3><p>{words(song.artist || song.composer)}</p><div className="pills">{song.tags?.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div></div>
    </button>
  </article>;
}

const filterKeys: (keyof Song)[] = ['language', 'artist', 'composer', 'universe', 'tags'];
const fieldLabel = (field: string) => field.charAt(0).toUpperCase() + field.slice(1);
const songValues = (song: Song, field: keyof Song): string[] => { const value = song[field]; return Array.isArray(value) ? value.map(String) : value == null ? [] : [String(value)]; };

function Library({ songs, schema, playlists, reloadPlaylists, onOpen }: { songs: Song[]; schema: Schema; playlists: Playlist[]; reloadPlaylists: () => Promise<void>; onOpen: (song: Song) => void }) {
  const [query, setQuery] = useState(''); const [layout, setLayout] = useState<'cards' | 'table'>('table'); const [drawer, setDrawer] = useState(false); const [sort, setSort] = useState('title:asc');
  const [filters, setFilters] = useState<Record<string, string[]>>({}); const [selecting, setSelecting] = useState(false); const [selected, setSelected] = useState<Set<string>>(new Set()); const [playlistSheet, setPlaylistSheet] = useState(false); const [newName, setNewName] = useState(''); const [targetPlaylist, setTargetPlaylist] = useState(playlists[0]?.id || ''); const [saving, setSaving] = useState(false); const [actionError, setActionError] = useState('');
  useEffect(() => { if (!targetPlaylist && playlists[0]) setTargetPlaylist(playlists[0].id); }, [playlists, targetPlaylist]);
  const fields = useMemo(() => Object.keys(schema.items.properties), [schema]);
  const facets = useMemo(() => Object.fromEntries(filterKeys.map(field => [field, Array.from(new Set(songs.flatMap(song => songValues(song, field)))).sort((a, b) => a.localeCompare(b))])), [songs]);
  const result = useMemo(() => {
    try {
      const queried = searchSongs(songs, query, fields).filter(song => Object.entries(filters).every(([field, values]) => !values.length || values.some(value => songValues(song, field as keyof Song).includes(value))));
      const [key, direction] = sort.split(':');
      queried.sort((a, b) => { const left = key === 'year' ? a.year || 0 : String(a[key as keyof Song] || ''); const right = key === 'year' ? b.year || 0 : String(b[key as keyof Song] || ''); return (typeof left === 'number' && typeof right === 'number' ? left - right : String(left).localeCompare(String(right))) * (direction === 'desc' ? -1 : 1); });
      return { songs: queried, error: '' };
    } catch (error) { return { songs: [], error: (error as Error).message }; }
  }, [songs, query, fields, filters, sort]);
  const toggleFilter = (field: string, value: string) => setFilters(current => { const values = new Set(current[field] || []); if (values.has(value)) values.delete(value); else values.add(value); return { ...current, [field]: [...values] }; });
  const toggleSong = (id: string) => setSelected(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const allVisibleSelected = result.songs.length > 0 && result.songs.every(song => selected.has(song.id));
  const toggleAll = () => setSelected(current => { const next = new Set(current); if (allVisibleSelected) result.songs.forEach(song => next.delete(song.id)); else result.songs.forEach(song => next.add(song.id)); return next; });
  const finishSelection = () => { setSelecting(false); setSelected(new Set()); setPlaylistSheet(false); };
  const addToPlaylist = async (create: boolean) => {
    setSaving(true); setActionError('');
    try {
      if (create) await api.createPlaylist({ name: newName.trim(), description: '', song_ids: [...selected] });
      else { const playlist = playlists.find(item => item.id === targetPlaylist); if (!playlist) throw new Error('Choose a playlist'); await api.updatePlaylist({ ...playlist, song_ids: [...new Set([...playlist.song_ids, ...selected])] }); }
      await reloadPlaylists(); finishSelection();
    } catch (error) { setActionError((error as Error).message); } finally { setSaving(false); }
  };
  const activeFilterCount = Object.values(filters).filter(values => values.length).length;
  return <main className="page library-page">
    <header className="search-header">
      <button className={`layout-toggle ${activeFilterCount ? 'active' : ''}`} onClick={() => setDrawer(true)} aria-label="Open filters"><Menu/>{activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button>
      <label className="search-box"><Search size={19}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder='Search, or artist="Mozart"' aria-label="Search songs"/>{query && <button onClick={() => setQuery('')} aria-label="Clear search"><X size={17}/></button>}</label>
      <button className="layout-toggle" onClick={() => setLayout(layout === 'cards' ? 'table' : 'cards')} aria-label={`Use ${layout === 'cards' ? 'table' : 'card'} view`}>{layout === 'cards' ? <List/> : <Grid2X2/>}</button>
    </header>
    {result.error && <div className="inline-error"><strong>Invalid query</strong><span>{result.error}</span></div>}
    <div className="result-line"><span>{result.songs.length} songs</span><button className={selecting ? 'active' : ''} onClick={() => selecting ? finishSelection() : setSelecting(true)}>{selecting ? 'Cancel' : 'Select songs'}</button></div>
    {selecting && <div className="selection-bar"><label><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll}/><span><Check/></span> All shown</label><strong>{selected.size} selected</strong><button disabled={!selected.size} onClick={() => setPlaylistSheet(true)}>Add to playlist</button></div>}
    {layout === 'cards' ? <section className="card-grid">{result.songs.map(song => <SongCard key={song.id} song={song} onOpen={() => onOpen(song)} selecting={selecting} selected={selected.has(song.id)} onSelect={() => toggleSong(song.id)}/>)}</section> :
      <div className="table-wrap song-table"><table><thead><tr>{selecting && <th className="check-column"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all shown songs"/></th>}<th className="title-column">Title</th><th>Artist / composer</th><th>Universe</th><th>Language</th><th>Year</th></tr></thead><tbody>{result.songs.map(song => <tr key={song.id} className={selected.has(song.id) ? 'selected' : ''}>{selecting && <td><input type="checkbox" checked={selected.has(song.id)} onChange={() => toggleSong(song.id)} aria-label={`Select ${song.title}`}/></td>}<td className="title-column"><button onClick={selecting ? () => toggleSong(song.id) : () => onOpen(song)}>{song.title}</button></td><td>{words(song.artist || song.composer)}</td><td>{words(song.universe)}</td><td>{song.language}</td><td>{song.year || '—'}</td></tr>)}</tbody></table></div>}
    {!result.songs.length && !result.error && <div className="empty"><Search/><h2>No songs found</h2></div>}
    <div className={`drawer-backdrop ${drawer ? 'open' : ''}`} onClick={() => setDrawer(false)}/><aside className={`filter-drawer ${drawer ? 'open' : ''}`} aria-hidden={!drawer}><header><div><span>Library</span><h2>Filter & sort</h2></div><button onClick={() => setDrawer(false)} aria-label="Close filters"><X/></button></header><label className="sort-field"><span>Sort</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="title:asc">Title A–Z</option><option value="title:desc">Title Z–A</option><option value="year:desc">Newest year</option><option value="year:asc">Oldest year</option></select></label>{filterKeys.map(field => <details key={field} open><summary>{fieldLabel(field)} <small>{filters[field]?.length || ''}</small></summary><div>{facets[field].map(value => <label key={value}><input type="checkbox" checked={(filters[field] || []).includes(value)} onChange={() => toggleFilter(field, value)}/><span><Check/></span>{value}</label>)}</div></details>)}<footer><button onClick={() => setFilters({})}>Clear</button><button onClick={() => setDrawer(false)}>Show {result.songs.length} songs</button></footer></aside>
    {playlistSheet && <div className="modal-backdrop" onClick={() => setPlaylistSheet(false)}><section className="playlist-sheet" onClick={event => event.stopPropagation()}><header><h2>Add {selected.size} songs</h2><button onClick={() => setPlaylistSheet(false)}><X/></button></header>{actionError && <div className="inline-error">{actionError}</div>}<label className="field"><span>Existing playlist</span><select value={targetPlaylist} onChange={event => setTargetPlaylist(event.target.value)}>{playlists.map(list => <option value={list.id} key={list.id}>{list.name}</option>)}</select></label><button className="primary-action" disabled={saving || !targetPlaylist} onClick={() => addToPlaylist(false)}>Add to existing</button><div className="or"><span>or create new</span></div><label className="field"><span>Playlist name</span><input value={newName} onChange={event => setNewName(event.target.value)}/></label><button className="secondary-action" disabled={saving || !newName.trim()} onClick={() => addToPlaylist(true)}>Create playlist</button></section></div>}
  </main>;
}

function SongDetail({ song, onBack }: { song: Song; onBack: () => void }) {
  const id = videoId(song.video);
  const metadata = [['Artist', words(song.artist)], ['Author', words(song.author)], ['Composer', words(song.composer)], ['Universe', words(song.universe)], ['Source', song.source || '—'], ['Language', song.language], ['Year', song.year || '—']];
  return <main className="page detail-page">
    <header className="detail-header"><button onClick={onBack}><ArrowLeft/> Songs</button></header>
    <article>
      {id && <div className="video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={`${song.title} video`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div>}
      <div className="article-title"><span>{song.universe?.[0] || song.language}</span><h1>{song.title}</h1><p>{words(song.artist || song.composer)}</p></div>
      {song.description && <section className="markdown"><ReactMarkdown>{song.description}</ReactMarkdown></section>}
      <dl className="metadata">{metadata.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {song.lyrics && <section className="lyrics"><h2>Lyrics</h2>{/\[[A-G][^\]]*]/.test(song.lyrics) ? <ChordLyrics lyrics={song.lyrics}/> : <ReactMarkdown>{song.lyrics}</ReactMarkdown>}</section>}
    </article>
  </main>;
}

function SongsPage({ songs, selected, setSelected }: { songs: Song[]; selected?: Song; setSelected: (song?: Song) => void }) {
  if (selected) return <SongDetail song={selected} onBack={() => setSelected(undefined)}/>;
  return <main className="page songs-page"><header className="page-title"><span>Library</span><h1>Songs</h1></header><div className="recycle-list">{songs.map(song => <button key={song.id} onClick={() => setSelected(song)}><span className="list-cover">{song.title[0]}</span><span><strong>{song.title}</strong><small>{words(song.artist || song.composer)}</small></span><span>›</span></button>)}</div></main>;
}

type Draft = { id?: string; name: string; description: string; song_ids: string[] };
const emptyDraft: Draft = { name: '', description: '', song_ids: [] };

function PlaylistComposer({ songs, playlists, reload, onPlay }: { songs: Song[]; playlists: Playlist[]; reload: () => Promise<void>; onPlay: (list: Playlist) => void }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!draft) return; setBusy(true); setError('');
    try {
      if (draft.id) await api.updatePlaylist(draft as Playlist); else await api.createPlaylist(draft);
      await reload(); setDraft(null);
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  };
  const remove = async (id: string) => { if (!window.confirm('Delete this playlist?')) return; await api.deletePlaylist(id); await reload(); };
  const move = (index: number, direction: -1 | 1) => {
    if (!draft) return; const next = [...draft.song_ids]; const target = index + direction;
    if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setDraft({ ...draft, song_ids: next });
  };
  if (draft) return <main className="page composer-page">
    <header className="editor-head"><button onClick={() => setDraft(null)}><X/></button><h1>{draft.id ? 'Edit playlist' : 'New playlist'}</h1><button className="save" disabled={busy || !draft.name.trim()} onClick={save}>Save</button></header>
    {error && <div className="inline-error">{error}</div>}
    <label className="field"><span>Name</span><input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>
    <label className="field"><span>Description</span><textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })}/></label>
    <h2 className="subhead">Tracks · {draft.song_ids.length}</h2>
    <div className="selected-tracks">{draft.song_ids.map((id, index) => { const song = songs.find(item => item.id === id); return song ? <div key={id}><span>{index + 1}</span><strong>{song.title}</strong><button onClick={() => move(index, -1)} aria-label="Move up"><ChevronUp/></button><button onClick={() => move(index, 1)} aria-label="Move down"><ChevronDown/></button><button onClick={() => setDraft({ ...draft, song_ids: draft.song_ids.filter(item => item !== id) })} aria-label="Remove"><X/></button></div> : null; })}</div>
    <h2 className="subhead">Add songs</h2>
    <div className="song-checks">{songs.filter(song => !draft.song_ids.includes(song.id)).map(song => <button key={song.id} onClick={() => setDraft({ ...draft, song_ids: [...draft.song_ids, song.id] })}><Plus/><span><strong>{song.title}</strong><small>{words(song.artist || song.composer)}</small></span></button>)}</div>
  </main>;
  return <main className="page playlists-page"><header className="page-title action-title"><div><span>Collections</span><h1>Playlists</h1></div><button onClick={() => setDraft(emptyDraft)}><Plus/> New</button></header><section className="playlist-grid">{playlists.map(list => <article key={list.id}><div className="playlist-art"><ListMusic/><span>{list.song_ids.length}</span></div><h2>{list.name}</h2><p>{list.description || `${list.song_ids.length} songs`}</p><div><button className="play" onClick={() => onPlay(list)} disabled={!list.song_ids.some(id => songs.find(song => song.id === id)?.video)}><Play/> Play</button><button onClick={() => setDraft({ ...list, description: list.description || '' })}>Edit</button><button onClick={() => remove(list.id)} aria-label={`Delete ${list.name}`}><Trash2/></button></div></article>)}</section></main>;
}

declare global { interface Window { YT?: { Player: new (element: HTMLElement, options: object) => YouTubePlayer; PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number; UNSTARTED: number } }; onYouTubeIframeAPIReady?: () => void; } }
type YouTubePlayer = { loadVideoById(id: string): void; playVideo(): void; pauseVideo(): void; seekTo(seconds: number, allowSeekAhead: boolean): void; getCurrentTime(): number; getDuration(): number; getPlayerState(): number; destroy(): void };

function PlayerPage({ songs, playlist }: { songs: Song[]; playlist?: Playlist }) {
  const playable = useMemo(() => (playlist?.song_ids || []).map(id => songs.find(song => song.id === id)).filter((song): song is Song => !!song?.video), [playlist, songs]);
  const [index, setIndex] = useState(0); const [repeat, setRepeat] = useState<RepeatMode>('off'); const [shuffle, setShuffle] = useState(false); const [playing, setPlaying] = useState(false); const [time, setTime] = useState(0); const [duration, setDuration] = useState(0); const [ready, setReady] = useState(false);
  const host = useRef<HTMLDivElement>(null); const player = useRef<YouTubePlayer | undefined>(undefined); const playableRef = useRef(playable); const indexRef = useRef(index); const repeatRef = useRef(repeat); const shuffleRef = useRef(shuffle); const desiredPlaying = useRef(true); const transitionStarted = useRef(0); const lastCommand = useRef(0); const endedTrack = useRef(''); const goRef = useRef<(direction: 1 | -1) => void>(() => undefined); const current = playable[index];
  playableRef.current = playable; indexRef.current = index; repeatRef.current = repeat; shuffleRef.current = shuffle;
  const commandPlay = useCallback(() => { desiredPlaying.current = true; lastCommand.current = Date.now(); player.current?.playVideo(); }, []);
  const commandPause = useCallback(() => { desiredPlaying.current = false; lastCommand.current = Date.now(); player.current?.pauseVideo(); }, []);
  const go = useCallback((direction: 1 | -1) => {
    const list = playableRef.current; const currentIndex = indexRef.current;
    if (!list.length) return;
    endedTrack.current = list[currentIndex]?.id || '';
    const next = shuffleRef.current && direction === 1 ? shuffledTrackIndex(currentIndex, list.length) : nextTrackIndex(currentIndex, list.length, direction, repeatRef.current);
    if (next === currentIndex) { player.current?.seekTo(0, true); commandPlay(); return; }
    if (next == null) { commandPause(); return; }
    desiredPlaying.current = true; transitionStarted.current = Date.now(); setIndex(next);
  }, [commandPause, commandPlay]);
  goRef.current = go;
  useEffect(() => { setIndex(0); indexRef.current = 0; desiredPlaying.current = true; transitionStarted.current = Date.now(); endedTrack.current = ''; }, [playlist?.id]);
  useEffect(() => {
    if (!host.current) return;
    let cancelled = false;
    const start = () => {
      if (cancelled || !host.current || !window.YT || player.current) return;
      player.current = new window.YT.Player(host.current, { playerVars: { playsinline: 1, rel: 0 }, events: {
        onReady: () => { if (!cancelled) setReady(true); },
        onStateChange: (event: { data: number }) => {
          const states = window.YT?.PlayerState; if (!states) return;
          if (event.data === states.PLAYING) { desiredPlaying.current = true; setPlaying(true); }
          else if (event.data === states.PAUSED) { setPlaying(false); if (Date.now() - transitionStarted.current > 2500) desiredPlaying.current = false; }
          else if (event.data === states.ENDED) { setPlaying(false); goRef.current(1); }
        }
      }});
    };
    if (window.YT) start(); else { window.onYouTubeIframeAPIReady = start; if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) { const script = document.createElement('script'); script.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(script); } }
    return () => { cancelled = true; player.current?.destroy(); player.current = undefined; };
  }, []);
  useEffect(() => {
    const id = videoId(current?.video); if (!ready || !id || !player.current) return;
    transitionStarted.current = Date.now(); endedTrack.current = ''; setTime(0); setDuration(0); player.current.loadVideoById(id);
    const retries = [250, 900, 1900].map(delay => window.setTimeout(() => { if (desiredPlaying.current && indexRef.current === index) commandPlay(); }, delay));
    return () => retries.forEach(clearTimeout);
  }, [current?.id, ready, index, commandPlay]);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const instance = player.current; const states = window.YT?.PlayerState; if (!instance || !states) return;
      const nextTime = instance.getCurrentTime() || 0; const nextDuration = instance.getDuration() || 0; const state = instance.getPlayerState();
      setTime(nextTime); setDuration(nextDuration); setPlaying(state === states.PLAYING);
      if (shouldRecoverPlayback(desiredPlaying.current, state, states.PLAYING, states.BUFFERING) && Date.now() - lastCommand.current > 1200) commandPlay();
      if (!desiredPlaying.current && (state === states.PLAYING || state === states.BUFFERING) && Date.now() - lastCommand.current > 500) commandPause();
      if (current && nextDuration > 2 && nextTime >= nextDuration - .65 && endedTrack.current !== current.id) { endedTrack.current = current.id; goRef.current(1); }
    }, 700);
    return () => clearInterval(timer);
  }, [current, commandPause, commandPlay]);
  const seek = (seconds: number) => player.current?.seekTo(Math.max(0, Math.min(duration, time + seconds)), true);
  const chooseTrack = (songIndex: number) => { desiredPlaying.current = true; transitionStarted.current = Date.now(); endedTrack.current = ''; setIndex(songIndex); };
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  if (!current) return <main className="page player-page empty-player"><CirclePlay/><h1>Nothing queued</h1><p>Choose Play on a playlist with YouTube videos.</p></main>;
  return <main className="page player-page"><header className="now-head"><span>Now playing</span><strong>{playlist?.name}</strong></header><div className="player-stage"><div ref={host} className="youtube-host"/><button className="tap-zone left" onDoubleClick={() => seek(-10)} aria-label="Double tap to rewind 10 seconds"/><button className="tap-zone right" onDoubleClick={() => seek(30)} aria-label="Double tap to forward 30 seconds"/></div><section className="track-info"><span>{index + 1} / {playable.length}</span><h1>{current.title}</h1><p>{words(current.artist || current.composer)}</p></section><div className="timeline"><input type="range" min="0" max={duration || 1} value={time} onChange={event => { const value = Number(event.target.value); setTime(value); player.current?.seekTo(value, true); }} aria-label="Video position"/><div><span>{clock(time)}</span><span>-{clock(Math.max(0, duration - time))}</span></div></div><div className="transport"><button className={shuffle ? 'active' : ''} onClick={() => setShuffle(!shuffle)} aria-label="Shuffle"><Shuffle/></button><button onClick={() => go(-1)} aria-label="Previous"><SkipBack/></button><button className="main-play" onClick={() => desiredPlaying.current ? commandPause() : commandPlay()} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause/> : <Play/>}</button><button onClick={() => go(1)} aria-label="Next"><SkipForward/></button><button className={repeat !== 'off' ? 'active' : ''} onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')} aria-label={`Repeat ${repeat}`}>{repeat === 'one' ? <Repeat1/> : <Repeat/>}</button></div><div className="up-next"><h2>Up next</h2>{playable.map((song, songIndex) => <button className={songIndex === index ? 'active' : ''} key={song.id} onClick={() => chooseTrack(songIndex)}><span>{songIndex + 1}</span><span><strong>{song.title}</strong><small>{words(song.artist || song.composer)}</small></span></button>)}</div></main>;
}

function Navigation({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const items: [Page, string, typeof Home][] = [['library', 'Home', Home], ['songs', 'Songs', BookOpen], ['playlists', 'Playlists', ListMusic], ['player', 'Player', CirclePlay]];
  return <nav className="bottom-nav">{items.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon/><span>{label}</span></button>)}</nav>;
}

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]); const [schema, setSchema] = useState<Schema>(); const [playlists, setPlaylists] = useState<Playlist[]>([]); const [page, setPage] = useState<Page>('library'); const [selected, setSelected] = useState<Song>(); const [activePlaylist, setActivePlaylist] = useState<Playlist>(); const [error, setError] = useState<{ message: string; details?: string[] }>(); const [loading, setLoading] = useState(true);
  const loadCatalog = useCallback(async () => { setLoading(true); setError(undefined); try { const data = await api.catalog(); setSongs(data.songs); setSchema(data.schema); } catch (caught) { const value = caught as Error & { details?: string[] }; setError({ message: value.message, details: value.details }); } finally { setLoading(false); } }, []);
  const loadPlaylists = useCallback(async () => { try { setPlaylists((await api.playlists()).playlists); } catch (caught) { const value = caught as Error; setError({ message: value.message }); } }, []);
  useEffect(() => { loadCatalog(); loadPlaylists(); }, [loadCatalog, loadPlaylists]);
  const openSong = (song: Song) => { setSelected(song); setPage('songs'); };
  if (loading) return <div className="loading"><span>V</span></div>;
  if (error || !schema) return <main className="fatal"><div>!</div><h1>Song database unavailable</h1><p>{error?.message || 'Unknown schema error'}</p>{error?.details?.length && <pre>{error.details.join('\n')}</pre>}<button onClick={loadCatalog}><RefreshCw/> Try again</button></main>;
  return <div className="app-shell">
    {page === 'library' && <Library songs={songs} schema={schema} playlists={playlists} reloadPlaylists={loadPlaylists} onOpen={openSong}/>} {page === 'songs' && <SongsPage songs={songs} selected={selected} setSelected={setSelected}/>} {page === 'playlists' && <PlaylistComposer songs={songs} playlists={playlists} reload={loadPlaylists} onPlay={list => { setActivePlaylist(list); setPage('player'); }}/>} {page === 'player' && <PlayerPage songs={songs} playlist={activePlaylist}/>}<Navigation page={page} setPage={next => { setPage(next); if (next !== 'songs') setSelected(undefined); }}/>
  </div>;
}
