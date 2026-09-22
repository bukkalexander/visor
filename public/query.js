import { fields } from './catalog.js';

const flatten = value => Array.isArray(value) ? value.join(' ') : String(value ?? '');
const normal = value => flatten(value).toLocaleLowerCase('sv-SE');

export function matchesText(song, text) {
  if (!text.trim()) return true;
  const haystack = Object.values(song).map(normal).join(' ');
  return text.toLocaleLowerCase('sv-SE').trim().split(/\s+/).every(word => haystack.includes(word));
}

export function parseQuery(input) {
  if (!input.trim()) return [];
  return input.split(/\s+AND\s+/i).map(part => {
    const match = part.trim().match(/^([a-z]+)\s*:\s*(?:"([^"]+)"|(.+))$/i);
    if (!match) throw new Error(`Kunde inte tolka ”${part.trim()}”`);
    const field = match[1].toLowerCase();
    if (!fields[field]) throw new Error(`Okänt fält: ${field}`);
    return { property: fields[field], value: (match[2] || match[3]).trim() };
  });
}

export function matchesQuery(song, input) {
  return parseQuery(input).every(({ property, value }) => normal(song[property]).includes(normal(value)));
}
