import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { ingestRouter } from "./routes/ingest.js";
import { queryRouter } from "./routes/query.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 8787;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api", ingestRouter);
app.use("/api", queryRouter);

// In production the frontend is built into ../public alongside this compiled server (see Dockerfile).
const staticDir = path.join(__dirname, "public");
app.use(express.static(staticDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api")) return next();
  res.sendFile(path.join(staticDir, "index.html"), (err) => (err ? next() : undefined));
});

app.listen(port, () => {
  console.log(`repo-chat server listening on http://localhost:${port}`);
});
