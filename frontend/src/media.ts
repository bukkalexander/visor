/** Only accept video IDs from known YouTube URL shapes, never arbitrary embed URLs. */
export function videoId(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return undefined;
    const host = url.hostname.toLowerCase();
    let id: string | null | undefined;
    if (host === "youtu.be" || host === "www.youtu.be") {
      id = url.pathname.split("/")[1];
    } else if (
      [
        "youtube.com",
        "www.youtube.com",
        "m.youtube.com",
        "music.youtube.com",
        "youtube-nocookie.com",
        "www.youtube-nocookie.com",
      ].includes(host)
    ) {
      const parts = url.pathname.split("/");
      if (parts[1] === "watch") id = url.searchParams.get("v");
      else if (["embed", "shorts", "live"].includes(parts[1])) id = parts[2];
    }
    return id && /^[\w-]{11}$/.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}
