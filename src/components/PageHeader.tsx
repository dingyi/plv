import { Menu, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import VideoSearch, {
  type VideoSearchItem,
} from "@/components/VideoSearch";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  active?: "discover" | "about" | "submit";
  homeSearch?: boolean;
  onSearch?: () => void;
}

export default function PageHeader({
  active,
  homeSearch = false,
  onSearch,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchItems, setSearchItems] = useState<VideoSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [ready, setReady] = useState(false);

  const openSearch = useCallback(() => {
    if (homeSearch) onSearch?.();
    else setSearchOpen(true);
  }, [homeSearch, onSearch]);

  useEffect(() => {
    setReady(true);
    const openSearchShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k")
        return;
      const target = event.target as HTMLElement | null;
      if (
        target?.matches("input, textarea, select") ||
        target?.isContentEditable
      )
        return;
      event.preventDefault();
      openSearch();
    };
    window.addEventListener("keydown", openSearchShortcut);
    return () => {
      window.removeEventListener("keydown", openSearchShortcut);
    };
  }, [openSearch]);

  useEffect(() => {
    if (homeSearch || !searchOpen || searchItems.length) return;
    let ignore = false;
    setSearchLoading(true);
    fetch("/search-index.json")
      .then((response) => {
        if (!response.ok) throw new Error("Search index unavailable");
        return response.json() as Promise<VideoSearchItem[]>;
      })
      .then((items) => {
        if (!ignore) setSearchItems(items);
      })
      .catch(() => {
        if (!ignore) setSearchItems([]);
      })
      .finally(() => {
        if (!ignore) setSearchLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [homeSearch, searchItems.length, searchOpen]);

  return (
    <>
      <header className="site-header" data-header-ready={ready}>
        <nav className="site-nav" aria-label="Primary navigation">
          <div className="nav-left">
            <a className="wordmark" href="/" aria-label="plv home">
              plv
            </a>
            <div className="desktop-nav">
              <a
                className={active === "discover" ? "is-active" : ""}
                href="/"
                aria-current={active === "discover" ? "page" : undefined}
              >
                Discover
              </a>
              <a
                className={active === "about" ? "is-active" : ""}
                href="/about/"
                aria-current={active === "about" ? "page" : undefined}
              >
                About
              </a>
            </div>
          </div>
          <button
            className="header-search"
            type="button"
            aria-label="Search launch videos"
            onClick={openSearch}
          >
            <Search aria-hidden="true" size={15} strokeWidth={1.8} />
            <span>Search videos</span>
            <kbd aria-hidden="true">
              <span>⌘</span>K
            </kbd>
          </button>
          <div className="nav-right">
            <a
              className={`nav-submit${active === "submit" ? " is-current" : ""}`}
              href="/submit/"
              aria-current={active === "submit" ? "page" : undefined}
            >
              Submit
            </a>
            <button
              className="mobile-menu-button"
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              {mobileOpen ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
          {mobileOpen && (
            <nav className="mobile-nav" aria-label="Mobile navigation">
              <a
                className={active === "discover" ? "is-active" : ""}
                href="/"
                aria-current={active === "discover" ? "page" : undefined}
              >
                Discover
              </a>
              <a
                className={active === "about" ? "is-active" : ""}
                href="/about/"
                aria-current={active === "about" ? "page" : undefined}
              >
                About
              </a>
              <a
                className={active === "submit" ? "is-active" : ""}
                href="/submit/"
                aria-current={active === "submit" ? "page" : undefined}
              >
                Submit
              </a>
            </nav>
          )}
        </nav>
      </header>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="search-dialog" showCloseButton={false}>
          <DialogTitle className="sr-only">Search launch videos</DialogTitle>
          <VideoSearch
            items={searchItems}
            value={searchQuery}
            onValueChange={setSearchQuery}
            onClose={() => setSearchOpen(false)}
            loading={searchLoading}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
