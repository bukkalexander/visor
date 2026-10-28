import { Disc3, ListMusic, Music2, UserRound } from "lucide-react";

export default function Artwork({
  title,
  kind = "song",
  className = "",
  size,
}: {
  title: string;
  kind?: "song" | "album" | "artist" | "playlist";
  className?: string;
  size?: "small" | "large";
}) {
  const tone =
    [...title].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 4;
  const Icon =
    kind === "artist"
      ? UserRound
      : kind === "album"
        ? Disc3
        : kind === "playlist"
          ? ListMusic
          : Music2;
  return (
    <div
      aria-hidden="true"
      className={`artwork art-${kind} art-tone-${tone} ${size ? `art-${size}` : ""} ${className}`}
    >
      <div className="art-orbit" />
      <Icon />
      <span className="art-letter">
        {title.trim().charAt(0).toLocaleUpperCase("sv")}
      </span>
    </div>
  );
}
