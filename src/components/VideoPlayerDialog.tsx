import { ExternalLink, LoaderCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  categoryLabel,
  formatDuration,
  normalizeTweetUrl,
  playbackUrl,
  type LaunchVideo,
} from "@/lib/catalog";

interface Props {
  video: LaunchVideo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PlayerStatus = "idle" | "loading" | "ready" | "error";

/**
 * Play launch videos from same-origin streams under /public/streams.
 *
 * Direct X CDN URLs are unreliable in browsers: video.twimg.com returns 403
 * for non-Twitter Referer headers (including localhost and production domains),
 * and Chromium still attaches a Referer even with referrerpolicy=no-referrer
 * on <video> elements.
 */
export default function VideoPlayerDialog({
  video,
  open,
  onOpenChange,
}: Props) {
  const titleId = useId();
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    const player = playerRef.current;
    if (!open || !video || !player) {
      setStatus("idle");
      setErrorMessage(null);
      if (player) {
        player.pause();
        player.removeAttribute("src");
        player.load();
      }
      return;
    }

    let cancelled = false;
    const src = playbackUrl(video);
    setStatus("loading");
    setErrorMessage(null);

    player.pause();
    player.src = src;
    player.load();

    const onLoaded = async () => {
      if (cancelled) return;
      setStatus("ready");
      try {
        await player.play();
      } catch {
        // Autoplay may be blocked; native controls remain usable.
      }
    };

    const onError = () => {
      if (cancelled) return;
      setStatus("error");
      setErrorMessage(
        "This local stream is missing or unreadable. Open the original X post, or run pnpm posters:capture to rebuild streams.",
      );
    };

    player.addEventListener("loadeddata", onLoaded);
    player.addEventListener("error", onError);

    return () => {
      cancelled = true;
      player.removeEventListener("loadeddata", onLoaded);
      player.removeEventListener("error", onError);
      player.pause();
    };
  }, [open, video]);

  if (!mounted || !open || !video) return null;

  const duration = formatDuration(video.durationSeconds);
  const tweetUrl = normalizeTweetUrl(video.tweetUrl);

  return createPortal(
    <div
      className="video-player-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="video-player-modal__scrim"
        aria-label="Close player"
        onClick={() => onOpenChange(false)}
      />
      <div className="video-player-modal__panel">
        <div className="video-player-modal__header">
          <div>
            <h2 id={titleId} className="video-player-modal__title">
              {video.title}
            </h2>
            <p className="video-player-modal__meta">
              {video.company}
              <span aria-hidden="true"> · </span>
              {categoryLabel(video.category)}
              {duration && (
                <>
                  <span aria-hidden="true"> · </span>
                  {duration}
                </>
              )}
            </p>
          </div>
          <button
            type="button"
            className="video-player-modal__close"
            onClick={() => onOpenChange(false)}
            aria-label="Close player"
          >
            <X size={18} />
          </button>
        </div>

        <div className="video-player-modal__stage">
          <video
            ref={playerRef}
            className="video-player-modal__video"
            controls
            playsInline
            preload="auto"
            poster={video.poster}
          >
            Your browser does not support video playback.
          </video>
          {status === "loading" && (
            <div className="video-player-modal__status" role="status">
              <LoaderCircle className="video-player-modal__spinner" size={22} />
              Loading video…
            </div>
          )}
          {status === "error" && (
            <div className="video-player-modal__status video-player-modal__status--error">
              <p>{errorMessage}</p>
              <a href={tweetUrl} target="_blank" rel="noreferrer">
                Watch on X
                <ExternalLink size={14} aria-hidden="true" />
              </a>
            </div>
          )}
        </div>

        <div className="video-player-modal__footer">
          <a
            className="video-player-modal__link"
            href={`/videos/${video.slug}/`}
          >
            Open details
          </a>
          <a
            className="video-player-modal__link"
            href={tweetUrl}
            target="_blank"
            rel="noreferrer"
          >
            Original on X
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
