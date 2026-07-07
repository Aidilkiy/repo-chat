# RepoChat

Ask natural-language questions about a public GitHub repo and get answers grounded in the actual source code, with file/line citations — not guesses.

## Why this exists

Onboarding onto an unfamiliar codebase means grepping around for "where is X handled?" This is a small RAG (Retrieval-Augmented Generation) tool that indexes a repo's source files and answers questions using only the code it retrieved, citing exactly which file and lines it used.

## How it works

1. **Ingest** (`POST /api/ingest`) — fetches a public repo's file tree via the GitHub REST API, filters to source/doc files, and splits each file into overlapping ~60-line chunks.
2. **Embed** — each chunk is embedded with Gemini's `gemini-embedding-001` and stored in SQLite (embedding vector saved as JSON).
3. **Query** (`POST /api/query`) — the question is embedded, compared against stored chunks via cosine similarity (computed in-process — no vector DB needed at this scale), and the top matches are passed to `gemini-2.5-flash` with instructions to answer only from those excerpts and cite them.

```
web/    React + Vite frontend — repo input, chat UI, expandable source citations
server/ Express + TypeScript API — ingestion, embeddings, retrieval, answer generation
```

## Running locally

```bash
# 1. Backend
cd server
cp ../.env.example .env   # then fill in GEMINI_API_KEY
npm install
npm run dev               # http://localhost:8787

# 2. Frontend (separate terminal)
cd web
npm install
npm run dev                # http://localhost:5173, proxies /api to :8787
```

## Running with Docker

```bash
cp .env.example .env   # fill in GEMINI_API_KEY
docker compose up --build
```

Serves the built frontend and API together on `http://localhost:8787`.

## Known limitations (intentional scope for a first version)

- Indexes up to 200 files per repo (size-capped) — enough to demo meaningfully without spending on huge embedding runs.
- SQLite + in-process cosine similarity is fine for a single-repo demo; a real multi-tenant product would move to a proper vector database (pgvector/Pinecone).
- No auth/rate limiting yet — fine for a personal portfolio demo, not for public production use as-is.

## Roadmap ideas

- Swap SQLite for pgvector and deploy on AWS (RDS + ECS) as the "cloud" half of this project.
- AST-aware chunking (split by function/class instead of raw line counts).
- Support private repos via GitHub OAuth.
