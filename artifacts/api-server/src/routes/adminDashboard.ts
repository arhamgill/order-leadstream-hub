import { Router, type Request, type Response, type NextFunction } from "express";
import { getSupabaseClient } from "../lib/supabase.js";
import { requireAdmin } from "../middleware/adminAuth.js";
import { logger } from "../lib/logger.js";

const adminDashboardRouter = Router();
adminDashboardRouter.use(requireAdmin);

// GET /api/admin/stats
adminDashboardRouter.get("/admin/stats", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const [todayRes, monthRes, pendingRes, completedRes, pendingPayRes, custRes] = await Promise.all([
      supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", todayStart),
      supabase.from("orders").select("total_cents").gte("created_at", monthStart).neq("status", "refunded"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
      supabase.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("customers").select("id", { count: "exact", head: true }),
    ]);

    const monthlyRevenueCents = (monthRes.data ?? []).reduce(
      (sum: number, o: { total_cents: number }) => sum + (o.total_cents ?? 0), 0
    );

    res.json({
      today_orders: todayRes.count ?? 0,
      monthly_revenue_cents: monthlyRevenueCents,
      pending_orders: pendingRes.count ?? 0,
      completed_orders: completedRes.count ?? 0,
      pending_payments: pendingPayRes.count ?? 0,
      total_customers: custRes.count ?? 0,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/revenue-chart
adminDashboardRouter.get("/admin/revenue-chart", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const now = new Date();

    // Build the last 6 months date range
    const months: Array<{ label: string; start: string; end: string }> = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = d.toISOString();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).toISOString();
      const label = d.toLocaleString("en-US", { month: "short", year: "numeric" });
      months.push({ label, start, end });
    }

    const results = await Promise.all(
      months.map(({ start, end }) =>
        supabase
          .from("orders")
          .select("total_cents")
          .gte("created_at", start)
          .lt("created_at", end)
          .neq("status", "refunded")
      )
    );

    const points = months.map(({ label }, i) => ({
      month: label,
      revenue_cents: (results[i].data ?? []).reduce(
        (s: number, o: { total_cents: number }) => s + (o.total_cents ?? 0), 0
      ),
      order_count: results[i].data?.length ?? 0,
    }));

    res.json(points);
  } catch (err) {
    next(err);
  }
});

export default adminDashboardRouter;
