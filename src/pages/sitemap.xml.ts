import { publishedVideos } from "@/lib/catalog";

export const GET = () => {
  const base = "https://whatships.com";
  const paths = [
    "/",
    "/about/",
    "/submit/",
    ...publishedVideos.map((video) => `/videos/${video.slug}/`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map((path) => `\n  <url><loc>${base}${path}</loc></url>`).join("")}\n</urlset>\n`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
};
