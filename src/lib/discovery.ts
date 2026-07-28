/**
 * Typed facade over scripts/discovery/logic.mjs for app code and Vitest.
 */
import type { CategoryId, LaunchVideo } from "./catalog";

export {
  DISCOVERY_ISSUE_LABEL,
  DISCOVERY_SOURCE,
  buildCandidateDraft,
  buildDigestEmailHtml,
  buildDigestEmailSubject,
  buildDigestEmailText,
  buildDiscoveryIssueBody,
  buildDiscoveryIssueTitle,
  buildDiscoverySlug,
  candidateToInboxItem,
  evaluatePost,
  extractTweetIdFromIssueBody,
  guessDescription,
  guessTitle,
  hasVideoMedia,
  isRecentEnough,
  isValidWatchlistEntry,
  knownTweetIds,
  mergeInbox,
  normalizeHandle,
  pickBestVideoUrl,
  pickPreviewImage,
  rankCandidates,
  scoreLaunchText,
  tweetUrlFor,
  weekLabel,
} from "../../scripts/discovery/logic.mjs";

export interface WatchlistEntry {
  handle: string;
  company: string;
  category: CategoryId;
  tags?: string[];
}

export interface DiscoveredMedia {
  type: "video" | "animated_gif" | "photo" | "unknown";
  previewImageUrl?: string | null;
  durationMs?: number | null;
  videoUrl?: string | null;
}

export interface DiscoveredPost {
  tweetId: string;
  tweetUrl: string;
  authorHandle: string;
  authorName: string;
  authorAvatar?: string | null;
  text: string;
  createdAt: string;
  media: DiscoveredMedia[];
  metrics?: {
    likeCount?: number;
    repostCount?: number;
    replyCount?: number;
    viewCount?: number;
  };
}

export interface DiscoveryCandidate {
  post: DiscoveredPost;
  watchlist: WatchlistEntry;
  score: number;
  reasons: string[];
  draft: LaunchVideo;
}
