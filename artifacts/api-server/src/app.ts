import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

app.use(cors({
  origin: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// JSON + URL-encoded for regular requests
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Note: multipart/form-data (file uploads) is handled per-route by multer

app.use("/api", router);

// ─── Serve the built frontends (single-service production deploy) ───────────
// In production, this one server serves the storefront at "/" and the admin
// dashboard at "/admin", so the whole app runs on one origin (one Render web
// service). In local dev the built folders don't exist, so this is skipped and
// the Vite dev servers are used instead.
//
// __distDir resolves to artifacts/api-server/dist at runtime; the two client
// builds sit at artifacts/<name>/dist/public.
const __distDir = path.dirname(fileURLToPath(import.meta.url));
const artifactsDir = path.resolve(__distDir, "..", "..");
const storeDir = path.join(artifactsDir, "leadstream-hub", "dist", "public");
const adminDir = path.join(artifactsDir, "admin-dashboard", "dist", "public");

function sendSpaIndex(dir: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    res.sendFile(path.join(dir, "index.html"));
  };
}

// Admin dashboard under /admin (static assets first, then SPA fallback)
if (fs.existsSync(adminDir)) {
  app.use("/admin", express.static(adminDir));
  app.use("/admin", sendSpaIndex(adminDir));
  logger.info({ adminDir }, "Serving admin dashboard at /admin");
}

// Storefront at the root (static assets first, then SPA fallback for anything
// that isn't an /api route)
if (fs.existsSync(storeDir)) {
  app.use(express.static(storeDir));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) return next();
    return sendSpaIndex(storeDir)(req, res, next);
  });
  logger.info({ storeDir }, "Serving storefront at /");
}

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: err.message ?? "Internal server error" });
});

export default app;
