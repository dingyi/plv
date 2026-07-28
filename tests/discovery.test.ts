import { describe, expect, it } from "vitest";

import {
  buildCandidateDraft,
  buildDigestEmailSubject,
  buildDiscoveryIssueBody,
  evaluatePost,
  extractTweetIdFromIssueBody,
  hasVideoMedia,
  knownTweetIds,
  rankCandidates,
  scoreLaunchText,
  type DiscoveredPost,
  type WatchlistEntry,
} from "@/lib/discovery";

const readwise: WatchlistEntry = {
  handle: "readwise",
  company: "Readwise",
  category: "productivity",
  tags: ["reading"],
};

function post(partial: Partial<DiscoveredPost> & Pick<DiscoveredPost, "tweetId" | "text">): DiscoveredPost {
  return {
    tweetUrl: `https://x.com/readwise/status/${partial.tweetId}`,
    authorHandle: "readwise",
    authorName: "Readwise",
    createdAt: "2026-07-22T16:56:58.000Z",
    media: [
      {
        type: "video",
        durationMs: 60_000,
        videoUrl: "https://example.com/v.mp4",
      },
    ],
    metrics: { likeCount: 100, viewCount: 20_000 },
    ...partial,
  };
}

describe("scoreLaunchText", () => {
  it("scores launch language positively", () => {
    const result = scoreLaunchText(
      "Introducing Readwise 2.0 — rebuilt from the ground up.",
    );
    expect(result.score).toBeGreaterThan(20);
    expect(result.reasons.some((r) => r.startsWith("signal:"))).toBe(true);
  });

  it("penalizes hiring noise", () => {
    const result = scoreLaunchText("We're hiring a designer!");
    expect(result.score).toBeLessThan(0);
  });
});

describe("evaluatePost", () => {
  const now = new Date("2026-07-24T00:00:00.000Z");

  it("accepts a launch video on the watchlist", () => {
    const candidate = evaluatePost(
      post({
        tweetId: "1001",
        text: "Introducing Readwise 2.0. Now live.",
      }),
      readwise,
      { knownIds: new Set(), lookbackDays: 8, now },
    );
    expect(candidate).not.toBeNull();
    expect(candidate?.draft.status).toBe("draft");
    expect(candidate?.draft.videoUrl).toContain("example.com");
  });

  it("skips posts already in the catalog", () => {
    const candidate = evaluatePost(
      post({
        tweetId: "2079233260161323371",
        text: "Introducing Linear Loops",
      }),
      readwise,
      {
        knownIds: knownTweetIds([{ tweetId: "2079233260161323371" }]),
        lookbackDays: 8,
        now,
      },
    );
    expect(candidate).toBeNull();
  });

  it("skips posts without video", () => {
    const candidate = evaluatePost(
      post({
        tweetId: "1002",
        text: "Introducing something cool",
        media: [{ type: "photo", previewImageUrl: "https://example.com/p.jpg" }],
      }),
      readwise,
      { knownIds: new Set(), lookbackDays: 8, now },
    );
    expect(candidate).toBeNull();
  });

  it("skips old posts outside the lookback window", () => {
    const candidate = evaluatePost(
      post({
        tweetId: "1003",
        text: "Introducing an old launch",
        createdAt: "2026-01-01T00:00:00.000Z",
      }),
      readwise,
      { knownIds: new Set(), lookbackDays: 8, now },
    );
    expect(candidate).toBeNull();
  });
});

describe("hasVideoMedia", () => {
  it("detects video and gif", () => {
    expect(hasVideoMedia([{ type: "photo" }])).toBe(false);
    expect(hasVideoMedia([{ type: "video" }])).toBe(true);
    expect(hasVideoMedia([{ type: "animated_gif" }])).toBe(true);
  });
});

describe("draft + issue helpers", () => {
  it("builds a draft slug and issue marker", () => {
    const draft = buildCandidateDraft(
      post({
        tweetId: "2079973992077902283",
        text: "Introducing: Readwise 2.0.",
      }),
      readwise,
    );
    expect(draft.slug).toContain("readwise");
    expect(draft.status).toBe("draft");

    const body = buildDiscoveryIssueBody({
      post: post({
        tweetId: "2079973992077902283",
        text: "Introducing: Readwise 2.0.",
      }),
      watchlist: readwise,
      score: 42,
      reasons: ["has-video", "signal:introduc"],
      draft,
    });
    expect(extractTweetIdFromIssueBody(body)).toBe("2079973992077902283");
    expect(body).toContain("Review checklist");
  });

  it("ranks higher scores first", () => {
    const low = {
      post: post({ tweetId: "1", text: "x" }),
      watchlist: readwise,
      score: 10,
      reasons: [],
      draft: buildCandidateDraft(post({ tweetId: "1", text: "x" }), readwise),
    };
    const high = {
      ...low,
      score: 50,
      post: post({ tweetId: "2", text: "y" }),
      draft: buildCandidateDraft(post({ tweetId: "2", text: "y" }), readwise),
    };
    expect(rankCandidates([low, high])[0]?.score).toBe(50);
  });

  it("builds digest subjects", () => {
    expect(buildDigestEmailSubject([], "2026-07-22")).toContain("no new");
    const candidate = evaluatePost(
      post({
        tweetId: "55",
        text: "Introducing Widget Pro. Now available.",
      }),
      readwise,
      {
        knownIds: new Set(),
        lookbackDays: 30,
        now: new Date("2026-07-24T00:00:00.000Z"),
      },
    )!;
    expect(buildDigestEmailSubject([candidate], "2026-07-22")).toContain(
      "1 candidate",
    );
  });
});
