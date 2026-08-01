# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Primary visitor _(inferred from README, CONTEXT.md, and `/about` copy)_:
  founders, designers, marketers, and builders who want to study how startups
  announce themselves. Their job: browse launch films visually, filter/search
  fast, inspect concise metadata, and jump to the original X post.
- Submitters: visitors who propose a launch video via `/submit/`; their
  proposal becomes a GitHub issue, not a published entry.
- Editor/curator (the site owner): reviews discovery candidates and
  submissions in `/admin`, approves/rejects, and publishes. Soft security is
  acceptable — single-operator editorial tool, not multi-tenant.

## Product Purpose

whatships.com is a curated, durable directory of startup launch videos
(launch films, demos, walkthroughs) shared on X. Great launch videos
disappear into timelines within hours; the site keeps a searchable index
that outlives them, so people can study how products announce themselves.

Success means: high-signal browsing with fast filter and search, a catalog
that stays complete and linkable over time, every entry traceable to its
original X post, and a steady stream of new launches arriving weekly through
a human-reviewed pipeline. Explicitly not rankings, ads, or paid placement.

## Positioning

Editorial curation plus durability: a hand-reviewed, categorized index with
locally captured poster art and self-hosted in-site playback (via the
`proxy.whatships.com` worker that sidesteps X CDN's Referer block) — whereas
X timelines are ephemeral, unfiltered, and unplayable off-platform, and
aggregators either auto-scrape without review or don't preserve the videos.
Independence is a commitment: no affiliation with X or the products shown,
no paid placement.

## Operating Context

- Catalog lives in `src/data/videos.json`; published entries need complete
  metadata (`slug`, product info, category, `tweetUrl`/`tweetId`, `videoUrl`,
  poster, `status: "published"`). File order doesn't matter — sorting is by
  `publishedAt` desc at runtime.
- Weekly discovery: a GitHub Action scans a curated X watchlist
  (`src/data/watchlist.json`), filters for video + launch signals, and
  stages candidates in `src/data/inbox.json` for `/admin` review — never
  straight to published.
- Adding a video is a scripted recipe (syndication fetch → videos.json entry
  → poster capture → test/build/deploy); documented in AGENTS.md.
- Deploys: every push to `main` auto-deploys to Cloudflare Workers static
  assets via GitHub Actions.
- Playback constraint: X's CDN (`video.twimg.com`) 403s any non-Twitter
  Referer, so playback must route through the self-hosted proxy
  (`workers/video-proxy/`). `PUBLIC_VIDEO_PROXY_BASE` is inlined at build
  time. Local `/streams/` files are a dev-only fallback and must never be
  committed.

## Capabilities and Constraints

- Fixed editorial taxonomy: `ai`, `developer-tools`, `design`, `motion`,
  `productivity`, `consumer`, `hardware`, `other`. Categories are the
  primary filter; tags are secondary.
- `motion` is the category for non-product-launch films (reels, demos,
  farewells) — launch-adjacent craft still belongs in the index.
- Terminology is defined in CONTEXT.md: "Launch Video", "Poster" (16:9
  locally captured frame, never a hotlinked thumbnail), "Original Post
  Action" (must always open the source X post in a new tab), "Submission",
  "Discovery Candidate", "Admin Inbox", "Watchlist".
- Every entry must link back to the original X post; an in-app embed is
  never the only path.
- No unmoderated public write path: submissions open prefilled GitHub
  issues; discovery candidates require human approval in `/admin` plus an
  apply step (`pnpm inbox:apply`).
- Stack: Astro (static output) + React 19 islands + Tailwind CSS 4 +
  shadcn/Base UI + Vitest, on Cloudflare Workers.
- X API credits are depleted; new videos are fetched via the public
  syndication endpoint, not the paid API.
- Posters are captured locally at 1440×810 plus a `-960` grid variant;
  the `poster` field points at the 1440w file.
- Copy conventions: titles ≤ 55 chars; dates rendered UTC-pinned via
  `formatPublishedAt`.

## Brand Commitments

- Name: whatships.com.
- Voice/positioning phrases in use: "built for useful browsing, not
  rankings, ads, or paid placement"; independent, not affiliated with
  X/Twitter or listed products.
- Visual language (incumbent, recorded in code): noiced-style sharp chrome —
  square corners, 0.5px hairlines, mono 11px uppercase micro labels; motion
  tokens in `src/styles/global.css`.

## Evidence on Hand

- Real catalog: `src/data/videos.json` (published + draft entries) with
  captured poster art in `public/posters/`.
- Working discovery pipeline with fixture data for offline runs.
- About page copy (`src/pages/about.astro`) states mission, inclusion
  criteria, curation flow, and independence.
- No testimonials, press, usage metrics, or pricing exist — future work
  must not fabricate them.

## Product Principles

1. Curation over automation: nothing is published without human review;
   automation only stages candidates.
2. Durability over timeliness: the index must outlive the timeline — local
   posters, stable slugs, complete metadata.
3. Always credit the source: every entry links back to the original X post.
4. Signal over volume: a fixed taxonomy, concise metadata, and no ads,
   rankings, or paid placement keep browsing useful.
5. Independence: no affiliation with X or the products shown; trademarks and
   video content remain their owners'.
