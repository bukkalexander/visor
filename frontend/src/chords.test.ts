import { describe, expect, it } from 'vitest';
import { chordPitchClasses, parseChordLine } from './chords';

describe('ChordPro lyrics', () => {
  it('places each chord on the following lyric segment', () => {
    expect(parseChordLine('[C]Imse vimse [G7]spindel')).toEqual([
      { chord: 'C', text: 'Imse vimse ' }, { chord: 'G7', text: 'spindel' }
    ]);
  });
  it('keeps lyric text before the first chord', () => expect(parseChordLine('Hej [F]du')).toEqual([{ text: 'Hej ' }, { chord: 'F', text: 'du' }]));
  it('derives major, minor and seventh piano notes', () => {
    expect(chordPitchClasses('C')).toEqual([0, 4, 7]);
    expect(chordPitchClasses('G7')).toEqual([7, 11, 2, 5]);
    expect(chordPitchClasses('Am')).toEqual([9, 0, 4]);
  });
});
