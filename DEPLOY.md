# LeadStream Hub — Run & Deploy

This is **one app** deployed as **one Render web service**. A single Node server
(the API server) serves everything:

| Path      | What                        |
|-----------|-----------------------------|
| `/`       | Customer storefront         |
| `/admin`  | Admin dashboard             |
| `/api/*`  | Backend API                 |

---

## Run locally (development)

Two ways — pick one.

### Option A — dev servers with hot reload (best for editing UI)
Run each in its own terminal, **using Git Bash on Windows** (not PowerShell — the
repo's `preinstall` script needs `sh`). From the repo root:

```bash
# 1) API server (port 5000) — build once, then start
cd artifacts/api-server && node ./build.mjs && node ./dist/index.mjs

# 2) Storefront (http://localhost:5173)
PORT=5173 pnpm --filter @workspace/leadstream-hub run dev

# 3) Admin dashboard (http://localhost:5174)
PORT=5174 pnpm --filter @workspace/admin-dashboard run dev
```

The two frontends proxy `/api` to the API server automatically. Admin login
password is whatever you set as `ADMIN_PASSWORD` in `artifacts/api-server/.env`.

### Option B — production mode locally (one server, exactly like Render)
From the repo root:

```bash
pnpm run build:prod        # builds API + both frontends
pnpm start                 # serves everything on http://localhost:5000
```

Then open **http://localhost:5000** (store) and **http://localhost:5000/admin** (admin).

---

## Deploy to Render (one web service)

### Environment variables
Set these in the Render dashboard (**Environment** tab). `PORT` is provided by
Render automatically — do **not** set it. Reference: `.env.example`.

Required:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SESSION_SECRET`
- `ADMIN_PASSWORD`
- `ADMIN_EMAIL`
- `ZELLE_NAME`
- `ZELLE_PHONE`
- `NODE_ENV` = `production`
- `NODE_VERSION` = `24`

Add later / optional:
- `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` (card payments)
- `RESEND_API_KEY` (order emails — get from resend.com)
- `FROM_EMAIL` (defaults to orders@leadstreamhub.com)

### Method 1 — Blueprint (easiest)
1. Push this repo to GitHub.
2. In Render: **New → Blueprint**, point it at the repo. It reads `render.yaml`.
3. Fill in the secret env vars when prompted. Deploy.

### Method 2 — Manual web service
1. In Render: **New → Web Service**, connect the repo.
2. Settings:
   - **Runtime:** Node
   - **Build Command:**
     ```
     corepack enable && corepack prepare pnpm@latest --activate && pnpm install --no-frozen-lockfile && pnpm run build:prod
     ```
   - **Start Command:**
     ```
     pnpm start
     ```
   - **Health Check Path:** `/api/healthz`
3. Add the environment variables above. Deploy.

Once live, the site is at `https://<your-service>.onrender.com` and the admin
panel at `https://<your-service>.onrender.com/admin`.

---

## Notes
- **Database:** Supabase (already provisioned — same project used before).
- **Email:** set `RESEND_API_KEY` to turn on order emails. Without it, orders
  still succeed; emails are just skipped (logged, never fatal).
- **Stripe:** card checkout stays disabled until the two `STRIPE_*` keys are set.
