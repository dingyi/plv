"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

declare global {
  interface Window {
    __plvApplyTheme?: (theme: Theme) => void;
    __plvCurrentTheme?: () => Theme;
  }
}

function getDomTheme(): Theme {
  if (typeof window !== "undefined" && window.__plvCurrentTheme) {
    return window.__plvCurrentTheme();
  }
  if (typeof document === "undefined") return "light";
  const root = document.documentElement;
  if (root.dataset.theme === "dark" || root.classList.contains("dark")) {
    return "dark";
  }
  if (root.dataset.theme === "light" || root.classList.contains("light")) {
    return "light";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme) {
  if (typeof window !== "undefined" && window.__plvApplyTheme) {
    window.__plvApplyTheme(theme);
    return;
  }
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // ignore
  }
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setTheme(getDomTheme());
    sync();
    setReady(true);

    // Keep icon in sync when native delegation flips the theme.
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      data-theme-toggle
      data-ready={ready ? "true" : "false"}
      data-theme-active={theme}
      aria-label={
        theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      // Native document listener handles the flip; React only keeps the icon in sync.
      onClick={(event) => {
        // Fallback if inline script failed to register.
        if (!window.__plvApplyTheme) {
          event.preventDefault();
          const next: Theme = getDomTheme() === "dark" ? "light" : "dark";
          applyTheme(next);
          setTheme(next);
        }
      }}
    >
      {theme === "dark" ? (
        <Sun size={15} strokeWidth={1.75} aria-hidden="true" />
      ) : (
        <Moon size={15} strokeWidth={1.75} aria-hidden="true" />
      )}
    </button>
  );
}
