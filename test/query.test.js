import test from 'node:test';
import assert from 'node:assert/strict';
import { songs } from '../public/catalog.js';
import { matchesQuery, matchesText, parseQuery } from '../public/query.js';

test('free text searches across structured metadata', () => {
  assert.equal(matchesText(songs[0], 'Astrid Pippi'), true);
  assert.equal(matchesText(songs[0], 'Emil'), false);
});

test('query supports quoted values and AND', () => {
  assert.equal(matchesQuery(songs[2], 'universe:Emil AND composer:"Georg Riedel"'), true);
  assert.equal(matchesQuery(songs[2], 'universe:Pippi AND composer:"Georg Riedel"'), false);
});

test('query validates field names and syntax', () => {
  assert.throws(() => parseQuery('planet:Jorden'), /Okänt fält/);
  assert.throws(() => parseQuery('bara text'), /Kunde inte tolka/);
});
