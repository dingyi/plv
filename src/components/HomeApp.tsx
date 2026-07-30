import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Play,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import PageHeader from "@/components/PageHeader";
import VideoPlayerDialog from "@/components/VideoPlayerDialog";
import VideoSearch, {
  type VideoSearchItem,
} from "@/components/VideoSearch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  CATEGORIES,
  categoryLabel,
  formatDuration,
  formatPublishedAt,
  type LaunchVideo,
} from "@/lib/catalog";
import {
  clampPage,
  filterVideos,
  PAGE_SIZE,
  pageWindow,
} from "@/lib/directory";

interface Props {
  videos: LaunchVideo[];
}

function VideoCard({
  video,
  onPlay,
}: {
  video: LaunchVideo;
  onPlay: (video: LaunchVideo) => void;
}) {
  const duration = formatDuration(video.durationSeconds);

  function rememberReturn() {
    window.history.replaceState(
      {
        ...(window.history.state ?? {}),
        plvReturn: {
          slug: video.slug,
          scrollY: window.scrollY,
        },
      },
      "",
      window.location.href,
    );
  }

  return (
    <article className="video-card">
      <span className="corner one" aria-hidden="true" />
      <span className="corner two" aria-hidden="true" />
      <span className="corner three" aria-hidden="true" />
      <span className="corner four" aria-hidden="true" />
      <div className="video-card__main" data-video-slug={video.slug}>
        <button
          type="button"
          className="video-card__media"
          onClick={() => onPlay(video)}
          aria-label={`Play ${video.title}`}
        >
          <img
            src={video.poster}
            alt=""
            loading="lazy"
            width="1440"
            height="810"
          />
          <span className="video-card__play" aria-hidden="true">
            <Play size={18} fill="currentColor" />
          </span>
          {duration && (
            <span className="video-card__duration">{duration}</span>
          )}
          <span className="video-card__hover-label" aria-hidden="true">
            <span>{video.company}</span>
          </span>
        </button>
        <div className="video-card__body">
          <div>
            <h2>
              <a
                href={`/videos/${video.slug}/`}
                onClick={(event) => {
                  if (
                    event.button !== 0 ||
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  )
                    return;
                  rememberReturn();
                }}
              >
                {video.title}
              </a>
            </h2>
            <p className="video-card__meta">
              {video.company}
              <span aria-hidden="true"> · </span>
              {categoryLabel(video.category)}
              <span aria-hidden="true"> · </span>
              {formatPublishedAt(video.publishedAt)}
            </p>
          </div>
        </div>
      </div>
      <a
        className="video-card__external"
        href={video.tweetUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open original post for ${video.title} on X`}
      >
        <ExternalLink size={17} aria-hidden="true" />
      </a>
    </article>
  );
}

export default function HomeApp({ videos }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [newsletterOpen, setNewsletterOpen] = useState(false);
  const [playingVideo, setPlayingVideo] = useState<LaunchVideo | null>(null);
  const [ready, setReady] = useState(false);

  const searchItems = useMemo<VideoSearchItem[]>(
    () =>
      videos.map((video) => ({
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
      })),
    [videos],
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setQuery(params.get("q") ?? "");
    setCategory(params.get("category") ?? "all");
    setPage(Number(params.get("page") ?? 1));
    setSearchOpen(params.get("search") === "1");
    setReady(true);
  }, []);

  const filtered = useMemo(
    () => filterVideos(videos, query, category),
    [videos, query, category],
  );
  const currentPage = clampPage(page, filtered.length);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const selectedCategoryLabel =
    category === "all"
      ? null
      : CATEGORIES.find((item) => item.id === category)?.label;
  const emptyContext = [
    query ? `“${query}”` : null,
    selectedCategoryLabel,
  ]
    .filter(Boolean)
    .join(" in ");

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category !== "all") params.set("category", category);
    if (currentPage > 1) params.set("page", String(currentPage));
    const queryString = params.toString();
    window.history.replaceState(
      window.history.state ?? {},
      "",
      queryString
        ? `${window.location.pathname}?${queryString}`
        : window.location.pathname,
    );
  }, [category, currentPage, query, ready]);

  useEffect(() => {
    if (!ready) return;

    const restoreDirectoryPosition = () => {
      const returnState = window.history.state?.plvReturn as
        | { slug?: string; scrollY?: number }
        | undefined;
      if (!returnState?.slug) return;

      window.requestAnimationFrame(() => {
        const target = document.querySelector<HTMLAnchorElement>(
          `[data-video-slug="${CSS.escape(returnState.slug!)}"]`,
        );
        if (!target) return;

        if (typeof returnState.scrollY === "number") {
          window.scrollTo({ top: returnState.scrollY, behavior: "instant" });
        }
        target.focus({ preventScroll: true });
      });
    };

    restoreDirectoryPosition();
    window.addEventListener("pageshow", restoreDirectoryPosition);
    return () =>
      window.removeEventListener("pageshow", restoreDirectoryPosition);
  }, [ready, currentPage]);

  function choosePage(next: number) {
    setPage(next);
    document
      .querySelector<HTMLElement>("#directory-title")
      ?.focus({ preventScroll: true });
    document
      .querySelector("#directory")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <PageHeader
        active="discover"
        homeSearch
        onSearch={() => setSearchOpen(true)}
      />
      <main data-directory-ready={ready}>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero__inner">
            <h1 id="hero-title">
              Discover product launch videos from X
            </h1>
            <p className="hero__copy">
              A curated edit of launch films, demos, and walkthroughs that
              introduce new products to the world.
            </p>
            <form
              className="hero__subscribe"
              aria-label="Newsletter subscription"
              onSubmit={(event) => {
                event.preventDefault();
                setNewsletterOpen(true);
              }}
            >
              <label className="sr-only" htmlFor="newsletter-email">
                Newsletter email address
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@email.com"
                required
                aria-label="Newsletter email address"
              />
              <button type="submit" aria-label="Subscribe to the whatships.com newsletter">
                Subscribe
              </button>
            </form>
          </div>
        </section>

        <section
          className="directory"
          id="directory"
          aria-labelledby="directory-title"
        >
          <div className="directory-toolbar">
            <div className="directory-controls">
              <Select
                value={category}
                onValueChange={(value) => {
                  setCategory(value || "all");
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="category-select"
                  aria-label="Filter by category"
                  placeholder="All categories"
                />
                <SelectContent>
                  <SelectItem index={0} value="all">
                    All categories
                  </SelectItem>
                  {CATEGORIES.map((item, index) => (
                    <SelectItem
                      key={item.id}
                      index={index + 1}
                      value={item.id}
                    >
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="result-count" id="directory-title" tabIndex={-1}>
                {filtered.length} video{filtered.length === 1 ? "" : "s"}
              </p>
            </div>
            <button
              className="directory-search"
              type="button"
              aria-label="Search launch videos"
              onClick={() => setSearchOpen(true)}
            >
              <Search aria-hidden="true" size={15} strokeWidth={1.8} />
              <span>Search videos</span>
              <kbd aria-hidden="true">
                <span>⌘</span>K
              </kbd>
            </button>
          </div>

          {visible.length ? (
            <div className="video-grid">
              {visible.map((video) => (
                <VideoCard
                  video={video}
                  key={video.id}
                  onPlay={setPlayingVideo}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <h2>No videos found.</h2>
              <p>No results for {emptyContext || "the current filters"}.</p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                  setPage(1);
                }}
              >
                Reset filters
              </button>
            </div>
          )}

          {totalPages > 1 && (
            <nav className="pagination" aria-label="Directory pages">
              <button
                type="button"
                onClick={() => choosePage(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Previous page"
              >
                <ArrowLeft size={16} />
              </button>
              {pageWindow(currentPage, totalPages).map(
                (value, index, values) => (
                  <span key={value} className="pagination__item">
                    {index > 0 && value - values[index - 1] > 1 && (
                      <span className="pagination__ellipsis">…</span>
                    )}
                    <button
                      className={currentPage === value ? "is-active" : ""}
                      type="button"
                      onClick={() => choosePage(value)}
                      aria-current={currentPage === value ? "page" : undefined}
                    >
                      {value}
                    </button>
                  </span>
                ),
              )}
              <button
                type="button"
                onClick={() => choosePage(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Next page"
              >
                <ArrowRight size={16} />
              </button>
            </nav>
          )}
        </section>
      </main>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="search-dialog" showCloseButton={false}>
          <DialogTitle className="sr-only">Search launch videos</DialogTitle>
          <VideoSearch
            items={searchItems}
            value={query}
            onValueChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            onClose={() => setSearchOpen(false)}
          />
        </DialogContent>
      </Dialog>
      <Dialog open={newsletterOpen} onOpenChange={setNewsletterOpen}>
        <DialogContent className="notice-dialog">
          <DialogTitle>Subscriptions are opening soon.</DialogTitle>
          <DialogDescription>
            A weekly whatships.com digest is still being prepared. Your email has not
            been stored or sent anywhere.
          </DialogDescription>
        </DialogContent>
      </Dialog>
      <VideoPlayerDialog
        video={playingVideo}
        open={Boolean(playingVideo)}
        onOpenChange={(open) => {
          if (!open) setPlayingVideo(null);
        }}
      />
    </>
  );
}
