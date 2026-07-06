export type RepoChunk = {
  id: string;
  repoId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  embedding: number[];
};

export type QueryRequest = {
  repoId: string;
  question: string;
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
