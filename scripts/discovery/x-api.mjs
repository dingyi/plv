/**
 * Minimal X API v2 client for discovery (Bearer token).
 * Requires paid read access for user timelines / user lookup.
 */

const API = "https://api.x.com/2";

export class XApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "XApiError";
    this.status = status;
    this.body = body;
  }
}

export function createXClient(bearerToken, { fetchImpl = fetch } = {}) {
  if (!bearerToken) {
    throw new Error(
      "Missing X_BEARER_TOKEN. Create an X developer app with read access and set the secret.",
    );
  }

  async function request(path, searchParams = {}) {
    const url = new URL(`${API}${path}`);
    for (const [key, value] of Object.entries(searchParams)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }

    const response = await fetchImpl(url, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
        "User-Agent": "plv-discovery/0.1",
      },
    });

    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!response.ok) {
      const detail =
        json?.detail ||
        json?.title ||
        json?.errors?.[0]?.message ||
        text.slice(0, 200);
      throw new XApiError(`X API ${response.status}: ${detail}`, {
        status: response.status,
        body: json,
      });
    }

    return json;
  }

  async function getUserByUsername(username) {
    const data = await request(`/users/by/username/${encodeURIComponent(username)}`, {
      "user.fields": "name,username,profile_image_url",
    });
    return data?.data ?? null;
  }

  async function getUserTweets(userId, { maxResults = 20, paginationToken } = {}) {
    return request(`/users/${userId}/tweets`, {
      max_results: Math.min(Math.max(maxResults, 5), 100),
      exclude: "replies,retweets",
      expansions: "attachments.media_keys,author_id",
      "tweet.fields":
        "created_at,entities,public_metrics,attachments,text,author_id",
      "media.fields":
        "type,url,preview_image_url,duration_ms,variants,width,height",
      "user.fields": "name,username,profile_image_url",
      pagination_token: paginationToken,
    });
  }

  return { request, getUserByUsername, getUserTweets };
}

export function mapXTimelineToPosts(payload, fallbackHandle) {
  const mediaByKey = new Map(
    (payload.includes?.media ?? []).map((item) => [item.media_key, item]),
  );
  const usersById = new Map(
    (payload.includes?.users ?? []).map((item) => [item.id, item]),
  );

  return (payload.data ?? []).map((tweet) => {
    const author = usersById.get(tweet.author_id);
    const handle = author?.username || fallbackHandle;
    const mediaKeys = tweet.attachments?.media_keys ?? [];
    const media = mediaKeys
      .map((key) => mediaByKey.get(key))
      .filter(Boolean)
      .map(mapXMedia);

    return {
      tweetId: tweet.id,
      tweetUrl: `https://x.com/${handle}/status/${tweet.id}`,
      authorHandle: handle,
      authorName: author?.name || handle,
      authorAvatar: author?.profile_image_url?.replace("_normal", "_400x400") ?? null,
      text: tweet.text ?? "",
      createdAt: tweet.created_at,
      media,
      metrics: {
        likeCount: tweet.public_metrics?.like_count,
        repostCount: tweet.public_metrics?.retweet_count,
        replyCount: tweet.public_metrics?.reply_count,
        viewCount: tweet.public_metrics?.impression_count,
      },
    };
  });
}

function mapXMedia(item) {
  const type =
    item.type === "video" || item.type === "animated_gif" || item.type === "photo"
      ? item.type
      : "unknown";

  let videoUrl = null;
  if (Array.isArray(item.variants)) {
    const mp4s = item.variants
      .filter((variant) => variant.content_type === "video/mp4" && variant.url)
      .sort((a, b) => (b.bit_rate ?? 0) - (a.bit_rate ?? 0));
    // Prefer a mid/high quality but not always the absolute largest for storage.
    videoUrl = mp4s[0]?.url ?? null;
  }

  return {
    type,
    previewImageUrl: item.preview_image_url ?? item.url ?? null,
    durationMs: item.duration_ms ?? null,
    videoUrl,
  };
}

export async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
