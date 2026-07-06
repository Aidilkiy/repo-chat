# RepoChat

Ask natural-language questions about a public GitHub repo and get answers grounded in the actual source code, with file/line citations — not guesses.

## Why this exists

Onboarding onto an unfamiliar codebase means grepping around for "where is X handled?" This is a small RAG (Retrieval-Augmented Generation) tool that indexes a repo's source files and answers questions using only the code it retrieved, citing exactly which file and lines it used.

## Architecture

Split into independent services, each deployable and scalable on its own:

```
services/
  ingest-service/   Express + TypeScript — fetches a repo's files via the GitHub Contents API,
                     chunks them, embeds each chunk with Gemini, stores in SQLite
  query-service/     Express + TypeScript — embeds the question, ranks stored chunks by cosine
                     similarity, asks Gemini to answer using only the retrieved context
  web/               React + Vite frontend — repo input, chat UI, expandable source citations
```

`web/` talks to both backend services through a single `/api/*` origin — the Vite dev server proxies by path (`/api/ingest` → ingest-service, `/api/query` → query-service), and the production container does the same via an Nginx config. This is standing in for the role a real Kubernetes Ingress plays once this moves there.

## How it works

1. **Ingest** (`POST /api/ingest`) — fetches a public repo's file tree via the GitHub REST API, then fetches each candidate file's content via the authenticated GitHub Contents API (not `raw.githubusercontent.com` — its separate CDN-level rate limit turned out to be an unpredictable, long-cooldown bottleneck under repeated testing), and splits each file into overlapping ~60-line chunks.
2. **Embed** — each chunk is embedded with Gemini's `gemini-embedding-001` and stored in SQLite (embedding vector saved as JSON).
3. **Query** (`POST /api/query`) — the question is embedded, compared against stored chunks via cosine similarity, and the top matches are passed to `gemini-2.5-flash` with instructions to answer only from those excerpts and cite them.

## Running locally

```bash
# 1. ingest-service
cd services/ingest-service
cp ../../.env.example .env   # fill in GEMINI_API_KEY (see the ingest-service section)
npm install
npm run dev                   # http://localhost:8788

# 2. query-service (separate terminal)
cd services/query-service
cp ../../.env.example .env    # fill in GEMINI_API_KEY (see the query-service section)
npm install
npm run dev                    # http://localhost:8789

# 3. web (separate terminal)
cd services/web
npm install
npm run dev                     # http://localhost:5173, proxies /api/* to the two services above
```

Both backend services point at the same SQLite file by default (`../repo-chat.sqlite`, relative to each service's own folder) — `ingest-service` writes to it, `query-service` reads from it.

## Running with Docker

```bash
cp .env.example .env   # fill in GEMINI_API_KEY, GITHUB_TOKEN
docker compose up --build
```

Serves the frontend on `http://localhost:8080`, with `ingest-service`/`query-service` also reachable directly on `8788`/`8789`. All three containers share a Docker volume for the SQLite file.

## Known limitations (intentional scope for this version)

- Indexes up to 200 candidate files per repo, capped at 150 chunks — enough to demo meaningfully without spending on huge embedding runs.
- SQLite + in-process cosine similarity is fine for a single-repo demo; a real multi-tenant product would move to a proper vector database (pgvector). A shared SQLite file across two separate service processes (via WAL mode) works for this demo's scale but isn't how this would be built for real multi-instance production use.
- No auth/rate limiting on the raw GitHub API quota — a single `GITHUB_TOKEN` is shared across all users of a deployed instance, same as before.

## Roadmap

This project is being extended into a full DevOps/cloud showcase:

- [x] Split into independent ingest/query services (this version)
- [ ] Run on Kubernetes locally (Minikube), with Postgres/pgvector as a proper in-cluster database
- [ ] Infrastructure as code (Terraform) for the Kubernetes resources
- [ ] Observability (Prometheus + Grafana dashboards)
- [ ] Full CI/CD (GitHub Actions building and deploying on every push)
