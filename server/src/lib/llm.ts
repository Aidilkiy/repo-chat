import type { QuerySource } from "../types.js";

const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-2.5-flash";

const SYSTEM_INSTRUCTION =
  "You are a senior engineer explaining an unfamiliar codebase. Answer only using the numbered code excerpts provided. " +
  "Cite excerpts inline like [1], [2] where relevant. If the excerpts don't contain the answer, say so plainly instead of guessing.";

export async function answerFromContext(question: string, sources: QuerySource[]): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it to server/.env");
  }

  const context = sources
    .map((source, index) => `[${index + 1}] ${source.filePath}:${source.startLine}-${source.endLine}\n${source.snippet}`)
    .join("\n\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${CHAT_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents: [{ role: "user", parts: [{ text: `Question: ${question}\n\nCode excerpts:\n${context}` }] }],
        generationConfig: { temperature: 0.1 },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini generation request failed (${response.status}): ${errorBody}`);
  }

  const body = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  return body.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") || "No answer was generated.";
}
