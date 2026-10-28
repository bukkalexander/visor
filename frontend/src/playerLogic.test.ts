import { describe, expect, it } from "vitest";
import {
  nextAvailableIndex,
  nextTrackIndex,
  shuffleUpcoming,
  shouldRecoverPlayback,
  shuffledTrackIndex,
} from "./playerLogic";

describe("playlist transitions", () => {
  it("advances and stops at the end without repeat", () => {
    expect(nextTrackIndex(0, 2, 1, "off")).toBe(1);
    expect(nextTrackIndex(1, 2, 1, "off")).toBeNull();
  });
  it("wraps list repeat and holds single repeat", () => {
    expect(nextTrackIndex(1, 2, 1, "all")).toBe(0);
    expect(nextTrackIndex(1, 2, 1, "one")).toBe(1);
  });
  it("manual next ignores repeat-one and stops at the end", () => {
    expect(nextTrackIndex(0, 2, 1, "one", false)).toBe(1);
    expect(nextTrackIndex(1, 2, 1, "one", false)).toBeNull();
  });
  it("shuffle preserves current and history and includes each upcoming song once", () => {
    const original = ["a", "b", "c", "d", "e"];
    const result = shuffleUpcoming(original, 1, () => 0);
    expect(result.slice(0, 2)).toEqual(["a", "b"]);
    expect(result.slice(2).sort()).toEqual(["c", "d", "e"]);
    expect(original).toEqual(["a", "b", "c", "d", "e"]);
  });
  it("skips unavailable songs and never loops when every song is unavailable", () => {
    expect(nextAvailableIndex(["a", "b", "c"], 0, (id) => id !== "b")).toBe(2);
    expect(
      nextAvailableIndex(["a", "b", "c"], 2, (id) => id === "a", true),
    ).toBe(0);
    expect(nextAvailableIndex(["a", "b", "c"], 2, () => true)).toBeNull();
    expect(
      nextAvailableIndex(["a", "b", "c"], 0, () => false, true),
    ).toBeNull();
    expect(nextAvailableIndex([], 0, () => true, true)).toBeNull();
  });
  it("never shuffles to the current track when alternatives exist", () => {
    expect(shuffledTrackIndex(1, 3, () => 0)).toBe(0);
    expect(shuffledTrackIndex(1, 3, () => 0.99)).toBe(2);
  });
  it("recovers only when desired playback is neither playing nor buffering", () => {
    expect(shouldRecoverPlayback(true, 2, 1, 3)).toBe(true);
    expect(shouldRecoverPlayback(true, 3, 1, 3)).toBe(false);
    expect(shouldRecoverPlayback(false, 2, 1, 3)).toBe(false);
  });
});
