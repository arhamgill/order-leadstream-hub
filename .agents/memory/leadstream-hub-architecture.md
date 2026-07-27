---
name: LeadStream Hub Architecture
description: Key decisions and wiring facts for the LeadStream Hub Order Portal project.
---

# LeadStream Hub — Architecture & Key Decisions

## Routing
- Frontend (leadstream-hub): preview path `/`, Vite on port `19601`
- API server: preview path `/api`, Express on port `8080`, mounted as `app.use("/api", router)`
- Frontend calls `/api/settings`, `/api/orders/payment-intent`, `/api/orders/upload`, `/api/orders/submit`

## Page swap pattern (no router)
- `checkoutOpen: boolean` state in `App.tsx` toggles between catalog and `<CheckoutPage>`
- On success: `setCart([])` clears cart; success screen shown inside CheckoutPage

## Payment
- Card: Stripe `CardElement` → `createPaymentIntent` → `stripe.confirmCardPayment` → `submitOrder` with `payment_intent_id`; server verifies `pi.status === "succeeded"` before saving
- Zelle: file uploaded immediately on pick via `POST /api/orders/upload` → Supabase Storage bucket `payment-screenshots`; order submitted with `zelle_file_id`
- Card adds 5% fee; Zelle subtracts 10% discount

## Stripe integration
- Connected via Replit connector; `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY` set as Replit Secrets
- Publishable key served to frontend via `GET /api/settings` (never hardcoded in frontend code)
- Stripe API version: `2026-06-24.dahlia`

## Resend integration
- Connected via Replit connector (`conn_resend_01KYGWMYENRKX5X6ZQNN9R2DWS`)
- Uses `@replit/connectors-sdk` proxy: `connectors.proxy("resend", "/emails", { method: "POST", ... })`
- Customer confirmation + admin notification sent on every `POST /api/orders/submit`

## Supabase
- Tables: `customers`, `orders`, `order_items`, `product_answers`, `payments`, `uploaded_files`, `order_sequences`
- Order numbers: `LSH-100001` format via `order_sequences` table → `generateOrderNumber()`
- Storage bucket: `payment-screenshots` (must be created manually in Supabase dashboard)
- SQL schema: `artifacts/api-server/supabase-schema.sql`

## Secrets required
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `ADMIN_EMAIL`, `ZELLE_PHONE`, `ZELLE_NAME`
- Optional: `FROM_EMAIL` (defaults to `orders@leadstreamhub.com`)

**Why:** These decisions are load-bearing and non-obvious from code alone — especially the Stripe key serving pattern and the Resend proxy approach.
