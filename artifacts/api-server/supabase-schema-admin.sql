-- ============================================================
-- LeadStream Hub — Admin Tables (Schema Addition)
-- Run this in your Supabase project: SQL Editor → New query
-- Run AFTER supabase-schema.sql
-- ============================================================

-- ─── Products ─────────────────────────────────────────────────
-- Editable product catalog. Admin can change prices/descriptions via the dashboard.
CREATE TABLE IF NOT EXISTS products (
  id          TEXT PRIMARY KEY,          -- e.g. "final-expense-callback-leads"
  category    TEXT NOT NULL,             -- Final Expense | Medicare | ACA
  type        TEXT NOT NULL,             -- Callback Leads | Live Transfers | Pre Closed Applications
  description TEXT NOT NULL,
  buffer      TEXT,                      -- e.g. "120 Second Buffer" (live transfers)
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  packages    JSONB NOT NULL DEFAULT '[]'  -- [{quantity, price_dollars, savings_dollars, savings_label}]
);

-- ─── App Settings ─────────────────────────────────────────────
-- Key-value store for admin-editable settings
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Admin Notes ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  note        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Order Status History ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status   TEXT NOT NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_notes_order_id ON admin_notes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON order_status_history(order_id);

-- ─── Seed: Product Catalog ────────────────────────────────────
INSERT INTO products (id, category, type, description, buffer, active, sort_order, packages) VALUES
(
  'final-expense-callback-leads',
  'Final Expense',
  'Callback Leads',
  'Exclusive, self-generated prospects who have requested information about this insurance product.',
  NULL,
  TRUE,
  1,
  '[
    {"quantity": 20, "price_dollars": 400, "savings_dollars": null, "savings_label": null},
    {"quantity": 30, "price_dollars": 600, "savings_dollars": null, "savings_label": null},
    {"quantity": 50, "price_dollars": 900, "savings_dollars": 100, "savings_label": "Save $100"},
    {"quantity": 100, "price_dollars": 1700, "savings_dollars": 300, "savings_label": "Save $300"}
  ]'
),
(
  'final-expense-live-transfers',
  'Final Expense',
  'Live Transfers',
  'Receive warm, qualified prospects transferred directly to your licensed agents.',
  '120 Second Buffer',
  TRUE,
  2,
  '[
    {"quantity": 10, "price_dollars": 350, "savings_dollars": null, "savings_label": null},
    {"quantity": 20, "price_dollars": 700, "savings_dollars": null, "savings_label": null},
    {"quantity": 30, "price_dollars": 950, "savings_dollars": 100, "savings_label": "Save $100"},
    {"quantity": 50, "price_dollars": 1500, "savings_dollars": 250, "savings_label": "Save $250"},
    {"quantity": 100, "price_dollars": 2800, "savings_dollars": 700, "savings_label": "Save $700"}
  ]'
),
(
  'final-expense-pre-closed-applications',
  'Final Expense',
  'Pre Closed Applications',
  'Receive approved applications that have already completed the majority of the enrollment process.',
  NULL,
  TRUE,
  3,
  '[
    {"quantity": 5, "price_dollars": 1000, "savings_dollars": null, "savings_label": null},
    {"quantity": 10, "price_dollars": 1850, "savings_dollars": 150, "savings_label": "Save $150"},
    {"quantity": 15, "price_dollars": 2700, "savings_dollars": 300, "savings_label": "Save $300"},
    {"quantity": 20, "price_dollars": 3400, "savings_dollars": 600, "savings_label": "Save $600"}
  ]'
),
(
  'medicare-callback-leads',
  'Medicare',
  'Callback Leads',
  'Exclusive, self-generated prospects who have requested information about Medicare.',
  NULL,
  TRUE,
  4,
  '[
    {"quantity": 20, "price_dollars": 400, "savings_dollars": null, "savings_label": null},
    {"quantity": 30, "price_dollars": 600, "savings_dollars": null, "savings_label": null},
    {"quantity": 50, "price_dollars": 900, "savings_dollars": 100, "savings_label": "Save $100"},
    {"quantity": 100, "price_dollars": 1700, "savings_dollars": 300, "savings_label": "Save $300"}
  ]'
),
(
  'medicare-live-transfers',
  'Medicare',
  'Live Transfers',
  'Receive warm, qualified Medicare prospects transferred directly to your licensed agents.',
  '120 Second Buffer',
  TRUE,
  5,
  '[
    {"quantity": 10, "price_dollars": 350, "savings_dollars": null, "savings_label": null},
    {"quantity": 20, "price_dollars": 700, "savings_dollars": null, "savings_label": null},
    {"quantity": 30, "price_dollars": 950, "savings_dollars": 100, "savings_label": "Save $100"},
    {"quantity": 50, "price_dollars": 1500, "savings_dollars": 250, "savings_label": "Save $250"},
    {"quantity": 100, "price_dollars": 2800, "savings_dollars": 700, "savings_label": "Save $700"}
  ]'
)
ON CONFLICT (id) DO NOTHING;

-- ─── Seed: Default Settings ───────────────────────────────────
-- These are initial defaults; admin can edit via the dashboard
INSERT INTO app_settings (key, value) VALUES
  ('card_fee_percent', '5'),
  ('zelle_discount_percent', '10'),
  ('business_email', ''),
  ('business_phone', ''),
  ('zelle_phone', ''),
  ('zelle_name', ''),
  ('from_email', 'orders@leadstreamhub.com'),
  ('admin_email', '')
ON CONFLICT (key) DO NOTHING;
