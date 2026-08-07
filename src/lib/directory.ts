import type { LaunchVideo } from "@/lib/catalog";

// 60 divides evenly by 3, 4, 5, and 6 columns, so a full page never leaves
// a trailing empty cell in the grid at any common viewport width.
export const PAGE_SIZE = 60;

export function filterVideos(
  videos: LaunchVideo[],
  query: string,
  category: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("en");
  return videos.filter((video) => {
    const matchesCategory =
      category === "all" || video.category === category;
    const searchText = [
      video.title,
      video.product,
      video.company,
      video.description,
      video.authorName,
      video.authorHandle,
      video.tags.join(" "),
    ]
      .join(" ")
      .toLocaleLowerCase("en");
    return (
      matchesCategory &&
      (!normalizedQuery || searchText.includes(normalizedQuery))
    );
  });
}

export function clampPage(page: number, totalItems: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  return Math.min(Math.max(1, Math.trunc(page) || 1), totalPages);
}

export function pageWindow(current: number, total: number) {
  const values = new Set([1, total, current - 1, current, current + 1]);
  return Array.from(values)
    .filter((value) => value >= 1 && value <= total)
    .sort((a, b) => a - b);
}
