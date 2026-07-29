/**
 * plv video proxy — relays video.twimg.com / pbs.twimg.com media so launch
 * videos can play in-site.
 *
 * Why: X's CDN returns 403 for any non-Twitter Referer, and browsers always
 * attach a Referer to <video> requests (even with referrerpolicy=no-referrer).
 * This Worker fetches upstream server-side with no Referer, so playback works
 * from any origin. Same approach as proxy.minttr.com, but self-hosted.
 *
 * Usage:  GET /?url=<encodeURIComponent(https://video.twimg.com/….mp4)>
 *
 * Deploy: see README.md in this directory (wrangler deploy). Free plan is
 * enough — billing is per request, media bytes do not count as CPU time.
 */

const ALLOWED_HOSTS = new Set(["video.twimg.com", "pbs.twimg.com"]);

// Browser-ish UA: some CDN edges serve 403 to obviously-scripted clients.
const UPSTREAM_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

// Response headers worth keeping from upstream. Everything else (server,
// set-cookie, x-*) is dropped.
const PASSTHROUGH_HEADERS = [
  "content-type",
  "content-length",
  "content-range",
  "accept-ranges",
  "etag",
  "last-modified",
];

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
  "Access-Control-Allow-Headers": "Range",
  "Access-Control-Expose-Headers":
    "Content-Length, Content-Range, Accept-Ranges",
};

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method not allowed", { status: 405 });
    }

    const raw = new URL(request.url).searchParams.get("url");
    if (!raw) return new Response("Missing ?url=", { status: 400 });

    let target;
    try {
      target = new URL(raw);
    } catch {
      return new Response("Invalid ?url=", { status: 400 });
    }
    if (target.protocol !== "https:" || !ALLOWED_HOSTS.has(target.hostname)) {
      return new Response("Host not allowed", { status: 403 });
    }

    const upstreamHeaders = new Headers({ "User-Agent": UPSTREAM_UA });
    // No Referer/Origin on purpose — that is the whole point of the proxy.
    const range = request.headers.get("Range");
    if (range) upstreamHeaders.set("Range", range);

    let upstream;
    try {
      upstream = await fetch(target.toString(), {
        headers: upstreamHeaders,
        redirect: "follow",
      });
    } catch {
      return new Response("Upstream fetch failed", { status: 502 });
    }

    const headers = new Headers(CORS_HEADERS);
    for (const name of PASSTHROUGH_HEADERS) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    // Media URLs are immutable per variant; let browsers and the edge cache.
    headers.set("Cache-Control", "public, max-age=86400, immutable");

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  },
};
