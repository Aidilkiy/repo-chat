import { Router } from "express";
import { embedTexts, cosineSimilarity } from "../lib/embeddings.js";
import { answerFromContext } from "../lib/llm.js";
import { getChunksForRepo, repoExists } from "../lib/db.js";
import type { QueryRequest, QueryResponse, QuerySource } from "../types.js";

export const queryRouter = Router();

const TOP_K = 6;

queryRouter.post("/query", async (req, res) => {
  const { repoId, question } = req.body as QueryRequest;

  if (!repoId || !question) {
    return res.status(400).json({ error: "repoId and question are required" });
  }

  if (!repoExists(repoId)) {
    return res.status(404).json({ error: "This repo hasn't been indexed yet. Ingest it first." });
  }

  try {
    const [questionEmbedding] = await embedTexts([question]);
    const chunks = getChunksForRepo(repoId);

    const ranked = chunks
      .map((chunk) => ({ chunk, score: cosineSimilarity(questionEmbedding, chunk.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);

    const sources: QuerySource[] = ranked.map(({ chunk }) => ({
      filePath: chunk.filePath,
      startLine: chunk.startLine,
      endLine: chunk.endLine,
      snippet: chunk.content,
    }));

    const answer = await answerFromContext(question, sources);

    const response: QueryResponse = { answer, sources };
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Failed to answer question" });
  }
});
