# plv video proxy

Self-hosted Cloudflare Worker that relays `video.twimg.com` / `pbs.twimg.com`
media so launch videos can play in-site. X's CDN returns **403 for any
non-Twitter Referer**, and browsers always attach a Referer to `<video>`
requests — this Worker fetches upstream without one.

Same approach as `https://proxy.minttr.com/?url=…`, but on your own account:
no third-party bandwidth, no lock-in, free-plan friendly (Workers bill per
request, not per media byte streamed).

## Usage

```
GET https://<your-worker>.workers.dev/?url=<encodeURIComponent(upstream URL)>
```

- Only `GET`/`HEAD`; only `https://video.twimg.com` and `https://pbs.twimg.com`
  targets are allowed (open-proxy guard).
- `Range` is forwarded, so seeking and progressive download work.
- Responses are marked `Cache-Control: public, max-age=86400, immutable`.

## Deploy

```sh
cd workers/video-proxy
npx wrangler login        # once, opens Cloudflare auth
npx wrangler deploy       # prints https://plv-video-proxy.<account>.workers.dev
```

Then point the site at it (build-time public env):

```sh
# .env (never commit) or your Pages/CI environment
PUBLIC_VIDEO_PROXY_BASE=https://plv-video-proxy.<account>.workers.dev
```

`playbackUrl()` in `src/lib/catalog.ts` wraps each video's original
`videoUrl` with the proxy when the variable is set; without it, playback
falls back to local `/streams/{slug}.mp4` (dev, via `pnpm posters:capture`).

## Notes

- The local streams under `public/streams/` become unnecessary once the proxy
  is deployed — they are gitignored; only posters ship with the site.
- Cost: a video play is a handful of requests (metadata + a few range
  chunks). The free plan's 100k requests/day covers heavy usage.
