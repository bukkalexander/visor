import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, BookOpen, Check, ChevronDown, ChevronUp, CirclePlay, Grid2X2, Home, List, ListMusic, Menu, Pause, Play, Plus, RefreshCw, Repeat, Repeat1, Search, Shuffle, SkipBack, SkipForward, Trash2, X } from 'lucide-react';
import { api } from './api';
import { ChordLyrics } from './chords';
import { nextTrackIndex, shuffledTrackIndex, shouldRecoverPlayback, type RepeatMode } from './playerLogic';
import { resolvePlaylist } from './playlistLogic';
import { searchSongs } from './query';
import type { Page, Playlist, Schema, Song } from './types';

const videoId = (url?: string) => url?.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1];
const words = (values?: string[]) => values?.join(', ') || '—';

function SongCard({ song, onOpen, selecting, selected, onSelect, onPlay, onAdd }: { song: Song; onOpen: () => void; selecting: boolean; selected: boolean; onSelect: () => void; onPlay: () => void; onAdd: () => void }) {
  return <article className={`song-card ${selected ? 'selected' : ''}`}>
    {selecting && <label className="card-check"><input type="checkbox" checked={selected} onChange={onSelect}/><span><Check/></span></label>}
    <button className="song-card-open" onClick={selecting ? onSelect : onOpen}>
      <div className="cover"><span>{song.title.charAt(0)}</span><small>{song.universe?.[0] || 'Song'}</small></div>
      <div><h3>{song.title}</h3><p>{words(song.artist || song.composer)}</p><div className="pills">{song.tags?.slice(0, 3).map(tag => <span key={tag}>{tag}</span>)}</div></div>
    </button><div className="song-actions"><button disabled={!videoId(song.video)} onClick={onPlay} aria-label={`Spela ${song.title}`}><Play/></button><button onClick={onAdd} aria-label={`Lägg till ${song.title} i spellista`}><Plus/></button></div>
  </article>;
}

const filterKeys: (keyof Song)[] = ['artist', 'composer', 'universe', 'tags'];
const fieldLabel = (field: string) => field.charAt(0).toUpperCase() + field.slice(1);
const songValues = (song: Song, field: keyof Song): string[] => { const value = song[field]; return Array.isArray(value) ? value.map(String) : value == null ? [] : [String(value)]; };

function Library({ songs, schema, playlists, reloadPlaylists, onOpen, onPlay }: { songs: Song[]; schema: Schema; playlists: Playlist[]; reloadPlaylists: () => Promise<void>; onOpen: (song: Song) => void; onPlay: (song: Song) => void }) {
  const [query, setQuery] = useState(''); const [layout, setLayout] = useState<'cards' | 'table'>('table'); const [drawer, setDrawer] = useState(false); const [sort, setSort] = useState('title:asc');
  const [filters, setFilters] = useState<Record<string, string[]>>({}); const [selecting, setSelecting] = useState(false); const [selected, setSelected] = useState<Set<string>>(new Set()); const [playlistSheet, setPlaylistSheet] = useState(false); const [newName, setNewName] = useState(''); const [targetPlaylist, setTargetPlaylist] = useState(playlists.find(list => list.type !== 'dynamic')?.id || ''); const [saving, setSaving] = useState(false); const [actionError, setActionError] = useState('');
  const manualPlaylists = playlists.filter(playlist => playlist.type !== 'dynamic');
  useEffect(() => { if (!targetPlaylist && manualPlaylists[0]) setTargetPlaylist(manualPlaylists[0].id); }, [manualPlaylists, targetPlaylist]);
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
      if (create) await api.createPlaylist({ name: newName.trim(), description: '', type: 'manual', song_ids: [...selected] });
      else { const playlist = manualPlaylists.find(item => item.id === targetPlaylist); if (!playlist) throw new Error('Choose a manual playlist'); await api.updatePlaylist({ ...playlist, type: 'manual', song_ids: [...new Set([...(playlist.song_ids || []), ...selected])] }); }
      await reloadPlaylists(); finishSelection();
    } catch (error) { setActionError((error as Error).message); } finally { setSaving(false); }
  };
  const activeFilterCount = Object.values(filters).filter(values => values.length).length;
  return <main className="page library-page">
    <header className="search-header">
      <button className={`layout-toggle ${activeFilterCount ? 'active' : ''}`} onClick={() => setDrawer(true)} aria-label="Öppna filter"><Menu/>{activeFilterCount > 0 && <b>{activeFilterCount}</b>}</button>
      <label className="search-box"><Search size={19}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder='Sök, eller artist="Mozart"' aria-label="Sök låtar"/>{query && <button onClick={() => setQuery('')} aria-label="Rensa sökning"><X size={17}/></button>}</label>
      <button className="layout-toggle" onClick={() => setLayout(layout === 'cards' ? 'table' : 'cards')} aria-label={`Use ${layout === 'cards' ? 'table' : 'card'} view`}>{layout === 'cards' ? <List/> : <Grid2X2/>}</button>
    </header>
    {result.error && <div className="inline-error"><strong>Ogiltig sökning</strong><span>{result.error}</span></div>}
    <div className="result-line"><span>{result.songs.length} låtar</span><button className={selecting ? 'active' : ''} onClick={() => selecting ? finishSelection() : setSelecting(true)}>{selecting ? 'Avbryt' : 'Välj låtar'}</button></div>
    {selecting && <div className="selection-bar"><label><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll}/><span><Check/></span> Alla visade</label><strong>{selected.size} valda</strong><button disabled={!selected.size} onClick={() => setPlaylistSheet(true)}>Lägg till i spellista</button></div>}
    {layout === 'cards' ? <section className="card-grid">{result.songs.map(song => <SongCard key={song.id} song={song} onOpen={() => onOpen(song)} selecting={selecting} selected={selected.has(song.id)} onSelect={() => toggleSong(song.id)} onPlay={() => onPlay(song)} onAdd={() => { setSelected(new Set([song.id])); setPlaylistSheet(true); }}/>)}</section> :
      <div className="table-wrap song-table"><table><thead><tr>{selecting && <th className="check-column"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all shown songs"/></th>}<th className="title-column">Titel</th><th>Artist / kompositör</th><th>Universum</th><th>Taggar</th><th>År</th><th>Åtgärder</th></tr></thead><tbody>{result.songs.map(song => <tr key={song.id} className={selected.has(song.id) ? 'selected' : ''}>{selecting && <td><input type="checkbox" checked={selected.has(song.id)} onChange={() => toggleSong(song.id)} aria-label={`Select ${song.title}`}/></td>}<td className="title-column"><button onClick={selecting ? () => toggleSong(song.id) : () => onOpen(song)}>{song.title}</button></td><td>{words(song.artist || song.composer)}</td><td>{words(song.universe)}</td><td>{words(song.tags)}</td><td>{song.year || '—'}</td><td><div className="song-actions"><button disabled={!videoId(song.video)} onClick={() => onPlay(song)} aria-label={`Spela ${song.title}`}><Play/></button><button onClick={() => { setSelected(new Set([song.id])); setPlaylistSheet(true); }} aria-label={`Lägg till ${song.title} i spellista`}><Plus/></button></div></td></tr>)}</tbody></table></div>}
    {!result.songs.length && !result.error && <div className="empty"><Search/><h2>Inga låtar hittades</h2></div>}
    <div className={`drawer-backdrop ${drawer ? 'open' : ''}`} onClick={() => setDrawer(false)}/><aside className={`filter-drawer ${drawer ? 'open' : ''}`} aria-hidden={!drawer}><header><div><span>Bibliotek</span><h2>Filter och sortering</h2></div><button onClick={() => setDrawer(false)} aria-label="Stäng filter"><X/></button></header><label className="sort-field"><span>Sortering</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="title:asc">Titel A–Ö</option><option value="title:desc">Titel Ö–A</option><option value="year:desc">Senaste år</option><option value="year:asc">Tidigaste år</option></select></label>{filterKeys.map(field => <details key={field} open><summary>{fieldLabel(field)} <small>{filters[field]?.length || ''}</small></summary><div>{facets[field].map(value => <label key={value}><input type="checkbox" checked={(filters[field] || []).includes(value)} onChange={() => toggleFilter(field, value)}/><span><Check/></span>{value}</label>)}</div></details>)}<footer><button onClick={() => setFilters({})}>Rensa</button><button onClick={() => setDrawer(false)}>Show {result.songs.length} låtar</button></footer></aside>
    {playlistSheet && <div className="modal-backdrop" onClick={() => setPlaylistSheet(false)}><section className="playlist-sheet" role="dialog" aria-modal="true" aria-label="Lägg till i spellista" onClick={event => event.stopPropagation()}><header><h2>Add {selected.size} låtar</h2><button aria-label="Stäng" onClick={() => setPlaylistSheet(false)}><X/></button></header>{actionError && <div className="inline-error">{actionError}</div>}{manualPlaylists.length > 0 && <><label className="field"><span>Befintlig manuell spellista</span><select value={targetPlaylist} onChange={event => setTargetPlaylist(event.target.value)}>{manualPlaylists.map(list => <option value={list.id} key={list.id}>{list.name}</option>)}</select></label><button className="primary-action" disabled={saving || !targetPlaylist} onClick={() => addToPlaylist(false)}>Lägg till</button><div className="or"><span>eller skapa ny</span></div></>}<label className="field"><span>Spellistans namn</span><input value={newName} onChange={event => setNewName(event.target.value)}/></label><button className="secondary-action" disabled={saving || !newName.trim()} onClick={() => addToPlaylist(true)}>Skapa spellista</button></section></div>}
  </main>;
}

function SongDetail({ song, onBack, onPlay, onAdd, embedded = false }: { song: Song; onBack: () => void; onPlay?: () => void; onAdd?: () => void; embedded?: boolean }) {
  const id = videoId(song.video);
  const metadata = [['Artist', words(song.artist)], ['Textförfattare', words(song.author)], ['Kompositör', words(song.composer)], ['Universum', words(song.universe)], ['Taggar', words(song.tags)], ['År', song.year || '—']];
  return <main className="page detail-page">
    <header className="detail-header"><button onClick={onBack}><ArrowLeft/> {embedded ? 'Stäng låttext' : 'Låtar'}</button></header>
    <article>
      {id && !embedded && <div className="video-frame"><iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={`${song.title} video`} allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/></div>}
      <div className="song-actions">{onPlay && <button disabled={!id} onClick={onPlay}><Play/> Spela</button>}{onAdd && <button onClick={onAdd}><Plus/> Lägg till i spellista</button>}</div><div className="article-title"><span>{song.universe?.[0] || 'Song'}</span><h1>{song.title}</h1><p>{words(song.artist || song.composer)}</p></div>
      {song.description && <section className="markdown"><ReactMarkdown>{song.description}</ReactMarkdown></section>}
      <dl className="metadata">{metadata.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {song.lyrics && <section className="lyrics"><h2>Låttext</h2>{/\[[A-G][^\]]*]/.test(song.lyrics) ? <ChordLyrics lyrics={song.lyrics}/> : <ReactMarkdown>{song.lyrics}</ReactMarkdown>}</section>}
    </article>
  </main>;
}


type Draft = { id?: string; name: string; description: string; type: 'manual' | 'dynamic'; song_ids: string[]; query: string };
const emptyDraft: Draft = { name: '', description: '', type: 'manual', song_ids: [], query: '' };

function PlaylistComposer({ songs, schema, playlists, reload, onPlay }: { songs: Song[]; schema: Schema; playlists: Playlist[]; reload: () => Promise<void>; onPlay: (list: Playlist) => void }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [songQuery, setSongQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fields = useMemo(() => Object.keys(schema.items.properties), [schema]);
  const resolve = (playlist: Playlist) => { try { return { songs: resolvePlaylist(playlist, songs, fields), error: '' }; } catch (caught) { return { songs: [], error: (caught as Error).message }; } };
  const preview = draft?.type === 'dynamic' ? resolve({ id: draft.id || '', name: draft.name, type: 'dynamic', query: draft.query }).songs : [];
  const queryError = draft?.type === 'dynamic' ? resolve({ id: draft.id || '', name: draft.name, type: 'dynamic', query: draft.query }).error : '';
  const save = async () => {
    if (!draft) return; setBusy(true); setError('');
    try {
      const payload: Playlist = draft.type === 'dynamic'
        ? { id: draft.id || '', name: draft.name, description: draft.description, type: 'dynamic', query: draft.query }
        : { id: draft.id || '', name: draft.name, description: draft.description, type: 'manual', song_ids: draft.song_ids };
      if (draft.id) await api.updatePlaylist(payload); else await api.createPlaylist(payload);
      await reload(); setDraft(null);
    } catch (caught) { setError((caught as Error).message); } finally { setBusy(false); }
  };
  const remove = async (id: string) => { if (!window.confirm('Ta bort den här spellistan?')) return; await api.deletePlaylist(id); await reload(); };
  const move = (index: number, direction: -1 | 1) => {
    if (!draft) return; const next = [...draft.song_ids]; const target = index + direction;
    if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; setDraft({ ...draft, song_ids: next });
  };
  if (draft) return <main className="page composer-page">
    <header className="editor-head"><button onClick={() => setDraft(null)}><X/></button><h1>{draft.id ? 'Redigera spellista' : 'Ny spellista'}</h1><button className="save" disabled={busy || !draft.name.trim() || !!queryError} onClick={save}>Spara</button></header>
    {error && <div className="inline-error">{error}</div>}
    <label className="field"><span>Namn</span><input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })}/></label>
    <label className="field"><span>Beskrivning</span><textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })}/></label>
    <div className="playlist-type" role="group" aria-label="Playlist type"><button className={draft.type === 'manual' ? 'active' : ''} onClick={() => setDraft({ ...draft, type: 'manual' })}>Valda låtar</button><button className={draft.type === 'dynamic' ? 'active' : ''} onClick={() => setDraft({ ...draft, type: 'dynamic' })}>Sparad sökning</button></div>
    {draft.type === 'dynamic' ? <>
      <label className="field query-field"><span>Sökfilter</span><input value={draft.query} onChange={event => setDraft({ ...draft, query: event.target.value })} placeholder='tags = "bedtime"'/><small>Lämna tomt för att inkludera alla låtar.</small></label>
      {queryError ? <div className="inline-error"><strong>Ogiltig sökning</strong>{queryError}</div> : <><h2 className="subhead">Träffar · {preview.length}</h2><div className="dynamic-preview">{preview.map(song => <div key={song.id}><strong>{song.title}</strong><small>{words(song.artist || song.composer)}</small></div>)}</div></>}
    </> : <>
      <h2 className="subhead">Låtar · {draft.song_ids.length}</h2>
      <div className="selected-tracks">{draft.song_ids.map((id, index) => { const song = songs.find(item => item.id === id); return song ? <div key={id}><span>{index + 1}</span><strong>{song.title}</strong><button onClick={() => move(index, -1)} aria-label="Move up"><ChevronUp/></button><button onClick={() => move(index, 1)} aria-label="Move down"><ChevronDown/></button><button onClick={() => setDraft({ ...draft, song_ids: draft.song_ids.filter(item => item !== id) })} aria-label="Remove"><X/></button></div> : null; })}</div>
      <h2 className="subhead">Lägg till låtar</h2><label className="search-box"><Search/><input aria-label="Sök låtar till spellistan" placeholder="Sök låtar till spellistan" value={songQuery} onChange={event => setSongQuery(event.target.value)}/></label>
      <div className="song-checks">{songs.filter(song => !draft.song_ids.includes(song.id) && `${song.title} ${words(song.artist)} ${words(song.composer)}`.toLocaleLowerCase().includes(songQuery.toLocaleLowerCase())).map(song => <button key={song.id} onClick={() => setDraft({ ...draft, song_ids: [...draft.song_ids, song.id] })}><Plus/><span><strong>{song.title}</strong><small>{words(song.artist || song.composer)}</small></span></button>)}</div>
    </>}
  </main>;
  return <main className="page playlists-page"><header className="page-title action-title"><div><span>Samlingar</span><h1>Spellistor</h1></div><button onClick={() => setDraft({ ...emptyDraft })}><Plus/> Ny</button></header>{!playlists.length && <div className="empty"><ListMusic/><h2>Inga spellistor ännu</h2><p>Skapa en spellista eller spara en sökning.</p></div>}<section className="playlist-grid">{playlists.map(list => { const result = resolve(list); const materialized = { ...list, song_ids: result.songs.map(song => song.id) }; return <article key={list.id}><div className="playlist-art"><ListMusic/><span>{result.songs.length}</span>{list.type === 'dynamic' && <b>Dynamic</b>}</div><h2>{list.name}</h2><p>{result.error || list.description || (list.type === 'dynamic' ? list.query || 'All songs' : `${result.songs.length} songs`)}</p><div><button className="play" onClick={() => onPlay(materialized)} disabled={!!result.error || !result.songs.some(song => videoId(song.video))}><Play/> Spela</button><button onClick={() => setDraft({ id: list.id, name: list.name, description: list.description || '', type: list.type === 'dynamic' ? 'dynamic' : 'manual', song_ids: list.song_ids || [], query: list.query || '' })}>Öppna</button><button onClick={() => remove(list.id)} aria-label={`Delete ${list.name}`}><Trash2/></button></div></article>; })}</section></main>;
}

declare global { interface Window { YT?: { Player: new (element: HTMLElement, options: object) => YouTubePlayer; PlayerState: { ENDED: number; PLAYING: number; PAUSED: number; BUFFERING: number; CUED: number; UNSTARTED: number } }; onYouTubeIframeAPIReady?: () => void; } }
type YouTubePlayer = { loadVideoById(id: string): void; playVideo(): void; pauseVideo(): void; seekTo(seconds: number, allowSeekAhead: boolean): void; getCurrentTime(): number; getDuration(): number; getPlayerState(): number; destroy(): void };

function PlayerPage({ songs, playlist, expanded, onExpand, onAdd }: { songs: Song[]; playlist?: Playlist; expanded: boolean; onExpand: () => void; onAdd: (song: Song) => void }) {
  const playable = useMemo(() => (playlist?.song_ids || []).map(id => songs.find(song => song.id === id)).filter((song): song is Song => !!videoId(song?.video)), [playlist, songs]);
  const [lyricsOpen, setLyricsOpen] = useState(false);
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
  useEffect(() => { setIndex(0); indexRef.current = 0; desiredPlaying.current = true; transitionStarted.current = Date.now(); endedTrack.current = ''; }, [playlist]);
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
    const id = videoId(playable[indexRef.current]?.video); if (!ready || !id || !player.current) return;
    transitionStarted.current = Date.now(); endedTrack.current = ''; setTime(0); setDuration(0); player.current.loadVideoById(id);
    const retries = [250, 900, 1900].map(delay => window.setTimeout(() => { if (desiredPlaying.current && indexRef.current === index) commandPlay(); }, delay));
    return () => retries.forEach(clearTimeout);
  }, [current?.id, ready, index, commandPlay, playlist]);
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
  const chooseTrack = (songIndex: number) => { desiredPlaying.current = true; transitionStarted.current = Date.now(); endedTrack.current = ''; if (songIndex === indexRef.current) { player.current?.seekTo(0, true); commandPlay(); } else setIndex(songIndex); };
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  if (!current) return <main className="page player-page empty-player"><CirclePlay/><h1>Nothing queued</h1><p>Choose Play on a playlist with YouTube videos.</p></main>;
  return <main className={`page player-page persistent-player ${expanded ? 'expanded' : 'compact'}`}><div className="mini-player"><button onClick={onExpand}><strong>{current.title}</strong><small>{words(current.artist || current.composer)}</small></button><button onClick={() => go(-1)} aria-label="Föregående låt"><SkipBack/></button><button onClick={() => desiredPlaying.current ? commandPause() : commandPlay()} aria-label={playing ? 'Pausa' : 'Spela'}>{playing ? <Pause/> : <Play/>}</button><button onClick={() => go(1)} aria-label="Nästa låt"><SkipForward/></button><button aria-expanded={lyricsOpen} onClick={() => setLyricsOpen(!lyricsOpen)} aria-label="Visa låttext"><BookOpen/></button></div>{lyricsOpen && <div className="playing-lyrics"><SongDetail song={current} embedded onBack={() => setLyricsOpen(false)} onAdd={() => onAdd(current)}/>{!current.lyrics && <p>Låttext saknas för den här låten.</p>}</div>}<header className="now-head"><span>Spelas nu</span><strong>{playlist?.name}</strong></header><div className="player-stage"><div ref={host} className="youtube-host"/><button className="tap-zone left" onDoubleClick={() => seek(-10)} aria-label="Double tap to rewind 10 seconds"/><button className="tap-zone right" onDoubleClick={() => seek(30)} aria-label="Double tap to forward 30 seconds"/></div><section className="track-info"><span>{index + 1} / {playable.length}</span><h1>{current.title}</h1><p>{words(current.artist || current.composer)}</p></section><div className="timeline"><input type="range" min="0" max={duration || 1} value={time} onChange={event => { const value = Number(event.target.value); setTime(value); player.current?.seekTo(value, true); }} aria-label="Video position"/><div><span>{clock(time)}</span><span>-{clock(Math.max(0, duration - time))}</span></div></div><div className="transport"><button className={shuffle ? 'active' : ''} onClick={() => setShuffle(!shuffle)} aria-label="Shuffle"><Shuffle/></button><button onClick={() => go(-1)} aria-label="Previous"><SkipBack/></button><button className="main-play" onClick={() => desiredPlaying.current ? commandPause() : commandPlay()} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause/> : <Play/>}</button><button onClick={() => go(1)} aria-label="Next"><SkipForward/></button><button className={repeat !== 'off' ? 'active' : ''} onClick={() => setRepeat(repeat === 'off' ? 'all' : repeat === 'all' ? 'one' : 'off')} aria-label={`Repeat ${repeat}`}>{repeat === 'one' ? <Repeat1/> : <Repeat/>}</button></div><div className="up-next"><h2>Nästa låtar</h2>{playable.map((song, songIndex) => <button className={songIndex === index ? 'active' : ''} key={song.id} onClick={() => chooseTrack(songIndex)}><span>{songIndex + 1}</span><span><strong>{song.title}</strong><small>{words(song.artist || song.composer)}</small></span></button>)}</div></main>;
}

function Navigation({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const items: [Page, string, typeof Home][] = [['library', 'Hem', Home], ['songs', 'Sök', Search], ['playlists', 'Bibliotek', ListMusic], ['player', 'Spelare', CirclePlay]];
  return <nav className="bottom-nav">{items.map(([id, label, Icon]) => <button key={id} className={page === id ? 'active' : ''} onClick={() => setPage(id)}><Icon/><span>{label}</span></button>)}</nav>;
}

export default function App() {
  const [songs, setSongs] = useState<Song[]>([]); const [schema, setSchema] = useState<Schema>(); const [playlists, setPlaylists] = useState<Playlist[]>([]); const [page, setPage] = useState<Page>('library'); const [selected, setSelected] = useState<Song>(); const [activePlaylist, setActivePlaylist] = useState<Playlist>(); const [error, setError] = useState<{ message: string; details?: string[] }>(); const [loading, setLoading] = useState(true);
  const loadCatalog = useCallback(async () => { setLoading(true); setError(undefined); try { const data = await api.catalog(); setSongs(data.songs); setSchema(data.schema); } catch (caught) { const value = caught as Error & { details?: string[] }; setError({ message: value.message, details: value.details }); } finally { setLoading(false); } }, []);
  const loadPlaylists = useCallback(async () => { try { setPlaylists((await api.playlists()).playlists); } catch (caught) { const value = caught as Error; setError({ message: value.message }); } }, []);
  useEffect(() => { loadCatalog(); loadPlaylists(); }, [loadCatalog, loadPlaylists]);
  const [addingSong, setAddingSong] = useState<Song>(); const [addName, setAddName] = useState(''); const [addError, setAddError] = useState(''); const [adding, setAdding] = useState(false);
  const playSong = (song: Song) => setActivePlaylist({ id: `song-${song.id}`, name: song.title, type: 'manual', song_ids: [song.id] });
  const addSong = async (list?: Playlist) => { if (!addingSong) return; setAdding(true); setAddError(''); try { if (list) await api.updatePlaylist({ ...list, song_ids: [...new Set([...(list.song_ids || []), addingSong.id])] }); else await api.createPlaylist({ name: addName.trim(), type: 'manual', song_ids: [addingSong.id] }); await loadPlaylists(); setAddingSong(undefined); setAddName(''); } catch (caught) { setAddError((caught as Error).message); } finally { setAdding(false); } };
  const openSong = (song: Song) => { setSelected(song); setPage('songs'); };
  if (loading) return <div className="loading"><span>V</span></div>;
  if (error || !schema) return <main className="fatal"><div>!</div><h1>Song database unavailable</h1><p>{error?.message || 'Unknown schema error'}</p>{error?.details?.length && <pre>{error.details.join('\n')}</pre>}<button onClick={loadCatalog}><RefreshCw/> Try again</button></main>;
  return <div className={`app-shell ${activePlaylist ? 'has-player' : ''}`}>
    {(page === 'library' || (page === 'songs' && !selected)) && <Library songs={songs} schema={schema} playlists={playlists} reloadPlaylists={loadPlaylists} onOpen={openSong} onPlay={playSong}/>}
    {page === 'songs' && selected && <SongDetail song={selected} onBack={() => setSelected(undefined)} onPlay={() => playSong(selected)} onAdd={() => { setAddError(''); setAddingSong(selected); }}/>}
    {page === 'playlists' && <PlaylistComposer songs={songs} schema={schema} playlists={playlists} reload={loadPlaylists} onPlay={setActivePlaylist}/>}
    {activePlaylist && <PlayerPage songs={songs} playlist={activePlaylist} expanded={page === 'player'} onExpand={() => setPage(page === 'player' ? 'library' : 'player')} onAdd={song => { setAddError(''); setAddingSong(song); }}/>}
    {page === 'player' && !activePlaylist && <main className="page empty"><CirclePlay/><h1>Ingen låt vald</h1><p>Spela en låt eller spellista för att börja.</p></main>}
    {addingSong && <div className="modal-backdrop"><section className="playlist-sheet" role="dialog" aria-modal="true" aria-label="Lägg till i spellista"><header><h2>{addingSong.title}</h2><button aria-label="Stäng" onClick={() => setAddingSong(undefined)}><X/></button></header>{addError && <p role="alert">{addError}</p>}{playlists.filter(list => list.type !== 'dynamic').map(list => <button className="secondary-action" disabled={adding} key={list.id} onClick={() => addSong(list)}>{list.name}</button>)}<label className="field"><span>Ny spellista</span><input value={addName} onChange={event => setAddName(event.target.value)}/></label><button className="primary-action" disabled={adding || !addName.trim()} onClick={() => addSong()}>Skapa och lägg till</button></section></div>}
    <Navigation page={page} setPage={next => { setPage(next); setSelected(undefined); }}/>
  </div>;
}
