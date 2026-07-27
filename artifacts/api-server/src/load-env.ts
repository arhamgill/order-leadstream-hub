import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Load artifacts/api-server/.env by its location on disk, independent of the
// process working directory (so `node dist/index.mjs` works from the repo root).
// On Render there is no .env file — dotenv is a harmless no-op there and the
// dashboard environment variables are used instead. dotenv never overrides
// variables already present in process.env, so platform vars always win.
const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, "..", ".env") });
