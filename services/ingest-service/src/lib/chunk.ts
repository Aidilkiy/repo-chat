import type { RepoFile } from "./github.js";

const LINES_PER_CHUNK = 60;
const OVERLAP_LINES = 10;

export type Chunk = {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
};

export function chunkFile(file: RepoFile): Chunk[] {
  const lines = file.content.split("\n");
  const chunks: Chunk[] = [];

  let start = 0;
  while (start < lines.length) {
    const end = Math.min(start + LINES_PER_CHUNK, lines.length);
    const content = lines.slice(start, end).join("\n").trim();

    if (content.length > 0) {
      chunks.push({
        filePath: file.path,
        startLine: start + 1,
        endLine: end,
        content,
      });
    }

    if (end === lines.length) break;
    start = end - OVERLAP_LINES;
  }

  return chunks;
}

export function chunkFiles(files: RepoFile[]): Chunk[] {
  return files.flatMap(chunkFile);
}
