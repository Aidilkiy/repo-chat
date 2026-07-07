import { useState } from "react";
import { RepoForm } from "./components/RepoForm";
import { ChatPanel } from "./components/ChatPanel";

export default function App() {
  const [indexed, setIndexed] = useState<{ repoId: string; repoUrl: string } | null>(null);

  return (
    <main className="app">
      <header className="app-header">
        <h1>RepoChat</h1>
        <p>Point this at a public GitHub repo and ask it questions about the actual code.</p>
      </header>

      <RepoForm onIndexed={(repoId, repoUrl) => setIndexed({ repoId, repoUrl })} />

      {indexed ? <ChatPanel repoId={indexed.repoId} repoUrl={indexed.repoUrl} /> : null}
    </main>
  );
}
