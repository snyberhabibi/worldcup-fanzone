// Minimal GitHub Contents API client — used only by the nightly schedule cron
// to commit the resolved knockout overrides, which triggers a Vercel redeploy.
// Requires GITHUB_TOKEN (a fine-grained PAT with Contents: read+write on this
// repo). GITHUB_REPO defaults to this project's repo; override via env if forked.

const API = "https://api.github.com";

function repoParts(): { owner: string; name: string } {
  const full = (process.env.GITHUB_REPO || "snyberhabibi/worldcup-fanzone").trim();
  const [owner, name] = full.split("/");
  return { owner, name };
}

async function gh(path: string, init?: RequestInit): Promise<Response> {
  const token = process.env.GITHUB_TOKEN?.replace(/\\n/g, "").trim();
  if (!token) throw new Error("GITHUB_TOKEN not set");
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "fanzone-schedule-cron",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(15000),
  });
}

async function getFileSha(path: string, branch: string): Promise<string | null> {
  const { owner, name } = repoParts();
  const res = await gh(`/repos/${owner}/${name}/contents/${encodeURIComponent(path)}?ref=${branch}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`getFileSha ${res.status}`);
  const j = (await res.json()) as { sha?: string };
  return j.sha ?? null;
}

/** Create or update a file on `branch` (default main). Returns the new commit-ish sha. */
export async function commitFile(
  path: string,
  content: string,
  message: string,
  branch = "main"
): Promise<void> {
  const { owner, name } = repoParts();
  const sha = await getFileSha(path, branch).catch(() => null);
  const body = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch,
    ...(sha ? { sha } : {}),
  };
  const res = await gh(`/repos/${owner}/${name}/contents/${encodeURIComponent(path)}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`commitFile ${res.status} ${t.slice(0, 200)}`);
  }
}
