import { Router, type Request, type Response, type NextFunction } from "express";
import { getSupabaseClient } from "../lib/supabase.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const adminSettingsRouter = Router();
adminSettingsRouter.use(requireAdmin);

const SETTING_KEYS = [
  "business_email", "business_phone", "zelle_phone", "zelle_name",
  "from_email", "admin_email", "card_fee_percent", "zelle_discount_percent",
];

async function getSettings(): Promise<Record<string, string>> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from("app_settings").select("key, value");
  const fromDb: Record<string, string> = {};
  (data ?? []).forEach((row: { key: string; value: string }) => { fromDb[row.key] = row.value; });

  // Fall back to env vars for any missing keys
  return {
    business_email: fromDb.business_email ?? process.env["ADMIN_EMAIL"] ?? "",
    business_phone: fromDb.business_phone ?? "",
    zelle_phone: fromDb.zelle_phone ?? process.env["ZELLE_PHONE"] ?? "",
    zelle_name: fromDb.zelle_name ?? process.env["ZELLE_NAME"] ?? "",
    from_email: fromDb.from_email ?? process.env["FROM_EMAIL"] ?? "orders@leadstreamhub.com",
    admin_email: fromDb.admin_email ?? process.env["ADMIN_EMAIL"] ?? "",
    card_fee_percent: fromDb.card_fee_percent ?? "5",
    zelle_discount_percent: fromDb.zelle_discount_percent ?? "10",
  };
}

// GET /api/admin/settings
adminSettingsRouter.get("/admin/settings", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await getSettings();
    res.json({
      ...settings,
      card_fee_percent: parseFloat(settings.card_fee_percent),
      zelle_discount_percent: parseFloat(settings.zelle_discount_percent),
      stripe_publishable_key: process.env["STRIPE_PUBLISHABLE_KEY"] ?? "",
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/settings
adminSettingsRouter.patch("/admin/settings", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const body = req.body as Record<string, unknown>;

    const updates = SETTING_KEYS
      .filter((k) => body[k] !== undefined)
      .map((k) => ({ key: k, value: String(body[k]) }));

    if (updates.length === 0) {
      res.status(400).json({ error: "No valid settings fields provided" });
      return;
    }

    const { error } = await supabase
      .from("app_settings")
      .upsert(updates, { onConflict: "key" });

    if (error) throw error;

    const settings = await getSettings();
    res.json({
      ...settings,
      card_fee_percent: parseFloat(settings.card_fee_percent),
      zelle_discount_percent: parseFloat(settings.zelle_discount_percent),
      stripe_publishable_key: process.env["STRIPE_PUBLISHABLE_KEY"] ?? "",
    });
  } catch (err) {
    next(err);
  }
});

export default adminSettingsRouter;
