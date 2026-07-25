import videosData from "../data/videos.json";

export const CATEGORIES = [
  { id: "ai", label: "AI" },
  { id: "developer-tools", label: "Developer tools" },
  { id: "design", label: "Design" },
  { id: "productivity", label: "Productivity" },
  { id: "consumer", label: "Consumer" },
  { id: "hardware", label: "Hardware" },
  { id: "other", label: "Other" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export interface LaunchVideo {
  id: string;
  slug: string;
  title: string;
  product: string;
  company: string;
  description: string;
  category: CategoryId;
  tags: string[];
  tweetUrl: string;
  tweetId: string;
  authorName: string;
  authorHandle: string;
  authorAvatar: string | null;
  /** Local 16:9 poster under /public */
  poster: string;
  /**
   * Optional amplify MP4 used for poster/stream capture scripts.
   * Not used for browser playback (X CDN blocks non-Twitter referers).
   */
  videoUrl: string | null;
  /**
   * Preferred same-origin progressive stream under /public/streams.
   * When omitted, players fall back to `/streams/{slug}.mp4`.
   */
  streamUrl?: string | null;
  publishedAt: string;
  durationSeconds: number | null;
  featured: boolean;
  status: "published" | "draft";
}

export const allVideos = videosData as LaunchVideo[];

export const publishedVideos = allVideos
  .filter((video) => video.status === "published")
  .slice()
  .sort(
    (left, right) =>
      Date.parse(right.publishedAt) - Date.parse(left.publishedAt) ||
      left.title.localeCompare(right.title),
  );

export function categoryLabel(category: CategoryId) {
  return CATEGORIES.find((item) => item.id === category)?.label ?? category;
}

export function formatPublishedAt(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDuration(seconds: number | null) {
  if (seconds == null || seconds <= 0) return null;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function tweetPath(video: LaunchVideo) {
  return `/videos/${video.slug}/`;
}

export function xProfileUrl(handle: string) {
  return `https://x.com/${handle.replace(/^@/, "")}`;
}

/** Same-origin stream path used for in-site HTML5 playback. */
export function playbackUrl(video: LaunchVideo) {
  if (video.streamUrl) return video.streamUrl;
  return `/streams/${video.slug}.mp4`;
}

export function normalizeTweetUrl(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "twitter.com" || host === "x.com" || host === "mobile.twitter.com") {
      parsed.hostname = "x.com";
      parsed.search = "";
      parsed.hash = "";
      return parsed.toString().replace(/\/$/, "");
    }
  } catch {
    // fall through
  }
  return url;
}

function descriptionTerms(video: LaunchVideo) {
  return new Set(
    [video.title, video.product, video.company, video.description, ...video.tags]
      .join(" ")
      .toLocaleLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((term) => term.length > 2) ?? [],
  );
}

export function getSimilarVideos(
  current: LaunchVideo,
  candidates: LaunchVideo[] = publishedVideos,
  limit = 4,
) {
  const currentTerms = descriptionTerms(current);

  return candidates
    .filter((candidate) => candidate.slug !== current.slug)
    .map((candidate) => {
      const sameCategory = candidate.category === current.category ? 100 : 0;
      const sharedTerms = [...descriptionTerms(candidate)].filter((term) =>
        currentTerms.has(term),
      ).length;
      return {
        video: candidate,
        score: sameCategory + sharedTerms * 4,
      };
    })
    .sort(
      (left, right) =>
        right.score - left.score ||
        Date.parse(right.video.publishedAt) - Date.parse(left.video.publishedAt),
    )
    .slice(0, Math.max(0, limit))
    .map(({ video }) => video);
}
