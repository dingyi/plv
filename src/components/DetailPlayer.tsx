import { ExternalLink, LoaderCircle, Play } from "lucide-react";
import { useRef, useState } from "react";

import {
  formatDuration,
  normalizeTweetUrl,
  playbackUrl,
  type LaunchVideo,
} from "@/lib/catalog";

type PlayerStatus = "idle" | "loading" | "ready" | "error";

/**
 * Inline player for the video detail page. Renders the poster with a play
 * affordance; the proxied src is only attached after an explicit click, so
 * nothing autoplays on page load. The play control is a real link to the
 * original X post — without hydration it still takes the user somewhere
 * useful (React preventDefaults once hydrated).
 */
export default function DetailPlayer({ video }: { video: LaunchVideo }) {
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [started, setStarted] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>("idle");

  const duration = formatDuration(video.durationSeconds);
  const tweetUrl = normalizeTweetUrl(video.tweetUrl);

  function start() {
    const player = playerRef.current;
    if (!player || started) return;
    setStarted(true);
    setStatus("loading");
    player.src = playbackUrl(video);
    player.load();
  }

  async function handleLoaded() {
    const player = playerRef.current;
    if (!player) return;
    setStatus("ready");
    try {
      // Playback starts from an explicit click, so unmuted play is allowed.
      await player.play();
    } catch {
      try {
        player.muted = true;
        await player.play();
      } catch {
        // Autoplay fully blocked; native controls remain usable.
      }
    }
  }

  return (
    <figure className="detail-media detail-player">
      <video
        ref={playerRef}
        className="detail-player__video"
        controls={started}
        playsInline
        preload="none"
        poster={video.poster}
        onLoadedData={handleLoaded}
        onError={() => setStatus("error")}
      >
        Your browser does not support video playback.
      </video>

      {!started && (
        <a
          className="detail-play-link"
          href={tweetUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Play ${video.title}${duration ? `, ${duration}` : ""}`}
          onClick={(event) => {
            event.preventDefault();
            start();
          }}
        >
          <span className="detail-player__play" aria-hidden="true">
            <Play size={18} fill="currentColor" />
          </span>
          {duration && (
            <span className="video-card__duration" aria-hidden="true">
              {duration}
            </span>
          )}
        </a>
      )}

      {status === "loading" && (
        <div className="detail-player__status" role="status">
          <LoaderCircle className="detail-player__spinner" size={22} />
          Loading video…
        </div>
      )}
      {status === "error" && (
        <div className="detail-player__status detail-player__status--error">
          <p>
            This video is missing or unreadable. Open the original X post
            instead.
          </p>
          <a href={tweetUrl} target="_blank" rel="noreferrer">
            Watch on X
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      )}
    </figure>
  );
}
