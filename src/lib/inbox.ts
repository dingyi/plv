import type { CategoryId, LaunchVideo } from "./catalog";
import type { DiscoveredPost, WatchlistEntry } from "./discovery";

export type ReviewStatus = "pending" | "approved" | "rejected";

export interface InboxItem {
  id: string;
  tweetId: string;
  reviewStatus: ReviewStatus;
  discoveredAt: string;
  reviewedAt: string | null;
  score: number;
  reasons: string[];
  post: DiscoveredPost;
  watchlist: WatchlistEntry;
  draft: LaunchVideo;
  notes: string;
  /** Optional GitHub issue URL when discovery also filed an issue. */
  issueUrl?: string | null;
}

export interface InboxFile {
  updatedAt: string;
  items: InboxItem[];
}

export function emptyInbox(): InboxFile {
  return { updatedAt: new Date(0).toISOString(), items: [] };
}

export function normalizeInbox(raw: unknown): InboxFile {
  if (!raw || typeof raw !== "object") return emptyInbox();
  const data = raw as Partial<InboxFile>;
  const items = Array.isArray(data.items) ? (data.items as InboxItem[]) : [];
  return {
    updatedAt:
      typeof data.updatedAt === "string"
        ? data.updatedAt
        : new Date(0).toISOString(),
    items,
  };
}

export function pendingCount(inbox: InboxFile) {
  return inbox.items.filter((item) => item.reviewStatus === "pending").length;
}

export function filterInbox(
  items: InboxItem[],
  status: ReviewStatus | "all",
) {
  if (status === "all") return items;
  return items.filter((item) => item.reviewStatus === status);
}

export function sortInboxItems(items: InboxItem[]) {
  return items.slice().sort((a, b) => {
    const statusRank = (s: ReviewStatus) =>
      s === "pending" ? 0 : s === "approved" ? 1 : 2;
    return (
      statusRank(a.reviewStatus) - statusRank(b.reviewStatus) ||
      b.score - a.score ||
      Date.parse(b.discoveredAt) - Date.parse(a.discoveredAt)
    );
  });
}

/** Approved drafts ready to merge into videos.json (status forced to published). */
export function approvedCatalogEntries(items: InboxItem[]): LaunchVideo[] {
  return items
    .filter((item) => item.reviewStatus === "approved")
    .map((item) => ({
      ...item.draft,
      status: "published" as const,
    }));
}

export function upsertDraftFields(
  item: InboxItem,
  patch: Partial<
    Pick<
      LaunchVideo,
      | "title"
      | "product"
      | "company"
      | "description"
      | "category"
      | "tags"
      | "featured"
      | "durationSeconds"
    >
  >,
): InboxItem {
  const category = patch.category ?? item.draft.category;
  return {
    ...item,
    draft: {
      ...item.draft,
      ...patch,
      category: category as CategoryId,
    },
  };
}

export async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
