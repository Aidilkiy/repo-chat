const CODE_EXTENSIONS = new Set([
  "js", "jsx", "ts", "tsx", "mjs", "cjs",
  "py", "rb", "go", "rs", "java", "kt", "cs", "php", "c", "h", "cpp", "hpp",
  "md", "mdx", "json", "yml", "yaml", "css", "scss", "html",
]);

const IGNORED_PATH_PARTS = ["node_modules/", "dist/", "build/", ".git/", "vendor/", "lock"];

const MAX_FILE_BYTES = 60_000;
const MAX_FILES = 200;

export type RepoFile = {
  path: string;
  content: string;
};

function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const cleaned = repoUrl.trim().replace(/\.git$/, "").replace(/\/$/, "");
  const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)$/i);

  if (!match) {
    throw new Error("Expected a GitHub repo URL like https://github.com/owner/repo");
  }

  return { owner: match[1], repo: match[2] };
}

async function githubFetch(url: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/vnd.github+json" };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

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

  const FETCH_CONCURRENCY = 10;
  const files: RepoFile[] = [];

  for (let i = 0; i < candidatePaths.length; i += FETCH_CONCURRENCY) {
    const batch = candidatePaths.slice(i, i + FETCH_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (path) => {
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${path}`;
        const response = await fetch(rawUrl);
        if (!response.ok) return null;

        const content = await response.text();
        if (content.trim().length === 0) return null;

        return { path, content };
      })
    );

    for (const file of results) {
      if (file) files.push(file);
    }
  }

  return files;
}
