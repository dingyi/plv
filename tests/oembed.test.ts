import { describe, expect, it } from "vitest";

import { normalizeTweetUrl } from "@/lib/catalog";
import { fetchTweetOEmbed } from "@/lib/oembed";

describe("normalizeTweetUrl", () => {
  it("normalizes twitter hosts to x.com without query noise", () => {
    expect(
      normalizeTweetUrl(
        "https://twitter.com/linear/status/2079233260161323371?s=20",
      ),
    ).toBe("https://x.com/linear/status/2079233260161323371");
  });
});

describe("fetchTweetOEmbed", () => {
  it(
    "fetches embed HTML for a known public launch post",
    async () => {
      const result = await fetchTweetOEmbed(
        "https://x.com/linear/status/2079233260161323371",
      );
      expect(result).not.toBeNull();
      expect(result?.html).toContain("twitter-tweet");
      expect(result?.provider_name).toMatch(/x|twitter/i);
    },
    20_000,
  );
});
