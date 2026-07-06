import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { queryRouter } from "./routes/query.js";

const app = express();
const port = Number(process.env.PORT) || 8789;

app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many questions asked from this IP recently. Please try again in a few minutes." },
});

app.get("/health", (_req, res) => res.json({ ok: true, service: "query-service" }));
app.use(queryLimiter, queryRouter);

app.listen(port, () => {
  console.log(`query-service listening on http://localhost:${port}`);
});
