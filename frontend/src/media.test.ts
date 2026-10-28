import { describe, expect, it } from "vitest";
import { videoId } from "./media";

describe("YouTube source parsing", () => {
  it("accepts watch, short, embed and share links", () => {
    for (const url of [
      "https://www.youtube.com/watch?v=XO2EVGi1Rb4&t=30",
      "https://youtu.be/XO2EVGi1Rb4?si=share",
      "https://m.youtube.com/shorts/XO2EVGi1Rb4",
      "https://www.youtube-nocookie.com/embed/XO2EVGi1Rb4",
      "https://youtube.com/live/XO2EVGi1Rb4",
    ])
      expect(videoId(url)).toBe("XO2EVGi1Rb4");
  });
  it("rejects hostile hosts, unsafe schemes, playlists and malformed IDs", () => {
    for (const url of [
      "https://youtube.com.evil.example/watch?v=XO2EVGi1Rb4",
      "https://example.com/youtube.com/watch?v=XO2EVGi1Rb4",
      "javascript:alert(1)",
      "ftp://youtube.com/watch?v=XO2EVGi1Rb4",
      "https://youtube.com/playlist?list=XO2EVGi1Rb4",
      "https://youtu.be/invalid",
      "",
    ])
      expect(videoId(url)).toBeUndefined();
  });
});
