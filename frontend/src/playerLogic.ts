export type RepeatMode = "off" | "one" | "all";

export function nextTrackIndex(
  current: number,
  length: number,
  direction: 1 | -1,
  repeat: RepeatMode,
  automatic = true,
): number | null {
  if (!length) return null;
  if (repeat === "one" && direction === 1 && automatic) return current;
  if (direction === 1 && current < length - 1) return current + 1;
  if (direction === -1 && current > 0) return current - 1;
  if (repeat === "all") return direction === 1 ? 0 : length - 1;
  return null;
}

/** Shuffle only songs still to come so the visible queue is the actual play order. */
export function shuffleUpcoming<T>(
  queue: T[],
  current: number,
  random = Math.random,
): T[] {
  const upcoming = queue.slice(current + 1);
  for (let i = upcoming.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [upcoming[i], upcoming[j]] = [upcoming[j], upcoming[i]];
  }
  return [...queue.slice(0, current + 1), ...upcoming];
}

/** Find a usable next item, visiting each entry at most once even when repeating. */
export function nextAvailableIndex<T>(
  queue: T[],
  current: number,
  usable: (item: T) => boolean,
  wrap = false,
): number | null {
  for (let step = 1; step <= queue.length; step++) {
    const candidate = current + step;
    if (candidate >= queue.length && !wrap) return null;
    const index = candidate % queue.length;
    if (usable(queue[index])) return index;
  }
  return null;
}

export function shuffledTrackIndex(
  current: number,
  length: number,
  random = Math.random,
): number | null {
  if (!length) return null;
  if (length === 1) return current;
  const candidate = Math.floor(random() * (length - 1));
  return candidate >= current ? candidate + 1 : candidate;
}

export function shouldRecoverPlayback(
  desiredPlaying: boolean,
  playerState: number,
  playingState: number,
  bufferingState: number,
): boolean {
  return (
    desiredPlaying &&
    playerState !== playingState &&
    playerState !== bufferingState
  );
}
