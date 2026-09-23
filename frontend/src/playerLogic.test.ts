import { describe, expect, it } from 'vitest';
import { nextTrackIndex, shouldRecoverPlayback, shuffledTrackIndex } from './playerLogic';

describe('playlist transitions', () => {
  it('advances and stops at the end without repeat', () => {
    expect(nextTrackIndex(0, 2, 1, 'off')).toBe(1);
    expect(nextTrackIndex(1, 2, 1, 'off')).toBeNull();
  });
  it('wraps list repeat and holds single repeat', () => {
    expect(nextTrackIndex(1, 2, 1, 'all')).toBe(0);
    expect(nextTrackIndex(1, 2, 1, 'one')).toBe(1);
  });
  it('never shuffles to the current track when alternatives exist', () => {
    expect(shuffledTrackIndex(1, 3, () => 0)).toBe(0);
    expect(shuffledTrackIndex(1, 3, () => .99)).toBe(2);
  });
  it('recovers only when desired playback is neither playing nor buffering', () => {
    expect(shouldRecoverPlayback(true, 2, 1, 3)).toBe(true);
    expect(shouldRecoverPlayback(true, 3, 1, 3)).toBe(false);
    expect(shouldRecoverPlayback(false, 2, 1, 3)).toBe(false);
  });
});
