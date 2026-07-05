import { FormEvent, useState } from "react";
import { ingestRepo } from "../api";

type Props = {
  onIndexed: (repoId: string, repoUrl: string) => void;
};

export function RepoForm({ onIndexed }: Props) {
  const [repoUrl, setRepoUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!repoUrl.trim()) return;

    setStatus("loading");
    setError("");

    try {
      const result = await ingestRepo(repoUrl.trim());
      setSummary(`Indexed ${result.filesIndexed} files (${result.chunksIndexed} chunks).`);
      setStatus("idle");
      onIndexed(result.repoId, repoUrl.trim());
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Failed to index repo");
    }
  }

  return (
    <form className="repo-form" onSubmit={handleSubmit}>
      <label htmlFor="repoUrl">Public GitHub repo URL</label>
      <div className="repo-form-row">
        <input
          id="repoUrl"
          type="text"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(event) => setRepoUrl(event.target.value)}
        />
        <button type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Indexing..." : "Index repo"}
        </button>
      </div>
      {summary ? <p className="repo-form-summary">{summary}</p> : null}
      {status === "error" ? <p className="repo-form-error">{error}</p> : null}
    </form>
  );
}
