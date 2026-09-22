import { describe, expect, it } from 'vitest';
import { parseQuery, searchSongs } from './query';
import type { Song } from './types';

const songs: Song[] = [
  { id: 'pippi', title: 'Pippi', language: 'Swedish', artist: ['Astrid Lindgren'], universe: ['Pippi Långstrump'], video: 'https://youtu.be/12345678901' },
  { id: 'emil', title: 'Emil', language: 'Swedish', artist: ['Astrid Lindgren'], universe: ['Emil i Lönneberga'], lyrics: 'text' }
];
const fields = ['id', 'title', 'language', 'artist', 'universe'];

describe('song query', () => {
  it('supports substring search', () => expect(searchSongs(songs, 'långstrump', fields)[0].id).toBe('pippi'));
  it('supports equals, similar, and boolean grouping', () => {
    expect(searchSongs(songs, 'artist="Astrid Lindgren" AND (universe~="Pippi" OR title="None")', fields).map(song => song.id)).toEqual(['pippi']);
  });
  it('supports IN with quoted values', () => expect(searchSongs(songs, 'universe in ("Pippi Långstrump", "Elsewhere")', fields)[0].id).toBe('pippi'));
  it('reports invalid fields and unquoted values', () => {
    expect(() => parseQuery('planet="Earth"', fields)).toThrow('Unknown field');
    expect(() => parseQuery('title=Pippi', fields)).toThrow('double quotes');
  });
});
