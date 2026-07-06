import Database from "better-sqlite3";
import type { RepoChunk } from "../types.js";

// Shared with ingest-service via the same file path (set DB_PATH to a shared volume/location).
const db = new Database(process.env.DB_PATH || "../repo-chat.sqlite");
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS chunks (
    id TEXT PRIMARY KEY,
    repoId TEXT NOT NULL,
    filePath TEXT NOT NULL,
    startLine INTEGER NOT NULL,
    endLine INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_chunks_repoId ON chunks(repoId);
`);

export function getChunksForRepo(repoId: string): RepoChunk[] {
  const rows = db
    .prepare("SELECT id, repoId, filePath, startLine, endLine, content, embedding FROM chunks WHERE repoId = ?")
    .all(repoId) as Array<Omit<RepoChunk, "embedding"> & { embedding: string }>;

  return rows.map((row) => ({ ...row, embedding: JSON.parse(row.embedding) }));
}

export function repoExists(repoId: string): boolean {
  const row = db.prepare("SELECT 1 FROM chunks WHERE repoId = ? LIMIT 1").get(repoId);
  return Boolean(row);
}
