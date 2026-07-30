#!/usr/bin/env node
/**
 * Weekly X discovery runner.
 *
 * Usage:
 *   node scripts/discovery/run.mjs --dry-run
 *   node scripts/discovery/run.mjs --fixture=scripts/discovery/fixtures/sample-timeline.json
 *   node scripts/discovery/run.mjs --publish
 *   node scripts/discovery/run.mjs --write-inbox --fixture=...
 *
 * Env:
 *   X_BEARER_TOKEN          X API v2 bearer token (required unless --fixture)
 *   GITHUB_TOKEN            create review issues (required with --publish)
 *   GITHUB_REPOSITORY       owner/repo (default: dingyi/whatships.com)
 *   RESEND_API_KEY          optional email via Resend
 *   NOTIFY_EMAIL            optional recipient(s), comma-separated
 *   DISCOVERY_FROM_EMAIL    verified Resend from address
 *   DISCOVERY_LOOKBACK_DAYS default 8
 *   DISCOVERY_MIN_SCORE     default 20
 *   DISCOVERY_MAX_PER_USER  default 15
 *   DISCOVERY_DELAY_MS      default 800 (between timeline fetches)
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

import { createXClient, mapXTimelineToPosts, sleep } from "./x-api.mjs";
import { createGitHubClient } from "./github.mjs";
import { sendResendEmail } from "./email.mjs";
import * as discovery from "./logic.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require = createRequire(import.meta.url);

const args = parseArgs(process.argv.slice(2));

async function main() {
  const lookbackDays = Number(
    args.lookbackDays ?? process.env.DISCOVERY_LOOKBACK_DAYS ?? 8,
  );
  const minScore = Number(args.minScore ?? process.env.DISCOVERY_MIN_SCORE ?? 20);
  const maxPerUser = Number(
    args.maxPerUser ?? process.env.DISCOVERY_MAX_PER_USER ?? 15,
  );
  const delayMs = Number(args.delayMs ?? process.env.DISCOVERY_DELAY_MS ?? 800);
  const publish = Boolean(args.publish);
  const writeInbox = Boolean(args.writeInbox) || publish;
  const skipIssues = Boolean(args.skipIssues);
  const dryRun = Boolean(args.dryRun) || !publish;
  const outPath =
    args.out ||
    path.join(root, ".tmp/discovery", `candidates-${dateStamp()}.json`);
  const inboxPath = path.join(root, "src/data/inbox.json");

  const watchlist = loadJson(path.join(root, "src/data/watchlist.json"));
  const videos = loadJson(path.join(root, "src/data/videos.json"));
  const knownIds = discovery.knownTweetIds(videos);

  // Also skip tweets already sitting in the inbox (any status).
  let existingInbox = { updatedAt: new Date(0).toISOString(), items: [] };
  try {
    existingInbox = loadJson(inboxPath);
    for (const item of existingInbox.items ?? []) {
      if (item?.tweetId) knownIds.add(item.tweetId);
    }
  } catch {
    // first run
  }

  if (!Array.isArray(watchlist) || watchlist.length === 0) {
    throw new Error("Watchlist is empty. Edit src/data/watchlist.json");
  }

  const invalid = watchlist.filter((entry) => !discovery.isValidWatchlistEntry(entry));
  if (invalid.length) {
    throw new Error(
      `Invalid watchlist entries: ${invalid.map((e) => e?.handle ?? "?").join(", ")}`,
    );
  }

  console.log(
    `discovery: ${watchlist.length} accounts · lookback ${lookbackDays}d · minScore ${minScore} · ${
      dryRun ? "dry-run" : "publish"
    }`,
  );

  let postsByHandle;
  if (args.fixture) {
    postsByHandle = await loadFixture(path.resolve(root, args.fixture));
    console.log(`fixture: ${args.fixture}`);
  } else {
    postsByHandle = await fetchFromX(watchlist, {
      maxPerUser,
      delayMs,
      bearerToken: process.env.X_BEARER_TOKEN,
    });
  }

  const candidates = [];
  for (const entry of watchlist) {
    const handle = discovery.normalizeHandle(entry.handle);
    const posts = postsByHandle.get(handle.toLowerCase()) ?? [];
    for (const post of posts) {
      const candidate = discovery.evaluatePost(post, entry, {
        knownIds,
        lookbackDays,
        minScore,
      });
      if (candidate) candidates.push(candidate);
    }
  }

  const ranked = discovery.rankCandidates(candidates);
  // De-dupe by tweet id (same post shouldn't appear twice)
  const unique = [];
  const seen = new Set();
  for (const candidate of ranked) {
    if (seen.has(candidate.post.tweetId)) continue;
    seen.add(candidate.post.tweetId);
    unique.push(candidate);
  }

  console.log(`candidates: ${unique.length}`);
  for (const candidate of unique.slice(0, 20)) {
    console.log(
      `  · ${candidate.score}  @${candidate.draft.authorHandle}  ${candidate.post.tweetUrl}`,
    );
  }

  await mkdir(path.dirname(outPath), { recursive: true });
  await writeFile(
    outPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        lookbackDays,
        minScore,
        count: unique.length,
        candidates: unique,
      },
      null,
      2,
    ),
  );
  console.log(`wrote ${path.relative(root, outPath)}`);

  const repoSlug =
    process.env.DISCOVERY_REPO ||
    process.env.GITHUB_REPOSITORY ||
    "dingyi/whatships.com";
  const week = discovery.weekLabel();
  let createdIssues = [];
  /** @type {Map<string, string>} */
  const issueByTweet = new Map();

  if (!dryRun && !skipIssues) {
    const gh = createGitHubClient({
      token: process.env.GITHUB_TOKEN,
      repository: repoSlug,
    });

    await gh.ensureLabel(discovery.DISCOVERY_ISSUE_LABEL, {
      color: "1D76DB",
      description: "Auto-discovered launch video candidate for editorial review",
    });

    const openIssues = await gh.listOpenIssuesByLabel(
      discovery.DISCOVERY_ISSUE_LABEL,
    );
    const openTweetIds = new Set(
      openIssues
        .map((issue) =>
          discovery.extractTweetIdFromIssueBody(issue.body ?? ""),
        )
        .filter(Boolean),
    );

    for (const candidate of unique) {
      if (openTweetIds.has(candidate.post.tweetId)) {
        console.log(`skip issue (already open): ${candidate.post.tweetId}`);
        const existing = openIssues.find(
          (issue) =>
            discovery.extractTweetIdFromIssueBody(issue.body ?? "") ===
            candidate.post.tweetId,
        );
        if (existing?.html_url) {
          createdIssues.push({
            tweetId: candidate.post.tweetId,
            htmlUrl: existing.html_url,
          });
          issueByTweet.set(candidate.post.tweetId, existing.html_url);
        }
        continue;
      }

      const issue = await gh.createIssue({
        title: discovery.buildDiscoveryIssueTitle(candidate),
        body: discovery.buildDiscoveryIssueBody(candidate),
        labels: [discovery.DISCOVERY_ISSUE_LABEL],
      });
      console.log(`issue #${issue.number}: ${issue.html_url}`);
      createdIssues.push({
        tweetId: candidate.post.tweetId,
        htmlUrl: issue.html_url,
      });
      issueByTweet.set(candidate.post.tweetId, issue.html_url);
      openTweetIds.add(candidate.post.tweetId);
      await sleep(400);
    }
  } else if (dryRun) {
    console.log("dry-run: skipped GitHub issue creation (pass --publish)");
  } else if (skipIssues) {
    console.log("skipped GitHub issues (--skip-issues)");
  }

  // Admin review queue: always merge when publishing, or when --write-inbox.
  // Dry-run still can write with --write-inbox for local seeding.
  if (writeInbox && (!dryRun || args.writeInbox)) {
    // Re-load inbox without treating items as known, so merge can refresh.
    let inboxCurrent = { updatedAt: new Date(0).toISOString(), items: [] };
    try {
      inboxCurrent = loadJson(inboxPath);
    } catch {
      // create fresh
    }

    // Candidates that are brand new OR already known only from inbox itself
    // were filtered by knownIds including inbox. For write-inbox we need the
    // unique list from this run only; also re-include evaluating against
    // catalog-only known set for merge... unique already excludes catalog+inbox.
    // When write-inbox on dry-run with fixture, unique has new items not in inbox.

    // For items only skipped because already in inbox, mergeInbox refreshes them
    // if we pass all video-scored posts. Keep simple: merge `unique` only.
    const catalogOnlyIds = discovery.knownTweetIds(videos);
    const reevaluated = [];
    for (const entry of watchlist) {
      const handle = discovery.normalizeHandle(entry.handle);
      const posts = postsByHandle.get(handle.toLowerCase()) ?? [];
      for (const post of posts) {
        const candidate = discovery.evaluatePost(post, entry, {
          knownIds: catalogOnlyIds,
          lookbackDays,
          minScore,
        });
        if (candidate) reevaluated.push(candidate);
      }
    }
    const rankedForInbox = discovery.rankCandidates(reevaluated);
    const forInbox = [];
    const seenInbox = new Set();
    for (const candidate of rankedForInbox) {
      if (seenInbox.has(candidate.post.tweetId)) continue;
      seenInbox.add(candidate.post.tweetId);
      forInbox.push(candidate);
    }

    const { inbox, added, total, pending } = discovery.mergeInbox(
      inboxCurrent,
      forInbox,
      { issueByTweet },
    );
    await writeFile(inboxPath, `${JSON.stringify(inbox, null, 2)}\n`);
    console.log(
      `inbox: wrote ${path.relative(root, inboxPath)} (+${added} new, ${pending} pending, ${total} total)`,
    );
  }

  await maybeEmail(discovery, unique, {
    weekLabel: week,
    repoUrl: `https://github.com/${repoSlug}`,
    issues: createdIssues,
    force: Boolean(args.email),
    dryRun,
  });

  if (args.failOnEmpty && unique.length === 0) {
    process.exitCode = 2;
  }
}

function loadJson(filePath) {
  return require(filePath);
}

async function loadFixture(filePath) {
  const raw = JSON.parse(await readFile(filePath, "utf8"));
  /** @type {Map<string, any[]>} */
  const map = new Map();

  if (Array.isArray(raw)) {
    for (const post of raw) {
      const key = String(post.authorHandle || "").toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(post);
    }
    return map;
  }

  if (raw && typeof raw === "object" && raw.timelines) {
    for (const [handle, payload] of Object.entries(raw.timelines)) {
      const posts = Array.isArray(payload)
        ? payload
        : mapXTimelineToPosts(payload, handle);
      map.set(handle.toLowerCase(), posts);
    }
    return map;
  }

  throw new Error(
    "Fixture must be an array of posts or { timelines: { handle: apiPayload|posts[] } }",
  );
}

async function fetchFromX(watchlist, { maxPerUser, delayMs, bearerToken }) {
  const client = createXClient(bearerToken);
  /** @type {Map<string, any[]>} */
  const map = new Map();

  for (let index = 0; index < watchlist.length; index++) {
    const entry = watchlist[index];
    const handle = entry.handle.replace(/^@/, "");
    process.stdout.write(`[${index + 1}/${watchlist.length}] @${handle} `);

    try {
      const user = await client.getUserByUsername(handle);
      if (!user?.id) {
        console.log("→ user not found");
        continue;
      }
      const timeline = await client.getUserTweets(user.id, {
        maxResults: maxPerUser,
      });
      const posts = mapXTimelineToPosts(timeline, handle).map((post) => ({
        ...post,
        authorName: post.authorName || user.name || handle,
        authorAvatar:
          post.authorAvatar ||
          user.profile_image_url?.replace("_normal", "_400x400") ||
          null,
      }));
      map.set(handle.toLowerCase(), posts);
      const videoCount = posts.filter((p) =>
        p.media.some((m) => m.type === "video" || m.type === "animated_gif"),
      ).length;
      console.log(`→ ${posts.length} posts (${videoCount} with video)`);
    } catch (error) {
      console.log(`→ error: ${error.message}`);
      if (error.status === 401 || error.status === 403) {
        throw error;
      }
    }

    if (index < watchlist.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return map;
}

async function maybeEmail(discovery, candidates, options) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  const from = process.env.DISCOVERY_FROM_EMAIL;
  const wantEmail = Boolean(options.force);

  if (!wantEmail) {
    console.log("email: skipped (pass --email to send a Resend digest)");
    return;
  }

  if (!apiKey || !to || !from) {
    throw new Error(
      "Email requested but RESEND_API_KEY / NOTIFY_EMAIL / DISCOVERY_FROM_EMAIL are incomplete.",
    );
  }

  const subject = discovery.buildDigestEmailSubject(
    candidates,
    options.weekLabel,
  );
  const html = discovery.buildDigestEmailHtml(candidates, options);
  const text = discovery.buildDigestEmailText(candidates, options);

  const result = await sendResendEmail({
    apiKey,
    from,
    to,
    subject,
    html,
    text,
  });
  console.log(`email: sent to ${to} (${result.id ?? "ok"})`);
}

function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true;
    else if (arg === "--publish") out.publish = true;
    else if (arg === "--write-inbox") out.writeInbox = true;
    else if (arg === "--skip-issues") out.skipIssues = true;
    else if (arg === "--email") out.email = true;
    else if (arg === "--fail-on-empty") out.failOnEmpty = true;
    else if (arg.startsWith("--fixture=")) out.fixture = arg.slice(10);
    else if (arg.startsWith("--out=")) out.out = arg.slice(6);
    else if (arg.startsWith("--lookback-days="))
      out.lookbackDays = arg.slice(16);
    else if (arg.startsWith("--min-score=")) out.minScore = arg.slice(12);
    else if (arg.startsWith("--max-per-user="))
      out.maxPerUser = arg.slice(15);
    else if (arg.startsWith("--delay-ms=")) out.delayMs = arg.slice(11);
    else if (arg === "--help" || arg === "-h") out.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (out.help) {
    console.log(`Usage: node scripts/discovery/run.mjs [options]

Options:
  --dry-run              Evaluate only (default when --publish is absent)
  --publish              Create GitHub issues + write src/data/inbox.json
  --write-inbox          Merge candidates into src/data/inbox.json (admin queue)
  --skip-issues          With --publish, update inbox only (no GitHub issues)
  --email                Send Resend digest (also requires env vars)
  --fixture=PATH         Use fixture JSON instead of X API
  --out=PATH             Write candidates JSON
  --lookback-days=N      Default 8
  --min-score=N          Default 20
  --max-per-user=N       Tweets pulled per account (default 15)
  --delay-ms=N           Delay between X user fetches (default 800)
  --fail-on-empty        Exit 2 when zero candidates
`);
    process.exit(0);
  }
  return out;
}

function dateStamp(now = new Date()) {
  return now.toISOString().replace(/[:.]/g, "-");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
