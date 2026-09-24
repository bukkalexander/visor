import { describe, expect, it } from 'vitest';
import { resolvePlaylist } from './playlistLogic';
import type { Song } from './types';

const songs: Song[] = [
  { id: 'night', title: 'Night song', language: 'Swedish', lyrics: 'text', tags: ['children', 'bedtime', 'calm'] },
  { id: 'game', title: 'Game song', language: 'Swedish', lyrics: 'text', tags: ['movement'] }
];
const fields = ['id', 'title', 'language', 'lyrics', 'tags'];

describe('dynamic playlists', () => {
  it('treats an empty query as all songs', () => expect(resolvePlaylist({ id: 'all', name: 'All', type: 'dynamic', query: '' }, songs, fields)).toHaveLength(2));
  it('re-evaluates a stored query against catalogue metadata', () => expect(resolvePlaylist({ id: 'bed', name: 'Bedtime', type: 'dynamic', query: 'tags = "bedtime"' }, songs, fields).map(song => song.id)).toEqual(['night']));
  it('keeps manual ordering', () => expect(resolvePlaylist({ id: 'manual', name: 'Manual', type: 'manual', song_ids: ['game', 'night'] }, songs, fields).map(song => song.id)).toEqual(['game', 'night']));
});
