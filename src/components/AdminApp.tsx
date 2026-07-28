import {
  Check,
  Copy,
  Download,
  ExternalLink,
  LogOut,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { CATEGORIES, type CategoryId } from "@/lib/catalog";
import {
  filterInbox,
  type InboxFile,
  type InboxItem,
  type ReviewStatus,
  sha256Hex,
  sortInboxItems,
  upsertDraftFields,
} from "@/lib/inbox";

const AUTH_KEY = "plv-admin-session";
const DRAFT_KEY = "plv-admin-inbox-draft";

type Filter = ReviewStatus | "all";

interface Props {
  initialInbox: InboxFile;
  /** SHA-256 hex of ADMIN_PASSWORD, or empty when open mode. */
  passwordHash: string;
  /** Dev-only open access when no password configured. */
  openAccess: boolean;
}

export default function AdminApp({
  initialInbox,
  passwordHash,
  openAccess,
}: Props) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [inbox, setInbox] = useState<InboxFile>(initialInbox);
  const [filter, setFilter] = useState<Filter>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (openAccess) {
      setAuthed(true);
      return;
    }
    if (!passwordHash) return;
    try {
      const session = sessionStorage.getItem(AUTH_KEY);
      if (session === passwordHash) setAuthed(true);
    } catch {
      // ignore
    }
  }, [openAccess, passwordHash]);

  // Restore local working copy after auth
  useEffect(() => {
    if (!authed) return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as InboxFile;
      if (parsed?.items && Array.isArray(parsed.items)) {
        setInbox(parsed);
        setDirty(true);
        setMessage("Restored local review draft from this browser.");
      }
    } catch {
      // ignore corrupt draft
    }
  }, [authed]);

  const items = useMemo(
    () => sortInboxItems(filterInbox(inbox.items, filter)),
    [filter, inbox.items],
  );

  const selected =
    items.find((item) => item.id === selectedId) ??
    items[0] ??
    inbox.items.find((item) => item.id === selectedId) ??
    null;

  useEffect(() => {
    if (!selected && items[0]) setSelectedId(items[0].id);
  }, [items, selected]);

  const counts = useMemo(() => {
    const base = { pending: 0, approved: 0, rejected: 0, all: inbox.items.length };
    for (const item of inbox.items) {
      base[item.reviewStatus] += 1;
    }
    return base;
  }, [inbox.items]);

  async function onLogin(event: { preventDefault: () => void }) {
    event.preventDefault();
    setAuthError(null);
    if (openAccess) {
      setAuthed(true);
      return;
    }
    if (!passwordHash) {
      setAuthError("ADMIN_PASSWORD is not configured for this build.");
      return;
    }
    const hash = await sha256Hex(password);
    if (hash !== passwordHash) {
      setAuthError("Wrong password.");
      return;
    }
    try {
      sessionStorage.setItem(AUTH_KEY, passwordHash);
    } catch {
      // ignore
    }
    setAuthed(true);
    setPassword("");
  }

  function logout() {
    try {
      sessionStorage.removeItem(AUTH_KEY);
    } catch {
      // ignore
    }
    setAuthed(false);
  }

  function persist(next: InboxFile, note?: string) {
    setInbox(next);
    setDirty(true);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      // ignore quota
    }
    if (note) setMessage(note);
  }

  function updateItem(id: string, updater: (item: InboxItem) => InboxItem) {
    const nextItems = inbox.items.map((item) =>
      item.id === id ? updater(item) : item,
    );
    persist({
      updatedAt: new Date().toISOString(),
      items: nextItems,
    });
  }

  function setStatus(id: string, reviewStatus: ReviewStatus) {
    updateItem(id, (item) => ({
      ...item,
      reviewStatus,
      reviewedAt:
        reviewStatus === "pending" ? null : new Date().toISOString(),
    }));
    setMessage(
      reviewStatus === "approved"
        ? "Marked approved. Download inbox.json, then run pnpm inbox:apply."
        : reviewStatus === "rejected"
          ? "Marked rejected."
          : "Restored to pending.",
    );
  }

  function downloadInbox() {
    const blob = new Blob([`${JSON.stringify(inbox, null, 2)}\n`], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "inbox.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Downloaded inbox.json — replace src/data/inbox.json and commit.");
  }

  async function copyDraft(item: InboxItem) {
    const payload = {
      ...item.draft,
      status: item.reviewStatus === "approved" ? "published" : item.draft.status,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setMessage("Could not copy — select the JSON manually.");
    }
  }

  function resetLocalDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setInbox(initialInbox);
    setDirty(false);
    setMessage("Discarded browser draft; reloaded built-in inbox.");
  }

  if (!authed) {
    return (
      <div className="admin-login">
        <p className="eyebrow">Admin</p>
        <h1>Review queue</h1>
        <p className="admin-lead">
          Password-protects the discovery inbox. This is a soft gate for a
          personal static site—do not put secrets in candidate metadata.
        </p>
        {!passwordHash && !openAccess ? (
          <p className="admin-banner admin-banner--warn">
            Set <code>ADMIN_PASSWORD</code> in the environment before building
            to enable login.
          </p>
        ) : null}
        {openAccess ? (
          <p className="admin-banner">
            Dev open-access mode (no <code>ADMIN_PASSWORD</code>).
          </p>
        ) : null}
        <form className="admin-login__form" onSubmit={onLogin}>
          {!openAccess ? (
            <label className="admin-field">
              <span>Password</span>
              <Input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="ADMIN_PASSWORD"
              />
            </label>
          ) : null}
          {authError ? <p className="admin-error">{authError}</p> : null}
          <Button type="submit" className="admin-primary">
            Enter admin
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-app">
      <header className="admin-toolbar">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>Discovery inbox</h1>
          <p className="admin-lead">
            {counts.pending} pending · {counts.approved} approved ·{" "}
            {counts.rejected} rejected
            {dirty ? " · local changes unsaved to repo" : ""}
          </p>
        </div>
        <div className="admin-toolbar__actions">
          <Button type="button" variant="secondary" onClick={downloadInbox}>
            <Download size={15} />
            Download inbox.json
          </Button>
          {dirty ? (
            <Button type="button" variant="secondary" onClick={resetLocalDraft}>
              <RotateCcw size={15} />
              Reset local
            </Button>
          ) : null}
          {!openAccess ? (
            <Button type="button" variant="ghost" onClick={logout}>
              <LogOut size={15} />
              Log out
            </Button>
          ) : null}
        </div>
      </header>

      {message ? (
        <p className="admin-banner" role="status">
          {message}
        </p>
      ) : null}

      <div className="admin-filters" role="tablist" aria-label="Review status">
        {(
          [
            ["pending", "Pending"],
            ["approved", "Approved"],
            ["rejected", "Rejected"],
            ["all", "All"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={filter === id}
            className={filter === id ? "is-active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}
            <span>{counts[id]}</span>
          </button>
        ))}
      </div>

      <div className="admin-layout">
        <aside className="admin-list" aria-label="Candidates">
          {items.length === 0 ? (
            <p className="admin-empty">No items in this filter.</p>
          ) : (
            items.map((item) => {
              const preview =
                item.post.media.find((m) => m.previewImageUrl)?.previewImageUrl ||
                null;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`admin-list__item${
                    selected?.id === item.id ? " is-selected" : ""
                  }`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <div className="admin-list__thumb">
                    {preview ? (
                      <img src={preview} alt="" loading="lazy" />
                    ) : (
                      <span />
                    )}
                  </div>
                  <div className="admin-list__meta">
                    <strong>{item.draft.title}</strong>
                    <span>
                      {item.watchlist.company} · score {item.score}
                    </span>
                    <em data-status={item.reviewStatus}>{item.reviewStatus}</em>
                  </div>
                </button>
              );
            })
          )}
        </aside>

        <section className="admin-detail">
          {!selected ? (
            <p className="admin-empty">Select a candidate to review.</p>
          ) : (
            <ItemEditor
              key={selected.id}
              item={selected}
              copied={copied}
              onPatch={(patch) =>
                updateItem(selected.id, (item) => upsertDraftFields(item, patch))
              }
              onNotes={(notes) =>
                updateItem(selected.id, (item) => ({ ...item, notes }))
              }
              onStatus={(status) => setStatus(selected.id, status)}
              onCopy={() => copyDraft(selected)}
            />
          )}
        </section>
      </div>

      <section className="admin-help">
        <h2>
          <Save size={16} /> Workflow
        </h2>
        <ol>
          <li>Review pending items; edit metadata; Approve or Reject.</li>
          <li>
            <strong>Download inbox.json</strong> and replace{" "}
            <code>src/data/inbox.json</code> in the repo.
          </li>
          <li>
            Run <code>pnpm inbox:apply</code> to merge approved drafts into{" "}
            <code>videos.json</code>.
          </li>
          <li>
            Run <code>pnpm posters:capture</code> for new slugs, then commit &amp;
            deploy.
          </li>
        </ol>
      </section>
    </div>
  );
}

function ItemEditor({
  item,
  copied,
  onPatch,
  onNotes,
  onStatus,
  onCopy,
}: {
  item: InboxItem;
  copied: boolean;
  onPatch: (
    patch: Partial<{
      title: string;
      product: string;
      company: string;
      description: string;
      category: CategoryId;
      tags: string[];
      featured: boolean;
    }>,
  ) => void;
  onNotes: (notes: string) => void;
  onStatus: (status: ReviewStatus) => void;
  onCopy: () => void;
}) {
  const preview =
    item.post.media.find((m) => m.previewImageUrl)?.previewImageUrl || null;
  const tagsValue = item.draft.tags.join(", ");

  return (
    <div className="admin-editor">
      <div className="admin-editor__hero">
        {preview ? <img src={preview} alt="" /> : <div className="admin-editor__hero-empty" />}
        <div>
          <p className="eyebrow">@{item.draft.authorHandle}</p>
          <h2>{item.draft.title}</h2>
          <p className="admin-editor__signals">
            score {item.score}
            {item.reasons.length
              ? ` · ${item.reasons.slice(0, 4).join(", ")}`
              : ""}
          </p>
          <div className="admin-editor__links">
            <a href={item.post.tweetUrl} target="_blank" rel="noreferrer">
              Open on X <ExternalLink size={13} />
            </a>
            {item.issueUrl ? (
              <a href={item.issueUrl} target="_blank" rel="noreferrer">
                GitHub issue <ExternalLink size={13} />
              </a>
            ) : null}
            {item.draft.videoUrl ? (
              <a href={item.draft.videoUrl} target="_blank" rel="noreferrer">
                Video URL <ExternalLink size={13} />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      <div className="admin-editor__actions">
        <Button type="button" onClick={() => onStatus("approved")}>
          <Check size={15} />
          Approve
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => onStatus("rejected")}
        >
          <X size={15} />
          Reject
        </Button>
        {item.reviewStatus !== "pending" ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onStatus("pending")}
          >
            <RotateCcw size={15} />
            Back to pending
          </Button>
        ) : null}
        <Button type="button" variant="secondary" onClick={onCopy}>
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy draft JSON"}
        </Button>
      </div>

      <div className="admin-editor__grid">
        <label className="admin-field">
          <span>Title</span>
          <Input
            value={item.draft.title}
            onChange={(event) => onPatch({ title: event.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Product</span>
          <Input
            value={item.draft.product}
            onChange={(event) => onPatch({ product: event.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Company</span>
          <Input
            value={item.draft.company}
            onChange={(event) => onPatch({ company: event.target.value })}
          />
        </label>
        <label className="admin-field">
          <span>Category</span>
          <Select
            value={item.draft.category}
            onValueChange={(value) => {
              if (value) onPatch({ category: value as CategoryId });
            }}
          >
            <SelectTrigger
              className="admin-select"
              placeholder="Select category"
            />
            <SelectContent>
              {CATEGORIES.map((category, index) => (
                <SelectItem
                  key={category.id}
                  index={index}
                  value={category.id}
                >
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="admin-field admin-field--full">
          <span>Description</span>
          <textarea
            className="admin-textarea"
            value={item.draft.description}
            onChange={(event) => onPatch({ description: event.target.value })}
            rows={4}
          />
        </label>
        <label className="admin-field admin-field--full">
          <span>Tags (comma-separated)</span>
          <Input
            value={tagsValue}
            onChange={(event) =>
              onPatch({
                tags: event.target.value
                  .split(",")
                  .map((part) => part.trim())
                  .filter(Boolean),
              })
            }
          />
        </label>
        <label className="admin-field admin-field--check">
          <input
            type="checkbox"
            checked={item.draft.featured}
            onChange={(event) => onPatch({ featured: event.target.checked })}
          />
          <span>Featured on homepage</span>
        </label>
        <label className="admin-field admin-field--full">
          <span>Editor notes</span>
          <textarea
            className="admin-textarea"
            value={item.notes}
            onChange={(event) => onNotes(event.target.value)}
            rows={3}
            placeholder="Internal notes (not published)"
          />
        </label>
      </div>

      <div className="admin-editor__post">
        <h3>Original post</h3>
        <blockquote>{item.post.text}</blockquote>
      </div>
    </div>
  );
}
