export type RepeatMode = 'off' | 'one' | 'all';

export function nextTrackIndex(current: number, length: number, direction: 1 | -1, repeat: RepeatMode, random = Math.random): number | null {
  if (!length) return null;
  if (repeat === 'one' && direction === 1) return current;
  if (direction === 1 && current < length - 1) return current + 1;
  if (direction === -1 && current > 0) return current - 1;
  if (repeat === 'all') return direction === 1 ? 0 : length - 1;
  return null;
}

export function shuffledTrackIndex(current: number, length: number, random = Math.random): number | null {
  if (!length) return null;
  if (length === 1) return current;
  const candidate = Math.floor(random() * (length - 1));
  return candidate >= current ? candidate + 1 : candidate;
}

export function shouldRecoverPlayback(desiredPlaying: boolean, playerState: number, playingState: number, bufferingState: number): boolean {
  return desiredPlaying && playerState !== playingState && playerState !== bufferingState;
}
