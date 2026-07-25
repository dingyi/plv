import { describe, expect, it } from "vitest";

import { publishedVideos } from "@/lib/catalog";
import {
  clampPage,
  filterVideos,
  PAGE_SIZE,
  pageWindow,
} from "@/lib/directory";

describe("filterVideos", () => {
  it("filters by category", () => {
    const ai = filterVideos(publishedVideos, "", "ai");
    expect(ai.length).toBeGreaterThan(0);
    expect(ai.every((video) => video.category === "ai")).toBe(true);
  });

  it("filters by free-text query across title and company", () => {
    const hits = filterVideos(publishedVideos, "linear", "all");
    expect(hits.some((video) => /linear/i.test(video.company))).toBe(true);
  });

  it("returns all published videos for empty filters", () => {
    expect(filterVideos(publishedVideos, "", "all")).toHaveLength(
      publishedVideos.length,
    );
  });
});

describe("pagination helpers", () => {
  it("clamps pages to the valid range", () => {
    expect(clampPage(0, 10)).toBe(1);
    expect(clampPage(99, 10)).toBe(1);
    expect(clampPage(2, PAGE_SIZE + 1)).toBe(2);
  });

  it("builds a compact page window", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 5]);
    expect(pageWindow(3, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});
