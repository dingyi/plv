import { Check, Copy, ExternalLink } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { CATEGORIES } from "@/lib/catalog";
import {
  buildCatalogDraft,
  buildGitHubIssueUrl,
  emptySubmission,
  hasSubmissionErrors,
  type LaunchSubmission,
  validateSubmission,
} from "@/lib/submit";

type Step = "form" | "ready";

export default function SubmitForm() {
  const [form, setForm] = useState<LaunchSubmission>(() => emptySubmission());
  const [errors, setErrors] = useState(() => validateSubmission(emptySubmission()));
  const [touched, setTouched] = useState(false);
  const [step, setStep] = useState<Step>("form");
  const [copied, setCopied] = useState(false);
  const [issueUrl, setIssueUrl] = useState("");

  const draft = useMemo(() => buildCatalogDraft(form), [form]);
  const draftJson = draft ? JSON.stringify(draft, null, 2) : "";

  function update<K extends keyof LaunchSubmission>(
    key: K,
    value: LaunchSubmission[K],
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (touched) setErrors(validateSubmission(next));
      return next;
    });
  }

  function onSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    setTouched(true);
    const nextErrors = validateSubmission(form);
    setErrors(nextErrors);
    if (hasSubmissionErrors(nextErrors)) return;

    const url = buildGitHubIssueUrl(form);
    setIssueUrl(url);
    setStep("ready");
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function copyDraft() {
    if (!draftJson) return;
    try {
      await navigator.clipboard.writeText(draftJson);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  if (step === "ready") {
    return (
      <div className="submit-success">
        <p className="eyebrow">Submission ready</p>
        <h1>Open a GitHub issue to finish</h1>
        <p className="submit-lead">
          Your launch details were packaged into a review issue. If a new tab
          did not open, use the button below. Editors will curate approved
          videos into the public directory.
        </p>
        <div className="submit-success__actions">
          <a className="nav-submit submit-primary-link" href={issueUrl}>
            Open GitHub issue
            <ExternalLink size={15} aria-hidden="true" />
          </a>
          <button
            type="button"
            className="submit-secondary"
            onClick={() => {
              setStep("form");
              setTouched(false);
              setErrors(validateSubmission(emptySubmission()));
              setForm(emptySubmission());
              setIssueUrl("");
            }}
          >
            Submit another
          </button>
        </div>
        {draftJson && (
          <div className="submit-draft">
            <div className="submit-draft__header">
              <h2>Suggested catalog draft</h2>
              <button type="button" className="submit-copy" onClick={copyDraft}>
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy JSON"}
              </button>
            </div>
            <pre>{draftJson}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <form className="submit-form" onSubmit={onSubmit} noValidate>
      <div className="submit-intro">
        <p className="eyebrow">Submit</p>
        <h1>Share a product launch video from X</h1>
        <p className="submit-lead">
          Point us to a public post with a launch film, demo, or walkthrough.
          Submissions are reviewed before they appear in the directory.
        </p>
      </div>

      <fieldset className="submit-fieldset">
        <legend>Source post</legend>
        <label className="submit-field">
          <span>X / Twitter post URL</span>
          <Input
            type="url"
            name="tweetUrl"
            inputMode="url"
            autoComplete="url"
            placeholder="https://x.com/handle/status/123…"
            value={form.tweetUrl}
            aria-invalid={touched && Boolean(errors.tweetUrl)}
            aria-describedby={errors.tweetUrl ? "tweetUrl-error" : undefined}
            onChange={(event) => update("tweetUrl", event.target.value)}
            required
          />
          {touched && errors.tweetUrl && (
            <em id="tweetUrl-error" className="submit-error">
              {errors.tweetUrl}
            </em>
          )}
        </label>
      </fieldset>

      <fieldset className="submit-fieldset">
        <legend>Product</legend>
        <div className="submit-grid">
          <label className="submit-field">
            <span>Product name</span>
            <Input
              name="product"
              placeholder="Linear Loops"
              value={form.product}
              aria-invalid={touched && Boolean(errors.product)}
              onChange={(event) => update("product", event.target.value)}
              required
            />
            {touched && errors.product && (
              <em className="submit-error">{errors.product}</em>
            )}
          </label>
          <label className="submit-field">
            <span>Company / publisher</span>
            <Input
              name="company"
              placeholder="Linear"
              value={form.company}
              aria-invalid={touched && Boolean(errors.company)}
              onChange={(event) => update("company", event.target.value)}
              required
            />
            {touched && errors.company && (
              <em className="submit-error">{errors.company}</em>
            )}
          </label>
        </div>

        <label className="submit-field">
          <span>Category</span>
          <Select
            value={form.category || ""}
            onValueChange={(value) =>
              update("category", (value || "") as LaunchSubmission["category"])
            }
          >
            <SelectTrigger
              className="submit-select"
              aria-label="Category"
              aria-invalid={touched && Boolean(errors.category)}
              placeholder="Select a category"
            />
            <SelectContent>
              {CATEGORIES.map((item, index) => (
                <SelectItem key={item.id} index={index} value={item.id}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {touched && errors.category && (
            <em className="submit-error">{errors.category}</em>
          )}
        </label>

        <label className="submit-field">
          <span>
            Title <small>optional</small>
          </span>
          <Input
            name="title"
            placeholder="Linear Loops — recurring agent workflows"
            value={form.title}
            aria-invalid={touched && Boolean(errors.title)}
            onChange={(event) => update("title", event.target.value)}
          />
          {touched && errors.title && (
            <em className="submit-error">{errors.title}</em>
          )}
        </label>

        <label className="submit-field">
          <span>
            Description <small>optional</small>
          </span>
          <textarea
            className="submit-textarea"
            name="description"
            rows={4}
            placeholder="What does the launch video show?"
            value={form.description}
            aria-invalid={touched && Boolean(errors.description)}
            onChange={(event) => update("description", event.target.value)}
          />
          {touched && errors.description && (
            <em className="submit-error">{errors.description}</em>
          )}
        </label>
      </fieldset>

      <fieldset className="submit-fieldset">
        <legend>About you</legend>
        <div className="submit-grid">
          <label className="submit-field">
            <span>
              Name <small>optional</small>
            </span>
            <Input
              name="submitterName"
              placeholder="Your name"
              value={form.submitterName}
              onChange={(event) => update("submitterName", event.target.value)}
            />
          </label>
          <label className="submit-field">
            <span>
              Contact <small>optional</small>
            </span>
            <Input
              name="submitterContact"
              placeholder="email or @handle"
              value={form.submitterContact}
              aria-invalid={touched && Boolean(errors.submitterContact)}
              onChange={(event) =>
                update("submitterContact", event.target.value)
              }
            />
            {touched && errors.submitterContact && (
              <em className="submit-error">{errors.submitterContact}</em>
            )}
          </label>
        </div>
        <label className="submit-field">
          <span>
            Notes for editors <small>optional</small>
          </span>
          <textarea
            className="submit-textarea"
            name="notes"
            rows={3}
            placeholder="Anything else we should know?"
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
          />
        </label>
      </fieldset>

      <div className="submit-actions">
        <Button type="submit" className="submit-button" size="lg">
          Continue to GitHub
        </Button>
        <p className="submit-footnote">
          Opens a prefilled GitHub issue on{" "}
          <a
            href="https://github.com/dingyi/whatships.com"
            target="_blank"
            rel="noreferrer"
          >
            dingyi/whatships.com
          </a>
          . Nothing is stored on this site.
        </p>
      </div>
    </form>
  );
}
