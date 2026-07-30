import { describe, expect, it } from "vitest";

import {
  buildCatalogDraft,
  buildGitHubIssueUrl,
  emptySubmission,
  hasSubmissionErrors,
  parseTweetUrl,
  validateSubmission,
} from "@/lib/submit";

describe("parseTweetUrl", () => {
  it("accepts x.com and twitter.com status URLs", () => {
    expect(
      parseTweetUrl("https://x.com/linear/status/2079233260161323371"),
    ).toEqual({
      handle: "linear",
      tweetId: "2079233260161323371",
      tweetUrl: "https://x.com/linear/status/2079233260161323371",
    });
    expect(
      parseTweetUrl(
        "https://twitter.com/cursor_ai/status/2079993729532989500?s=20",
      )?.tweetId,
    ).toBe("2079993729532989500");
  });

  it("rejects non-status URLs", () => {
    expect(parseTweetUrl("https://x.com/linear")).toBeNull();
    expect(parseTweetUrl("not-a-url")).toBeNull();
  });
});

describe("validateSubmission", () => {
  it("requires core fields", () => {
    const errors = validateSubmission(emptySubmission());
    expect(hasSubmissionErrors(errors)).toBe(true);
    expect(errors.tweetUrl).toBeTruthy();
    expect(errors.product).toBeTruthy();
    expect(errors.company).toBeTruthy();
    expect(errors.category).toBeTruthy();
  });

  it("accepts a complete submission", () => {
    const errors = validateSubmission({
      tweetUrl: "https://x.com/linear/status/2079233260161323371",
      product: "Linear Loops",
      company: "Linear",
      category: "productivity",
      title: "Linear Loops",
      description: "Recurring workflows",
      submitterName: "Ada",
      submitterContact: "ada@example.com",
      notes: "",
    });
    expect(errors).toEqual({});
  });
});

describe("buildCatalogDraft + issue URL", () => {
  it("builds a draft entry and GitHub issue link", () => {
    const submission = {
      tweetUrl: "https://x.com/linear/status/2079233260161323371",
      product: "Linear Loops",
      company: "Linear",
      category: "productivity" as const,
      title: "",
      description: "",
      submitterName: "",
      submitterContact: "",
      notes: "",
    };
    const draft = buildCatalogDraft(submission);
    expect(draft?.status).toBe("draft");
    expect(draft?.tweetId).toBe("2079233260161323371");
    expect(draft?.slug).toContain("linear-loops");

    const url = buildGitHubIssueUrl(submission);
    expect(url).toContain("https://github.com/dingyi/whatships.com/issues/new?");
    expect(url).toContain("Launch+video");
    expect(url).toContain("labels=submission");
  });
});
