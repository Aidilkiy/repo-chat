import { Router } from "express";
import { fetchRepoFiles } from "../lib/github.js";
import { chunkFiles } from "../lib/chunk.js";
import { embedTexts } from "../lib/embeddings.js";
import { clearRepoChunks, insertChunks, repoIdForUrl } from "../lib/db.js";
import type { IngestRequest, IngestResponse } from "../types.js";

export const ingestRouter = Router();

const MAX_CHUNKS = 150;

ingestRouter.post("/ingest", async (req, res) => {
  const { repoUrl } = req.body as IngestRequest;

  if (!repoUrl || typeof repoUrl !== "string") {
    return res.status(400).json({ error: "repoUrl is required" });
  }

  try {
    const repoId = repoIdForUrl(repoUrl);
    const files = await fetchRepoFiles(repoUrl);

    if (files.length === 0) {
      return res.status(422).json({ error: "No indexable source files were found in that repo." });
    }

    const chunks = chunkFiles(files);

    if (chunks.length > MAX_CHUNKS) {
      return res.status(422).json({
        error:
          `This repo produced ${chunks.length} chunks, which is too large for the free Gemini tier's rate limits ` +
          `(max ${MAX_CHUNKS}). Try a smaller repo, or a repo with a more focused subset of source files.`,
      });
    }

    const embeddings = await embedTexts(chunks.map((chunk) => chunk.content));

    clearRepoChunks(repoId);
    insertChunks(
      chunks.map((chunk, index) => ({
        repoId,
        filePath: chunk.filePath,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        content: chunk.content,
        embedding: embeddings[index],
      }))
    );

    const response: IngestResponse = {
      repoId,
      filesIndexed: files.length,
      chunksIndexed: chunks.length,
    };
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to ingest repo" });
  }
});
