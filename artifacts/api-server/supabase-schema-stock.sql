-- ============================================================
-- LeadStream Hub — Limited Stock counter
-- Run this in Supabase: SQL Editor → New query → Run
-- Adds a per-product "units left" counter (nullable = unlimited).
-- ============================================================

ALTER TABLE products ADD COLUMN IF NOT EXISTS stock_remaining INTEGER;
