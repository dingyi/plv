import { ArrowLeft, ArrowRight, ExternalLink, LoaderCircle, X } from "lucide-react";
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
  /** When provided, prev/next controls step through the caller's list. */
  onNavigate?: (direction: 1 | -1) => void;
}

type PlayerStatus = "idle" | "loading" | "ready" | "error";

/**
 * Play launch videos in-site via the playback URL from `playbackUrl()`
 * (the video proxy wrapping the original X CDN URL).
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
  onNavigate,
}: Props) {
  const titleId = useId();
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const restoreFocusRef = useRef<Element | null>(null);
  const [status, setStatus] = useState<PlayerStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  // Keep the portal alive through the exit animation: `open` flips false (and
  // the parent clears `video`) immediately, so we render from a cached copy
  // and unmount only after the close tween (--duration-quick) has played.
  const [rendered, setRendered] = useState(open);
  const [closing, setClosing] = useState(false);
  const lastVideoRef = useRef<LaunchVideo | null>(null);
  if (video) lastVideoRef.current = video;
  // Mount the portal in the SAME commit that `open` flips true (adjust-state-
  // during-render). Deferring this to an effect would render null on the first
  // pass, leaving playerRef empty when the load effect below runs — the video
  // would never get its src and the controls stay disabled.
  if (open && !rendered) {
    setRendered(true);
    setClosing(false);
  }

  useEffect(() => {
    setMounted(true);
  }, []);

  // Move focus into the dialog on open and return it to the trigger on close.
  useEffect(() => {
    if (open && rendered) {
      restoreFocusRef.current = document.activeElement;
      closeRef.current?.focus();
    }
  }, [open, rendered]);

  useEffect(() => {
    if (rendered) return;
    const trigger = restoreFocusRef.current;
    if (trigger instanceof HTMLElement) trigger.focus({ preventScroll: true });
    restoreFocusRef.current = null;
  }, [rendered]);

  useEffect(() => {
    if (open || !rendered) return;
    setClosing(true);
    const id = setTimeout(() => {
      setRendered(false);
      setClosing(false);
    }, 150);
    return () => clearTimeout(id);
  }, [open, rendered]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onOpenChange(false);
      } else if (event.key === "ArrowLeft" && onNavigate) {
        event.preventDefault();
        onNavigate(-1);
      } else if (event.key === "ArrowRight" && onNavigate) {
        event.preventDefault();
        onNavigate(1);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange, onNavigate]);

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
        // The modal opens from a click, so unmuted autoplay is normally
        // allowed by the browser's user-activation policy. Users who prefer
        // reduced motion get a muted start instead of a sound-and-motion
        // surprise.
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          player.muted = true;
        }
        await player.play();
      } catch {
        try {
          // Fall back to muted autoplay if the unmuted attempt was blocked;
          // the user can unmute via the native controls.
          player.muted = true;
          await player.play();
        } catch {
          // Autoplay fully blocked; native controls remain usable.
        }
      }
    };

    const onError = () => {
      if (cancelled) return;
      setStatus("error");
      setErrorMessage(
        "This video is missing or unreadable. Open the original X post instead.",
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

  const activeVideo = video ?? lastVideoRef.current;
  if (!mounted || !rendered || !activeVideo) return null;

  const duration = formatDuration(activeVideo.durationSeconds);
  const tweetUrl = normalizeTweetUrl(activeVideo.tweetUrl);

  return createPortal(
    <div
      className={closing ? "video-player-modal is-closing" : "video-player-modal"}
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
        <div className="video-player-modal__stage">
          <video
            ref={playerRef}
            className="video-player-modal__video"
            controls
            playsInline
            preload="auto"
            poster={activeVideo.poster}
          >
            Your browser does not support video playback.
          </video>

          {onNavigate && (
            <>
              <button
                type="button"
                className="video-player-modal__nav video-player-modal__nav--prev"
                onClick={() => onNavigate(-1)}
                aria-label="Previous video"
              >
                <ArrowLeft size={18} />
              </button>
              <button
                type="button"
                className="video-player-modal__nav video-player-modal__nav--next"
                onClick={() => onNavigate(1)}
                aria-label="Next video"
              >
                <ArrowRight size={18} />
              </button>
            </>
          )}

          {/* Cinema overlays: hidden until the stage is hovered or focused,
              always visible on touch devices (see CSS hover:none rule). */}
          <div className="video-player-modal__overlay video-player-modal__overlay--top">
            <div className="video-player-modal__heading">
              <h2 id={titleId} className="video-player-modal__title">
                {activeVideo.title}
              </h2>
              <p className="video-player-modal__meta">
                {activeVideo.company}
                <span aria-hidden="true"> · </span>
                {categoryLabel(activeVideo.category)}
                {duration && (
                  <>
                    <span aria-hidden="true"> · </span>
                    {duration}
                  </>
                )}
              </p>
            </div>
            <div className="video-player-modal__actions">
              <a
                className="video-player-modal__link"
                href={`/videos/${activeVideo.slug}/`}
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
              <button
                type="button"
                className="video-player-modal__close"
                ref={closeRef}
                onClick={() => onOpenChange(false)}
                aria-label="Close player"
              >
                <X size={18} />
              </button>
            </div>
          </div>

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
      </div>
    </div>,
    document.body,
  );
}
