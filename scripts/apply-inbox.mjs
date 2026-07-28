#!/usr/bin/env node
/**
 * Apply approved inbox items into src/data/videos.json.
 *
 * Usage:
 *   node scripts/apply-inbox.mjs
 *   node scripts/apply-inbox.mjs --dry-run
 *   node scripts/apply-inbox.mjs --keep-approved
 *
 * After applying:
 *   pnpm posters:capture -- --force
 *   (or per-slug)
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const inboxPath = path.join(root, "src/data/inbox.json");
const videosPath = path.join(root, "src/data/videos.json");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const keepApproved = args.has("--keep-approved");

async function main() {
  const inbox = JSON.parse(await readFile(inboxPath, "utf8"));
  const videos = JSON.parse(await readFile(videosPath, "utf8"));

  const approved = (inbox.items ?? []).filter(
    (item) => item.reviewStatus === "approved",
  );
  if (!approved.length) {
    console.log("No approved inbox items to apply.");
    return;
  }

  const byTweet = new Map(videos.map((video) => [video.tweetId, video]));
  const bySlug = new Map(videos.map((video) => [video.slug, video]));
  const byId = new Map(videos.map((video) => [video.id, video]));

  let added = 0;
  let updated = 0;

  for (const item of approved) {
    const entry = {
      ...item.draft,
      status: "published",
    };

    const existing =
      byTweet.get(entry.tweetId) ||
      bySlug.get(entry.slug) ||
      byId.get(entry.id);

    if (existing) {
      const next = { ...existing, ...entry, status: "published" };
      const index = videos.findIndex((video) => video === existing);
      videos[index] = next;
      byTweet.set(entry.tweetId, next);
      bySlug.set(entry.slug, next);
      byId.set(entry.id, next);
      updated += 1;
      console.log(`update ${entry.slug}`);
    } else {
      videos.push(entry);
      byTweet.set(entry.tweetId, entry);
      bySlug.set(entry.slug, entry);
      byId.set(entry.id, entry);
      added += 1;
      console.log(`add ${entry.slug}`);
    }
  }

  const appliedIds = new Set(approved.map((item) => item.tweetId));
  const nextItems = keepApproved
    ? inbox.items
    : (inbox.items ?? []).filter((item) => !appliedIds.has(item.tweetId));

  const nextInbox = {
    updatedAt: new Date().toISOString(),
    items: nextItems,
  };

  console.log(
    `apply: +${added} added, ${updated} updated, remove ${
      keepApproved ? 0 : approved.length
    } from inbox`,
  );

  if (dryRun) {
    console.log("dry-run: no files written");
    return;
  }

  await writeFile(videosPath, `${JSON.stringify(videos, null, 2)}\n`);
  await writeFile(inboxPath, `${JSON.stringify(nextInbox, null, 2)}\n`);
  console.log("wrote src/data/videos.json and src/data/inbox.json");
  console.log("Next: pnpm posters:capture  (or --slug=… for new entries)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
