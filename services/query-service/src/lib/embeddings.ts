const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 8000;

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to query-service/.env");
  }
  return apiKey;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function embedOne(apiKey: string, text: string, attempt = 0): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    }
  );

  if (response.status === 429 && attempt < MAX_RETRIES) {
    const retryAfterHeader = response.headers.get("retry-after");
    const delayMs = retryAfterHeader
      ? Number(retryAfterHeader) * 1000
      : Math.min(BASE_DELAY_MS * 2 ** attempt, MAX_DELAY_MS);
    await sleep(delayMs);
    return embedOne(apiKey, text, attempt + 1);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini embedding request failed (${response.status}): ${errorBody}`);
  }

  const body = (await response.json()) as { embedding: { values: number[] } };
  return body.embedding.values;
}

// query-service only ever embeds a single question at a time, so no batching/concurrency needed here.
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = getApiKey();
  const results: number[][] = [];

  for (const text of texts) {
    results.push(await embedOne(apiKey, text));
  }

  return results;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB) || 1);
}
