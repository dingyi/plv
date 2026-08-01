---
name: whatships.com
description: A curated directory of startup launch videos from X — sharp monochrome chrome, hairline grids, mono micro-labels.
colors:
  paper: "#fafafa"
  paper-raised: "#ffffff"
  ink: "#09090b"
  ink-soft: "#71717a"
  hairline: "#d4d4d8"
  hairline-strong: "#a1a1aa"
  media-frame: "#e4e4e7"
  hover-wash: "rgb(0 0 0 / 0.04)"
  active-wash: "rgb(0 0 0 / 0.07)"
  scrim: "rgb(0 0 0 / 0.85)"
  focus-ring: "#4f7bff"
  destructive: "#ef4444"
typography:
  display:
    fontFamily: "Geist Variable, Geist, system-ui, sans-serif"
    fontSize: "clamp(24px, 3vw, 30px)"
    fontWeight: 480
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "Geist Variable, Geist, system-ui, sans-serif"
    fontSize: "clamp(28px, 4vw, 36px)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  title:
    fontFamily: "Geist Variable, Geist, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 560
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist Variable, Geist, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "0.04em"
rounded:
  square: "0"
  sm: "0.225rem"
  md: "0.3rem"
  lg: "0.375rem"
  dialog: "14px"
  pill: "999px"
spacing:
  card-pad: "12px"
  page-gutter: "16px"
  section-gap: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.square}"
    padding: "0 14px"
    height: "34px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
  button-ghost:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.square}"
    padding: "0 12px"
    height: "34px"
  button-ghost-hover:
    backgroundColor: "{colors.media-frame}"
    textColor: "{colors.ink}"
  field:
    backgroundColor: "{colors.paper-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0 12px"
    height: "42px"
  card-grid-cell:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "12px"
  chip-filter:
    backgroundColor: "{colors.media-frame}"
    textColor: "{colors.ink-soft}"
    rounded: "{rounded.pill}"
    padding: "0 12px"
    height: "34px"
  chip-filter-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
---

# Design System: whatships.com

## Overview

**Creative North Star: "The Launch Ledger"**

The site is an archival index, and it looks like one: a flat, monochrome
ledger of launch films ruled by continuous hairline grid lines, annotated
in uppercase mono micro-labels, and interrupted only by the video posters
themselves. The chrome borrows noiced.com's vocabulary — square corners,
0.5px grid lines, 5×5 L-bracket corners straddling every cell — and keeps
it absolutely quiet so the poster art carries all the color on the page.

Two shape worlds coexist deliberately. The **public chrome** (nav, toolbar,
grid, cards, form fields) is perfectly square with hairline borders. The
**overlay world** (dialogs, the video player, search palette, the admin
review tool) is softly rounded (10–18px) and elevated with a tonal shadow
ladder — overlays float above the ledger, so they are allowed to feel like
a different material.

**Key Characteristics:**
- Monochrome zinc palette; the posters are the only imagery and the only color
- Continuous 1px grid channels, not per-card borders; L-bracket corner marks
- Mono 11px uppercase micro-labels for all metadata, nav, and actions
- Square public chrome; rounded, shadowed overlays
- Full light/dark inversion via an 11-step neutral ladder
- Motion from a shared token scale; critically damped, never bouncy in UI chrome

## Colors

The palette is a single 11-step zinc ladder (`--n-50`…`--n-950`) that fully
inverts in dark mode; there is no brand accent hue.

### Primary
- **Ink** (`--foreground`, `#09090b` light / `#fafafa` dark): text, primary button fills, active filter chips. The darkest step of the ladder, always paired against the lightest.
- **Paper** (`--background`, `#fafafa` light / `#09090b` dark): the page and grid-cell background.

### Neutral
- **Paper Raised** (`--card`, `#ffffff` / `#18181b`): cards, fields, popovers — one step above the page.
- **Ink Soft** (`--muted-foreground`, `#71717a`): secondary text, inactive nav, meta labels.
- **Hairline** (`--grid-line`, `#d4d4d8` / `#3f3f46`): the 0.5px grid lines, field borders, card frames. The most-used color after paper and ink.
- **Hairline Strong** (`--corner-color`, `#52525b` / `#d4d4d8`): the 5×5 L-bracket corner marks — one step darker than the grid so the corners read.
- **Media Frame** (`--media-border`, `#e4e4e7` / `#27272a`): the 1px frame around poster images, slightly lighter than the grid so media feels inset.
- **Hover Wash** (`--hover`, 4% black / 6% white) and **Active Wash** (`--active`, 7% / 10%): state fills, never borders.

### Functional
- **Focus Ring** (`#4f7bff` light / `#6b97ff` dark): the only saturated hue in the system, reserved for `:focus-visible` (1px outline + 2px offset). The lighter dark-mode value would fail 3:1 on paper, so light mode uses the deeper blue.
- **Destructive** (`#ef4444` / `#f87171`): form errors and reject states only.

### Named Rules
**The Zero-Accent Rule.** No brand color exists. Emphasis is typographic (mono labels) and tonal (ink on paper), never chromatic. The focus ring is the sole exception and it must stay invisible until keyboard focus.

**The Posters-Are-the-Palette Rule.** Color enters the page only through captured poster art. Never add colored badges, gradients, or category hues to the chrome; category identity is a small ink square, not a color code.

## Typography

**Display/Body Font:** Geist Variable (with system-ui fallback)
**Label/Mono Font:** IBM Plex Mono (400/500)

**Character:** Geist carries prose and titles with tight negative tracking and mid-range weights (480–560, never bold); IBM Plex Mono renders every piece of metadata as an 11px uppercase micro-label. The pairing reads as an engineered index: sans for content, mono for chrome.

### Hierarchy
- **Display** (480, clamp(24px, 3vw, 30px), 1.1, −0.03em): video detail page title only. One per page.
- **Headline** (500, clamp(28px, 4vw, 36px), 1.1, −0.03em): homepage hero.
- **Title** (560, 22px, 1.3, −0.01em): about/submit page headings.
- **Card Title** (500, 13px, 18px, −0.01em): grid card titles.
- **Body** (400, 16px, 24px): about/submit prose. Containers capped at 680px.
- **Label** (500 mono, 11px, uppercase, 0.04em): nav, buttons, eyebrows, result counts, meta rows. The voice of the chrome.
- **Micro** (500 mono, 10px, uppercase): durations, timestamps, footer legal.

### Named Rules
**The Mono-Is-Chrome Rule.** If text labels the interface rather than the content, it is IBM Plex Mono, 11px, uppercase, 0.04em tracking. Interface copy never uses sentence case in the public chrome.

**The No-Bold Rule.** Emphasis tops out at 560–600. Nothing on the site sets 700+.

## Layout

- Max content width is 1920px with a 16px page gutter; the video grid fills it via `repeat(auto-fill, minmax(min(100%, 320px), 1fr))` — no fixed column counts, no breakpoints for the grid.
- The grid paints its lines once: `gap: 1px; padding: 1px; background: var(--grid-line)` with solid-background cells, so seams are continuous 1px channels (per-card half-borders are banned — they double up on fractional tracks).
- Reading pages (about, submit) center at 680px; the video detail profile centers at 624px inside a 1280px page.
- Sticky chrome: 56px header and a toolbar stuck at `top: 56px`, both `color-mix(background 92%, transparent)` + 10px backdrop blur.
- Breakpoints: 699px (mobile: single-column grid, icon-only search, hidden result count), 860px (admin collapses to one column), 599px (slim player chrome).
- `html` has `min-width: 320px` and `scrollbar-gutter: stable`.

## Elevation & Depth

The system is flat at rest; depth belongs to overlays. An 8-level shadow
ladder (`--shadow-1`…`--shadow-8`) builds from a single 1px ring to deep
stacks, always starting with the ring so elevated surfaces keep a hairline
edge. In light mode shadows are 6% black; in dark mode they switch to inset
white highlights (1–6%) plus black drop shadows, so elevation reads as
material thickness rather than darkness. Surfaces pair with an 8-level
background ladder (`surfaceClasses(bg, shadow)`) — bg level and shadow level
usually match.

### Shadow Vocabulary
- **Hairline ring** (`--shadow-1`): resting cards, popovers.
- **Raised panel** (`--shadow-4`): mobile nav menu, sticky overlays.
- **Dialog** (`--shadow-6`): search palette, player dialog.
- **Cinema** (`0 40px 120px rgb(0 0 0 / 60%)`): the homepage video modal only — the one place a heavy, colored shadow is allowed.

### Named Rules
**The Flat-Ledger Rule.** Grid cells, fields, and toolbar controls take no shadow — ever. Elevation starts at dialogs and floating menus.

## Shapes

Two shape languages, kept separate:

- **Square (radius 0):** everything in the public chrome — nav, buttons, fields, selects, grid cells, cards, corner brackets, poster frames. Borders are 0.5px–1px hairlines.
- **Rounded (10–18px):** overlays and admin surfaces — search palette (16px), video player (14–18px), dialogs, admin cards (12–18px), filter pills (999px), keyboard hints (6px).

Posters are always 16:9, framed with a 1px media border, never rounded in the grid. The signature geometry is the 5×5px L-bracket corner, inset −1px to straddle grid channels; every grid cell carries all four.

## Components

### Buttons
- **Shape:** square in public chrome; the shared React `Button` (Base UI) uses the shape-context radius inside overlays/admin.
- **Primary:** ink fill, paper text, mono 11px uppercase, 34px tall, 0.5px ink border; hover is opacity 0.88, not a color shift.
- **Ghost/secondary:** transparent or muted fill, hairline border; hover fills with Hover Wash and promotes text to ink.
- **React variants:** `primary` (ink fill), `secondary` (accent fill), `tertiary` (bordered), `ghost` (text only); sizes sm/md/lg at 28/32/36px; press state scales the background layer to 0.98 over 80ms.
- **Focus:** 1px Focus Ring outline, 2px offset — everywhere, no exceptions.

### Fields & Search
- Square hairline fields, 42px (submit) or 34px (toolbar) tall, card background, mono input text; focus is the Focus Ring, error is a Destructive border.
- The search trigger is a 34px ghost with a `⌘K` kbd hint; it collapses to a 36px icon button under 699px.

### Cards / Grid Cells
- Square, paper background, 12px padding, sitting on the shared grid channel — no border, no shadow, no radius.
- Media: 16:9 poster, 1px Media Frame border; hover reveals an 85% black scrim with a mono uppercase label over 140ms; a 32px external-link button fades in top-right (always visible on touch).
- Meta row: mono 10px uppercase with a small ink category square.

### Filter Chips (admin)
- Pill (999px), muted fill, ink-soft text; active inverts to ink on paper. The only pill shape in the system.

### Navigation
- Sticky 56px header, hairline bottom border, blurred translucent background; wordmark centered in mono 13px uppercase; links mono 11px uppercase, ink-soft → ink on hover/active.
- Mobile: hamburger opens a square hairline menu with shadow-4.

### Dialogs & Player
- Rounded (14–18px), shadow-6, padding zeroed so content bleeds to the edge; open with fade + 8px rise + 0.96 scale over 250ms smooth-out; close is faster and quieter (150ms, no travel).
- Cinema chrome: gradient overlays on the video revealed on hover/focus, always visible on touch.

### Video Detail
- Display-size title (40px cap), an inline player in a square hairline frame (poster until an explicit click; no autoplay on load), facts as a ruled table (144px mono 10px label column, right-aligned values, 1px row separators).

## Do's and Don'ts

### Do:
- **Do** paint grid lines once via container background + 1px gap; give every cell four L-bracket corners.
- **Do** set interface text in mono 11px uppercase with 0.04em tracking.
- **Do** keep public chrome square and flat; reserve radius and shadow for overlays.
- **Do** use the motion tokens (`--duration-quick/fast`, `--ease-smooth-out`) and the spring tiers (`fast` 80ms, `moderate` 160ms, `slow` 240ms, bounce ≤ 0.12) for any new animation.
- **Do** honor `prefers-reduced-motion` (all durations collapse to 0.01ms) and keep touch fallbacks for every hover-only reveal.

### Don't:
- **Don't** introduce a brand hue or colored category coding — the posters are the palette.
- **Don't** round corners or add shadows in the public grid, toolbar, or form chrome.
- **Don't** use per-card borders in the grid (half-border doubling on fractional tracks); the channel is the border.
- **Don't** set font-weight above 600 or sentence-case interface labels.
- **Don't** hotlink remote thumbnails; posters are local 16:9 captures only.
