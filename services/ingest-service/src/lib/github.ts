const CODE_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "py", "rb", "go", "rs", "java", "kt", "cs", "php", "c", "h", "cpp", "hpp",
  "md", "mdx", "json", "yml", "yaml", "css", "scss", "html",
]);

const IGNORED_PATH_PARTS = ["node_modules/", "dist/", "build/", ".git/", "vendor/", "lock"];

const MAX_FILE_BYTES = 60_000;
const MAX_FILES = 200;
const FETCH_CONCURRENCY = 5;
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 8000;

export type RepoFile = {
  path: string;
  content: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const cleaned = repoUrl.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)$/i);

  if (!match) {
    throw new Error("Expected a GitHub repo URL like https://github.com/owner/repo");
  }

  return { owner: match[1], repo: match[2] };
}

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  return headers;
}

async function githubFetch(url: string): Promise<Response> {
  const response = await fetch(url, { headers: githubHeaders() });

  if (!response.ok) {
    throw new Error(`GitHub API request failed (${response.status}): ${url}`);
  }

  return response;
}

function isCodeFile(path: string): boolean {
  if (IGNORED_PATH_PARTS.some((part) => path.includes(part))) return false;

  const extension = path.split(".").pop()?.toLowerCase();
  return extension ? CODE_EXTENSIONS.has(extension) : false;
}

// Uses the authenticated GitHub Contents API (5,000 req/hour with a token, 60/hour without)
// instead of raw.githubusercontent.com, whose separate Fastly-fronted CDN rate limit is
// unpredictable and can stay in a cooldown for a long time under repeated testing.
async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string,
  attempt = 0
): Promise<string | null> {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${ref}`;
  const response = await fetch(url, { headers: githubHeaders() });

  if ((response.status === 403 || response.status === 429) && attempt < MAX_RETRIES) {
    const delayMs = Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
    await sleep(delayMs);
    return fetchFileContent(owner, repo, path, ref, attempt + 1);
  }

  if (!response.ok) return null;

  const data = (await response.json()) as { content?: string; encoding?: string };
  if (data.encoding !== "base64" || !data.content) return null;

  return Buffer.from(data.content, "base64").toString("utf8");
}

export async function fetchRepoFiles(repoUrl: string): Promise<RepoFile[]> {
  const { owner, repo } = parseRepoUrl(repoUrl);

  const repoInfo = await (await githubFetch(`https://api.github.com/repos/${owner}/${repo}`)).json();
  const defaultBranch: string = repoInfo.default_branch ?? "main";

  const treeResponse = await githubFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`
  );
  const tree = await treeResponse.json();

  const candidatePaths: string[] = (tree.tree ?? [])
    .filter((entry: { type: string; path: string; size?: number }) =>
      entry.type === "blob" && isCodeFile(entry.path) && (entry.size ?? 0) <= MAX_FILE_BYTES
    )
    .map((entry: { path: string }) => entry.path)
    .slice(0, MAX_FILES);

  const files: RepoFile[] = [];

  for (let i = 0; i < candidatePaths.length; i += FETCH_CONCURRENCY) {
    const batch = candidatePaths.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (path) => {
        const content = await fetchFileContent(owner, repo, path, defaultBranch);
        if (!content || content.trim().length === 0) return null;

        return { path, content };
      })
    );

    for (const file of results) {
      if (file) files.push(file);
    }
  }

  return files;
}
