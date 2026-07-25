# Product Launch Videos (plv)

A curated directory of product launch videos, demos, and walkthroughs shared on X/Twitter.

Architecture is adapted from [studio.list](https://github.com/dingyi/studio.list): Astro static site, React islands for interactive search/filter, Tailwind + shadcn/Base UI, JSON-backed catalog.

## Local development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:4321](http://localhost:4321).

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the Astro dev server |
| `pnpm build` | Production static build (fetches X oEmbed at build time) |
| `pnpm preview` | Preview the production build |
| `pnpm check` | Astro + TypeScript check |
| `pnpm test:run` | Unit tests (Vitest) |
| `pnpm posters:capture` | Download amplify MP4s and extract 16:9 WebP posters |

## Adding curated videos

Edit `src/data/videos.json`. Each published entry needs:

- stable `slug` and `id`
- product/company metadata
- `category` from the allowed list in `src/lib/catalog.ts`
- `tweetUrl` / `tweetId` for the original X post
- optional `videoUrl` (amplify MP4) used only by `posters:capture`
- `poster` path under `public/posters/`
- `status: "published"` (drafts stay offline)

After adding a `videoUrl`, capture the poster:

```bash
pnpm posters:capture -- --slug=your-slug --force
```

Detail pages embed the original post via X’s oEmbed API during `pnpm build`. If oEmbed fails, the page falls back to the local poster plus a Watch on X link.

## Submissions

Open `/submit/` to propose a launch. The form validates an X status URL and product metadata, then opens a prefilled GitHub issue on `dingyi/plv` for editorial review. Approved entries are merged into `src/data/videos.json`.

## Stack

- [Astro](https://astro.build/) (static output)
- React 19 islands
- Tailwind CSS 4
- shadcn + Base UI
- Vitest

## License

MIT for original source code and documentation. Product names, trademarks, and third-party video content remain the property of their respective owners.
