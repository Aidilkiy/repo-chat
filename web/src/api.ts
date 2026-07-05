export type IngestResponse = {
  repoId: string;
  filesIndexed: number;
  chunksIndexed: number;
};

export type QuerySource = {
  filePath: string;
  startLine: number;
  endLine: number;
  snippet: string;
};

export type QueryResponse = {
  answer: string;
  sources: QuerySource[];
};

async function handle<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Request failed");
  return body as T;
}

export function ingestRepo(repoUrl: string): Promise<IngestResponse> {
  return fetch("/api/ingest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl }),
  }).then((res) => handle<IngestResponse>(res));
}

export function queryRepo(repoId: string, question: string): Promise<QueryResponse> {
  return fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoId, question }),
  }).then((res) => handle<QueryResponse>(res));
}
