import { useState } from 'react';

export type ChordSegment = { chord?: string; text: string };

export function parseChordLine(line: string): ChordSegment[] {
  const segments: ChordSegment[] = [];
  const pattern = /\[([^\]]+)]/g;
  let chord: string | undefined;
  let cursor = 0;
  for (const match of line.matchAll(pattern)) {
    const before = line.slice(cursor, match.index);
    if (before || (!segments.length && match.index)) segments.push({ chord, text: before });
    chord = match[1].trim();
    cursor = (match.index || 0) + match[0].length;
  }
  const remainder = line.slice(cursor);
  if (remainder || chord) segments.push({ chord, text: remainder });
  return segments.length ? segments : [{ text: line }];
}

const shapes: Record<string, (number | 'x')[]> = {
  C: ['x', 3, 2, 0, 1, 0], G: [3, 2, 0, 0, 0, 3], G7: [3, 2, 0, 0, 0, 1],
  F: [1, 3, 3, 2, 1, 1], D: ['x', 'x', 0, 2, 3, 2], D7: ['x', 'x', 0, 2, 1, 2],
  A: ['x', 0, 2, 2, 2, 0], A7: ['x', 0, 2, 0, 2, 0], E: [0, 2, 2, 1, 0, 0], E7: [0, 2, 0, 1, 0, 0]
};

const noteNames: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
export function chordPitchClasses(chord: string): number[] {
  const match = chord.match(/^([A-G](?:#|b)?)(.*)$/);
  if (!match || noteNames[match[1]] === undefined) return [];
  const root = noteNames[match[1]];
  const quality = match[2];
  const third = quality.startsWith('m') && !quality.startsWith('maj') ? 3 : 4;
  const intervals = [0, third, 7];
  if (/maj7/i.test(quality)) intervals.push(11); else if (/7/.test(quality)) intervals.push(10);
  return intervals.map(interval => (root + interval) % 12);
}

function GuitarDiagram({ chord }: { chord: string }) {
  const shape = shapes[chord];
  if (!shape) return <div className="unknown-shape">No guitar shape saved</div>;
  return <svg className="guitar-diagram" viewBox="0 0 112 116" role="img" aria-label={`${chord} guitar chord`}>
    {[0, 1, 2, 3, 4, 5].map(string => <line key={`s${string}`} x1={26 + string * 13} y1="22" x2={26 + string * 13} y2="102"/>)}
    {[0, 1, 2, 3, 4, 5].map(fret => <line key={`f${fret}`} x1="26" y1={22 + fret * 16} x2="91" y2={22 + fret * 16}/>) }
    {shape.map((fret, string) => fret === 'x' || fret === 0
      ? <text key={string} x={26 + string * 13} y="14" textAnchor="middle">{fret === 'x' ? '×' : '○'}</text>
      : <circle key={string} cx={26 + string * 13} cy={22 + (fret - .5) * 16} r="5"/>)}
  </svg>;
}

function PianoDiagram({ chord }: { chord: string }) {
  const active = chordPitchClasses(chord);
  return <div className="piano-diagram" role="img" aria-label={`${chord} piano chord`}>
    {Array.from({ length: 12 }, (_, note) => <span key={note} className={`${[1,3,6,8,10].includes(note) ? 'black' : 'white'} ${active.includes(note) ? 'active' : ''}`}/>) }
  </div>;
}

function Chord({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  return <span className="chord-anchor">
    <button className="chord-name" type="button" onClick={() => setOpen(!open)} aria-expanded={open}>{name}</button>
    {open && <span className="chord-popover"><strong>{name}</strong><span className="diagram-label">Guitar</span><GuitarDiagram chord={name}/><span className="diagram-label">Piano</span><PianoDiagram chord={name}/></span>}
  </span>;
}

export function ChordLyrics({ lyrics }: { lyrics: string }) {
  return <div className="chord-lyrics">{lyrics.split('\n').map((line, lineIndex) =>
    line ? <div className="chord-line" key={lineIndex}>{parseChordLine(line).map((segment, index) => <span className="lyric-segment" key={`${lineIndex}-${index}`}>{segment.chord && <Chord name={segment.chord}/>}<span>{segment.text || '\u00a0'}</span></span>)}</div> : <div className="chord-line blank" key={lineIndex}/>
  )}</div>;
}
