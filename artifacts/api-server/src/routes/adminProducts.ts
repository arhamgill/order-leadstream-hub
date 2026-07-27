import { Router, type Request, type Response, type NextFunction } from "express";
import { getSupabaseClient } from "../lib/supabase.js";
import { requireAdmin } from "../middleware/adminAuth.js";

const adminProductsRouter = Router();
adminProductsRouter.use(requireAdmin);

// GET /api/admin/products
adminProductsRouter.get("/admin/products", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("sort_order");
    if (error) throw error;
    res.json(data ?? []);
  } catch (err) {
    next(err);
  }
});

// PUT /api/admin/products/:id
adminProductsRouter.put("/admin/products/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const supabase = getSupabaseClient();
    const { id } = req.params;
    const body = req.body as {
      category?: string; type?: string; description?: string;
      buffer?: string | null; active?: boolean; sort_order?: number;
      stock_remaining?: number | null;
      packages?: Array<{ quantity: number; price_dollars: number; savings_dollars?: number | null; savings_label?: string | null }>;
    };

    const updateData: Record<string, unknown> = {};
    if (body.category !== undefined) updateData.category = body.category;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.buffer !== undefined) updateData.buffer = body.buffer;
    if (body.active !== undefined) updateData.active = body.active;
    if (body.sort_order !== undefined) updateData.sort_order = body.sort_order;
    if (body.stock_remaining !== undefined) updateData.stock_remaining = body.stock_remaining;
    if (body.packages !== undefined) updateData.packages = body.packages;

    const { data, error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    if (!data) { res.status(404).json({ error: "Product not found" }); return; }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

export default adminProductsRouter;
