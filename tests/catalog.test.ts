import { describe, expect, it } from "vitest";

import {
  getSimilarVideos,
  publishedVideos,
  type LaunchVideo,
} from "@/lib/catalog";

describe("catalog", () => {
  it("only exposes published videos sorted by recency", () => {
    expect(publishedVideos.length).toBeGreaterThan(0);
    expect(publishedVideos.every((video) => video.status === "published")).toBe(
      true,
    );

    for (let index = 1; index < publishedVideos.length; index += 1) {
      const previous = Date.parse(publishedVideos[index - 1].publishedAt);
      const current = Date.parse(publishedVideos[index].publishedAt);
      expect(previous).toBeGreaterThanOrEqual(current);
    }
  });

  it("returns similar videos preferring the same category", () => {
    const seed = publishedVideos.find(
      (video) => video.category === "ai",
    ) as LaunchVideo;
    const similar = getSimilarVideos(seed, publishedVideos, 3);
    expect(similar).toHaveLength(3);
    expect(similar.every((video) => video.slug !== seed.slug)).toBe(true);
    expect(similar.some((video) => video.category === seed.category)).toBe(
      true,
    );
  });

  it("keeps unique slugs", () => {
    const slugs = publishedVideos.map((video) => video.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
