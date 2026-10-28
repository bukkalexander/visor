import { useEffect, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  ListMusic,
  LoaderCircle,
  Maximize2,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { Song } from "./types";
import { videoId } from "./media";
import {
  nextAvailableIndex,
  nextTrackIndex,
  shuffleUpcoming,
  type RepeatMode,
} from "./playerLogic";
import { useDialogFocus } from "./useDialogFocus";
import "./Player.css";

export type PlaybackRequest = {
  key: number;
  name: string;
  songs: Song[];
  startId?: string;
};
type Props = {
  request: PlaybackRequest;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  onClose: () => void;
  onAdd: (song: Song) => void;
  onOpen: (song: Song) => void;
  onTrackChange: (song: Song | undefined) => void;
};
type YouTubePlayer = {
  loadVideoById: (id: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (time: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  getVolume: () => number;
  setVolume: (volume: number) => void;
  isMuted: () => boolean;
  mute: () => void;
  unMute: () => void;
  getIframe: () => HTMLIFrameElement;
  getVideoData: () => { video_id?: string };
  destroy: () => void;
};
type YouTubeAPI = {
  Player: new (element: HTMLElement, options: object) => YouTubePlayer;
};
type YouTubeWindow = Window & {
  YT?: YouTubeAPI;
  onYouTubeIframeAPIReady?: () => void;
};
let apiPromise: Promise<YouTubeAPI> | undefined;

function loadYouTube(): Promise<YouTubeAPI> {
  const youtubeWindow = window as YouTubeWindow;
  if (youtubeWindow.YT?.Player) return Promise.resolve(youtubeWindow.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<YouTubeAPI>((resolve, reject) => {
    const previousReady = youtubeWindow.onYouTubeIframeAPIReady;
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    const fail = () => {
      window.clearTimeout(timeout);
      script?.remove();
      apiPromise = undefined;
      reject(
        new Error(
          "YouTube kunde inte laddas. Kontrollera anslutningen och försök igen.",
        ),
      );
    };
    const timeout = window.setTimeout(fail, 12000);
    youtubeWindow.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      previousReady?.();
      if (youtubeWindow.YT?.Player) resolve(youtubeWindow.YT);
      else fail();
    };
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.addEventListener("error", fail, { once: true });
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}

const playableSongs = (songs: Song[]) =>
  songs.filter((song) => videoId(song.video));
const credit = (song: Song) =>
  song.artist?.join(", ") ||
  (song.composer?.length
    ? `Musik: ${song.composer.join(", ")}`
    : "Artist saknas");
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
type Phase =
  | "loading"
  | "playing"
  | "paused"
  | "buffering"
  | "blocked"
  | "error"
  | "ended";

export default function Player({
  request,
  expanded,
  onExpand,
  onCollapse,
  onClose,
  onAdd,
  onOpen,
  onTrackChange,
}: Props) {
  const [queue, setQueue] = useState(() => playableSongs(request.songs));
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      playableSongs(request.songs).findIndex(
        (song) => song.id === request.startId,
      ),
    ),
  );
  const [revision, setRevision] = useState(0);
  const [repeat, setRepeat] = useState<RepeatMode>("off");
  const [shuffle, setShuffle] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("loading");
  const [ready, setReady] = useState(false);
  const [apiAttempt, setApiAttempt] = useState(0);
  const [message, setMessage] = useState("");
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [muted, setMuted] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YouTubePlayer | undefined>(undefined);
  const failed = useRef(new Set<string>());
  const originalOrder = useRef(queue);
  const queueRef = useRef(queue);
  const indexRef = useRef(index);
  const phaseRef = useRef(phase);
  const repeatRef = useRef(repeat);
  const activeRequest = useRef(request.key);
  const started = useRef(false);
  const loadedVideo = useRef<string | undefined>(undefined);
  const changeCallback = useRef(onTrackChange);
  const events = useRef({
    state: (_state: number) => {},
    error: (_code: number) => {},
  });
  queueRef.current = queue;
  indexRef.current = index;
  phaseRef.current = phase;
  repeatRef.current = repeat;
  changeCallback.current = onTrackChange;
  const current = queue[index];
  const playing = phase === "playing";
  const busy = phase === "loading" || phase === "buffering";

  useDialogFocus(expanded, ".player-expanded", onCollapse);
  useDialogFocus(queueOpen, ".player-queue", () => setQueueOpen(false));

  useEffect(() => {
    if (activeRequest.current === request.key) return;
    activeRequest.current = request.key;
    const songs = playableSongs(request.songs);
    originalOrder.current = songs;
    failed.current.clear();
    queueRef.current = songs;
    indexRef.current = Math.max(
      0,
      songs.findIndex((song) => song.id === request.startId),
    );
    setQueue(songs);
    setIndex(indexRef.current);
    setRevision((value) => value + 1);
    setShuffle(false);
    setMessage("");
  }, [request]);

  useEffect(() => {
    changeCallback.current(current);
  }, [current]);

  function chooseTrack(next: number) {
    if (!queueRef.current[next]) return;
    indexRef.current = next;
    setIndex(next);
    setRevision((value) => value + 1);
    setMessage("");
    setPhase("loading");
    started.current = false;
  }

  function go(direction: 1 | -1, automatic = false) {
    const list = queueRef.current;
    if (
      direction === -1 &&
      !automatic &&
      (player.current?.getCurrentTime() || 0) > 3
    ) {
      player.current?.seekTo(0, true);
      setTime(0);
      return;
    }
    let next = nextTrackIndex(
      indexRef.current,
      list.length,
      direction,
      repeatRef.current,
      automatic,
    );
    if (next !== null && failed.current.has(list[next].id)) {
      if (direction === 1)
        next = nextAvailableIndex(
          list,
          indexRef.current,
          (song) => !failed.current.has(song.id),
          repeatRef.current === "all",
        );
      else {
        next = null;
        for (let step = 1; step <= list.length; step++) {
          const candidate = indexRef.current - step;
          if (candidate < 0 && repeatRef.current !== "all") break;
          const position = (candidate + list.length) % list.length;
          if (!failed.current.has(list[position].id)) {
            next = position;
            break;
          }
        }
      }
    }
    if (next === null) {
      if (direction === 1) {
        player.current?.pauseVideo();
        setPhase("ended");
      }
      return;
    }
    chooseTrack(next);
  }

  events.current.state = (state) => {
    const video = player.current?.getVideoData()?.video_id;
    if (video && video !== loadedVideo.current) return;
    if (state === 1) {
      started.current = true;
      setPhase("playing");
      setMessage("");
    } else if (state === 2) setPhase("paused");
    else if (state === 3) setPhase("buffering");
    else if (state === 0 && started.current) {
      started.current = false;
      go(1, true);
    }
  };
  events.current.error = (code) => {
    const song = queueRef.current[indexRef.current];
    if (!song) return;
    started.current = false;
    if ([2, 5, 100, 101, 150].includes(code)) {
      failed.current.add(song.id);
      const next = nextAvailableIndex(
        queueRef.current,
        indexRef.current,
        (item) => !failed.current.has(item.id),
        repeatRef.current === "all",
      );
      if (next !== null) {
        chooseTrack(next);
        setMessage(
          `”${song.title}” kan inte spelas här. Hoppar till nästa låt.`,
        );
        return;
      }
    }
    setPhase("error");
    setMessage(
      code === 153
        ? "YouTube kunde inte verifiera spelaren. Öppna videon på YouTube eller försök igen."
        : "Videon kan inte spelas här. Öppna den på YouTube eller välj en annan låt.",
    );
  };

  useEffect(() => {
    let cancelled = false;
    let readyTimeout: number | undefined;
    setReady(false);
    setPhase("loading");
    loadYouTube()
      .then((api) => {
        if (cancelled || !host.current) return;
        const mount = document.createElement("div");
        host.current.replaceChildren(mount);
        readyTimeout = window.setTimeout(() => {
          if (!cancelled) {
            setPhase("error");
            setMessage(
              "Videospelaren svarar inte. Försök igen eller öppna videon på YouTube.",
            );
          }
        }, 12000);
        player.current = new api.Player(mount, {
          host: "https://www.youtube-nocookie.com",
          width: "100%",
          height: "100%",
          playerVars: {
            playsinline: 1,
            rel: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: () => {
              if (cancelled) return;
              window.clearTimeout(readyTimeout);
              player.current
                ?.getIframe()
                .setAttribute("title", "YouTube-videospelare");
              player.current?.setVolume(80);
              setReady(true);
            },
            onStateChange: (event: { data: number }) => {
              if (!cancelled) events.current.state(event.data);
            },
            onError: (event: { data: number }) => {
              if (!cancelled) events.current.error(event.data);
            },
            onAutoplayBlocked: () => {
              if (!cancelled) {
                setPhase("blocked");
                setMessage(
                  "Tryck på Spela eller på videon för att starta uppspelningen.",
                );
              }
            },
          },
        });
      })
      .catch((error) => {
        if (!cancelled) {
          setPhase("error");
          setMessage(error.message);
        }
      });
    return () => {
      cancelled = true;
      window.clearTimeout(readyTimeout);
      player.current?.destroy();
      player.current = undefined;
    };
  }, [apiAttempt]);

  useEffect(() => {
    const id = videoId(current?.video);
    if (!ready || !id || !player.current) return;
    loadedVideo.current = id;
    started.current = false;
    setTime(0);
    setDuration(0);
    setPhase("loading");
    player.current.loadVideoById(id);
    const timeout = window.setTimeout(() => {
      if (phaseRef.current === "loading" || phaseRef.current === "buffering") {
        setMessage(
          "Videon tar tid att starta. Tryck på videon eller försök igen.",
        );
        setPhase("blocked");
      }
    }, 12000);
    return () => window.clearTimeout(timeout);
  }, [current?.id, current?.video, ready, revision]);

  useEffect(() => {
    if (!ready) return;
    const timer = window.setInterval(() => {
      const instance = player.current;
      if (!instance) return;
      // Observe real playback only. Never retry play() in a polling loop.
      setTime(Math.max(0, instance.getCurrentTime() || 0));
      setDuration(Math.max(0, instance.getDuration() || 0));
      setVolume(instance.getVolume());
      setMuted(instance.isMuted());
    }, 500);
    return () => window.clearInterval(timer);
  }, [ready]);

  function togglePlay() {
    if (!player.current || !ready) return;
    if (playing || busy) {
      player.current.pauseVideo();
      setPhase("paused");
    } else if (phase === "error" || phase === "ended") {
      if (current) failed.current.delete(current.id);
      chooseTrack(index);
    } else {
      setMessage("");
      player.current.playVideo();
    }
  }

  function toggleShuffle() {
    const prefix = queue.slice(0, index + 1);
    const remaining = queue.slice(index + 1);
    setQueue(
      shuffle
        ? [
            ...prefix,
            ...originalOrder.current.filter((song) =>
              remaining.some((item) => item.id === song.id),
            ),
          ]
        : shuffleUpcoming(queue, index),
    );
    setShuffle(!shuffle);
  }

  function seek(value: number) {
    const target = Math.max(0, Math.min(duration, value));
    player.current?.seekTo(target, true);
    setTime(target);
  }

  const status =
    message ||
    (phase === "loading"
      ? "Ansluter till YouTube…"
      : phase === "buffering"
        ? "Buffrar…"
        : phase === "ended"
          ? "Kön är slut"
          : "");
  const next = nextTrackIndex(index, queue.length, 1, repeat, false);
  const playButton = (
    <button
      className="player-play icon-button"
      onClick={togglePlay}
      disabled={!ready || !current}
      aria-label={playing || busy ? "Pausa" : "Spela"}
    >
      {busy ? (
        <LoaderCircle className="player-spinner" />
      ) : playing ? (
        <Pause fill="currentColor" />
      ) : (
        <Play fill="currentColor" />
      )}
    </button>
  );
  const timeline = (
    <div className="player-timeline">
      <span>{clock(time)}</span>
      <input
        type="range"
        min="0"
        max={duration || 1}
        step="1"
        value={Math.min(time, duration || 1)}
        disabled={!duration || !ready}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label="Position i låten"
        aria-valuetext={`${clock(time)} av ${clock(duration)}`}
      />
      <span>{clock(duration)}</span>
    </div>
  );
  const transport = (
    <div className="player-transport">
      <button
        className={`icon-button player-shuffle ${shuffle ? "player-active" : ""}`}
        onClick={toggleShuffle}
        aria-label="Blanda låtar"
        aria-pressed={shuffle}
      >
        <Shuffle />
      </button>
      <button
        className="icon-button player-previous"
        onClick={() => go(-1)}
        disabled={!ready}
        aria-label="Föregående låt"
      >
        <SkipBack fill="currentColor" />
      </button>
      {playButton}
      <button
        className="icon-button"
        onClick={() => go(1)}
        disabled={!ready || next === null}
        aria-label="Nästa låt"
      >
        <SkipForward fill="currentColor" />
      </button>
      <button
        className={`icon-button player-repeat ${repeat !== "off" ? "player-active" : ""}`}
        onClick={() =>
          setRepeat(repeat === "off" ? "all" : repeat === "all" ? "one" : "off")
        }
        aria-label={`Upprepning: ${repeat === "off" ? "av" : repeat === "one" ? "en låt" : "hela kön"}`}
        aria-pressed={repeat !== "off"}
      >
        {repeat === "one" ? <Repeat1 /> : <Repeat />}
      </button>
    </div>
  );

  return (
    <>
      <section
        className={`player-shell ${expanded ? "player-expanded" : "player-compact"}`}
        role={expanded ? "dialog" : "region"}
        aria-modal={expanded || undefined}
        aria-label={expanded ? "Spelas nu" : "Musikspelare"}
      >
        <header className="player-heading">
          <button
            className="icon-button"
            onClick={onCollapse}
            aria-label="Minimera spelaren"
          >
            <ChevronDown />
          </button>
          <div>
            <span>Spelas från</span>
            <strong>{request.name}</strong>
          </div>
          <button
            className="icon-button"
            onClick={() => setQueueOpen(true)}
            aria-label="Visa spelkö"
          >
            <ListMusic />
          </button>
        </header>
        <div className="player-video">
          <div className="player-video-caption">
            <span>Video · YouTube</span>
            <div>
              <button
                className="icon-button"
                onClick={onExpand}
                aria-label="Förstora spelaren"
              >
                <Maximize2 />
              </button>
              <button
                className="icon-button"
                onClick={onClose}
                aria-label="Stäng spelaren"
              >
                <X />
              </button>
            </div>
          </div>
          <div className="player-video-host" ref={host} />
        </div>
        <div className="player-bar">
          <div className="player-identity">
            <button
              className="player-cover"
              onClick={onExpand}
              aria-label="Öppna spelaren"
            >
              <Music2 />
            </button>
            <button className="player-track" onClick={onExpand}>
              <strong>{current?.title || "Ingen spelbar låt"}</strong>
              <span>{current ? credit(current) : "Välj en låt med video"}</span>
            </button>
            <button
              className="icon-button player-add"
              disabled={!current}
              onClick={() => current && onAdd(current)}
              aria-label="Lägg låten i en spellista"
            >
              <Plus />
            </button>
          </div>
          <div className="player-controls">
            {transport}
            {timeline}
            <div
              className="player-mini-progress"
              role="progressbar"
              aria-label="Låtens framsteg"
              aria-valuemin={0}
              aria-valuemax={duration || 1}
              aria-valuenow={Math.min(time, duration || 1)}
            >
              <span
                style={{
                  width: `${duration ? Math.min(100, (time / duration) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
          <div className="player-tools">
            <button
              className="icon-button player-lyrics"
              disabled={!current}
              onClick={() => {
                if (current) {
                  onCollapse();
                  onOpen(current);
                }
              }}
              aria-label="Visa låttext och ackord"
            >
              <BookOpen />
            </button>
            <button
              className={`icon-button ${queueOpen ? "player-active" : ""}`}
              onClick={() => setQueueOpen(true)}
              aria-label="Visa spelkö"
              aria-expanded={queueOpen}
            >
              <ListMusic />
            </button>
            <div className="player-volume">
              <button
                className="icon-button"
                onClick={() => {
                  if (muted || volume === 0) {
                    player.current?.unMute();
                    if (!volume) {
                      player.current?.setVolume(80);
                      setVolume(80);
                    }
                    setMuted(false);
                  } else {
                    player.current?.mute();
                    setMuted(true);
                  }
                }}
                disabled={!ready}
                aria-label={
                  muted || volume === 0 ? "Slå på ljud" : "Stäng av ljud"
                }
              >
                {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={muted ? 0 : volume}
                disabled={!ready}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  player.current?.unMute();
                  player.current?.setVolume(value);
                  setMuted(false);
                  setVolume(value);
                }}
                aria-label="Volym"
              />
            </div>
            <button
              className="icon-button player-expand"
              onClick={expanded ? onCollapse : onExpand}
              aria-label={expanded ? "Minimera spelaren" : "Förstora spelaren"}
            >
              {expanded ? <ChevronDown /> : <Maximize2 />}
            </button>
          </div>
        </div>
        <div
          className={`player-feedback ${status ? "player-feedback-visible" : ""}`}
          role="status"
        >
          <span>{status}</span>
          {phase === "error" && (
            <button
              className="secondary-action"
              onClick={() => {
                setMessage("");
                if (!ready) setApiAttempt((value) => value + 1);
                else {
                  if (current) failed.current.delete(current.id);
                  chooseTrack(index);
                }
              }}
            >
              Försök igen
            </button>
          )}
          {current && (status || expanded) && (
            <a
              href={`https://www.youtube.com/watch?v=${videoId(current.video)}`}
              target="_blank"
              rel="noreferrer"
            >
              Öppna på YouTube <ExternalLink size={15} />
            </a>
          )}
        </div>
      </section>
      {queueOpen && (
        <div
          className="player-queue-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setQueueOpen(false);
          }}
        >
          <section
            className="player-queue"
            role="dialog"
            aria-modal="true"
            aria-label="Spelkö"
          >
            <header>
              <div>
                <span>Spelas från</span>
                <h2>{request.name}</h2>
              </div>
              <button
                className="icon-button"
                onClick={() => setQueueOpen(false)}
                aria-label="Stäng spelkön"
              >
                <X />
              </button>
            </header>
            <div className="player-queue-body">
              <h3>Spelas nu</h3>
              {current && (
                <div className="player-queue-current">
                  <Music2 />
                  <div>
                    <strong>{current.title}</strong>
                    <span>{credit(current)}</span>
                  </div>
                  {playing && (
                    <span className="player-equalizer" aria-label="Spelar">
                      <i />
                      <i />
                      <i />
                    </span>
                  )}
                </div>
              )}
              <div className="player-queue-heading">
                <h3>Nästa · {Math.max(0, queue.length - index - 1)}</h3>
                {queue.length > index + 1 && (
                  <button
                    className="secondary-action"
                    onClick={() => setQueue((list) => list.slice(0, index + 1))}
                  >
                    Töm kön
                  </button>
                )}
              </div>
              {queue.length === index + 1 && (
                <p className="player-queue-empty">
                  Inga fler låtar i kön. Spela ett album eller en spellista för
                  att fortsätta.
                </p>
              )}
              <ol>
                {queue.slice(index + 1).map((song, offset) => (
                  <li key={`${song.id}-${index + offset + 1}`}>
                    <button
                      className="player-queue-song"
                      onClick={() => {
                        failed.current.delete(song.id);
                        chooseTrack(index + offset + 1);
                      }}
                    >
                      <span>{offset + 1}</span>
                      <div>
                        <strong>{song.title}</strong>
                        <small>{credit(song)}</small>
                      </div>
                      <Play size={16} />
                    </button>
                    <button
                      className="icon-button"
                      onClick={() =>
                        setQueue((list) =>
                          list.filter(
                            (_, position) => position !== index + offset + 1,
                          ),
                        )
                      }
                      aria-label={`Ta bort ${song.title} från kön`}
                    >
                      <X size={18} />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
