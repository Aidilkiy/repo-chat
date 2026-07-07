import { FormEvent, useState } from "react";
import { queryRepo, QuerySource } from "../api";

type Props = {
  repoId: string;
  repoUrl: string;
};

type Answer = {
  question: string;
  answer: string;
  sources: QuerySource[];
};

export function ChatPanel({ repoId, repoUrl }: Props) {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState<Answer[]>([]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError("");

    try {
      const result = await queryRepo(repoId, question.trim());
      setHistory((prev) => [{ question: question.trim(), answer: result.answer, sources: result.sources }, ...prev]);
      setQuestion("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to answer question");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-panel">
      <p className="chat-panel-repo">Indexed: {repoUrl}</p>

      <form onSubmit={handleSubmit} className="chat-form">
        <input
          type="text"
          placeholder="e.g. Where is authentication handled?"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button type="submit" disabled={loading}>
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      {error ? <p className="chat-error">{error}</p> : null}

      <div className="chat-history">
        {history.map((item, index) => (
          <article key={index} className="chat-answer">
            <p className="chat-question">{item.question}</p>
            <p className="chat-answer-text">{item.answer}</p>
            <div className="chat-sources">
              {item.sources.map((source, sourceIndex) => (
                <details key={sourceIndex} className="chat-source">
                  <summary>
                    [{sourceIndex + 1}] {source.filePath}:{source.startLine}-{source.endLine}
                  </summary>
                  <pre>{source.snippet}</pre>
                </details>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
