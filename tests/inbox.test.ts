import { describe, expect, it } from "vitest";

import { candidateToInboxItem, mergeInbox } from "@/lib/discovery";
import {
  approvedCatalogEntries,
  filterInbox,
  normalizeInbox,
  pendingCount,
  sortInboxItems,
  upsertDraftFields,
  type InboxItem,
} from "@/lib/inbox";

function sampleItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: "disc-1",
    tweetId: "1",
    reviewStatus: "pending",
    discoveredAt: "2026-07-22T00:00:00.000Z",
    reviewedAt: null,
    score: 40,
    reasons: ["has-video"],
    post: {
      tweetId: "1",
      tweetUrl: "https://x.com/linear/status/1",
      authorHandle: "linear",
      authorName: "Linear",
      text: "Introducing Loops",
      createdAt: "2026-07-22T00:00:00.000Z",
      media: [{ type: "video", videoUrl: "https://example.com/a.mp4" }],
    },
    watchlist: {
      handle: "linear",
      company: "Linear",
      category: "productivity",
    },
    draft: {
      id: "plv-disc-1",
      slug: "linear-1",
      title: "Introducing Loops",
      product: "Linear",
      company: "Linear",
      description: "Introducing Loops",
      category: "productivity",
      tags: ["auto-discovery"],
      tweetUrl: "https://x.com/linear/status/1",
      tweetId: "1",
      authorName: "Linear",
      authorHandle: "linear",
      authorAvatar: null,
      poster: "/posters/linear-1.webp",
      videoUrl: "https://example.com/a.mp4",
      publishedAt: "2026-07-22T00:00:00.000Z",
      durationSeconds: 30,
      featured: false,
      status: "draft",
    },
    notes: "",
    ...overrides,
  };
}

describe("inbox helpers", () => {
  it("normalizes empty input", () => {
    expect(normalizeInbox(null).items).toEqual([]);
  });

  it("filters and counts pending", () => {
    const items = [
      sampleItem(),
      sampleItem({ id: "2", tweetId: "2", reviewStatus: "approved" }),
      sampleItem({ id: "3", tweetId: "3", reviewStatus: "rejected" }),
    ];
    expect(pendingCount({ updatedAt: "", items })).toBe(1);
    expect(filterInbox(items, "approved")).toHaveLength(1);
    expect(sortInboxItems(items)[0]?.reviewStatus).toBe("pending");
  });

  it("patches draft fields and builds published entries", () => {
    const patched = upsertDraftFields(sampleItem(), {
      title: "Linear Loops",
      featured: true,
    });
    expect(patched.draft.title).toBe("Linear Loops");
    expect(patched.draft.featured).toBe(true);
    const published = approvedCatalogEntries([
      { ...patched, reviewStatus: "approved" },
    ]);
    expect(published[0]?.status).toBe("published");
  });
});

describe("mergeInbox", () => {
  it("adds new candidates and preserves reviewed items", () => {
    const existing = {
      updatedAt: "2026-07-01T00:00:00.000Z",
      items: [
        sampleItem({
          tweetId: "1",
          reviewStatus: "rejected",
          notes: "not a launch",
        }),
      ],
    };

    const candidate = {
      post: sampleItem({ tweetId: "99" }).post,
      watchlist: sampleItem().watchlist,
      score: 55,
      reasons: ["has-video", "signal:intro"],
      draft: sampleItem({ tweetId: "99" }).draft,
    };
    // fix draft tweet id alignment
    candidate.post.tweetId = "99";
    candidate.draft.tweetId = "99";
    candidate.draft.id = "plv-disc-99";

    const { inbox, added, pending } = mergeInbox(existing, [candidate]);
    expect(added).toBe(1);
    expect(pending).toBe(1);
    expect(inbox.items.find((i: InboxItem) => i.tweetId === "1")?.notes).toBe(
      "not a launch",
    );
    expect(inbox.items.find((i: InboxItem) => i.tweetId === "99")?.score).toBe(
      55,
    );
  });

  it("builds inbox items from candidates", () => {
    const item = candidateToInboxItem({
      post: sampleItem().post,
      watchlist: sampleItem().watchlist,
      score: 12,
      reasons: ["has-video"],
      draft: sampleItem().draft,
    });
    expect(item.reviewStatus).toBe("pending");
    expect(item.id).toBe("disc-1");
  });
});
