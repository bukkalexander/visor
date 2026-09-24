import { searchSongs } from './query';
import type { Playlist, Song } from './types';

export function resolvePlaylist(playlist: Playlist, songs: Song[], fields: string[]): Song[] {
  if (playlist.type === 'dynamic') return searchSongs(songs, playlist.query || '', fields);
  return (playlist.song_ids || []).map(id => songs.find(song => song.id === id)).filter((song): song is Song => !!song);
}
