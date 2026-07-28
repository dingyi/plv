/**
 * GitHub Issues helpers for the discovery review queue.
 */

export class GitHubError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
    this.body = body;
  }
}

export function parseRepo(repo) {
  const match = String(repo).trim().match(/^([^/]+)\/([^/]+)$/);
  if (!match) {
    throw new Error(`Invalid GITHUB_REPOSITORY / DISCOVERY_REPO: ${repo}`);
  }
  return { owner: match[1], repo: match[2] };
}

export function createGitHubClient({
  token,
  repository,
  fetchImpl = fetch,
} = {}) {
  if (!token) {
    throw new Error("Missing GITHUB_TOKEN for creating discovery issues.");
  }
  const { owner, repo } = parseRepo(repository);
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  async function request(path, { method = "GET", body } = {}) {
    const response = await fetchImpl(`${base}${path}`, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "plv-discovery/0.1",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }

    if (!response.ok) {
      const detail = json?.message || text.slice(0, 200);
      throw new GitHubError(`GitHub API ${response.status}: ${detail}`, {
        status: response.status,
        body: json,
      });
    }

    return json;
  }

  async function ensureLabel(name, { color = "0E8A16", description } = {}) {
    try {
      await request(`/labels/${encodeURIComponent(name)}`);
      return;
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    await request("/labels", {
      method: "POST",
      body: {
        name,
        color,
        description: description ?? "Auto-discovered launch video candidate",
      },
    });
  }

  async function listOpenIssuesByLabel(label) {
    const items = await request(
      `/issues?state=open&labels=${encodeURIComponent(label)}&per_page=100`,
    );
    return Array.isArray(items) ? items : [];
  }

  async function createIssue({ title, body, labels }) {
    return request("/issues", {
      method: "POST",
      body: { title, body, labels },
    });
  }

  return {
    owner,
    repo,
    repoUrl: `https://github.com/${owner}/${repo}`,
    ensureLabel,
    listOpenIssuesByLabel,
    createIssue,
  };
}
