# Product Launch Videos

plv is a visual directory for discovering product launch videos from X, inspecting concise metadata, and opening the original post.

## Language

**Launch Video**:
A curated entry representing one product launch film, demo, or walkthrough posted on X, identified by a stable slug.
_Avoid_: tweet, clip, ad

**Poster**:
The primary visual for a Launch Video—a 16:9 frame used on cards and detail pages.
_Avoid_: thumbnail from remote hotlink only, random stock photo

**Category**:
A single editorial taxonomy label used for filtering: AI, Developer tools, Design, Productivity, Consumer, Hardware, Other.
_Avoid_: free-form tags as primary filters

**Published Video**:
A Launch Video whose metadata is complete and whose `status` is `published`.
_Avoid_: draft, broken link without review

**Original Post Action**:
A distinct action that opens the source X post in a new tab without navigating through another directory page.
_Avoid_: in-app Twitter embed as the only path

**Submission**:
A visitor-proposed Launch Video collected on `/submit/` and packaged as a GitHub issue for editorial review before becoming a Published Video.
_Avoid_: unmoderated public write API

**Discovery Candidate**:
A watchlist post automatically pulled from X that has video media and launch-like signals, staged in the Admin Inbox (and optionally a GitHub issue labeled `discovery`) for editorial review before becoming a Published Video.
_Avoid_: auto-publishing without human review, scraping arbitrary untrusted accounts

**Admin Inbox**:
The review queue at `/admin`, backed by `src/data/inbox.json`, where editors approve/reject Discovery Candidates and edit catalog drafts.
_Avoid_: public nav link, unauthenticated multi-tenant admin, auto-publish on approve without apply step

**Watchlist**:
The curated set of X handles (tech / AI / product companies) scanned by the weekly discovery job, stored in `src/data/watchlist.json`.
_Avoid_: open-ended full-network search as the default path

## Product goals

1. Browse launch videos visually with fast filter and search.
2. Preserve a durable index that outlives ephemeral timelines.
3. Always link back to the original X post.
4. Keep curation high-signal; open submissions only with review.
5. Surface new launch films weekly via automated discovery into a review queue (never straight to published).
