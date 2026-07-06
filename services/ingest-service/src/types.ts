export type RepoChunk = {
  id: string;
  repoId: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  embedding: number[];
};

export type IngestRequest = {
  repoUrl: string;
};

export type IngestResponse = {
  repoId: string;
  filesIndexed: number;
  chunksIndexed: number;
};
