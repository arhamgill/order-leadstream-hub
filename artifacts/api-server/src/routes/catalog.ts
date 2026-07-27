import { Router, type Request, type Response, type NextFunction } from "express";
import { getSupabaseClient } from "../lib/supabase.js";

const catalogRouter = Router();

// GET /api/catalog — public product catalog (reads from Supabase products table)
catalogRouter.get("/catalog", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("active", true)
      .order("sort_order");

    if (error) throw error;

    // Map DB product format to the format the customer portal expects
    type DbProduct = {
      id: string; category: string; type: string; description: string;
      buffer: string | null; active: boolean; sort_order: number;
      stock_remaining: number | null;
      packages: Array<{ quantity: number; price_dollars: number; savings_dollars?: number | null; savings_label?: string | null }>;
    };

    const products = (data ?? [] as DbProduct[]).map((p: DbProduct) => ({
      id: p.id,
      category: p.category,
      type: p.type,
      description: p.description,
      buffer: p.buffer ?? undefined,
      active: p.active,
      sort_order: p.sort_order,
      stock_remaining: p.stock_remaining ?? null,
      packages: p.packages.map((pkg) => ({
        quantity: pkg.quantity,
        price: pkg.price_dollars,
        savings: pkg.savings_dollars ?? undefined,
      })),
    }));

    res.json(products);
  } catch (err) {
    next(err);
  }
});

export default catalogRouter;
