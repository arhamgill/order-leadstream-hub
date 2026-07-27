-- ============================================================
-- LeadStream Hub — Stripe Fields Migration
-- Run this in your Supabase project: SQL Editor → New query
-- Run AFTER supabase-schema.sql
-- ============================================================

-- Add Stripe Charge ID and Customer ID to payments table
ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS stripe_charge_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Add Stripe Customer ID to customers table
ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Index for fast lookup by charge or customer
CREATE INDEX IF NOT EXISTS idx_payments_stripe_charge_id    ON payments(stripe_charge_id)    WHERE stripe_charge_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_stripe_customer_id  ON payments(stripe_customer_id)  WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_stripe_customer_id ON customers(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
