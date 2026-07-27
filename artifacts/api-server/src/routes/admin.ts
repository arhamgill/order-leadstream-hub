import { Router } from "express";

const adminRouter = Router();

/**
 * GET /api/settings
 * Returns public configuration needed by the frontend:
 * - Stripe publishable key (safe to expose)
 * - Zelle payment details
 */
adminRouter.get("/settings", (_req, res) => {
  res.json({
    stripe_publishable_key: process.env["STRIPE_PUBLISHABLE_KEY"] ?? "",
    zelle_phone: process.env["ZELLE_PHONE"] ?? "",
    zelle_name: process.env["ZELLE_NAME"] ?? "LeadStream Hub",
  });
});

export default adminRouter;
