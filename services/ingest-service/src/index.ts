import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { ingestRouter } from "./routes/ingest.js";

const app = express();
const port = Number(process.env.PORT) || 8788;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const ingestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many repos indexed from this IP recently. Please try again in a few minutes." },
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "ingest-service" }));
app.use(ingestLimiter, ingestRouter);

app.listen(port, () => {
  console.log(`ingest-service listening on http://localhost:${port}`);
});
