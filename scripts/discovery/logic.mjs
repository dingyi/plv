/**
 * Pure discovery helpers shared by the CLI runner and unit tests.
 */

export const DISCOVERY_ISSUE_LABEL = "discovery";
export const DISCOVERY_SOURCE = "weekly-discovery";

export const CATEGORY_IDS = [
  "ai",
  "developer-tools",
  "design",
  "productivity",
  "consumer",
  "hardware",
  "other",
];

export const CATEGORY_LABELS = {
  ai: "AI",
  "developer-tools": "Developer tools",
  design: "Design",
  productivity: "Productivity",
  consumer: "Consumer",
  hardware: "Hardware",
  other: "Other",
};

const LAUNCH_PATTERNS = [
  /\bintroduc(?:e|ing)\b/i,
  /\blaunch(?:ing|ed)?\b/i,
  /\bannounc(?:e|ing|ement)\b/i,
  /\bnow (?:live|available|shipping)\b/i,
  /\bavailable (?:today|now|on)\b/i,
  /\brebuilt\b/i,
  /\bfrom the ground up\b/i,
  /\bproduct (?:launch|demo|walkthrough)\b/i,
  /\bwalkthrough\b/i,
  /\bnew (?:feature|product|app|model|agent|version)\b/i,
  /\bshipping\b/i,
  /\bmeet\b.{0,40}\b(?:our|the|new)\b/i,
  /\bpresenting\b/i,
  /\bjust shipped\b/i,
  /\bg\.?a\.?\b/i,
  /\bpublic beta\b/i,
  /\bopen[- ]source\b/i,
  /发布/,
  /新品/,
  /上线/,
  /正式推出/,
  /全新/,
  /重磅/,
];

const NOISE_PATTERNS = [
  /\bhiring\b/i,
  /\bwe're hiring\b/i,
  /\bjoin (?:our|the) team\b/i,
  /\bpodcast\b/i,
  /\bnewsletter\b/i,
  /\bgiveaway\b/i,
  /\bretweet to\b/i,
  /\bfollow us\b/i,
];

export function normalizeHandle(handle) {
  return handle.replace(/^@/, "").trim();
}

export function tweetUrlFor(handle, tweetId) {
  return `https://x.com/${normalizeHandle(handle)}/status/${tweetId}`;
}

export function hasVideoMedia(media) {
  return media.some(
    (item) => item.type === "video" || item.type === "animated_gif",
  );
}

export function pickBestVideoUrl(media) {
  for (const item of media) {
    if (
      (item.type === "video" || item.type === "animated_gif") &&
      item.videoUrl
    ) {
      return item.videoUrl;
    }
  }
  return null;
}

export function pickPreviewImage(media) {
  for (const item of media) {
    if (item.previewImageUrl) return item.previewImageUrl;
  }
  return null;
}

export function scoreLaunchText(text) {
  const reasons = [];
  let score = 0;

  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(text)) {
      score -= 25;
      reasons.push(`noise:${pattern.source}`);
    }
  }

  for (const pattern of LAUNCH_PATTERNS) {
    if (pattern.test(text)) {
      score += 18;
      reasons.push(`signal:${pattern.source}`);
    }
  }

  if (text.trim().length > 0 && text.trim().length < 280) {
    score += 4;
  }

  return { score, reasons };
}

export function isRecentEnough(iso, lookbackDays, now = new Date()) {
  const created = Date.parse(iso);
  if (Number.isNaN(created)) return false;
  const ms = lookbackDays * 24 * 60 * 60 * 1000;
  return created >= now.getTime() - ms;
}

export function knownTweetIds(videos) {
  return new Set([...videos].map((video) => video.tweetId));
}

export function buildDiscoverySlug(company, tweetId) {
  const base = company
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40)
    .replace(/-$/, "");
  return base
    ? `${base}-${tweetId.slice(-6)}`
    : `launch-${tweetId.slice(-8)}`;
}

export function guessTitle(text, company) {
  const cleaned = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return `${company} — product launch video`;
  const firstLine = cleaned.split("\n")[0]?.trim() ?? cleaned;
  if (firstLine.length <= 100) return firstLine;
  return `${firstLine.slice(0, 97).trim()}…`;
}

export function guessDescription(text, company) {
  const cleaned = text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) {
    return `A product launch or demo video from ${company}, discovered from X.`;
  }
  if (cleaned.length <= 280) return cleaned;
  return `${cleaned.slice(0, 277).trim()}…`;
}

export function buildCandidateDraft(post, watchlist) {
  const slug = buildDiscoverySlug(watchlist.company, post.tweetId);
  const videoUrl = pickBestVideoUrl(post.media);
  const durationMs =
    post.media.find((m) => m.durationMs != null)?.durationMs ?? null;

  return {
    id: `plv-disc-${post.tweetId}`,
    slug,
    title: guessTitle(post.text, watchlist.company),
    product: watchlist.company,
    company: watchlist.company,
    description: guessDescription(post.text, watchlist.company),
    category: watchlist.category,
    tags: [...(watchlist.tags ?? []), "auto-discovery"],
    tweetUrl: post.tweetUrl,
    tweetId: post.tweetId,
    authorName: post.authorName || watchlist.company,
    authorHandle: normalizeHandle(post.authorHandle || watchlist.handle),
    authorAvatar: post.authorAvatar ?? null,
    poster: `/posters/${slug}.webp`,
    videoUrl,
    publishedAt: post.createdAt,
    durationSeconds:
      durationMs != null && durationMs > 0
        ? Math.round(durationMs / 1000)
        : null,
    featured: false,
    status: "draft",
  };
}

export function evaluatePost(post, watchlist, options) {
  if (options.knownIds.has(post.tweetId)) return null;
  if (!isRecentEnough(post.createdAt, options.lookbackDays, options.now)) {
    return null;
  }
  if (!hasVideoMedia(post.media)) return null;

  const { score: textScore, reasons } = scoreLaunchText(post.text);
  let score = textScore + 20;
  reasons.unshift("has-video");

  if ((post.metrics?.likeCount ?? 0) >= 50) {
    score += 6;
    reasons.push("engagement:likes");
  }
  if ((post.metrics?.viewCount ?? 0) >= 10_000) {
    score += 6;
    reasons.push("engagement:views");
  }

  const minScore = options.minScore ?? 20;
  if (score < minScore) return null;

  return {
    post,
    watchlist,
    score,
    reasons,
    draft: buildCandidateDraft(post, watchlist),
  };
}

export function rankCandidates(candidates) {
  return candidates
    .slice()
    .sort(
      (a, b) =>
        b.score - a.score ||
        Date.parse(b.post.createdAt) - Date.parse(a.post.createdAt),
    );
}

export function buildDiscoveryIssueTitle(candidate) {
  return `Discovery: ${candidate.draft.product} (@${candidate.draft.authorHandle})`;
}

export function buildDiscoveryIssueBody(candidate) {
  const categoryLabel =
    CATEGORY_LABELS[candidate.watchlist.category] ??
    candidate.watchlist.category;
  const duration =
    candidate.draft.durationSeconds != null
      ? `${candidate.draft.durationSeconds}s`
      : "—";

  return [
    "## Auto-discovered launch video",
    "",
    `_Source: \`${DISCOVERY_SOURCE}\` · score **${candidate.score}**_`,
    "",
    "### Source",
    "",
    `- **Tweet URL:** ${candidate.post.tweetUrl}`,
    `- **Tweet ID:** \`${candidate.post.tweetId}\``,
    `- **Author:** ${candidate.post.authorName} (@${candidate.draft.authorHandle})`,
    `- **Posted:** ${candidate.post.createdAt}`,
    `- **Duration:** ${duration}`,
    `- **Video URL:** ${candidate.draft.videoUrl ?? "—"}`,
    "",
    "### Post text",
    "",
    "> " + candidate.post.text.replace(/\n/g, "\n> "),
    "",
    "### Signals",
    "",
    candidate.reasons.map((reason) => `- \`${reason}\``).join("\n") || "- —",
    "",
    "### Suggested catalog draft",
    "",
    "```json",
    JSON.stringify(candidate.draft, null, 2),
    "```",
    "",
    "### Suggested metadata",
    "",
    `- **Company:** ${candidate.watchlist.company}`,
    `- **Category:** ${categoryLabel}`,
    `- **Tags:** ${(candidate.watchlist.tags ?? []).join(", ") || "—"}`,
    "",
    "### Review checklist",
    "",
    "- [ ] Public post is a product launch / demo / walkthrough (not hiring/ads noise)",
    "- [ ] Metadata (title, product, category) is accurate",
    "- [ ] Capture poster + stream: `pnpm posters:capture -- --slug=" +
      candidate.draft.slug +
      " --force`",
    '- [ ] Merge into `src/data/videos.json` with `status: "published"`',
    "- [ ] Close this issue as approved or rejected",
    "",
    `<!-- plv-discovery-tweet-id:${candidate.post.tweetId} -->`,
    "",
  ].join("\n");
}

export function buildDigestEmailSubject(candidates, week) {
  if (candidates.length === 0) {
    return `[plv] Weekly discovery: no new launch videos (${week})`;
  }
  return `[plv] Weekly discovery: ${candidates.length} candidate${
    candidates.length === 1 ? "" : "s"
  } to review (${week})`;
}

export function buildDigestEmailHtml(candidates, options) {
  const issueByTweet = new Map(
    (options.issues ?? []).map((item) => [item.tweetId, item.htmlUrl]),
  );

  if (candidates.length === 0) {
    return `
      <p>Weekly discovery finished for <strong>${options.weekLabel}</strong>.</p>
      <p>No new launch-video candidates matched the watchlist this week.</p>
      <p><a href="${options.repoUrl}/issues?q=label%3A${DISCOVERY_ISSUE_LABEL}">Open discovery queue</a></p>
    `.trim();
  }

  const rows = candidates
    .map((candidate) => {
      const issueUrl = issueByTweet.get(candidate.post.tweetId);
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #eee;vertical-align:top;">
            <strong>${escapeHtml(candidate.draft.title)}</strong><br/>
            <span style="color:#666;">${escapeHtml(candidate.watchlist.company)} · score ${candidate.score}</span>
          </td>
          <td style="padding:10px;border-bottom:1px solid #eee;vertical-align:top;white-space:nowrap;">
            <a href="${candidate.post.tweetUrl}">Post</a>
            ${issueUrl ? ` · <a href="${issueUrl}">Review issue</a>` : ""}
          </td>
        </tr>
      `.trim();
    })
    .join("\n");

  return `
    <p>Weekly discovery found <strong>${candidates.length}</strong> candidate${
      candidates.length === 1 ? "" : "s"
    } for <strong>${options.weekLabel}</strong>.</p>
    <p>Review them in GitHub Issues (label <code>${DISCOVERY_ISSUE_LABEL}</code>) before publishing to the catalog.</p>
    <table style="border-collapse:collapse;width:100%;max-width:720px;font-family:system-ui,sans-serif;font-size:14px;">
      ${rows}
    </table>
    <p style="margin-top:16px;">
      <a href="${options.repoUrl}/issues?q=is%3Aopen+label%3A${DISCOVERY_ISSUE_LABEL}">Open review queue →</a>
    </p>
  `.trim();
}

export function buildDigestEmailText(candidates, options) {
  const issueByTweet = new Map(
    (options.issues ?? []).map((item) => [item.tweetId, item.htmlUrl]),
  );

  if (candidates.length === 0) {
    return [
      `Weekly discovery (${options.weekLabel}): no new candidates.`,
      `Queue: ${options.repoUrl}/issues?q=label%3A${DISCOVERY_ISSUE_LABEL}`,
    ].join("\n");
  }

  const lines = [
    `Weekly discovery (${options.weekLabel}): ${candidates.length} candidate(s)`,
    "",
    ...candidates.map((candidate) => {
      const issueUrl = issueByTweet.get(candidate.post.tweetId);
      return [
        `- ${candidate.draft.title}`,
        `  ${candidate.post.tweetUrl}`,
        issueUrl ? `  Review: ${issueUrl}` : null,
      ]
        .filter(Boolean)
        .join("\n");
    }),
    "",
    `Queue: ${options.repoUrl}/issues?q=is%3Aopen+label%3A${DISCOVERY_ISSUE_LABEL}`,
  ];
  return lines.join("\n");
}

export function extractTweetIdFromIssueBody(body) {
  const marker = body.match(/plv-discovery-tweet-id:(\d+)/);
  if (marker) return marker[1];
  const url = body.match(/x\.com\/[^/\s]+\/status\/(\d+)/i);
  return url?.[1] ?? null;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function weekLabel(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

export function isValidWatchlistEntry(value) {
  if (!value || typeof value !== "object") return false;
  if (typeof value.handle !== "string" || !value.handle.trim()) return false;
  if (typeof value.company !== "string" || !value.company.trim()) return false;
  if (
    typeof value.category !== "string" ||
    !CATEGORY_IDS.includes(value.category)
  ) {
    return false;
  }
  return true;
}

/**
 * Convert a scored discovery candidate into an admin inbox item.
 */
export function candidateToInboxItem(candidate, { discoveredAt, issueUrl } = {}) {
  return {
    id: `disc-${candidate.post.tweetId}`,
    tweetId: candidate.post.tweetId,
    reviewStatus: "pending",
    discoveredAt: discoveredAt ?? new Date().toISOString(),
    reviewedAt: null,
    score: candidate.score,
    reasons: candidate.reasons ?? [],
    post: candidate.post,
    watchlist: candidate.watchlist,
    draft: candidate.draft,
    notes: "",
    issueUrl: issueUrl ?? null,
  };
}

/**
 * Merge newly discovered candidates into the review inbox.
 * Preserves existing reviewStatus / notes / draft edits for known tweetIds.
 */
export function mergeInbox(existing, candidates, { now = new Date(), issueByTweet } = {}) {
  const previous = Array.isArray(existing?.items) ? existing.items : [];
  const byTweet = new Map(previous.map((item) => [item.tweetId, item]));
  const discoveredAt = now.toISOString();
  let added = 0;

  for (const candidate of candidates) {
    const tweetId = candidate.post.tweetId;
    if (byTweet.has(tweetId)) {
      const current = byTweet.get(tweetId);
      // Refresh score/reasons/post media for pending items only.
      if (current.reviewStatus === "pending") {
        byTweet.set(tweetId, {
          ...current,
          score: candidate.score,
          reasons: candidate.reasons ?? current.reasons,
          post: candidate.post,
          watchlist: candidate.watchlist,
          // Keep editor draft edits if present; only fill missing videoUrl.
          draft: {
            ...candidate.draft,
            ...current.draft,
            videoUrl: current.draft?.videoUrl || candidate.draft.videoUrl,
            tweetUrl: candidate.draft.tweetUrl,
            tweetId: candidate.draft.tweetId,
          },
          issueUrl:
            current.issueUrl ||
            issueByTweet?.get(tweetId) ||
            null,
        });
      }
      continue;
    }

    byTweet.set(
      tweetId,
      candidateToInboxItem(candidate, {
        discoveredAt,
        issueUrl: issueByTweet?.get(tweetId) ?? null,
      }),
    );
    added += 1;
  }

  const items = [...byTweet.values()].sort(
    (a, b) =>
      Date.parse(b.discoveredAt) - Date.parse(a.discoveredAt) ||
      b.score - a.score,
  );

  return {
    inbox: {
      updatedAt: discoveredAt,
      items,
    },
    added,
    total: items.length,
    pending: items.filter((item) => item.reviewStatus === "pending").length,
  };
}
