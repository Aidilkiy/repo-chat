const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

function getApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to server/.env");
  }
  return apiKey;
}

async function embedOne(apiKey: string, text: string): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: { parts: [{ text }] } }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini embedding request failed (${response.status}): ${errorBody}`);
  }

  const body = (await response.json()) as { embedding: { values: number[] } };
  return body.embedding.values;
}

const CONCURRENCY = 5;

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = getApiKey();
  const results: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += CONCURRENCY) {
    const batch = texts.slice(i, i + CONCURRENCY);
    const embeddings = await Promise.all(batch.map((text) => embedOne(apiKey, text)));
    embeddings.forEach((embedding, offset) => {
      results[i + offset] = embedding;
    });
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
