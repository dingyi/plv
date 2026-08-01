# whatships.com — agent guide

A curated directory of startup launch videos from X, live at
[whatships.com](https://whatships.com). Astro static site + React islands,
hosted on Cloudflare Workers static assets.

## Commands

```bash
npx pnpm install          # pnpm 11 (no global pnpm on PATH; use npx)
node_modules/.bin/astro dev
node_modules/.bin/astro build
node_modules/.bin/astro check
node_modules/.bin/vitest run
node_modules/.bin/wrangler deploy   # manual deploy (see below)
```

## Deployment (read carefully)

- **Every push to `main` auto-deploys** via `.github/workflows/deploy.yml`:
  build (with `PUBLIC_VIDEO_PROXY_BASE` inlined) → `rm -rf dist/streams` →
  `wrangler deploy`. Check runs with `gh run list`.
- Manual deploy: `npx pnpm deploy` (same three steps). Needs
  `CLOUDFLARE_API_TOKEN` in the environment.
- Domains: `whatships.com` + `www` serve the site; `proxy.whatships.com` is
  the video proxy worker (`workers/video-proxy/`, deployed separately with
  its own wrangler.toml).
- **Never commit `public/streams/` or `dist/`** — both are gitignored.
  Local streams are gone for good; do not regenerate or re-add them.

## Video playback architecture

X's CDN (`video.twimg.com`) returns 403 for any non-Twitter Referer, and
browsers always send one on `<video>` requests. Playback therefore goes
through the self-hosted proxy (`workers/video-proxy/src/index.js`), which
fetches upstream Referer-less and forwards `Range`.

`playbackUrl()` in `src/lib/catalog.ts` resolves in order:
`streamUrl` override → proxy-wrapped `videoUrl` (when
`PUBLIC_VIDEO_PROXY_BASE` is set) → `/streams/{slug}.mp4` (dev fallback).
The base URL lives in `.env` locally and in the Actions workflow for builds.

## Adding videos (the established recipe)

1. Fetch tweet data from the public syndication endpoint (X API credits are
   depleted; do NOT use the paid API):
   `https://cdn.syndication.twimg.com/tweet-result?id=<id>&token=<t>&lang=en`
   where `t = ((id / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "")`.
   Working fetch scripts live in `.tmp/add-tweets/` (gitignored scratch).
2. Append an entry to `src/data/videos.json` matching the existing schema
   exactly (`id: plv-<slug>`, all fields, `status: "published"`,
   `featured: false`). Skip duplicates by `tweetId`/`slug`.
   Non-product-launch films (reels, demos, farewells) use
   `category: "motion"`.
3. Capture posters **per slug** (full-catalog runs are slow and get killed):
   `node scripts/capture-posters.mjs --slug=<slug>` — emits
   `public/posters/<slug>.webp` (1440×810) and `<slug>-960.webp` (grid).
   The script no longer produces streams; ignore `public/streams` entirely.
4. `node_modules/.bin/vitest run` → `astro build` → commit
   (`videos.json` + `public/posters/`) → push. Actions deploys in ~1 min.
   New pages can 404 briefly at the edge; retry before assuming failure.

## Data & taxonomy

- Catalog: `src/data/videos.json` (published + draft). `publishedVideos`
  sorts by `publishedAt` desc at runtime — file order does not matter.
- Categories (`src/lib/catalog.ts`): `ai`, `developer-tools`, `design`,
  `motion`, `productivity`, `consumer`, `hardware`, `other`.
- Admin review queue: `src/data/inbox.json` + `/admin`
  (`scripts/apply-inbox.mjs` merges approved drafts).
- Weekly discovery: `scripts/discovery/` + `src/data/watchlist.json`.

## Conventions

- Design language: noiced-style sharp chrome — square corners, 0.5px
  `--grid-line` hairlines, mono 11px uppercase micro labels. Keep new UI in
  this idiom; motion tokens are defined in `src/styles/global.css`.
- Titles ≤ 55 chars (Google truncation). Dates format via
  `formatPublishedAt` (UTC-pinned — do not remove the `timeZone`).
- Grid posters need both sizes; `poster` field always points to the 1440w
  file, code derives the `-960` variant.
- Validate pnpm config edits — no placeholder text in
  `pnpm-workspace.yaml` (`allowBuilds` takes booleans).
