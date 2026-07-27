---
name: LeadStream Hub Architecture
description: Routing, Stripe/Resend wiring, Supabase schema, payment flow decisions, admin dashboard wiring
---

## Key Decisions

- **Customer portal router**: no router — `checkoutOpen: boolean` in `App.tsx` swaps between catalog and `<CheckoutPage>`.
- **Stripe key served via API**: `GET /api/settings` returns `stripe_publishable_key` (never hardcoded in frontend).
- **Card flow**: `createPaymentIntent` → `stripe.confirmCardPayment` client-side → server re-verifies `pi.status === "succeeded"` before saving.
- **Zelle flow**: screenshot uploaded on file pick (`POST /api/orders/upload` → Supabase Storage bucket `payment-screenshots`) → order submitted with `zelle_file_id`.
- **Resend**: uses `@replit/connectors-sdk` proxy (`connectors.proxy("resend", "/emails", ...)`), not a raw API key.
- **Stripe API version**: `2026-06-24.dahlia` (earlier version string caused TS error).
- **Order numbers**: `LSH-100001` format via `order_sequences` table + `generateOrderNumber()`.
- **Admin auth**: JWT signed with `SESSION_SECRET` using Node's built-in `crypto.createHmac`. Token stored as `lsh_admin_token` in localStorage. 24h TTL. No external JWT library.
- **Admin API client auth**: `setAuthTokenGetter(() => localStorage.getItem('lsh_admin_token'))` called at module level in `artifacts/admin-dashboard/src/App.tsx`. Duck-typed 401 check (no `ApiError` import needed in App.tsx).
- **api-client-react dist**: Must run `pnpm exec tsc -p tsconfig.json` in `lib/api-client-react/` when changing `src/index.ts` — the admin dashboard Vite resolves to dist `.d.ts` for type checking.
- **Products table**: Admin edits products in Supabase `products` table. Customer portal fetches from `GET /api/catalog`. This keeps product data in sync without code changes.
- **Settings table**: `app_settings` key-value table in Supabase. Admin edits via dashboard PATCH `/api/admin/settings`. Public settings endpoint `GET /api/settings` reads DB first, falls back to env vars.

## Supabase Schema Files

- `artifacts/api-server/supabase-schema.sql` — original 6 tables (customers, orders, order_items, product_answers, payments, uploaded_files, order_sequences)
- `artifacts/api-server/supabase-schema-admin.sql` — 4 new tables + seed data: products (5 products seeded), app_settings (defaults seeded), admin_notes, order_status_history

**Why separate file**: keeps original schema intact; user runs both in sequence.

## Admin Routes (all under /api)

- `POST /admin/auth/login` — password check vs ADMIN_PASSWORD env, returns signed JWT
- `GET /admin/stats` — today_orders, monthly_revenue_cents, pending_orders, completed_orders, pending_payments, total_customers
- `GET /admin/revenue-chart` — last 6 months revenue + order_count
- `GET /admin/orders` — paginated list with search/filter (search does ilike on order_number, customer name/email)
- `GET /admin/orders/:id` — full detail with items, product_answers, payment, notes, status_history
- `PATCH /admin/orders/:id/status` — update status, writes to order_status_history
- `POST /admin/orders/:id/approve` — Zelle approve (payment.status=succeeded, order.status=paid)
- `POST /admin/orders/:id/reject` — Zelle reject (payment.status=failed, order.status=pending)
- `POST /admin/orders/:id/refund` — Stripe refund + mark refunded
- `POST /admin/orders/:id/notes` — add note
- `DELETE /admin/orders/:id/notes/:noteId` — delete note
- `GET /admin/customers` — paginated with aggregated order_count, total_spent_cents
- `GET /admin/customers/:id` — profile + order history
- `GET /admin/products` — from Supabase products table
- `PUT /admin/products/:id` — update product/packages
- `GET /admin/settings` — merged DB + env fallbacks + stripe_publishable_key (read-only)
- `PATCH /admin/settings` — upsert app_settings key-value pairs
- `GET /catalog` — public, active products from Supabase (customer portal ready)

## Admin Dashboard Pages (artifacts/admin-dashboard)

wouter router with `base={import.meta.env.BASE_URL.replace(/\/$/, '')}`. Preview path: `/admin`.

Pages: /login, /dashboard, /orders, /orders/:id, /customers, /customers/:id, /products, /payments, /settings

## Outstanding Manual Step

User must run both SQL files in Supabase SQL Editor (in order):
1. `supabase-schema.sql` (if not already done)
2. `supabase-schema-admin.sql` (new tables + seeds)

Until this is done, orders/customers/products pages return 500 (PGRST205 schema cache miss).
