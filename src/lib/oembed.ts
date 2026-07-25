export interface TweetOEmbed {
  url: string;
  author_name: string;
  author_url: string;
  html: string;
  width: number | null;
  height: number | null;
  type: string;
  provider_name: string;
  provider_url: string;
  version: string;
  cache_age?: string;
}

const cache = new Map<string, TweetOEmbed | null>();

export async function fetchTweetOEmbed(
  tweetUrl: string,
): Promise<TweetOEmbed | null> {
  if (cache.has(tweetUrl)) return cache.get(tweetUrl) ?? null;

  const endpoint = new URL("https://publish.twitter.com/oembed");
  endpoint.searchParams.set("url", tweetUrl);
  endpoint.searchParams.set("omit_script", "true");
  endpoint.searchParams.set("dnt", "true");
  endpoint.searchParams.set("theme", "light");
  endpoint.searchParams.set("align", "center");

  try {
    const response = await fetch(endpoint.toString(), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      cache.set(tweetUrl, null);
      return null;
    }
    const data = (await response.json()) as TweetOEmbed;
    cache.set(tweetUrl, data);
    return data;
  } catch {
    cache.set(tweetUrl, null);
    return null;
  }
}
