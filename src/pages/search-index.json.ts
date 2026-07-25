import { categoryLabel, publishedVideos } from "@/lib/catalog";

export const prerender = true;

export function GET() {
  const items = publishedVideos.map((video) => ({
    name: video.title,
    slug: video.slug,
    meta: `${video.company} · ${categoryLabel(video.category)}`,
    searchText: [
      video.title,
      video.product,
      video.company,
      video.description,
      video.authorName,
      video.authorHandle,
      video.tags.join(" "),
      categoryLabel(video.category),
    ]
      .join(" ")
      .toLocaleLowerCase(),
  }));

  return new Response(JSON.stringify(items), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
