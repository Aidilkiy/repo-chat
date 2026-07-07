import Database from "better-sqlite3";
import { randomUUID } from "node:crypto";
import type { RepoChunk } from "../types.js";

const db = new Database(process.env.DB_PATH || "repo-chat.sqlite");

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

export function repoIdForUrl(repoUrl: string): string {
  const normalized = repoUrl.trim().replace(/\.git$/, "").replace(/\/$/, "").toLowerCase();
  return Buffer.from(normalized).toString("base64url");
}

export function clearRepoChunks(repoId: string): void {
  db.prepare("DELETE FROM chunks WHERE repoId = ?").run(repoId);
}

const insertStmt = db.prepare(
  "INSERT INTO chunks (id, repoId, filePath, startLine, endLine, content, embedding) VALUES (@id, @repoId, @filePath, @startLine, @endLine, @content, @embedding)"
);

export function insertChunks(chunks: Omit<RepoChunk, "id">[]): void {
  const insertMany = db.transaction((rows: Omit<RepoChunk, "id">[]) => {
    for (const row of rows) {
      insertStmt.run({ id: randomUUID(), ...row, embedding: JSON.stringify(row.embedding) });
    }
  });

  insertMany(chunks);
}

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
