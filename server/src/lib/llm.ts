import OpenAI from "openai";
import type { QuerySource } from "../types.js";

const CHAT_MODEL = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set. Add it to server/.env");
    }
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function answerFromContext(question: string, sources: QuerySource[]): Promise<string> {
  const openai = getClient();

  const context = sources
    .map((source, index) => `[${index + 1}] ${source.filePath}:${source.startLine}-${source.endLine}\n${source.snippet}`)
    .join("\n\n");

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content:
          "You are a senior engineer explaining an unfamiliar codebase. Answer only using the numbered code excerpts provided. " +
          "Cite excerpts inline like [1], [2] where relevant. If the excerpts don't contain the answer, say so plainly instead of guessing.",
      },
      {
        role: "user",
        content: `Question: ${question}\n\nCode excerpts:\n${context}`,
      },
    ],
  });

  return completion.choices[0]?.message?.content ?? "No answer was generated.";
}
