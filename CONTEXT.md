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

## Product goals

1. Browse launch videos visually with fast filter and search.
2. Preserve a durable index that outlives ephemeral timelines.
3. Always link back to the original X post.
4. Keep curation high-signal; open submissions only with review.
