import type { Song } from './types';

type Token = { kind: 'word' | 'string' | 'operator' | 'left' | 'right' | 'comma'; value: string };
type Expression =
  | { kind: 'condition'; field: string; operator: '=' | '~=' | 'in'; values: string[] }
  | { kind: 'and'; left: Expression; right: Expression }
  | { kind: 'or'; left: Expression; right: Expression };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (/\s/.test(char)) { index += 1; continue; }
    if (char === '(' || char === ')' || char === ',') {
      tokens.push({ kind: char === '(' ? 'left' : char === ')' ? 'right' : 'comma', value: char }); index += 1; continue;
    }
    if (input.slice(index, index + 2) === '~=') { tokens.push({ kind: 'operator', value: '~=' }); index += 2; continue; }
    if (char === '=') { tokens.push({ kind: 'operator', value: '=' }); index += 1; continue; }
    if (char === '"') {
      let value = ''; index += 1;
      while (index < input.length && input[index] !== '"') {
        if (input[index] === '\\' && input[index + 1] === '"') { value += '"'; index += 2; } else { value += input[index]; index += 1; }
      }
      if (input[index] !== '"') throw new Error('Missing closing quote');
      tokens.push({ kind: 'string', value }); index += 1; continue;
    }
    const match = input.slice(index).match(/^[\p{L}\p{N}_-]+/u);
    if (!match) throw new Error(`Unexpected character “${char}”`);
    tokens.push({ kind: 'word', value: match[0] }); index += match[0].length;
  }
  return tokens;
}

export function parseQuery(input: string, allowedFields: string[]): Expression {
  const tokens = tokenize(input);
  let position = 0;
  const peek = () => tokens[position];
  const take = () => tokens[position++];
  const keyword = (name: string) => peek()?.kind === 'word' && peek().value.toLowerCase() === name;

  function primary(): Expression {
    if (peek()?.kind === 'left') {
      take(); const expression = or();
      if (take()?.kind !== 'right') throw new Error('Missing closing parenthesis');
      return expression;
    }
    const field = take();
    if (!field || field.kind !== 'word') throw new Error('Expected a field name');
    const canonical = allowedFields.find(item => item.toLowerCase() === field.value.toLowerCase());
    if (!canonical) throw new Error(`Unknown field “${field.value}”`);
    let operator: '=' | '~=' | 'in';
    if (peek()?.kind === 'operator') operator = take().value as '=' | '~=';
    else if (keyword('in')) { take(); operator = 'in'; }
    else throw new Error(`Expected =, ~=, or in after “${field.value}”`);
    const values: string[] = [];
    if (operator === 'in') {
      if (take()?.kind !== 'left') throw new Error('Expected ( after in');
      while (true) {
        const value = take();
        if (!value || value.kind !== 'string') throw new Error('Query values must use double quotes');
        values.push(value.value);
        if (peek()?.kind === 'comma') { take(); continue; }
        if (take()?.kind !== 'right') throw new Error('Expected comma or )');
        break;
      }
    } else {
      const value = take();
      if (!value || value.kind !== 'string') throw new Error('Query values must use double quotes');
      values.push(value.value);
    }
    return { kind: 'condition', field: canonical, operator, values };
  }
  function and(): Expression {
    let left = primary();
    while (keyword('and')) { take(); left = { kind: 'and', left, right: primary() }; }
    return left;
  }
  function or(): Expression {
    let left = and();
    while (keyword('or')) { take(); left = { kind: 'or', left, right: and() }; }
    return left;
  }
  if (!tokens.length) throw new Error('Enter a query');
  const result = or();
  if (position !== tokens.length) throw new Error(`Unexpected “${peek().value}”`);
  return result;
}

const fold = (value: unknown) => (Array.isArray(value) ? value.join(' ') : String(value ?? '')).toLocaleLowerCase();
function evaluate(song: Song, expression: Expression): boolean {
  if (expression.kind === 'and') return evaluate(song, expression.left) && evaluate(song, expression.right);
  if (expression.kind === 'or') return evaluate(song, expression.left) || evaluate(song, expression.right);
  const raw = song[expression.field as keyof Song];
  const actual = (Array.isArray(raw) ? raw : [raw]).map(fold);
  return expression.values.some(value => expression.operator === '~='
    ? actual.some(item => item.includes(fold(value)))
    : actual.some(item => item === fold(value)));
}

export function searchSongs(songs: Song[], query: string, fields: string[]): Song[] {
  const term = query.trim();
  if (!term) return songs;
  const looksStructured = /(?:~=|=|\bin\s*\()/i.test(term);
  if (looksStructured) {
    const expression = parseQuery(term, fields);
    return songs.filter(song => evaluate(song, expression));
  }
  const needle = fold(term);
  return songs.filter(song => fields.some(field => fold(song[field as keyof Song]).includes(needle)));
}
