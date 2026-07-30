#!/usr/bin/env node
/**
 * Capture 16:9 WebP posters and compressed same-origin streams from amplify MP4s.
 *
 * Usage:
 *   node scripts/capture-posters.mjs
 *   node scripts/capture-posters.mjs --slug=linear-loops --force
 */
import { spawn } from "node:child_process";
import { mkdir, readFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const videosPath = path.join(root, "src/data/videos.json");
const postersDir = path.join(root, "public/posters");
const streamsDir = path.join(root, "public/streams");
const tmpDir = path.join(root, ".tmp/poster-capture");

const args = new Set(process.argv.slice(2));
const force = args.has("--force");
const slugArg = [...args].find((value) => value.startsWith("--slug="));
const onlySlug = slugArg?.slice("--slug=".length);

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code}`));
    });
  });
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function capture(video) {
  if (!video.videoUrl) {
    console.log(`skip ${video.slug}: no videoUrl`);
    return;
  }

  const posterRel = video.poster.startsWith("/")
    ? video.poster.slice(1)
    : video.poster;
  const posterAbs = path.join(root, "public", posterRel.replace(/^public\//, ""));
  const streamAbs = path.join(streamsDir, `${video.slug}.mp4`);

  const needPoster = force || !(await exists(posterAbs));
  const needStream = force || !(await exists(streamAbs));
  if (!needPoster && !needStream) {
    console.log(`keep ${video.slug}`);
    return;
  }

  await mkdir(path.dirname(posterAbs), { recursive: true });
  await mkdir(streamsDir, { recursive: true });
  await mkdir(tmpDir, { recursive: true });
  const tmpMp4 = path.join(tmpDir, `${video.slug}.mp4`);

  console.log(`download ${video.slug}`);
  await run("curl", [
    "-fsSL",
    "--max-time",
    "300",
    "-A",
    "Mozilla/5.0",
    "-o",
    tmpMp4,
    video.videoUrl,
  ]);

  if (needPoster) {
    const seek =
      video.durationSeconds && video.durationSeconds > 6
        ? "00:00:02.5"
        : "00:00:00.8";
    console.log(`poster ${video.slug} @ ${seek}`);
    await run("ffmpeg", [
      "-y",
      "-ss",
      seek,
      "-i",
      tmpMp4,
      "-frames:v",
      "1",
      "-vf",
      "scale=1440:810:force_original_aspect_ratio=increase,crop=1440:810",
      "-c:v",
      "libwebp",
      "-quality",
      "82",
      posterAbs,
    ]);
    // Grid-sized variant for responsive <img srcset> (cards render ~420px).
    await run("ffmpeg", [
      "-y",
      "-i",
      posterAbs,
      "-vf",
      "scale=960:-2",
      "-q:v",
      "80",
      posterAbs.replace(/\.webp$/, "-960.webp"),
    ]);
  }

  if (needStream) {
    console.log(`stream ${video.slug}`);
    // Re-encode a lean progressive MP4 for reliable same-origin playback.
    await run("ffmpeg", [
      "-y",
      "-i",
      tmpMp4,
      "-vf",
      "scale='min(1280,iw)':-2",
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-c:a",
      "aac",
      "-b:a",
      "96k",
      "-movflags",
      "+faststart",
      streamAbs,
    ]);
  }
}

const videos = JSON.parse(await readFile(videosPath, "utf8"));
const targets = videos.filter((video) =>
  onlySlug ? video.slug === onlySlug : video.status === "published",
);

if (!targets.length) {
  console.error("No matching videos.");
  process.exit(1);
}

await mkdir(postersDir, { recursive: true });
await mkdir(streamsDir, { recursive: true });

for (const video of targets) {
  try {
    await capture(video);
  } catch (error) {
    console.error(`failed ${video.slug}:`, error.message ?? error);
  }
}
