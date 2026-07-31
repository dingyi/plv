import { CATEGORIES, type CategoryId } from "@/lib/catalog";

export const SUBMIT_REPO = "dingyi/whatships.com";
export const SUBMIT_ISSUE_LABELS = ["submission"];

export interface LaunchSubmission {
  tweetUrl: string;
  product: string;
  company: string;
  category: CategoryId | "";
  title: string;
  description: string;
}

export interface SubmissionErrors {
  tweetUrl?: string;
  product?: string;
  company?: string;
  category?: string;
  title?: string;
  description?: string;
}

const TWEET_PATH =
  /^https?:\/\/(www\.)?(twitter\.com|x\.com|mobile\.twitter\.com)\/([A-Za-z0-9_]{1,15})\/status\/(\d{5,25})\/?(?:\?.*)?$/i;

export function emptySubmission(): LaunchSubmission {
  return {
    tweetUrl: "",
    product: "",
    company: "",
    category: "",
    title: "",
    description: "",
  };
}

export function parseTweetUrl(raw: string) {
  const value = raw.trim();
  const match = value.match(TWEET_PATH);
  if (!match) return null;
  const handle = match[3];
  const tweetId = match[4];
  return {
    handle,
    tweetId,
    tweetUrl: `https://x.com/${handle}/status/${tweetId}`,
  };
}

export function isValidCategory(value: string): value is CategoryId {
  return CATEGORIES.some((item) => item.id === value);
}

export function validateSubmission(
  submission: LaunchSubmission,
): SubmissionErrors {
  const errors: SubmissionErrors = {};
  const tweet = parseTweetUrl(submission.tweetUrl);

  if (!submission.tweetUrl.trim()) {
    errors.tweetUrl = "Paste a public X/Twitter status URL.";
  } else if (!tweet) {
    errors.tweetUrl =
      "Use a full post URL like https://x.com/handle/status/123…";
  }

  if (!submission.product.trim()) {
    errors.product = "Product name is required.";
  } else if (submission.product.trim().length > 80) {
    errors.product = "Keep the product name under 80 characters.";
  }

  if (!submission.company.trim()) {
    errors.company = "Company or publisher is required.";
  } else if (submission.company.trim().length > 80) {
    errors.company = "Keep the company name under 80 characters.";
  }

  if (!submission.category) {
    errors.category = "Choose a category.";
  } else if (!isValidCategory(submission.category)) {
    errors.category = "Choose a valid category.";
  }

  if (submission.title.trim().length > 120) {
    errors.title = "Keep the title under 120 characters.";
  }

  if (submission.description.trim().length > 500) {
    errors.description = "Keep the description under 500 characters.";
  }

  return errors;
}

export function hasSubmissionErrors(errors: SubmissionErrors) {
  return Object.keys(errors).length > 0;
}

export function buildSubmissionSlug(product: string, tweetId: string) {
  const base = product
    .toLocaleLowerCase("en")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48)
    .replace(/-$/, "");
  return base ? `${base}-${tweetId.slice(-6)}` : `launch-${tweetId.slice(-8)}`;
}

export function buildCatalogDraft(submission: LaunchSubmission) {
  const tweet = parseTweetUrl(submission.tweetUrl);
  if (!tweet || !isValidCategory(submission.category)) return null;

  const product = submission.product.trim();
  const company = submission.company.trim();
  const title =
    submission.title.trim() || `${product} — product launch video`;
  const description =
    submission.description.trim() ||
    `A product launch video for ${product} from ${company}, shared on X.`;

  return {
    id: `plv-sub-${tweet.tweetId}`,
    slug: buildSubmissionSlug(product, tweet.tweetId),
    title,
    product,
    company,
    description,
    category: submission.category,
    tags: [] as string[],
    tweetUrl: tweet.tweetUrl,
    tweetId: tweet.tweetId,
    authorName: company,
    authorHandle: tweet.handle,
    authorAvatar: null as string | null,
    poster: `/posters/${buildSubmissionSlug(product, tweet.tweetId)}.webp`,
    videoUrl: null as string | null,
    publishedAt: new Date().toISOString(),
    durationSeconds: null as number | null,
    featured: false,
    status: "draft" as const,
  };
}

export function buildIssueTitle(submission: LaunchSubmission) {
  const product = submission.product.trim() || "Untitled product";
  const company = submission.company.trim() || "Unknown";
  return `Launch video: ${product} (${company})`;
}

export function buildIssueBody(submission: LaunchSubmission) {
  const tweet = parseTweetUrl(submission.tweetUrl);
  const draft = buildCatalogDraft(submission);
  const categoryLabel =
    CATEGORIES.find((item) => item.id === submission.category)?.label ??
    submission.category;

  return [
    "## Launch video submission",
    "",
    "### Source",
    "",
    `- **Tweet URL:** ${tweet?.tweetUrl ?? submission.tweetUrl.trim()}`,
    `- **Tweet ID:** ${tweet?.tweetId ?? "—"}`,
    `- **Author handle:** @${tweet?.handle ?? "—"}`,
    "",
    "### Product",
    "",
    `- **Product:** ${submission.product.trim()}`,
    `- **Company:** ${submission.company.trim()}`,
    `- **Category:** ${categoryLabel}`,
    `- **Title:** ${submission.title.trim() || "—"}`,
    `- **Description:** ${submission.description.trim() || "—"}`,
    "",
    "### Suggested catalog draft",
    "",
    "```json",
    JSON.stringify(draft, null, 2),
    "```",
    "",
    "### Review checklist",
    "",
    "- [ ] Public post contains a product launch / demo video",
    "- [ ] Metadata is accurate",
    "- [ ] Poster can be captured",
    "- [ ] Ready to publish (`status: published`)",
    "",
  ].join("\n");
}

export function buildGitHubIssueUrl(submission: LaunchSubmission) {
  const params = new URLSearchParams({
    title: buildIssueTitle(submission),
    body: buildIssueBody(submission),
    labels: SUBMIT_ISSUE_LABELS.join(","),
  });
  return `https://github.com/${SUBMIT_REPO}/issues/new?${params.toString()}`;
}
