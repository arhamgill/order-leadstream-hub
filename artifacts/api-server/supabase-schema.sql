-- ============================================================
-- LeadStream Hub — Supabase Schema
-- Run this in your Supabase project: SQL Editor → New query
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Customers ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name      TEXT NOT NULL,
  last_name       TEXT NOT NULL,
  agency_name     TEXT,
  phone           TEXT NOT NULL,
  email           TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Orders ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number          TEXT NOT NULL UNIQUE,  -- e.g. LSH-100001
  customer_id           UUID NOT NULL REFERENCES customers(id),
  status                TEXT NOT NULL DEFAULT 'pending',  -- pending | confirmed | completed
  payment_method        TEXT NOT NULL,                    -- card | zelle
  subtotal_cents        INTEGER NOT NULL,
  fee_cents             INTEGER NOT NULL DEFAULT 0,       -- 5% for card
  discount_cents        INTEGER NOT NULL DEFAULT 0,       -- 10% for zelle
  total_cents           INTEGER NOT NULL,
  additional_instructions TEXT,
  default_settings      JSONB NOT NULL DEFAULT '{}',      -- licensed states, start date, avail, agency mention
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Order Items ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  category        TEXT NOT NULL,    -- Final Expense | Medicare
  type            TEXT NOT NULL,    -- Callback Leads | Live Transfers | Pre Closed Applications
  quantity        INTEGER NOT NULL,
  price_cents     INTEGER NOT NULL,
  savings_cents   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Product Answers ──────────────────────────────────────────
-- One row per product per order, storing all product-specific form answers
CREATE TABLE IF NOT EXISTS product_answers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_key     TEXT NOT NULL,    -- fe_cb | fe_lt | fe_pc | mc_cb | mc_lt
  overridden      BOOLEAN NOT NULL DEFAULT FALSE,
  answers         JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Payments ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id                  UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  method                    TEXT NOT NULL,                  -- card | zelle
  status                    TEXT NOT NULL DEFAULT 'pending', -- pending | succeeded | failed
  amount_cents              INTEGER NOT NULL,
  stripe_payment_intent_id  TEXT,
  stripe_status             TEXT,
  zelle_screenshot_url      TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Uploaded Files ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS uploaded_files (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES orders(id) ON DELETE SET NULL,
  bucket          TEXT NOT NULL DEFAULT 'payment-screenshots',
  storage_path    TEXT NOT NULL,
  original_name   TEXT,
  mime_type       TEXT,
  size_bytes      INTEGER,
  public_url      TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Order Number Sequence ────────────────────────────────────
-- Tracks the last used order number counter
CREATE TABLE IF NOT EXISTS order_sequences (
  id          TEXT PRIMARY KEY DEFAULT 'main',
  last_value  INTEGER NOT NULL DEFAULT 100000
);
INSERT INTO order_sequences (id, last_value) VALUES ('main', 100000) ON CONFLICT DO NOTHING;

-- ─── Supabase Storage Bucket ─────────────────────────────────
-- Run this separately in Supabase Dashboard → Storage → New Bucket
-- Or uncomment and run here (requires sufficient privileges):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('payment-screenshots', 'payment-screenshots', false) ON CONFLICT DO NOTHING;

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_product_answers_order_id ON product_answers(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_files_order_id ON uploaded_files(order_id);
